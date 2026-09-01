/**
 * El instalador que descarga el cliente (§6.8).
 *
 * Lleva el token dentro, así que no hay nada que copiar ni pegar: se descarga,
 * se ejecuta, y el asistente se abre solo en el navegador. Todo lo que el
 * técnico tiene que escribir —la dirección del firewall y su clave de API— se
 * escribe en esa página, que corre en su máquina.
 *
 * El script no trae credenciales del SaaS: el token de enrolamiento vale una
 * vez y 24 horas. Si alguien lo intercepta después de usarlo, no sirve.
 */
export interface InstallerInput {
  token: string;
  supabaseUrl: string;
  downloadUrl: string;
  tenantName: string;
}

const CRLF = "\r\n";
const BACKSLASH = "\\";

/**
 * Un `.cmd`, no un `.ps1`.
 *
 * Windows bloquea por política de ejecución cualquier script de PowerShell
 * descargado de internet: el cliente ve un error de seguridad en rojo y
 * abandona —pasó en la primera instalación real—. Un `.cmd` se ejecuta con
 * doble clic sin tocar ninguna política, y `curl.exe` viene incluido en Windows
 * desde 2018. De paso, un archivo bajado con curl no queda marcado como
 * "procedente de internet", así que el binario tampoco se bloquea.
 *
 * Los saltos de línea son CRLF a propósito: un `.cmd` con saltos de Unix falla
 * de formas difíciles de diagnosticar.
 */
export function windowsInstaller({
  token,
  supabaseUrl,
  downloadUrl,
  tenantName,
}: InstallerInput): string {
  // El archivo va en LOCALAPPDATA, no en ProgramData.
  //
  // El asistente corre sin elevar —un proceso elevado puede perder la VPN por
  // la que el tecnico llega al firewall— y un usuario normal no siempre puede
  // escribir en una carpeta de ProgramData que creo un administrador. El
  // servicio corre como SYSTEM, que sí puede leer aquí.
  const destino = `%LOCALAPPDATA%${BACKSLASH}EventReport`;

  const lines = [
    "@echo off",
    "setlocal",
    "",
    `title Instalacion de EventReport - ${ascii(tenantName)}`,
    "echo.",
    "echo   EventReport - instalacion del colector",
    "echo.",
    "",
    `set "DESTINO=${destino}"`,
    `set "BINARIO=%DESTINO%${BACKSLASH}collector.exe"`,
    'if not exist "%DESTINO%" mkdir "%DESTINO%"',
    "",
    "echo   Descargando el colector...",
    `curl.exe -fsSL "${downloadUrl}" -o "%BINARIO%"`,
    "if errorlevel 1 (",
    "  echo.",
    "  echo   No se pudo descargar el colector.",
    "  echo   Revisa la conexion a internet y vuelve a ejecutar este archivo.",
    "  echo.",
    "  pause",
    "  exit /b 1",
    ")",
    "",
    "echo   Registrando este equipo...",
    "echo.",
    `"%BINARIO%" setup -token "${token}" -url "${supabaseUrl}" -config "%DESTINO%${BACKSLASH}collector.json"`,
    "",
    "pause",
    "",
  ];

  return lines.map(ascii).join(CRLF);
}

/**
 * Quita acentos y cualquier carácter fuera de ASCII.
 *
 * `cmd.exe` lee el archivo con la tabla de caracteres del sistema, no en UTF-8:
 * una tilde parte la línea y Windows intenta ejecutar los pedazos como
 * comandos. Pasó en la primera instalación real —"'clientes' no se reconoce
 * como un comando"— y por eso el instalador es ASCII puro, sin excepciones.
 */
function ascii(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "");
}

export function linuxInstaller({
  token,
  supabaseUrl,
  downloadUrl,
  tenantName,
}: InstallerInput): string {
  return [
    "#!/usr/bin/env bash",
    "# Instalador de EventReport",
    `# Empresa: ${tenantName}`,
    "#",
    "# Ejecuta:  bash instalar-eventreport.sh",
    "set -euo pipefail",
    "",
    'destino="$HOME/.eventreport"',
    'mkdir -p "$destino"',
    "",
    'echo "  Descargando el colector..."',
    `curl -fsSL '${downloadUrl}' -o "$destino/collector"`,
    'chmod +x "$destino/collector"',
    "",
    'echo "  Registrando este equipo..."',
    `"$destino/collector" setup -token '${token}' -url '${supabaseUrl}' -config "$destino/collector.json"`,
    "",
  ].join("\n");
}
