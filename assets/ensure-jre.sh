#!/bin/bash
# Usage: ensure-jre.sh <java feature release> <install dir>
# Installs the latest Temurin JRE for that release into the directory unless one is already there.
set -euo pipefail

release=$1
dest=$2

[ -x "$dest/bin/java" ] && exit 0

case "$(uname -m)" in
  x86_64) arch=x64 ;;
  aarch64) arch=aarch64 ;;
  *) echo "unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

package=$(curl -fsSL "https://api.adoptium.net/v3/assets/latest/$release/hotspot?architecture=$arch&image_type=jre&os=linux&vendor=eclipse" | jq '.[0].binary.package')

mkdir -p "$(dirname "$dest")"
staging=$(mktemp -d "$(dirname "$dest")/.jre.XXXXXX")
trap 'rm -rf "$staging"' EXIT

curl -fsSL "$(jq -r .link <<<"$package")" -o "$staging/jre.tar.gz"
echo "$(jq -r .checksum <<<"$package")  $staging/jre.tar.gz" | sha256sum -c --quiet -
mkdir "$staging/jre"
tar -xzf "$staging/jre.tar.gz" -C "$staging/jre" --strip-components=1

rm -rf "$dest"
mv "$staging/jre" "$dest"
