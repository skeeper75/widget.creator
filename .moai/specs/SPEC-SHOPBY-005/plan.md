# SPEC-SHOPBY-005 구현 계획: 디자인 파일 업로드 및 관리

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-SHOPBY-005 |
| 단계 | Phase 2 - 핵심 연동 개발 |
| 일정 | Day 15-18 |
| 의존성 | SPEC-SHOPBY-003 (위젯 SDK), SPEC-SHOPBY-004 (주문 연동) |
| 산출물 | 파일 업로드 서비스, 파일 검증 모듈, S3 연동, 위젯 업로드 UI |

---

## 마일스톤

### M1: 외부 스토리지 연동 및 Presigned URL (Day 15-16) - Priority Critical

**목표**: AWS S3 Presigned URL 기반 파일 업로드 시스템 구축

**작업 목록**:
1. AWS S3 클라이언트 설정
   - 버킷 생성 및 CORS 설정
   - IAM 역할/정책 설정 (최소 권한)
   - 수명 주기 정책 (temp/ 30일 자동 삭제, orders/ 1년 후 Glacier)
2. Presigned URL 발급 API 구현
   - POST /api/files/presigned-url
   - 파일 크기/형식 사전 검증
   - 파일 레코드 생성 (status: PENDING)
3. 업로드 완료 확인 API
   - POST /api/files/{fileId}/complete
   - S3 오브젝트 존재 확인
   - 파일 메타데이터 업데이트
4. Shopby Storage API 연동 (이미지 전용)
   - POST /storage/temporary-images 래퍼
   - 12MB 미만 이미지 자동 라우팅
5. 위젯 파일 업로드 UI 컴포넌트
   - 드래그앤드롭 + 파일 선택 버튼
   - 업로드 진행률 표시
   - 멀티파트 업로드 (대용량 파일)

**완료 기준**:
- Presigned URL로 S3에 파일 직접 업로드 동작
- 이미지 파일은 Shopby Storage API로 자동 라우팅
- 업로드 진행률이 위젯에 실시간 표시

### M2: 파일 검증 시스템 (Day 16-17) - Priority High

**목표**: 파일 형식, 크기, 해상도 검증 및 바이러스 스캔

**작업 목록**:
1. 파일 형식 검증 모듈
   - Magic bytes 기반 실제 형식 확인
   - 확장자-MIME 타입 교차 검증
   - 지원 형식: PDF, AI, PSD, EPS, TIFF, JPG, PNG
2. 해상도 검증 모듈
   - 이미지: EXIF/메타데이터에서 DPI 추출
   - PDF: 페이지 크기 + 이미지 해상도 분석
   - 300DPI 미만 경고, 150DPI 미만 차단
3. PDF 분석 모듈
   - 페이지 수 추출
   - 페이지 크기 (mm) 추출
   - 인쇄 사양과의 일치 검증 (예: 양면 인쇄 = 2페이지)
4. 바이러스 스캔 연동 (비동기)
   - ClamAV 연동 또는 AWS S3 Object Lambda
   - 스캔 완료 시 파일 상태 업데이트
5. 검증 결과 반환 API
   - VALID / WARNING / INVALID / SCANNING 상태 관리

**의존성**: M1 (파일 업로드 완료 후 검증 실행)

**완료 기준**:
- Magic bytes 기반 파일 형식 검증 동작
- PDF 파일의 페이지 수, 크기 정확히 추출
- 해상도 미달 시 경고 메시지 표시
- 바이러스 스캔 파이프라인 동작 (비동기)

### M3: 파일명 규칙 및 주문 연결 (Day 17-18) - Priority High

**목표**: 파일명 표준화 및 주문-파일 연결 시스템

**작업 목록**:
1. 파일명 생성기 구현
   - 인쇄 사양 데이터 → 표준 파일명 변환
   - 한글 처리 (NFD → NFC 정규화)
   - 특수문자 제거/치환
2. 파일-주문 연결 API
   - POST /api/files/{fileId}/attach
   - 파일 상태: PENDING → ATTACHED
   - S3 오브젝트 이동: temp/ → orders/
3. 파일 수명 주기 관리
   - 주문 완료: ATTACHED → CONFIRMED
   - 주문 취소: ATTACHED → ORPHANED (30일 후 삭제)
   - 파일 교체: 기존 파일 ARCHIVED, 새 파일 ATTACHED
4. 주문 후 파일 교체 워크플로우
   - 교체 요청 API
   - 관리자 승인 API
   - 기존 파일 아카이브 처리
5. 위젯 파일 관리 UI
   - 업로드된 파일 목록 표시
   - 파일 미리보기 (이미지/PDF 첫 페이지)
   - 파일 삭제/교체 버튼

**의존성**: M1, M2

**완료 기준**:
- 파일명이 표준 규칙에 맞게 자동 생성됨
- 주문 생성 시 파일이 정상 연결됨
- S3에서 temp/ → orders/로 파일 이동 확인
- 주문 후 파일 교체 워크플로우 동작

---

## 기술적 접근

### 업로드 전략

```
파일 크기/형식에 따른 업로드 경로:
- 이미지 (JPG/PNG) + 12MB 미만: Shopby Storage API
- 이미지 (JPG/PNG) + 12MB 이상: S3 Presigned URL
- PDF/AI/PSD/기타: S3 Presigned URL (항상)

대용량 파일 (>5MB):
- S3 멀티파트 업로드
- 5MB 청크 단위
- 재개 가능 (실패한 청크만 재전송)
```

### 모듈 구조 (예상)

```
apps/api/src/
  services/
    file-storage.service.ts        # S3/Shopby 저장소 추상화
    file-validator.service.ts      # 파일 검증 (형식/크기/해상도)
    file-order-linker.service.ts   # 파일-주문 연결
    file-lifecycle.service.ts      # 파일 수명 주기 관리
  utils/
    file-naming.ts                 # 표준 파일명 생성
    magic-bytes.ts                 # 파일 형식 감지
    pdf-analyzer.ts                # PDF 메타데이터 분석

packages/widget-sdk/src/
  upload/
    file-uploader.ts               # 위젯 파일 업로드 핸들러
    shopby-upload.ts               # Shopby Storage 연동
    s3-direct-upload.ts            # S3 Presigned URL 업로드
    upload-progress.ts             # 업로드 진행률 관리
  ui/
    file-drop-zone.ts              # 드래그앤드롭 영역
    file-preview.ts                # 파일 미리보기
    file-list.ts                   # 업로드 파일 목록
```

---

## 위험 및 대응

| 위험 | 대응 |
|---|---|
| 대용량 파일 업로드 시 브라우저 메모리 부족 | 스트리밍 업로드 + 청크 분할 |
| S3 Presigned URL 만료로 업로드 실패 | URL 유효 시간 충분히 설정 (10분) + 재발급 로직 |
| PDF 해상도 분석 서버 부하 | 비동기 큐 처리 + 결과 캐싱 |
| 한글 파일명 인코딩 이슈 | NFC 정규화 + URI 인코딩 |
| 바이러스 스캔 지연으로 주문 지연 | 스캔 전 주문 허용, 감염 파일 발견 시 별도 처리 |

---

문서 버전: 1.0.0
