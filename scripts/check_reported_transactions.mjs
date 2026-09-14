#!/usr/bin/env node

/**
 * Regression check for the receipt-parsing issue reported after funding and
 * approval: StudioNet may include an idle validator entry marked ERROR after the
 * successful leader result. The parser must ignore quorum-cancelled entries.
 */

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const client = createClient({
  chain: studionet,
  endpoint: "https://studio.genlayer.com/api",
});

function leaderEntries(receipt) {
  const direct = receipt?.consensus_data?.leader_receipt;
  if (Array.isArray(direct)) return direct;
  const nested = receipt?.result?.leader_receipt ?? receipt?.leader_receipt;
  return Array.isArray(nested) ? nested : [];
}

function rollbackReason(receipt) {
  for (const entry of leaderEntries(receipt)) {
    if (
      String(entry?.vote ?? "").toLowerCase() === "idle" ||
      entry?.genvm_result?.error_code === "CONSENSUS_VALIDATOR_QUORUM_REACHED"
    ) {
      continue;
    }
    if (entry?.result?.status === "rollback") {
      return typeof entry.result.payload === "string"
        ? entry.result.payload
        : "The contract refused this transaction.";
    }
    if (entry?.result?.status === "contract_error") continue;
    if (
      entry?.execution_result &&
      !["SUCCESS", "FINISHED", "FINISHED_WITH_RETURN"].includes(
        entry.execution_result,
      )
    ) {
      return `Contract execution ended with ${entry.execution_result}.`;
    }
  }
  return null;
}

const hashes = [
  "0x553af39913222b96a3b7d642bc2f082541292f02aa31c7c1fc2032afaf889af0",
  "0xffcd8c138309420b3badf2443c3032f6cdce9496e1cfc3a964460c76fcd9726c",
];

for (const hash of hashes) {
  const transaction = await client.getTransaction({ hash });
  const reason = rollbackReason(transaction);
  const successfulLeader = leaderEntries(transaction).some(
    (entry) =>
      entry?.result?.status === "return" &&
      entry?.execution_result === "SUCCESS",
  );
  if (reason || !successfulLeader) {
    throw new Error(
      `Receipt ${hash} was misclassified (${reason ?? "no successful leader"})`,
    );
  }
  console.log(`PASS successful receipt: ${hash}`);
}

const syntheticRollback = {
  consensus_data: {
    leader_receipt: [
      {
        execution_result: "ERROR",
        result: {
          status: "rollback",
          payload: "[EXPECTED] exact payment required",
        },
      },
    ],
  },
};
if (!rollbackReason(syntheticRollback)?.includes("exact payment required")) {
  throw new Error("Rollback regression check did not preserve the contract reason");
}
console.log("PASS rollback reason preserved");
