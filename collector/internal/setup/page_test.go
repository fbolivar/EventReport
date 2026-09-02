package setup

import (
	"strings"
	"testing"
)

// El asistente es una página escrita a mano dentro de una cadena de Go, así que
// nada la compila: un salto de línea dentro de un literal de JavaScript pasa el
// `go build`, rompe el script entero en el navegador y deja **todos** los
// botones muertos. Le pasó a un técnico con el firewall delante: abrió el
// asistente, pulsó "Probar conexión" y no ocurrió nada, sin ningún error a la
// vista. Este test es lo único que separa ese fallo de la máquina del cliente.
func TestElScriptDelAsistenteNoTieneCadenasSinCerrar(t *testing.T) {
	inicio := strings.Index(pageHTML, "<script>")
	fin := strings.Index(pageHTML, "</script>")
	if inicio < 0 || fin < 0 {
		t.Fatal("la página perdió su script")
	}

	for numero, linea := range strings.Split(pageHTML[inicio:fin], "\n") {
		if abierta(linea) {
			t.Errorf("línea %d del script: cadena sin cerrar al final de la línea\n\t%s",
				numero+1, strings.TrimSpace(linea))
		}
	}
}

// abierta dice si la línea termina dentro de un literal de cadena.
func abierta(linea string) bool {
	var comilla byte
	for i := 0; i < len(linea); i++ {
		c := linea[i]
		switch {
		case c == '\\' && comilla != 0:
			i++ // lo escapado no cuenta
		case comilla != 0:
			if c == comilla {
				comilla = 0
			}
		case c == '"' || c == '\'':
			comilla = c
		case c == '/' && i+1 < len(linea) && linea[i+1] == '/':
			return false // comentario: lo que sigue no es código
		}
	}
	return comilla != 0
}
