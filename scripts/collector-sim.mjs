/**
 * Simulates a collector: signs a payload with Ed25519 and posts it to an Edge
 * Function, exactly as the Go collector will. Used to test the ingest pipeline
 * end to end without hardware.
 *
 * Usage: node scripts/collector-sim.mjs <function> <payload.json> [private-key-base64]
 * Without a key it generates a pair and prints the public one, so it can be
 * registered on the collector row.
 */
import { generateKeyPairSync, createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

const [fn, payloadPath, privateKeyBase64] = process.argv.slice(2);
const url = process.env.SUPABASE_URL ?? "https://xhprvnpmyrwsxdzhprqu.supabase.co";
const collectorId = process.env.COLLECTOR_ID ?? "a0000000-0000-4000-8000-000000000021";

if (!fn || !payloadPath) {
  console.error("uso: node scripts/collector-sim.mjs <function> <payload.json> [clave-privada]");
  process.exit(1);
}

let privateKey;
if (privateKeyBase64) {
  privateKey = createPrivateKey({
    key: Buffer.from(privateKeyBase64, "base64"),
    format: "der",
    type: "pkcs8",
  });
} else {
  const pair = generateKeyPairSync("ed25519");
  privateKey = pair.privateKey;
  console.log("clave privada (pkcs8 base64):", pair.privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"));
  // Raw 32-byte public key: what the database stores and the function imports.
  console.log("clave publica (raw base64):", pair.publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64"));
}

const body = readFileSync(payloadPath, "utf8");
const signature = sign(null, Buffer.from(body, "utf8"), privateKey).toString("base64");

const response = await fetch(`${url}/functions/v1/${fn}`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-collector-id": collectorId,
    "x-signature": signature,
  },
  body,
});

console.log("HTTP", response.status);
console.log(await response.text());
