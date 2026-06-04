# ── Route 53 — CNAME pointing friendly name at ALB ───────────────────────────
# Uses a public hosted zone; if you own a domain point your NS records there.
# Without a real domain we create a zone for documentation and output the ALB DNS.
resource "aws_route53_zone" "app" {
  name    = "${var.project}.internal"
  comment = "Managed by Terraform — BTEC Networking in the Cloud"
  # Private zone scoped to our VPC (works without a registered domain)
  vpc { vpc_id = aws_vpc.main.id }
}

resource "aws_route53_record" "app" {
  zone_id = aws_route53_zone.app.zone_id
  name    = "app.${var.project}.internal"
  type    = "A"
  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
