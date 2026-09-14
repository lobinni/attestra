# Deployment

## Canonical StudioNet contract

- Address: `0xbF2a9b0cC3eF529bFFF1873e7FCEB6CecfbdD1BC`
- Explorer: https://explorer-studio.genlayer.com/address/0xbF2a9b0cC3eF529bFFF1873e7FCEB6CecfbdD1BC
- Chain: 61999 (`0xf22f`)
- RPC: `https://studio.genlayer.com/api`
- Version: `Attestra-1.0.0`
- Source: `contracts/attestra.py`, exactly 2,293 lines
- Normalized SHA-256: `ff23befdc6db88f8ceeeb4ced0cdc8601263d5f5e3428e28dc6606deb06d6a9d`

## Verification performed

The deployment was checked through public StudioNet RPC methods:

1. `eth_chainId` returned `0xf22f` (61999).
2. `gen_getContractCode` returned the deployed source as base64.
3. After transport normalization, the on-chain source matched
   `contracts/attestra.py` exactly.
4. `gen_getContractSchema` returned 28 public methods: 10 reads and 18 writes.
5. `get_protocol_info` returned `Attestra-1.0.0` from accepted state.

Re-run every check without a wallet or key:

```bash
node scripts/check_live_deployment.mjs
```

## Deploying a replacement contract

1. Validate the exact source:

   ```bash
   PYTHONUTF8=1 genvm-lint check contracts/attestra.py
   PYTHONUTF8=1 gltest tests/direct -q
   ```

2. Open Studio Run & Debug and paste the complete contents of
   `contracts/attestra.py`. The `Depends` declaration must remain the first line.
   Do not include Markdown fences.
3. Deploy from a funded StudioNet account.
4. Query the new address with `gen_getContractCode` and run
   `scripts/verify_deployment.py` against the decoded source.
5. Update `deployments/studionet.json` with the address, explorer URL, owner,
   source hash, sizes, method counts and verification date.
6. Run `node scripts/check_live_deployment.mjs`.
7. Rebuild and redeploy the web application.

### Studio compatibility notes

The current deployable source is 90,499 bytes, below 100 KiB with headroom.
Persistent GenVM collections are VM-managed: use
`parent_map.get_or_insert_default(key)` rather than constructing
`DynArray[...]()` or `TreeMap[...]()` inside contract code.

A successful deployment alone is not sufficient. The 43 direct tests exercise
evidence arrays, nested ruling maps, escrow accounting, adjudication,
finalization and settlement in the GenVM runner.

## Contract address replacement

The web application resolves the address in one place:

1. `NEXT_PUBLIC_CONTRACT_ADDRESS`, if set.
2. `deployments/studionet.json`, otherwise.

No component, route or API contains another address. There is no database or
runtime address editor.

For a replacement on Vercel:

```bash
vercel env add NEXT_PUBLIC_CONTRACT_ADDRESS production
vercel --prod
```

Or update the deployment manifest, commit it and let Vercel rebuild.

## Vercel deployment without a database

The application uses no database and requires no server-side secret.

### Dashboard

1. Push the repository to GitHub.
2. In Vercel, choose **Add New Project** and import the repository.
3. Keep **Framework Preset** as Next.js.
4. Keep **Root Directory** as the repository root.
5. Use `npm run build` for the build command.
6. Do not provision a database and do not add `DATABASE_URL`.
7. Environment variables may remain empty because the canonical deployment is
   committed.
8. Deploy and open `/api/health`.

A healthy response includes:

- `ok: true`
- `chainId: 61999`
- the canonical contract address
- `version: Attestra-1.0.0`
- `sourceVerified: true`

The overview page includes prepared sample mandates for manual testing. These
templates prefill a creation form only: every actual mandate is still created by
MetaMask signing and written directly to StudioNet. There is no pre-created or
simulated sample state.

### Controlling which sections are published

Section visibility is environment driven, so a deployment can publish only the
pages it wants:

```bash
vercel env add NEXT_PUBLIC_SHOW_SAMPLES production
vercel env add NEXT_PUBLIC_SHOW_CONTRACT production
vercel --prod
```

The Contract proof page is disabled by default. Set `NEXT_PUBLIC_SHOW_CONTRACT`
to `true` only when the deployment should publish it. Because these are public
build-time values, a change applies on the next build.

### CLI

```bash
npm install -g vercel
vercel login
vercel
vercel --prod
```

## GitHub publication

New repository:

```bash
git init
git add .
git commit -m "Release Attestra on StudioNet"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Existing repository:

```bash
git add .
git commit -m "Connect the application to the verified StudioNet contract"
git push origin main
```

The committed environment template contains public chain information only.
Never commit funded-account keys, a seed phrase or a wallet password.
