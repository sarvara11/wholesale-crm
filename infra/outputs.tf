output "alb_url" {
  description = "Public URL of the Application Load Balancer"
  value       = "http://${aws_lb.main.dns_name}"
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

output "route53_record" {
  description = "Private DNS friendly name (resolves inside VPC)"
  value       = aws_route53_record.app.fqdn
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.app.name
}
