# Scenario 4 — cancellation and missed deadline recovery

This document contains three short checks. Use small amounts and a fresh mandate
for each one.

## A. Cancel an unfunded draft

1. Create a mandate with any valid checklist and a payment of 50 GEN.
2. Do not fund it.
3. From the client wallet, select **Cancel**.

Expected:

- Final stage is **Cancelled**.
- No custody was ever held or transferred.
- The operator cannot accept a cancelled mandate.

## B. Cancel after funding but before engagement

1. Create a mandate with payment 50 GEN and no bonds.
2. Fund it with the client wallet.
3. Do not let the operator accept.
4. Select **Cancel** from the client wallet.

Expected:

- The exact deposited payment returns to the client.
- Final stage is **Cancelled**.
- Custody reads zero.
- A second cancellation is impossible because the mandate is terminal.

## C. Lapse an accepted mandate

Use these terms:

- **Payment:** 50 GEN
- **Performance bond:** 1 GEN
- **Contest bond:** 0 GEN
- **Execution window:** 1 minute
- **Review window:** 1 minute
- One criterion with weight 100.

Steps:

1. Create and fund the mandate with the client wallet.
2. Immediately accept it with the operator wallet and post the bond.
3. Do not submit evidence or a deliverable.
4. Wait for the configured execution window to pass. There is no clock
   control; only real consensus time may pass the execution deadline.
5. Select **Mark lapsed**.
6. Select **Recover custody**.

Expected:

- Final stage is **Returned**.
- Payment returns to the client.
- Performance bond returns to the operator.
- Custody reaches zero.
- No rejection is added to the operator passport because missing a deadline is
  recovered without a validator ruling.

## Timing note

The contract uses consensus-approved UTC timestamps. It has no clock-control
method. If the lapse action reports that the deadline is still open, wait for the
configured minute to pass, refresh the mandate and retry. The error message
states the recorded deadline and current consensus timestamp.
