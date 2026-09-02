//go:build windows

package vault

import (
	"os"
	"testing"
)

// El portal mostró "Disco libre 0 GB" en una instalación real.
func TestFreeGBDevuelveElEspacioDeVerdad(t *testing.T) {
	if libre := FreeGB(os.TempDir()); libre <= 0 {
		t.Fatalf("esperaba espacio libre en %s, devolvió %d GB", os.TempDir(), libre)
	}
}
