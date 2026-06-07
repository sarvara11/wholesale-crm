output "site_url" {
  description = "Live site URL"
  value       = "https://${var.domain_name}"
}

output "alb_dns" {
  description = "Raw ALB DNS name (fallback)"
  value       = aws_lb.main.dns_name
}

output "route53_nameservers" {
  description = "Copy these 4 NS records to your domain registrar"
  value       = aws_route53_zone.app.name_servers
}

output "ecr_repo_url" {
  description = "ECR repository URL for docker push"
  value       = aws_ecr_repository.app.repository_url
}

output "nat_gateway_ip" {
  description = "NAT Gateway public IP — add to MongoDB Atlas allowlist"
  value       = aws_eip.nat.public_ip
}

output "ecs_cluster" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service" {
  value = aws_ecs_service.app.name
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.app.name
}
