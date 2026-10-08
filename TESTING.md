# Testing

Attestra has three independent validation layers. The web application itself
always targets the live StudioNet deployment; no test network selector or
simulator fallback is compiled into the UI.

## 1. GenVM direct contract suite

Requirements: Python 3.12.

```bash
pip install -r requirements.txt
python scripts/fetch_genvm_bundle.py
PYTHONUTF8=1 genvm-lint check contracts/attestra.py
PYTHONUTF8=1 gltest tests/direct -q
```

Expected result:

```text
Validation passed
Contract: Attestra
Methods: 28 (10 view, 18 write)
53 passed
```

Direct mode runs the contract in the real GenVM runner with deterministic mock
responses for web/model calls. It does not prove independent validators agree;
it proves the contract runtime, storage, normalization, authorization and money
logic around consensus.

The suite covers:

- deployment and `get_protocol_info`;
- checklist parsing, unique identifiers and exact weight totals;
- draft editing and post-funding immutability;
- exact payment, performance bond and contest bond handling;
- single-release custody and protection against settling twice;
- evidence receipt binding and cross-mandate isolation;
- VM-managed nested arrays/maps and record sealing;
- complete criterion-result normalization;
- removal of invented payout/recipient fields from panel output;
- score derivation from frozen weights;
- critical-failure policy override;
- appeal limit, finalization window and ruling pinning;
- proportional, full, return and manual-review paths;
- custody reaching zero before value transfer;
- operator passport updates;
- an operator closing a delivery the client never reviewed, and the refusal to
  do so while the review window is open;
- the refusal to contest after the review window has closed;
- immutable timestamp deadline safety, including repeated-call attempts by both
  parties and explicit proof that the ABI exposes no clock-control method;
- the refusal to recover manual-review custody while a ruling is still
  appealable, and success once it is finalized;
- the rejection of evidence filed without a valid content commitment;
- content binding at adjudication: a retrieved document that does not hash to
  its sealed commitment reaches the panel labelled as a mismatch and carries no
  content, while a matching document does.

## 2. Public canonical deployment verification

No wallet, key or funded account is required:

```bash
node scripts/check_live_deployment.mjs
```

Expected checks:

```text
PASS chain: 61999
PASS contract: 0xF6E574e9d910D320551589986b9554510dE33626
PASS source: sha256 0c58100d635e34f3f7fff1f260a25e438df59c148e5aa3482037e20b6a7fe9db
PASS schema: 28 methods (10 read, 18 write)
PASS protocol: Attestra-1.2.0
```

This command retrieves live source and schema from StudioNet. It is the release
check that proves the web application points at the contract represented by this
repository.

Explicit safety-remediation verification:

```bash
npm run verify:safety
```

This reads the deployed source and schema and reports four independent PASS
results: operator closure after an unanswered review window, absence of every
caller-controlled clock method plus consensus timestamp deadlines,
finalization-gated manual-review recovery, and sha256 binding of retrieved
evidence to the sealed record. Runtime behavior is covered by the 53 direct
GenVM tests against the exact same byte-verified source.

The Vercel-compatible health endpoint performs a smaller live check:

```bash
curl http://localhost:3000/api/health
```

It verifies the endpoint reports chain 61999 and the configured contract returns
the expected protocol version.

A successful leader execution can appear beside an idle validator entry marked
ERROR once quorum has already been reached. The application ignores that
cancelled entry, preserves real rollback reasons, and re-reads live mandate state
after every action.

## 3. Real StudioNet validator integration suite

This suite deploys a disposable contract, submits real transactions and runs real
validator-panel adjudications. It requires two funded StudioNet accounts: one
client and one operator.

Keep account keys in a private local `.env` file and add this block to a private
copy of `gltest.config.yaml` under `studionet`:

```yaml
accounts:
  - "${ATTESTRA_CLIENT_KEY}"
  - "${ATTESTRA_OPERATOR_KEY}"
```

Run:

```bash
gltest tests/integration -v -s --network studionet
```

Fast live checks without adjudication rounds:

```bash
ATTESTRA_SKIP_PANEL=1 gltest tests/integration -v -s --network studionet
```

The full suite establishes:

- a fresh contract deploys on StudioNet;
- the chain-reported schema can bind all public methods;
- funding records real custody and freezes the checklist;
- independent validators retrieve a stable public source and agree on
  criterion-level outcomes;
- an intentionally unresolvable source is INCONCLUSIVE and never PASS;
- settlement is refused before finalization;
- after the appeal window, the payout equals the amount independently derived
  from the frozen score;
- custody reaches zero after settlement.

Panel rounds take minutes. Assertions target states, outcomes, scores, hashes and
amounts—not model prose.

## 4. Guided MetaMask manual suite

Start with `samples/README.md`. The folder contains six scenarios and public
evidence fixtures covering approval, proportional settlement, unavailable
evidence, recovery, cancellation, lapse, bounded appeal and instructions
embedded in evidence. Amounts use integer GEN values such as 50 or 100, with
integer 1 GEN bonds where a bond exercise is useful.

Use `samples/MANUAL_TEST_CHECKLIST.md` to map each visible step to all 10 reads
and 18 writes. Every scenario runs against the canonical StudioNet deployment
with user-signed MetaMask transactions. No sample requests or stores a key.

The keyless read helper can be run at any time:

```bash
node samples/read-live-state.mjs
```

After creating a mandate, provide its internal identifier only to the local
command-line process to inspect every related view. The website itself uses
human-readable labels and does not display raw technical identifiers.

## Application validation

No environment variable is required:

```bash
npm ci
npm run lint
npx next typegen
npm exec tsc -- --noEmit --pretty false
npm run build
```

After starting the application, verify:

1. The home page reports StudioNet chain 61999.
2. The Contract page reports a live contract on the canonical address.
3. The empty registry is truthful when `mandate_count` is zero.
4. Connecting MetaMask adds or switches to chain 61999.
5. Creating a mandate opens a MetaMask signature request.
6. A successful write displays its transaction hash and re-reads accepted state.
7. A rollback payload is displayed as a human contract error, not success.
8. The application starts when `DATABASE_URL` is absent.

## Reading failures

- **Wallet rejected** means the user declined signing. It is not a contract
  failure.
- **Submitted, receipt pending** means a hash exists but final status could not be
  read. Do not immediately repeat a value-bearing action.
- **Contract rollback** means consensus included execution but the contract guard
  refused the action; the rollback message states the violated rule.
- **Panel round did not settle** means consensus did not commit a ruling. Custody
  remains held and the sealed state can be retried.
- **Deployment source mismatch** means the configured address is not running the
  source in this repository. Stop the release rather than changing the expected
  digest.
