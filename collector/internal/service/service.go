// Package service instala el colector para que arranque solo con la máquina.
//
// Se usa el programador de tareas de Windows (`schtasks`) y no un servicio del
// SCM por una razón concreta: un servicio de verdad obliga a hablar el
// protocolo del Service Control Manager, y eso exige una dependencia externa.
// El colector es de biblioteca estándar a propósito (§6.1) —lo que se instala
// en la red de un cliente se audita mejor cuanto menos trae dentro—, y una
// tarea al arranque cumple lo que importa: se levanta sola, sobrevive a
// reinicios y no necesita que nadie inicie sesión.
package service

import (
	"fmt"
	"os/exec"
	"runtime"
	"strings"
)

// Name es como aparece en el programador de tareas del cliente.
const Name = "EventReport Collector"

// Install registra el arranque automático. Requiere administrador.
func Install(binary, configPath string) error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("por ahora solo Windows; en Linux se instala como unidad de systemd (ver la guía)")
	}

	command := fmt.Sprintf(`"%s" run -config "%s"`, binary, configPath)

	// /ru SYSTEM: arranca sin que nadie inicie sesión, que es el punto.
	// /f: reemplaza una instalación anterior en vez de fallar.
	output, err := run("schtasks", "/create",
		"/tn", Name,
		"/tr", command,
		"/sc", "onstart",
		"/ru", "SYSTEM",
		"/rl", "HIGHEST",
		"/f",
	)
	if err != nil {
		if strings.Contains(output, "Acceso denegado") || strings.Contains(output, "Access is denied") {
			return fmt.Errorf("hace falta ejecutar como administrador para instalar el arranque automático")
		}
		return fmt.Errorf("no se pudo registrar la tarea: %s", strings.TrimSpace(output))
	}

	// Arrancarla ya, en vez de esperar al próximo reinicio.
	if _, err := run("schtasks", "/run", "/tn", Name); err != nil {
		return fmt.Errorf("la tarea quedó registrada pero no arrancó: reinicia el equipo")
	}
	return nil
}

// Uninstall quita el arranque automático y detiene lo que esté corriendo.
func Uninstall() error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("por ahora solo Windows")
	}

	_, _ = run("schtasks", "/end", "/tn", Name)
	output, err := run("schtasks", "/delete", "/tn", Name, "/f")
	if err != nil && !strings.Contains(output, "no existe") && !strings.Contains(output, "cannot find") {
		return fmt.Errorf("no se pudo quitar la tarea: %s", strings.TrimSpace(output))
	}
	return nil
}

// Installed dice si el arranque automático está registrado.
func Installed() bool {
	if runtime.GOOS != "windows" {
		return false
	}
	_, err := run("schtasks", "/query", "/tn", Name)
	return err == nil
}

func run(name string, args ...string) (string, error) {
	output, err := exec.Command(name, args...).CombinedOutput()
	return string(output), err
}
