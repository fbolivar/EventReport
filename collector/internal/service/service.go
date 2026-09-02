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
	"os"
	"os/exec"
	"runtime"
	"strings"
)

// Name es como aparece en el programador de tareas del cliente.
const Name = "EventReport Collector"

// IsAdmin dice si este proceso puede registrar tareas de máquina.
func IsAdmin() bool {
	if runtime.GOOS != "windows" {
		return os.Geteuid() == 0
	}
	// `net session` solo funciona con privilegios administrativos: es la
	// comprobación que usa medio Windows y no necesita dependencias.
	return exec.Command("net", "session").Run() == nil
}

// Install registra el arranque automático.
//
// Si el proceso no es administrador, se relanza a sí mismo con UAC **solo para
// este paso**. El asistente corre sin elevar a propósito: un proceso elevado
// puede perder la VPN por la que el técnico llega al firewall, porque clientes
// como NetExtender montan el túnel por usuario.
func Install(binary, configPath string) error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("por ahora solo Windows; en Linux se instala como unidad de systemd (ver la guía)")
	}

	if !IsAdmin() {
		return elevate(binary, configPath)
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

	// El puerto del syslog, en el mismo paso elevado.
	//
	// Windows bloquea el tráfico entrante por defecto en los tres perfiles, así
	// que sin esta regla el firewall del cliente envía sus registros a un puerto
	// cerrado y el portal muestra "Actividad" vacía sin que nadie entienda por
	// qué. Es parte de instalar, no una tarea aparte para el técnico.
	if err := OpenSyslogPort(); err != nil {
		return err
	}

	// Arrancarla ya, en vez de esperar al próximo reinicio.
	if _, err := run("schtasks", "/run", "/tn", Name); err != nil {
		return fmt.Errorf("la tarea quedó registrada pero no arrancó: reinicia el equipo")
	}
	return nil
}

// OpenSyslogPort permite UDP 514 entrante. Requiere administrador.
func OpenSyslogPort() error {
	if runtime.GOOS != "windows" {
		return nil
	}

	output, err := run("netsh", "advfirewall", "firewall", "add", "rule",
		"name=EventReport syslog",
		"dir=in", "action=allow", "protocol=UDP", "localport=514",
	)
	if err != nil {
		return fmt.Errorf("no se pudo abrir el puerto 514 del firewall de Windows: %s", strings.TrimSpace(output))
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

// elevate vuelve a lanzar este mismo programa con UAC para instalar la tarea.
//
// Windows muestra el aviso; si el técnico lo rechaza, el mensaje lo dice en
// esos términos y no en los de un código de error.
func elevate(binary, configPath string) error {
	arguments := fmt.Sprintf("'service','install','-config','%s'", configPath)
	script := fmt.Sprintf(
		"Start-Process -FilePath '%s' -ArgumentList %s -Verb RunAs -Wait -WindowStyle Hidden",
		binary, arguments,
	)

	if output, err := run("powershell", "-NoProfile", "-Command", script); err != nil {
		if strings.Contains(output, "canceled") || strings.Contains(output, "cancelada") {
			return fmt.Errorf("Windows pidió permiso de administrador y se canceló; vuelve a intentarlo y acepta")
		}
		return fmt.Errorf("no se pudo pedir permiso de administrador: %s", strings.TrimSpace(output))
	}

	if !Installed() {
		return fmt.Errorf("Windows no autorizó la instalación; acepta el aviso de administrador y vuelve a intentar")
	}
	return nil
}

func run(name string, args ...string) (string, error) {
	output, err := exec.Command(name, args...).CombinedOutput()
	return string(output), err
}
