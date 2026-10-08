"""Pure-rule behaviour is exercised through real adjudication tests.

This file keeps a small deployment smoke check separate so a contributor can run
`gltest tests/direct/test_normalizer.py` before the full lifecycle suite.
"""


def test_public_surface_remains_closed(deployed):
    info = deployed.get_protocol_info()
    assert set(info["criterion_results"]) == {"PASS", "FAIL", "INCONCLUSIVE"}
    assert set(info["rulings"]) == {
        "CONFIRMED",
        "PARTIAL",
        "REJECTED",
        "INCONCLUSIVE",
    }
    assert set(info["settlement_policies"]) == {
        "RELEASE_FULL",
        "PRORATA",
        "RETURN",
        "MANUAL_REVIEW",
    }
