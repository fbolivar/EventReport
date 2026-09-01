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
// ProgramData y no LOCALAPPDATA: el colector corre como SYSTEM cuando arranca
  // con la máquina, y una ruta de máquina es la única que significa lo mismo
  // para el técnico y para el servicio.
  const destino = `%ProgramData%${BACKSLASH}EventReport`;

  return [
    "@echo off",
    "setlocal",
    "chcp 65001 > nul",
    "",
    ":: NO se eleva aquí, a propósito.",
    ":: Un proceso elevado corre en otro contexto de usuario y puede perder la",
    ":: VPN con la que el técnico llega al firewall — NetExtender y otros",
    ":: clientes montan el túnel por usuario. El asistente tiene que hablar con",
    ":: el equipo, así que corre como quien lo instala; los permisos de",
    ":: administrador se piden solo al final, para dejarlo arrancando solo.",
    "",
    `title Instalacion de EventReport - ${tenantName}`,
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
    "  echo   No se pudo descargar el colector. Revisa la conexion a internet.",
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
  ].join(CRLF);
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
