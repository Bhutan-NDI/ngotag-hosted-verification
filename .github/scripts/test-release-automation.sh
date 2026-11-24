#!/bin/sh

# Runs every release-automation check. Needs bash, jq and mikefarah yq v4
# (preinstalled on GitHub-hosted Ubuntu runners).

set -eu

scripts=.github/scripts

for script in "$scripts"/*.sh; do
  case "$(head -n 1 "$script")" in
    *bash*) bash -n "$script" ;;
    *) sh -n "$script" ;;
  esac
done

sh "$scripts/validate-release-contract.sh" .github/hosted-verification-release-contract.json
sh "$scripts/validate-workflow-contract.sh" .github/hosted-verification-release-contract.json \
  .github/workflows/deploy-hosted-verification.yml .github/workflows Makefile
sh "$scripts/test-workflow-contract.sh"
sh "$scripts/test-deployment-manifest.sh"
sh "$scripts/test-resolve-release-version.sh"
sh "$scripts/test-check-release-notes.sh"
sh "$scripts/test-selectors.sh"
sh "$scripts/test-artifact.sh"

echo "release automation: all checks passed"
