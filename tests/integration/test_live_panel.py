"""Live integration checks against a real validator panel.

Run:
    gltest tests/integration -v -s --network studionet

Every run deploys a disposable contract. The tests assert on decision-critical
fields—stages, criterion results, scores and custody—not on model prose.
"""

import json
import os

import pytest
from gltest import get_accounts, get_default_account

from .conftest import must_fail, must_succeed, read

GEN = 10 ** 18
PAYMENT = 2 * GEN
OPERATOR_BOND = 0
CONTEST_BOND = 0
ROUND_WAIT = {"wait_interval": 5000, "wait_retries": 180}

GOOD_URL = (
    "https://raw.githubusercontent.com/genlayerlabs/"
    "genlayer-project-boilerplate/main/README.md"
)
DEAD_URL = "https://attestra-evidence-does-not-exist.invalid/report"
CLAIMED_HASH = "sha256:" + "5f" * 32

CRITERIA = [
    {
        "id": "C1",
        "text": "The linked document exists and is readable.",
        "type": "EVIDENCE",
        "weight": 60,
        "critical": True,
        "method": "Retrieve the address and confirm it returns content.",
    },
    {
        "id": "C2",
        "text": "The linked document describes a software project.",
        "type": "JUDGMENT",
        "weight": 40,
        "critical": False,
        "method": "Read the retrieved content.",
    },
]
CRITERIA_JSON = json.dumps(CRITERIA)


@pytest.fixture(scope="module")
def operator():
    accounts = get_accounts()
    if len(accounts) < 2:
        pytest.skip(
            "the live suite needs two funded accounts; see TESTING.md and the "
            "private account block described in gltest.config.yaml"
        )
    return accounts[1]


def create_and_fund(contract, operator_address, title_suffix):
    receipt = contract.create_mandate(
        args=[
            str(operator_address),
            f"Verify a published document ({title_suffix})",
            "Confirm the linked document is retrievable and describes a software project.",
            CRITERIA_JSON,
            str(PAYMENT),
            str(OPERATOR_BOND),
            str(CONTEST_BOND),
            "Prefer retrieved content over assertions.",
            "RELEASE_FULL",
            "PRORATA",
            "RETURN",
            "MANUAL_REVIEW",
            "VOID_MANDATE",
            200,
            80,
        ]
    ).transact()
    must_succeed(receipt, "create_mandate")

    page = read(contract, "list_mandates", [0, 100])
    matches = [
        item for item in page["items"] if item["title"].endswith(f"({title_suffix})")
    ]
    assert matches, "the new mandate did not appear in the registry"
    mandate_id = matches[-1]["mandate_id"]

    receipt = contract.fund_mandate(args=[mandate_id]).transact(value=PAYMENT)
    must_succeed(receipt, "fund_mandate")
    mandate = read(contract, "get_mandate", [mandate_id])
    assert mandate["status"] == "ESCROWED"
    assert int(mandate["payment_deposited"]) == PAYMENT
    assert mandate["checklist_hash"]
    return mandate_id


def run_to_sealed(contract, operator, url, suffix):
    mandate_id = create_and_fund(contract, operator.address, suffix)
    operator_contract = contract.connect(operator)

    must_succeed(
        operator_contract.accept_mandate(
            args=[mandate_id, "sha256:live-plan"]
        ).transact(value=OPERATOR_BOND),
        "accept_mandate",
    )

    for criterion_id in ("C1", "C2"):
        must_succeed(
            operator_contract.submit_evidence(
                args=[
                    mandate_id,
                    criterion_id,
                    url,
                    "DELIVERABLE",
                    CLAIMED_HASH,
                    "text/markdown",
                    "published-document",
                    "UNKNOWN",
                    "A document filed against the checklist.",
                ]
            ).transact(),
            f"submit_evidence({criterion_id})",
        )

    must_succeed(
        operator_contract.submit_deliverable(
            args=[mandate_id, url, CLAIMED_HASH]
        ).transact(),
        "submit_deliverable",
    )
    must_succeed(
        contract.open_contest(
            args=[
                mandate_id,
                json.dumps(["C1", "C2"]),
                "The filed document does not satisfy the checklist.",
                "[]",
            ]
        ).transact(value=CONTEST_BOND),
        "open_contest",
    )
    must_succeed(
        contract.seal_record(args=[mandate_id]).transact(), "seal_record"
    )
    return mandate_id


def test_protocol_surface_is_live_and_closed(contract):
    info = read(contract, "get_protocol_info", [])
    assert info["version"] == "Attestra-1.0.0"
    assert info["weight_total"] == 100
    assert info["max_appeals"] == 1
    assert sorted(info["criterion_results"]) == ["FAIL", "INCONCLUSIVE", "PASS"]
    assert sorted(info["rulings"]) == [
        "CONFIRMED",
        "INCONCLUSIVE",
        "PARTIAL",
        "REJECTED",
    ]


def test_funding_locks_terms_and_records_real_custody(contract, operator):
    mandate_id = create_and_fund(contract, operator.address, "custody")
    failed = contract.update_draft(
        args=[
            mandate_id,
            "Rewritten after funding",
            "New description",
            CRITERIA_JSON,
            "New rules",
        ]
    ).transact()
    reason = must_fail(failed, "update_draft after funding")
    assert "illegal transition" in reason


@pytest.mark.skipif(
    os.environ.get("ATTESTRA_SKIP_PANEL", "0") == "1",
    reason="slow live-panel rounds were disabled",
)
def test_live_panel_reaches_consensus_on_retrievable_evidence(contract, operator):
    mandate_id = run_to_sealed(contract, operator, GOOD_URL, "retrievable")
    receipt = contract.adjudicate(args=[mandate_id]).transact(**ROUND_WAIT)
    must_succeed(receipt, "adjudicate retrievable record")

    mandate = read(contract, "get_mandate", [mandate_id])
    assert mandate["status"] == "RULING"
    ruling = read(contract, "get_ruling", [mandate_id, mandate["latest_ruling_id"]])
    assert ruling["ruling"] in ("CONFIRMED", "PARTIAL")
    assert ruling["score"] > 0


@pytest.mark.skipif(
    os.environ.get("ATTESTRA_SKIP_PANEL", "0") == "1",
    reason="slow live-panel rounds were disabled",
)
def test_unreachable_evidence_does_not_pass(contract, operator):
    mandate_id = run_to_sealed(contract, operator, DEAD_URL, "unreachable")
    receipt = contract.adjudicate(args=[mandate_id]).transact(**ROUND_WAIT)
    must_succeed(receipt, "adjudicate unreachable record")

    mandate = read(contract, "get_mandate", [mandate_id])
    ruling = read(contract, "get_ruling", [mandate_id, mandate["latest_ruling_id"]])
    results = {item["id"]: item["result"] for item in ruling["criterion_results"]}
    assert results["C1"] == "INCONCLUSIVE"
    assert ruling["score"] == 0
    assert int(mandate["custody_held"]) == PAYMENT


@pytest.mark.skipif(
    os.environ.get("ATTESTRA_SKIP_PANEL", "0") == "1",
    reason="slow live-panel rounds were disabled",
)
def test_settlement_moves_the_amount_derived_from_weights(contract, operator):
    mandate_id = run_to_sealed(contract, operator, GOOD_URL, "settlement")
    receipt = contract.adjudicate(args=[mandate_id]).transact(**ROUND_WAIT)
    must_succeed(receipt, "adjudicate settlement record")

    premature = contract.settle(args=[mandate_id]).transact()
    must_fail(premature, "settle before finalization")

    mandate = read(contract, "get_mandate", [mandate_id])
    ruling = read(contract, "get_ruling", [mandate_id, mandate["latest_ruling_id"]])
    while read(contract, "get_protocol_info", [])["current_tick"] <= mandate[
        "appeal_deadline_tick"
    ]:
        must_succeed(contract.tick(args=[]).transact(), "tick")

    must_succeed(
        contract.finalize_ruling(args=[mandate_id]).transact(), "finalize_ruling"
    )
    must_succeed(contract.settle(args=[mandate_id]).transact(), "settle")

    settlement = read(contract, "get_settlement", [mandate_id])
    expected = (
        PAYMENT
        if settlement["policy_applied"] == "RELEASE_FULL"
        else PAYMENT * ruling["score"] // 100
    )
    assert int(settlement["operator_payout"]) == expected
    assert int(settlement["custody_after"]) == 0
    assert read(contract, "get_mandate", [mandate_id])["status"] == "SETTLED"

    requester = get_default_account()
    assert requester.address
