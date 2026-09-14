# Attestra live manual samples

This directory is a hands-on companion to the deployed contract on GenLayer
StudioNet chain 61999. The scenarios use the real web application, two funded
MetaMask accounts and public evidence files. They do not use a local simulator,
application database or server-side signing key.

## Before you begin

Prepare two funded StudioNet accounts in MetaMask:

- **Client wallet** — creates, funds, reviews and contests mandates.
- **Operator wallet** — accepts work, files evidence and submits deliverables.

Both wallets need enough GEN for transaction fees. The client also needs the
agreed payment and any contest bond. The operator needs any performance bond.
All scenario amounts are integers: 50 or 100 GEN for payments, and 1 GEN when a
bond exercise is useful.

The application automatically asks MetaMask to add or switch to:

| Field | Value |
| --- | --- |
| Network | GenLayer StudioNet |
| Chain | 61999 |
| Currency | GEN |
| RPC | `https://studio.genlayer.com/api` |

Use the verified deployment linked from the Contract page.

## Publish the evidence files

Validator nodes must retrieve evidence over public HTTPS. After this repository
is pushed to GitHub, replace `YOUR_USERNAME/YOUR_REPOSITORY` in the scenario URLs
with the repository location. A raw evidence URL then has this form:

```text
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPOSITORY/main/samples/evidence/complete-deliverable.md
```

Keep the repository public while running an adjudication. A local file path,
private repository page or address requiring a login is not admissible public
evidence.

## Scenario map

| Scenario | Contract behavior covered |
| --- | --- |
| `scenarios/01-quick-approval.md` | create, amend draft, fund, accept, file evidence, deliver, approve, settle, passport |
| `scenarios/02-contested-adjudication.md` | contest, response, record seal, validator adjudication, ruling, appeal window, finalize, proportional settlement |
| `scenarios/03-inconclusive-recovery.md` | unavailable evidence, inconclusive ruling, manual-review policy, custody recovery |
| `scenarios/04-cancel-and-lapse.md` | draft cancellation, funded cancellation, short execution deadline, lapse, bond/payment recovery |
| `scenarios/05-bounded-appeal.md` | first ruling, single appeal, second ruling, prevention of repeated appeals |
| `scenarios/06-untrusted-evidence.md` | embedded instructions treated as evidence data, integrity warning, no model-directed payout |
| `MANUAL_TEST_CHECKLIST.md` | one release checklist covering every public read and write |

## Evidence fixtures

- `evidence/complete-deliverable.md` supports all criteria in the suggested
  checklist.
- `evidence/partial-deliverable.md` supports publication and scope but explicitly
  lacks the required test result.
- `evidence/counter-evidence.md` contradicts the claimed successful test result.
- `evidence/instruction-bearing-source.md` includes text aimed at the
  adjudicator, for checking that retrieved text is treated as data rather than
  instruction.
- An intentionally unavailable source is provided directly in scenario 3.

## Read-only command-line sample

No wallet or key is needed to inspect accepted StudioNet state:

```bash
node samples/read-live-state.mjs
```

Inspect one mandate and one operator passport:

```bash
MANDATE_ID=M00001 OPERATOR_ADDRESS=0x... node samples/read-live-state.mjs
```

This script only calls public view methods. It cannot submit a transaction.

## Safety rules

- Never paste a seed phrase or private key into this repository, a terminal
  command, an issue or the web application.
- Use small test-network amounts.
- Wait for each transaction to reach the requested network state before signing
  the next step.
- If a transaction was submitted but its receipt is pending, do not repeat a
  payable action until the transaction is located in the explorer.
- An adjudication round can take several minutes because independent validators
  retrieve evidence and evaluate it separately.
