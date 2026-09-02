package config

import (
	"os"
	"path/filepath"
	"strings"
)

// MachineKeyPath es el archivo con la frase de paso sellada, junto a la
// configuración. Solo existe si el operador instaló el colector como servicio:
// hasta entonces la frase la escribe una persona en cada arranque.
func MachineKeyPath(configPath string) string {
	return filepath.Join(filepath.Dir(configPath), "machine.key")
}

// SaveMachineKey sella la frase para esta máquina y la guarda.
//
// El archivo se crea con permisos 0600. En Windows, además, el contenido está
// cifrado con DPAPI de máquina: copiarlo a otro equipo no sirve de nada.
func SaveMachineKey(configPath, passphrase string) error {
	sealed, err := SealForMachine(passphrase)
	if err != nil {
		return err
	}
	return os.WriteFile(MachineKeyPath(configPath), []byte(sealed), 0o600)
}

// LoadMachineKey devuelve la frase guardada, o cadena vacía si no hay ninguna.
//
// La ausencia no es un error: significa que este colector se ejecuta a mano y
// la frase la escribe una persona.
func LoadMachineKey(configPath string) (string, error) {
	raw, err := os.ReadFile(MachineKeyPath(configPath))
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}
	return OpenForMachine(strings.TrimSpace(string(raw)))
}

// RemoveMachineKey borra la frase guardada. Se usa al desinstalar el servicio:
// si el colector deja de arrancar solo, la frase no tiene por qué quedarse.
func RemoveMachineKey(configPath string) error {
	err := os.Remove(MachineKeyPath(configPath))
	if os.IsNotExist(err) {
		return nil
	}
	return err
}
