variable "aws_region"   { default = "eu-west-1" }
variable "project"      { default = "wholesale-crm" }
variable "image_tag"    { default = "latest" }

variable "mongodb_uri" {
  description = "MongoDB Atlas connection string (stored in SSM, never hardcoded)"
  type        = string
  sensitive   = true
  default     = ""
}
variable "jwt_secret" {
  description = "JWT signing secret (stored in SSM, never hardcoded)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "ecs_desired"   { default = 2 }
variable "ecs_min"       { default = 2 }
variable "ecs_max"       { default = 6 }
variable "cpu_threshold" { default = 50 }

variable "task_cpu"    { default = 512  }
variable "task_memory" { default = 1024 }
