#!/bin/sh

# Checks a release bundle against its .sha256 file and, when given, against the
# checksum recorded in the private ledger. Prints the checksum.

set -eu

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "usage: $0 <directory> <artifact-name> [expected-sha256]" >&2
  exit 2
fi

directory=$1
name=$2
expected=${3:-}

test -f "$directory/$name" || { echo "bundle $name does not exist" >&2; exit 1; }
test -f "$directory/$name.sha256" || { echo "checksum file for $name does not exist" >&2; exit 1; }

if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$directory/$name" | cut -d ' ' -f 1)
else
  actual=$(shasum -a 256 "$directory/$name" | cut -d ' ' -f 1)
fi
printf '%s' "$actual" | grep -Eq '^[0-9a-f]{64}$' || { echo "could not compute the bundle checksum" >&2; exit 1; }

recorded=$(cut -d ' ' -f 1 "$directory/$name.sha256")
test "$actual" = "$recorded" || { echo "bundle $name does not match its checksum file" >&2; exit 1; }
if [ -n "$expected" ]; then
  test "$actual" = "$expected" || { echo "bundle $name does not match the checksum in the ledger" >&2; exit 1; }
fi
printf '%s\n' "$actual"
