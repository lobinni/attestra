# Scenario 5 — one bounded appeal

## Goal

Verify that a mandate can receive one additional validator round, both rulings
remain visible, the evidence set does not change, and a repeated appeal is
impossible.

## Setup

Use the same mandate and evidence preparation as
`02-contested-adjudication.md`. Complete these stages:

1. Create and fund.
2. Accept.
3. File operator evidence and client counter evidence.
4. Submit the deliverable.
5. Open and answer the contest.
6. Seal the record.
7. Run the first adjudication.

## Appeal steps

1. While the first appeal window is still open, enter written grounds explaining
   which criterion determination you believe should be reconsidered.
2. Select **Open appeal**.
3. Confirm the stage changes to **Appealed**.
4. Confirm the evidence form remains unavailable. An appeal cannot add a better
   document or remove a bad one; it judges the same sealed record.
5. Run adjudication again.
6. Confirm the ruling history now shows round one and round two separately.
7. Confirm the appeal form no longer appears. The contract allows only one
   appeal.
8. Advance the protocol clock three times, then finalize the second ruling.
9. Settle according to the second ruling.

## Expected result

- `appeal_count` is one in the contract state, though the website displays this
  as a completed appeal rather than a raw field name.
- Two append-only rulings are visible.
- The final ruling reference points to round two.
- Settlement reads only the pinned final ruling.
- No third adjudication can be requested through another appeal.

## Important interpretation

The appeal is not expected to produce a different result merely because a party
dislikes the first one. Independent validators receive the same agreement and
same evidence. The feature protects against one anomalous round; it is not a way
to rerun consensus until a preferred answer appears.
