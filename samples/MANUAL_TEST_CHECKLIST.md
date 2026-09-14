# Live manual test checklist

Use this checklist for a release candidate connected to the canonical StudioNet
contract. Record transaction references privately or in your test report; the web
interface intentionally does not display raw technical strings.

## Environment proof

- [ ] The Contract page reports **Live**.
- [ ] The network is GenLayer StudioNet, chain 61999.
- [ ] The public explorer opens the canonical deployment.
- [ ] `node scripts/check_live_deployment.mjs` passes chain, source, schema and
      protocol checks.
- [ ] The application starts and builds with no `.env` file and no database.

## Wallet behavior

- [ ] Reading pages works without MetaMask connected.
- [ ] Connect opens MetaMask, not a server-side signer.
- [ ] A wallet on another chain is asked to switch to StudioNet.
- [ ] StudioNet can be added when MetaMask does not already know it.
- [ ] A non-party wallet can read a mandate but cannot see party-only actions.
- [ ] Rejecting a MetaMask request is shown as a declined signature, not a
      contract failure.

## Write methods

### Agreement and custody

- [ ] **Create mandate** records the operator, title, agreement, weighted
      checklist, prices, bonds, policies and protocol windows.
- [ ] **Update draft** changes title/agreement/evidence rules before funding.
- [ ] **Fund mandate** accepts the exact payment, locks terms and opens custody.
- [ ] A wrong payment value is refused without changing the stage.
- [ ] **Cancel mandate** works before operator engagement and returns deposited
      payment.
- [ ] Cancellation is unavailable after operator engagement.

### Execution and evidence

- [ ] **Accept mandate** is available only to the named operator and requires the
      exact performance bond.
- [ ] **Submit evidence** creates one receipt bound to the selected criterion.
- [ ] A non-public source address is refused.
- [ ] **Submit deliverable** closes execution and opens client review.
- [ ] **Approve work** is available only to the client.
- [ ] Approved work can be settled without a validator round.

### Contest and consensus

- [ ] **Open contest** requires at least one named criterion and the exact contest
      bond.
- [ ] **Respond to contest** records the operator explanation.
- [ ] **Seal record** marks all admissible receipts sealed and disables later
      evidence submissions.
- [ ] **Adjudicate** runs the validator panel against the sealed record.
- [ ] The ruling stores one result per criterion.
- [ ] The displayed score equals the sum of weights marked as met.
- [ ] The panel explanation does not state or control a payout.
- [ ] An unreachable source is never marked as met.
- [ ] The instruction-bearing evidence fixture is treated as untrusted data.

### Appeal and settlement

- [ ] **Appeal** is available once, during the first appeal window.
- [ ] Appealing does not reopen evidence submission.
- [ ] A second adjudication appends a new ruling without deleting the first.
- [ ] A second appeal is unavailable.
- [ ] **Tick** advances the deterministic protocol clock.
- [ ] **Finalize ruling** is refused until the appeal window has elapsed.
- [ ] Finalization pins the ruling used by settlement.
- [ ] **Settle** applies full, proportional or return policy from frozen terms.
- [ ] Operator and contest bonds return to their original posters.
- [ ] Custody reaches zero before the final stage is reported.
- [ ] A second settlement is impossible.

### Expiry and recovery

- [ ] **Lapse mandate** is refused while the execution window remains open.
- [ ] Lapse succeeds after the configured execution deadline with no delivery.
- [ ] **Recover escrow** returns payment and bonds on a lapsed mandate.
- [ ] A finalized inconclusive mandate cannot settle normally under human review.
- [ ] Recovery returns custody for that inconclusive mandate without guessing a
      payout.

## Read methods

Use `node samples/read-live-state.mjs` plus optional inputs to check:

- [ ] Protocol information.
- [ ] Paged mandate registry.
- [ ] One complete mandate.
- [ ] Acceptance criteria.
- [ ] Evidence receipts.
- [ ] Contest record.
- [ ] Ruling history.
- [ ] One ruling by identifier.
- [ ] Settlement record.
- [ ] Operator passport.

## Final release checks

- [ ] `PYTHONUTF8=1 genvm-lint check contracts/attestra.py` passes.
- [ ] `PYTHONUTF8=1 gltest tests/direct -q` reports 43 passed.
- [ ] `npm run verify:live` passes.
- [ ] `npm run lint` passes.
- [ ] `npx next typegen` passes.
- [ ] `npm exec tsc -- --noEmit --pretty false` passes.
- [ ] `npm run build` passes without a database variable.
- [ ] `/api/health` returns a healthy live contract response.
