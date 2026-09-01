// Package setup sirve la página de instalación del colector (§6.8).
//
// El asistente vive **en la máquina del cliente**, no en el portal, por una
// razón concreta: el token de la API del firewall no puede viajar a la nube. Si
// viajara, un robo de nuestra base daría acceso a los firewalls de todos los
// clientes. Así que el técnico llena estos dos campos en su propio equipo y la
// credencial se queda ahí, cifrada.
//
// La página escucha solo en 127.0.0.1: nadie de la red puede abrirla.
package setup

const pageHTML = `<!doctype html>
<html lang="es-419">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Instalación de EventReport</title>
<style>
  :root {
    --ink: #0C1B2A; --ink-soft: #5A6B7C; --line: #E2E7EC;
    --paper: #FFFFFF; --mist: #F5F7F9; --brand: #1D4ED8;
    --ok: #0F766E; --bad: #B3261E;
    color-scheme: light;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--mist); color: var(--ink);
    font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  main { max-width: 34rem; margin: 0 auto; padding: 3rem 1.5rem 4rem; }
  h1 { font-size: 1.6rem; margin: 0 0 .25rem; letter-spacing: -0.01em; }
  .lead { color: var(--ink-soft); margin: 0 0 2rem; }
  .card { background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 1.5rem; }
  label { display: block; font-size: .8rem; color: var(--ink-soft); margin-bottom: .3rem; }
  input, select {
    width: 100%; height: 2.4rem; padding: 0 .7rem; font-size: .95rem;
    border: 1px solid var(--line); border-radius: 6px; background: var(--paper); color: var(--ink);
  }
  .field { margin-bottom: 1.1rem; }
  .hint { font-size: .78rem; color: var(--ink-soft); margin-top: .35rem; }
  .row { display: flex; gap: .75rem; align-items: center; margin-top: 1.5rem; }
  button {
    height: 2.4rem; padding: 0 1.1rem; border-radius: 6px; border: 1px solid var(--brand);
    background: var(--brand); color: #fff; font-size: .95rem; cursor: pointer;
  }
  button.secondary { background: var(--paper); color: var(--ink); border-color: var(--line); }
  button[disabled] { opacity: .55; cursor: default; }
  .msg { margin-top: 1.1rem; font-size: .9rem; white-space: pre-wrap; }
  .msg.ok { color: var(--ok); }
  .msg.bad { color: var(--bad); }
  .steps { list-style: none; padding: 0; margin: 0 0 1.75rem; display: grid; gap: .5rem; }
  .steps li { display: flex; gap: .6rem; align-items: baseline; font-size: .9rem; color: var(--ink-soft); }
  .steps b { color: var(--ink); font-weight: 600; }
  .done { color: var(--ok); }
  code { font: .85em ui-monospace, "Cascadia Mono", Menlo, monospace; background: var(--mist); padding: .1rem .3rem; border-radius: 4px; }
</style>
</head>
<body>
<main>
  <h1>Conectar tu firewall</h1>
  <p class="lead">Dos datos y listo. Esta página corre en tu equipo: la clave del firewall no sale de aquí.</p>

  <ul class="steps">
    <li><b id="s1">1.</b> <span id="t1">Colector registrado</span></li>
    <li><b id="s2">2.</b> <span id="t2">Conectar el firewall</span></li>
    <li><b id="s3">3.</b> <span id="t3">Empezar a medir</span></li>
  </ul>

  <div class="card">
    <div class="field">
      <label for="host">Dirección del firewall</label>
      <input id="host" placeholder="https://192.168.1.99" autocomplete="off" spellcheck="false">
      <p class="hint">La IP con la que entras a su consola de administración.</p>
    </div>

    <div class="field">
      <label for="token">Clave de API del firewall</label>
      <input id="token" type="password" autocomplete="off" spellcheck="false">
      <p class="hint">
        En el FortiGate: <code>System &gt; Administrators &gt; Create New &gt; REST API Admin</code>,
        con perfil de solo lectura. La clave se muestra una sola vez.
      </p>
    </div>

    <div class="field">
      <label for="passphrase">Frase para proteger la clave en este equipo</label>
      <input id="passphrase" type="password" autocomplete="off">
      <p class="hint">Con esto se cifra la clave en el disco. Guárdala donde guardas las credenciales del cliente.</p>
    </div>

    <div class="field">
      <label for="insecure">Certificado del equipo</label>
      <select id="insecure">
        <option value="true">Aceptar el certificado autofirmado (lo normal)</option>
        <option value="false">Verificarlo (solo si instalaste uno de una autoridad)</option>
      </select>
    </div>

    <div class="row">
      <button id="probar" class="secondary">Probar conexión</button>
      <button id="conectar">Conectar</button>
    </div>

    <p id="msg" class="msg"></p>
  </div>
</main>

<script>
const $ = (id) => document.getElementById(id);
const msg = $("msg");

function say(text, kind) {
  msg.textContent = text;
  msg.className = "msg" + (kind ? " " + kind : "");
}

function payload() {
  return {
    host: $("host").value.trim(),
    token: $("token").value,
    passphrase: $("passphrase").value,
    insecure: $("insecure").value === "true",
  };
}

async function call(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "no se pudo completar");
  return data;
}

$("probar").onclick = async () => {
  const data = payload();
  if (!data.host || !data.token) return say("Falta la dirección o la clave.", "bad");

  say("Consultando el equipo…");
  try {
    const result = await call("/api/test", data);
    say("Responde " + result.hostname + " · " + result.model + " · " + result.firmware, "ok");
  } catch (error) {
    say(String(error.message), "bad");
  }
};

$("conectar").onclick = async () => {
  const data = payload();
  if (!data.host || !data.token) return say("Falta la dirección o la clave.", "bad");
  if (!data.passphrase) return say("Escribe una frase para proteger la clave.", "bad");

  $("conectar").disabled = true;
  say("Conectando…");
  try {
    const result = await call("/api/connect", data);
    $("s2").className = "done";
    $("s3").className = "done";
    $("t2").textContent = "Firewall conectado: " + result.hostname;
    $("t3").textContent = "Midiendo. Puedes cerrar el navegador.";
    say(
      "Listo. El colector ya está midiendo: en unos minutos verás tu firewall en el portal.\n\n" +
        "Deja abierta la ventana negra de la instalación — ahí corre el colector.\n" +
        "Falta un paso en el equipo: apunta su syslog a " + result.syslogAddr + ".",
      "ok",
    );
  } catch (error) {
    say(String(error.message), "bad");
    $("conectar").disabled = false;
  }
};

fetch("/api/state").then((r) => r.json()).then((state) => {
  if (state.enrolled) {
    $("s1").className = "done";
    $("t1").textContent = "Colector registrado en " + state.tenant;
  }
  if (state.device) {
    $("s2").className = "done";
    $("t2").textContent = "Firewall conectado: " + state.device;
    $("host").value = state.host || "";
  }
});
</script>
</body>
</html>`
