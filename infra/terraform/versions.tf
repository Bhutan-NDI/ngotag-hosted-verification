terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source = "hashicorp/aws"
      # 5.81 made the OIDC provider's thumbprint_list optional.
      version = ">= 5.81, < 6.0"
    }
  }

  # Partial configuration: pass the bucket, key and region with
  # `terraform init -backend-config=backend.hcl` (see backend.hcl.example).
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.tags
  }
}

# CloudFront certificates, WAF web ACLs for CloudFront and CloudFront's CloudWatch metrics all live in us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.tags
  }
}
