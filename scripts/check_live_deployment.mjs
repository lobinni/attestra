#!/usr/bin/env node

/**
 * Verify the canonical StudioNet deployment without a wallet or private key.
 *
 * Checks:
 *   1. the endpoint reports chain 61999;
 *   2. gen_getContractCode normalizes to the repository source byte-for-byte;
 *   3. the on-chain schema exposes the recorded read/write method counts;
 *   4. get_protocol_info returns the recorded protocol version.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const deployment = JSON.parse(
  await readFile(new URL("../deployments/studionet.json", import.meta.url), "utf8"),
);
const source = await readFile(
  new URL(`../${deployment.contract.source}`, import.meta.url),
  "utf8",
);

async function rpc(method, params) {
  const response = await fetch(deployment.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`${method} returned HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`${method}: ${JSON.stringify(payload.error)}`);
  return payload.result;
}

function normalize(text) {
  let value = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = value.split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  if (lines[0]?.trim().toLowerCase().startsWith("result:")) lines.shift();
  while (lines.length && !lines.at(-1).trim()) lines.pop();
  return `${lines.join("\n")}\n`;
}

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

const chainHex = await rpc("eth_chainId", []);
const chainId = Number.parseInt(chainHex, 16);
if (chainId !== deployment.chainId) {
  throw new Error(`expected chain ${deployment.chainId}, received ${chainId}`);
}

const encodedCode = await rpc("gen_getContractCode", [deployment.contract.address]);
const onchain = Buffer.from(encodedCode, "base64").toString("utf8");
const localNormalized = normalize(source);
const onchainNormalized = normalize(onchain);
const localHash = sha256(localNormalized);
const onchainHash = sha256(onchainNormalized);
if (localHash !== deployment.contract.sourceSha256) {
  throw new Error(`repository hash ${localHash} does not match deployment manifest`);
}
if (onchainHash !== localHash) {
  throw new Error(`on-chain hash ${onchainHash} does not match repository ${localHash}`);
}

const schema = await rpc("gen_getContractSchema", [deployment.contract.address]);
const methods = Object.values(schema.methods || {});
const reads = methods.filter((method) => method.readonly).length;
const writes = methods.length - reads;
if (
  methods.length !== deployment.contract.publicMethods ||
  reads !== deployment.contract.readMethods ||
  writes !== deployment.contract.writeMethods
) {
  throw new Error(
    `schema mismatch: ${methods.length} methods (${reads} read, ${writes} write)`,
  );
}

const client = createClient({ chain: studionet, endpoint: deployment.rpcUrl });
const protocol = await client.readContract({
  address: deployment.contract.address,
  functionName: "get_protocol_info",
  args: [],
  stateStatus: "accepted",
});
if (protocol.version !== deployment.contract.version) {
  throw new Error(
    `expected ${deployment.contract.version}, received ${protocol.version}`,
  );
}

console.log(`PASS chain: ${chainId}`);
console.log(`PASS contract: ${deployment.contract.address}`);
console.log(`PASS source: sha256 ${localHash}`);
console.log(`PASS schema: ${methods.length} methods (${reads} read, ${writes} write)`);
console.log(
  `PASS protocol: ${protocol.version}, tick ${protocol.current_tick}, mandates ${protocol.mandate_count}`,
);
