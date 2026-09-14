"""Appeals, policy mapping, recovery and final settlement."""

from .conftest import ALL_IDS, CONTEST_BOND, OPERATOR_BOND, PAYMENT, make_ruling, mock_panel


def _rule(direct_vm, deployed, direct_alice, sealed, results):
    direct_vm.sender = direct_alice
    mock_panel(direct_vm, make_ruling(sealed, results))
    return deployed.adjudicate(sealed)


def _age_past_window(deployed, mandate_id):
    deadline = deployed.get_mandate(mandate_id)["appeal_deadline_tick"]
    while deployed.get_protocol_info()["current_tick"] <= deadline:
        deployed.tick()


def test_ruling_cannot_settle_before_finalization(
    direct_vm, deployed, direct_alice, sealed
):
    _rule(
        direct_vm,
        deployed,
        direct_alice,
        sealed,
        {criterion_id: "PASS" for criterion_id in ALL_IDS},
    )
    with direct_vm.expect_revert("illegal transition"):
        deployed.settle(sealed)


def test_finalize_waits_for_appeal_window(
    direct_vm, deployed, direct_alice, sealed
):
    _rule(
        direct_vm,
        deployed,
        direct_alice,
        sealed,
        {criterion_id: "PASS" for criterion_id in ALL_IDS},
    )
    with direct_vm.expect_revert("appeal window is open"):
        deployed.finalize_ruling(sealed)


def test_confirmed_ruling_releases_full_payment(
    direct_vm, deployed, direct_alice, sealed
):
    _rule(
        direct_vm,
        deployed,
        direct_alice,
        sealed,
        {criterion_id: "PASS" for criterion_id in ALL_IDS},
    )
    _age_past_window(deployed, sealed)
    deployed.finalize_ruling(sealed)
    deployed.settle(sealed)
    settlement = deployed.get_settlement(sealed)
    assert settlement["policy_applied"] == "RELEASE_FULL"
    assert settlement["operator_payout"] == str(PAYMENT)
    assert settlement["operator_bond_returned"] == str(OPERATOR_BOND)
    assert settlement["contest_bond_returned"] == str(CONTEST_BOND)
    assert settlement["custody_after"] == "0"


def test_partial_ruling_uses_contract_score(
    direct_vm, deployed, direct_alice, sealed
):
    _rule(
        direct_vm,
        deployed,
        direct_alice,
        sealed,
        {"C1": "PASS", "C2": "FAIL", "C3": "PASS"},
    )
    _age_past_window(deployed, sealed)
    deployed.finalize_ruling(sealed)
    deployed.settle(sealed)
    settlement = deployed.get_settlement(sealed)
    assert settlement["policy_applied"] == "PRORATA"
    assert settlement["score"] == 65
    assert settlement["operator_payout"] == str(PAYMENT * 65 // 100)
    assert settlement["client_payout"] == str(PAYMENT * 35 // 100 + CONTEST_BOND)


def test_critical_failure_overrides_high_score(
    direct_vm, deployed, direct_alice, sealed
):
    _rule(
        direct_vm,
        deployed,
        direct_alice,
        sealed,
        {"C1": "FAIL", "C2": "PASS", "C3": "PASS"},
    )
    _age_past_window(deployed, sealed)
    deployed.finalize_ruling(sealed)
    deployed.settle(sealed)
    settlement = deployed.get_settlement(sealed)
    assert settlement["score"] == 60
    assert settlement["policy_applied"] == "RETURN"
    assert settlement["operator_payout"] == "0"
    assert settlement["client_payout"] == str(PAYMENT + CONTEST_BOND)


def test_one_bounded_appeal_creates_a_second_ruling(
    direct_vm, deployed, direct_alice, sealed
):
    _rule(
        direct_vm,
        deployed,
        direct_alice,
        sealed,
        {"C1": "PASS", "C2": "FAIL", "C3": "PASS"},
    )
    deployed.appeal(sealed, "The second source was read incorrectly.")
    mock_panel(
        direct_vm,
        make_ruling(sealed, {criterion_id: "PASS" for criterion_id in ALL_IDS}),
    )
    second = deployed.adjudicate(sealed)
    assert second == 2
    assert len(deployed.list_rulings(sealed)) == 2
    with direct_vm.expect_revert("appeal allowance"):
        deployed.appeal(sealed, "Try a third round.")


def test_inconclusive_ruling_recovers_without_guessing(
    direct_vm, deployed, direct_alice, sealed
):
    _rule(
        direct_vm,
        deployed,
        direct_alice,
        sealed,
        {criterion_id: "INCONCLUSIVE" for criterion_id in ALL_IDS},
    )
    _age_past_window(deployed, sealed)
    deployed.finalize_ruling(sealed)
    with direct_vm.expect_revert("does not settle automatically"):
        deployed.settle(sealed)
    deployed.recover_escrow(sealed)
    mandate = deployed.get_mandate(sealed)
    assert mandate["status"] == "RETURNED"
    assert mandate["custody_held"] == "0"


def test_passport_is_recorded_after_settlement(
    direct_vm, deployed, direct_alice, direct_bob, sealed
):
    _rule(
        direct_vm,
        deployed,
        direct_alice,
        sealed,
        {criterion_id: "PASS" for criterion_id in ALL_IDS},
    )
    _age_past_window(deployed, sealed)
    deployed.finalize_ruling(sealed)
    deployed.settle(sealed)
    passport = deployed.get_passport(str(direct_bob))
    assert passport["mandates_confirmed"] == 1
    assert passport["average_score"] == 100
    assert passport["verified_value_wei"] == str(PAYMENT)
