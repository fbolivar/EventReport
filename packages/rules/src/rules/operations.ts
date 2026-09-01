/** Logging, maintenance and operational rules: FW-005, FW-015 to FW-019, OP-001 to OP-004. */
import { daysBetween, type Rule } from "../types.ts";

export const FW_005: Rule = {
  code: "FW-005",
  severity: "high",
  evaluate: ({ config, advisories = [] }) => {
    const match = advisories.find(
      (advisory) =>
        advisory.brand === config.device.brand && advisory.versions.includes(config.device.firmware),
    );
    if (!match) return [];

    return [
      {
        assetKey: "firmware",
        assetLabel: "Firmware del equipo",
        evidence: [
          { label: "Versión instalada", value: config.device.firmware },
          { label: "CVE conocido", value: `${match.cve} · ${match.cvss}` },
          { label: "Versión con parche", value: match.fixedIn },
        ],
      },
    ];
  },
};

export const FW_015: Rule = {
  code: "FW-015",
  severity: "low",
  evaluate: ({ config }) => {
    const { ntp, clockSkewSeconds } = config.services;
    const skewed = (clockSkewSeconds ?? 0) > 60;
    if (ntp.length > 0 && !skewed) return [];

    return [
      {
        assetKey: "ntp",
        assetLabel: "Sincronización de reloj",
        evidence: [
          { label: "Servidores NTP", value: ntp.length > 0 ? ntp.join(", ") : "ninguno" },
          { label: "Desfase actual", value: `${clockSkewSeconds ?? 0} s` },
        ],
      },
    ];
  },
};

export const FW_016: Rule = {
  code: "FW-016",
  severity: "medium",
  requires: (capabilities) => capabilities.licenses,
  evaluate: ({ config, now }) =>
    config.licenses
      .filter(
        (license) => license.status === "expired" || daysBetween(now, license.expiresAt) <= 30,
      )
      .map((license) => ({
        assetKey: `license:${license.feature}`,
        assetLabel: `Licencia ${license.feature}`,
        evidence: [
          { label: "Módulo", value: license.feature },
          { label: "Vence", value: license.expiresAt.slice(0, 10) },
          { label: "Estado", value: license.status },
        ],
      })),
};

export const FW_017: Rule = {
  code: "FW-017",
  severity: "low",
  evaluate: ({ config }) => {
    const targets = config.services.syslogTargets;
    if (targets.length > 1) return [];

    return [
      {
        assetKey: "syslog-targets",
        assetLabel: "Destinos de registro",
        evidence: [
          { label: "Destinos configurados", value: targets.join(", ") || "ninguno" },
          { label: "Destino secundario", value: "ninguno" },
        ],
      },
    ];
  },
};

export const FW_018: Rule = {
  code: "FW-018",
  severity: "medium",
  evaluate: ({ config }) => {
    const { haMode, haState } = config.device;
    if (haMode === "standalone" || haState === "healthy" || haState === undefined) return [];

    return [
      {
        assetKey: "ha",
        assetLabel: "Alta disponibilidad",
        evidence: [
          { label: "Modo", value: haMode },
          { label: "Estado", value: haState },
        ],
      },
    ];
  },
};

export const FW_019: Rule = {
  code: "FW-019",
  severity: "medium",
  evaluate: ({ signals }) => {
    if (signals.droppedPct <= 1) return [];

    return [
      {
        assetKey: "collector:dropped",
        assetLabel: "Pérdida de eventos en el colector",
        evidence: [
          { label: "Descartes", value: `${signals.droppedPct.toFixed(1)} %` },
          { label: "Umbral", value: "1 %" },
        ],
      },
    ];
  },
};

export const OP_001: Rule = {
  code: "OP-001",
  severity: "medium",
  evaluate: ({ signals, now }) => {
    const last = signals.lastHardeningReportAt;
    if (last && daysBetween(last, now) <= 180) return [];

    return [
      {
        assetKey: "hardening-review",
        assetLabel: "Revisión de reglas",
        evidence: [
          { label: "Última revisión", value: last ? last.slice(0, 10) : "sin registro" },
          { label: "Periodicidad exigida", value: "6 meses" },
        ],
      },
    ];
  },
};

export const OP_002: Rule = {
  code: "OP-002",
  severity: "medium",
  evaluate: ({ signals }) => {
    if (signals.untreatedCriticalEvents === 0) return [];

    return [
      {
        assetKey: "critical-events",
        assetLabel: "Eventos críticos sin cerrar",
        evidence: [
          { label: "Eventos sin tratamiento", value: String(signals.untreatedCriticalEvents) },
          { label: "Plazo", value: "7 días" },
        ],
      },
    ];
  },
};

/** Rollups in the cloud keep 90 days at full detail (section 9). */
const CLOUD_RETENTION_DAYS = 90;

export const OP_003: Rule = {
  code: "OP-003",
  severity: "high",
  evaluate: ({ signals }) => {
    const available = Math.max(signals.vaultDays, CLOUD_RETENTION_DAYS);
    if (signals.requiredRetentionDays === 0 || available >= signals.requiredRetentionDays) return [];

    return [
      {
        assetKey: "retention",
        assetLabel: "Retención de registros",
        evidence: [
          { label: "Bóveda local", value: `${signals.vaultDays} días` },
          { label: "Agregados en la nube", value: `${CLOUD_RETENTION_DAYS} días` },
          { label: "Exigido por el marco", value: `${signals.requiredRetentionDays} días` },
        ],
      },
    ];
  },
};

export const OP_004: Rule = {
  code: "OP-004",
  severity: "low",
  requires: (capabilities) => capabilities.identity,
  evaluate: ({ signals }) => {
    if (signals.changesWithoutActor === 0) return [];

    return [
      {
        assetKey: "changes:no-actor",
        assetLabel: "Cambios sin actor identificado",
        evidence: [{ label: "Cambios", value: String(signals.changesWithoutActor) }],
      },
    ];
  },
};
