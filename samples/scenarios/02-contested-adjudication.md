# Scenario 2 — contested work and validator adjudication

## Goal

Exercise the evidence seal, independent validator panel, contract-derived score,
appeal window and proportional settlement.

## Suggested mandate

- **Title:** Verify a public release report
- **Agreement:** Publish a release report describing the package scope and the
  result of the required verification run.
- **Payment:** 100 GEN
- **Performance bond:** 0 GEN
- **Contest bond:** 1 GEN
- **Execution window:** 20 protocol steps
- **Review window:** 10 protocol steps
- **Evidence rules:** Evidence must be public, stable and readable without a
  login.

Acceptance checklist:

1. **The report is publicly retrievable** — Evidence based, weight 30,
   non-negotiable.
2. **The report describes the package scope** — Judgment, weight 30.
3. **The required verification run completed successfully** — Evidence based,
   weight 40.

Settlement rules:

- Every criterion met: release in full.
- Some criteria met: split by score.
- Work rejected: return to client.
- Record cannot decide: hold for human review.
- Non-negotiable criterion failure: reject the mandate.

## Steps

1. Create and fund the mandate with the client wallet.
2. Accept it with the operator wallet.
3. As the operator, file the public URL for
   `samples/evidence/partial-deliverable.md` against all three criteria.
4. Submit that document as the deliverable.
5. Switch to the client wallet.
6. File `samples/evidence/counter-evidence.md` against criterion 3 with the role
   **Counter evidence**.
7. Open a contest and select criterion 3. State that the required verification
   run did not complete successfully.
8. Switch to the operator wallet and file a response acknowledging the partial
   result or explaining why the operator believes it satisfies the criterion.
9. Either party seals the record. Confirm that every existing evidence receipt
   is marked **Sealed** and that the evidence form disappears.
10. Run adjudication. Keep the page open while independent validators retrieve
    the documents and reach consensus. This may take several minutes.
11. Read the ruling. Confirm that each criterion has a human-readable result and
    that the score equals the sum of the weights marked as met.
12. Do not appeal in this scenario. Advance the protocol clock three times, then
    finalize the ruling. Finalization itself advances one additional step and
    therefore occurs after the appeal deadline.
13. Settle custody.

## Expected result

The fixtures are designed to support criteria 1 and 2 while contradicting
criterion 3. A typical ruling is therefore partially met with a score of 60.
Model judgment may vary, so rely on the recorded criterion outcomes and verify
the arithmetic independently.

If the final score is 60 and the partial policy applies:

- Operator payment: 60 percent of 100 GEN.
- Client payment: the remainder plus the returned contest bond.
- Operator bond: zero in this scenario.
- Custody after settlement: zero.

## What this demonstrates

The validator panel never states these payout amounts. It states the result of
each criterion. The contract sums frozen weights and computes the split from
actual custody.

## Negative checks

- Try filing evidence after sealing: the form is absent and the contract would
  reject the transition.
- Try settling immediately after the ruling: settlement is unavailable because
  the ruling is not finalized.
- Try finalizing before the appeal window closes: the contract refuses it.
