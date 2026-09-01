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

export function windowsInstaller({
  token,
  supabaseUrl,
  downloadUrl,
  tenantName,
}: InstallerInput): string {
  // PowerShell con CRLF: un salto de línea Unix rompe el script en Windows.
  return [
    "# Instalador de EventReport",
    `# Empresa: ${tenantName}`,
    "#",
    "# Haz clic derecho sobre este archivo y elige 'Ejecutar con PowerShell'.",
    "# Descarga el colector, lo registra y abre el asistente en tu navegador.",
    "",
    "$ErrorActionPreference = 'Stop'",
    "$destino = Join-Path $env:LOCALAPPDATA 'EventReport'",
    "$binario = Join-Path $destino 'collector.exe'",
    "",
    "Write-Host ''",
    "Write-Host '  EventReport - instalacion del colector' -ForegroundColor Cyan",
    "Write-Host ''",
    "",
    "New-Item -ItemType Directory -Force -Path $destino | Out-Null",
    "",
    "Write-Host '  Descargando el colector...'",
    `Invoke-WebRequest -Uri '${downloadUrl}' -OutFile $binario -UseBasicParsing`,
    "",
    "Write-Host '  Registrando este equipo...'",
    `& $binario setup -token '${token}' -url '${supabaseUrl}' -config (Join-Path $destino 'collector.json')`,
    "",
  ].join("\r\n");
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
