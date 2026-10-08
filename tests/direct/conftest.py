"""Shared fixtures for the Attestra direct suite.

Direct mode runs the contract inside a real GenVM runner. Web and model calls
are mocked, but storage, public ABI decoding, authorization, attached value and
state transitions use the actual contract runtime.
"""

import hashlib
import json
import pathlib

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "contracts" / "attestra.py"

PAYMENT = 100 * (10 ** 18)
OPERATOR_BOND = 5 * (10 ** 18)
CONTEST_BOND = 2 * (10 ** 18)

# Direct mode serves this exact body for every mocked retrieval. The sealed
# commitment is its sha256, so a receipt filed with SEALED_COMMITMENT is
# admissible and one filed with any other digest must not be.
SEALED_BODY = "<html>the sealed deliverable</html>"
SEALED_COMMITMENT = hashlib.sha256(SEALED_BODY.strip().encode("utf-8")).hexdigest()
SWAPPED_COMMITMENT = hashlib.sha256(b"a different document").hexdigest()

CRITERIA = [
    {
        "id": "C1",
        "text": "The published report covers all five named markets.",
        "type": "JUDGMENT",
        "weight": 40,
        "critical": True,
        "method": "Read the report and compare its sections with the agreement.",
    },
    {
        "id": "C2",
        "text": "Every figure cites a publicly retrievable source.",
        "type": "EVIDENCE",
        "weight": 35,
        "critical": False,
        "method": "Follow every citation and classify the retrieval.",
    },
    {
        "id": "C3",
        "text": "The executive summary is no longer than one page.",
        "type": "OBJECTIVE",
        "weight": 25,
        "critical": False,
        "method": "Count the pages in the summary section.",
    },
]
CRITERIA_JSON = json.dumps(CRITERIA)
ALL_IDS = [item["id"] for item in CRITERIA]


def make_ruling(mandate_id, results, ruling=None, **extra):
    values = list(results.values())
    if ruling is None:
        if all(value == "PASS" for value in values):
            ruling = "CONFIRMED"
        elif all(value == "INCONCLUSIVE" for value in values):
            ruling = "INCONCLUSIVE"
        elif "PASS" in values:
            ruling = "PARTIAL"
        else:
            ruling = "REJECTED"
    payload = {
        "mandate_id": mandate_id,
        "ruling": ruling,
        "criterion_results": [
            {
                "id": criterion_id,
                "result": result,
                "reason_code": f"{result}_BY_TEST",
                "justification": "Direct-mode fixture result.",
            }
            for criterion_id, result in results.items()
        ],
        "evidence_quality": "HIGH",
        "integrity_flags": [],
        "inconclusive_items": [
            criterion_id
            for criterion_id, result in results.items()
            if result == "INCONCLUSIVE"
        ],
        "reasoning": "The panel evaluated every criterion in the sealed record.",
    }
    payload.update(extra)
    return json.dumps(payload)


def mock_panel(direct_vm, ruling_json, status=200, body=SEALED_BODY):
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*", {"status": status, "body": body})
    direct_vm.mock_llm(r".*independent verification panel.*", ruling_json)


@pytest.fixture
def contract_path():
    return str(CONTRACT)


@pytest.fixture
def deployed(direct_deploy, contract_path):
    return direct_deploy(contract_path)


@pytest.fixture
def drafted(direct_vm, deployed, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    return deployed.create_mandate(
        str(direct_bob),
        "Five-market landscape report",
        "Deliver a written landscape report covering five named markets.",
        CRITERIA_JSON,
        str(PAYMENT),
        str(OPERATOR_BOND),
        str(CONTEST_BOND),
        "Sources must be publicly retrievable without a login.",
        "RELEASE_FULL",
        "PRORATA",
        "RETURN",
        "MANUAL_REVIEW",
        "VOID_MANDATE",
        120_000,
        60_000,
    )


@pytest.fixture
def funded(direct_vm, deployed, direct_alice, drafted):
    direct_vm.sender = direct_alice
    direct_vm.value = PAYMENT
    deployed.fund_mandate(drafted)
    direct_vm.value = 0
    return drafted


@pytest.fixture
def engaged(direct_vm, deployed, direct_bob, funded):
    direct_vm.sender = direct_bob
    direct_vm.value = OPERATOR_BOND
    deployed.accept_mandate(funded, "sha256:plan")
    direct_vm.value = 0
    return funded


def add_evidence(deployed, mandate_id, criterion_id="C1",
                 role="DELIVERABLE", url="https://example.com/evidence",
                 commitment=SEALED_COMMITMENT):
    return deployed.submit_evidence(
        mandate_id,
        criterion_id,
        url,
        role,
        commitment,
        "text/html",
        "example-publisher",
        "INDEPENDENT",
        "A source filed against the acceptance checklist.",
    )


@pytest.fixture
def delivered(direct_vm, deployed, direct_bob, engaged):
    direct_vm.sender = direct_bob
    for criterion_id in ALL_IDS:
        add_evidence(deployed, engaged, criterion_id)
    deployed.submit_deliverable(
        engaged, "https://example.com/deliverable", "sha256:deliverable"
    )
    return engaged


@pytest.fixture
def contested(direct_vm, deployed, direct_alice, delivered):
    direct_vm.sender = direct_alice
    direct_vm.value = CONTEST_BOND
    deployed.open_contest(
        delivered,
        json.dumps(["C1", "C2"]),
        "The report omits one market and several figures have no source.",
        json.dumps([]),
    )
    direct_vm.value = 0
    return delivered


@pytest.fixture
def sealed(direct_vm, deployed, direct_alice, contested):
    direct_vm.sender = direct_alice
    deployed.seal_record(contested)
    return contested


def warp_to_deadline(direct_vm, deployed, mandate_id, field):
    """Move consensus time past the named millisecond deadline.

    The contract has no clock-advance method. Tests use the direct VM's
    timestamp cheatcode, which models time actually passing, not a wallet
    submitting additional calls.
    """
    deadline = deployed.get_mandate(mandate_id)[field]
    # Convert the millisecond deadline to ISO UTC; Python only needs base time here.
    from datetime import datetime, timezone
    moment = datetime.fromtimestamp(
        (deadline + 1000) / 1000, tz=timezone.utc
    ).isoformat().replace("+00:00", "Z")
    direct_vm.warp(moment)

    # Direct-mode _refresh_gl_message updates sender/value but not the injected
    # datetime. Contracts read gl.message_raw["datetime"], so tests set the
    # injected consensus value exactly here.
    import genlayer.gl as gl

    gl.message_raw["datetime"] = moment
    return deadline
