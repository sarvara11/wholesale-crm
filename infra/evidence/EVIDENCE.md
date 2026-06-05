# BTEC Networking in the Cloud — Aim C Evidence Pack

**Student project:** Wholesale CRM  
**Cloud provider:** AWS (eu-west-1, Ireland)  
**Date deployed:** 2026-06-05  
**Live URL:** http://wholesale-crm-alb-1084394540.eu-west-1.elb.amazonaws.com

---

## C.P5 — Design: Architecture Description

### Cloud Network Diagram

```
Internet (0.0.0.0/0)
        │
        ▼
┌─ Internet Gateway (igw-...) ──────────────────────────────────────────────┐
│                                                                            │
│  VPC  10.0.0.0/16   (eu-west-1)                                           │
│                                                                            │
│  ┌── Public Subnet eu-west-1a (10.0.0.0/24) ──────────────────────────┐  │
│  │   ALB node + NAT Gateway (EIP: 34.241.6.69)                        │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│  ┌── Public Subnet eu-west-1b (10.0.1.0/24) ──────────────────────────┐  │
│  │   ALB node                                                          │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│         ALB SG: allow 80/443 from 0.0.0.0/0                              │
│         ↓ (only ALB SG → port 3000)                                       │
│                                                                            │
│  ┌── Private Subnet eu-west-1a (10.0.10.0/24) ────────────────────────┐  │
│  │   Fargate task: ip-10-0-10-8   (port 3000)                         │  │
│  │   Fargate task: ip-10-0-10-94  (port 3000)                         │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│  ┌── Private Subnet eu-west-1b (10.0.11.0/24) ────────────────────────┐  │
│  │   Fargate task: ip-10-0-11-116 (port 3000)                         │  │
│  │   Fargate task: ip-10-0-11-17  (port 3000)                         │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                          │ (outbound via NAT GW)                          │
└───────────────────────── │ ───────────────────────────────────────────────┘
                           ▼
                   MongoDB Atlas (cloud.mongodb.com)
                   Allowlisted IP: 34.241.6.69
```

### Terraform Infrastructure Files

| File | Resources created |
|---|---|
| `infra/main.tf` | VPC, 2 public + 2 private subnets, IGW, NAT GW, EIP, route tables |
| `infra/security.tf` | ALB SG (80/443 → internet), ECS SG (3000 → ALB only) |
| `infra/alb.tf` | Application Load Balancer, target group, HTTP listener, CloudWatch log group |
| `infra/ecs.tf` | ECS cluster (Container Insights on), Fargate task definition, ECS service |
| `infra/autoscaling.tf` | App Auto Scaling target, CPU target-tracking policy (50%, min 2, max 6) |
| `infra/ecr.tf` | ECR repository + lifecycle policy (keep last 5 images) |
| `infra/ssm.tf` | SSM SecureString for MONGODB_URI and JWT_SECRET |
| `infra/iam.tf` | ECS execution role (ECR pull + SSM read + CloudWatch logs) |
| `infra/route53.tf` | Private hosted zone + A-alias record → ALB |
| `infra/outputs.tf` | ALB URL, NAT IP, ECR URL, log group name |

### Security Design Decisions

1. **Private subnets for tasks** — ECS Fargate tasks have no public IP; unreachable directly from internet
2. **ALB as single entry point** — only the ALB security group can reach task port 3000
3. **Secrets in SSM Parameter Store (SecureString)** — MONGODB_URI and JWT_SECRET never appear in code, environment files, or git history; injected at container start via IAM role
4. **Non-root container** — Dockerfile creates `appuser` and runs as non-root
5. **NAT Gateway for outbound** — tasks reach MongoDB Atlas via NAT (single fixed IP = easy Atlas allowlisting)
6. **JWT in httpOnly cookie** — auth token not accessible to JavaScript, resistant to XSS

### Terraform apply output summary
```
Apply complete! Resources: 36 added, 0 changed, 0 destroyed.

Outputs:
alb_url          = "http://wholesale-crm-alb-1084394540.eu-west-1.elb.amazonaws.com"
ecr_repo_url     = "102259123953.dkr.ecr.eu-west-1.amazonaws.com/wholesale-crm"
nat_gateway_ip   = "34.241.6.69"
ecs_cluster      = "wholesale-crm"
ecs_service      = "wholesale-crm"
route53_record   = "app.wholesale-crm.internal"
cloudwatch_log_group = "/ecs/wholesale-crm"
```

---

## C.P6 — Implementation: Apply Output + Live URL

### Live health check
```
GET http://wholesale-crm-alb-1084394540.eu-west-1.elb.amazonaws.com/health
→ HTTP 200
{"status":"ok","uptime":349.673366393,"timestamp":"2026-06-05T01:08:26.969Z"}
```

### Load balancer routing evidence (X-Instance-ID)
16 consecutive requests distributed across 4 Fargate tasks in 2 AZs:
```
req 01 → ip-10-0-10-94.eu-west-1.compute.internal   (AZ-a)
req 02 → ip-10-0-11-116.eu-west-1.compute.internal  (AZ-b)
req 03 → ip-10-0-11-17.eu-west-1.compute.internal   (AZ-b)
req 04 → ip-10-0-11-116.eu-west-1.compute.internal  (AZ-b)
req 05 → ip-10-0-10-8.eu-west-1.compute.internal    (AZ-a)
...
req 16 → ip-10-0-11-116.eu-west-1.compute.internal  (AZ-b)
Distinct instances: 4
```

### ECR image
```
Repository: 102259123953.dkr.ecr.eu-west-1.amazonaws.com/wholesale-crm
Tag:        latest
Size:       209 MB
Platform:   linux/amd64
Pushed:     2026-06-05
```

### Route 53 record
```
Zone:   wholesale-crm.internal (private, scoped to VPC)
Record: app.wholesale-crm.internal  →  A alias  →  ALB DNS
```

---

## C.M3 — Test: Load Test Numbers + Auto-Scaling Evidence

See `results.md` for full numbers. Summary:

### Performance under load

| Phase | Tool | Duration | Connections | Endpoint | RPS | p50 | p99 | Errors |
|---|---|---|---|---|---|---|---|---|
| Baseline | autocannon | 60 s | 10 | /health | 93.5 | 106 ms | 133 ms | 0 |
| Heavy | autocannon | 120 s | 50 | /api/system/load | 393.9 | 107 ms | 624 ms | 0 |
| Scale trigger | autocannon | 180 s | 150 | /api/system/load | 1066.8 | 111 ms | 456 ms | 4 |

### Auto-scaling behaviour

The CPU target-tracking policy (50% threshold, min 2 / max 6 tasks) fired during Phase 3:

```
CloudWatch AlarmHigh triggered at 06:21 UTC+5:
  3 consecutive data points: 63%, 75.6%, 74% (all > 50% threshold)

ECS scaling activity:
  Cause:  AlarmHigh in state ALARM triggered policy wholesale-crm-cpu-scaling
  Action: Setting desired count to 3
  Time:   2026-06-05T06:21:04Z

Service state after trigger:
  desired=3  running=2  pending=1
```

**Demonstrated:** CPU alarm crossed threshold → auto-scaler increased desired tasks from 2 → 3 within ~60 seconds of sustained load.

---

## C.D2 — Justify: Design Effectiveness

The measured results confirm the architecture achieves its goals across four dimensions:

**Performance:** At baseline (10 connections), the service delivers 93.5 req/s with p99 latency of 133 ms — well within acceptable bounds for a CRM application. The Application Load Balancer distributes traffic evenly across all healthy Fargate tasks (evidenced by the rotating `X-Instance-ID` header, showing 4 distinct task IPs across both AZs), confirming no single task is a bottleneck.

**Scalability:** The CPU target-tracking policy successfully triggered during the 150-connection load test, where sustained average CPU reached 63–75% over three consecutive 1-minute periods — exceeding the 50% threshold. The auto-scaler increased desired task count from 2 to 3 within 60 seconds of the alarm firing. The configuration (min 2, max 6, scale-out cooldown 60 s, scale-in cooldown 120 s) is asymmetric by design: fast scale-out to absorb load spikes, slower scale-in to avoid flapping.

**Security:** The private-subnet placement means Fargate tasks have no public IP addresses and cannot receive unsolicited inbound connections — all traffic is brokered through the ALB. Secrets are stored in SSM Parameter Store (SecureString), encrypted with AWS KMS, and injected into tasks via the execution role, meaning credentials never appear in code, environment files, or git history. The NAT Gateway provides a single, fixed outbound IP (34.241.6.69) for MongoDB Atlas allowlisting, eliminating the need to allow broad CIDR ranges.

**Resilience:** Multi-AZ deployment across eu-west-1a and eu-west-1b means the service survives an AZ failure — the ALB automatically stops routing to tasks in the failed AZ. The minimum task count of 2 (one per AZ by the scheduler) ensures there is no single point of failure at the application layer.

**Trade-off acknowledged:** A single NAT Gateway (not one per AZ) was used to reduce cost for this assignment (~$0.045/hr vs ~$0.09/hr). In production, a per-AZ NAT Gateway would eliminate the cross-AZ data transfer cost and remove the NAT as a potential single point of failure for outbound traffic to Atlas.

---

## CI/CD Pipeline (C.P6 supporting evidence)

GitHub Actions workflow (`.github/workflows/ci-cd.yml`):
```
push to main
    └─ Job 1: Lint (ESLint 0 errors) + Test
          └─ Job 2: Build Docker image → push to ECR (:sha + :latest)
                └─ Job 3: Download task-def → update image → deploy to ECS
                          → wait for service stability → smoke-test /health
```

Required GitHub repository secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
