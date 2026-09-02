package setup

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strconv"
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
	// InstallService deja el colector arrancando solo con la máquina.
	InstallService() error
}

type Identity struct {
	Hostname string `json:"hostname"`
	Model    string `json:"model"`
	Firmware string `json:"firmware"`
	// SyslogAddr es lo único que queda por hacer en el equipo.
	SyslogAddr string `json:"syslogAddr"`
	// SyslogTargets son las direcciones IP de esta máquina, que es lo que el
	// técnico tiene que escribir en el firewall. Decir "0.0.0.0:514" no sirve:
	// nadie puede apuntar a esa dirección, y adivinarla lleva a apuntar a la
	// interfaz equivocada — pasó en la primera instalación real.
	SyslogTargets []string `json:"syslogTargets"`
}

type State struct {
	Enrolled bool   `json:"enrolled"`
	Tenant   string `json:"tenant"`
	Device   string `json:"device"`
	Host     string `json:"host"`
	// Service dice si ya arranca solo: mientras no lo haga, cerrar la ventana
	// apaga el colector, y eso hay que decirlo.
	Service bool `json:"service"`
}

type request struct {
	Host       string `json:"host"`
	Token      string `json:"token"`
	Passphrase string `json:"passphrase"`
	Insecure   bool   `json:"insecure"`
}

// Listen abre el asistente, y si el puerto está ocupado prueba el siguiente.
//
// El caso normal es que el técnico ejecute el instalador dos veces, o que haya
// un colector suyo ya corriendo: quien vio esto en una instalación real recibió
// `bind: Only one usage of each socket address...` en inglés y sin explicación,
// y el instalador se cerró. Un puerto de repuesto convierte eso en nada.
func Listen(addr string) (net.Listener, error) {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return nil, fmt.Errorf("dirección del asistente inválida: %w", err)
	}
	first, err := strconv.Atoi(port)
	if err != nil {
		return nil, fmt.Errorf("puerto del asistente inválido: %w", err)
	}

	for port := first; port < first+10; port++ {
		listener, err := net.Listen("tcp", net.JoinHostPort(host, strconv.Itoa(port)))
		if err == nil {
			return listener, nil
		}
	}
	return nil, fmt.Errorf(
		"los puertos %d a %d están ocupados: cierra la ventana del colector que ya está abierta y vuelve a ejecutar el instalador",
		first, first+9,
	)
}

// Serve abre el asistente en 127.0.0.1 y lo mantiene hasta que se cancele el
// contexto.
//
// **Solo escucha en loopback.** Esta página recibe la clave de la API del
// firewall: exponerla a la red sería regalarla a quien esté en la misma oficina.
func Serve(ctx context.Context, listener net.Listener, device Device, logger *slog.Logger) error {
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

	mux.HandleFunc("/api/service", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "método no permitido"})
			return
		}
		if err := device.InstallService(); err != nil {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
			return
		}
		logger.Info("arranque automático instalado desde el asistente")
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
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

	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdown)
	}()

	logger.Info("asistente de instalación abierto", "url", "http://"+listener.Addr().String())
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

// LocalAddresses lista las IPv4 de esta máquina, sin loopback.
//
// El orden importa: primero las de rangos privados, que son por las que un
// firewall de la misma red o de un túnel va a poder responder.
func LocalAddresses() []string {
	interfaces, err := net.Interfaces()
	if err != nil {
		return nil
	}

	var out []string
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		addresses, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, address := range addresses {
			ipNet, ok := address.(*net.IPNet)
			if !ok {
				continue
			}
			ip := ipNet.IP.To4()
			// Las 169.254.x son de "no conseguí dirección": ofrecerlas manda al
			// técnico a apuntar el firewall a una interfaz muerta.
			if ip == nil || ip.IsLinkLocalUnicast() {
				continue
			}
			out = append(out, ip.String())
		}
	}
	return out
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
