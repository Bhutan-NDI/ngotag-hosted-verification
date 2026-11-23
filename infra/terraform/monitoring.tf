# CloudFront and Route 53 health-check metrics are only published in us-east-1, so the alarms and their topic live there.

resource "aws_sns_topic" "alarms" {
  provider = aws.us_east_1
  name     = "${local.name}-alarms"
}

resource "aws_sns_topic_subscription" "email" {
  count    = var.alarm_email == "" ? 0 : 1
  provider = aws.us_east_1

  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

resource "aws_cloudwatch_metric_alarm" "cdn_5xx" {
  provider = aws.us_east_1

  alarm_name          = "${local.name}-5xx-rate"
  alarm_description   = "More than 5% of requests to the hosted page fail with a 5xx."
  namespace           = "AWS/CloudFront"
  metric_name         = "5xxErrorRate"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 5
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    DistributionId = aws_cloudfront_distribution.site.id
    Region         = "Global"
  }
}

# Proves the whole path: DNS, certificate, CloudFront, bucket and the environment's config.json.
# It does not call the platform; the platform has its own monitoring.
resource "aws_route53_health_check" "site" {
  count = var.enable_health_check ? 1 : 0

  type              = "HTTPS_STR_MATCH"
  fqdn              = var.domain_name
  port              = 443
  resource_path     = "/config.json"
  search_string     = "platformApiUrl"
  request_interval  = 30
  failure_threshold = 3
  measure_latency   = false

  tags = {
    Name = local.name
  }
}

resource "aws_cloudwatch_metric_alarm" "health_check" {
  count    = var.enable_health_check ? 1 : 0
  provider = aws.us_east_1

  alarm_name          = "${local.name}-health-check"
  alarm_description   = "The hosted page's /config.json is not reachable through ${var.domain_name}."
  namespace           = "AWS/Route53"
  metric_name         = "HealthCheckStatus"
  statistic           = "Minimum"
  period              = 60
  evaluation_periods  = 3
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]

  dimensions = {
    HealthCheckId = aws_route53_health_check.site[0].id
  }
}
