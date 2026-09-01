/** Administrative access rules: FW-001 to FW-004 and FW-014. */
import type { Rule } from "../types.ts";

const RISKY_MGMT_PROTOCOLS = ["https", "http", "ssh", "telnet"] as const;

export const FW_001: Rule = {
  code: "FW-001",
  severity: "critical",
  evaluate: ({ config }) =>
    config.mgmtAccess
      .filter(
        (access) =>
          access.isWan &&
          access.protocols.some((protocol) =>
            RISKY_MGMT_PROTOCOLS.includes(protocol as (typeof RISKY_MGMT_PROTOCOLS)[number]),
          ),
      )
      .map((access) => {
        const iface = config.interfaces.find((item) => item.name === access.interfaceName);
        return {
          assetKey: access.interfaceName,
          assetLabel: `Interfaz ${access.interfaceName}`,
          evidence: [
            {
              label: "Interfaz",
              value: iface?.ip ? `${access.interfaceName} · ${iface.ip}` : access.interfaceName,
            },
            { label: "Protocolos habilitados", value: access.protocols.join(", ") },
          ],
        };
      }),
};

export const FW_002: Rule = {
  code: "FW-002",
  severity: "high",
  requires: (capabilities) => capabilities.adminMfa,
  evaluate: ({ config }) =>
    config.admins
      .filter((admin) => !admin.mfa)
      .map((admin) => ({
        assetKey: `admin:${admin.name}`,
        assetLabel: `Cuenta ${admin.name}`,
        evidence: [
          { label: "Cuenta", value: `${admin.name} · perfil ${admin.profile}` },
          { label: "Segundo factor", value: "deshabilitado" },
          ...(admin.lastLogin ? [{ label: "Último ingreso", value: admin.lastLogin }] : []),
        ],
      })),
};

export const FW_003: Rule = {
  code: "FW-003",
  severity: "high",
  evaluate: ({ config }) =>
    config.admins
      .filter((admin) => admin.trustedHosts.length === 0)
      .map((admin) => ({
        assetKey: `admin:${admin.name}`,
        assetLabel: `Cuenta ${admin.name}`,
        evidence: [
          { label: "Cuenta", value: admin.name },
          { label: "Hosts de confianza", value: "sin restricción" },
        ],
      })),
};

export const FW_004: Rule = {
  code: "FW-004",
  severity: "medium",
  evaluate: ({ config }) => {
    const supers = config.admins.filter((admin) => admin.profile === "super");
    if (supers.length <= 2) return [];

    return [
      {
        assetKey: "admins:super",
        assetLabel: `${supers.length} administradores con perfil total`,
        evidence: [
          { label: "Cuentas", value: supers.map((admin) => admin.name).join(", ") },
          { label: "Máximo recomendado", value: "2" },
        ],
      },
    ];
  },
};

export const FW_014: Rule = {
  code: "FW-014",
  severity: "low",
  evaluate: ({ config }) => {
    const snmp = config.services.snmp;
    if (!snmp || snmp.version === "v3" || !snmp.defaultCommunity) return [];

    return [
      {
        assetKey: "snmp",
        assetLabel: "Servicio SNMP",
        evidence: [
          { label: "Versión", value: snmp.version },
          { label: "Comunidad", value: "valor por defecto" },
        ],
      },
    ];
  },
};
