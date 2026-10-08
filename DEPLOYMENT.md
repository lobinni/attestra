# Deployment

## Canonical StudioNet contract

- Address: `0xF6E574e9d910D320551589986b9554510dE33626`
- Explorer: https://explorer-studio.genlayer.com/address/0xF6E574e9d910D320551589986b9554510dE33626
- Chain: 61999 (`0xf22f`)
- RPC: `https://studio.genlayer.com/api`
- Revision: `Attestra-1.2.0`
- Source: `contracts/attestra.py`, 2,379 lines
- Normalized SHA-256: `0c58100d635e34f3f7fff1f260a25e438df59c148e5aa3482037e20b6a7fe9db`
- Public ABI: 28 methods — 10 reads and 18 writes

## Verification performed

The deployment was checked through public StudioNet RPC methods:

1. `eth_chainId` returned `0xf22f` (61999).
2. `gen_getContractCode` returned the deployed source as base64.
3. After transport normalization, the on-chain source matched
   `contracts/attestra.py` exactly.
4. `gen_getContractSchema` returned 28 public methods: 10 reads and 18 writes.
5. `get_protocol_info` returned `Attestra-1.2.0` from accepted state.
6. The schema contains no method whose name includes tick, advance, wait or
   sleep.
7. The verified source reads consensus transaction datetime and stores absolute
   execution, review and appeal timestamps.
8. The same source includes operator-only unreviewed delivery closure,
   finalization-gated recovery, and sha256 evidence commitments.

Run every public check without a wallet or private key:

```bash
npm run verify:live
npm run verify:safety
```

Both commands must report PASS for every check.

## Deadline-safety guarantee

Execution, review and appeal deadlines are immutable UTC millisecond timestamps
recorded from `gl.message_raw["datetime"]`, which is injected into the
consensus-approved transaction message.

There is no public clock-control method:

- no `tick`;
- no `advance_clock`;
- no wait/sleep action;
- no call counter or rate limiter that can stand in for elapsed time.

Repeated transactions by the client or operator therefore cannot manufacture a
review deadline or appeal expiry. A deadline can pass only when a later
consensus message carries a genuinely later transaction datetime.

## Other accepted safety requirements

### Unresponsive client

The client retains the complete review window. Once real consensus time passes
the fixed review deadline with no approval or contest, only the operator may
call `claim_unreviewed_delivery`, after which normal settlement is available.

### Appeal-window protection

Manual-review recovery accepts only a lapsed mandate or a finalized ruling. A
ruling that remains appealable, and an appeal in progress, both keep custody
locked.

### Evidence binding

Every evidence receipt requires a sha256 commitment of the source text. The
commitment is sealed in the evidence snapshot. Each validator hashes retrieved
text and includes content in the prompt only when it matches. Changed evidence
is labelled `CONTENT_MISMATCH` and cannot support PASS. Appeals read the same
sealed commitments.

## Deploying a later replacement

1. Validate locally:

   ```bash
   PYTHONUTF8=1 genvm-lint check contracts/attestra.py
   PYTHONUTF8=1 gltest tests/direct -q
   ```

2. Deploy the complete `contracts/attestra.py` on StudioNet.
3. Update `deployments/studionet.json` with the new address and source metadata.
4. Run `npm run verify:live` and `npm run verify:safety` until all checks pass.
5. Update the Vercel public address when using an environment override, then
   rebuild.

## Application configuration

Address resolution is deterministic:

1. `NEXT_PUBLIC_CONTRACT_ADDRESS`, when set at build time.
2. `deployments/studionet.json`, otherwise.

No database, local-storage address override or simulator fallback is used.

## Vercel deployment without a database

1. Push the repository to GitHub.
2. Import it as a Next.js project in Vercel.
3. Use the repository root and `npm run build`.
4. Do not provision a database or add `DATABASE_URL`.
5. Deploy and open `/api/health`.

A healthy response includes chain 61999, the canonical address,
`Attestra-1.2.0`, and `sourceVerified: true`.

## Section visibility

Public build-time flags in `.env.example` can hide individual sections. The
Contract proof page remains disabled by default.

## GitHub publication

```bash
git status
git add .
git commit -m "Use immutable consensus timestamps for Attestra deadlines"
git push origin main
```

For a new repository:

```bash
git init
git add .
git commit -m "Release Attestra 1.2.0 on StudioNet"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Never commit funded-account keys, a seed phrase or a wallet password.
