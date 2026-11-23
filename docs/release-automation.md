# Release automation (hosted verification page)

How the hosted verification page is released to its AWS hosting. It follows the pattern of the NGOTAG ECS services (`ngotag-agent-controller`), adapted to a static site, and is meant to be the pattern later NDI services follow. This public repository holds the workflow and its checks, but no infrastructure topology, account identifiers or runtime settings: the hosting is defined in the private `ndi-iac-tf` repository, and the per-environment values and the release ledger live in the private `ndi-tf-manifests` repository (`hosted-verification/environments/<environment>.json`).

## Release flow

| Environment | Source | Artifact | GitHub Release |
|---|---|---|---|
| QA | current `develop` head | site bundle built by the run | pre-release `hosted-verification/vX.Y.Z-qa.N` |
| Stage | current `main` head | site bundle built by the run | pre-release `hosted-verification/vX.Y.Z-rc.N` |
| Prod | the commit Stage runs | Stage's bundle, deployed unchanged | release `hosted-verification/vX.Y.Z` |

A DevOps operator starts every release from a clean checkout of the environment's branch (`develop` for QA, `main` for Stage and Prod):

```sh
make deploy-qa    DEPLOYMENT_CONFIG_REPOSITORY=Bhutan-NDI/ndi-tf-manifests   # on develop
make deploy-stage DEPLOYMENT_CONFIG_REPOSITORY=Bhutan-NDI/ndi-tf-manifests   # on main
make deploy-prod  DEPLOYMENT_CONFIG_REPOSITORY=Bhutan-NDI/ndi-tf-manifests   # on main, asks for confirmation
```

Make checks the branch, a clean tree, that the local head matches the remote, the private deployment manifest, and that the `build` CI check passed for the exact commit. It then pushes an immutable trigger tag, `hosted-verification-<environment>-<manifest commit>-<source commit>-<UTC time>`, and watches the workflow (`DEPLOY_WAIT=false` skips watching). `deploy-prod` promotes the release candidate recorded in Stage's private ledger; it shows the candidate and commit and asks the operator to type `prod` (or pass `CONFIRM=prod`).

Pushing trigger tags by hand or running the workflow any other way is not an approved release path. A tag ruleset lets only repository administrators and the `devops` team create `hosted-verification-*` tags, each GitHub Environment accepts only its own trigger tags, and there is no `push` or `workflow_dispatch` deploy path: CI rejects a workflow change that adds one.

## What the workflow does

`.github/workflows/deploy-hosted-verification.yml`:

1. **Resolve** (no secrets). Validates the trigger tag against `.github/hosted-verification-release-contract.json`: the environment, that QA uses the current `develop` head and Stage the current `main` head, and that Prod promotes a commit on `main`.
2. **Build** (QA and Stage). Reads the environment's build-time values from the private manifest, then lints, type-checks, builds the static export, runs the CSP check, and packs the site into one bundle (`hosted-verification-out.tar.gz`) with its SHA-256.
3. **Deploy.**
   - Waits for CI on the exact commit and validates the private manifest.
   - Prod fetches Stage's bundle from the Stage release and checks it against the checksum in the Stage ledger. Prod never rebuilds.
   - Resolves the release version, then builds the complete release notes and scans them for infrastructure identifiers, before anything in AWS changes.
   - Assumes the environment's AWS role through OIDC and checks the account.
   - Uploads hashed `_next/static` files, then the other files, then the HTML last, deleting nothing. `config.json` is never uploaded: it belongs to the environment (`ndi-iac-tf`), and the deploy role is denied writing it.
   - Runs a smoke test on the live URL (CSP meta tag, `X-Frame-Options`, `config.json`).
   - Publishes the GitHub Release with the bundle and its checksum attached, then records the deployment in the private ledger.

AWS access uses short-lived GitHub OIDC credentials from a role per environment that trusts only that environment's trigger tags and may only upload to that environment's bucket. Private repository access and release publishing use GitHub App tokens scoped to a single repository and revoked after the job. No AWS keys are stored anywhere.

## Versions and release notes

QA and Stage publish pre-releases of the next stable version: the larger of the manifest's `next_version` and the latest stable release plus one patch. Raising `next_version` in the private manifest selects a new minor or major version. Prod publishes the version of the release candidate it promotes and never re-releases a version. A retried deployment reuses the release it already published.

Release notes follow the standard format only: `## Bhutan NDI hosted verification page vX.Y.Z (pre-release | release candidate | release)`, the source commit, GitHub's generated "What's Changed" since the previous release of the same series, and the changelog link. They never contain account IDs, ARNs, bucket, site or distribution names, role or environment names, or configuration values; those go only in the private ledger. The workflow creates the release as a draft, scans it with `.github/scripts/check-release-notes.sh`, publishes it, re-reads the live body and scans it again. CI runs the scanner's tests.

The bundle attached to a release is the same static site the public page serves, so it carries nothing private.

## Artifact and promotion

Prod serves exactly the bundle Stage ran. Build-time values (`NEXT_PUBLIC_*`) are therefore read from the QA or Stage manifest only; the Prod manifest has none. Anything that must differ between environments belongs in `config.json`, which `ndi-iac-tf` writes per environment.

To roll back Prod, revert on `main`, release the fix to Stage as a new release candidate, and promote it. Prod refuses a candidate older than its latest stable release.

## Private manifest (`ndi-tf-manifests`)

`hosted-verification/environments/<environment>.json`, validated by `.github/scripts/validate-deployment-manifest.sh`:

```json
{
  "schema_version": 1,
  "environment": "stage",
  "enabled": true,
  "release": { "next_version": "0.1.0", "deployed": null },
  "deployment": {
    "allowed_branch": "main",
    "aws_region": "<region>",
    "bucket": "<bucket>",
    "site_url": "https://<host>",
    "build_values": { "NEXT_PUBLIC_SUPPORT_EMAIL": "<email>" }
  }
}
```

`allowed_branch` is `develop` in the QA manifest and `main` in Stage and Prod. Prod has no `next_version` and no `build_values`. After each successful release the workflow writes `release.deployed` (version, release tag, source and manifest commits, bundle checksum, promoted-from, workflow run and time), using a manifest-writer GitHub App. It refuses to write if the reviewed part of the manifest changed since the deployment began.

## GitHub Environments

Create `qa`, `stage` and `prod`, with required reviewers for Stage and Prod, and restrict each to its own trigger tags. Each environment holds these secrets and no Actions variables:

| Secret | Purpose |
|---|---|
| `AWS_HOSTED_VERIFICATION_DEPLOY_ROLE_ARN`, `AWS_ACCOUNT_ID` | The deploy role and the account it must be in |
| `DEPLOYMENT_CONFIG_REPOSITORY`, `DEPLOYMENT_CONFIG_REPOSITORY_NAME` | `Bhutan-NDI/ndi-tf-manifests` and its name |
| `IAC_MANIFEST_APP_ID`, `IAC_MANIFEST_APP_PRIVATE_KEY` | Manifest reader App (Contents: read on the manifests repository only) |
| `IAC_MANIFEST_WRITER_APP_ID`, `IAC_MANIFEST_WRITER_APP_PRIVATE_KEY` | Manifest writer App (Contents: read and write on the manifests repository only) |
| `RELEASE_PUBLISHER_APP_ID`, `RELEASE_PUBLISHER_APP_PRIVATE_KEY` | Release publisher App (Contents: read and write on this repository only) |

## Changing the automation

`make release-check` runs every check CI runs for the release automation: the contract and manifest validators, the workflow-contract check, and the tests for version selection, the notes scanner, CI selection and the bundle. Keep the workflow trigger globs, the resolver concurrency mapping and the Make targets in step with the release contract; CI rejects drift. The checks need `bash`, `jq` and mikefarah `yq` v4, which GitHub-hosted Ubuntu runners include.
