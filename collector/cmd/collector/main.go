// Command collector is the agent that runs inside the customer's network.
//
//	collector enroll   registers against the SaaS with a single-use token
//	collector run      receives syslog, aggregates and uploads
//	collector test     checks it can reach the firewall's API
//	collector vault    queries the local raw-log vault
//
// Design reference: docs/diseno-tecnico.md section 6.
package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/fbolivar/eventreport/collector/internal/adapter"
	"github.com/fbolivar/eventreport/collector/internal/adapter/fortigate"
	"github.com/fbolivar/eventreport/collector/internal/aggregate"
	"github.com/fbolivar/eventreport/collector/internal/buffer"
	"github.com/fbolivar/eventreport/collector/internal/config"
	"github.com/fbolivar/eventreport/collector/internal/pipeline"
	"github.com/fbolivar/eventreport/collector/internal/service"
	"github.com/fbolivar/eventreport/collector/internal/setup"
	"github.com/fbolivar/eventreport/collector/internal/syslog"
	"github.com/fbolivar/eventreport/collector/internal/transport"
	"github.com/fbolivar/eventreport/collector/internal/vault"
)

// version is stamped into the heartbeat so the portal can offer updates.
const version = "0.1.0"

const usage = `EventReport collector

Uso:
  collector setup -token <token> -url <url-supabase>     asistente en el navegador
  collector enroll -token <token> -url <url-supabase>   registra este colector
  collector device add -brand <marca> -host <url> -token <token>  registra un firewall
  collector service install                              arranca solo con la máquina
  collector run                                          recibe, agrega y envía
  collector test                                         prueba la API del firewall
  collector flush                                        sube lo que quedó pendiente
  collector vault -device <id> -from <fecha> -to <fecha> consulta la bóveda local

Opciones comunes:
  -config <ruta>   archivo de configuración (por defecto ./collector.json)
`

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo}))

	if len(os.Args) < 2 {
		fmt.Print(usage)
		os.Exit(2)
	}

	command := os.Args[1]
	args := os.Args[2:]

	var err error
	switch command {
	case "enroll":
		err = runEnroll(args, logger)
	case "run":
		err = runCollector(args, logger)
	case "service":
		err = runService(args, logger)
	case "setup":
		err = runSetup(args, logger)
	case "device":
		err = runDevice(args, logger)
	case "test":
		err = runTest(args, logger)
	case "flush":
		err = runFlush(args, logger)
	case "vault":
		err = runVault(args, logger)
	case "-h", "--help", "help":
		fmt.Print(usage)
		return
	default:
		fmt.Print(usage)
		os.Exit(2)
	}

	if err != nil {
		logger.Error("el comando falló", "comando", command, "error", err)
		os.Exit(1)
	}
}

func configFlag(set *flag.FlagSet) *string {
	return set.String("config", "collector.json", "archivo de configuración")
}

// runEnroll registers the collector: it generates the Ed25519 pair, sends the
// public half with the single-use token, and stores what comes back. The
// private key is written here and never leaves.
func runEnroll(args []string, logger *slog.Logger) error {
	set := flag.NewFlagSet("enroll", flag.ExitOnError)
	path := configFlag(set)
	token := set.String("token", "", "token de un solo uso entregado por el portal")
	baseURL := set.String("url", "", "URL del proyecto Supabase")
	hostname := set.String("hostname", "", "nombre de este equipo (por defecto, el del sistema)")
	if err := set.Parse(args); err != nil {
		return err
	}

	if *token == "" || *baseURL == "" {
		return fmt.Errorf("faltan -token y -url")
	}

	name := *hostname
	if name == "" {
		name, _ = os.Hostname()
	}

	seed, public, err := config.NewSigningKey()
	if err != nil {
		return err
	}

	// The enrolment call is the only one without a signature: there is no
	// identity yet, and the single-use token is what authenticates it.
	logger.Info("enrolando", "url", *baseURL, "hostname", name)

	answer, err := postEnrolment(*baseURL, map[string]any{
		"token":     *token,
		"publicKey": public,
		"hostname":  name,
		"version":   version,
	})
	if err != nil {
		// Si la nube no responde, el operador todavía puede registrar la clave a
		// mano desde el portal. La mitad privada no viaja en ningún caso.
		logger.Warn("no se pudo completar el enrolamiento", "detalle", err)
		fmt.Printf("clave pública del colector: %s\n", public)
		fmt.Println("regístrala en el portal para completar el enrolamiento")
	}

	syslogAddr := answer.Config.SyslogAddr
	if syslogAddr == "" {
		syslogAddr = "0.0.0.0:514"
	}

	file := &config.File{
		CollectorID: answer.CollectorID,
		BaseURL:     *baseURL,
		PrivateKey:  seed,
		SyslogAddr:  syslogAddr,
		VaultDir:    filepath.Join(filepath.Dir(*path), "vault"),
		BufferDir:   filepath.Join(filepath.Dir(*path), "buffer"),
		// Los días de bóveda, los snapshots y el intervalo de rollups los
		// decide el plan, no el archivo local.
		VaultDays:       answer.Config.VaultDays,
		SnapshotsPerDay: answer.Config.SnapshotsPerDay,
		RollupMinutes:   answer.Config.RollupMinutes,
	}

	if err := config.Save(*path, file); err != nil {
		return err
	}

	if answer.CollectorID != "" {
		logger.Info("colector enrolado",
			"id", answer.CollectorID,
			"boveda_dias", answer.Config.VaultDays,
			"snapshots_por_dia", answer.Config.SnapshotsPerDay,
			"rollup_minutos", answer.Config.RollupMinutes)
	}
	return nil
}

// enrolmentAnswer is what the cloud sends back: the collector's identity and
// the operating parameters derived from the customer's plan. They are decided
// there and not here on purpose — a customer must not raise their own quota by
// editing a local file.
type enrolmentAnswer struct {
	CollectorID string `json:"collectorId"`
	Config      struct {
		SnapshotsPerDay      int    `json:"snapshotsPerDay"`
		RollupMinutes        int    `json:"rollupMinutes"`
		VaultDays            int    `json:"vaultDays"`
		CriticalEventsPerDay int    `json:"criticalEventsPerDay"`
		SyslogAddr           string `json:"syslogAddr"`
	} `json:"config"`
}

// postEnrolment performs the unsigned enrolment call and returns what the cloud
// assigns to this collector.
func postEnrolment(baseURL string, payload map[string]any) (enrolmentAnswer, error) {
	var answer enrolmentAnswer

	body, err := json.Marshal(payload)
	if err != nil {
		return answer, err
	}

	response, err := http.Post(
		strings.TrimRight(baseURL, "/")+"/functions/v1/enroll",
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return answer, err
	}
	defer response.Body.Close()

	raw, _ := io.ReadAll(response.Body)
	if response.StatusCode != http.StatusOK {
		return answer, fmt.Errorf("enroll respondió %d: %s", response.StatusCode, raw)
	}

	if err := json.Unmarshal(raw, &answer); err != nil {
		return answer, err
	}
	return answer, nil
}

// runSetup es el camino sin comandos: enrola si hace falta y abre el asistente
// en el navegador.
//
// Es lo que ejecuta el instalador que el cliente descarga del portal. La clave
// de la API del firewall se escribe en esa página, que corre aquí y solo
// escucha en loopback: nunca viaja al SaaS.
func runSetup(args []string, logger *slog.Logger) error {
	set := flag.NewFlagSet("setup", flag.ExitOnError)
	path := configFlag(set)
	token := set.String("token", "", "token de enrolamiento emitido por el portal")
	baseURL := set.String("url", "", "URL del proyecto Supabase")
	addr := set.String("addr", "127.0.0.1:8899", "dirección del asistente")
	open := set.Bool("open", true, "abrir el navegador automáticamente")
	if err := set.Parse(args); err != nil {
		return err
	}

	// Enrolar es idempotente desde fuera: si ya hay configuración, se respeta.
	// Un doble clic de más no puede dejar al cliente con dos colectores.
	//
	// Pero una configuración vieja puede apuntar a un colector que ya no existe
	// —alguien lo retiró desde el portal—, y entonces todo lo que el colector
	// firma se rechaza en silencio: arranca, dice que mide y no llega un dato.
	// Antes de respetarla, se comprueba que la identidad siga siendo válida.
	existing, err := config.Load(*path)
	switch {
	case err != nil:
		if *token == "" || *baseURL == "" {
			return fmt.Errorf("este colector no está registrado: falta -token y -url")
		}
		if err := runEnroll([]string{"-token", *token, "-url", *baseURL, "-config", *path}, logger); err != nil {
			return err
		}

	case !identityAccepted(existing):
		if *token == "" || *baseURL == "" {
			return fmt.Errorf("este colector ya no está registrado en el portal: emite un token nuevo")
		}
		logger.Warn("el registro anterior ya no vale; se vuelve a registrar este equipo",
			"colector", existing.CollectorID)
		if err := runEnroll([]string{"-token", *token, "-url", *baseURL, "-config", *path}, logger); err != nil {
			return err
		}
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	listener, err := setup.Listen(*addr)
	if err != nil {
		return err
	}
	url := "http://" + listener.Addr().String()

	if *open {
		openBrowser(url)
	}

	fmt.Printf("\n  Abre %s para conectar tu firewall.\n  Deja esta ventana abierta: aquí corre el colector.\n\n", url)

	// Cuando el técnico conecta el equipo, el colector empieza a medir en esta
	// misma ventana. Sin esto, el asistente terminaba sin recoger un solo dato
	// mientras la pantalla decía que estaba midiendo.
	device := &collectorDevice{path: *path, logger: logger, started: make(chan string, 1)}

	// Cada equipo conectado reinicia el bucle: el colector lee sus firewalls al
	// arrancar, así que uno agregado después no existiría para él hasta el
	// siguiente reinicio. Conectar dos equipos seguidos es lo normal en una
	// sede con dos firewalls.
	go func() {
		var running context.CancelFunc

		for {
			var passphrase string
			select {
			case passphrase = <-device.started:
			case <-ctx.Done():
				if running != nil {
					running()
				}
				return
			}

			if running != nil {
				running()
			}

			loop, cancel := context.WithCancel(ctx)
			running = cancel

			go func(loop context.Context, passphrase string) {
				logger.Info("midiendo")
				if err := collect(loop, *path, passphrase, logger); err != nil && loop.Err() == nil {
					logger.Error("el colector se detuvo", "error", err)
				}
			}(loop, passphrase)
		}
	}()

	return setup.Serve(ctx, listener, device, logger)
}

// identityAccepted comprueba que el portal siga reconociendo a este colector.
//
// Solo devuelve falso cuando la nube **rechaza** la identidad (401/403). Un
// problema de red devuelve verdadero: quedarse sin internet un minuto no puede
// borrar el registro de un colector que funciona.
func identityAccepted(file *config.File) bool {
	if file.CollectorID == "" || file.BaseURL == "" {
		return false
	}

	key, err := file.SigningKey()
	if err != nil {
		return false
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	// Los ceros de esta llamada se guardan como salud del colector, así que el
	// disco va con su valor real: mandar 0 pintaba "Disco libre 0 GB" en el
	// portal —una alerta roja— por una comprobación interna nuestra.
	client := transport.New(file.BaseURL, file.CollectorID, key)
	response, err := client.Post(ctx, "heartbeat", map[string]any{
		"version": version, "eps": 0, "droppedPct": 0.0,
		"queueDepth": 0, "diskFreeGb": vault.FreeGB(file.VaultDir), "clockSkewSeconds": 0,
	})
	if err != nil {
		return true
	}

	return response.Status != http.StatusUnauthorized && response.Status != http.StatusForbidden
}

// collectorDevice conecta el asistente con lo que el colector ya sabe hacer.
type collectorDevice struct {
	path   string
	logger *slog.Logger
	// started avisa una sola vez, con la frase de paso, para que el bucle del
	// colector arranque en cuanto haya un equipo conectado.
	started chan string
	// passphrase es la última frase que el técnico demostró correcta; se sella
	// solo si pide instalar el arranque automático.
	passphrase string
}

func (c *collectorDevice) Test(ctx context.Context, host, token string, insecure bool) (setup.Identity, error) {
	built, err := buildAdapterWith(config.Device{Brand: "fortigate", Host: host}, token, insecure)
	if err != nil {
		return setup.Identity{}, err
	}

	snapshot, err := built.FetchConfig(ctx)
	if err != nil {
		return setup.Identity{}, err
	}

	return setup.Identity{
		Hostname: snapshot.Device.Hostname,
		Model:    snapshot.Device.Model,
		Firmware: snapshot.Device.Firmware,
	}, nil
}

func (c *collectorDevice) Connect(ctx context.Context, host, token, passphrase string, insecure bool) (setup.Identity, error) {
	file, err := config.Load(c.path)
	if err != nil {
		return setup.Identity{}, err
	}

	device := config.Device{Brand: "fortigate", Host: host, Insecure: insecure, SourceIP: hostOnly(host)}
	built, err := buildAdapterWith(device, token, insecure)
	if err != nil {
		return setup.Identity{}, err
	}

	snapshot, err := built.FetchConfig(ctx)
	if err != nil {
		return setup.Identity{}, err
	}

	key, err := file.SigningKey()
	if err != nil {
		return setup.Identity{}, err
	}

	client := transport.New(file.BaseURL, file.CollectorID, key)
	response, err := client.Post(ctx, "register-device", map[string]any{
		"brand":        snapshot.Device.Brand,
		"hostname":     snapshot.Device.Hostname,
		"model":        snapshot.Device.Model,
		"serial":       snapshot.Device.Serial,
		"firmware":     snapshot.Device.Firmware,
		"capabilities": snapshot.Capabilities,
	})
	if err != nil {
		return setup.Identity{}, err
	}
	if response.Status != http.StatusOK {
		return setup.Identity{}, fmt.Errorf("el portal no aceptó el equipo (%d)", response.Status)
	}

	var answer struct {
		FirewallID string `json:"firewallId"`
	}
	if err := json.Unmarshal(response.Body, &answer); err != nil {
		return setup.Identity{}, err
	}

	sealed, err := config.Encrypt(token, passphrase)
	if err != nil {
		return setup.Identity{}, err
	}
	device.FirewallID = answer.FirewallID
	device.TokenEncrypted = sealed

	// El técnico acaba de demostrar cuál es la frase correcta: lo que no se abra
	// con ella es basura de un intento anterior y estorba. Se descarta junto con
	// cualquier entrada del mismo equipo o del mismo host.
	kept := make([]config.Device, 0, len(file.Devices)+1)
	for _, existing := range file.Devices {
		if existing.FirewallID == device.FirewallID || existing.Host == device.Host {
			continue
		}
		if _, err := config.Decrypt(existing.TokenEncrypted, passphrase); err != nil {
			c.logger.Warn("se descarta un firewall que no abre con esta frase de paso",
				"firewall", existing.FirewallID, "host", existing.Host)
			continue
		}
		kept = append(kept, existing)
	}
	file.Devices = append(kept, device)

	if err := config.Save(c.path, file); err != nil {
		return setup.Identity{}, err
	}

	// Arranca la medición sin bloquear la respuesta: el técnico ve "listo" y el
	// primer snapshot sale en segundos, no en la próxima ronda.
	c.passphrase = passphrase

	// Sin `default`: cada equipo conectado tiene que reiniciar el bucle, y el
	// canal tiene espacio para el aviso.
	c.started <- passphrase

	return setup.Identity{
		Hostname:      snapshot.Device.Hostname,
		Model:         snapshot.Device.Model,
		Firmware:      snapshot.Device.Firmware,
		SyslogAddr:    file.SyslogAddr,
		SyslogTargets: setup.LocalAddresses(),
	}, nil
}

// InstallService deja el colector arrancando con la máquina y guarda la frase
// sellada para que pueda abrir la credencial sin nadie delante.
func (c *collectorDevice) InstallService() error {
	binary, err := os.Executable()
	if err != nil {
		return err
	}

	absolute, err := filepath.Abs(c.path)
	if err != nil {
		return err
	}

	if c.passphrase != "" {
		if err := config.SaveMachineKey(absolute, c.passphrase); err != nil {
			return err
		}
	}

	if err := service.Install(binary, absolute); err != nil {
		// Si el arranque automático falla, la frase sellada no tiene por qué
		// quedarse en el disco.
		_ = config.RemoveMachineKey(absolute)
		return err
	}
	return nil
}

func (c *collectorDevice) State() setup.State {
	file, err := config.Load(c.path)
	if err != nil {
		return setup.State{}
	}

	state := setup.State{Enrolled: file.CollectorID != "", Service: service.Installed()}
	if len(file.Devices) > 0 {
		state.Device = file.Devices[0].FirewallID
		state.Host = file.Devices[0].Host
	}
	return state
}

// openBrowser abre la página del asistente. Si falla, no es un error: la
// dirección queda impresa en la consola y el técnico la abre a mano.
func openBrowser(url string) {
	var command *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		command = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		command = exec.Command("open", url)
	default:
		command = exec.Command("xdg-open", url)
	}
	_ = command.Start()
}

// runDevice registers the firewall this collector will watch.
//
// Es el segundo paso del onboarding, después de `enroll`: el técnico pega el
// host y el token de la API del equipo, el colector habla con él, sube al SaaS
// **lo que el equipo dice de sí mismo** —marca, modelo, serie, versión— y
// guarda el token cifrado en disco. El token no viaja: si viajara, un robo de
// nuestra base daría acceso a los firewalls de todos los clientes.
func runDevice(args []string, logger *slog.Logger) error {
	if len(args) == 0 || args[0] != "add" {
		return fmt.Errorf("uso: collector device add -brand <marca> -host <url> -token <token>")
	}

	set := flag.NewFlagSet("device add", flag.ExitOnError)
	path := configFlag(set)
	brand := set.String("brand", "fortigate", "marca del firewall")
	host := set.String("host", "", "URL de la API, por ejemplo https://192.168.1.99")
	token := set.String("token", os.Getenv("EVENTREPORT_DEVICE_TOKEN"), "token de la API del equipo")
	sourceIP := set.String("source-ip", "", "IP desde la que el equipo envía syslog (por defecto, la del host)")
	insecure := set.Bool("insecure", false, "aceptar el certificado autofirmado del equipo")
	passphrase := set.String("passphrase", os.Getenv("EVENTREPORT_PASSPHRASE"), "frase de paso para cifrar el token")
	if err := set.Parse(args[1:]); err != nil {
		return err
	}

	if *host == "" || *token == "" {
		return fmt.Errorf("faltan -host y -token")
	}
	if *passphrase == "" {
		return fmt.Errorf("falta -passphrase (o EVENTREPORT_PASSPHRASE): es lo que cifra el token en disco")
	}

	file, err := config.Load(*path)
	if err != nil {
		return err
	}

	device := config.Device{Brand: *brand, Host: *host, SourceIP: *sourceIP}
	built, err := buildAdapterWith(device, *token, *insecure)
	if err != nil {
		return err
	}

	if *insecure {
		logger.Warn("no se verificará el certificado del equipo",
			"host", *host,
			"motivo", "-insecure: la conexión sigue cifrada, pero no se comprueba con quién se habla")
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	// Se habla con el equipo **antes** de guardar nada: un token equivocado se
	// descubre aquí, con el técnico delante, y no tres días después cuando el
	// primer informe salga vacío.
	logger.Info("consultando el equipo", "host", *host, "marca", *brand)
	snapshot, err := built.FetchConfig(ctx)
	if err != nil {
		return fmt.Errorf("no se pudo leer la configuración del equipo: %w", err)
	}

	key, err := file.SigningKey()
	if err != nil {
		return err
	}

	client := transport.New(file.BaseURL, file.CollectorID, key)
	response, err := client.Post(ctx, "register-device", map[string]any{
		"brand":        snapshot.Device.Brand,
		"hostname":     snapshot.Device.Hostname,
		"model":        snapshot.Device.Model,
		"serial":       snapshot.Device.Serial,
		"firmware":     snapshot.Device.Firmware,
		"capabilities": snapshot.Capabilities,
	})
	if err != nil {
		return err
	}
	if response.Status != http.StatusOK {
		return fmt.Errorf("register-device respondió %d: %s", response.Status, response.Body)
	}

	var answer struct {
		FirewallID string `json:"firewallId"`
		IsNew      bool   `json:"isNew"`
	}
	if err := json.Unmarshal(response.Body, &answer); err != nil {
		return err
	}

	sealed, err := config.Encrypt(*token, *passphrase)
	if err != nil {
		return err
	}

	device.FirewallID = answer.FirewallID
	device.TokenEncrypted = sealed
	device.Insecure = *insecure
	if device.SourceIP == "" {
		device.SourceIP = hostOnly(*host)
	}

	// Un equipo se reemplaza por su id, no se duplica: repetir el comando con
	// otro token es la forma de rotar la credencial.
	replaced := false
	for index, existing := range file.Devices {
		if existing.FirewallID == device.FirewallID {
			file.Devices[index] = device
			replaced = true
			break
		}
	}
	if !replaced {
		file.Devices = append(file.Devices, device)
	}

	if err := config.Save(*path, file); err != nil {
		return err
	}

	logger.Info("equipo registrado",
		"firewall", answer.FirewallID,
		"hostname", snapshot.Device.Hostname,
		"modelo", snapshot.Device.Model,
		"firmware", snapshot.Device.Firmware,
		"nuevo", answer.IsNew)
	fmt.Printf("apunta el syslog del equipo a este colector (%s) y ejecuta `collector run`\n", file.SyslogAddr)
	return nil
}

// hostOnly extracts the address from a URL so syslog lines can be matched to a
// device without asking the operator to type the IP twice.
func hostOnly(raw string) string {
	trimmed := strings.TrimPrefix(strings.TrimPrefix(raw, "https://"), "http://")
	if index := strings.IndexAny(trimmed, ":/"); index > 0 {
		return trimmed[:index]
	}
	return trimmed
}

func buildAdapter(device config.Device, passphrase string) (adapter.Adapter, error) {
	token := ""
	if device.TokenEncrypted != "" && passphrase != "" {
		opened, err := config.Decrypt(device.TokenEncrypted, passphrase)
		if err != nil {
			return nil, err
		}
		token = opened
	}

	return buildAdapterWith(device, token, device.Insecure)
}

// buildAdapterWith is the half that does not need the vault:  has
// the token in hand and nothing encrypted yet.
func buildAdapterWith(device config.Device, token string, insecure bool) (adapter.Adapter, error) {
	switch device.Brand {
	case "fortigate":
		return &fortigate.Adapter{Host: device.Host, Token: token, Insecure: insecure}, nil
	default:
		return nil, fmt.Errorf("marca sin adaptador todavía: %s", device.Brand)
	}
}

// runCollector is the long-running mode: listen, vault, parse, aggregate,
// close hours at minute 05 and upload what is pending.
func runCollector(args []string, logger *slog.Logger) error {
	set := flag.NewFlagSet("run", flag.ExitOnError)
	path := configFlag(set)
	passphrase := set.String("passphrase", os.Getenv("EVENTREPORT_PASSPHRASE"), "frase de paso de las credenciales")
	if err := set.Parse(args); err != nil {
		return err
	}

	frase := *passphrase
	if frase == "" {
		// Instalado como servicio, no hay nadie para escribirla: se lee la que
		// quedó sellada para esta máquina.
		guardada, err := config.LoadMachineKey(*path)
		if err != nil {
			return err
		}
		frase = guardada
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	return collect(ctx, *path, frase, logger)
}

// runService instala o quita el arranque automático.
func runService(args []string, logger *slog.Logger) error {
	if len(args) == 0 {
		return fmt.Errorf("uso: collector service install|uninstall|status")
	}

	set := flag.NewFlagSet("service", flag.ExitOnError)
	path := configFlag(set)
	if err := set.Parse(args[1:]); err != nil {
		return err
	}

	absolute, err := filepath.Abs(*path)
	if err != nil {
		return err
	}

	switch args[0] {
	case "install":
		binary, err := os.Executable()
		if err != nil {
			return err
		}
		if err := service.Install(binary, absolute); err != nil {
			return err
		}
		logger.Info("arranque automático instalado", "tarea", service.Name)
		return nil

	case "uninstall":
		if err := service.Uninstall(); err != nil {
			return err
		}
		// La frase sellada solo existe para arrancar sin nadie delante.
		if err := config.RemoveMachineKey(absolute); err != nil {
			return err
		}
		logger.Info("arranque automático retirado")
		return nil

	case "status":
		if service.Installed() {
			fmt.Println("el colector arranca solo con la máquina")
		} else {
			fmt.Println("el colector no está instalado como servicio")
		}
		return nil

	default:
		return fmt.Errorf("uso: collector service install|uninstall|status")
	}
}

// collect es el bucle del colector: recibe, agrega, cierra horas y envía.
//
// Vive aparte de la orden `run` porque el asistente de instalación lo arranca
// en cuanto el técnico conecta el firewall. Antes no lo hacía y la pantalla
// decía "el colector quedó midiendo" mientras no medía nada: el cliente cerraba
// la ventana y no llegaba un solo dato.
func collect(ctx context.Context, path, passphrase string, logger *slog.Logger) error {
	file, err := config.Load(path)
	if err != nil {
		return err
	}

	key, err := file.SigningKey()
	if err != nil {
		return err
	}

	// La actividad no necesita la clave del firewall.
	//
	// El syslog llega solo, y para atribuir cada línea a su equipo basta la IP
	// de origen, que está en el archivo sin cifrar. Solo leer la configuración
	// —los hallazgos, la postura— necesita la credencial. Cuando las dos cosas
	// iban juntas, una credencial que no abría dejaba al cliente sin actividad
	// **y** sin configuración, cuando podía tener la mitad.
	//
	// Un equipo que no se puede abrir se queda igualmente en la lista: recibe
	// syslog, y el portal dirá que su configuración no se está leyendo.
	// Leer las líneas solo necesita saber la marca; la credencial es para la
	// API. Por eso un equipo cuya clave no abre entra igual en la lista, con un
	// adaptador sin token: sus líneas se entienden y su actividad se agrega.
	devices := make([]pipeline.Device, 0, len(file.Devices))
	legibles := make([]pipeline.Device, 0, len(file.Devices))
	for _, device := range file.Devices {
		built, err := buildAdapter(device, passphrase)
		if err != nil {
			logger.Error("no se pudo abrir la credencial de un firewall; se sigue recibiendo su actividad",
				"firewall", device.FirewallID,
				"host", device.Host,
				"detalle", err,
				"solucion", "vuelve a conectarlo desde el asistente con la frase correcta")

			sinToken, errMarca := buildAdapterWith(device, "", device.Insecure)
			if errMarca != nil {
				logger.Error("marca sin adaptador; se omite este equipo", "firewall", device.FirewallID, "error", errMarca)
				continue
			}
			devices = append(devices, pipeline.Device{
				FirewallID: device.FirewallID,
				SourceIP:   device.SourceIP,
				Adapter:    sinToken,
			})
			continue
		}

		entry := pipeline.Device{
			FirewallID: device.FirewallID,
			SourceIP:   device.SourceIP,
			Adapter:    built,
		}
		devices = append(devices, entry)
		legibles = append(legibles, entry)
	}
	if len(devices) == 0 {
		return fmt.Errorf("no hay firewalls configurados: agrégalos con el asistente del portal")
	}
	if len(legibles) == 0 {
		logger.Warn("ninguna credencial se pudo abrir: habrá actividad pero no configuración ni hallazgos")
	}

	listener := syslog.New(file.SyslogAddr)
	store := vault.New(file.VaultDir, file.VaultDays, int64(file.VaultQuotaGB)*1024*1024*1024)
	pending, err := buffer.New(file.BufferDir)
	if err != nil {
		return err
	}

	worker := pipeline.New(listener, store, aggregate.New(), pending, logger, devices)
	client := transport.New(file.BaseURL, file.CollectorID, key)

	if err := listener.Start(ctx); err != nil {
		return fmt.Errorf("abrir el receptor de syslog: %w", err)
	}
	worker.Run(ctx, 4)

	logger.Info("colector en marcha", "syslog", file.SyslogAddr, "firewalls", len(devices), "bóveda", file.VaultDays)

	flush := time.NewTicker(time.Minute)
	defer flush.Stop()
	upload := time.NewTicker(5 * time.Minute)
	defer upload.Stop()

	// Los snapshots por día los decide el plan y llegan en el enrolamiento.
	perDay := file.SnapshotsPerDay
	if perDay < 1 {
		perDay = 1
	}
	snapshot := time.NewTicker(time.Duration(24/perDay) * time.Hour)
	defer snapshot.Stop()

	// El primero se toma al arrancar: esperar horas a la primera foto deja al
	// cliente mirando un portal vacío justo cuando acaba de instalar.
	for _, device := range legibles {
		if err := enqueueSnapshot(ctx, pending, device); err != nil {
			logger.Error("no se pudo leer la configuración inicial", "firewall", device.FirewallID, "error", err)
		}
	}

	// Y se sube en el acto, sin esperar al reloj de cinco minutos.
	//
	// Esperarlo costó una instalación entera: el técnico conectó su FortiGate,
	// el asistente dijo que estaba midiendo, cerró la ventana —ya había
	// terminado— y el snapshot se quedó en el disco. En el portal, un colector
	// vivo y cero de todo lo demás. Lo que el cliente compara no es nuestro
	// intervalo de subida: es que al terminar de instalar, su firewall esté ahí.
	sendPending(ctx, client, pending, worker, listener, file.VaultDir, logger)
	logger.Info("configuración inicial enviada; tu firewall ya aparece en el portal")

	for {
		select {
		case <-ctx.Done():
			logger.Info("deteniendo el colector")
			listener.Close()
			worker.Wait()
			return store.Close()

		case <-flush.C:
			// Persist the vault every minute: a power cut must not cost more
			// than a minute of raw logs.
			if err := store.Flush(); err != nil {
				logger.Error("no se pudo vaciar la bóveda", "error", err)
			}
			if _, err := worker.CloseHours(time.Now().UTC()); err != nil {
				logger.Error("no se pudieron cerrar horas", "error", err)
			}
			if count, err := worker.FlushEvents(); err != nil {
				logger.Error("no se pudieron encolar los eventos", "error", err)
			} else if count > 0 {
				logger.Info("eventos críticos encolados", "cantidad", count)
			}

		case <-snapshot.C:
			// Un snapshot por intervalo del plan: es lo que refresca los
			// hallazgos. Sin esto el portal muestra la foto del día del alta y
			// nunca se entera de que el cliente arregló algo.
			for _, device := range legibles {
				if err := enqueueSnapshot(ctx, pending, device); err != nil {
					logger.Error("no se pudo leer la configuración", "firewall", device.FirewallID, "error", err)
				}
			}

		case <-upload.C:
			// La hora en curso también se sube: el cliente ve su actividad a
			// los minutos de instalar, no cuando termine la hora.
			if _, err := worker.SendOpenHours(); err != nil {
				logger.Error("no se pudo adelantar la hora en curso", "error", err)
			}
			sendPending(ctx, client, pending, worker, listener, file.VaultDir, logger)
			if _, err := store.Rotate(time.Now()); err != nil {
				logger.Error("no se pudo rotar la bóveda", "error", err)
			}
			if _, err := pending.Prune(time.Now()); err != nil {
				logger.Error("no se pudo limpiar el buffer", "error", err)
			}
		}
	}
}

// sendPending uploads queued payloads in order and reports health.
func sendPending(
	ctx context.Context,
	client *transport.Client,
	pending *buffer.Buffer,
	worker *pipeline.Pipeline,
	listener *syslog.Listener,
	vaultDir string,
	logger *slog.Logger,
) {
	stats := listener.Stats()
	unparsed, skew := worker.Quality()

	heartbeat := map[string]any{
		"version": version,
		// Eventos por segundo del último intervalo, no desde el arranque: lo
		// que interesa es si el equipo está hablando ahora.
		"eps":              stats.Received / 300,
		"droppedPct":       listener.DroppedPercent(),
		"queueDepth":       stats.Queued,
		"diskFreeGb":       vault.FreeGB(vaultDir),
		"clockSkewSeconds": skew,
		"unparsed":         unparsed,
		// Las direcciones de esta máquina: es lo que el portal necesita para
		// decirle al técnico a dónde apuntar el syslog del firewall. Sin esto,
		// el asistente del portal mostraba una IP de ejemplo y alguien la
		// copiaba tal cual.
		"addresses": setup.LocalAddresses(),
	}
	if _, err := client.Post(ctx, "heartbeat", heartbeat); err != nil {
		logger.Warn("heartbeat sin respuesta", "error", err)
	}

	items, err := pending.List()
	if err != nil {
		logger.Error("no se pudo leer el buffer", "error", err)
		return
	}

	for _, item := range items {
		var payload any
		if err := json.Unmarshal(item.Payload, &payload); err != nil {
			logger.Error("payload ilegible, se descarta", "archivo", item.Path)
			_ = pending.Ack(item.Path)
			continue
		}

		function := "ingest-" + item.Kind
		response, err := client.Post(ctx, function, payload)
		if err != nil {
			// No connection: stop here and keep the order for the next round.
			logger.Warn("envío pendiente", "función", function, "error", err)
			return
		}
		if response.Status >= 400 {
			logger.Error("la nube rechazó el envío", "función", function, "estado", response.Status, "respuesta", string(response.Body))
			// A rejected payload will not become valid by retrying it forever.
			_ = pending.Ack(item.Path)
			continue
		}

		_ = pending.Ack(item.Path)
	}
}

// enqueueSnapshot reads the firewall configuration and queues it for upload.
//
// Va al búfer y no directo a la red: si el enlace está caído, la foto no se
// pierde: se sube cuando vuelva, y el diff de la nube la comparará con la
// anterior igual que si hubiera llegado a tiempo.
func enqueueSnapshot(ctx context.Context, pending *buffer.Buffer, device pipeline.Device) error {
	timeout, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()

	config, err := device.Adapter.FetchConfig(timeout)
	if err != nil {
		return err
	}

	raw, err := json.Marshal(config)
	if err != nil {
		return err
	}
	sum := sha256.Sum256(raw)

	return pending.Enqueue("config", map[string]any{
		"firewallId":  device.FirewallID,
		"collectedAt": time.Now().UTC().Format(time.RFC3339),
		"sha256":      hex.EncodeToString(sum[:]),
		"config":      config,
	})
}

// runTest verifies the collector can reach each firewall's API.
func runTest(args []string, logger *slog.Logger) error {
	set := flag.NewFlagSet("test", flag.ExitOnError)
	path := configFlag(set)
	passphrase := set.String("passphrase", os.Getenv("EVENTREPORT_PASSPHRASE"), "frase de paso de las credenciales")
	if err := set.Parse(args); err != nil {
		return err
	}

	file, err := config.Load(*path)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	for _, device := range file.Devices {
		built, err := buildAdapter(device, *passphrase)
		if err != nil {
			return err
		}
		if err := built.TestConnection(ctx); err != nil {
			logger.Error("sin conexión con el firewall", "firewall", device.FirewallID, "error", err)
			continue
		}
		logger.Info("conexión correcta", "firewall", device.FirewallID, "marca", device.Brand)
	}

	return nil
}

// runVault is the local query over the raw logs: the portal reaches it through
// an evidence order in phase 5; the CLI is what exists in phase 1.
// runFlush sube lo que quedó en el búfer y termina.
//
// Existe porque los datos pendientes no necesitan la clave del firewall: ya
// están leídos y solo falta firmarlos y enviarlos. Cuando alguien cierra la
// ventana del colector antes de la primera subida —pasó, y el portal quedó con
// un colector vivo y cero datos—, esto los rescata sin volver a tocar el equipo.
func runFlush(args []string, logger *slog.Logger) error {
	set := flag.NewFlagSet("flush", flag.ExitOnError)
	path := configFlag(set)
	if err := set.Parse(args); err != nil {
		return err
	}

	file, err := config.Load(*path)
	if err != nil {
		return err
	}
	key, err := file.SigningKey()
	if err != nil {
		return err
	}

	pending, err := buffer.New(file.BufferDir)
	if err != nil {
		return err
	}
	items, err := pending.List()
	if err != nil {
		return err
	}
	if len(items) == 0 {
		logger.Info("no hay nada pendiente")
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	client := transport.New(file.BaseURL, file.CollectorID, key)
	enviados := 0
	for _, item := range items {
		var payload any
		if err := json.Unmarshal(item.Payload, &payload); err != nil {
			logger.Error("payload ilegible, se descarta", "archivo", item.Path)
			_ = pending.Ack(item.Path)
			continue
		}

		response, err := client.Post(ctx, "ingest-"+item.Kind, payload)
		if err != nil {
			return fmt.Errorf("no se pudo enviar %s: %w", item.Kind, err)
		}
		if response.Status >= 400 {
			logger.Error("la nube rechazó el envío", "tipo", item.Kind, "estado", response.Status, "respuesta", string(response.Body))
			_ = pending.Ack(item.Path)
			continue
		}

		_ = pending.Ack(item.Path)
		enviados++
		logger.Info("enviado", "tipo", item.Kind)
	}

	logger.Info("pendientes enviados", "cantidad", enviados)
	return nil
}

func runVault(args []string, logger *slog.Logger) error {
	set := flag.NewFlagSet("vault", flag.ExitOnError)
	path := configFlag(set)
	device := set.String("device", "", "identificador del firewall")
	if err := set.Parse(args); err != nil {
		return err
	}

	file, err := config.Load(*path)
	if err != nil {
		return err
	}

	store := vault.New(file.VaultDir, file.VaultDays, 0)
	used, err := store.UsedBytes()
	if err != nil {
		return err
	}

	logger.Info("bóveda local",
		"directorio", file.VaultDir,
		"retención", file.VaultDays,
		"ocupado_mb", used/1024/1024,
		"firewall", *device,
	)

	// TODO(fase 5): filtrar por IP, usuario y rango, y devolver como máximo N
	// filas según el plan.
	return nil
}
