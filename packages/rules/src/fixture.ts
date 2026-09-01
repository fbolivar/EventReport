/**
 * A clean FortiGate configuration: every rule passes on it. Each test starts
 * from this and breaks exactly one thing, so a failure points at one rule.
 */
import type { Capabilities, FirewallConfig } from "@eventreport/schema";

import type { EvaluationInput, OperationalSignals } from "./types.ts";

export const NOW = "2026-09-01T12:00:00Z";

export const FULL_CAPABILITIES: Capabilities = {
  config: true,
  policyHitCount: true,
  utmProfiles: true,
  licenses: true,
  adminMfa: true,
  vpnRemote: true,
  certificates: true,
  trafficBytes: true,
  identity: true,
  geo: true,
  unevaluableRules: [],
};

export function cleanConfig(): FirewallConfig {
  return {
    schemaVersion: "1.0.0",
    collectedAt: NOW,
    sha256: "0".repeat(64),
    capabilities: { ...FULL_CAPABILITIES },
    device: {
      brand: "fortigate",
      model: "FortiGate 60F",
      serial: "FGT60FTK21089123",
      firmware: "7.4.4",
      hostname: "FGT60F-BOG",
      haMode: "standalone",
      uptimeSeconds: 1_200_000,
    },
    admins: [
      {
        name: "admin",
        profile: "super",
        mfa: true,
        trustedHosts: ["10.10.0.0/24"],
        lastLogin: "2026-08-31T08:00:00Z",
      },
    ],
    mgmtAccess: [
      { interfaceName: "wan1", isWan: true, protocols: [] },
      { interfaceName: "lan", isWan: false, protocols: ["https", "ssh"] },
    ],
    interfaces: [
      { name: "wan1", zone: "wan", role: "wan", ip: "190.85.44.12" },
      { name: "lan", zone: "lan", role: "lan", ip: "10.10.0.1" },
    ],
    policies: [
      {
        id: "14",
        name: "LAN_to_WAN",
        position: 1,
        enabled: true,
        srcZones: ["lan"],
        dstZones: ["wan"],
        src: ["10.10.0.0/24"],
        dst: ["10.20.0.0/24"],
        services: ["HTTPS", "HTTP"],
        action: "allow",
        log: "all",
        profiles: { ips: true, av: true, web: true, appCtl: true, sslInspect: false },
        hitCount: 1_204_881,
        lastHit: "2026-09-01T11:00:00Z",
      },
    ],
    nat: [{ id: "vip-web", type: "dnat", external: "190.85.44.12:443", internal: "10.10.0.20:443", ports: ["443"] }],
    vpn: {
      ipsec: [
        {
          name: "VPN_MDE",
          peer: "200.31.7.88",
          ikeVersion: 2,
          encryption: "AES256-SHA256",
          dhGroup: 14,
          auth: "cert",
        },
      ],
      remote: { type: "ssl", tlsMin: "1.3", mfa: true, users: 38, groups: ["vpn"], idleTimeoutMinutes: 30 },
    },
    certs: [
      {
        name: "portal",
        subject: "vpn.acme.com.co",
        issuer: "Let's Encrypt R11",
        notAfter: "2026-12-01T00:00:00Z",
        selfSigned: false,
        inUse: true,
      },
    ],
    services: {
      ntp: ["co.pool.ntp.org"],
      dns: ["8.8.8.8"],
      syslogTargets: ["10.10.0.9", "10.10.0.10"],
      snmp: { version: "v3", defaultCommunity: false },
      clockSkewSeconds: 2,
    },
    licenses: [{ feature: "IPS", expiresAt: "2027-06-01T00:00:00Z", status: "active" }],
  };
}

export function cleanSignals(): OperationalSignals {
  return {
    droppedPct: 0.2,
    vaultDays: 30,
    requiredRetentionDays: 0,
    untreatedCriticalEvents: 0,
    lastHardeningReportAt: "2026-08-01T00:00:00Z",
    changesWithoutActor: 0,
  };
}

export function cleanInput(): EvaluationInput {
  return { config: cleanConfig(), signals: cleanSignals(), now: NOW };
}
