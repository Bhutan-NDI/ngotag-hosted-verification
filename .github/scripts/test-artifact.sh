#!/bin/sh

# Tests packing the site bundle and checking it against its checksum.

set -eu

scripts=.github/scripts
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT HUP INT TERM
name=hosted-verification-out.tar.gz

mkdir -p "$work/out/_next/static/chunks" "$work/out/v"
echo '<html></html>' > "$work/out/404.html"
echo 'x' > "$work/out/v/_.html"
echo 'console.log(1)' > "$work/out/_next/static/chunks/a.js"

sha=$(sh "$scripts/package-artifact.sh" "$work/out" "$work/bundle" "$name")
printf '%s' "$sha" | grep -Eq '^[0-9a-f]{64}$' || { echo "package-artifact did not print a checksum" >&2; exit 1; }
test -f "$work/bundle/$name" && test -f "$work/bundle/$name.sha256" || { echo "the bundle files were not written" >&2; exit 1; }

test "$(sh "$scripts/verify-artifact.sh" "$work/bundle" "$name")" = "$sha" || { echo "verify-artifact rejected an intact bundle" >&2; exit 1; }
test "$(sh "$scripts/verify-artifact.sh" "$work/bundle" "$name" "$sha")" = "$sha" || { echo "verify-artifact rejected the ledger checksum" >&2; exit 1; }

# The bundle unpacks to the same site.
mkdir "$work/site"
tar -xzf "$work/bundle/$name" -C "$work/site"
diff -r "$work/out" "$work/site" >/dev/null || { echo "the unpacked bundle differs from the site" >&2; exit 1; }

if sh "$scripts/verify-artifact.sh" "$work/bundle" "$name" "$(printf '%064d' 0)" >/dev/null 2>&1; then
  echo "accepted a checksum that differs from the ledger" >&2
  exit 1
fi

cp -R "$work/bundle" "$work/tampered"
printf 'tampered' >> "$work/tampered/$name"
if sh "$scripts/verify-artifact.sh" "$work/tampered" "$name" >/dev/null 2>&1; then
  echo "accepted a bundle that does not match its checksum file" >&2
  exit 1
fi

rm "$work/bundle/$name.sha256"
if sh "$scripts/verify-artifact.sh" "$work/bundle" "$name" >/dev/null 2>&1; then
  echo "accepted a bundle without a checksum file" >&2
  exit 1
fi

mkdir "$work/empty"
if sh "$scripts/package-artifact.sh" "$work/empty" "$work/none" "$name" >/dev/null 2>&1; then
  echo "packed a directory that is not a built site" >&2
  exit 1
fi

echo "artifact: all tests passed"
