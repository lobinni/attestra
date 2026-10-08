# Attestra

**Evidence-backed verification and settlement for delegated work.**

Attestra holds payment until the record supports the work. Independent
validators retrieve sealed evidence and return one result per acceptance
criterion. The contract—not a model, server or database—sums the frozen weights,
selects the settlement policy and releases custody.

The web application is a direct StudioNet client. Reads use `genlayer-js`, writes
are signed by MetaMask, and accepted state is re-read after every transaction.
There is no PostgreSQL database, application escrow, seed dataset, server signer
or simulator fallback.

## Last update

**`Attestra-1.2.0` — deployed and byte-verified on StudioNet on 2026-10-08.**

This is the canonical immutable-deadline revision. The deployed source matches
`contracts/attestra.py` exactly, the ABI exposes 28 public methods with no
clock-like action, and `get_protocol_info` returns `Attestra-1.2.0` from accepted
state.

### Contract changes

- **New method `claim_unreviewed_delivery`** (18 writes total). Once the agreed
  review window has elapsed with no approval and no contest, only the operator
  can close the delivery and settle on the frozen terms. A silent client can no
  longer strand custody in DELIVERED. `open_contest` is now refused after the
  review window closes.
- **Deadline clocks were removed entirely.** Execution, review and appeal
  deadlines are consensus-approved UTC millisecond timestamps recorded by the
  contract. There is no `tick()`, `advance_clock()`, wait, sleep or rate-limit
  method, so repeated calls cannot manufacture a deadline. Elapsed time can only
  arrive because later consensus messages carry a later transaction datetime.
- **Manual-review recovery no longer bypasses the appeal window.**
  `recover_escrow` now accepts only LAPSED mandates and FINALIZED rulings; a
  ruling that is still appealable, or an appeal in progress, keeps custody
  locked.
- **Evidence is bound to the sealed record.** `submit_evidence` now requires a
  sha256 `content_commitment` of the source text (the old
  `claimed_content_hash` claim was removed). Validators re-hash retrieved
  content during adjudication and appeal — a document that changed after
  sealing is labelled `CONTENT_MISMATCH`, carries no text into the prompt, and
  cannot support PASS.

### Application changes

- Contract client exposes `claimUnreviewedDelivery` and the new
  `content_commitment` field; the workspace adds **Close unreviewed delivery**,
  a content fingerprint field with **Compute from source**, and no clock control
  of any kind.
- Section visibility flags (`NEXT_PUBLIC_SHOW_*`) control which pages are
  published; see `.env.example`. The Contract proof page is disabled by
  default and returns 404.
- `/api/health` validates against the canonical deployment and reports
  `sourceVerified: true`.
- All sample amounts use integer GEN (50 or 100, with 1 GEN bonds).

### Testing and verification

- **53 direct GenVM tests**, including
  `tests/direct/test_safety_paths.py` covering every fix above.
- Keyless acceptance check `npm run verify:safety` proves all four
  remediations against the deployed source and ABI; `npm run verify:live`
  independently verifies chain, source hash, schema and protocol revision.
- New manual scenario `samples/scenarios/07-unresponsive-client.md` plus a
  fingerprint step in every evidence-based sample.

## Live deployment

| Field | Value |
| --- | --- |
| Network | GenLayer StudioNet |
| Chain ID | **61999** (`0xf22f`) |
| RPC | `https://studio.genlayer.com/api` |
| Currency | GEN, 18 decimals |
| Contract | `0xF6E574e9d910D320551589986b9554510dE33626` |
| Explorer | https://explorer-studio.genlayer.com/address/0xF6E574e9d910D320551589986b9554510dE33626 |
| Revision | `Attestra-1.2.0` |
| Source | `contracts/attestra.py`, 2,379 lines |
| Source SHA-256 | `0c58100d635e34f3f7fff1f260a25e438df59c148e5aa3482037e20b6a7fe9db` |
| ABI | 28 public methods: 10 reads, 18 writes |

### Deployment proof

StudioNet exposes both contract source and schema. The repository ships a public,
keyless verification command:

```bash
node scripts/check_live_deployment.mjs
```

It checks chain 61999, downloads `gen_getContractCode`, normalizes transport line
endings, demands an exact source hash match, checks the 28-method schema, and
reads `get_protocol_info`. The canonical deployment passes every check.

Verify the requested safety remediations directly against the deployed source
and ABI:

```bash
npm run verify:safety
```

This checks operator closure after an unanswered review window, the complete
absence of caller-controlled clock methods, consensus timestamp deadlines,
finalization-gated recovery and sha256 evidence binding.

To verify an exported source file separately:

```bash
python scripts/verify_deployment.py onchain.py --source contracts/attestra.py
```

## Core guarantees

- **The acceptance checklist freezes at funding.** Criteria use integer weights
  that sum to 100. The title, agreement, checklist, evidence rules and policies
  are hashed. Every adjudication and settlement re-checks that hash.
- **The panel returns meaning, never money.** It returns PASS, FAIL or
  INCONCLUSIVE per criterion. The normalizer rebuilds a fixed structure, so an
  invented payout, percentage or recipient field is discarded.
- **The contract derives consequences.** Score is the contract's own sum of
  frozen weights. Settlement uses deposited custody, integer arithmetic and the
  policy selected before execution began.
- **Evidence remains a claim until retrieved.** Source hashes and independence
  are explicitly stored as claims. Unavailable evidence can never support PASS.
- **A failed panel round moves nothing.** No ruling is stored, custody remains in
  place, and the mandate returns to the state from which adjudication started.
- **Evidence is bound to the sealed record.** Every receipt carries a sha256
  commitment of its source text. Validators re-hash what they retrieve during
  adjudication and appeal, so a document edited after sealing is inadmissible
  and cannot support a met criterion.
- **Deadlines belong to one mandate.** Each mandate carries its own step
  counter and every window is measured on it, so no other account and no other
  mandate can accelerate it. Only the two parties may advance it.
- **A silent client cannot strand custody.** Once the agreed review window has
  elapsed with no approval and no contest, the operator can close the delivery
  and settle on the frozen terms.
- **Recovery cannot skip the appeal window.** Manual-review custody is
  returnable only after the ruling is finalized, never while it is still
  appealable.
- **Value leaves through one helper.** Recipients come from contract storage.
  No public method accepts an arbitrary recipient and amount.
- **Bonds return to their posters.** Ordinary underperformance is not misconduct,
  and a good-faith contest is not punished.

## Mandate lifecycle

```text
DRAFT --fund--> ESCROWED --accept--> ENGAGED --deliver--> DELIVERED
  |                 |                   |                    |
  +--cancel-------->+                   +--lapse------------>LAPSED
                                                             |
                    +----------- approve --------------------+--> APPROVED
                    |                                              |
                    +----------- contest --> CONTESTED             |
                                              |                    |
                                           seal record             |
                                              |                    |
                                         RECORD_SEALED             |
                                              |                    |
                                           adjudicate              |
                                              |                    |
                                            RULING                 |
                                      appeal /       \ finalize     |
                                          /           \            |
                                     APPEALED       FINALIZED       |
                                          |              |          |
                                     adjudicate         settle <----+
                                          |              |
                                        RULING         SETTLED
```

A ruling is not spendable immediately. It becomes payable only after the appeal
window closes and `finalize_ruling` pins the exact ruling used for settlement.

## Outcomes

| Ruling | Meaning | Default settlement |
| --- | --- | --- |
| CONFIRMED | Every criterion passed | RELEASE_FULL |
| PARTIAL | Some criteria passed | PRORATA by contract-derived score |
| REJECTED | The work missed the agreement | RETURN to the client |
| INCONCLUSIVE | The record cannot decide | MANUAL_REVIEW; custody remains held |

A failed non-negotiable criterion can route the whole mandate through the
rejected policy even when other weighted criteria passed.

## Public contract surface

### Writes

| Method | Caller | Value | Purpose |
| --- | --- | --- | --- |
| `create_mandate` | client | no | Record operator, checklist, price and policies |
| `update_draft` | client | no | Amend an unfunded draft |
| `fund_mandate` | client | exact payment | Open custody and lock terms |
| `accept_mandate` | operator | exact bond | Accept work and post the performance bond |
| `submit_evidence` | either party | no | Bind a public source to a criterion |
| `submit_deliverable` | operator | no | Close execution and open review |
| `approve_work` | client | no | Accept without adjudication |
| `claim_unreviewed_delivery` | operator | no | Close a delivery the client never reviewed, after the review window |
| `open_contest` | client | exact bond | Name failed criteria and open a contest |
| `respond_to_contest` | operator | no | File an explanation and counter references |
| `seal_record` | either party | no | Freeze and hash admissible evidence |
| `adjudicate` | either party or keeper | no | Run independent retrieval and validator consensus |
| `appeal` | either party | no | Open the single bounded appeal |
| `finalize_ruling` | either party or keeper | no | Pin a ruling after the appeal window |
| `settle` | either party or keeper | no | Compute and release custody |
| `cancel_mandate` | client | no | Cancel before operator engagement |
| `lapse_mandate` | either party or keeper | no | Mark a missed execution deadline |
| `recover_escrow` | either party or keeper | no | Return custody where normal settlement is unavailable |

### Reads

`get_protocol_info` · `list_mandates` · `get_mandate` · `get_criteria` ·
`get_evidence` · `get_contest` · `list_rulings` · `get_ruling` ·
`get_settlement` · `get_passport`

## Web architecture

```text
MetaMask (chain 61999)
       |
       | user-signed write
       v
Next.js client UI ---- genlayer-js ---- StudioNet RPC
       |                                      |
       | public read                          v
       +---------------------------- deployed Attestra contract
```

- `src/lib/config.ts` is the one network/address configuration point.
- `src/lib/attestra.ts` is the typed 10-read/18-write contract wrapper.
- `src/lib/useAttestra.ts` re-reads accepted state after transactions.
- Client components render the registry, mandate lifecycle and operator
  passports directly from the contract.
- `/api/health` verifies the live chain and protocol version for hosting health
  checks; it stores nothing and signs nothing.
- No `DATABASE_URL` is read anywhere.

## Run locally

Requirements: Node.js 20+, npm, and MetaMask for write actions.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. No `.env` file is required because the verified
StudioNet deployment is committed in `deployments/studionet.json`.

Optional public overrides:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_EXPLORER_URL=https://explorer-studio.genlayer.com
```

## Section visibility

Website sections are controlled from the environment. A disabled section is
removed from the header and footer, and its route returns not found, so no dead
link remains.

| Variable | Section | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_SHOW_SAMPLES` | Sample mandates and the template picker | enabled |
| `NEXT_PUBLIC_SHOW_MANDATES` | Registry, creation and mandate workspace | enabled |
| `NEXT_PUBLIC_SHOW_OPERATORS` | Operator record page | enabled |
| `NEXT_PUBLIC_SHOW_PROTOCOL` | Protocol page | enabled |
| `NEXT_PUBLIC_SHOW_GUIDE` | Guide page | enabled |
| `NEXT_PUBLIC_SHOW_CONTRACT` | Contract proof page | **disabled** |
| `NEXT_PUBLIC_SHOW_LIVE_STATS` | Overview statistics block | enabled |
| `NEXT_PUBLIC_SHOW_OUTCOMES` | Overview outcome cards | enabled |

Accepted values are `true`, `1`, `on`, `yes` and `false`, `0`, `off`, `no`.
These are public build-time values, so a change takes effect on the next build
or redeploy.

Never place a private key, seed phrase or wallet password in an environment
variable. MetaMask signs in the browser.

## Contract validation

Use Python 3.12:

```bash
pip install -r requirements.txt
python scripts/fetch_genvm_bundle.py
PYTHONUTF8=1 genvm-lint check contracts/attestra.py
PYTHONUTF8=1 gltest tests/direct -q
```

Expected local result: GenVM validation reports 28 methods, then **53 tests
pass**. Direct mode uses the real GenVM runner with mocked external responses; it
is not used by the web application.

Public live deployment check:

```bash
node scripts/check_live_deployment.mjs
```

Funded-wallet, real-validator integration suite:

```bash
gltest tests/integration -v -s --network studionet
```

See `TESTING.md` for private account setup, scope and expected assertions.

## Live manual samples

The `samples/` directory contains six complete MetaMask walkthroughs for the
canonical StudioNet deployment:

- quick client approval and full settlement;
- contested work, sealed evidence, adjudication and proportional settlement;
- unavailable evidence, inconclusive ruling and custody recovery;
- cancellation and short-deadline lapse recovery;
- the single bounded appeal and second ruling;
- instructions embedded in evidence treated as untrusted data.

It also contains public evidence fixtures, a keyless script for all ten read
methods, and a release checklist covering all eighteen writes. Start with
`samples/README.md`. The web application mirrors the same templates on the
overview page; selecting one only prefills the creation form. Mandates are
created and advanced only by user-signed MetaMask transactions against the live
contract. Publish the evidence files through a public HTTPS address
before an adjudication so every validator can retrieve the same document.

## Deploy on Vercel without a database

No database, storage add-on or environment variable is required.

### Vercel dashboard

1. Import the GitHub repository.
2. Select the Next.js framework preset.
3. Keep the project root at the repository root.
4. Use `npm run build` as the build command.
5. Do not add `DATABASE_URL`.
6. Deploy.
7. Open `/api/health`; it should return `ok: true`, chain 61999 and
   the expected revision.

### Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
vercel --prod
```

If a later contract replaces the canonical deployment, set the public override:

```bash
vercel env add NEXT_PUBLIC_CONTRACT_ADDRESS production
vercel --prod
```

## Publish to GitHub

For a new repository:

```bash
git init
git add .
git commit -m "Release Attestra StudioNet application"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

For an existing repository that already has `origin`:

```bash
git add .
git commit -m "Connect Attestra to the verified StudioNet deployment"
git push origin main
```

Do not commit a file containing private keys. The committed `.env.example`
contains public network values only.

## Repository

```text
contracts/attestra.py              complete 2,379-line contract
scripts/check_live_deployment.mjs  public StudioNet verification
scripts/verify_deployment.py       exported-source byte comparison
scripts/fetch_genvm_bundle.py      pinned GenVM runner bootstrap
deployments/studionet.json         canonical deployment and proof metadata
tests/direct/                      43 GenVM runtime tests
tests/integration/                 real StudioNet validator-panel tests
samples/                           live MetaMask scenarios and evidence fixtures
src/app/                           Next.js routes and live health endpoint
src/components/                    wallet and live contract interface
src/lib/attestra.ts                typed contract client
src/lib/config.ts                  chain and deployment configuration
src/lib/useAttestra.ts             authoritative live-read hooks
docs/                              architecture and protocol notes
```

## Security and limitation

Attestra is a test-network deployment and has not been audited. A coordinated
malicious validator majority can agree on a false ruling; the bounded appeal can
contest one round but cannot defend against a captured panel. Do not escrow value
you are not prepared to lose. See `SECURITY.md` for the complete model.
