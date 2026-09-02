package fortigate

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
)

// respuestas contesta según la ruta pedida, como haría el firewall.
type respuestas map[string]string

func (r respuestas) Do(request *http.Request) (*http.Response, error) {
	for ruta, cuerpo := range r {
		if strings.Contains(request.URL.Path, ruta) {
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(cuerpo)),
				Header:     http.Header{},
			}, nil
		}
	}
	return &http.Response{
		StatusCode: http.StatusNotFound,
		Body:       io.NopCloser(strings.NewReader(`{}`)),
		Header:     http.Header{},
	}, nil
}

// Saber a dónde envía sus registros el firewall es lo que separa "no está
// configurado" de "los paquetes no llegan": dos problemas que se arreglan de
// formas opuestas, y que el producto confundía porque esta lista era fija.
func TestLeeLosDestinosDeSyslog(t *testing.T) {
	adapter := &Adapter{Host: "https://192.168.0.1", Token: "x", HTTP: respuestas{
		"log.syslogd/setting":  `{"results":{"status":"enable","server":"10.212.134.202","port":514}}`,
		"log.syslogd2/setting": `{"results":{"status":"enable","server":"10.0.0.9","port":"1514"}}`,
		"log.syslogd3/setting": `{"results":{"status":"disable","server":"10.0.0.99","port":514}}`,
	}}

	targets := adapter.fetchSyslogTargets(context.Background())

	esperado := []string{"10.212.134.202", "10.0.0.9:1514"}
	if len(targets) != len(esperado) {
		t.Fatalf("esperaba %v, obtuvo %v", esperado, targets)
	}
	for i, want := range esperado {
		if targets[i] != want {
			t.Errorf("destino %d: esperaba %q, obtuvo %q", i, want, targets[i])
		}
	}
}

// Un firewall sin syslog configurado es un hallazgo, no un fallo: la lista
// vacía tiene que ser una lista, nunca nil, porque al otro lado se serializa
// como `null` y rompe el motor de reglas.
func TestSinSyslogDevuelveListaVacia(t *testing.T) {
	adapter := &Adapter{Host: "https://192.168.0.1", Token: "x", HTTP: respuestas{}}

	targets := adapter.fetchSyslogTargets(context.Background())
	if targets == nil {
		t.Fatal("devolvió nil; debe ser una lista vacía")
	}
	if len(targets) != 0 {
		t.Fatalf("esperaba vacío, obtuvo %v", targets)
	}
}
