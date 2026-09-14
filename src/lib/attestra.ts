import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

import { CHAIN_RPC, CONTRACT_ADDRESS } from "@/lib/config";
import type {
  Criterion,
  CriticalPolicy,
  EvidenceRole,
  IndependenceClass,
  MandateStatus,
  RulingLabel,
  SettlementPolicy,
} from "@/lib/protocol/vocabulary";

export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export interface ProtocolInfo {
  version: string;
  owner: string;
  mandate_count: number;
  current_tick: number;
  weight_total: number;
  max_criteria: number;
  max_evidence: number;
  max_appeals: number;
  appeal_window_ticks: number;
  states: string[];
  custody_held_states: string[];
  criterion_types: string[];
  criterion_results: string[];
  rulings: string[];
  settlement_policies: string[];
  critical_policies: string[];
  evidence_roles: string[];
  independence_classes: string[];
  retrieval_labels: string[];
  integrity_flags: string[];
  evidence_quality_grades: string[];
}

export interface MandateRow {
  mandate_id: string;
  title: string;
  status: MandateStatus;
  client: string;
  operator: string;
  payment_wei: string;
  payment_deposited: string;
  criterion_count: number;
  latest_ruling_id: number;
  created_tick: number;
}

export interface Mandate {
  mandate_id: string;
  client: string;
  operator: string;
  title: string;
  description: string;
  status: MandateStatus;
  criteria: Criterion[];
  criterion_count: number;
  evidence_rules: string;
  policies: {
    confirmed: SettlementPolicy;
    partial: SettlementPolicy;
    rejected: SettlementPolicy;
    inconclusive: SettlementPolicy;
    critical: CriticalPolicy;
  };
  checklist_hash: string;
  terms_locked: boolean;
  payment_wei: string;
  payment_deposited: string;
  operator_bond_wei: string;
  operator_bond_deposited: string;
  contest_bond_wei: string;
  contest_bond_deposited: string;
  total_released: string;
  custody_held: string;
  execution_plan_hash: string;
  deliverable_uri: string;
  deliverable_hash: string;
  record_sealed_at: number;
  record_snapshot_hash: string;
  latest_ruling_id: number;
  final_ruling_id: number;
  appeal_count: number;
  appeal_deadline_tick: number;
  created_tick: number;
  funded_tick: number;
  engaged_tick: number;
  execution_deadline_tick: number;
  delivered_tick: number;
  review_deadline_tick: number;
  contested_tick: number;
  review_started_tick: number;
  ruling_tick: number;
  finalized_tick: number;
  settled_tick: number;
  current_tick: number;
}

export interface EvidenceReceipt {
  receipt_id: string;
  mandate_id: string;
  criterion_id: string;
  submitted_by: string;
  url: string;
  claimed_content_hash: string;
  content_type: string;
  source_host: string;
  source_identity: string;
  evidence_role: EvidenceRole;
  claimed_independence: IndependenceClass;
  captured_summary: string;
  submitted_tick: number;
  sealed: boolean;
}

export interface ContestRecord {
  contest_id: number;
  mandate_id: string;
  client: string;
  contested_criteria: string[];
  claim: string;
  evidence_refs: string[];
  operator_response: string;
  operator_counter_refs: string[];
  operator_responded_tick: number;
  bond_wei: string;
  opened_tick: number;
  status: string;
}

export interface CriterionRuling {
  id: string;
  result: "PASS" | "FAIL" | "INCONCLUSIVE";
  reason_code: string;
  justification?: string;
}

export interface Ruling {
  ruling_id: number;
  mandate_id: string;
  round_number: number;
  ruling: RulingLabel;
  criterion_results: CriterionRuling[];
  evidence_quality: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  integrity_flags: string[];
  inconclusive_items: string[];
  reasoning: string;
  score: number;
  critical_failed: boolean;
  checklist_hash: string;
  evaluated_tick: number;
}

export interface SettlementRecord {
  mandate_id: string;
  ruling_id: number;
  policy_applied: SettlementPolicy;
  score: number;
  operator_payout: string;
  client_payout: string;
  operator_bond_returned: string;
  contest_bond_returned: string;
  custody_before: string;
  custody_after: string;
  settled_tick: number;
}

export interface Passport {
  operator: string;
  mandates_confirmed: number;
  mandates_partial: number;
  mandates_rejected: number;
  mandates_inconclusive: number;
  contests_faced: number;
  appeals_won: number;
  critical_failures: number;
  scored_mandates: number;
  average_score: number;
  verified_value_wei: string;
}

export interface MandatePage {
  total: number;
  offset: number;
  limit: number;
  next_offset: number;
  items: MandateRow[];
  current_tick: number;
}

type LeaderReceipt = {
  result?: { status?: string; payload?: unknown };
  execution_result?: string;
  vote?: string;
  genvm_result?: { error_code?: string };
};

type ReceiptShape = {
  consensus_data?: { leader_receipt?: unknown };
  result?: { leader_receipt?: unknown };
  leader_receipt?: unknown;
};

function leaderReceipts(receipt: unknown): LeaderReceipt[] {
  const item = receipt as ReceiptShape | null;
  const direct = item?.consensus_data?.leader_receipt;
  if (Array.isArray(direct)) return direct as LeaderReceipt[];
  const nested = item?.result?.leader_receipt ?? item?.leader_receipt;
  return Array.isArray(nested) ? (nested as LeaderReceipt[]) : [];
}

export function rollbackReason(receipt: unknown): string | null {
  for (const leader of leaderReceipts(receipt)) {
    // Validator entries cancelled after quorum are present in the same list on
    // StudioNet. They are not executions of the contract and must never mark a
    // successful majority decision as failed.
    if (
      String(leader.vote ?? "").toLowerCase() === "idle" ||
      leader.genvm_result?.error_code === "CONSENSUS_VALIDATOR_QUORUM_REACHED"
    ) {
      continue;
    }
    if (leader.result?.status === "rollback") {
      return typeof leader.result.payload === "string"
        ? leader.result.payload
        : "The contract refused this transaction.";
    }
    if (leader.result?.status === "contract_error") {
      continue;
    }
    if (
      leader.execution_result &&
      !["SUCCESS", "FINISHED", "FINISHED_WITH_RETURN"].includes(
        leader.execution_result,
      )
    ) {
      return `Contract execution ended with ${leader.execution_result}.`;
    }
  }
  return null;
}

export function returnedValue(receipt: unknown): unknown {
  for (const leader of leaderReceipts(receipt)) {
    if (leader.result?.status !== "return") continue;
    let value: unknown = leader.result.payload;
    if (value && typeof value === "object" && "readable" in value) {
      value = (value as { readable?: unknown }).readable;
    }
    for (let index = 0; index < 3 && typeof value === "string"; index += 1) {
      try {
        value = JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
  return null;
}

export function humanContractError(message: string): string {
  return message.replace(
    /^\[(EXPECTED|EXTERNAL|TRANSIENT|PANEL_ERROR)\]\s*/,
    "",
  );
}

export class PendingReceipt extends Error {
  readonly hash: string;

  constructor(hash: string, detail: string) {
    super(`The transaction was submitted, but its receipt is still pending: ${detail}`);
    this.name = "PendingReceipt";
    this.hash = hash;
  }
}

export type TxPhase =
  | "idle"
  | "wallet"
  | "submitted"
  | "pending"
  | "finalizing"
  | "finalized"
  | "rejected"
  | "failed";

export interface TransactionResult {
  hash: string;
  receipt: unknown;
  returned: unknown;
}

export class AttestraClient {
  private readonly address: `0x${string}`;
  private readonly client: ReturnType<typeof createClient>;
  private phaseHandler?: (phase: TxPhase, hash?: string) => void;

  constructor(account?: string | null, provider?: Eip1193Provider) {
    this.address = CONTRACT_ADDRESS;
    const configuration: Record<string, unknown> = {
      chain: studionet,
      endpoint: CHAIN_RPC,
    };
    if (account) configuration.account = account as `0x${string}`;
    if (provider) configuration.provider = provider;
    this.client = createClient(configuration as never);
  }

  setPhaseHandler(handler: (phase: TxPhase, hash?: string) => void) {
    this.phaseHandler = handler;
  }

  private async read<T>(functionName: string, args: unknown[] = []): Promise<T> {
    const raw = await this.client.readContract({
      address: this.address,
      functionName,
      args: args as never,
      stateStatus: "accepted",
    } as never);
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
  }

  getProtocolInfo() {
    return this.read<ProtocolInfo>("get_protocol_info");
  }
  listMandates(offset = 0, limit = 100) {
    return this.read<MandatePage>("list_mandates", [offset, limit]);
  }
  getMandate(id: string) {
    return this.read<Mandate>("get_mandate", [id]);
  }
  getCriteria(id: string) {
    return this.read<Criterion[]>("get_criteria", [id]);
  }
  getEvidence(id: string) {
    return this.read<EvidenceReceipt[]>("get_evidence", [id]);
  }
  getContest(id: string) {
    return this.read<ContestRecord | Record<string, never>>("get_contest", [id]);
  }
  listRulings(id: string) {
    return this.read<Ruling[]>("list_rulings", [id]);
  }
  getRuling(id: string, rulingId: number) {
    return this.read<Ruling>("get_ruling", [id, rulingId]);
  }
  getSettlement(id: string) {
    return this.read<SettlementRecord | Record<string, never>>("get_settlement", [id]);
  }
  getPassport(operator: string) {
    return this.read<Passport>("get_passport", [operator]);
  }

  private async write(
    functionName: string,
    args: unknown[],
    options: { value?: bigint; wait?: "ACCEPTED" | "FINALIZED" } = {},
  ): Promise<TransactionResult> {
    let hash: `0x${string}`;
    this.phaseHandler?.("wallet");
    try {
      hash = await this.client.writeContract({
        address: this.address,
        functionName,
        args: args as never,
        ...(options.value !== undefined ? { value: options.value } : {}),
      } as never);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.phaseHandler?.(
        /reject|denied|user denied|user rejected/i.test(message)
          ? "rejected"
          : "failed",
      );
      throw new Error(humanContractError(message));
    }

    this.phaseHandler?.("submitted", hash);
    let receipt: unknown;
    try {
      const finalizing = options.wait === "FINALIZED";
      this.phaseHandler?.(finalizing ? "finalizing" : "pending", hash);
      receipt = await this.client.waitForTransactionReceipt({
        hash,
        status: (options.wait ?? "ACCEPTED") as never,
        retries: finalizing ? 180 : 80,
        interval: 3_000,
      } as never);
    } catch (error) {
      throw new PendingReceipt(
        hash,
        error instanceof Error ? error.message : String(error),
      );
    }

    const reason = rollbackReason(receipt);
    if (reason) {
      this.phaseHandler?.("failed", hash);
      throw new Error(humanContractError(reason));
    }
    this.phaseHandler?.("finalized", hash);
    return { hash, receipt, returned: returnedValue(receipt) };
  }

  createMandate(input: {
    operator: string;
    title: string;
    description: string;
    criteria: Criterion[];
    paymentWei: bigint;
    operatorBondWei: bigint;
    contestBondWei: bigint;
    evidenceRules: string;
    policyConfirmed: SettlementPolicy;
    policyPartial: SettlementPolicy;
    policyRejected: SettlementPolicy;
    policyInconclusive: SettlementPolicy;
    criticalPolicy: CriticalPolicy;
    executionTicks: number;
    reviewTicks: number;
  }) {
    return this.write("create_mandate", [
      input.operator,
      input.title,
      input.description,
      JSON.stringify(input.criteria),
      input.paymentWei.toString(),
      input.operatorBondWei.toString(),
      input.contestBondWei.toString(),
      input.evidenceRules,
      input.policyConfirmed,
      input.policyPartial,
      input.policyRejected,
      input.policyInconclusive,
      input.criticalPolicy,
      input.executionTicks,
      input.reviewTicks,
    ]);
  }

  updateDraft(
    id: string,
    title: string,
    description: string,
    criteria: Criterion[],
    evidenceRules: string,
  ) {
    return this.write("update_draft", [
      id,
      title,
      description,
      JSON.stringify(criteria),
      evidenceRules,
    ]);
  }

  fundMandate(id: string, payment: bigint) {
    return this.write("fund_mandate", [id], {
      value: payment,
      wait: "FINALIZED",
    });
  }

  acceptMandate(id: string, planHash: string, bond: bigint) {
    return this.write("accept_mandate", [id, planHash], {
      ...(bond > BigInt(0) ? { value: bond } : {}),
      wait: "FINALIZED",
    });
  }

  submitEvidence(
    id: string,
    item: {
      criterionId: string;
      url: string;
      evidenceRole: EvidenceRole;
      claimedContentHash: string;
      contentType: string;
      sourceIdentity: string;
      claimedIndependence: IndependenceClass;
      capturedSummary: string;
    },
  ) {
    return this.write("submit_evidence", [
      id,
      item.criterionId,
      item.url,
      item.evidenceRole,
      item.claimedContentHash,
      item.contentType,
      item.sourceIdentity,
      item.claimedIndependence,
      item.capturedSummary,
    ]);
  }

  submitDeliverable(id: string, uri: string, hash: string) {
    return this.write("submit_deliverable", [id, uri, hash]);
  }

  approveWork(id: string) {
    return this.write("approve_work", [id], { wait: "FINALIZED" });
  }

  openContest(
    id: string,
    criterionIds: string[],
    claim: string,
    evidenceRefs: string[],
    bond: bigint,
  ) {
    return this.write(
      "open_contest",
      [id, JSON.stringify(criterionIds), claim, JSON.stringify(evidenceRefs)],
      {
        ...(bond > BigInt(0) ? { value: bond } : {}),
        wait: "FINALIZED",
      },
    );
  }

  respondToContest(id: string, explanation: string, counterRefs: string[]) {
    return this.write("respond_to_contest", [
      id,
      explanation,
      JSON.stringify(counterRefs),
    ]);
  }

  sealRecord(id: string) {
    return this.write("seal_record", [id], { wait: "FINALIZED" });
  }

  adjudicate(id: string) {
    return this.write("adjudicate", [id], { wait: "FINALIZED" });
  }

  appeal(id: string, grounds: string) {
    return this.write("appeal", [id, grounds]);
  }

  finalizeRuling(id: string) {
    return this.write("finalize_ruling", [id], { wait: "FINALIZED" });
  }

  settle(id: string) {
    return this.write("settle", [id], { wait: "FINALIZED" });
  }

  cancelMandate(id: string) {
    return this.write("cancel_mandate", [id], { wait: "FINALIZED" });
  }

  lapseMandate(id: string) {
    return this.write("lapse_mandate", [id]);
  }

  recoverEscrow(id: string) {
    return this.write("recover_escrow", [id], { wait: "FINALIZED" });
  }

  tick() {
    return this.write("tick", []);
  }
}
