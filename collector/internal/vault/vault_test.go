package vault

import (
	"compress/gzip"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func readGzip(t *testing.T, path string) string {
	t.Helper()

	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("abrir %s: %v", path, err)
	}
	defer file.Close()

	reader, err := gzip.NewReader(file)
	if err != nil {
		t.Fatalf("gzip %s: %v", path, err)
	}
	defer reader.Close()

	content, err := io.ReadAll(reader)
	if err != nil {
		t.Fatalf("leer %s: %v", path, err)
	}
	return string(content)
}

func TestWritesOneFilePerHourAndDevice(t *testing.T) {
	root := t.TempDir()
	vault := New(root, 30, 0)

	ten := time.Date(2026, 9, 1, 10, 15, 0, 0, time.UTC)
	eleven := time.Date(2026, 9, 1, 11, 2, 0, 0, time.UTC)

	if err := vault.Write("FGT60F", ten, []byte("linea de las diez")); err != nil {
		t.Fatal(err)
	}
	if err := vault.Write("FGT60F", eleven, []byte("linea de las once")); err != nil {
		t.Fatal(err)
	}
	if err := vault.Close(); err != nil {
		t.Fatal(err)
	}

	first := filepath.Join(root, "FGT60F", "2026-09-01", "10.log.gz")
	second := filepath.Join(root, "FGT60F", "2026-09-01", "11.log.gz")

	if got := readGzip(t, first); !strings.Contains(got, "linea de las diez") {
		t.Fatalf("archivo de las 10 = %q", got)
	}
	if got := readGzip(t, second); !strings.Contains(got, "linea de las once") {
		t.Fatalf("archivo de las 11 = %q", got)
	}
}

func TestVaultDisabledWritesNothing(t *testing.T) {
	root := t.TempDir()
	vault := New(root, 0, 0)

	if vault.Enabled() {
		t.Fatal("con retención 0 la bóveda está apagada")
	}
	if err := vault.Write("FGT60F", time.Now(), []byte("nada")); err != nil {
		t.Fatal(err)
	}

	entries, err := os.ReadDir(root)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 0 {
		t.Fatalf("no debería escribir nada: %v", entries)
	}
}

func TestRotateDeletesBeyondRetention(t *testing.T) {
	root := t.TempDir()
	vault := New(root, 7, 0)

	old := filepath.Join(root, "FGT60F", "2026-08-01")
	if err := os.MkdirAll(old, 0o750); err != nil {
		t.Fatal(err)
	}
	oldFile := filepath.Join(old, "10.log.gz")
	if err := os.WriteFile(oldFile, []byte("viejo"), 0o640); err != nil {
		t.Fatal(err)
	}

	// Backdate it beyond the retention window.
	past := time.Now().AddDate(0, 0, -30)
	if err := os.Chtimes(oldFile, past, past); err != nil {
		t.Fatal(err)
	}

	removed, err := vault.Rotate(time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if removed != 1 {
		t.Fatalf("borrados = %d", removed)
	}
	if _, err := os.Stat(oldFile); !os.IsNotExist(err) {
		t.Fatal("el archivo fuera de retención debería haberse borrado")
	}
}

func TestRotateEnforcesQuotaOldestFirst(t *testing.T) {
	root := t.TempDir()
	// Retention is generous; the quota is what must bite.
	vault := New(root, 30, 10)

	dir := filepath.Join(root, "FGT60F", "2026-09-01")
	if err := os.MkdirAll(dir, 0o750); err != nil {
		t.Fatal(err)
	}

	older := filepath.Join(dir, "10.log.gz")
	newer := filepath.Join(dir, "11.log.gz")
	if err := os.WriteFile(older, []byte("0123456789"), 0o640); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(newer, []byte("0123456789"), 0o640); err != nil {
		t.Fatal(err)
	}

	past := time.Now().Add(-2 * time.Hour)
	if err := os.Chtimes(older, past, past); err != nil {
		t.Fatal(err)
	}

	if _, err := vault.Rotate(time.Now()); err != nil {
		t.Fatal(err)
	}

	if _, err := os.Stat(older); !os.IsNotExist(err) {
		t.Fatal("al llegar a la cuota se borra lo más antiguo primero")
	}
	if _, err := os.Stat(newer); err != nil {
		t.Fatal("lo más reciente debe sobrevivir")
	}
}
