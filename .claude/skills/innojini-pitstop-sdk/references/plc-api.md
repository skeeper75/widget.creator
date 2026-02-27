# PitStop Library Container (PLC) REST API

## 개요

PLC는 PitStop Library를 Docker 컨테이너로 제공하며, REST API를 통해 PDF preflight 작업을 처리합니다.

## 베이스 URL

```
http://<host>:3000
```

기본 포트: 3000 (환경변수로 변경 가능)

---

## 엔드포인트

### POST /job - 작업 제출

Preflight 작업을 제출합니다.

**Request Body:**
```json
{
  "inputFileURL": "s3://bucket/input.pdf",
  "outputFileURL": "s3://bucket/output.pdf",
  "actionListURLs": ["s3://bucket/actions/fix-colors.eal"],
  "preflightProfileURL": "s3://bucket/profiles/print-ready.ppp",
  "reportURL": "s3://bucket/reports/report.json",
  "callbackURL": "https://your-server.com/webhook/pitstop"
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `inputFileURL` | ✅ | 입력 PDF URL (S3 presigned 또는 HTTP) |
| `outputFileURL` | ❌ | 출력 PDF URL (수정된 PDF 저장 위치) |
| `actionListURLs` | ❌ | Action List URL 배열 |
| `preflightProfileURL` | ❌ | Preflight Profile URL |
| `reportURL` | ❌ | 보고서 저장 URL |
| `callbackURL` | ❌ | 완료 시 호출할 Webhook URL |

**Response:**
```json
{
  "jobId": "abc123-def456",
  "status": "queued",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### GET /job/{id} - 작업 상태 조회

**Response:**
```json
{
  "jobId": "abc123-def456",
  "status": "completed",
  "progress": 100,
  "result": {
    "errors": 0,
    "warnings": 2,
    "fixes": 5,
    "outputFileURL": "s3://bucket/output.pdf",
    "reportURL": "s3://bucket/reports/report.json"
  },
  "processingTime": 3456,
  "createdAt": "2024-01-15T10:30:00Z",
  "completedAt": "2024-01-15T10:30:03Z"
}
```

**Status 값:**
- `queued` - 대기 중
- `processing` - 처리 중
- `completed` - 완료
- `failed` - 실패

---

### GET /job/{id}/report - 보고서 조회

**Query Parameters:**
- `format`: `json` (기본값), `xml`, `pdf`

**Response (JSON):**
```json
{
  "summary": {
    "errors": 0,
    "warnings": 2,
    "fixes": 5,
    "infos": 10
  },
  "items": [
    {
      "type": "warning",
      "message": "Low resolution image (72 dpi)",
      "page": 3,
      "objectId": "img_001"
    },
    {
      "type": "fix",
      "message": "Converted RGB to CMYK",
      "page": 1,
      "objectId": "text_002"
    }
  ],
  "profile": {
    "name": "Print Ready Check",
    "version": "1.0"
  }
}
```

---

### GET /health - 상태 확인

**Response:**
```json
{
  "status": "healthy",
  "version": "25.11.1637109",
  "uptime": 86400,
  "workers": {
    "total": 4,
    "busy": 2,
    "available": 2
  }
}
```

---

### GET /workers - Worker 상태

**Response:**
```json
{
  "workers": [
    { "id": 1, "status": "idle", "lastJob": null },
    { "id": 2, "status": "busy", "currentJob": "abc123", "progress": 45 },
    { "id": 3, "status": "busy", "currentJob": "def456", "progress": 80 },
    { "id": 4, "status": "idle", "lastJob": "ghi789" }
  ],
  "queue": {
    "pending": 5,
    "processing": 2
  }
}
```

---

### GET /transactions - 처리량 통계

라이선스 추적용 트랜잭션 통계.

**Response:**
```json
{
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "transactions": 1234,
  "pages": 45678,
  "averageProcessingTime": 2500
}
```

---

### GET /version - 버전 정보

**Response:**
```json
{
  "library": "25.11",
  "build": "1637109",
  "container": "2.1.0",
  "api": "1.0"
}
```

---

## Webhook Callback

작업 완료 시 `callbackURL`로 POST 요청:

```json
{
  "jobId": "abc123-def456",
  "status": "completed",
  "result": {
    "errors": 0,
    "warnings": 2,
    "fixes": 5
  },
  "outputFileURL": "s3://bucket/output.pdf",
  "reportURL": "s3://bucket/reports/report.json"
}
```

---

## 에러 응답

```json
{
  "error": {
    "code": "INVALID_PDF",
    "message": "The input file is not a valid PDF document",
    "details": "PDF header not found"
  }
}
```

**에러 코드:**
- `INVALID_PDF` - 유효하지 않은 PDF
- `FILE_NOT_FOUND` - 파일 접근 불가
- `PROFILE_ERROR` - 프로파일 오류
- `PROCESSING_ERROR` - 처리 중 오류
- `TIMEOUT` - 처리 시간 초과
- `WORKER_UNAVAILABLE` - 사용 가능한 Worker 없음

---

## HTTP 상태 코드

| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 201 | 작업 생성됨 |
| 400 | 잘못된 요청 |
| 404 | 리소스 없음 |
| 429 | 요청 한도 초과 |
| 500 | 서버 오류 |
| 503 | 서비스 불가 (Worker 모두 사용 중) |
