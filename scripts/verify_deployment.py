#!/usr/bin/env python3
"""Prove that a deployed contract is byte-for-byte the source in this repo.

Usage:
    python scripts/verify_deployment.py onchain.py [--source contracts/attestra.py]

The on-chain listing produced by the CLI is not literally identical to the
file on disk even when the deployment is honest: the transport may add a
byte-order mark, a "Result:" banner, CRLF line endings, or trailing blank
lines. This script normalises exactly those four artefacts and nothing
else, then demands that the remainder match byte for byte - comments and
blank lines included.

Exit code 0 means the deployment matches. Anything else means it does not,
and the first differing line is printed so the disagreement is inspectable
rather than a bare boolean.
"""

import argparse
import hashlib
import sys
from pathlib import Path

BANNER_PREFIXES = ("Result:", "result:")


def normalise(text: str) -> str:
    if text.startswith("\ufeff"):
        text = text[1:]
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = text.split("\n")
    while lines and not lines[0].strip():
        lines.pop(0)
    if lines and lines[0].strip().startswith(BANNER_PREFIXES):
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    return "\n".join(lines) + "\n"


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def first_difference(left: str, right: str):
    left_lines = left.split("\n")
    right_lines = right.split("\n")
    for index in range(max(len(left_lines), len(right_lines))):
        a = left_lines[index] if index < len(left_lines) else "<missing>"
        b = right_lines[index] if index < len(right_lines) else "<missing>"
        if a != b:
            return index + 1, a, b
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify a deployment against source.")
    parser.add_argument("onchain", help="file containing the on-chain listing")
    parser.add_argument("--source", default="contracts/attestra.py")
    args = parser.parse_args()

    source_path = Path(args.source)
    onchain_path = Path(args.onchain)
    if not source_path.exists():
        print(f"source not found: {source_path}")
        return 2
    if not onchain_path.exists():
        print(f"on-chain listing not found: {onchain_path}")
        return 2

    source = normalise(source_path.read_text(encoding="utf-8", errors="replace"))
    onchain = normalise(onchain_path.read_text(encoding="utf-8", errors="replace"))

    print(f"source   {source_path}  sha256 {digest(source)}  lines {source.count(chr(10))}")
    print(f"onchain  {onchain_path}  sha256 {digest(onchain)}  lines {onchain.count(chr(10))}")

    if source == onchain:
        print("MATCH - the deployment is the source in this repository.")
        return 0

    diff = first_difference(source, onchain)
    if diff:
        line, a, b = diff
        print(f"MISMATCH at line {line}")
        print(f"  source : {a}")
        print(f"  onchain: {b}")
    else:
        print("MISMATCH - lengths differ after normalisation.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
