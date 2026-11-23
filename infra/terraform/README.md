# Hosting for the hosted verification page

Terraform for one environment of the static page (README "Deploy"): a private S3 bucket behind CloudFront, with the CDN rules, security headers, certificate, DNS, WAF, alarms and the role the deploy workflow assumes. It contains no account IDs or secrets; those go in the git-ignored `*.tfvars` and `backend-*.hcl` files.

| Piece | What it does |
|---|---|
| S3 bucket | Private; only CloudFront can read it |
| CloudFront | `/v/*` rewrite, cache rules, the fixed security headers, `/404.html` for missing files |
| `config.json` | Written by Terraform from `platform_api_url` and `language_toggle`; a release can never overwrite it |
| ACM and Route 53 | Certificate and records, when `hosted_zone_id` is set |
| WAF | AWS common rules and a per-IP rate limit (`enable_waf`) |
| Alarms | CloudFront 5xx rate, and a Route 53 health check on `/config.json` |
| IAM role | Assumed by the deploy job of the matching GitHub Environment through OIDC; upload only |

## First time, per environment

Terraform is run by a person, not by CI: a plan needs AWS access, and this repository's workflows must not have secrets on pull requests (CONTRIBUTING.md).

```bash
cd infra/terraform
cp backend.hcl.example backend-staging.hcl      # fill in
cp staging.tfvars.example staging.tfvars        # fill in
terraform init -backend-config=backend-staging.hcl
terraform plan -var-file=staging.tfvars
terraform apply -var-file=staging.tfvars
```

To switch environment, run `terraform init -reconfigure` with the other backend file.

Then create the GitHub Environment (**Settings → Environments**) with the same name (`staging` or `production`) and these variables from the outputs:

| Variable | From |
|---|---|
| `AWS_REGION` | `aws_region` |
| `AWS_ROLE_ARN` | output `deploy_role_arn` |
| `S3_BUCKET` | output `bucket_name` |
| `SITE_URL` | output `site_url` |
| `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_PLAY_STORE_URL`, `NEXT_PUBLIC_APP_STORE_URL`, `NEXT_PUBLIC_VIDEO_GUIDE_URL` | Build-time values (README "Configuration") |

They are variables, not secrets: nothing in this setup is secret. For `production`, add required reviewers and restrict deployment branches to `main`; for `staging`, restrict them to `develop`.

If DNS is not in Route 53, leave `hosted_zone_id` empty, pass `certificate_arn` (validated, in `us-east-1`) and point `domain_name` at the `distribution_domain_name` output yourself.

## Releases

`.github/workflows/deploy.yml` runs on every push to `develop` (staging) and `main` (production). It builds, checks the CSP, and uploads in this order: hashed `_next/static` files, other files, HTML last. Nothing is deleted, and HTML and `config.json` are not cached, so no CloudFront invalidation is needed.

**Rollback:** re-run the deploy workflow of the last good commit from the Actions tab. Old hashed files are still in the bucket, so pages that are already open keep working.

**Old files pile up:** a release never deletes, and a lifecycle rule would be wrong here, because a file the current build still uses can be older than the rule. Prune by hand now and then, only files not referenced by the current build.

## Notes

- Alarms and their SNS topic are in `us-east-1`, where CloudFront and Route 53 publish their metrics. The health check needs the domain to resolve, so set `enable_health_check = false` for the first apply if DNS is not ready.
- The health check proves DNS, certificate, CloudFront, the bucket and `config.json`. It does not call the platform.
- `waf_rate_limit` is per IP. Citizens can share one carrier IP, so keep it generous and watch the blocked-request metric after launch.
