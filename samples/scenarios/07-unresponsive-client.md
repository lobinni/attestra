# Scenario 7 — an unresponsive client and protected deadlines

## Goal

Prove three safety properties on the live network:

1. An operator who delivered work is not stranded when the client disappears.
2. Nobody outside a mandate can accelerate its deadlines.
3. The appeal window cannot be skipped by recovering custody early.

## Part A — the client never reviews

Suggested mandate:

- **Title:** Publish a short availability report
- **Payment:** 50 GEN
- **Performance bond:** 1 GEN
- **Contest bond:** 0 GEN
- **Execution window:** 1 hour
- **Review window:** 1 minute
- One evidence-based criterion with weight 100: *The report is publicly
  retrievable.*

Steps:

1. Create and fund the mandate with the client wallet.
2. Accept it with the operator wallet.
3. File one evidence receipt with a content fingerprint, then submit the
   deliverable.
4. Stop acting as the client. Do not approve and do not contest.
5. Wait as the operator until the review deadline shown on the page has
   passed in real consensus time, then refresh the mandate.
6. Select **Close unreviewed delivery**.
7. Select **Settle custody**.

Expected:

- Before the deadline, closing is refused and the message names the review
  deadline and current consensus timestamp.
- Only the operator can close the delivery; the client and any other wallet are
  refused.
- After the deadline, the mandate moves to approved and settles on the frozen
  terms: the operator receives the payment and the performance bond returns.
- Custody reads zero.
- The client cannot contest after the review window has closed.

## Part B — deadlines belong to one mandate

1. Open a second mandate between the same two wallets with a short execution
   window.
2. Retry appreciable actions on the first mandate several times.
3. Reload the second mandate.

Expected:

- The second mandate's recorded deadlines are unchanged.
- Marking the second mandate lapsed is still refused, because its own execution
  window has not elapsed.
- A wallet that is not a party to a mandate cannot advance that mandate at all.

This is why the interface states that deadlines are fixed consensus UTC
   timestamps: every deadline is absolute once recorded, and no transaction can
   make it arrive sooner.

## Part C — recovery cannot skip the appeal window

Use the inconclusive setup from `03-inconclusive-recovery.md` and stop right
after the ruling appears.

1. With the mandate showing a ruling, try **Recover custody**.
2. Advance the mandate past the appeal deadline.
3. Select **Finalize ruling**, then **Recover custody**.

Expected:

- Recovery is refused while the ruling is still appealable, and custody stays
  held.
- Opening an appeal also blocks recovery until that round resolves.
- After finalization, recovery returns the payment to the client and the bond to
  the operator, and custody reads zero.
