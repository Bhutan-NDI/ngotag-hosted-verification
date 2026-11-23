variable "environment" {
  description = "Environment name. Also the GitHub Environment whose deploy job may assume the deploy role."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "aws_region" {
  description = "Region for the bucket and the deploy role."
  type        = string
}

variable "domain_name" {
  description = "Host name of the page, for example the staging name now and id.bhutanndi.com for production."
  type        = string
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone of the domain. When set, Terraform issues and validates the certificate and creates the DNS records. When empty, pass certificate_arn and create the DNS record yourself."
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate for domain_name, in us-east-1. Only used when hosted_zone_id is empty."
  type        = string
  default     = ""
}

variable "platform_api_url" {
  description = "Base URL of the platform api-gateway (https). Written to config.json and allowed in connect-src."
  type        = string

  validation {
    condition     = can(regex("^https://[^/]+", var.platform_api_url))
    error_message = "platform_api_url must start with https://."
  }
}

variable "language_toggle" {
  description = "Show the EN / Dzongkha switch. Written to config.json."
  type        = bool
  default     = true
}

variable "github_repository" {
  description = "owner/name of the repository whose deploy job may assume the deploy role."
  type        = string
  default     = "Bhutan-NDI/ngotag-hosted-verification"
}

variable "github_oidc_provider_arn" {
  description = "ARN of the account's existing GitHub OIDC provider. An account can have only one: leave empty to create it."
  type        = string
  default     = ""
}

variable "price_class" {
  description = "CloudFront price class. PriceClass_200 includes the Asian edge locations."
  type        = string
  default     = "PriceClass_200"
}

variable "enable_waf" {
  description = "Put an AWS WAF web ACL (managed common rules and a per-IP rate limit) in front of the distribution."
  type        = bool
  default     = true
}

variable "waf_rate_limit" {
  description = "Requests per 5 minutes from one IP before it is blocked. Keep it generous: many citizens can share one carrier IP."
  type        = number
  default     = 5000
}

variable "enable_health_check" {
  description = "Route 53 health check on /config.json plus an alarm. Needs the domain to resolve."
  type        = bool
  default     = true
}

variable "alarm_email" {
  description = "Email address that receives alarms. Leave empty to create the alarms without a subscriber."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Extra tags for every resource."
  type        = map(string)
  default     = {}
}
