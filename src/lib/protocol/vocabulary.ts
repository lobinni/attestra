/**
 * The protocol vocabulary, mirrored from the contract.
 *
 * Every closed set here has exactly one counterpart in the contract
 * source. Keeping them in step is what lets the interface validate an
 * action before it is ever sent to the chain.
 */

export const STATES = [
  "DRAFT",
  "ESCROWED",
  "ENGAGED",
  "DELIVERED",
  "APPROVED",
  "CONTESTED",
  "RECORD_SEALED",
  "REVIEWING",
  "RULING",
  "APPEALED",
  "FINAL_REVIEW",
  "FINALIZED",
  "SETTLED",
  "CANCELLED",
  "LAPSED",
  "RETURNED",
] as const;
export type MandateStatus = (typeof STATES)[number];

export const CUSTODY_HELD_STATES: MandateStatus[] = [
  "ESCROWED",
  "ENGAGED",
  "DELIVERED",
  "APPROVED",
  "CONTESTED",
  "RECORD_SEALED",
  "REVIEWING",
  "RULING",
  "APPEALED",
  "FINAL_REVIEW",
  "FINALIZED",
  "LAPSED",
];

export const TERMINAL_STATES: MandateStatus[] = ["SETTLED", "CANCELLED", "RETURNED"];

export const CRITERION_TYPES = ["OBJECTIVE", "EVIDENCE", "JUDGMENT"] as const;
export type CriterionType = (typeof CRITERION_TYPES)[number];

export const CRITERION_RESULTS = ["PASS", "FAIL", "INCONCLUSIVE"] as const;
export type CriterionResult = (typeof CRITERION_RESULTS)[number];

export const RULINGS = ["CONFIRMED", "PARTIAL", "REJECTED", "INCONCLUSIVE"] as const;
export type RulingLabel = (typeof RULINGS)[number];

export const POLICIES = ["RELEASE_FULL", "PRORATA", "RETURN", "MANUAL_REVIEW"] as const;
export type SettlementPolicy = (typeof POLICIES)[number];

export const CRITICAL_POLICIES = ["VOID_MANDATE", "PRORATA"] as const;
export type CriticalPolicy = (typeof CRITICAL_POLICIES)[number];

export const EVIDENCE_ROLES = [
  "DELIVERABLE",
  "SUPPORTING",
  "COUNTER",
  "REFERENCE",
] as const;
export type EvidenceRole = (typeof EVIDENCE_ROLES)[number];

export const INDEPENDENCE_CLASSES = [
  "INDEPENDENT",
  "RELATED",
  "SAME_ORIGIN",
  "UNKNOWN",
] as const;
export type IndependenceClass = (typeof INDEPENDENCE_CLASSES)[number];

export const RETRIEVAL_LABELS = [
  "FETCH_SUCCESS",
  "NON_SUCCESS_RESPONSE",
  "EMPTY_CONTENT",
  "FETCH_FAILURE",
] as const;
export type RetrievalLabel = (typeof RETRIEVAL_LABELS)[number];

export const INTEGRITY_FLAGS = [
  "FABRICATED_EVIDENCE",
  "UNREACHABLE_SOURCE_PRESENTED_AS_PROOF",
  "FALSE_INDEPENDENCE_CLAIM",
  "SOURCE_CONTRADICTS_CLAIM",
  "INSTRUCTIONS_EMBEDDED_IN_EVIDENCE",
  "EVIDENCE_DOES_NOT_ADDRESS_CRITERION",
] as const;

export const QUALITY_GRADES = ["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"] as const;

export const WEIGHT_TOTAL = 100;
export const MAX_CRITERIA = 24;
export const MAX_EVIDENCE = 64;
export const MAX_APPEALS = 1;
export const APPEAL_WINDOW_TICKS = 3;
export const DEFAULT_EXECUTION_TICKS = 12;
export const DEFAULT_REVIEW_TICKS = 6;

export const PROTOCOL_VERSION = "Attestra-1.0.0";

export interface Criterion {
  id: string;
  text: string;
  type: CriterionType;
  weight: number;
  critical: boolean;
  method: string;
}

export interface CriterionOutcome {
  id: string;
  result: CriterionResult;
  reason_code: string;
  justification: string;
}

/** Human labels. Used by the interface so that no raw token is ever shown. */
export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ESCROWED: "Funded",
  ENGAGED: "In progress",
  DELIVERED: "Under review",
  APPROVED: "Approved",
  CONTESTED: "Contested",
  RECORD_SEALED: "Record sealed",
  REVIEWING: "Panel reviewing",
  RULING: "Ruling issued",
  APPEALED: "Appealed",
  FINAL_REVIEW: "Final review",
  FINALIZED: "Finalized",
  SETTLED: "Settled",
  CANCELLED: "Cancelled",
  LAPSED: "Lapsed",
  RETURNED: "Returned",
};

export const RULING_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PARTIAL: "Partially met",
  REJECTED: "Rejected",
  INCONCLUSIVE: "Inconclusive",
};

export const POLICY_LABELS: Record<string, string> = {
  RELEASE_FULL: "Release in full",
  PRORATA: "Split by score",
  RETURN: "Return to client",
  MANUAL_REVIEW: "Hold for human review",
};

export const RESULT_LABELS: Record<string, string> = {
  PASS: "Met",
  FAIL: "Not met",
  INCONCLUSIVE: "Inconclusive",
};

export const TYPE_LABELS: Record<string, string> = {
  OBJECTIVE: "Objective",
  EVIDENCE: "Evidence based",
  JUDGMENT: "Judgment",
};

export const ROLE_LABELS: Record<string, string> = {
  DELIVERABLE: "Deliverable",
  SUPPORTING: "Supporting",
  COUNTER: "Counter evidence",
  REFERENCE: "Reference",
};

export const RETRIEVAL_LABELS_HUMAN: Record<string, string> = {
  FETCH_SUCCESS: "Retrieved",
  NON_SUCCESS_RESPONSE: "Rejected by host",
  EMPTY_CONTENT: "Empty document",
  FETCH_FAILURE: "Could not be reached",
  "": "Not yet retrieved",
};

export const FLAG_LABELS: Record<string, string> = {
  FABRICATED_EVIDENCE: "Source appears fabricated",
  UNREACHABLE_SOURCE_PRESENTED_AS_PROOF: "Unreachable source offered as proof",
  FALSE_INDEPENDENCE_CLAIM: "Independence claim not supported",
  SOURCE_CONTRADICTS_CLAIM: "Source contradicts the claim",
  INSTRUCTIONS_EMBEDDED_IN_EVIDENCE: "Instructions embedded in a source",
  EVIDENCE_DOES_NOT_ADDRESS_CRITERION: "Source does not address the criterion",
};
