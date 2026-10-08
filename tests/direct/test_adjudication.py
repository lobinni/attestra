"""Contests, normalization and adjudication rounds."""

from .conftest import ALL_IDS, make_ruling, mock_panel


def test_contest_must_name_a_criterion(
    direct_vm, deployed, direct_alice, delivered
):
    direct_vm.sender = direct_alice
    direct_vm.value = 2 * (10 ** 18)
    with direct_vm.expect_revert("must name at least one criterion"):
        deployed.open_contest(delivered, "[]", "The work is wrong.", "[]")
    direct_vm.value = 0


def test_contest_records_both_sides(
    direct_vm, deployed, direct_bob, contested
):
    direct_vm.sender = direct_bob
    deployed.respond_to_contest(
        contested, "The contested sections are present in appendix B.", "[]"
    )
    record = deployed.get_contest(contested)
    assert record["contested_criteria"] == ["C1", "C2"]
    assert record["status"] == "ANSWERED"
    assert "appendix B" in record["operator_response"]


def test_panel_ruling_is_stored_but_score_is_derived(
    direct_vm, deployed, direct_alice, sealed
):
    direct_vm.sender = direct_alice
    mock_panel(
        direct_vm,
        make_ruling(sealed, {"C1": "PASS", "C2": "FAIL", "C3": "PASS"}),
    )
    ruling_id = deployed.adjudicate(sealed)
    ruling = deployed.get_ruling(sealed, ruling_id)
    assert ruling_id == 1
    assert ruling["ruling"] == "PARTIAL"
    assert ruling["score"] == 65
    assert ruling["critical_failed"] is False
    assert deployed.get_mandate(sealed)["status"] == "RULING"


def test_failed_critical_criterion_is_derived_by_contract(
    direct_vm, deployed, direct_alice, sealed
):
    direct_vm.sender = direct_alice
    mock_panel(
        direct_vm,
        make_ruling(sealed, {"C1": "FAIL", "C2": "PASS", "C3": "PASS"}),
    )
    ruling_id = deployed.adjudicate(sealed)
    ruling = deployed.get_ruling(sealed, ruling_id)
    assert ruling["score"] == 60
    assert ruling["critical_failed"] is True


def test_invented_payout_field_never_reaches_storage(
    direct_vm, deployed, direct_alice, sealed
):
    direct_vm.sender = direct_alice
    mock_panel(
        direct_vm,
        make_ruling(
            sealed,
            {criterion_id: "PASS" for criterion_id in ALL_IDS},
            operator_payout=999999999999999999999,
            recipient="0x0000000000000000000000000000000000000001",
        ),
    )
    ruling_id = deployed.adjudicate(sealed)
    ruling = deployed.get_ruling(sealed, ruling_id)
    assert ruling["score"] == 100
    assert "operator_payout" not in ruling
    assert "recipient" not in ruling


def test_panel_must_return_every_criterion(
    direct_vm, deployed, direct_alice, sealed
):
    direct_vm.sender = direct_alice
    mock_panel(direct_vm, make_ruling(sealed, {"C1": "PASS", "C2": "PASS"}))
    with direct_vm.expect_revert("adjudication round failed"):
        deployed.adjudicate(sealed)
    assert deployed.get_mandate(sealed)["status"] == "RECORD_SEALED"


def test_unavailable_record_can_never_be_stored_as_a_pass(
    direct_vm, deployed, direct_alice, sealed
):
    direct_vm.sender = direct_alice
    mock_panel(
        direct_vm,
        make_ruling(sealed, {criterion_id: "INCONCLUSIVE" for criterion_id in ALL_IDS}),
        status=503,
        body="service unavailable",
    )
    ruling_id = deployed.adjudicate(sealed)
    ruling = deployed.get_ruling(sealed, ruling_id)
    assert ruling["ruling"] == "INCONCLUSIVE"
    assert ruling["score"] == 0
