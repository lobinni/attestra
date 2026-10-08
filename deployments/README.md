# Deployments

This directory is the canonical registry used by the application.

## StudioNet

| Field | Value |
| --- | --- |
| Network | GenLayer StudioNet |
| Chain | 61999 |
| Contract | `0xF6E574e9d910D320551589986b9554510dE33626` |
| Explorer | https://explorer-studio.genlayer.com/address/0xF6E574e9d910D320551589986b9554510dE33626 |
| Revision | `Attestra-1.2.0` |
| Status | deployed and byte-verified |
| Source | `contracts/attestra.py` |
| Lines | 2,379 |
| SHA-256 | `0c58100d635e34f3f7fff1f260a25e438df59c148e5aa3482037e20b6a7fe9db` |
| Public ABI | 10 reads, 18 writes |

## Deadline model

The deployed ABI contains no caller-controlled time mechanism. Execution,
review and appeal deadlines are absolute UTC millisecond timestamps sourced from
the consensus transaction datetime.

The deployment verifier checks source and ABI. The safety verifier additionally
rejects any clock-like public method and checks the timestamp guards:

```bash
npm run verify:live
npm run verify:safety
```

## Address resolution

The application uses `NEXT_PUBLIC_CONTRACT_ADDRESS` when set, otherwise the
address in `studionet.json`. There is no database override, local-storage
override or simulator fallback.
