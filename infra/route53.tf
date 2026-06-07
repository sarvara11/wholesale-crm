# ── Route 53 — Public hosted zone for wholesalesphere.forum ──────────────────
resource "aws_route53_zone" "app" {
  name    = var.domain_name
  comment = "Managed by Terraform — Wholesale CRM"
}

# DNS records used by ACM to validate the certificate
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  zone_id = aws_route53_zone.app.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

# Apex domain  →  ALB
resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.app.zone_id
  name    = var.domain_name
  type    = "A"
  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# www subdomain  →  ALB
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.app.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
