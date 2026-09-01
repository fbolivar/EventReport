package buffer

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestKeepsOrderAndSurvivesRestart(t *testing.T) {
	dir := t.TempDir()

	first, err := New(dir)
	if err != nil {
		t.Fatal(err)
	}
	for index := range 3 {
		if err := first.Enqueue("rollups", map[string]int{"n": index}); err != nil {
			t.Fatal(err)
		}
	}

	// A new instance stands for the process restarting.
	second, err := New(dir)
	if err != nil {
		t.Fatal(err)
	}

	pending, err := second.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(pending) != 3 {
		t.Fatalf("pendientes = %d", len(pending))
	}

	for index, item := range pending {
		var payload map[string]int
		if err := json.Unmarshal(item.Payload, &payload); err != nil {
			t.Fatal(err)
		}
		if payload["n"] != index {
			t.Fatalf("orden roto en %d: %v — los rollups se reenvían en orden", index, payload)
		}
		if item.Kind != "rollups" {
			t.Fatalf("tipo = %s", item.Kind)
		}
	}
}

func TestAckRemovesOnlyWhatWasAccepted(t *testing.T) {
	dir := t.TempDir()
	buffer, _ := New(dir)

	buffer.Enqueue("rollups", map[string]int{"n": 1})
	buffer.Enqueue("config", map[string]int{"n": 2})

	pending, _ := buffer.List()
	if err := buffer.Ack(pending[0].Path); err != nil {
		t.Fatal(err)
	}

	remaining, _ := buffer.List()
	if len(remaining) != 1 || remaining[0].Kind != "config" {
		t.Fatalf("quedan = %+v", remaining)
	}
}

func TestPruneDropsWhatIsTooOldToMatter(t *testing.T) {
	dir := t.TempDir()
	buffer, _ := New(dir)
	buffer.Enqueue("rollups", map[string]int{"n": 1})

	pending, _ := buffer.List()
	old := time.Now().Add(-MaxAge - time.Hour)
	if err := os.Chtimes(pending[0].Path, old, old); err != nil {
		t.Fatal(err)
	}

	removed, err := buffer.Prune(time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if removed != 1 {
		t.Fatalf("borrados = %d", removed)
	}
}

func TestPartialWriteIsNotVisible(t *testing.T) {
	dir := t.TempDir()
	buffer, _ := New(dir)

	// A dotfile stands for a write interrupted before the rename.
	if err := os.WriteFile(filepath.Join(dir, ".123-000001-rollups.json"), []byte("{"), 0o640); err != nil {
		t.Fatal(err)
	}

	pending, err := buffer.List()
	if err != nil {
		t.Fatal(err)
	}
	if len(pending) != 0 {
		t.Fatal("un archivo a medio escribir no debe aparecer como pendiente")
	}
}
