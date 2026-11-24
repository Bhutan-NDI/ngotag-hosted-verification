#!/bin/sh

# Tests that the workflow contract check catches drift between the deploy workflow,
# the Make targets, the release contract and the other workflows.

set -eu

validate=.github/scripts/validate-workflow-contract.sh
contract=.github/hosted-verification-release-contract.json
workflow=.github/workflows/deploy-hosted-verification.yml
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT HUP INT TERM

passes() { sh "$validate" "$contract" "$1" "$2" "$3" >/dev/null 2>&1; }

passes "$workflow" .github/workflows Makefile || { echo "rejected the checked-in workflow" >&2; exit 1; }

# fresh <name>: a workflows directory holding CI and the deploy workflow
fresh() {
  mkdir -p "$work/$1"
  cp .github/workflows/ci.yml "$work/$1/ci.yml"
  cp "$workflow" "$work/$1/deploy.yml"
}
rejects() {
  description=$1
  directory=$2
  makefile=${3:-Makefile}
  if passes "$work/$directory/deploy.yml" "$work/$directory" "$makefile"; then
    echo "accepted $description" >&2
    exit 1
  fi
}

fresh manual
sed 's/^on:$/on:\n  workflow_dispatch:/' "$workflow" > "$work/manual/deploy.yml"
rejects "a manual trigger" manual

fresh branch
sed 's/^  push:$/  push:\n    branches: [main]/' "$workflow" > "$work/branch/deploy.yml"
rejects "a branch push trigger" branch

fresh glob
sed 's/- hosted-verification-stage-\*/- hosted-verification-stg-*/' "$workflow" > "$work/glob/deploy.yml"
rejects "tag globs that differ from the contract" glob

fresh group
sed "s/startsWith(github.ref_name, 'hosted-verification-prod-') \&\& 'prod' || //" "$workflow" > "$work/group/deploy.yml"
rejects "a resolver group that misses an environment" group

fresh target
sed '/^deploy-prod:/,/^$/d' Makefile > "$work/Makefile"
rejects "a missing Make target" target "$work/Makefile"

fresh env
sed 's/DEPLOY_ENV=stage /DEPLOY_ENV=qa /' Makefile > "$work/Makefile.env"
rejects "a Make target for the wrong environment" env "$work/Makefile.env"

# Another workflow started by a tag, however the trigger is written.
other() { # name yaml
  fresh "$1"
  printf '%b\n' "$2" > "$work/$1/other.yml"
  rejects "another workflow started by $1" "$1"
}
other push-tags 'name: x\non:\n  push:\n    tags: ["v*"]\njobs: {}'
other push-tags-ignore 'name: x\non:\n  push:\n    tags-ignore: ["v*"]\njobs: {}'
other push-unfiltered 'name: x\non:\n  push:\njobs: {}'
other on-push 'name: x\non: push\njobs: {}'
other on-list 'name: x\non: [push, pull_request]\njobs: {}'

# Workflows a tag cannot start are fine.
fresh quiet
printf '%b\n' 'name: x\non:\n  push:\n    branches: [main]\n  pull_request:\njobs: {}' > "$work/quiet/branches.yml"
printf '%b\n' 'name: y\non: pull_request\njobs: {}' > "$work/quiet/pr.yml"
printf '%b\n' 'name: z\non: [pull_request]\njobs: {}' > "$work/quiet/list.yml"
passes "$work/quiet/deploy.yml" "$work/quiet" Makefile || { echo "rejected workflows that no tag can start" >&2; exit 1; }

echo "workflow contract: all tests passed"
