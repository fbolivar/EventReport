// Package syslog receives the firewall's log stream (design section 6.6).
//
// The pipeline: listener → in-memory queue → workers. The queue is bounded on
// purpose. When a burst fills it the oldest lines are dropped and counted,
// because falling behind must never turn into unbounded memory growth on a
// machine that belongs to the customer. The drop counter is reported as data
// quality and opens FW-019 past 1%.
package syslog

import (
	"bufio"
	"context"
	"errors"
	"net"
	"sync"
	"sync/atomic"
	"time"
)

// QueueSize is the in-memory queue depth (section 6.2).
const QueueSize = 50_000

// Line is a raw log line with the moment and source it arrived from.
type Line struct {
	Received time.Time
	Source   net.IP
	Data     []byte
}

// Stats is what the heartbeat reports.
type Stats struct {
	Received int64
	Dropped  int64
	Queued   int
}

// Listener accepts UDP and TCP syslog and hands lines over a bounded channel.
type Listener struct {
	addr string

	lines chan Line

	received atomic.Int64
	dropped  atomic.Int64

	udp  net.PacketConn
	tcp  net.Listener
	wg   sync.WaitGroup
	once sync.Once
}

func New(addr string) *Listener {
	return &Listener{addr: addr, lines: make(chan Line, QueueSize)}
}

// Lines is the stream the workers consume.
func (l *Listener) Lines() <-chan Line { return l.lines }

// Stats snapshots the counters.
func (l *Listener) Stats() Stats {
	return Stats{
		Received: l.received.Load(),
		Dropped:  l.dropped.Load(),
		Queued:   len(l.lines),
	}
}

// DroppedPercent is what the heartbeat sends and FW-019 compares against 1%.
func (l *Listener) DroppedPercent() float64 {
	received := l.received.Load()
	if received == 0 {
		return 0
	}
	return float64(l.dropped.Load()) / float64(received) * 100
}

// Start opens both listeners. UDP is the mandatory one: a firewall that cannot
// reach it simply loses its logs, so failing loudly here matters.
func (l *Listener) Start(ctx context.Context) error {
	udp, err := net.ListenPacket("udp", l.addr)
	if err != nil {
		return err
	}
	l.udp = udp

	tcp, err := net.Listen("tcp", l.addr)
	if err != nil {
		udp.Close()
		return err
	}
	l.tcp = tcp

	l.wg.Add(2)
	go l.readUDP(ctx)
	go l.acceptTCP(ctx)

	go func() {
		<-ctx.Done()
		l.Close()
	}()

	return nil
}

// push never blocks: a full queue drops the oldest line and counts it.
func (l *Listener) push(line Line) {
	l.received.Add(1)

	select {
	case l.lines <- line:
		return
	default:
	}

	// Make room by discarding the oldest, then try once more. If the consumer
	// refilled it in between, this line is the one that goes.
	select {
	case <-l.lines:
		l.dropped.Add(1)
	default:
	}

	select {
	case l.lines <- line:
	default:
		l.dropped.Add(1)
	}
}

func (l *Listener) readUDP(ctx context.Context) {
	defer l.wg.Done()

	buffer := make([]byte, 8192)
	for {
		n, addr, err := l.udp.ReadFrom(buffer)
		if err != nil {
			if ctx.Err() != nil || errors.Is(err, net.ErrClosed) {
				return
			}
			continue
		}

		data := make([]byte, n)
		copy(data, buffer[:n])
		l.push(Line{Received: time.Now().UTC(), Source: sourceIP(addr), Data: data})
	}
}

func (l *Listener) acceptTCP(ctx context.Context) {
	defer l.wg.Done()

	for {
		conn, err := l.tcp.Accept()
		if err != nil {
			if ctx.Err() != nil || errors.Is(err, net.ErrClosed) {
				return
			}
			continue
		}

		l.wg.Add(1)
		go func() {
			defer l.wg.Done()
			defer conn.Close()

			source := sourceIP(conn.RemoteAddr())
			scanner := bufio.NewScanner(conn)
			scanner.Buffer(make([]byte, 0, 8192), 64*1024)

			for scanner.Scan() {
				data := make([]byte, len(scanner.Bytes()))
				copy(data, scanner.Bytes())
				l.push(Line{Received: time.Now().UTC(), Source: source, Data: data})
			}
		}()
	}
}

func sourceIP(addr net.Addr) net.IP {
	switch typed := addr.(type) {
	case *net.UDPAddr:
		return typed.IP
	case *net.TCPAddr:
		return typed.IP
	}
	return nil
}

// Close stops both listeners and waits for the goroutines.
func (l *Listener) Close() {
	l.once.Do(func() {
		if l.udp != nil {
			l.udp.Close()
		}
		if l.tcp != nil {
			l.tcp.Close()
		}
		l.wg.Wait()
		close(l.lines)
	})
}

// Addr is the UDP address actually bound, which matters when the port was
// chosen by the OS (as in tests).
func (l *Listener) Addr() string {
	if l.udp == nil {
		return l.addr
	}
	return l.udp.LocalAddr().String()
}
