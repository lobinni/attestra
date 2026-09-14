# Scenario 1 — quick approval and full settlement

## Goal

Exercise the ordinary path where the client accepts the work without a validator
ruling. This is the least expensive complete lifecycle.

## Suggested mandate

Use the client MetaMask account to open a mandate with these terms:

- **Title:** Public release readiness report
- **Agreement:** Review the sample release package and publish a short report
  confirming that the deliverable, verification notes and release summary are
  present.
- **Payment:** 50 GEN
- **Performance bond:** 1 GEN
- **Contest bond:** 0 GEN
- **Execution window:** 12 protocol steps
- **Review window:** 6 protocol steps
- **Evidence rules:** Sources must be public HTTPS documents that require no
  login.

Acceptance checklist:

1. **Published deliverable is publicly retrievable** — Evidence based, weight
   40, non-negotiable. Verification method: retrieve the filed deliverable.
2. **The report describes the scope and completion result** — Judgment, weight
   35. Verification method: read the scope and conclusion sections.
3. **The report states a successful verification result** — Objective, weight
   25. Verification method: find the final verification summary.

Keep the default settlement rules.

## Steps

1. Connect the client account and create the mandate.
2. Before funding, open **Amend draft terms**. Add “Final” to the title and save.
   Refresh the page and confirm the revised title came from the contract.
3. Fund the mandate. Confirm that:
   - the stage changes to **Funded**;
   - custody equals the payment;
   - agreement integrity reads **Locked and fingerprinted**;
   - the draft amendment panel disappears.
4. Switch MetaMask to the operator account and reconnect if necessary.
5. Accept the work. MetaMask should request the exact performance bond. Confirm
   the stage changes to **In progress** and custody includes payment plus bond.
6. File the public URL of `samples/evidence/complete-deliverable.md` against each
   of the three criteria. Use **Deliverable** for the first receipt and
   **Supporting** for the other two.
7. Submit the same public URL as the deliverable.
8. Switch back to the client account.
9. Approve the work without opening a contest.
10. Settle custody.

## Expected result

- Final stage: **Settled**.
- Operator payout: the complete payment.
- Performance bond: returned to the operator.
- Client payout: zero.
- Custody held: zero.
- Operator record: one additional confirmed mandate, average score updated and
  verified value increased by the payment.

## Negative checks

- Try editing after funding: the edit panel is unavailable, and a direct call
  would be rejected by the contract.
- Try settling before approval: the action is not available.
- Try approving from the operator wallet: the action is not available because
  only the client may approve.
