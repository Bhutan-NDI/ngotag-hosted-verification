#!/bin/sh

# Keeps the deploy workflow, the Make targets and the release contract in step: the
# workflow runs only on the contract's trigger tags, no other workflow can be
# triggered by them, and every environment has its Make target. Needs mikefarah
# yq v4 (preinstalled on GitHub-hosted Ubuntu runners).

set -eu

if [ "$#" -ne 4 ]; then
  echo "usage: $0 <release-contract> <deploy-workflow> <workflows-directory> <makefile>" >&2
  exit 2
fi

contract=$1
workflow=$2
workflows=$3
makefile=$4

fail() { echo "workflow contract: $1" >&2; exit 1; }

test -f "$workflow" || fail "$workflow does not exist"
test -f "$makefile" || fail "$makefile does not exist"

# Only a push of a release tag starts a deploy: no branch push, pull request, manual or scheduled run.
test "$(yq -r '.on | keys | join(",")' "$workflow")" = "push" || fail "the deploy workflow must be triggered only by push"
test "$(yq -r '.on.push | keys | join(",")' "$workflow")" = "tags" || fail "the deploy workflow must be triggered only by release tags"

expected=$(jq -r '.environments[].tag_prefix + "*"' "$contract" | sort)
actual=$(yq -r '.on.push.tags[]' "$workflow" | sort)
test "$expected" = "$actual" || fail "the workflow tag globs differ from the release contract"

# The resolver's concurrency group names each environment's tag prefix.
group=$(yq -r '.jobs.resolve.concurrency.group' "$workflow")
for prefix in $(jq -r '.environments[].tag_prefix' "$contract"); do
  case "$group" in *"'$prefix'"*) ;; *) fail "the resolver concurrency group does not name $prefix" ;; esac
done

# Every environment is released through its Make target, and only through it.
for environment in $(jq -r '.environments | keys[]' "$contract"); do
  grep -q "^deploy-$environment:" "$makefile" || fail "the Makefile has no deploy-$environment target"
  grep -q "DEPLOY_ENV=$environment " "$makefile" || fail "deploy-$environment does not set DEPLOY_ENV=$environment"
done

# True when the push of a tag can start the workflow: `on: push`, a list with push, a push
# trigger without filters, or one with a tags or tags-ignore filter (branch filters only do not).
triggered_by_tags() {
  case "$(yq -r '.on | tag' "$1")" in
    '!!str') test "$(yq -r '.on' "$1")" = push ;;
    '!!seq') yq -e '.on | map(. == "push") | any' "$1" >/dev/null 2>&1 ;;
    '!!map')
      test "$(yq -r '.on | has("push")' "$1")" = true || return 1
      case "$(yq -r '.on.push | tag' "$1")" in
        '!!null') return 0 ;;
        '!!map') yq -e '(.on.push | has("tags")) or (.on.push | has("tags-ignore"))' "$1" >/dev/null 2>&1 ;;
        *) return 1 ;;
      esac ;;
    *) return 1 ;;
  esac
}

# No other workflow may react to a release tag.
for other in "$workflows"/*.yml; do
  [ "$other" = "$workflow" ] && continue
  if triggered_by_tags "$other"; then
    fail "$other can be started by a tag; release tags must start only the deploy workflow"
  fi
done
