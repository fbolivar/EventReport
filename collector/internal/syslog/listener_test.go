package syslog

import (
	"context"
	"fmt"
	"net"
	"testing"
	"time"
)

func TestReceivesUDPAndTCP(t *testing.T) {
	listener := New("127.0.0.1:0")

	// Bind on a free port chosen by the OS, then read it back.
	if err := listener.Start(context.Background()); err != nil {
		t.Fatalf("no arrancó: %v", err)
	}
	defer listener.Close()

	addr := listener.udp.LocalAddr().String()

	conn, err := net.Dial("udp", addr)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := conn.Write([]byte("type=traffic action=accept")); err != nil {
		t.Fatal(err)
	}
	conn.Close()

	select {
	case line := <-listener.Lines():
		if string(line.Data) != "type=traffic action=accept" {
			t.Fatalf("línea = %q", line.Data)
		}
		if line.Source == nil {
			t.Fatal("hay que saber qué equipo la envió: se identifica por IP de origen")
		}
	case <-time.After(3 * time.Second):
		t.Fatal("no llegó la línea por UDP")
	}
}

func TestFullQueueDropsAndCounts(t *testing.T) {
	listener := &Listener{lines: make(chan Line, 2)}

	for index := range 5 {
		listener.push(Line{Data: []byte(fmt.Sprintf("linea %d", index))})
	}

	stats := listener.Stats()
	if stats.Received != 5 {
		t.Fatalf("recibidas = %d", stats.Received)
	}
	if stats.Dropped != 3 {
		t.Fatalf("descartadas = %d, se esperaban 3: la cola es finita a propósito", stats.Dropped)
	}
	if percent := listener.DroppedPercent(); percent < 59 || percent > 61 {
		t.Fatalf("porcentaje = %.1f", percent)
	}
}

func TestPushNeverBlocks(t *testing.T) {
	listener := &Listener{lines: make(chan Line, 1)}

	done := make(chan struct{})
	go func() {
		for range 1000 {
			listener.push(Line{Data: []byte("x")})
		}
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("push se bloqueó: caerse atrás no puede detener la recepción")
	}
}
