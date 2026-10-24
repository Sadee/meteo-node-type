#!/usr/bin/env bash
# Installs a pinned gitleaks release (secret scanner used by pre-push-check.sh) into /usr/local/bin,
# verifying its checksum. Run by the dev container's postCreateCommand; safe to re-run.

set -euo pipefail

version=8.30.1

if command -v gitleaks >/dev/null && [[ "$(gitleaks version)" == *"$version"* ]]; then
  echo "gitleaks $version already installed"
  exit 0
fi

case "$(uname -m)" in
  x86_64) arch=x64 ;;
  aarch64 | arm64) arch=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

tarball="gitleaks_${version}_linux_${arch}.tar.gz"
base="https://github.com/gitleaks/gitleaks/releases/download/v${version}"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

curl -fsSL -o "$tmp/$tarball" "$base/$tarball"
curl -fsSL -o "$tmp/checksums.txt" "$base/gitleaks_${version}_checksums.txt"
(cd "$tmp" && grep " $tarball\$" checksums.txt | sha256sum -c -)

tar -xzf "$tmp/$tarball" -C "$tmp" gitleaks
sudo install -m 0755 "$tmp/gitleaks" /usr/local/bin/gitleaks
gitleaks version
