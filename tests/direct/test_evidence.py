"""Evidence claims, receipt binding and record sealing."""

from .conftest import add_evidence


def test_evidence_receipt_is_bound_to_a_criterion(
    direct_vm, deployed, direct_bob, engaged
):
    direct_vm.sender = direct_bob
    receipt_id = add_evidence(deployed, engaged, "C1")
    records = deployed.get_evidence(engaged)
    assert receipt_id == "M00001-E1"
    assert records[0]["criterion_id"] == "C1"
    assert records[0]["sealed"] is False


def test_claims_are_stored_as_claims(
    direct_vm, deployed, direct_bob, engaged
):
    direct_vm.sender = direct_bob
    add_evidence(deployed, engaged, "C2")
    record = deployed.get_evidence(engaged)[0]
    assert record["claimed_content_hash"] == "sha256:claimed"
    assert record["claimed_independence"] == "INDEPENDENT"


def test_unknown_criterion_is_refused(
    direct_vm, deployed, direct_bob, engaged
):
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("not in this checklist"):
        add_evidence(deployed, engaged, "C99")


def test_non_http_source_is_refused(
    direct_vm, deployed, direct_bob, engaged
):
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("source url must be http"):
        add_evidence(deployed, engaged, "C1", url="ftp://example.com/file")


def test_outsider_cannot_file_evidence(
    direct_vm, deployed, direct_charlie, engaged
):
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("caller is not a party"):
        add_evidence(deployed, engaged, "C1")


def test_sealing_marks_every_admissible_receipt(
    deployed, sealed
):
    mandate = deployed.get_mandate(sealed)
    records = deployed.get_evidence(sealed)
    assert mandate["status"] == "RECORD_SEALED"
    assert mandate["record_snapshot_hash"].startswith("sha256:")
    assert all(record["sealed"] for record in records)


def test_nothing_can_be_filed_after_sealing(
    direct_vm, deployed, direct_alice, sealed
):
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("illegal transition"):
        add_evidence(deployed, sealed, "C1", url="https://example.com/late")


def test_receipt_cannot_be_cited_by_another_mandate(
    direct_vm, deployed, direct_alice, direct_bob, engaged
):
    direct_vm.sender = direct_bob
    receipt_id = add_evidence(deployed, engaged, "C1")
    direct_vm.sender = direct_alice
    second = deployed.create_mandate(
        str(direct_bob),
        "Second mandate",
        "A separate agreement whose evidence must remain separate.",
        '[{"id":"C1","text":"Done.","type":"EVIDENCE","weight":100,"critical":false,"method":"Read it."}]',
        "1000000000000000000",
        "0",
        "0",
        "",
    )
    direct_vm.value = 1000000000000000000
    deployed.fund_mandate(second)
    direct_vm.value = 0
    direct_vm.sender = direct_bob
    deployed.accept_mandate(second, "")
    deployed.submit_evidence(
        second, "C1", "https://example.com/second", "DELIVERABLE", "", "text/html",
        "second", "UNKNOWN", "Second deliverable."
    )
    deployed.submit_deliverable(second, "https://example.com/second", "")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("belongs to a different mandate"):
        deployed.open_contest(
            second, '["C1"]', "The second work failed.", f'["{receipt_id}"]'
        )
