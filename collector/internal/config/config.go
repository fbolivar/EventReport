// Package config stores what the collector needs to keep between runs.
//
// The firewall credentials live here and only here: they are encrypted at
// rest and never travel to the cloud, not in snapshots, not in heartbeats
// (design rule, CLAUDE.md). The Ed25519 private key is in the same file and
// is likewise never uploaded.
package config

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/ed25519"
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

// File is the on-disk shape.
type File struct {
	CollectorID string `json:"collectorId"`
	BaseURL     string `json:"baseUrl"`

	// PrivateKey is the Ed25519 key created at enrolment, base64 (pkcs8-free
	// raw seed). It never leaves this machine.
	PrivateKey string `json:"privateKey"`

	// SnapshotsPerDay y RollupMinutes los decide el plan y llegan en el
	// enrolamiento. Se guardan aquí para que el colector siga funcionando sin
	// consultar nada al arrancar, pero no son suyos: un cambio de plan los
	// reescribe en el siguiente enrolamiento.
	SnapshotsPerDay int `json:"snapshotsPerDay,omitempty"`
	RollupMinutes   int `json:"rollupMinutes,omitempty"`

	SyslogAddr   string `json:"syslogAddr"`
	VaultDir     string `json:"vaultDir"`
	VaultDays    int    `json:"vaultDays"`
	VaultQuotaGB int    `json:"vaultQuotaGb"`
	BufferDir    string `json:"bufferDir"`

	// Devices are the firewalls this collector serves, keyed by source IP.
	Devices []Device `json:"devices"`
}

// Device is one firewall: how to reach its API and how to recognise its logs.
type Device struct {
	FirewallID string `json:"firewallId"`
	Brand      string `json:"brand"`
	Host       string `json:"host"`
	SourceIP   string `json:"sourceIp"`
	// TokenEncrypted is the API token, sealed with the machine passphrase.
	TokenEncrypted string `json:"tokenEncrypted"`
	// Insecure records that the operator accepted the device's self-signed
	// certificate. Queda escrito en el archivo para que se pueda auditar
	// después: es una decisión, no un detalle de la conexión.
	Insecure bool `json:"insecure,omitempty"`
}

var ErrNotEnrolled = errors.New("el colector no está enrolado: ejecuta `collector enroll`")

// Load reads the configuration file.
func Load(path string) (*File, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrNotEnrolled
		}
		return nil, err
	}

	var file File
	if err := json.Unmarshal(raw, &file); err != nil {
		return nil, fmt.Errorf("configuración ilegible: %w", err)
	}
	return &file, nil
}

// Save writes it with owner-only permissions.
func Save(path string, file *File) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return err
	}

	raw, err := json.MarshalIndent(file, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, raw, 0o600)
}

// PrivateKey decodes the Ed25519 key.
func (f *File) SigningKey() (ed25519.PrivateKey, error) {
	seed, err := base64.StdEncoding.DecodeString(f.PrivateKey)
	if err != nil {
		return nil, fmt.Errorf("clave privada ilegible: %w", err)
	}
	if len(seed) != ed25519.SeedSize {
		return nil, fmt.Errorf("clave privada de %d bytes, se esperaban %d", len(seed), ed25519.SeedSize)
	}
	return ed25519.NewKeyFromSeed(seed), nil
}

// NewSigningKey generates the pair used from enrolment onwards and returns the
// public half so it can be registered in the cloud.
func NewSigningKey() (seedBase64 string, publicBase64 string, err error) {
	public, private, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return "", "", err
	}

	return base64.StdEncoding.EncodeToString(private.Seed()),
		base64.StdEncoding.EncodeToString(public),
		nil
}

// Encrypt seals a secret with a key derived from the passphrase.
//
// The passphrase comes from the machine (an operator-entered value, or DPAPI /
// the keyring in a later phase). What matters today is that the token is not
// sitting in clear text next to the binary.
func Encrypt(secret, passphrase string) (string, error) {
	salt := make([]byte, 16)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return "", err
	}

	key, err := deriveKey(passphrase, salt)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	sealed := gcm.Seal(nil, nonce, []byte(secret), nil)
	return base64.StdEncoding.EncodeToString(append(append(salt, nonce...), sealed...)), nil
}

// Decrypt opens what Encrypt sealed.
func Decrypt(encoded, passphrase string) (string, error) {
	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", err
	}

	if len(raw) < 16 {
		return "", errors.New("secreto cifrado incompleto")
	}
	key, err := deriveKey(passphrase, raw[:16])
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(raw) < 16+nonceSize {
		return "", errors.New("secreto cifrado incompleto")
	}

	plain, err := gcm.Open(nil, raw[16:16+nonceSize], raw[16+nonceSize:], nil)
	if err != nil {
		return "", errors.New("no se pudo descifrar: ¿frase de paso incorrecta?")
	}
	return string(plain), nil
}

// deriveKey stretches the passphrase. 200k iterations of PBKDF2-SHA256 costs
// the operator a fraction of a second and costs an attacker with the disk a
// great deal more.
func deriveKey(passphrase string, salt []byte) ([]byte, error) {
	return pbkdf2.Key(sha256.New, passphrase, salt, 200_000, 32)
}

// decodeBase64 is a small helper the tests use to read the public key back.
func decodeBase64(value string) ([]byte, error) {
	return base64.StdEncoding.DecodeString(value)
}
