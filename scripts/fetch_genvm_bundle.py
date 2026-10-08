"""Install the pinned GenVM runner bundle in the toolchain caches.

Both the linter and direct test runner need the same large runtime archive. On a
cold machine the stable test package requests an old asset name, while recent
releases publish a new one. This script tries both, validates the archive before
installation, and moves it into place atomically so an interrupted download can
never poison later test runs.

Run:
    python scripts/fetch_genvm_bundle.py
    GENVM_VERSION=v0.3.0-rc7 python scripts/fetch_genvm_bundle.py
"""

import os
import pathlib
import shutil
import sys
import tarfile
import tempfile
import urllib.error
import urllib.request

DEFAULT_VERSION = "v0.3.0-rc7"
ASSETS = ("genvm-runners-all.tar.xz", "genvm-universal.tar.xz")
RELEASES = "https://github.com/genlayerlabs/genvm/releases"
CACHES = (
    pathlib.Path.home() / ".cache" / "genvm-linter",
    pathlib.Path.home() / ".cache" / "gltest-direct",
)
MIN_BYTES = 50 * 1024 * 1024


def targets(version: str):
    return [cache / f"genvm-universal-{version}.tar.xz" for cache in CACHES]


def usable(path: pathlib.Path) -> bool:
    if not path.exists() or path.stat().st_size < MIN_BYTES:
        return False
    try:
        with tarfile.open(path, "r:xz") as archive:
            for _ in range(5):
                if archive.next() is None:
                    break
        return True
    except Exception:
        return False


def download(version: str, destination: pathlib.Path) -> None:
    last_error = None
    for asset in ASSETS:
        url = f"{RELEASES}/download/{version}/{asset}"
        print(f"fetching {url}")
        try:
            request = urllib.request.Request(
                url, headers={"User-Agent": "attestra-contract-tests"}
            )
            with urllib.request.urlopen(request, timeout=600) as response:
                total = int(response.headers.get("Content-Length") or 0)
                with destination.open("wb") as handle:
                    copied = 0
                    mark = 16 * 1024 * 1024
                    while True:
                        chunk = response.read(1 << 20)
                        if not chunk:
                            break
                        handle.write(chunk)
                        copied += len(chunk)
                        if copied >= mark:
                            percent = f" ({copied * 100 // total}%)" if total else ""
                            print(f"  {copied // (1024 * 1024)} MB{percent}")
                            mark += 16 * 1024 * 1024
            if total and destination.stat().st_size != total:
                raise IOError(
                    f"short read: {destination.stat().st_size} of {total} bytes"
                )
            return
        except urllib.error.HTTPError as error:
            if error.code == 404:
                print(f"  asset not published under this name ({error.code})")
                last_error = error
                continue
            raise
    raise SystemExit(
        f"no runner bundle for {version}; tried {', '.join(ASSETS)}\n"
        f"last error: {last_error}"
    )


def main() -> int:
    version = os.environ.get("GENVM_VERSION") or DEFAULT_VERSION
    wanted = targets(version)
    if all(usable(path) for path in wanted):
        print(f"GenVM bundle {version} is already cached and complete")
        return 0

    for path in wanted:
        if path.exists() and not usable(path):
            print(f"removing incomplete cache entry {path}")
            path.unlink()

    with tempfile.TemporaryDirectory() as directory:
        staged = pathlib.Path(directory) / "bundle.tar.xz"
        download(version, staged)
        if not usable(staged):
            raise SystemExit("downloaded bundle is not a readable archive")
        print(f"verified {staged.stat().st_size} bytes")

        first = True
        for path in wanted:
            path.parent.mkdir(parents=True, exist_ok=True)
            if first:
                shutil.move(str(staged), str(path))
                first = False
            else:
                shutil.copy2(str(wanted[0]), str(path))
            print(f"installed {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
