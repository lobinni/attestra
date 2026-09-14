# Development

## Requirements

- Node.js 20 or newer.
- npm.
- MetaMask for write actions.
- Python 3.12 for contract lint and direct GenVM tests.

PostgreSQL is not used. The application must build and run without
`DATABASE_URL`.

## Application setup

```bash
npm install
npm run dev
```

No environment file is required. The canonical network and deployment are read
from `deployments/studionet.json` through `src/lib/config.ts`.

Optional public overrides:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_EXPLORER_URL=https://explorer-studio.genlayer.com
```

These values are public configuration. Never add a private key to the web
application. MetaMask signs every write in the browser.

## Section visibility flags

`src/lib/features.ts` resolves which sections are shown. Each flag maps to one
public variable such as `NEXT_PUBLIC_SHOW_SAMPLES` or `NEXT_PUBLIC_SHOW_CONTRACT`.
The Contract page is disabled by default.

Rules the implementation follows:

- Flags are referenced literally so Next.js can inline them at build time.
- A disabled section is removed from the header and footer navigation.
- A disabled route calls `notFound()`, so a direct URL cannot open it.
- Sections that link into a disabled section hide those links instead of
  rendering a dead link.
- Changing a flag requires a rebuild, because public variables are inlined.

## Live frontend architecture

The user interface has one data authority: the deployed contract on StudioNet
chain 61999.

- `src/lib/config.ts` imports the SDK StudioNet chain and resolves the canonical
  contract address.
- `src/lib/attestra.ts` maps all 10 reads and 18 writes to `genlayer-js`.
- `src/lib/useAttestra.ts` creates a client around the selected MetaMask provider
  and offers live-read refreshes.
- `src/components/WalletProvider.tsx` connects MetaMask and switches or adds
  chain 61999.
- Live pages call the contract directly. They do not call an application write
  API and do not patch optimistic state.
- After a transaction reaches the requested consensus status, the relevant view
  methods are read again from accepted state.
- `/api/health` performs a public chain/version check for Vercel. It does not
  store data and has no signing account.

## Transaction safety

A GenLayer transaction can be accepted by the network while contract execution
rolled back. `src/lib/attestra.ts` inspects leader receipts for rollback payloads
before reporting success.

A submitted transaction whose receipt cannot be read is represented as pending,
not failed. The transaction hash remains visible so the user does not
accidentally sign a duplicate value-bearing action.

Actions that release value or depend on adjudication wait for finality. All other
writes wait for accepted state, then re-read the contract.

## Contract workflow

Use Python 3.12 and the pinned versions in `requirements.txt`:

```bash
pip install -r requirements.txt
python scripts/fetch_genvm_bundle.py
PYTHONUTF8=1 genvm-lint check contracts/attestra.py
PYTHONUTF8=1 gltest tests/direct -q
```

The runner bootstrap is idempotent. The expected result is:

- Lint and validation pass.
- Contract schema contains 28 methods: 10 reads and 18 writes.
- All 43 direct tests pass.

Direct mode deploys the contract in a real GenVM runner. It catches storage
runtime errors that syntax checks and deploy-only checks cannot catch. In
particular, persistent arrays/maps are VM-managed and must be materialized with
`get_or_insert_default`; contract code must never instantiate `DynArray[...]()`
or `TreeMap[...]()` directly.

## Public live checks

No wallet is needed:

```bash
node scripts/check_live_deployment.mjs
curl http://localhost:3000/api/health
```

The deployment script verifies chain ID, on-chain source equivalence, ABI method
counts and `get_protocol_info`. The health endpoint checks chain ID and protocol
version.

## Real validator integration suite

The integration suite deploys a disposable StudioNet contract and therefore
needs two funded accounts. Keep keys in a private local environment and add the
account block described in `gltest.config.yaml`.

```bash
gltest tests/integration -v -s --network studionet
```

Use `ATTESTRA_SKIP_PANEL=1` to run only fast live checks. Never add keys to a
committed configuration file.

## Everyday validation

Application:

```bash
npm run lint
npx next typegen
npm exec tsc -- --noEmit --pretty false
npm run build
```

Contract and deployment:

```bash
PYTHONUTF8=1 genvm-lint check contracts/attestra.py
PYTHONUTF8=1 gltest tests/direct -q
node scripts/check_live_deployment.mjs
```
