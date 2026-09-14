"""Agreement creation, validation, authorization and immutability."""

import json

from .conftest import CRITERIA, CRITERIA_JSON, PAYMENT


def test_protocol_surface_and_deployment(deployed):
    info = deployed.get_protocol_info()
    assert info["version"] == "Attestra-1.0.0"
    assert info["weight_total"] == 100
    assert info["max_appeals"] == 1
    assert info["max_criteria"] == 24
    assert "JUDGMENT" in info["criterion_types"]
    assert "FETCH_SUCCESS" in info["retrieval_labels"]


def test_create_mandate(deployed, direct_alice, direct_bob, drafted):
    mandate = deployed.get_mandate(drafted)
    assert drafted == "M00001"
    assert mandate["status"] == "DRAFT"
    assert mandate["client"].lower() == str(direct_alice).lower()
    assert mandate["operator"].lower() == str(direct_bob).lower()
    assert mandate["payment_wei"] == str(PAYMENT)
    assert mandate["payment_deposited"] == "0"
    assert mandate["criterion_count"] == 3
    assert mandate["terms_locked"] is False


def test_criteria_are_typed_and_sum_to_one_hundred(deployed, drafted):
    items = deployed.get_criteria(drafted)
    assert [item["id"] for item in items] == ["C1", "C2", "C3"]
    assert sum(item["weight"] for item in items) == 100
    assert items[0]["critical"] is True
    assert items[2]["type"] == "OBJECTIVE"


def test_client_and_operator_must_differ(
    direct_vm, deployed, direct_alice
):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("client and operator must be different"):
        deployed.create_mandate(
            str(direct_alice), "Title", "Description", CRITERIA_JSON, str(PAYMENT)
        )


def test_weights_must_sum_to_one_hundred(
    direct_vm, deployed, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice
    bad = json.dumps([
        {"id": "C1", "text": "one", "type": "EVIDENCE", "weight": 60},
        {"id": "C2", "text": "two", "type": "JUDGMENT", "weight": 30},
    ])
    with direct_vm.expect_revert("weights must sum to 100"):
        deployed.create_mandate(
            str(direct_bob), "Title", "Description", bad, str(PAYMENT)
        )


def test_duplicate_criterion_id_is_refused(
    direct_vm, deployed, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice
    bad = json.dumps([
        {"id": "C1", "text": "one", "type": "EVIDENCE", "weight": 50},
        {"id": "C1", "text": "two", "type": "JUDGMENT", "weight": 50},
    ])
    with direct_vm.expect_revert("duplicate criterion id"):
        deployed.create_mandate(
            str(direct_bob), "Title", "Description", bad, str(PAYMENT)
        )


def test_unknown_criterion_type_is_refused(
    direct_vm, deployed, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice
    bad = json.dumps([
        {"id": "C1", "text": "one", "type": "VIBES", "weight": 100}
    ])
    with direct_vm.expect_revert("unknown type"):
        deployed.create_mandate(
            str(direct_bob), "Title", "Description", bad, str(PAYMENT)
        )


def test_draft_can_be_amended(direct_vm, deployed, direct_alice, drafted):
    direct_vm.sender = direct_alice
    deployed.update_draft(
        drafted, "Revised title", "Revised description", CRITERIA_JSON, "New rules"
    )
    mandate = deployed.get_mandate(drafted)
    assert mandate["title"] == "Revised title"
    assert mandate["evidence_rules"] == "New rules"


def test_funding_locks_terms_and_records_real_custody(deployed, funded):
    mandate = deployed.get_mandate(funded)
    assert mandate["status"] == "ESCROWED"
    assert mandate["terms_locked"] is True
    assert mandate["checklist_hash"].startswith("sha256:")
    assert mandate["payment_deposited"] == str(PAYMENT)
    assert mandate["custody_held"] == str(PAYMENT)


def test_funded_terms_cannot_be_amended(
    direct_vm, deployed, direct_alice, funded
):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("illegal transition"):
        deployed.update_draft(
            funded, "Tampered", "Tampered", CRITERIA_JSON, "Tampered"
        )


def test_registry_listing_is_paged(deployed, drafted):
    page = deployed.list_mandates(0, 10)
    assert page["total"] == 1
    assert page["items"][0]["mandate_id"] == drafted
    assert page["next_offset"] == -1
