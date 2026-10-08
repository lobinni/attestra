#!/usr/bin/env node

/**
 * Public acceptance check for the cumulative safety requirements.
 *
 * No wallet or key is needed. The canonical StudioNet schema and source are read
 * directly. Runtime behavior is separately exercised by the direct GenVM suite
 * against the exact same byte-verified source, including explicit repeated-call
 * attempts to manufacture deadlines.
 */

import { readFile } from "node:fs/promises";

const deployment = JSON.parse(
  await readFile(new URL("../deployments/studionet.json", import.meta.url), "utf8"),
);
const { address } = deployment.contract;

async function rpc(method, params) {
  const response = await fetch(deployment.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(`${method}: ${JSON.stringify(payload.error ?? response.status)}`);
  }
  return payload.result;
}

function section(source, methodName, nextMethodName) {
  const start = source.indexOf(`    def ${methodName}(`);
  if (start < 0) throw new Error(`method ${methodName} not found in deployed source`);
  const end = nextMethodName
    ? source.indexOf(`    def ${nextMethodName}(`, start + 1)
    : source.length;
  return source.slice(start, end < 0 ? source.length : end);
}

function requireText(haystack, needle, message) {
  if (!haystack.includes(needle)) throw new Error(message);
}

const schema = await rpc("gen_getContractSchema", [address]);
const methods = schema.methods ?? {};
const methodNames = Object.keys(methods);
const encoded = await rpc("gen_getContractCode", [address]);
const source = Buffer.from(encoded, "base64").toString("utf8").replace(/\r\n?/g, "\n");

// 1. Operator close remains operator-only, delivery-only and deadline-gated.
const unreviewed = section(source, "claim_unreviewed_delivery", "open_contest");
if (!methods.claim_unreviewed_delivery || methods.claim_unreviewed_delivery.readonly) {
  throw new Error("claim_unreviewed_delivery is missing from the deployed write ABI");
}
requireText(unreviewed, "self._require_operator(m)", "unreviewed close is not operator-only");
requireText(unreviewed, "{S_DELIVERED}", "unreviewed close is not limited to delivered work");
requireText(
  unreviewed,
  "now <= int(m.review_deadline_at)",
  "unreviewed close does not preserve the complete review window",
);
requireText(unreviewed, "S_APPROVED", "unreviewed close does not reach the settlement path");
console.log("PASS unresponsive client: operator-only close after the review deadline");

// 2. No caller may manufacture a deadline through repeated calls.
const forbidden = ["advance_clock", "tick", "wait", "sleep"].filter((name) => {
  const exact = methodNames.find((method) => {
    const normalized = method.toLowerCase();
    return normalized === name || normalized.includes(`_${name}`) || normalized.includes(`${name}_`);
  });
  return Boolean(exact);
});
if (forbidden.length) {
  throw new Error(`deployed ABI still exposes deadline controls: ${forbidden.join(", ")}`);
}
if (source.includes("def advance_clock") || source.includes("def tick(")) {
  throw new Error("deployed source still contains a public clock advancement method");
}
requireText(source, 'gl.message_raw["datetime"]', "deadlines do not read consensus datetime");
requireText(source, "review_deadline_at", "review deadline is not timestamp based");
requireText(source, "appeal_deadline_at", "appeal deadline is not timestamp based");
requireText(source, "execution_deadline_at", "execution deadline is not timestamp based");
requireText(source, "_now_ms", "consensus timestamp helper is missing");
console.log("PASS deadline safety: no caller-controlled clock; consensus timestamps only");

// 3. Manual-review recovery remains appeal-gated.
const recovery = section(source, "recover_escrow", "_send_gen");
requireText(
  recovery,
  "self._require_state(m, {S_LAPSED, S_FINALIZED})",
  "manual-review recovery is not limited to lapsed or finalized mandates",
);
if (recovery.includes("S_RULING") || recovery.includes("S_APPEALED")) {
  throw new Error("manual-review recovery can still bypass the appeal window");
}
requireText(recovery, "final_ruling_id", "recovery does not use the pinned final ruling");
console.log("PASS appeal protection: manual-review recovery requires finalization");

// 4. Evidence remains bound to the sealed commitment.
const evidence = section(source, "submit_evidence", "submit_deliverable");
const adjudicate = section(source, "_adjudicate_nondet", "adjudicate");
const evidenceParams = methods.submit_evidence?.params?.map(([name]) => name) ?? [];
if (!evidenceParams.includes("content_commitment")) {
  throw new Error("content_commitment is missing from the deployed submit_evidence ABI");
}
requireText(evidence, "len(commitment) != 64", "evidence commitment is not required");
requireText(source, 'F_MISMATCH = "CONTENT_MISMATCH"', "content mismatch label is missing");
requireText(source, "hashlib.sha256(stripped.encode", "retrieved content is not hashed");
requireText(source, "digest != expected", "retrieved hash is not compared with the commitment");
requireText(source, '"content_commitment": receipt.content_commitment', "commitment is not sealed");
requireText(adjudicate, 'entry.get("commitment", "")', "round retrieval does not carry the sealed commitment");
console.log("PASS evidence binding: retrieved text must match the sealed sha256 commitment");

console.log(`PASS canonical deployment: ${address}`);
