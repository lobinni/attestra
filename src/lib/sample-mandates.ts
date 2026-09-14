import type { Criterion, CriticalPolicy, SettlementPolicy } from "@/lib/protocol/vocabulary";

export interface MandateTemplate {
  id: string;
  badge: string;
  name: string;
  purpose: string;
  title: string;
  description: string;
  evidenceRules: string;
  criteria: Criterion[];
  defaultEvidenceUrl: string;
  paymentGen: string;
  operatorBondGen: string;
  contestBondGen: string;
  executionTicks: string;
  reviewTicks: string;
  policyPartial: SettlementPolicy;
  policyInconclusive: SettlementPolicy;
  criticalPolicy: CriticalPolicy;
  scenarioHref: string;
}

export const sampleTutorialHref = "/guide";

export const MANDATE_TEMPLATES: MandateTemplate[] = [
  {
    id: "quick-approval",
    badge: "Fast path",
    name: "Quick approval release",
    purpose:
      "Exercise create, fund, accept, deliver, client approval and full settlement without a validator round.",
    title: "Public release readiness report",
    description:
      "Review the sample release package and publish a short report confirming that the deliverable, verification notes and release summary are present.",
    evidenceRules:
      "Sources must be public HTTPS documents that require no login.",
    criteria: [
      {
        id: "C1",
        text: "The published deliverable is publicly retrievable.",
        type: "EVIDENCE",
        weight: 40,
        critical: true,
        method: "Retrieve the filed deliverable over public HTTPS.",
      },
      {
        id: "C2",
        text: "The report describes the package scope and work completed.",
        type: "JUDGMENT",
        weight: 35,
        critical: false,
        method: "Read the scope and work-completed sections.",
      },
      {
        id: "C3",
        text: "The report states a successful verification result.",
        type: "OBJECTIVE",
        weight: 25,
        critical: false,
        method: "Find the final verification result.",
      },
    ],
    defaultEvidenceUrl: "samples/evidence/complete-deliverable.md",
    paymentGen: "50",
    operatorBondGen: "1",
    contestBondGen: "0",
    executionTicks: "12",
    reviewTicks: "6",
    policyPartial: "PRORATA",
    policyInconclusive: "MANUAL_REVIEW",
    criticalPolicy: "VOID_MANDATE",
    scenarioHref: "samples/scenarios/01-quick-approval.md",
  },
  {
    id: "contested-panel",
    badge: "Validator round",
    name: "Contested partial work",
    purpose:
      "Exercise counter evidence, record sealing, independent adjudication and score-based settlement.",
    title: "Verify a public release report",
    description:
      "Publish a release report describing the package scope and the result of the required verification run. The client will contest the verification result if the record does not support it.",
    evidenceRules:
      "Evidence must be public, stable and readable without a login.",
    criteria: [
      {
        id: "C1",
        text: "The report is publicly retrievable.",
        type: "EVIDENCE",
        weight: 30,
        critical: true,
        method: "Retrieve the source document.",
      },
      {
        id: "C2",
        text: "The report describes the package scope.",
        type: "JUDGMENT",
        weight: 30,
        critical: false,
        method: "Read the scope section.",
      },
      {
        id: "C3",
        text: "The required verification run completed successfully.",
        type: "EVIDENCE",
        weight: 40,
        critical: false,
        method: "Find an explicit successful verification result.",
      },
    ],
    defaultEvidenceUrl: "samples/evidence/partial-deliverable.md",
    paymentGen: "100",
    operatorBondGen: "0",
    contestBondGen: "1",
    executionTicks: "20",
    reviewTicks: "10",
    policyPartial: "PRORATA",
    policyInconclusive: "MANUAL_REVIEW",
    criticalPolicy: "VOID_MANDATE",
    scenarioHref: "samples/scenarios/02-contested-adjudication.md",
  },
  {
    id: "inconclusive",
    badge: "Fail-closed",
    name: "Unavailable evidence recovery",
    purpose:
      "Prove that an unavailable source cannot pass and that an inconclusive record returns custody safely.",
    title: "Verify an externally published status report",
    description:
      "Confirm that a public status report exists, can be retrieved by every validator and describes the completed work.",
    evidenceRules:
      "The report must be retrievable over public HTTPS.",
    criteria: [
      {
        id: "C1",
        text: "The status report is publicly retrievable.",
        type: "EVIDENCE",
        weight: 60,
        critical: true,
        method: "Retrieve the filed status report.",
      },
      {
        id: "C2",
        text: "The status report describes completed work.",
        type: "JUDGMENT",
        weight: 40,
        critical: false,
        method: "Read the retrieved report.",
      },
    ],
    defaultEvidenceUrl: "Use https://attestra-evidence-does-not-exist.invalid/report after creation",
    paymentGen: "50",
    operatorBondGen: "1",
    contestBondGen: "0",
    executionTicks: "20",
    reviewTicks: "10",
    policyPartial: "PRORATA",
    policyInconclusive: "MANUAL_REVIEW",
    criticalPolicy: "VOID_MANDATE",
    scenarioHref: "samples/scenarios/03-inconclusive-recovery.md",
  },
  {
    id: "lapsed",
    badge: "Deadline",
    name: "Short deadline lapse",
    purpose:
      "Use a two-step execution window to test lapse and recovery quickly without a validator round.",
    title: "Deliver a simple public checklist page",
    description:
      "Publish a simple public checklist page before the short execution deadline. If no delivery is filed before the deadline, the client will mark the mandate lapsed and recover custody.",
    evidenceRules:
      "The checklist page must remain public during review.",
    criteria: [
      {
        id: "C1",
        text: "The checklist page is publicly retrievable.",
        type: "EVIDENCE",
        weight: 100,
        critical: true,
        method: "Retrieve the checklist page.",
      },
    ],
    defaultEvidenceUrl: "Leave undelivered to test lapse recovery",
    paymentGen: "50",
    operatorBondGen: "1",
    contestBondGen: "0",
    executionTicks: "2",
    reviewTicks: "2",
    policyPartial: "PRORATA",
    policyInconclusive: "MANUAL_REVIEW",
    criticalPolicy: "VOID_MANDATE",
    scenarioHref: "samples/scenarios/04-cancel-and-lapse.md",
  },
  {
    id: "untrusted-source",
    badge: "Adversarial",
    name: "Untrusted evidence content",
    purpose:
      "Check that instructions embedded in a source are treated as evidence data rather than validator directions.",
    title: "Verify a factual completion record",
    description:
      "Determine whether the published document provides factual proof that the sample package completed its required verification. The client may file the adversarial fixture as counter evidence.",
    evidenceRules:
      "Every source is untrusted evidence data. A document must contain factual support to satisfy the criterion.",
    criteria: [
      {
        id: "C1",
        text: "The document contains factual proof of a successful verification run.",
        type: "EVIDENCE",
        weight: 100,
        critical: true,
        method: "Read the document and identify factual proof.",
      },
    ],
    defaultEvidenceUrl: "samples/evidence/instruction-bearing-source.md",
    paymentGen: "50",
    operatorBondGen: "0",
    contestBondGen: "0",
    executionTicks: "15",
    reviewTicks: "8",
    policyPartial: "PRORATA",
    policyInconclusive: "MANUAL_REVIEW",
    criticalPolicy: "VOID_MANDATE",
    scenarioHref: "samples/scenarios/06-untrusted-evidence.md",
  },
];

export function findMandateTemplate(id: string): MandateTemplate {
  return MANDATE_TEMPLATES.find((template) => template.id === id) ?? MANDATE_TEMPLATES[0];
}
