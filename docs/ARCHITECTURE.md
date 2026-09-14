# Architecture

Attestra has two runtime layers: the intelligent contract and a direct web
client. StudioNet is the only application data authority.

## Contract layer

`contracts/attestra.py` contains the full protocol in one 2,293-line file:

1. Closed vocabularies and protocol bounds.
2. Flat persistent storage records.
3. Pure parsing, normalization, retrieval classification and fingerprinting
   helpers.
4. The `Attestra` contract with authorization guards, lifecycle writes,
   nondeterministic adjudication and public views.

The validator panel returns criterion results. Score, critical-failure override,
settlement policy and payout amounts are deterministic contract computations.

### Persistent storage

GenVM collections are VM-managed. Nested arrays and maps are materialized with
`get_or_insert_default`; the contract never constructs `DynArray[...]()` or
`TreeMap[...]()` itself. Evidence has one storage home, with separate owner and
position indexes, preventing duplicate records from drifting.

### Consensus boundary

The nondeterministic block closes over prompt text, source URLs, mandate ID and
criterion IDs—but never storage. Leader and validators independently retrieve
the same sources and run the same normalization.

The decision fingerprint includes only fields with consequences:

- mandate ID;
- overall ruling;
- ordered `(criterion ID, result)` pairs;
- inconclusive item IDs.

Reasoning, justifications, quality labels and integrity flags are stored for
inspection but excluded from consensus because none of them affects money.

## Web layer

```text
MetaMask
  |  EIP-1193 signing
  v
WalletProvider
  |
  v
AttestraClient (genlayer-js, StudioNet chain object)
  |
  +-- readContract -----------------------------------+
  |                                                   |
  +-- writeContract -> waitForTransactionReceipt -----+--> StudioNet 61999
                                                         Attestra deployment
```

### Configuration

`src/lib/config.ts` is the sole network/address resolution point. It imports the
StudioNet chain from `genlayer-js/chains`, asserts chain 61999 and selects:

1. `NEXT_PUBLIC_CONTRACT_ADDRESS`, if set at build time;
2. the verified address in `deployments/studionet.json` otherwise.

The RPC and explorer also have optional public overrides. There is no runtime
address database, local-storage override or alternate network fallback.

### Contract client

`src/lib/attestra.ts` contains typed structures for mandates, evidence,
contests, rulings, settlements and passports, plus one wrapper method for each
of the contract's 10 reads and 18 writes.

Writes follow one path:

1. Request a MetaMask signature through the selected EIP-1193 provider.
2. Submit `writeContract` to the deployed address.
3. Expose the transaction hash immediately.
4. Wait for ACCEPTED or FINALIZED status, depending on the action.
5. Inspect the leader receipt for contract rollback.
6. Re-read accepted contract state instead of applying an optimistic patch.

A missing receipt after submission is pending, not failed. This distinction
prevents accidental duplicate funding or bond transactions.

### Live read hooks

`src/lib/useAttestra.ts` creates the client around the connected wallet provider
and implements refreshable live reads. The home page, registry, mandate
workspace, deployment proof and operator passports all use these reads.

The canonical deployment currently has zero mandates. The interface displays a
truthful empty state and never injects example records.

### Health endpoint

`/api/health` is stateless. It checks:

- the RPC reports chain 61999;
- the configured contract answers `get_protocol_info`;
- the returned version is `Attestra-1.0.0`.

It has no wallet, key or database and is safe for Vercel health monitoring.

## Deployment verification

`scripts/check_live_deployment.mjs` adds source and ABI checks to the health
model. It downloads the source with `gen_getContractCode`, normalizes transport
artifacts, validates SHA-256, reads `gen_getContractSchema`, counts read/write
methods and calls `get_protocol_info` through GenLayerJS.
