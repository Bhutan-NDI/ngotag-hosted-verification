#!/bin/sh

# Packs the built site (out/) into the release bundle and writes its SHA-256.
# Stage records the checksum in the private ledger; Prod checks the bundle it
# promotes against it, so what Prod serves is exactly what Stage ran.

set -eu

if [ "$#" -ne 3 ]; then
  echo "usage: $0 <site-directory> <destination-directory> <artifact-name>" >&2
  exit 2
fi

site=$1
destination=$2
name=$3

test -f "$site/v/_.html" && test -f "$site/404.html" || { echo "$site is not a built site (needs v/_.html and 404.html)" >&2; exit 1; }
mkdir -p "$destination"
tar -C "$site" -czf "$destination/$name" .

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$destination" && sha256sum "$name" > "$name.sha256")
else
  (cd "$destination" && shasum -a 256 "$name" > "$name.sha256")
fi
cut -d ' ' -f 1 "$destination/$name.sha256"
