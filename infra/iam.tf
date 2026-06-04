# ── ECS Task Execution Role (pull image + read SSM + write logs) ──────────────
resource "aws_iam_role" "ecs_exec" {
  name = "${var.project}-ecs-exec-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_exec_base" {
  role       = aws_iam_role.ecs_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_exec_ssm" {
  name = "ssm-read"
  role = aws_iam_role.ecs_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameters", "ssm:GetParameter", "kms:Decrypt"]
      Resource = [
        "arn:aws:ssm:${var.aws_region}:${local.account_id}:parameter/${var.project}/*"
      ]
    }]
  })
}

# ── ECS Task Role (app runtime permissions) ───────────────────────────────────
resource "aws_iam_role" "ecs_task" {
  name = "${var.project}-ecs-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}
