# Shopby 플랫폼 통합 마스터 플랜

---

## 프로젝트 개요

| 항목 | 값 |
|------|------|
| 프로젝트 | Widget Creator x Shopby (NHN Commerce) 통합 |
| 목표 | Shopby 기반 인쇄 주문 사이트 구축 |
| 기간 | 40일 (2026-02-22 ~ 2026-04-02) |
| 선행 완료 | SPEC-DATA-001 (인쇄 지식 DB, 옵션 엔진, 가격 엔진) |
| SPEC 수 | 6개 (SPEC-SHOPBY-001 ~ 006) |

---

## SPEC 의존성 관계

```
SPEC-DATA-001 (완료)
    |
    v
SPEC-SHOPBY-001 (API 매핑)
    |
    v
SPEC-SHOPBY-002 (상품 등록)
    |
    +---------+---------+
    |                   |
    v                   v
SPEC-SHOPBY-003     SPEC-SHOPBY-004
(위젯 임베딩)       (주문/결제)     <- 병렬 진행
    |                   |
    +---------+---------+
              |
    +---------+---------+
    |                   |
    v                   v
SPEC-SHOPBY-005     SPEC-SHOPBY-006
(파일 업로드)       (주문 처리/Admin)  <- 병렬 진행
    |                   |
    +---------+---------+
              |
              v
      통합 테스트 / 안정화 / 출시
```

---

## 40일 마스터 플랜 (2026-02-22 ~ 2026-04-02)

### Phase 1: 분석 및 설계 (Day 1-7)

#### SPEC-SHOPBY-001: Shopby API 분석 (Day 1-3) - Priority Critical

| Day | 작업 | 산출물 |
|-----|------|--------|
| 1-2 | Shop/Admin API 전체 엔드포인트 분석 | API 매핑 테이블 (30+ 엔드포인트) |
| 2-3 | 데이터 모델 매핑 (PrintProduct ↔ mallProduct) | 변환 매핑 문서 |
| 3 | 통합 아키텍처 설계, 인증 흐름 분석 | 아키텍처 다이어그램, 인증 가이드 |

**핵심 리스크**: API 문서 불완전, 동적 가격 미지원
**마일스톤 완료 기준**: API 매핑 문서 + 아키텍처 설계 + 후속 SPEC 기술 방향 확정

#### SPEC-SHOPBY-002: 상품 등록 전략 설계 및 구현 (Day 4-7) - Priority Critical

| Day | 작업 | 산출물 |
|-----|------|--------|
| 4-5 | 상품-옵션 매퍼 구현 (COMBINATION/REQUIRED/STANDARD) | option-mapper.ts |
| 5-6 | 가격 매핑 + extraJson 설정 + optionInputs | price-mapper, extra-json-mapper |
| 6-7 | 배치 등록 도구 + 카테고리 설정 | shopby-product.service.ts |

**핵심 리스크**: 옵션 조합 수 초과, addPrice 계산 정합성
**마일스톤 완료 기준**: 5개 인쇄 상품 Shopby 정상 등록 + 테스트 커버리지 85%

---

### Phase 2: 핵심 연동 개발 (Day 8-21)

#### SPEC-SHOPBY-003: 위젯 임베딩 (Day 8-14) - Priority Critical

| Day | 작업 | 산출물 |
|-----|------|--------|
| 8-9 | 위젯 SDK 코어 (Vite 빌드, Shadow DOM, 초기화) | widget-sdk core |
| 10-11 | 옵션 선택 UI + 가격 표시 + 반응형 | option-form, price-panel |
| 12-13 | Shopby 브리지 (장바구니, 즉시구매, 인증) | shopby-bridge.ts |
| 14 | Aurora Skin 통합 테스트 + 성능 최적화 | gzip < 50KB, FMP < 2s |

**핵심 리스크**: Aurora Skin 스크립트 주입 제약, CSS 충돌, 번들 크기
**마일스톤 완료 기준**: Aurora Skin에서 위젯 렌더링 + 옵션 선택 + 장바구니 연동

#### SPEC-SHOPBY-004: 주문/결제 연동 (Day 8-14, 병렬) - Priority Critical

| Day | 작업 | 산출물 |
|-----|------|--------|
| 8-10 | 주문서 생성 + optionInputs 빌더 | order-bridge.ts |
| 10-11 | 가격 검증 서비스 (3단계: 정상/경고/차단) | price-verification.service.ts |
| 11-13 | PG 결제 연동 (KCP, 카카오페이, 네이버페이) | payment-bridge.ts |
| 13-14 | E2E 주문-결제 플로우 테스트 | 통합 테스트 |

**핵심 리스크**: 위젯 가격 vs Shopby 가격 불일치, PG 결제 SDK 호환성
**마일스톤 완료 기준**: 위젯 옵션 선택 → Shopby 주문 → PG 결제 완료

#### SPEC-SHOPBY-005: 파일 업로드 (Day 15-18) - Priority High

| Day | 작업 | 산출물 |
|-----|------|--------|
| 15-16 | S3 Presigned URL + Shopby Storage 연동 | file-storage.service.ts |
| 16-17 | 파일 검증 (형식/크기/해상도/바이러스) | file-validator.service.ts |
| 17-18 | 파일명 규칙 + 주문-파일 연결 + 수명주기 | file-lifecycle.service.ts |

**핵심 리스크**: 대용량 파일 업로드 중단, PDF 해상도 분석 서버 부하
**마일스톤 완료 기준**: PDF 업로드 → S3 저장 → 주문 연결 → 검증 완료

#### SPEC-SHOPBY-006: 주문 처리/Admin (Day 15-21) - Priority High

| Day | 작업 | 산출물 |
|-----|------|--------|
| 15-17 | 주문 상태 8단계 워크플로우 + 폴링 시스템 | order-status.service.ts |
| 17-18 | MES 브리지 (제작 작업 전달/콜백) | mes-bridge.service.ts |
| 18-19 | 클레임 처리 + 배송 설정 | claim-handler, delivery-config |
| 19-20 | 알림 시스템 (알림톡/이메일) | notification.service.ts |
| 20-21 | 관리자 대시보드 (Optional) | admin dashboard |

**핵심 리스크**: Webhook 미지원, MES 인터페이스 미확정, 배송 API 불완전
**마일스톤 완료 기준**: 주문 상태 관리 + MES 전달 + 알림 발송

---

### Phase 3: 통합 및 테스트 (Day 22-28)

| Day | 작업 | 상세 |
|-----|------|------|
| 22-23 | E2E 통합 테스트 (전체 플로우) | 상품 조회 → 위젯 옵션 선택 → 파일 업로드 → 주문 → 결제 → 제작 → 배송 |
| 24-25 | 크로스 브라우저 테스트 | Chrome, Safari, Samsung Internet, Firefox |
| 25 | 모바일 테스트 | iOS Safari, Android Chrome, 반응형 검증 |
| 26-27 | 성능 최적화 | 위젯 로딩 시간, API 응답 시간, 파일 업로드 속도 |
| 27-28 | 버그 수정 및 안정화 | P0/P1 버그 우선 수정 |

**Phase 3 완료 기준**:
- E2E 전체 플로우 (주문 → 결제 → 제작 → 배송) 정상 동작
- 3대 주요 브라우저에서 무결함 동작
- 위젯 FMP 2초 미만, 번들 50KB 미만

---

### Phase 4: 안정화 및 출시 준비 (Day 29-35)

| Day | 작업 | 상세 |
|-----|------|------|
| 29-31 | UAT (사용자 수용 테스트) | 내부 팀 실사용 테스트, 실제 인쇄 주문 처리 |
| 31-32 | UAT 피드백 반영 | UX 개선, 에러 메시지 개선, 플로우 최적화 |
| 32-33 | 운영 환경 인프라 준비 | S3 프로덕션 버킷, 도메인 설정, SSL, CDN |
| 33-34 | 프로덕션 데이터 마이그레이션 | 상품 등록, 카테고리 설정, 배송 템플릿 |
| 34-35 | 운영 문서 작성 | 운영 가이드, 장애 대응 매뉴얼, FAQ |

**Phase 4 완료 기준**:
- UAT 통과 (P0 버그 0건)
- 프로덕션 인프라 구성 완료
- 운영 문서 작성 완료

---

### Phase 5: 소프트 론칭 (Day 36-40)

| Day | 작업 | 상세 |
|-----|------|------|
| 36-37 | 스테이징 환경 최종 검증 | 프로덕션 동일 환경에서 전체 플로우 검증 |
| 37 | PG 실거래 테스트 | 실제 결제 → 취소 플로우 검증 |
| 38 | 프로덕션 배포 | Shopby 프로덕션 상품 등록 + 위젯 CDN 배포 |
| 38-39 | 모니터링 강화 | 에러율, 응답시간, 결제 성공률, 주문 처리 현황 |
| 39-40 | 핫픽스 및 안정화 | 프로덕션 이슈 즉시 대응 |

**Phase 5 완료 기준**:
- 프로덕션 배포 완료
- 실거래 주문 정상 처리 확인
- 모니터링 대시보드 가동
- 48시간 안정 운영 확인

---

## 핵심 위험 관리

### 전체 프로젝트 Top 5 위험

| 순위 | 위험 | 영향도 | 대응 전략 | 관련 SPEC |
|---|---|---|---|---|
| 1 | 위젯 가격 ↔ Shopby 가격 불일치 | Critical | 3단계 검증 + 주기적 가격 동기화 | 002, 003, 004 |
| 2 | Aurora Skin 위젯 임베딩 제약 | Critical | Shadow DOM + iframe 폴백 | 003 |
| 3 | Webhook 미지원으로 주문 감지 지연 | High | 1분 폴링 + 수동 확인 | 006 |
| 4 | 옵션 조합 수 Shopby 한도 초과 | High | 대표 조합 + 위젯 전용 옵션 | 002 |
| 5 | 대용량 파일(PDF) 업로드 안정성 | High | 멀티파트 + 재개 지원 | 005 |

### 위험 모니터링 주기

- Day 3 (Phase 1 중간): API 분석 완성도 확인, 블로커 여부 판단
- Day 7 (Phase 1 완료): 상품 등록 5건 확인, Phase 2 진입 가/부 판단
- Day 14 (Phase 2 중간): 위젯+주문 연동 동작 확인, 크리티컬 이슈 식별
- Day 21 (Phase 2 완료): 전체 기능 동작 확인, Phase 3 진입 판단
- Day 28 (Phase 3 완료): E2E 테스트 통과율, 프로덕션 준비 상태 판단

---

## 기술 스택 요약

| 영역 | 기술 | 비고 |
|---|---|---|
| 프론트엔드 (위젯) | Preact/Vanilla JS, Vite 6.x, Shadow DOM | gzip < 50KB |
| 백엔드 | Node.js 22.x, TypeScript 5.7+, Prisma 6.x | Turborepo 모노레포 |
| 데이터베이스 | PostgreSQL 16.x (JSONB) | SPEC-DATA-001 스키마 확장 |
| 외부 스토리지 | AWS S3 (Presigned URL) | 대용량 디자인 파일 |
| 인증 | Shopby OAuth 2.0 | 소셜 로그인 포함 |
| 결제 | Shopby PG (KCP, INICIS, 카카오/네이버/토스) | Shopby 결제 SDK |
| 알림 | 카카오 알림톡, AWS SES | 이메일 폴백 |
| 검증 | Zod 3.x | 요청/응답 스키마 검증 |
| 테스트 | Vitest 3.x, Playwright | 단위/통합/E2E |
| CI/CD | GitHub Actions | 자동 배포 파이프라인 |

---

## 인력/리소스 요구사항

| 역할 | 담당 Phase | 주요 작업 |
|---|---|---|
| 백엔드 개발자 | Phase 1-5 | API 연동, 상품 등록, 주문 처리, MES 브리지 |
| 프론트엔드 개발자 | Phase 2-4 | 위젯 SDK, Aurora Skin 임베딩, 관리자 대시보드 |
| QA 엔지니어 | Phase 3-5 | 통합 테스트, UAT, 크로스 브라우저 테스트 |
| 인프라 엔지니어 | Phase 4-5 | S3 설정, CDN, 모니터링, 프로덕션 배포 |
| PM/기획자 | Phase 1, 4-5 | 요구사항 확인, UAT 조율, 출시 관리 |

---

## 성공 지표

| 지표 | 목표 | 측정 방법 |
|---|---|---|
| 주문 완료율 | 80% 이상 | (결제 완료 건수 / 주문서 생성 건수) |
| 위젯 로딩 시간 | FMP 2초 미만 | Lighthouse 측정 |
| 결제 성공률 | 95% 이상 | PG 결제 성공/시도 비율 |
| 주문 처리 시간 | 결제 → 출고 평균 3 영업일 | 주문 상태 이력 분석 |
| 클레임 발생률 | 5% 미만 | (클레임 건수 / 전체 주문 건수) |
| 위젯 번들 크기 | gzip 50KB 미만 | 빌드 산출물 측정 |

---

문서 버전: 1.0.0
최종 수정일: 2026-02-22
