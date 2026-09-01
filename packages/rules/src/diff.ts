import type { FirewallConfig } from "@eventreport/schema";

/**
 * Diff entre dos snapshots de configuración (docs/diseno-tecnico.md §8).
 *
 * Guardamos snapshots desde el primer día y hasta ahora nadie los comparaba.
 * Este es el informe que un auditor pide primero: qué cambió en el firewall,
 * cuándo y, si el syslog de administración lo dice, quién.
 *
 * Reglas de la comparación:
 * - Se comparan **objetos con identidad**, no textos: una política se sigue por
 *   su `id`, un administrador por su nombre. Reordenar la lista no es un cambio.
 * - Solo se miran los campos que importan para la seguridad. Que un contador de
 *   aciertos suba no es un cambio de configuración, y llenar el informe de ruido
 *   es la forma más rápida de que nadie lo lea.
 * - Ninguna credencial entra en el diff: ni PSK, ni comunidad SNMP, ni token.
 *   Un informe de cambios que filtra secretos es peor que no tenerlo.
 */
export type ChangeKind = "added" | "removed" | "modified";

export type ChangeSection =
  | "policies"
  | "nat"
  | "admins"
  | "mgmt_access"
  | "vpn"
  | "interfaces"
  | "services";

export interface ConfigChange {
  section: ChangeSection;
  kind: ChangeKind;
  /** Qué objeto cambió, en palabras del equipo: "Política 3 — SRV_ANY". */
  target: string;
  /** Campos que cambiaron, con su valor anterior y el nuevo. Vacío al agregar o quitar. */
  fields: Array<{ field: string; before: string; after: string }>;
}

/**
 * Una lista se compara como conjunto: se ordena antes de comparar.
 *
 * Sin esto, el orden en que el equipo devuelve los perfiles de inspección
 * —que no significa nada— aparecía como un cambio de configuración. El informe
 * se llenaría de cambios que nadie hizo, y a la tercera vez nadie lo abre.
 */
const list = (values: string[]) =>
  values.length === 0 ? "—" : [...values].sort((a, b) => a.localeCompare(b, "es")).join(", ");

/** Compara dos colecciones por su identidad y devuelve altas, bajas y cambios. */
function compare<T>(
  section: ChangeSection,
  previous: T[],
  next: T[],
  identity: (item: T) => string,
  label: (item: T) => string,
  fields: Array<{ name: string; read: (item: T) => string }>,
): ConfigChange[] {
  const before = new Map(previous.map((item) => [identity(item), item]));
  const after = new Map(next.map((item) => [identity(item), item]));
  const changes: ConfigChange[] = [];

  for (const [key, item] of after) {
    const old = before.get(key);
    if (!old) {
      changes.push({ section, kind: "added", target: label(item), fields: [] });
      continue;
    }

    const changed = fields
      .map((field) => ({
        field: field.name,
        before: field.read(old),
        after: field.read(item),
      }))
      .filter((field) => field.before !== field.after);

    if (changed.length > 0) {
      changes.push({ section, kind: "modified", target: label(item), fields: changed });
    }
  }

  for (const [key, item] of before) {
    if (!after.has(key)) {
      changes.push({ section, kind: "removed", target: label(item), fields: [] });
    }
  }

  return changes;
}

export function diffConfigs(previous: FirewallConfig, next: FirewallConfig): ConfigChange[] {
  return [
    ...compare(
      "policies",
      previous.policies,
      next.policies,
      (policy) => policy.id,
      (policy) => `Política ${policy.id} — ${policy.name}`,
      [
        // El orden de las políticas decide cuál coincide primero: mover una
        // regla hacia arriba puede abrir un permiso sin editar ninguna.
        { name: "Posición", read: (policy) => String(policy.position) },
        { name: "Habilitada", read: (policy) => (policy.enabled ? "sí" : "no") },
        { name: "Acción", read: (policy) => policy.action },
        { name: "Origen", read: (policy) => list(policy.src) },
        { name: "Destino", read: (policy) => list(policy.dst) },
        { name: "Servicios", read: (policy) => list(policy.services) },
        { name: "Registro", read: (policy) => policy.log },
        {
          name: "Inspección",
          read: (policy) =>
            list(
              Object.entries(policy.profiles)
                .filter(([, active]) => active)
                .map(([name]) => name),
            ),
        },
      ],
    ),
    ...compare(
      "nat",
      previous.nat,
      next.nat,
      (rule) => rule.id,
      (rule) => `NAT ${rule.id} (${rule.type})`,
      [
        { name: "Externo", read: (rule) => rule.external },
        { name: "Interno", read: (rule) => rule.internal },
        { name: "Puertos", read: (rule) => list(rule.ports) },
      ],
    ),
    ...compare(
      "admins",
      previous.admins,
      next.admins,
      (admin) => admin.name,
      (admin) => `Administrador ${admin.name}`,
      [
        { name: "Perfil", read: (admin) => admin.profile },
        { name: "Segundo factor", read: (admin) => (admin.mfa ? "sí" : "no") },
        { name: "Hosts de confianza", read: (admin) => list(admin.trustedHosts) },
      ],
    ),
    ...compare(
      "mgmt_access",
      previous.mgmtAccess,
      next.mgmtAccess,
      (access) => access.interfaceName,
      (access) => `Acceso administrativo en ${access.interfaceName}`,
      [
        { name: "Protocolos", read: (access) => list(access.protocols) },
        { name: "Es WAN", read: (access) => (access.isWan ? "sí" : "no") },
      ],
    ),
    ...compare(
      "vpn",
      previous.vpn.ipsec,
      next.vpn.ipsec,
      (tunnel) => tunnel.name,
      (tunnel) => `Túnel ${tunnel.name}`,
      [
        { name: "Par remoto", read: (tunnel) => tunnel.peer },
        { name: "IKE", read: (tunnel) => `v${tunnel.ikeVersion}` },
        { name: "Cifrado", read: (tunnel) => tunnel.encryption },
        { name: "Grupo DH", read: (tunnel) => String(tunnel.dhGroup) },
        // `auth` dice "psk" o "cert": el método, nunca la clave.
        { name: "Autenticación", read: (tunnel) => tunnel.auth },
      ],
    ),
    ...compare(
      "interfaces",
      previous.interfaces,
      next.interfaces,
      (item) => item.name,
      (item) => `Interfaz ${item.name}`,
      [{ name: "Zona", read: (item) => item.zone }],
    ),
  ];
}
