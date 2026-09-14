# Scenario 3 — unavailable evidence and custody recovery

## Goal

Prove that an unavailable source never passes, an inconclusive record does not
invent a payout, and the manual-review recovery path returns custody safely.

## Suggested mandate

- **Title:** Verify an externally published status report
- **Agreement:** Confirm that a public status report exists and describes the
  completed work.
- **Payment:** 50 GEN
- **Performance bond:** 1 GEN
- **Contest bond:** 0 GEN
- **Execution window:** 20 protocol steps
- **Review window:** 10 protocol steps
- **Evidence rules:** The report must be retrievable over public HTTPS.

Acceptance checklist:

1. **The status report is publicly retrievable** — Evidence based, weight 60,
   non-negotiable.
2. **The report describes completed work** — Judgment, weight 40.

Keep the default inconclusive policy: hold for human review.

## Intentionally unavailable source

Use this reserved, non-resolving address for both evidence receipts and the
deliverable:

```text
https://attestra-evidence-does-not-exist.invalid/report
```

The `.invalid` top-level domain is reserved and cannot resolve on the public
internet.

## Steps

1. Create and fund the mandate with the client wallet.
2. Accept it with the operator wallet and post the performance bond.
3. File the unavailable source against both criteria.
4. Submit the same source as the deliverable.
5. Switch to the client wallet and contest both criteria, stating that no public
   report can be retrieved.
6. Seal the record.
7. Run adjudication and wait for validator consensus.
8. Confirm that the unavailable source does not produce a met result. The
   intended result for both criteria is **Inconclusive**, with score zero.
9. Advance the protocol clock three times, then finalize the ruling.
10. Try normal settlement. The contract should refuse it because the selected
    policy requires human review.
11. Use **Recover custody**.

## Expected result

- Final stage: **Returned**.
- Payment: returned to the client.
- Performance bond: returned to the operator.
- Contest bond: returned to the client if one was used.
- Custody held: zero.
- No guessed proportional payout is created.

## What this demonstrates

An inconclusive ruling is a real statement about the quality of the record. It is
not a failed transaction and not permission to guess what the work might have
been worth.
