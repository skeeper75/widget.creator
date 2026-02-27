# PLC Docker 배포 가이드

## 사전 요구사항

- Docker Engine 20.10+
- Docker Compose (선택)
- PLC 라이선스 키
- AWS 계정 (S3 사용 시)

---

## 빠른 시작

### Docker 이미지 풀

```bash
docker pull enfocus/pitstop-library-container:latest
```

### 기본 실행

```bash
docker run -d \
  --name plc \
  -p 3000:3000 \
  -e LICENSE_KEY="your-license-key" \
  -e WORKER_COUNT=4 \
  -v /path/to/temp:/tmp/pitstop \
  enfocus/pitstop-library-container:latest
```

---

## Docker Compose 구성

### docker-compose.yml

```yaml
version: '3.8'

services:
  plc:
    image: enfocus/pitstop-library-container:latest
    container_name: pitstop-plc
    ports:
      - "3000:3000"
    environment:
      # 라이선스
      LICENSE_KEY: ${PLC_LICENSE_KEY}
      
      # Worker 설정
      WORKER_COUNT: 4
      
      # AWS 설정 (S3 사용 시)
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      AWS_REGION: ap-northeast-2
      
      # SQS 큐 모드 (선택)
      SQS_QUEUE_URL: ${SQS_QUEUE_URL}
      
      # 로깅
      LOG_LEVEL: info
    volumes:
      # 임시 파일
      - plc-temp:/tmp/pitstop
      # 프로파일/액션리스트 (로컬 파일 사용 시)
      - ./profiles:/opt/plc/profiles:ro
      - ./actionlists:/opt/plc/actionlists:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G

volumes:
  plc-temp:
```

### .env 파일

```bash
# 라이선스
PLC_LICENSE_KEY=your-license-key-here

# AWS 자격 증명
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# SQS (큐 모드 사용 시)
SQS_QUEUE_URL=https://sqs.ap-northeast-2.amazonaws.com/123456789/plc-jobs
```

---

## 환경 변수

### 필수

| 변수 | 설명 |
|------|------|
| `LICENSE_KEY` | PLC 라이선스 키 |

### 권장

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `WORKER_COUNT` | 2 | Worker 프로세스 수 (CPU 코어 수에 맞춤) |
| `PORT` | 3000 | API 포트 |
| `LOG_LEVEL` | info | 로그 레벨 (debug, info, warn, error) |

### AWS 관련

| 변수 | 설명 |
|------|------|
| `AWS_ACCESS_KEY_ID` | AWS 액세스 키 |
| `AWS_SECRET_ACCESS_KEY` | AWS 시크릿 키 |
| `AWS_REGION` | AWS 리전 |
| `S3_BUCKET` | 기본 S3 버킷 |
| `SQS_QUEUE_URL` | SQS 큐 URL (큐 모드) |

### 성능 튜닝

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `JOB_TIMEOUT` | 300 | 작업 타임아웃 (초) |
| `MAX_FILE_SIZE` | 500 | 최대 파일 크기 (MB) |
| `CACHE_SIZE` | 1024 | 캐시 크기 (MB) |

---

## 처리 모드

### Direct Mode (기본)

API 호출 시 즉시 처리. Worker가 모두 사용 중이면 503 에러.

```yaml
environment:
  PROCESSING_MODE: direct
```

### Queue Mode (SQS)

AWS SQS로 작업 큐잉. 높은 볼륨에 적합.

```yaml
environment:
  PROCESSING_MODE: queue
  SQS_QUEUE_URL: https://sqs.region.amazonaws.com/account/queue-name
```

---

## AWS ECS 배포

### task-definition.json

```json
{
  "family": "pitstop-plc",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "4096",
  "memory": "8192",
  "containerDefinitions": [
    {
      "name": "plc",
      "image": "enfocus/pitstop-library-container:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "WORKER_COUNT", "value": "4" }
      ],
      "secrets": [
        {
          "name": "LICENSE_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:plc-license"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/pitstop-plc",
          "awslogs-region": "ap-northeast-2",
          "awslogs-stream-prefix": "plc"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 10,
        "retries": 3
      }
    }
  ]
}
```

---

## 스케일링

### 수평 스케일링 (여러 컨테이너)

```yaml
# docker-compose.yml
services:
  plc:
    deploy:
      replicas: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - plc
```

### Auto Scaling (AWS)

```yaml
# ECS Service Auto Scaling
Target Tracking:
  - Metric: CPUUtilization
    Target: 70%
  - Metric: MemoryUtilization
    Target: 80%
```

---

## 모니터링

### Health Check 엔드포인트

```bash
curl http://localhost:3000/health
```

### Prometheus 메트릭

```yaml
environment:
  METRICS_ENABLED: true
  METRICS_PORT: 9090
```

### 로그 확인

```bash
docker logs -f pitstop-plc
```

---

## 트러블슈팅

### 라이선스 오류

```bash
# 라이선스 상태 확인
curl http://localhost:3000/license
```

### Worker 상태 확인

```bash
curl http://localhost:3000/workers
```

### 메모리 부족

```yaml
# Worker 수 줄이기
environment:
  WORKER_COUNT: 2
deploy:
  resources:
    limits:
      memory: 16G
```

### 대용량 파일 처리

```yaml
environment:
  MAX_FILE_SIZE: 1000  # MB
  JOB_TIMEOUT: 600     # 초
```
