#!/bin/sh

# Validates one environment file of the private deployment manifest
# (hosted-verification/environments/<environment>.json in ndi-tf-manifests). The
# manifest names the bucket and the site, which never appear in this public
# repository, and records the last deployed release (the ledger).
#
# QA and Stage carry the build-time values of the bundle they build. Prod builds
# nothing: it promotes Stage's bundle, so it has none.

set -eu

if [ "$#" -ne 3 ]; then
  echo "usage: $0 <release-contract> <environment> <manifest>" >&2
  exit 2
fi

contract=$1
environment=$2
manifest=$3

test -f "$contract" || { echo "release contract does not exist: $contract" >&2; exit 1; }
test -f "$manifest" || { echo "deployment manifest does not exist" >&2; exit 1; }

jq -e --arg environment "$environment" --slurpfile contract "$contract" '
  def semver: type == "string" and test("^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$");
  # Build values land in the workflow environment: one line, printable only.
  def line: type == "string" and test("^[ -~]*$");
  def build_keys: ["NEXT_PUBLIC_APP_STORE_URL", "NEXT_PUBLIC_PLAY_STORE_URL", "NEXT_PUBLIC_SUPPORT_EMAIL",
    "NEXT_PUBLIC_SUPPORT_PHONE", "NEXT_PUBLIC_VIDEO_GUIDE_URL"];
  $contract[0].environments[$environment] as $policy
  | ($policy.channel == "stable") as $promotes
  | $policy != null and
    .schema_version == 1 and
    .environment == $environment and
    .enabled == true and
    (.release | type == "object") and
    (if $promotes
      then (.release | keys == ["deployed"])
      else (.release | keys == ["deployed", "next_version"]) and (.release.next_version | semver) end) and
    (.release.deployed == null or (.release.deployed | type == "object")) and
    (.deployment | type == "object") and
    ((.deployment | keys) == (if $promotes
      then ["allowed_branch", "aws_region", "bucket", "site_url"]
      else ["allowed_branch", "aws_region", "bucket", "build_values", "site_url"] end)) and
    .deployment.allowed_branch == $policy.allowed_branch and
    (.deployment.aws_region | type == "string" and test("^[a-z]{2}(-[a-z]+)+-[0-9]$")) and
    (.deployment.bucket | type == "string" and test("^[a-z0-9][a-z0-9.-]{2,62}$")) and
    (.deployment.site_url | type == "string" and test("^https://[a-z0-9][a-z0-9.-]*[a-z0-9]$")) and
    (if $promotes then true
     else (.deployment.build_values | type == "object" and
       ((keys - build_keys) | length == 0) and all(.[]; line)) end)
' "$manifest" >/dev/null || {
  echo "deployment manifest for $environment failed validation" >&2
  exit 1
}
