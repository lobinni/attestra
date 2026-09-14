#!/usr/bin/env node

/**
 * Read the canonical StudioNet contract without a wallet or private key.
 *
 * Optional environment values:
 *   MANDATE_ID       inspect every read associated with one mandate
 *   OPERATOR_ADDRESS inspect one operator passport
 */

import { readFile } from "node:fs/promises";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const deployment = JSON.parse(
  await readFile(new URL("../deployments/studionet.json", import.meta.url), "utf8"),
);
const client = createClient({
  chain: studionet,
  endpoint: deployment.rpcUrl,
});
const address = deployment.contract.address;

async function read(functionName, args = []) {
  return client.readContract({
    address,
    functionName,
    args,
    stateStatus: "accepted",
  });
}

function heading(title) {
  console.log(`\n=== ${title} ===`);
}

function show(value) {
  console.log(JSON.stringify(value, null, 2));
}

heading("Protocol information");
const protocol = await read("get_protocol_info");
show({
  network: deployment.chainName,
  chain: deployment.chainId,
  version: protocol.version,
  currentTick: protocol.current_tick,
  mandateCount: protocol.mandate_count,
  readMethods: deployment.contract.readMethods,
  writeMethods: deployment.contract.writeMethods,
});

heading("Mandate registry");
const page = await read("list_mandates", [0, 100]);
show(page);

const mandateId = process.env.MANDATE_ID;
if (mandateId) {
  heading("Mandate");
  show(await read("get_mandate", [mandateId]));

  heading("Acceptance criteria");
  show(await read("get_criteria", [mandateId]));

  heading("Evidence record");
  show(await read("get_evidence", [mandateId]));

  heading("Contest record");
  show(await read("get_contest", [mandateId]));

  heading("Ruling history");
  const rulings = await read("list_rulings", [mandateId]);
  show(rulings);

  if (Array.isArray(rulings) && rulings.length > 0) {
    heading("Latest ruling by identifier");
    const latest = rulings[rulings.length - 1];
    show(await read("get_ruling", [mandateId, latest.ruling_id]));
  }

  heading("Settlement record");
  show(await read("get_settlement", [mandateId]));
}

const operator = process.env.OPERATOR_ADDRESS;
if (operator) {
  heading("Operator passport");
  show(await read("get_passport", [operator]));
}

if (!mandateId || !operator) {
  heading("Optional reads");
  console.log(
    "Set MANDATE_ID and OPERATOR_ADDRESS to exercise all mandate and passport views.",
  );
}
