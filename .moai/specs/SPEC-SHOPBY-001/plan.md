# SPEC-SHOPBY-001 구현 계획: Shopby 플랫폼 분석 및 API 매핑

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-SHOPBY-001 |
| 단계 | Phase 1 - 분석 및 설계 |
| 일정 | Day 1-3 |
| 의존성 | SPEC-DATA-001 (완료) |
| 산출물 | API 매핑 문서, 데이터 모델 변환 가이드, 통합 아키텍처 |

---

## 마일스톤

### M1: API 문서 상세 분석 (Day 1-2) - Priority High

**목표**: Shopby API 전체 엔드포인트 조사 및 기능별 분류

**작업 목록**:
1. Shopby Shop API 12개 도메인 엔드포인트 수집 및 분류
   - 상품, 카테고리, 장바구니, 주문, 결제, 회원, 인증, 파일 업로드
2. Shopby Admin API 25개 도메인 중 핵심 엔드포인트 분석
   - 상품 관리, 주문 관리, 배송 설정, 회원 관리
3. 인증 흐름 분석 (Shop API OAuth 2.0 + Admin API 토큰)
4. API Rate Limit, Payload Size 등 제한사항 조사
5. Sandbox/테스트 환경 접근 방법 확인

**완료 기준**:
- API 매핑 테이블에 최소 30개 이상의 엔드포인트가 분류됨
- Shop API와 Admin API의 인증 흐름이 시퀀스 다이어그램으로 문서화됨
- API 제한사항 목록이 대응 전략과 함께 작성됨

### M2: 데이터 모델 매핑 작성 (Day 2-3) - Priority High

**목표**: Widget Creator 데이터 모델과 Shopby 데이터 모델 간 양방향 변환 규칙 수립

**작업 목록**:
1. Shopby mallProduct 구조 상세 분석
   - 상품 기본 정보, 옵션 구조(COMBINATION/REQUIRED/STANDARD), 가격 구조
2. Widget Creator PrintProduct (SPEC-DATA-001) ↔ Shopby mallProduct 필드 매핑
3. 옵션 매핑 전략 수립
   - SPEC-DATA-001 옵션 체인 (규격→용지→도수→인쇄방식→후가공) → Shopby COMBINATION 옵션
4. 가격 매핑 전략 수립
   - Widget Creator 동적 가격 → Shopby 정적 옵션 가격 (addPrice) 변환 규칙
5. 구매자작성형 옵션(optionInputs) 활용 전략 설계
6. extraJson 필드 스키마 설계 (위젯 설정 저장용)

**의존성**: M1 (API 구조 파악이 선행되어야 함)

**완료 기준**:
- 양방향 데이터 모델 변환 테이블이 모든 핵심 엔티티를 커버
- 가격 매핑 전략이 수립되고 한계점이 명시됨
- extraJson 스키마 초안이 완성됨

### M3: 통합 아키텍처 설계 (Day 3) - Priority High

**목표**: Widget Creator와 Shopby 간 전체 통합 아키텍처 확정

**작업 목록**:
1. 시스템 간 통신 흐름 설계 (Aurora Skin ↔ Widget SDK ↔ Shopby API ↔ WC API)
2. 인증 통합 전략 확정 (Shopby 세션과 Widget Creator 사용자 연결 방식)
3. 주문 데이터 흐름 설계 (위젯 선택 → optionInputs → 주문서 → 결제)
4. 파일 업로드 흐름 설계 (위젯 파일 선택 → Shopby Storage + 외부 스토리지)
5. 커스터마이제이션 포인트별 구현 난이도 및 우선순위 평가
6. 후속 SPEC(002~006)에 대한 기술적 방향성 제시

**의존성**: M1, M2 (API 분석 및 데이터 매핑 완료 후)

**완료 기준**:
- 통합 아키텍처 다이어그램이 완성됨
- 각 SPEC별 기술적 접근 방향이 확정됨
- 커스터마이제이션 포인트 목록이 우선순위와 함께 정리됨

---

## 기술적 접근

### API 분석 방법론

1. **문서 기반 분석**: Shopby 공식 API 문서를 체계적으로 분류
2. **Sandbox 검증**: 실제 API 호출로 문서 정확성 검증 (가능한 경우)
3. **비교 분석**: Widget Creator 기능 요구사항과 Shopby API 가용성 비교
4. **갭 분석**: Shopby로 충족 불가능한 요구사항 식별 및 대안 수립

### 산출물 형식

- API 매핑 문서: Markdown 테이블 + 상세 설명
- 데이터 모델 변환: TypeScript 인터페이스 + 매핑 테이블
- 아키텍처 다이어그램: 텍스트 기반 다이어그램 (Mermaid/ASCII)
- 제한사항 문서: 위험-영향-대응 매트릭스

---

## 위험 및 대응

| 위험 | 대응 |
|---|---|
| Shopby API 문서가 불완전하여 분석 지연 | Sandbox 환경에서 직접 검증, 커뮤니티/지원 채널 활용 |
| Admin API 접근 권한 미확보 | Shop API 우선 분석, Admin API는 문서 기반 분석 병행 |
| 데이터 모델 간 매핑 불가능한 영역 발견 | 커스텀 어댑터 계층 설계로 대응 |
| 통합 아키텍처의 복잡도가 예상 초과 | 단순화 전략 수립, 필수 기능 우선 구현 |

---

문서 버전: 1.0.0
