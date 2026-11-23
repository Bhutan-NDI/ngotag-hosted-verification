#!/bin/sh

# Tests how a deployment picks its GitHub Release version.

set -eu

script=.github/scripts/resolve-release-version.sh
contract=.github/hosted-verification-release-contract.json
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT HUP INT TERM

sha=0123456789abcdef0123456789abcdef01234567
other=fedcba9876543210fedcba9876543210fedcba98
trigger=2026-11-23T10:00:00Z
before=2026-11-23T09:00:00Z
after=2026-11-23T10:05:00Z

# release <tag> <commit> <published_at> [draft]
release() {
  printf '{"tag_name":"hosted-verification/v%s","target_commitish":"%s","published_at":"%s","draft":%s}' \
    "$1" "$2" "$3" "${4:-false}"
}
releases() { # a file with one page, as `gh api --paginate` prints
  printf '[%s]' "$1" > "$work/releases.json"
}

resolve() { # environment requested -> prints the key=value lines
  sh "$script" "$contract" "$1" "$2" "$work/releases.json" "$sha" "$trigger"
}

expect() { # description expected actual
  test "$2" = "$3" || { echo "$1: expected [$2], got [$3]" >&2; exit 1; }
}

value() { printf '%s\n' "$2" | sed -n "s/^$1=//p"; }

# QA and Stage publish pre-releases of the next version.
releases ''
out=$(resolve qa 0.1.0)
expect "first QA version" "0.1.0-qa.1" "$(value version "$out")"
expect "first QA tag" "hosted-verification/v0.1.0-qa.1" "$(value release_tag "$out")"
expect "first QA has no previous release" "" "$(value previous_tag "$out")"
expect "first QA is new" "false" "$(value reuse "$out")"

out=$(resolve stage 0.1.0)
expect "first Stage version" "0.1.0-rc.1" "$(value version "$out")"

# The number counts up inside a series, and the previous release is the newest of that series.
releases "$(release 0.1.0-qa.1 "$other" 2026-11-20T00:00:00Z),$(release 0.1.0-qa.2 "$other" 2026-11-21T00:00:00Z),$(release 0.1.0-rc.1 "$other" 2026-11-22T00:00:00Z)"
out=$(resolve qa 0.1.0)
expect "next QA number" "0.1.0-qa.3" "$(value version "$out")"
expect "previous QA release" "hosted-verification/v0.1.0-qa.2" "$(value previous_tag "$out")"
out=$(resolve stage 0.1.0)
expect "Stage numbering is its own" "0.1.0-rc.2" "$(value version "$out")"

# The next version is at least the latest stable release plus one patch.
releases "$(release 0.1.0 "$other" 2026-11-20T00:00:00Z),$(release 0.1.4 "$other" 2026-11-21T00:00:00Z)"
out=$(resolve stage 0.1.0)
expect "version after a stable release" "0.1.5-rc.1" "$(value version "$out")"
# A higher next_version in the manifest wins, and selects a new minor.
out=$(resolve stage 0.2.0)
expect "next_version raises the version" "0.2.0-rc.1" "$(value version "$out")"

# A retried deployment reuses the release of its earlier attempt, but an older one is not reused.
releases "$(release 0.1.0-rc.1 "$sha" "$after")"
out=$(resolve stage 0.1.0)
expect "retry reuses the release" "0.1.0-rc.1" "$(value version "$out")"
expect "retry reuse flag" "true" "$(value reuse "$out")"
releases "$(release 0.1.0-rc.1 "$sha" "$before")"
out=$(resolve stage 0.1.0)
expect "an older release of the same commit is not reused" "0.1.0-rc.2" "$(value version "$out")"
# Drafts do not count.
releases "$(release 0.1.0-rc.1 "$sha" "$after" true)"
out=$(resolve stage 0.1.0)
expect "drafts are ignored" "0.1.0-rc.1" "$(value version "$out")"

# Prod publishes the stable version of the release candidate it promotes.
releases "$(release 0.1.0-rc.1 "$sha" "$before")"
out=$(resolve prod hosted-verification/v0.1.0-rc.1)
expect "Prod version" "0.1.0" "$(value version "$out")"
expect "Prod tag" "hosted-verification/v0.1.0" "$(value release_tag "$out")"
expect "Prod is new" "false" "$(value reuse "$out")"

# Prod never re-releases a version, and never goes back.
releases "$(release 0.1.0-rc.1 "$sha" "$before"),$(release 0.1.0 "$sha" "$before")"
if resolve prod hosted-verification/v0.1.0-rc.1 >/dev/null 2>&1; then
  echo "re-released a Prod version" >&2
  exit 1
fi
releases "$(release 0.1.0-rc.1 "$sha" "$before"),$(release 0.2.0 "$other" 2026-11-21T00:00:00Z)"
if resolve prod hosted-verification/v0.1.0-rc.1 >/dev/null 2>&1; then
  echo "promoted a candidate older than the latest stable release" >&2
  exit 1
fi
# A retried Prod run reuses its own release.
releases "$(release 0.1.0-rc.1 "$sha" "$before"),$(release 0.1.0 "$sha" "$after")"
out=$(resolve prod hosted-verification/v0.1.0-rc.1)
expect "Prod retry reuses the release" "true" "$(value reuse "$out")"

# Bad input is refused.
releases ''
if resolve prod hosted-verification/v0.1.0-qa.1 >/dev/null 2>&1; then echo "Prod promoted a QA release" >&2; exit 1; fi
if resolve stage 1.0 >/dev/null 2>&1; then echo "accepted a bad next_version" >&2; exit 1; fi
if resolve dev 0.1.0 >/dev/null 2>&1; then echo "accepted an unknown environment" >&2; exit 1; fi

echo "resolve-release-version: all tests passed"
