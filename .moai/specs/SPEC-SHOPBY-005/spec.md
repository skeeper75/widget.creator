# SPEC-SHOPBY-005: 디자인 파일 업로드 및 관리

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-SHOPBY-005 |
| 제목 | 디자인 파일 업로드 및 관리 |
| 생성일 | 2026-02-22 |
| 상태 | Planned |
| 우선순위 | High |
| 담당 | expert-backend |
| 관련 SPEC | SPEC-SHOPBY-003 (위젯 SDK), SPEC-SHOPBY-004 (주문/결제) |
| 단계 | Phase 2 - 핵심 연동 개발 |

---

## 1. 환경 (Environment)

### 1.1 프로젝트 컨텍스트

인쇄 주문에 필수적인 디자인 파일(PDF, AI, PSD, JPG, PNG 등)의 업로드, 검증, 저장, 주문 연결 시스템을 구축한다. Shopby Storage API는 이미지 전용(12MB 제한)이므로, 대용량 인쇄 디자인 파일은 외부 스토리지(AWS S3 또는 GCS)를 통해 관리한다.

### 1.2 파일 환경

- **Shopby Storage API**: POST /storage/temporary-images (이미지 전용, 최대 12MB)
- **외부 스토리지**: AWS S3 또는 Google Cloud Storage (대용량 파일)
- **지원 파일 형식**: PDF, AI, PSD, EPS, JPG, PNG, TIFF
- **최대 파일 크기**: 이미지 12MB (Shopby), 일반 파일 100MB (외부 스토리지)
- **인쇄 해상도 기준**: 최소 300DPI

### 1.3 기술 환경

- **파일 업로드**: Presigned URL 기반 직접 업로드 (클라이언트 → S3)
- **이미지 처리**: Sharp (Node.js) - 리사이즈, 포맷 변환, 메타데이터 추출
- **PDF 처리**: pdf-lib 또는 pdf.js - 페이지 수, 크기, 해상도 검증
- **바이러스 스캔**: ClamAV 또는 클라우드 기반 스캔 서비스

---

## 2. 가정 (Assumptions)

### 2.1 기술적 가정

- A1: Shopby Storage API는 이미지(JPG, PNG, GIF, WebP)만 지원하며, PDF/AI 등은 업로드 불가하다
- A2: 외부 스토리지(S3)에 업로드된 파일의 URL을 Shopby optionInputs에 참조로 저장할 수 있다
- A3: Presigned URL은 업로드 시 5분 유효, 다운로드 시 24시간 유효하다
- A4: 파일 업로드는 위젯 내에서 주문 전에 수행되어야 한다

### 2.2 비즈니스 가정

- A5: 고객의 80%는 PDF 형식으로 디자인 파일을 업로드한다
- A6: 파일명은 후니프린팅 제작 워크플로우에 맞는 명명 규칙을 따라야 한다
- A7: 주문 후 파일 수정이 필요한 경우, 별도 파일 교체 워크플로우가 필요하다
- A8: 파일은 주문 완료 후 최소 1년간 보관되어야 한다

### 2.3 보안 가정

- A9: 업로드된 파일은 바이러스 스캔을 통과해야 한다
- A10: 파일 접근은 인증된 사용자(주문자, 관리자)만 가능해야 한다

---

## 3. 요구사항 (Requirements)

### 3.1 이미지 업로드 (Shopby Storage)

**R-FILE-001** [이벤트]: **WHEN** 고객이 위젯에서 이미지 파일(JPG, PNG)을 업로드하면, **THEN** 시스템은 Shopby Storage API (POST /storage/temporary-images)를 통해 이미지를 업로드하고 접근 URL을 반환해야 한다.

제한사항:
- 지원 형식: JPG, PNG, GIF, WebP
- 최대 크기: 12MB
- 용도: 상품 미리보기 이미지, 간단한 디자인 시안

### 3.2 대용량 파일 외부 스토리지 연동

**R-FILE-002** [이벤트]: **WHEN** 고객이 위젯에서 대용량 디자인 파일(PDF, AI, PSD 등)을 업로드하면, **THEN** 시스템은 외부 스토리지(AWS S3)에 Presigned URL을 통해 직접 업로드하고, 파일 메타데이터를 Widget Creator DB에 저장해야 한다.

업로드 플로우:
1. 위젯에서 파일 선택
2. Widget Creator API에 업로드 요청 → Presigned URL 발급
3. 클라이언트에서 S3에 직접 업로드 (멀티파트)
4. 업로드 완료 콜백 → 파일 메타데이터 저장
5. 파일 검증 (형식, 크기, 해상도) → 비동기 처리

지원 형식: PDF, AI, PSD, EPS, TIFF, JPG, PNG
최대 크기: 100MB

### 3.3 파일-주문 연결

**R-FILE-003** [유비쿼터스]: 시스템은 **항상** 업로드된 파일을 주문 아이템과 연결하여, optionInputs의 designFileUrl을 통해 파일에 접근할 수 있도록 해야 한다.

연결 구조:
- 파일 업로드 시: 임시 파일 레코드 생성 (상태: PENDING)
- 주문 생성 시: 파일 레코드를 주문에 연결 (상태: ATTACHED)
- 주문 완료 시: 파일 상태를 CONFIRMED로 변경
- 주문 취소 시: 파일 상태를 ORPHANED로 변경 (30일 후 자동 삭제)

### 3.4 파일 유효성 검증

**R-FILE-004** [이벤트]: **WHEN** 파일이 업로드되면, **THEN** 시스템은 파일 형식, 크기, 해상도를 검증하고, 검증 실패 시 사용자에게 구체적인 안내 메시지를 제공해야 한다.

검증 항목:
- 형식 검증: Magic bytes 기반 실제 파일 형식 확인 (확장자만으로 판단 금지)
- 크기 검증: 파일 크기 제한 (이미지 12MB, 일반 100MB)
- 해상도 검증: 인쇄 기준 300DPI 이상 권장 (미만 시 경고)
- 페이지 수 검증: PDF 페이지 수와 인쇄 사양 일치 여부
- 바이러스 스캔: 업로드 완료 후 비동기 스캔

검증 결과:
- VALID: 모든 검증 통과
- WARNING: 해상도 미달 등 경고 (주문 가능)
- INVALID: 형식/크기 불일치 (재업로드 필요)
- SCANNING: 바이러스 스캔 진행 중

### 3.5 파일명 체계

**R-FILE-005** [유비쿼터스]: 시스템은 **항상** 업로드된 파일을 후니프린팅 제작 워크플로우에 맞는 명명 규칙으로 저장해야 한다.

파일명 규칙:
```
{품목}_{사이즈}_{양단면}_{소재}_{거래처}_{고객명}_{파일번호}_{수량}.{확장자}
```

예시:
```
명함_90x50_양면_스노우화이트250g_직접주문_홍길동_001_200매.pdf
스티커_A4_단면_아트지150g_직접주문_김철수_001_500매.ai
```

### 3.6 주문 전/후 파일 워크플로우

**R-FILE-006** [상태]: **IF** 주문이 완료되지 않은 상태(장바구니, 주문서 작성 중)이면, **THEN** 시스템은 파일 교체 및 재업로드를 허용하고, **IF** 주문이 결제 완료된 상태이면, **THEN** 파일 교체는 관리자 승인을 거쳐야 한다.

주문 전:
- 파일 업로드, 교체, 삭제 자유
- 임시 파일 URL 발급 (24시간 유효)

주문 후:
- 파일 교체 요청 → 관리자 승인 → 새 파일 업로드 → 기존 파일 아카이브
- 제작 시작 전까지만 파일 교체 가능
- 제작 시작 후 파일 교체 불가 (재주문 필요)

---

## 4. 사양 (Specifications)

### 4.1 파일 메타데이터 모델

```
interface DesignFile {
  id: string;              // UUID
  orderId?: string;        // 연결된 주문 ID (nullable)
  orderItemId?: string;    // 연결된 주문 아이템 ID (nullable)
  originalName: string;    // 원본 파일명
  standardName: string;    // 표준 파일명 (명명 규칙 적용)
  mimeType: string;        // MIME 타입
  fileSize: number;        // 파일 크기 (bytes)
  storageType: 'SHOPBY' | 'S3';  // 저장소 유형
  storageKey: string;      // 저장소 내 키
  accessUrl: string;       // 접근 URL
  status: 'PENDING' | 'ATTACHED' | 'CONFIRMED' | 'ORPHANED' | 'ARCHIVED';
  validation: {
    formatValid: boolean;
    sizeValid: boolean;
    resolution: number;    // DPI
    resolutionValid: boolean;
    pageCount?: number;    // PDF 페이지 수
    virusScanStatus: 'PENDING' | 'CLEAN' | 'INFECTED';
  };
  metadata: {
    width?: number;        // 이미지/PDF 가로 (px/mm)
    height?: number;       // 이미지/PDF 세로 (px/mm)
    colorSpace?: string;   // CMYK, RGB 등
    pageCount?: number;    // PDF 페이지 수
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;        // 임시 파일 만료 시각
}
```

### 4.2 업로드 API 인터페이스

```
// Presigned URL 발급
POST /api/files/presigned-url
Request: {
  fileName: string;
  fileSize: number;
  mimeType: string;
  productId: string;
}
Response: {
  uploadUrl: string;       // S3 Presigned PUT URL
  fileId: string;          // 생성된 파일 레코드 ID
  expiresIn: 300;          // URL 유효 시간 (초)
}

// 업로드 완료 확인
POST /api/files/{fileId}/complete
Request: {
  etag: string;            // S3 응답 ETag
}
Response: {
  file: DesignFile;
  validation: ValidationResult;
}

// 파일-주문 연결
POST /api/files/{fileId}/attach
Request: {
  orderId: string;
  orderItemId: string;
}
Response: {
  file: DesignFile;
}
```

### 4.3 파일 저장소 구조

```
S3 버킷 구조:
widget-creator-files/
  temp/                    # 임시 파일 (30일 자동 삭제)
    {userId}/{fileId}/{originalName}
  orders/                  # 주문 연결 파일
    {year}/{month}/{orderId}/{standardName}
  archive/                 # 아카이브 (파일 교체 시 이전 버전)
    {year}/{month}/{orderId}/{fileId}/{standardName}
```

### 4.4 위험 분석

| 위험 | 영향도 | 발생 확률 | 대응 전략 |
|---|---|---|---|
| 대용량 파일 업로드 중 네트워크 끊김 | High | Medium | 멀티파트 업로드 + 재개 지원 |
| 바이러스 감염 파일 업로드 | Critical | Low | 비동기 바이러스 스캔 + 격리 |
| 파일 URL 만료로 주문 처리 불가 | High | Medium | 영구 URL 발급 (주문 확정 시) |
| S3 비용 증가 (대용량 파일 축적) | Medium | High | 수명 주기 정책 (1년 후 Glacier) |
| 파일명 인코딩 이슈 (한글 파일명) | Low | High | UTF-8 정규화 + URL 인코딩 |

---

## 5. 추적성 태그 (Traceability)

| TAG | 관련 요구사항 | 구현 위치 (예상) |
|---|---|---|
| TAG-FILE-SHOPBY | R-FILE-001 | packages/widget-sdk/src/upload/shopby-upload.ts |
| TAG-FILE-S3 | R-FILE-002 | apps/api/src/services/file-storage.service.ts |
| TAG-FILE-LINK | R-FILE-003 | apps/api/src/services/file-order-linker.service.ts |
| TAG-FILE-VALID | R-FILE-004 | apps/api/src/services/file-validator.service.ts |
| TAG-FILE-NAME | R-FILE-005 | apps/api/src/utils/file-naming.ts |
| TAG-FILE-FLOW | R-FILE-006 | apps/api/src/services/file-lifecycle.service.ts |

---

문서 버전: 1.0.0
