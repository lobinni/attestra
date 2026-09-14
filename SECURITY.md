# Security model

## Contract guarantees

### The panel cannot name a payout

The validator panel returns criterion-level results. The normalizer rebuilds the
answer into a fixed key set, so an invented amount, percentage or recipient does
not survive. Score is the contract's own sum over weights frozen at funding, and
settlement is integer arithmetic over actual deposited custody.

### The agreement locks before execution

Funding hashes the title, description, criteria, evidence rules, prices, bonds
and settlement policies. Every adjudication and settlement re-derives that hash
and refuses to proceed if stored terms differ.

### The evidence record seals before adjudication

Sealing marks the admissible receipts and stores their canonical snapshot hash.
Nothing filed after sealing can enter the adjudication record.

### Custody accounting is closed

Payouts must sum to custody exactly. The terminal state is persisted and the
held amount reaches zero before value transfer. Value leaves through one private
helper, from three controlled paths, with recipients read from storage.

### Failed rounds are non-destructive

If validator consensus does not commit a ruling, no ruling is stored and no
custody moves. The mandate returns to the state from which the round began and
can be retried.

## Evidence and model boundaries

- Retrieved text is data, never instruction. Instructions embedded in a source
  are flagged rather than followed.
- Only a successful web retrieval carries content into the prompt. A non-success
  response, empty document or fetch failure carries no evidence.
- Unavailable evidence supports INCONCLUSIVE and never PASS.
- `claimed_content_hash` is not compared with fetched bytes; its name makes clear
  that it is a submitter claim.
- `claimed_independence` is also a claim. Independence is a property of origin,
  not merely a different host name.
- The consensus fingerprint contains consequence-bearing outcomes, not free-form
  explanation fields that could split honest validators over wording.

## Bonds and conduct

Bonds return to whoever posted them. A client who contests and loses is not
punished, and an operator whose work is rejected is not automatically slashed.
Ordinary underperformance is not misconduct. Slashing would require explicit,
objective bad-faith criteria that this protocol does not claim to implement.

## Web application security

### No private key in the application

The application never requests, stores or logs a seed phrase, private key or
wallet password. MetaMask performs signing through its EIP-1193 provider. The web
application receives only the connected public address and transaction results.

### Exact network and deployment

The client imports the StudioNet chain from `genlayer-js`, asserts chain 61999
and uses the byte-verified contract address recorded in
`deployments/studionet.json`. A Vercel public environment variable may replace
the address at build time. There is no runtime database override, local-storage
switch or alternate-network fallback.

### Receipt status is not execution success

A transaction may reach an accepted status while contract execution rolled back.
The client inspects leader receipts for rollback payloads and displays the
contract reason instead of reporting success.

If a transaction hash exists but receipt polling fails, the interface reports it
as pending and preserves the hash. It does not call the transaction failed,
because repeating an uncertain payable action could deposit twice.

### Authoritative refresh

The interface does not optimistically edit lifecycle state. After a transaction
reaches the requested consensus stage, it re-runs the contract view methods
against accepted StudioNet state.

### Stateless hosting

The Next.js application has no database, application custody or server signer.
The health endpoint makes public read calls only. It has no credentials and no
write capability.

## Deployment verification

The canonical deployment is verified with `gen_getContractCode`,
`gen_getContractSchema` and `get_protocol_info`. Run:

```bash
node scripts/check_live_deployment.mjs
```

A release must stop if the on-chain source hash, ABI method counts, chain ID or
protocol version differs from the deployment manifest.

## Explicit limitations

- This is a StudioNet deployment and has not been audited.
- A coordinated malicious validator majority can agree on a false ruling. A
  bounded appeal can contest one round but cannot defeat a captured panel.
- External evidence can disappear or change after filing. Validators retrieve
  what is available during the adjudication round.
- The deterministic clock counts contract ticks, not wall-clock time.
- RPC outages can temporarily prevent reads or leave submitted transactions in
  an uncertain client state while the network continues processing them.
- Do not escrow value you are not prepared to lose.

## Reporting an issue

Provide the contract address, transaction hash, mandate ID, connected public
address, expected transition and actual leader receipt. Never send a seed phrase
or private key as part of a report.
