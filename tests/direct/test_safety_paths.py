"""Regression tests for immutable deadline safety.

These tests prove the contract no longer has any caller-controlled mechanism to
manufacture elapsed time. Every deadline is an immutable consensus-approved UTC
timestamp recorded when the corresponding lifecycle event landed.
"""

import json

import pytest

from .conftest import (ALL_IDS, OPERATOR_BOND, PAYMENT,
                       SEALED_COMMITMENT, SWAPPED_COMMITMENT, add_evidence,
                       mock_panel, warp_to_deadline,
                       make_ruling)


def test_there_is_no_clock_advance_method(deployed):
    """No view, write or ABI method may advance, wait, tick or sleep."""
    info = deployed.get_protocol_info()
    assert info["version"] == "Attestra-1.2.0"

    for method in dir(deployed):
        lowered = method.lower()
        assert "advance" not in lowered
        assert lowered != "tick"
        assert "sleep" not in lowered
        assert "wait" not in lowered


# ── 1 · no repeated call can manufacture a deadline ─────────────────────────

def test_repeated_operator_calls_do_not_expire_the_review_window(
    direct_vm, deployed, direct_bob, delivered
):
    """Calling permissionless-looking actions repeatedly cannot close review.

    The operator may try many evidence submissions. Each transaction advances
    only the mandate's records, never the fixed review deadline. The operator
    still cannot call unreviewed close until consensus time itself is past the
    deadline.
    """
    direct_vm.sender = direct_bob
    mandate_before = deployed.get_mandate(delivered)

    for index in range(12):
        add_evidence(
            deployed,
            delivered,
            "C1",
            commitment=SEALED_COMMITMENT,
            url=f"https://example.com/noisy-{index}",
        )

    mandate_after = deployed.get_mandate(delivered)
    assert mandate_after["review_deadline_at"] == mandate_before["review_deadline_at"]
    assert mandate_after["status"] == "DELIVERED"

    with direct_vm.expect_revert("review window runs to UTC millisecond"):
        deployed.claim_unreviewed_delivery(delivered)
    assert deployed.get_mandate(delivered)["status"] == "DELIVERED"


def test_repeated_creations_do_not_expire_another_mandate(
    direct_vm, deployed, direct_alice, direct_bob, engaged
):
    """Creating or acting on unrelated mandates cannot age another one."""
    from .conftest import CRITERIA_JSON

    direct_vm.sender = direct_alice
    second = deployed.create_mandate(
        str(direct_bob),
        "Second mandate",
        "Its deadlines must remain untouched by activity elsewhere.",
        CRITERIA_JSON,
        str(PAYMENT),
        "0",
        "0",
        "Public sources only.",
        "RELEASE_FULL",
        "PRORATA",
        "RETURN",
        "MANUAL_REVIEW",
        "VOID_MANDATE",
        60_000,
        60_000,
    )
    untouched = deployed.get_mandate(second)

    for _ in range(5):
        direct_vm.sender = direct_bob
        add_evidence(deployed, engaged, "C1", commitment=SEALED_COMMITMENT)

    after = deployed.get_mandate(second)
    assert after["execution_deadline_at"] == untouched["execution_deadline_at"]
    assert after["review_deadline_at"] == untouched["review_deadline_at"]
    assert after["created_at_ms"] == untouched["created_at_ms"]

    direct_vm.value = PAYMENT
    direct_vm.sender = direct_alice
    deployed.fund_mandate(second)
    direct_vm.value = 0
    assert deployed.get_mandate(second)["execution_deadline_at"] != 0


def test_repeated_ruling_calls_do_not_expire_the_appeal_window(
    direct_vm, deployed, direct_alice, sealed
):
    """An appeal appeal/recover loop cannot create a finalized manual-review refund."""
    direct_vm.sender = direct_alice
    mock_panel(
        direct_vm,
        make_ruling(sealed, {criterion_id: "INCONCLUSIVE" for criterion_id in ALL_IDS}),
    )
    deployed.adjudicate(sealed)

    deployed.appeal(sealed, "Attempting to force an immediate second round.")
    mock_panel(
        direct_vm,
        make_ruling(sealed, {criterion_id: "INCONCLUSIVE" for criterion_id in ALL_IDS}),
    )
    deployed.adjudicate(sealed)
    after = deployed.get_mandate(sealed)

    assert after["status"] == "RULING"
    assert after["latest_ruling_id"] == 2
    assert len(deployed.list_rulings(sealed)) == 2
    with direct_vm.expect_revert("illegal transition from RULING"):
        deployed.recover_escrow(sealed)
    assert deployed.get_mandate(sealed)["final_ruling_id"] == 0
    assert after["custody_held"] != "0"


# ── 2 · real time passing still resolves the intended paths ─────────────────

def test_operator_closes_only_after_consensus_time_passes_review_deadline(
    direct_vm, deployed, direct_bob, delivered
):
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("review window runs to UTC millisecond"):
        deployed.claim_unreviewed_delivery(delivered)
    assert deployed.get_mandate(delivered)["status"] == "DELIVERED"

    warp_to_deadline(direct_vm, deployed, delivered, "review_deadline_at")
    deployed.claim_unreviewed_delivery(delivered)
    assert deployed.get_mandate(delivered)["status"] == "APPROVED"

    deployed.settle(delivered)
    settlement = deployed.get_settlement(delivered)
    assert deployed.get_mandate(delivered)["status"] == "SETTLED"
    assert settlement["operator_payout"] == str(PAYMENT)
    assert settlement["operator_bond_returned"] == str(OPERATOR_BOND)


def test_only_operator_can_close_unreviewed_delivery(
    direct_vm, deployed, direct_alice, direct_charlie, delivered
):
    warp_to_deadline(direct_vm, deployed, delivered, "review_deadline_at")

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("caller is not the operator"):
        deployed.claim_unreviewed_delivery(delivered)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("caller is not the operator"):
        deployed.claim_unreviewed_delivery(delivered)


def test_client_cannot_contest_after_review_deadline(
    direct_vm, deployed, direct_alice, delivered
):
    warp_to_deadline(direct_vm, deployed, delivered, "review_deadline_at")
    direct_vm.sender = direct_alice
    direct_vm.value = 2 * (10 ** 18)
    with direct_vm.expect_revert("review window closed at UTC millisecond"):
        deployed.open_contest(
            delivered, json.dumps(["C1"]), "Too late to contest.", "[]"
        )
    direct_vm.value = 0


def test_manual_review_recovery_requires_timestamp_finalization(
    direct_vm, deployed, direct_alice, sealed
):
    direct_vm.sender = direct_alice
    mock_panel(
        direct_vm,
        make_ruling(sealed, {criterion_id: "INCONCLUSIVE" for criterion_id in ALL_IDS}),
    )
    deployed.adjudicate(sealed)
    assert deployed.get_mandate(sealed)["status"] == "RULING"

    with direct_vm.expect_revert("illegal transition from RULING"):
        deployed.recover_escrow(sealed)
    assert deployed.get_mandate(sealed)["custody_held"] != "0"

    warp_to_deadline(direct_vm, deployed, sealed, "appeal_deadline_at")
    deployed.finalize_ruling(sealed)
    deployed.recover_escrow(sealed)
    mandate = deployed.get_mandate(sealed)
    assert mandate["status"] == "RETURNED"
    assert mandate["custody_held"] == "0"


# ── 3 · immutable timestamp records remain readable ─────────────────────────

def test_timestamp_fields_are_consensus_utc_milliseconds(deployed, delivered):
    mandate = deployed.get_mandate(delivered)
    for field in (
        "created_at_ms",
        "funded_at_ms",
        "engaged_at_ms",
        "delivered_at_ms",
        "execution_deadline_at",
        "review_deadline_at",
    ):
        assert isinstance(mandate[field], int)
        assert mandate[field] > 1_600_000_000_000
    assert "current_time_ms" in mandate


def test_windows_are_bounded_at_creation(
    direct_vm, deployed, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("execution window must be between one minute"):
        deployed.create_mandate(
            str(direct_bob),
            "Impossible window",
            "This must refuse an absurd deadline.",
            '[{"id":"C1","text":"Done.","type":"OBJECTIVE","weight":100,"critical":false,"method":"Check."}]',
            str(PAYMENT),
            "0",
            "0",
            "",
            "RELEASE_FULL",
            "PRORATA",
            "RETURN",
            "MANUAL_REVIEW",
            "VOID_MANDATE",
            1,
            60_000,
        )
