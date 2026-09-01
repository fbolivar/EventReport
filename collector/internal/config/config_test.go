package config

import (
	"crypto/ed25519"
	"path/filepath"
	"strings"
	"testing"
)

func TestEncryptedSecretIsNotReadableOnDisk(t *testing.T) {
	sealed, err := Encrypt("fortigate-api-token-123", "frase-de-paso")
	if err != nil {
		t.Fatal(err)
	}

	if strings.Contains(sealed, "fortigate-api-token-123") {
		t.Fatal("el token no puede quedar legible en el archivo de configuración")
	}

	opened, err := Decrypt(sealed, "frase-de-paso")
	if err != nil {
		t.Fatal(err)
	}
	if opened != "fortigate-api-token-123" {
		t.Fatalf("descifrado = %q", opened)
	}
}

func TestWrongPassphraseFailsInsteadOfReturningGarbage(t *testing.T) {
	sealed, err := Encrypt("token", "correcta")
	if err != nil {
		t.Fatal(err)
	}

	if _, err := Decrypt(sealed, "incorrecta"); err == nil {
		t.Fatal("una frase de paso equivocada debe fallar, no devolver basura")
	}
}

func TestEncryptIsNotDeterministic(t *testing.T) {
	first, err := Encrypt("token", "frase")
	if err != nil {
		t.Fatal(err)
	}
	second, err := Encrypt("token", "frase")
	if err != nil {
		t.Fatal(err)
	}

	if first == second {
		t.Fatal("dos cifrados del mismo secreto no pueden coincidir: delataría el valor")
	}
}

func TestSigningKeyRoundTrip(t *testing.T) {
	seed, public, err := NewSigningKey()
	if err != nil {
		t.Fatal(err)
	}

	file := &File{PrivateKey: seed}
	key, err := file.SigningKey()
	if err != nil {
		t.Fatal(err)
	}

	message := []byte("heartbeat")
	signature := ed25519.Sign(key, message)

	decoded, err := decodeBase64(public)
	if err != nil {
		t.Fatal(err)
	}
	if !ed25519.Verify(decoded, message, signature) {
		t.Fatal("la clave pública registrada en la nube debe validar lo que firma el colector")
	}
}

func TestLoadReportsNotEnrolled(t *testing.T) {
	if _, err := Load(filepath.Join(t.TempDir(), "no-existe.json")); err != ErrNotEnrolled {
		t.Fatalf("error = %v, se esperaba ErrNotEnrolled", err)
	}
}

func TestSaveAndLoadRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "collector.json")

	original := &File{
		CollectorID: "col-1",
		BaseURL:     "https://example.supabase.co",
		SyslogAddr:  "0.0.0.0:514",
		VaultDays:   30,
		Devices:     []Device{{FirewallID: "fw-1", Brand: "fortigate", SourceIP: "10.10.0.1"}},
	}

	if err := Save(path, original); err != nil {
		t.Fatal(err)
	}

	loaded, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.CollectorID != "col-1" || len(loaded.Devices) != 1 {
		t.Fatalf("cargado = %+v", loaded)
	}
}
