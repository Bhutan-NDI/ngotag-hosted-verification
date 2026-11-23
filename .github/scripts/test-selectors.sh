#!/bin/sh

# Tests the jq filters that pick the CI state of a commit and the release workflow run.

set -eu

scripts=.github/scripts

ci_state() {
  printf '%s' "$1" | jq -sr --arg check_name build --arg app_slug github-actions -f "$scripts/select-ci-state.jq"
}

expect_ci() {
  actual=$(ci_state "$2")
  test "$actual" = "$1" || { echo "CI state: expected $1, got $actual" >&2; exit 1; }
}

run() { # name app status conclusion started_at
  printf '{"name":"%s","app":{"slug":"%s"},"status":"%s","conclusion":%s,"started_at":"%s"}' "$1" "$2" "$3" "$4" "$5"
}
page() { printf '{"check_runs":[%s]}' "$1"; }

expect_ci success "$(page "$(run build github-actions completed '"success"' 2026-11-23T01:00:00Z)")"
expect_ci pending "$(page "$(run build github-actions in_progress null 2026-11-23T01:00:00Z)")"
expect_ci "failed:failure" "$(page "$(run build github-actions completed '"failure"' 2026-11-23T01:00:00Z)")"
expect_ci missing "$(page '')"
expect_ci missing "$(page "$(run lint github-actions completed '"success"' 2026-11-23T01:00:00Z)")"
# A check of the same name from another app never counts.
expect_ci missing "$(page "$(run build some-other-app completed '"success"' 2026-11-23T01:00:00Z)")"
# The newest run of the check decides: a re-run that passed after a failure is a pass.
expect_ci success "$(page "$(run build github-actions completed '"failure"' 2026-11-23T01:00:00Z),$(run build github-actions completed '"success"' 2026-11-23T02:00:00Z)")"
expect_ci "failed:failure" "$(page "$(run build github-actions completed '"success"' 2026-11-23T01:00:00Z),$(run build github-actions completed '"failure"' 2026-11-23T02:00:00Z)")"
# Two pages are combined.
expect_ci success "$(page '')$(page "$(run build github-actions completed '"success"' 2026-11-23T01:00:00Z)")"
if printf '%s' '{"check_runs":"nope"}' | jq -sr --arg check_name build --arg app_slug github-actions \
  -f "$scripts/select-ci-state.jq" >/dev/null 2>&1; then
  echo "accepted an unexpected check-runs response" >&2
  exit 1
fi

tag=hosted-verification-stage-abc
sha=0123456789abcdef0123456789abcdef01234567
workflow_run() { # id path title sha created_at
  printf '{"id":%s,"path":"%s","display_title":"%s","head_sha":"%s","created_at":"%s"}' "$1" "$2" "$3" "$4" "$5"
}
select_run() { printf '%s' "$1" | jq -sr --arg tag "$tag" --arg source_sha "$sha" -f "$scripts/select-workflow-run.jq"; }
runs() { printf '{"workflow_runs":[%s]}' "$1"; }
path=.github/workflows/deploy-hosted-verification.yml
title="Deploy hosted verification [$tag]"

test "$(select_run "$(runs "$(workflow_run 7 $path "$title" $sha 2026-11-23T01:00:00Z)")")" = 7 || { echo "did not select the matching run" >&2; exit 1; }
test "$(select_run "$(runs "$(workflow_run 7 $path "$title" $sha 2026-11-23T01:00:00Z),$(workflow_run 9 $path "$title" $sha 2026-11-23T02:00:00Z)")")" = 9 || { echo "did not select the newest matching run" >&2; exit 1; }
test -z "$(select_run "$(runs "$(workflow_run 7 .github/workflows/ci.yml "$title" $sha 2026-11-23T01:00:00Z)")")" || { echo "selected a run of another workflow" >&2; exit 1; }
test -z "$(select_run "$(runs "$(workflow_run 7 $path "Deploy hosted verification [other]" $sha 2026-11-23T01:00:00Z)")")" || { echo "selected a run for another tag" >&2; exit 1; }
test -z "$(select_run "$(runs "$(workflow_run 7 $path "$title" fedcba9876543210fedcba9876543210fedcba98 2026-11-23T01:00:00Z)")")" || { echo "selected a run of another commit" >&2; exit 1; }

echo "selectors: all tests passed"
