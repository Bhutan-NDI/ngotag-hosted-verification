#!/bin/sh

set -eu

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <release-contract>" >&2
  exit 2
fi

contract=$1

test -f "$contract" || {
  echo "release contract does not exist: $contract" >&2
  exit 1
}

# Every environment releases from main. QA and Stage build the current head; Prod
# never builds, it only promotes the bundle Stage runs.
jq -e '
  .schema_version == 1 and
  (keys == ["ci", "environments", "release", "schema_version"]) and
  (.release | keys == ["artifact", "tag_prefix", "title"]) and
  .release.tag_prefix == "hosted-verification/v" and
  .release.artifact == "hosted-verification-out.tar.gz" and
  (.release.title | type == "string" and length > 0) and
  (.environments | keys == ["prod", "qa", "stage"]) and
  ([.environments | to_entries[] | select(
    .value.tag_prefix != ("hosted-verification-" + .key + "-") or
    .value.allowed_branch != "main" or
    (.value.channel | IN("qa", "rc", "stable") | not)
  )] | length == 0) and
  (.environments.qa | keys == ["allowed_branch", "channel", "tag_prefix"]) and
  .environments.qa.channel == "qa" and
  (.environments.stage | keys == ["allowed_branch", "channel", "tag_prefix"]) and
  .environments.stage.channel == "rc" and
  (.environments.prod | keys == ["allowed_branch", "channel", "promote_from", "tag_prefix"]) and
  .environments.prod.channel == "stable" and
  .environments.prod.promote_from == "stage" and
  (.ci | keys == ["app_slug", "check_name"]) and
  (.ci.check_name | type == "string" and length > 0) and
  (.ci.app_slug | type == "string" and length > 0)
' "$contract" >/dev/null || {
  echo "release contract failed validation: $contract" >&2
  exit 1
}
