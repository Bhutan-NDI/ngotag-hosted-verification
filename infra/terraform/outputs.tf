output "site_url" {
  description = "SITE_URL for the GitHub Environment."
  value       = "https://${var.domain_name}"
}

output "bucket_name" {
  description = "S3_BUCKET for the GitHub Environment."
  value       = aws_s3_bucket.site.id
}

output "deploy_role_arn" {
  description = "AWS_ROLE_ARN for the GitHub Environment."
  value       = aws_iam_role.deploy.arn
}

output "distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "distribution_domain_name" {
  description = "Point domain_name here with an alias or CNAME record when hosted_zone_id is empty."
  value       = aws_cloudfront_distribution.site.domain_name
}
