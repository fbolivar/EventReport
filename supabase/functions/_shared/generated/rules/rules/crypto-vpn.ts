/** VPN and cryptography rules: FW-011 to FW-013. */
import { daysBetween, type Rule } from "../types.ts";

const WEAK_CIPHERS = ["des", "3des", "rc4", "md5", "sha1"];

export const FW_011: Rule = {
  code: "FW-011",
  severity: "high",
  requires: (capabilities) => capabilities.vpnRemote,
  evaluate: ({ config }) => {
    const remote = config.vpn.remote;
    if (!remote || remote.mfa) return [];

    return [
      {
        assetKey: `vpn:${remote.type}`,
        assetLabel: remote.type === "ssl" ? "Portal SSL-VPN" : `VPN remota ${remote.type}`,
        evidence: [
          { label: "Tipo", value: remote.tlsMin ? `${remote.type} · tls ${remote.tlsMin}` : remote.type },
          { label: "Usuarios habilitados", value: String(remote.users) },
          { label: "Segundo factor", value: "no configurado" },
        ],
      },
    ];
  },
};

export const FW_012: Rule = {
  code: "FW-012",
  severity: "medium",
  evaluate: ({ config }) => {
    const hits = config.vpn.ipsec
      .filter(
        (tunnel) =>
          tunnel.ikeVersion === 1 ||
          tunnel.dhGroup <= 5 ||
          WEAK_CIPHERS.some((cipher) => tunnel.encryption.toLowerCase().includes(cipher)),
      )
      .map((tunnel) => ({
        assetKey: `ipsec:${tunnel.name}`,
        assetLabel: `Túnel IPsec ${tunnel.name}`,
        evidence: [
          { label: "Túnel", value: `${tunnel.name} · peer ${tunnel.peer}` },
          {
            label: "Propuesta",
            value: `IKEv${tunnel.ikeVersion} · ${tunnel.encryption} · DH group ${tunnel.dhGroup}`,
          },
        ],
      }));

    const remote = config.vpn.remote;
    if (remote?.tlsMin && Number(remote.tlsMin) < 1.2) {
      hits.push({
        assetKey: `vpn:${remote.type}`,
        assetLabel: `VPN remota ${remote.type}`,
        evidence: [
          { label: "Versión mínima de TLS", value: remote.tlsMin },
          { label: "Mínimo aceptable", value: "1.2" },
        ],
      });
    }

    return hits;
  },
};

export const FW_013: Rule = {
  code: "FW-013",
  severity: "medium",
  requires: (capabilities) => capabilities.certificates,
  evaluate: ({ config, now }) =>
    config.certs
      .filter(
        (cert) => cert.inUse && (cert.selfSigned || daysBetween(now, cert.notAfter) <= 30),
      )
      .map((cert) => ({
        assetKey: `cert:${cert.name}`,
        assetLabel: `Certificado ${cert.name}`,
        evidence: [
          { label: "Emisor", value: cert.selfSigned ? "autofirmado" : cert.issuer },
          { label: "Vence", value: cert.notAfter.slice(0, 10) },
          { label: "Días restantes", value: String(daysBetween(now, cert.notAfter)) },
        ],
      })),
};
