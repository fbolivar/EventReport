//go:build windows

package config

import (
	"encoding/base64"
	"fmt"
	"syscall"
	"unsafe"
)

// Sellado de la frase de paso con DPAPI de máquina (Windows).
//
// Para arrancar como servicio, el colector tiene que abrir la credencial del
// firewall sin que nadie escriba nada. Guardar la frase en un archivo de texto
// sería regalar el token a cualquiera que copie la carpeta.
//
// DPAPI en ámbito de máquina cifra con una clave que vive en el propio Windows:
// el archivo sellado **no sirve en otro equipo**, ni siquiera con el mismo
// usuario. Quien tenga administrador local sobre esta máquina puede abrirlo —
// pero esa persona ya podía leer la configuración y ejecutar el colector, así
// que no se pierde nada que no estuviera perdido.
var (
	crypt32            = syscall.NewLazyDLL("crypt32.dll")
	kernel32           = syscall.NewLazyDLL("kernel32.dll")
	cryptProtectData   = crypt32.NewProc("CryptProtectData")
	cryptUnprotectData = crypt32.NewProc("CryptUnprotectData")
	localFree          = kernel32.NewProc("LocalFree")
)

const cryptprotectLocalMachine = 0x4

type dataBlob struct {
	size uint32
	data *byte
}

func newBlob(data []byte) dataBlob {
	if len(data) == 0 {
		return dataBlob{}
	}
	return dataBlob{size: uint32(len(data)), data: &data[0]}
}

func (b dataBlob) bytes() []byte {
	out := make([]byte, b.size)
	copy(out, unsafe.Slice(b.data, b.size))
	return out
}

// SealForMachine cifra un secreto de forma que solo esta máquina lo abra.
func SealForMachine(secret string) (string, error) {
	in := newBlob([]byte(secret))
	var out dataBlob

	ok, _, err := cryptProtectData.Call(
		uintptr(unsafe.Pointer(&in)),
		0, 0, 0, 0,
		cryptprotectLocalMachine,
		uintptr(unsafe.Pointer(&out)),
	)
	if ok == 0 {
		return "", fmt.Errorf("no se pudo sellar la frase de paso: %w", err)
	}
	defer localFree.Call(uintptr(unsafe.Pointer(out.data)))

	return base64.StdEncoding.EncodeToString(out.bytes()), nil
}

// OpenForMachine abre lo que selló esta misma máquina.
func OpenForMachine(sealed string) (string, error) {
	raw, err := base64.StdEncoding.DecodeString(sealed)
	if err != nil {
		return "", fmt.Errorf("la frase sellada no es válida: %w", err)
	}

	in := newBlob(raw)
	var out dataBlob

	ok, _, callErr := cryptUnprotectData.Call(
		uintptr(unsafe.Pointer(&in)),
		0, 0, 0, 0,
		cryptprotectLocalMachine,
		uintptr(unsafe.Pointer(&out)),
	)
	if ok == 0 {
		return "", fmt.Errorf("no se pudo abrir la frase de paso en esta máquina: %w", callErr)
	}
	defer localFree.Call(uintptr(unsafe.Pointer(out.data)))

	return string(out.bytes()), nil
}
