/**
 * Normalized firewall configuration (docs/diseno-tecnico.md section 4.1).
 * Every adapter maps its brand-specific config onto this shape. Fields a brand
 * does not expose stay undefined; rules tolerate absence.
 */
import type { Brand, Capabilities, Timestamp } from "./common.ts";

export type AdminProfile = "readonly" | "readwrite" | "super";
export type InterfaceRole = "wan" | "lan" | "dmz" | "vpn";
export type PolicyAction = "allow" | "deny";
export type PolicyLogMode = "none" | "security" | "all";
export type HaMode = "standalone" | "active_passive" | "active_active";
export type HaState = "healthy" | "degraded" | "failed";

export interface DeviceInfo {
  brand: Brand;
  model: string;
  serial: string;
  firmware: string;
  hostname: string;
  haMode: HaMode;
  haState?: HaState;
  uptimeSeconds: number;
}

export interface AdminAccount {
  name: string;
  profile: AdminProfile;
  mfa: boolean;
  trustedHosts: string[];
  lastLogin?: Timestamp;
}

export interface ManagementAccess {
  interfaceName: string;
  isWan: boolean;
  protocols: Array<"https" | "http" | "ssh" | "telnet" | "ping" | "snmp">;
}

export interface NetworkInterface {
  name: string;
  zone: string;
  role: InterfaceRole;
  ip?: string;
  vlan?: number;
}

export interface SecurityProfiles {
  ips: boolean;
  av: boolean;
  web: boolean;
  appCtl: boolean;
  sslInspect: boolean;
}

export interface Policy {
  id: string;
  name: string;
  position: number;
  enabled: boolean;
  srcZones: string[];
  dstZones: string[];
  src: string[];
  dst: string[];
  services: string[];
  action: PolicyAction;
  log: PolicyLogMode;
  profiles: SecurityProfiles;
  hitCount?: number;
  lastHit?: Timestamp;
  schedule?: string;
}

export interface NatRule {
  id: string;
  type: "dnat" | "snat";
  external: string;
  internal: string;
  ports: string[];
}

export interface IpsecTunnel {
  name: string;
  peer: string;
  ikeVersion: 1 | 2;
  encryption: string;
  dhGroup: number;
  auth: "psk" | "cert";
}

export interface RemoteVpn {
  type: "ssl" | "ipsec" | "wireguard";
  tlsMin?: string;
  mfa: boolean;
  users: number;
  groups: string[];
  idleTimeoutMinutes?: number;
}

export interface Certificate {
  name: string;
  subject: string;
  issuer: string;
  notAfter: Timestamp;
  selfSigned: boolean;
  inUse: boolean;
}

export interface DeviceServices {
  ntp: string[];
  dns: string[];
  syslogTargets: string[];
  snmp?: { version: "v1" | "v2c" | "v3"; defaultCommunity: boolean };
  clockSkewSeconds?: number;
}

export interface License {
  feature: string;
  expiresAt: Timestamp;
  status: "active" | "expiring" | "expired";
}

export interface FirewallConfig {
  schemaVersion: string;
  collectedAt: Timestamp;
  sha256: string;
  capabilities: Capabilities;
  device: DeviceInfo;
  admins: AdminAccount[];
  mgmtAccess: ManagementAccess[];
  interfaces: NetworkInterface[];
  policies: Policy[];
  nat: NatRule[];
  vpn: { ipsec: IpsecTunnel[]; remote?: RemoteVpn };
  certs: Certificate[];
  services: DeviceServices;
  licenses: License[];
}

/** Live device status, polled every 5 minutes (section 3). */
export interface DeviceStatus {
  ts: Timestamp;
  cpu: number;
  mem: number;
  sessions: number;
  haState: HaState;
}
