// Package buffer keeps closed hours on disk until the cloud accepts them.
//
// Without internet the collector keeps receiving, aggregating and storing; up
// to seven days of pending rollups are uploaded in order when the link comes
// back (design section 6.6, point 7). One file per payload, named by sequence,
// so ordering survives a restart and a partial upload never corrupts a batch.
package buffer

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// MaxAge is how long a pending payload is worth keeping (section 6.6).
const MaxAge = 7 * 24 * time.Hour

type Buffer struct {
	dir string
	mu  sync.Mutex
	seq int64
}

func New(dir string) (*Buffer, error) {
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return nil, err
	}
	return &Buffer{dir: dir}, nil
}

// Enqueue writes a payload as pending.
func (b *Buffer) Enqueue(kind string, payload any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	b.mu.Lock()
	b.seq++
	name := fmt.Sprintf("%d-%06d-%s.json", time.Now().UTC().UnixNano(), b.seq, kind)
	b.mu.Unlock()

	// Write to a temporary name and rename: a crash mid-write must not leave a
	// half payload that later fails to parse.
	temporary := filepath.Join(b.dir, "."+name)
	if err := os.WriteFile(temporary, raw, 0o640); err != nil {
		return err
	}
	return os.Rename(temporary, filepath.Join(b.dir, name))
}

// Pending is one queued payload.
type Pending struct {
	Path    string
	Kind    string
	Payload json.RawMessage
}

// List returns the pending payloads, oldest first.
func (b *Buffer) List() ([]Pending, error) {
	entries, err := os.ReadDir(b.dir)
	if err != nil {
		return nil, err
	}

	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		name := entry.Name()
		// A leading dot marks a write that never finished its rename: it is
		// not a payload yet and must not be uploaded.
		if entry.IsDir() || strings.HasPrefix(name, ".") || filepath.Ext(name) != ".json" {
			continue
		}
		names = append(names, name)
	}
	sort.Strings(names)

	pending := make([]Pending, 0, len(names))
	for _, name := range names {
		path := filepath.Join(b.dir, name)
		raw, err := os.ReadFile(path)
		if err != nil {
			continue
		}

		kind := name
		if index := len(name) - len(".json"); index > 0 {
			kind = name[:index]
		}
		if parts := splitLast(kind, '-'); parts != "" {
			kind = parts
		}

		pending = append(pending, Pending{Path: path, Kind: kind, Payload: raw})
	}

	return pending, nil
}

// Ack removes a payload the cloud accepted.
func (b *Buffer) Ack(path string) error {
	return os.Remove(path)
}

// Prune drops what is older than MaxAge. Uploading a two-week-old rollup helps
// nobody and the cloud would reject it anyway.
func (b *Buffer) Prune(now time.Time) (int, error) {
	entries, err := os.ReadDir(b.dir)
	if err != nil {
		return 0, err
	}

	removed := 0
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}
		if now.Sub(info.ModTime()) <= MaxAge {
			continue
		}
		if err := os.Remove(filepath.Join(b.dir, entry.Name())); err == nil {
			removed++
		}
	}

	return removed, nil
}

func splitLast(value string, separator byte) string {
	for index := len(value) - 1; index >= 0; index-- {
		if value[index] == separator {
			return value[index+1:]
		}
	}
	return ""
}
