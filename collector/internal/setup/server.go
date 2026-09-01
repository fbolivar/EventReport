package setup

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"time"
)

// Device es lo que la página necesita saber hacer con un firewall. Lo
// implementa el comando del colector, que es quien sabe de adaptadores y de
// transporte; este paquete solo dibuja y valida.
type Device interface {
	// Test consulta el equipo y devuelve cómo se identifica.
	Test(ctx context.Context, host, token string, insecure bool) (Identity, error)
	// Connect registra el equipo y guarda la credencial cifrada.
	Connect(ctx context.Context, host, token, passphrase string, insecure bool) (Identity, error)
	// State describe lo que ya está hecho, para que la página no pregunte dos veces.
	State() State
}

type Identity struct {
	Hostname string `json:"hostname"`
	Model    string `json:"model"`
	Firmware string `json:"firmware"`
	// SyslogAddr es lo único que queda por hacer en el equipo.
	SyslogAddr string `json:"syslogAddr"`
}

type State struct {
	Enrolled bool   `json:"enrolled"`
	Tenant   string `json:"tenant"`
	Device   string `json:"device"`
	Host     string `json:"host"`
}

type request struct {
	Host       string `json:"host"`
	Token      string `json:"token"`
	Passphrase string `json:"passphrase"`
	Insecure   bool   `json:"insecure"`
}

// Serve abre el asistente en 127.0.0.1 y lo mantiene hasta que se cancele el
// contexto.
//
// **Solo escucha en loopback.** Esta página recibe la clave de la API del
// firewall: exponerla a la red sería regalarla a quien esté en la misma oficina.
func Serve(ctx context.Context, addr string, device Device, logger *slog.Logger) error {
	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		// Sin recursos externos: la máquina del cliente puede no tener salida a
		// internet cuando se instala, y el asistente igual tiene que abrir.
		w.Header().Set("Content-Security-Policy", "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'")
		_, _ = w.Write([]byte(pageHTML))
	})

	mux.HandleFunc("/api/state", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, device.State())
	})

	mux.HandleFunc("/api/test", func(w http.ResponseWriter, r *http.Request) {
		body, ok := decode(w, r)
		if !ok {
			return
		}

		timeout, cancel := context.WithTimeout(r.Context(), time.Minute)
		defer cancel()

		identity, err := device.Test(timeout, body.Host, body.Token, body.Insecure)
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": explain(err)})
			return
		}
		writeJSON(w, http.StatusOK, identity)
	})

	mux.HandleFunc("/api/connect", func(w http.ResponseWriter, r *http.Request) {
		body, ok := decode(w, r)
		if !ok {
			return
		}
		if body.Passphrase == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "falta la frase de protección"})
			return
		}

		timeout, cancel := context.WithTimeout(r.Context(), 2*time.Minute)
		defer cancel()

		identity, err := device.Connect(timeout, body.Host, body.Token, body.Passphrase, body.Insecure)
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": explain(err)})
			return
		}

		logger.Info("firewall conectado desde el asistente", "hostname", identity.Hostname)
		writeJSON(w, http.StatusOK, identity)
	})

	server := &http.Server{
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}

	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("abrir el asistente en %s: %w", addr, err)
	}

	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdown)
	}()

	logger.Info("asistente de instalación abierto", "url", "http://"+addr)
	if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}

func decode(w http.ResponseWriter, r *http.Request) (request, bool) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "método no permitido"})
		return request{}, false
	}

	var body request
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024)).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "no se entendió la solicitud"})
		return request{}, false
	}
	if body.Host == "" || body.Token == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "falta la dirección o la clave"})
		return request{}, false
	}
	return body, true
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// explain traduce los fallos técnicos a lo que el técnico tiene que hacer.
//
// "x509: certificate signed by unknown authority" no le dice nada a quien está
// instalando; "el equipo usa un certificado propio, marca la primera opción"
// sí. Un mensaje de error es parte del producto.
func explain(err error) string {
	text := err.Error()

	switch {
	case contains(text, "certificate signed by unknown authority"),
		contains(text, "x509"):
		return "El equipo usa un certificado propio. Elige “Aceptar el certificado autofirmado” y vuelve a intentar."
	case contains(text, "respondió 401"), contains(text, "respondió 403"):
		return "El equipo respondió que la clave no sirve. Revisa que copiaste la clave completa y que el usuario de API " +
			"tiene permiso de lectura y esta máquina en sus hosts de confianza."
	case contains(text, "no such host"), contains(text, "no route"), contains(text, "timeout"),
		contains(text, "i/o timeout"), contains(text, "connection refused"):
		return "No se pudo llegar al equipo. Comprueba la dirección y que esta máquina alcance su consola por HTTPS."
	case contains(text, "sin hostname"):
		return "La dirección responde, pero no parece un FortiGate. Revisa que sea la consola de administración."
	default:
		return text
	}
}

func contains(haystack, needle string) bool {
	return len(needle) > 0 && len(haystack) >= len(needle) && indexOf(haystack, needle) >= 0
}

func indexOf(haystack, needle string) int {
	for index := 0; index+len(needle) <= len(haystack); index++ {
		if haystack[index:index+len(needle)] == needle {
			return index
		}
	}
	return -1
}
