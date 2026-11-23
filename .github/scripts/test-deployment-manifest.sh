#!/bin/sh

# Tests the release contract and deployment manifest validators.

set -eu

scripts=.github/scripts
contract=.github/hosted-verification-release-contract.json
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT HUP INT TERM

check_contract() { sh "$scripts/validate-release-contract.sh" "$1" >/dev/null 2>&1; }
check_manifest() { sh "$scripts/validate-deployment-manifest.sh" "$contract" "$1" "$2" >/dev/null 2>&1; }

accepts_contract() { check_contract "$1" || { echo "rejected a valid contract: $2" >&2; exit 1; }; }
rejects_contract() {
  jq "$1" "$contract" > "$work/contract.json"
  if check_contract "$work/contract.json"; then echo "accepted a contract with $2" >&2; exit 1; fi
}

accepts_contract "$contract" "the checked-in contract"
rejects_contract '.environments.qa.allowed_branch = "develop"' "QA released from another branch"
rejects_contract '.environments.stage.tag_prefix = "hosted-verification-qa-"' "a wrong Stage tag prefix"
rejects_contract 'del(.environments.prod.promote_from)' "Prod without a promotion source"
rejects_contract '.environments.qa.promote_from = "stage"' "QA that promotes"
rejects_contract '.environments.prod.channel = "rc"' "a Prod release candidate"
rejects_contract '.release.tag_prefix = "other/v"' "a different release tag prefix"
rejects_contract '.release.extra = true' "an unknown release key"
rejects_contract '.environments.dev = .environments.qa' "an unknown environment"
rejects_contract '.ci.check_name = ""' "an empty CI check name"

cat > "$work/stage.json" <<'EOF'
{
  "schema_version": 1,
  "environment": "stage",
  "enabled": true,
  "release": { "next_version": "0.1.0", "deployed": null },
  "deployment": {
    "allowed_branch": "main",
    "aws_region": "ap-southeast-1",
    "bucket": "ndi-hosted-verification-stage-123456789012",
    "site_url": "https://id-stage.example.bt",
    "build_values": {
      "NEXT_PUBLIC_SUPPORT_EMAIL": "support@example.bt",
      "NEXT_PUBLIC_SUPPORT_PHONE": "1199"
    }
  }
}
EOF
jq '.environment = "qa"' "$work/stage.json" > "$work/qa.json"
jq '.environment = "prod" | .release = {deployed: null} | del(.deployment.build_values)' "$work/stage.json" > "$work/prod.json"

check_manifest stage "$work/stage.json" || { echo "rejected a valid Stage manifest" >&2; exit 1; }
check_manifest qa "$work/qa.json" || { echo "rejected a valid QA manifest" >&2; exit 1; }
check_manifest prod "$work/prod.json" || { echo "rejected a valid Prod manifest" >&2; exit 1; }
jq '.release.deployed = {version: "0.1.0-rc.1"}' "$work/stage.json" > "$work/ledger.json"
check_manifest stage "$work/ledger.json" || { echo "rejected a manifest with a ledger entry" >&2; exit 1; }

rejects() {
  environment=$1
  base=$2
  description=$3
  filter=$4
  jq "$filter" "$base" > "$work/bad.json"
  if check_manifest "$environment" "$work/bad.json"; then echo "accepted a manifest with $description" >&2; exit 1; fi
}

rejects stage "$work/stage.json" "another environment's name" '.environment = "qa"'
rejects stage "$work/stage.json" "a disabled environment" '.enabled = false'
rejects stage "$work/stage.json" "a bad next_version" '.release.next_version = "1.0"'
rejects stage "$work/stage.json" "no next_version" 'del(.release.next_version)'
rejects stage "$work/stage.json" "another branch" '.deployment.allowed_branch = "develop"'
rejects stage "$work/stage.json" "a bad region" '.deployment.aws_region = "singapore"'
rejects stage "$work/stage.json" "an upper-case bucket" '.deployment.bucket = "Bad_Bucket"'
rejects stage "$work/stage.json" "an http site" '.deployment.site_url = "http://id-stage.example.bt"'
rejects stage "$work/stage.json" "a site URL with a path" '.deployment.site_url = "https://id-stage.example.bt/x"'
rejects stage "$work/stage.json" "no build values" 'del(.deployment.build_values)'
rejects stage "$work/stage.json" "an unknown build value" '.deployment.build_values.PATH = "/bin"'
rejects stage "$work/stage.json" "a multi-line build value" '.deployment.build_values.NEXT_PUBLIC_SUPPORT_EMAIL = "a\nB=c"'
rejects stage "$work/stage.json" "an unknown deployment key" '.deployment.distribution_id = "E123"'
rejects prod "$work/prod.json" "build values" '.deployment.build_values = {}'
rejects prod "$work/prod.json" "a next_version" '.release.next_version = "0.1.0"'
rejects qa "$work/qa.json" "a Prod-style release" '.release = {deployed: null}'

echo "deployment manifest: all tests passed"
