/** Policy and NAT rules: FW-006 to FW-010 and FW-020. */
import type { Policy } from "@eventreport/schema";

import { daysBetween, type Rule } from "../types.ts";

const ANY_VALUES = ["any", "all", "0.0.0.0/0", "::/0", "*"];

const isAny = (values: string[]) =>
  values.length === 0 || values.some((value) => ANY_VALUES.includes(value.toLowerCase()));

const label = (policy: Policy) => `Política ${policy.id} — ${policy.name}`;
const key = (policy: Policy) => `policy:${policy.id}`;

/** Zones the configuration marks as internet-facing. */
function wanZones(zones: Array<{ zone: string; role: string }>): Set<string> {
  return new Set(zones.filter((item) => item.role === "wan").map((item) => item.zone));
}

export const FW_006: Rule = {
  code: "FW-006",
  severity: "critical",
  evaluate: ({ config }) =>
    config.policies
      .filter(
        (policy) =>
          policy.enabled &&
          policy.action === "allow" &&
          isAny(policy.src) &&
          isAny(policy.dst) &&
          isAny(policy.services),
      )
      .map((policy) => ({
        assetKey: key(policy),
        assetLabel: label(policy),
        evidence: [
          { label: "Política", value: `id ${policy.id} · ${policy.name}` },
          { label: "Origen y destino", value: `${policy.src.join(", ")} → ${policy.dst.join(", ")}` },
          { label: "Servicios", value: policy.services.join(", ") || "ALL" },
        ],
      })),
};

export const FW_007: Rule = {
  code: "FW-007",
  severity: "medium",
  requires: (capabilities) => capabilities.policyHitCount,
  evaluate: ({ config, now }) => {
    const stale = config.policies.filter((policy) => {
      if (!policy.enabled) return false;
      if (policy.hitCount === undefined) return false;
      if (policy.hitCount > 0 && policy.lastHit) return daysBetween(policy.lastHit, now) > 90;
      return policy.hitCount === 0;
    });

    if (stale.length === 0) return [];

    return [
      {
        assetKey: "policies:stale",
        assetLabel: `${stale.length} política${stale.length === 1 ? "" : "s"} sin tráfico`,
        evidence: [
          { label: "Políticas", value: stale.map((policy) => `id ${policy.id}`).join(", ") },
          { label: "Ventana", value: "90 días" },
        ],
      },
    ];
  },
};

export const FW_008: Rule = {
  code: "FW-008",
  severity: "medium",
  evaluate: ({ config }) =>
    config.policies
      .filter((policy) => policy.enabled && policy.action === "allow" && policy.log === "none")
      .map((policy) => ({
        assetKey: key(policy),
        assetLabel: label(policy),
        evidence: [
          { label: "Política", value: `id ${policy.id} · ${policy.name}` },
          { label: "Registro", value: "log=none" },
          ...(policy.hitCount === undefined
            ? []
            : [{ label: "Sesiones registradas", value: String(policy.hitCount) }]),
        ],
      })),
};

export const FW_009: Rule = {
  code: "FW-009",
  severity: "medium",
  requires: (capabilities) => capabilities.utmProfiles,
  evaluate: ({ config }) => {
    const wan = wanZones(config.interfaces);

    return config.policies
      .filter((policy) => {
        if (!policy.enabled || policy.action !== "allow") return false;
        const goesOut = policy.dstZones.some((zone) => wan.has(zone));
        const profiles = policy.profiles;
        const anyProfile =
          profiles.ips || profiles.av || profiles.web || profiles.appCtl || profiles.sslInspect;
        return goesOut && !anyProfile;
      })
      .map((policy) => ({
        assetKey: key(policy),
        assetLabel: label(policy),
        evidence: [
          { label: "Política", value: `id ${policy.id} · ${policy.name}` },
          { label: "Perfiles aplicados", value: "ninguno" },
          { label: "Destino", value: policy.dstZones.join(", ") },
        ],
      }));
  },
};

/** Ports that must never be published straight from the internet. */
const SENSITIVE_PORTS = new Map<string, string>([
  ["22", "SSH"],
  ["23", "Telnet"],
  ["3389", "Escritorio remoto"],
  ["1433", "SQL Server"],
  ["3306", "MySQL"],
  ["5432", "PostgreSQL"],
  ["5900", "VNC"],
  ["27017", "MongoDB"],
]);

export const FW_010: Rule = {
  code: "FW-010",
  severity: "high",
  evaluate: ({ config }) =>
    config.nat
      .filter(
        (rule) => rule.type === "dnat" && rule.ports.some((port) => SENSITIVE_PORTS.has(port)),
      )
      .map((rule) => {
        const exposed = rule.ports.filter((port) => SENSITIVE_PORTS.has(port));
        return {
          assetKey: `nat:${rule.id}`,
          assetLabel: `NAT entrante ${rule.id}`,
          evidence: [
            { label: "Publicado", value: `${rule.external} → ${rule.internal}` },
            {
              label: "Servicios expuestos",
              value: exposed.map((port) => `${port} (${SENSITIVE_PORTS.get(port)})`).join(", "),
            },
          ],
        };
      }),
};

export const FW_020: Rule = {
  code: "FW-020",
  severity: "high",
  requires: (capabilities) => capabilities.geo,
  evaluate: ({ highRiskTraffic }) => {
    const destinations = highRiskTraffic ?? [];
    if (destinations.length === 0) return [];

    return [
      {
        assetKey: "traffic:high-risk",
        assetLabel: "Tráfico permitido a países de alto riesgo",
        evidence: destinations.map((destination) => ({
          label: destination.country,
          value: `${destination.sessions} sesiones permitidas`,
        })),
      },
    ];
  },
};
