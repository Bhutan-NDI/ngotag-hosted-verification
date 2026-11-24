#!/bin/sh

# Tests the scanner that keeps infrastructure identifiers out of public release notes.

set -eu

script=.github/scripts/check-release-notes.sh
notes=$(mktemp)
trap 'rm -f "$notes"' EXIT HUP INT TERM
export PUBLIC_TEXT="Bhutan NDI hosted verification page Bhutan-NDI/ngotag-hosted-verification"

accepts() {
  mode=$1
  printf '%s\n' "$2" > "$notes"
  shift 2
  sh "$script" "$mode" "$notes" "$@" || { echo "rejected clean $mode notes" >&2; exit 1; }
}

rejects() {
  mode=$1
  description=$2
  printf '%s\n' "$3" > "$notes"
  shift 3
  if sh "$script" "$mode" "$notes" "$@" 2>/dev/null; then
    echo "accepted $mode notes containing $description" >&2
    exit 1
  fi
}

# A commit SHA with a run of exactly 12 decimal digits is not an account ID.
authored='## Bhutan NDI hosted verification page v0.1.0-rc.1 (release candidate)

**Source commit:** `a123456789012b5c78759a0000000000000000ff`'
generated='## What'"'"'s Changed
* fix(security): close the open redirect by @someone in https://github.com/Bhutan-NDI/ngotag-hosted-verification/pull/90
* fix: pin the base image sha256:abc and the role/name by @someone in https://github.com/Bhutan-NDI/ngotag-hosted-verification/pull/91
* feat: Dzongkha copy review by @someone in https://github.com/Bhutan-NDI/ngotag-hosted-verification/pull/92

**Full Changelog**: https://github.com/Bhutan-NDI/ngotag-hosted-verification/compare/hosted-verification/v0.1.0-rc.1...hosted-verification/v0.1.0-rc.2'

# Short, generic or public names never block a release; distinctive names are matched as whole words.
names='ndi-hosted-verification-stage-bucket id-stage.example.bt ap-southeast-1 Page ngotag-hosted-verification'
# shellcheck disable=SC2086
accepts authored "$authored" $names
# shellcheck disable=SC2086
accepts generated "$generated" $names
accepts generated "* fix: ndi-hosted-verification-stage-buckets cleanup" ndi-hosted-verification-stage-bucket

rejects authored "an account ID" "$authored
Account 123456789012"
rejects generated "an account ID" "$generated (123456789012)"
rejects generated "an ARN" "$generated arn:aws:iam::role/x"
rejects generated "an AWS host" "$generated https://x.s3.ap-southeast-1.amazonaws.com/y"
rejects generated "a CloudFront host" "$generated https://d111111abcdef8.cloudfront.net"
rejects generated "a bucket URL" "$generated s3://bucket/key"
rejects generated "a subnet" "$generated subnet-0123456789abcdef0"
rejects generated "a security group" "$generated (sg-0123abcd)"
rejects authored "a digest" "$authored sha256:abc"
rejects authored "an IAM role" "$authored role/hosted-verification-deploy"
rejects authored "a distribution ID" "$authored distribution id E1ABCDEFGHIJKL"
rejects authored "the bucket name" "$authored in ndi-hosted-verification-stage-bucket" ndi-hosted-verification-stage-bucket
rejects authored "the site host" "$authored on id-stage.example.bt" id-stage.example.bt
rejects generated "the region" "$generated
* fix ap-southeast-1 routing" ap-southeast-1

echo "check-release-notes: all tests passed"
