# Deployments

This directory is the canonical registry of contracts used by the application.
Each network file records the address, chain, source digest, runner, public ABI
counts and verification evidence.

## StudioNet

| Field | Value |
| --- | --- |
| Network | GenLayer StudioNet |
| Chain | 61999 |
| Contract | `0xbF2a9b0cC3eF529bFFF1873e7FCEB6CecfbdD1BC` |
| Status | deployed and byte-verified |
| Source | `contracts/attestra.py` |
| Lines | 2,293 |
| Public ABI | 10 reads, 18 writes |

The explorer record is available at:

https://explorer-studio.genlayer.com/address/0xbF2a9b0cC3eF529bFFF1873e7FCEB6CecfbdD1BC

## Address resolution

The application uses one deterministic resolution order:

1. `NEXT_PUBLIC_CONTRACT_ADDRESS`, when set at build time.
2. `contract.address` in `deployments/studionet.json`.

There is no database override, browser local-storage override or fallback to a
simulator. To replace the deployment, update the manifest or set the Vercel
public environment variable and rebuild.

## Verify the deployment

The keyless verifier checks the network, source, schema and live protocol view:

```bash
node scripts/check_live_deployment.mjs
```

The source check downloads `gen_getContractCode`, decodes the base64 transport,
normalizes CRLF/BOM/banner/trailing blank-line artifacts and compares SHA-256
digests. A match includes comments and docstrings; only transport artifacts are
ignored.

To check a source file exported by another tool:

```bash
python scripts/verify_deployment.py onchain.py --source contracts/attestra.py
```

## Replacing the contract

1. Deploy `contracts/attestra.py` on StudioNet.
2. Run the source verifier against the new address.
3. Confirm `get_protocol_info` returns `Attestra-1.0.0` and the schema contains
   28 public methods.
4. Update `studionet.json`, including address, explorer URL, owner, source hash,
   byte counts and verification date.
5. Re-run contract lint, direct tests, live deployment verification, TypeScript
   checks and the production build.
6. Deploy the web application again.
