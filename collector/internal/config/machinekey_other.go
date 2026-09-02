//go:build !windows

package config

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"os"
)

// Fuera de Windows no hay DPAPI.
//
// El equivalente honesto es un archivo con permisos 0600 —lo escribe
// `SaveMachineKey`— y aquí solo se ofusca con un HMAC del hostname para que un
// vistazo casual no muestre la frase. **No es cifrado**: en Linux la protección
// real son los permisos del archivo y quién puede leerlo, y así está escrito en
// la guía de instalación.
func SealForMachine(secret string) (string, error) {
	host, _ := os.Hostname()
	mac := hmac.New(sha256.New, []byte("eventreport:"+host))
	mac.Write([]byte(secret))

	blob := append(mac.Sum(nil)[:8], []byte(secret)...)
	return base64.StdEncoding.EncodeToString(blob), nil
}

func OpenForMachine(sealed string) (string, error) {
	raw, err := base64.StdEncoding.DecodeString(sealed)
	if err != nil || len(raw) < 8 {
		return "", fmt.Errorf("la frase guardada no es válida")
	}
	return string(raw[8:]), nil
}
