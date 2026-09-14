"""Custody, exact bonds and terminal payout sequences."""

from .conftest import CONTEST_BOND, OPERATOR_BOND, PAYMENT


def test_funding_requires_exact_payment(
    direct_vm, deployed, direct_alice, drafted
):
    direct_vm.sender = direct_alice
    direct_vm.value = PAYMENT - 1
    with direct_vm.expect_revert("exact payment required"):
        deployed.fund_mandate(drafted)
    direct_vm.value = 0
    assert deployed.get_mandate(drafted)["status"] == "DRAFT"


def test_operator_bond_must_be_exact(
    direct_vm, deployed, direct_bob, funded
):
    direct_vm.sender = direct_bob
    direct_vm.value = OPERATOR_BOND - 1
    with direct_vm.expect_revert("exact performance bond required"):
        deployed.accept_mandate(funded, "")
    direct_vm.value = 0


def test_acceptance_records_bond_as_custody(deployed, engaged):
    mandate = deployed.get_mandate(engaged)
    assert mandate["status"] == "ENGAGED"
    assert mandate["operator_bond_deposited"] == str(OPERATOR_BOND)
    assert mandate["custody_held"] == str(PAYMENT + OPERATOR_BOND)


def test_cancel_before_engagement_returns_payment(
    direct_vm, deployed, direct_alice, funded
):
    direct_vm.sender = direct_alice
    deployed.cancel_mandate(funded)
    mandate = deployed.get_mandate(funded)
    assert mandate["status"] == "CANCELLED"
    assert mandate["custody_held"] == "0"
    assert mandate["total_released"] == str(PAYMENT)


def test_cancel_after_engagement_is_refused(
    direct_vm, deployed, direct_alice, engaged
):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("illegal transition"):
        deployed.cancel_mandate(engaged)


def test_client_can_approve_and_settle_without_panel(
    direct_vm, deployed, direct_alice, delivered
):
    direct_vm.sender = direct_alice
    deployed.approve_work(delivered)
    assert deployed.get_mandate(delivered)["status"] == "APPROVED"
    deployed.settle(delivered)
    mandate = deployed.get_mandate(delivered)
    settlement = deployed.get_settlement(delivered)
    assert mandate["status"] == "SETTLED"
    assert mandate["custody_held"] == "0"
    assert settlement["policy_applied"] == "RELEASE_FULL"
    assert settlement["operator_payout"] == str(PAYMENT)
    assert settlement["operator_bond_returned"] == str(OPERATOR_BOND)


def test_settlement_cannot_run_twice(
    direct_vm, deployed, direct_alice, delivered
):
    direct_vm.sender = direct_alice
    deployed.approve_work(delivered)
    deployed.settle(delivered)
    with direct_vm.expect_revert("illegal transition"):
        deployed.settle(delivered)


def test_contest_bond_must_be_exact(
    direct_vm, deployed, direct_alice, delivered
):
    direct_vm.sender = direct_alice
    direct_vm.value = CONTEST_BOND - 1
    with direct_vm.expect_revert("exact contest bond required"):
        deployed.open_contest(delivered, '["C1"]', "The criterion failed.", "[]")
    direct_vm.value = 0
