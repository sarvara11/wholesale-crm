# ── SSM Parameter Store — secrets never hardcoded ─────────────────────────────
resource "aws_ssm_parameter" "mongodb_uri" {
  name        = "/${var.project}/MONGODB_URI"
  type        = "SecureString"
  value       = var.mongodb_uri
  description = "MongoDB Atlas connection string"
  lifecycle   { ignore_changes = [value] }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.project}/JWT_SECRET"
  type        = "SecureString"
  value       = var.jwt_secret
  description = "JWT signing secret"
  lifecycle   { ignore_changes = [value] }
}
