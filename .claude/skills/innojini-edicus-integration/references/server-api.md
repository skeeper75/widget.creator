# Edicus Server API Reference

## Base URL
```
https://api-dot-edicusbase.appspot.com
```

## 공통 사항

### Headers
| Header | 설명 | 필수 |
|--------|------|------|
| `edicus-api-key` | 모션원 발급 API 키 | ✅ |
| `edicus-uid` | 사용자 고유 ID (64byte 이내) | API별 상이 |

### edicus-uid 규칙
- 허용: `[a-z, A-Z, 0-9, @, -, _, +, =]`
- 금지: `. # $ [ ] / \`
- 예시: `kr46KCD8vWOnOGo8CBO7c6ctSge2`

### Response 형식
```javascript
// 성공
{ token: "...", project_id: "...", ... }

// 실패 (HTTP 200)
{ err: { code: "ERROR_CODE", message: "설명", info: {...} } }

// 인증/서버 오류
HTTP 400~500
```

---

## 인증 API

### Request User Token
사용자 토큰 발급 (JWT, 1시간 유효)

```
POST /api/auth/token
```

**Headers**
```
edicus-api-key: {API_KEY}
edicus-uid: {USER_ID}
```

**Response**
```json
{ "token": "eyJhbGciOiJIUzI1NiIs..." }
```

**주의**: 서버에서만 호출. 브라우저 호출 금지.

### Request Staff Token
스태프 계정 토큰 발급 (리소스 업데이트 권한 포함)

```
POST /api/auth/staff/token
```

**Headers**
```
edicus-api-key: {API_KEY}
edicus-email: {EMAIL}
edicus-pwd: {PASSWORD}
```

---

## 프로젝트 API

### Get Project List
사용자의 모든 프로젝트 목록 조회

```
GET /api/projects
```

**Headers**: `edicus-api-key`, `edicus-uid`

**Response**
```json
[
  {
    "project_id": "-KtnvPfKSINBDlnrShyX",
    "ctime": "2017-09-12T02:31:37.841Z",
    "mtime": "2017-09-12T02:31:37.841Z",
    "ps_code": "32x32@BT",
    "template_uri": "asset://template/...",
    "title": "hello",
    "status": "editing"
  }
]
```

**status 값**
- `editing`: 편집 중
- `ordering`: 임시 주문
- `ordered`: 주문 확정
- `rendering`: 렌더링 중
- `rendered`: 렌더링 완료

### Get Project Data
개별 프로젝트 정보 조회

```
GET /api/projects/:prjid
```

**Response**
```json
{
  "project_id": "-LiBngTbCFYNjcOVcxcY",
  "order_id": "1234",
  "ctime": "2019-06-25T04:04:51.011Z",
  "mtime": "2019-06-25T04:04:51.011Z",
  "ps_code": "50x90@NC",
  "status": "editing",
  "template_uri": "gcs://template/partners/...",
  "title": "sample test",
  "cloned_from": "-KiBngTbFEGNjcOVcxfe"
}
```

### Get Project Data (with doc)
문서 데이터 포함 조회

```
GET /api/projects/:prjid/data?doc=true
```

**Response**
```json
{
  "doc_json": "{\"type\":\"template\",\"ver\":\"1.0.0\",...}",
  "project": {
    "project_id": "-L8HcLOdIHl0707nXCy6",
    "order_id": 15520,
    "status": "ordering",
    ...
  }
}
```

### Delete Project
프로젝트 삭제 (주문된 상품은 삭제 불가)

```
DELETE /api/projects/:prjid
```

### Get Project Owner
프로젝트 소유자 조회

```
GET /api/projects/:prjid/owner
```

**Response**
```json
{ "owner": "user_id" }  // 또는 null
```

### Clone Project (Sync)
프로젝트 복제 (동기)

```
POST /api/projects/:prjid/clone
```

**Headers**
```
edicus-api-key: {API_KEY}
edicus-uid: {USER_ID}
edicus-target-uid: {TARGET_USER_ID}  // optional
```

**Response**
```json
{ "project_id": "-LEnOT7xY0ZJgXAVfc0p" }
```

**주의**: 포토북처럼 이미지가 많으면 timeout 가능. `clone_async` 사용 권장.

### Clone Project (Async)
프로젝트 복제 (비동기) - 대용량 프로젝트용

```
POST /api/projects/:prjid/clone_async
```

**Body**
```json
{ "callback_url": "https://your-server.com/callback" }
```

**Response**
```json
{ "project_id": "-LEnOT7xY0ZJgXAVfc0p" }
```

복제 중 `status: "cloning"` → 완료 시 `status: "editing"`

---

## 미리보기 API

### Get Preview Thumbnails
프로젝트 미리보기 썸네일 URL 목록

```
GET /api/projects/:prjid/preview_urls
```

**Response**
```json
{
  "urls": [
    "https://storage.googleapis.com/.../preview_01.jpg",
    "https://storage.googleapis.com/.../preview_02.jpg"
  ]
}
```

### Get Multiple Preview Thumbnails
복수 프로젝트 썸네일 일괄 조회 (최대 25개)

```
POST /api/projects/preview_urls
```

**Body**
```json
{ "project-ids": ["id1", "id2", "id3"] }
```

**Response**
```json
{
  "urls": [
    { "project_id": "id1", "urls": ["https://..."] },
    { "project_id": "id2", "error": "no preview urls" }
  ]
}
```

---

## 주문 API

### Can Order
주문 가능 여부 확인

```
GET /api/projects/:prjid/order/can_order
```

**Response**
```json
{
  "can_order": true,
  "dec_rev": 5,
  "status": "editing"
}
```

### Tentative Order
임시 주문 생성 (취소 가능)

```
POST /api/projects/:prjid/order/tentative
```

**Headers**: `edicus-api-key`, `edicus-uid`

**Body**
```json
{
  "order_for_test": false,
  "order_count": 1,
  "total_price": 23500,
  "partner_order_id": "M2511290001",
  "order_name": "홍길동",
  "userdata_json": "{\"user_name\":\"홍길동\"}"
}
```

**Response**
```json
{
  "order_id": 100023,
  "status": "ordering"
}
```

**userdata_json 필드**
```json
{
  "user_name": "주문자명",
  "receiver_name": "수령인",
  "order_name": "주문명",
  "production_count": 50,
  "title": "제목"
}
```

### Tentative Order with VDP
가변데이터(VDP) 포함 임시 주문

```
POST /api/projects/:prjid/order/tentative_with_vdp
```

**Body** (multipart/form-data)
```
order_count: 1
total_price: 23500
vdp_dataset_file: {File}  // JSON 파일
```

**vdp_dataset 형식**
```json
{
  "rows": [
    {
      "cols": [
        { "id": "name", "value": { "text": "홍길동" }, "shrink": true },
        { "id": "title", "value": { "text": "대리" } }
      ]
    }
  ]
}
```

### Definitive Order
주문 확정 (렌더링 시작, 취소 불가)

```
POST /api/projects/:prjid/order/definitive
```

**Response**
```json
{
  "order_id": 100023,
  "status": "ordered"
}
```

### Cancel Order
주문 취소 (ordering 상태에서만)

```
POST /api/orders/:order_id/cancel
```

**Response**
```json
{
  "order_id": "10021",
  "status": "canceled"
}
```

### Reset Rendering Status
렌더링 상태 초기화 (재시도용)

```
PUT /api/orders/:order_id/status/reset_as_ordered
```

### Query Order
주문 조회

```
POST /api/order/query
```

**Body - 기간 조회**
```json
{
  "by_time": {
    "from": "2025-11-01",
    "to": "2025-11-30",
    "status": "rendered",
    "partner_order_id": "M2511...",
    "order_name": "홍길동"
  }
}
```

**Body - Order ID 조회**
```json
{ "by_order_id": { "order_id": "10009" } }
```

**Body - Partner Order ID 조회**
```json
{ "by_partner_order_id": { "partner_order_id": "M2511290001" } }
```

**Response**
```json
{
  "result": [
    {
      "id": 10007,
      "partner_id": "mot1",
      "user_id": "uid-xxx",
      "project_id": "-Kzcs...",
      "order_count": 1,
      "total_price": 23500,
      "status": "rendered",
      "ctime": "2025-11-29T08:49:30.000Z"
    }
  ]
}
```

---

## Font API

### Get Font Group List
폰트 그룹 목록

```
GET /api/font/group_id_list
```

**Response**
```json
{
  "list": ["default-host-ko", "default-host-ja", "banner-basefont"]
}
```

### Get Font List by Group
그룹별 폰트 목록

```
GET /api/font/group/:font-group-id/list
```

**Response**
```json
{
  "font_group_id": "default-host-ko",
  "list": [
    {
      "key": "NotoSansKR-Regular",
      "family": "Noto Sans KR",
      "style": "Regular",
      "url": "https://.../NotoSansKR-Regular.woff"
    }
  ]
}
```
