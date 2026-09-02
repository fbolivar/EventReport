package fortigate

import (
	"strconv"
	"strings"
)

// Hasta dónde llega lo que hemos comprobado de verdad.
//
// Fortinet renombra campos entre versiones mayores. Un campo que cambia de
// nombre no da error: se lee vacío, y una lista vacía se convierte en un
// aprobado silencioso —el fallo que ya costó cinco reglas—. La diferencia es
// que aquí no hay forma de detectarlo desde dentro: el firewall responde 200 y
// devuelve una estructura distinta.
//
// Lo único honesto es declarar el alcance. `verified` es la versión contra la
// que se probó contra hardware real; `expected` es la misma generación de API,
// donde los endpoints son los mismos pero nadie lo ha comprobado; `untested` es
// todo lo demás, y ahí el producto avisa antes de que alguien firme un informe.
const (
	FirmwareVerified = "verified"
	FirmwareExpected = "expected"
	FirmwareUntested = "untested"
)

// verifiedMajor y verifiedMinor son la versión probada contra un equipo real.
// Cambiar estos números sin haber probado contra esa versión es exactamente la
// mentira que este archivo existe para evitar.
const (
	verifiedMajor = 7
	verifiedMinor = 4
)

// expectedMajor es la generación de API con los mismos endpoints.
const expectedMajor = 7

// firmwareSupport clasifica la versión que anuncia el equipo.
func firmwareSupport(version string) string {
	major, minor, ok := parseVersion(version)
	if !ok {
		return FirmwareUntested
	}

	switch {
	case major == verifiedMajor && minor == verifiedMinor:
		return FirmwareVerified
	case major == expectedMajor:
		return FirmwareExpected
	default:
		return FirmwareUntested
	}
}

// parseVersion lee "v7.4.12" y devuelve 7 y 4.
func parseVersion(version string) (int, int, bool) {
	cleaned := strings.TrimPrefix(strings.TrimSpace(strings.ToLower(version)), "v")
	parts := strings.Split(cleaned, ".")
	if len(parts) < 2 {
		return 0, 0, false
	}

	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, false
	}
	minor, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, false
	}
	return major, minor, true
}
