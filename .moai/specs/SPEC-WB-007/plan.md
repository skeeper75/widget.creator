# SPEC-WB-007 구현 계획

---
spec_id: SPEC-WB-007
version: 1.0.0
methodology: hybrid (TDD for new code, DDD for existing code modifications)
---

## 1. 구현 단계

### Phase 1: DB 마이그레이션 (Primary Goal)

신규 `price_nl_history` 테이블 + Drizzle 스키마 + 마이그레이션 SQL

#### Step 1-1: price_nl_history 스키마 작성

- **파일**: `packages/db/src/schema/widget/04-price-nl-history.ts`
- **참조 패턴**: 기존 `03-constraint-nl-history.ts` 스타일 준수
- **접근법**: Drizzle ORM pgTable 정의 + export 타입
- **FK 참조**: `wb_products.id` (cascade), `product_price_configs.id` (set null)

#### Step 1-2: index.ts 업데이트 & Drizzle 마이그레이션

- **파일**: `packages/db/src/schema/widget/index.ts` — `priceNlHistory` export 추가
- **파일**: `packages/db/src/index.ts` — 필요시 업데이트
- **마이그레이션**: `drizzle/XXXX_add_price_nl_history.sql` 생성

---

### Phase 2: GLM 서비스 레이어 (Primary Goal)

z.ai API 통합 서비스 + tRPC 라우터

#### Step 2-1: GLM 서비스

- **파일**: `apps/web/app/api/_lib/services/glm.service.ts`
- **기능**: z.ai API 호출, JSON Schema 구조화 출력, 타임아웃(3초), 오류 처리
- **환경변수**: `GLM_API_KEY`, `GLM_MODEL` (default: glm-4.5), `GLM_BASE_URL`
- **참조**: OpenAI 호환 API — `response_format: { type: "json_object" }`
- **인터페이스**:
  ```typescript
  interface GlmService {
    convertConstraint(input: ConvertConstraintInput): Promise<ConstraintConversionOutput>;
    convertPriceRule(input: ConvertPriceRuleInput): Promise<PriceRuleConversionOutput>;
    suggestPriceMode(productDescription: string): Promise<PriceModeRecommendation>;
  }
  ```

#### Step 2-2: 변환 유틸 (Transformer)

- **파일**: `apps/web/app/api/trpc/utils/constraint-transformer.ts`
  - GLM 출력 → `recipe_constraints` 저장 형식 변환
  - 기존 `03-recipe-constraints.ts` 스키마 참조
- **파일**: `apps/web/app/api/trpc/utils/price-rule-transformer.ts`
  - GLM 출력 → `qty_discount` / `product_price_configs` 저장 형식 변환
  - Zod 스키마 검증 포함

#### Step 2-3: tRPC GLM 라우터

- **파일**: `apps/web/app/api/trpc/routers/glm.router.ts`
- **엔드포인트**:
  - `glm.convertConstraint` — NL → ECA 변환 (프리뷰, DB 저장 없음)
  - `glm.confirmConstraint` — 승인 + `recipe_constraints` + `constraint_nl_history` 저장
  - `glm.convertPriceRule` — NL → 가격룰 변환 (프리뷰)
  - `glm.confirmPriceRule` — 승인 + `qty_discount` or `product_price_configs` + `price_nl_history` 저장
- **보안**: 모든 프로시저 `protectedProcedure` 사용
- **Rate Limiting**: 하루 100건/recipeId 초과 시 경고 로깅

#### Step 2-4: 메인 라우터 등록

- **파일**: `apps/web/app/api/trpc/router.ts` — `glmRouter` 등록

---

### Phase 3: Admin UI NL 패널 (Secondary Goal)

Step 2, 3, 4에 통합되는 공통 GLM 자연어 입력 패널

#### Step 3-1: 공통 NL 패널 컴포넌트

- **파일**: `apps/admin/src/components/glm/nl-rule-panel.tsx`
- **기능**: 예제 버튼, Textarea 입력, "GLM 변환 실행" 버튼, 로딩 스피너
- **Props**: `mode: "constraint" | "price_rule" | "option_suggest"`, `recipeId`, `productId`
- **UX**: 500ms 디바운스 (입력 자동 변환은 버튼 클릭 시에만)

#### Step 3-2: 변환 결과 프리뷰 컴포넌트

- **파일**: `apps/admin/src/components/glm/conversion-preview.tsx`
- **기능**: 신뢰도 배지(%), ECA/가격룰 구조 테이블, "적용하기 / 편집 후 적용 / 취소" 버튼
- **신뢰도 0.85 이상**: 초록 배지 + "즉시 적용 가능" 표시
- **신뢰도 0.85 미만**: 주황 배지 + "검토 필요" 경고

#### Step 3-3: GLM 변환 React Hook

- **파일**: `apps/admin/src/hooks/use-glm-convert.ts`
- **기능**: tRPC mutation 래핑, 로딩/오류 상태 관리, 낙관적 UI

#### Step 3-4: 기존 Admin 페이지 NL 패널 통합

NL 패널을 아래 기존 페이지에 통합 (Collapsible 또는 Drawer 형태):

- **Step 4** `apps/admin/src/app/(dashboard)/products/[id]/constraints/page.tsx` — 제약조건 생성 섹션
- **Step 3** `apps/admin/src/app/(dashboard)/products/[id]/pricing/page.tsx` — 가격룰 섹션
- **Step 2** `apps/admin/src/app/(dashboard)/products/[id]/options/page.tsx` — 옵션값 제안 (최소 통합)

> **참조**: `260225_후니프린팅_인쇄자동주문견적시스템설계문서.md` 에서 제공된 Step별 UI 와이어프레임 준수

---

### Phase 4: 스킬 생성 (Secondary Goal)

인쇄 NLP 에이전트 도메인 스킬

#### Step 4-1: innojini-huni-nlp-builder 스킬 생성

- **파일**: `.claude/skills/innojini-huni-nlp-builder/SKILL.md`
- **내용**:
  - YAML 프론트매터 (name, description, triggers)
  - GLM 프롬프트 템플릿 3종 (ECA 제약, 수량할인, 가격모드 제안)
  - 인쇄 도메인 시스템 프롬프트
  - 8가지 후니프린팅 실제 규칙 few-shot 예제
  - 한국 인쇄업 용어 사전

---

### Phase 5: 테스트 (Final Goal)

#### Step 5-1: GLM 서비스 단위 테스트

- **파일**: `apps/web/__tests__/services/glm.test.ts`
- **접근**: `vi.mock('openai')` 또는 `msw`로 z.ai API 모킹
- **케이스**: 정상 변환, 타임아웃, 유효하지 않은 JSON 응답, API 키 없음

#### Step 5-2: 변환 유틸 테스트

- **파일**: `apps/web/__tests__/utils/constraint-transformer.test.ts`
- **파일**: `apps/web/__tests__/utils/price-rule-transformer.test.ts`
- **케이스**: 각 8종 액션 타입별 변환 검증, Zod 스키마 검증 실패 케이스

#### Step 5-3: tRPC 라우터 통합 테스트

- **파일**: `apps/web/__tests__/pricing/glm-router.test.ts`
- **케이스**: `convertConstraint` → `confirmConstraint` 플로우, `convertPriceRule` → `confirmPriceRule` 플로우, Rate Limit 검증

#### Step 5-4: DB 스키마 테스트

- **파일**: `packages/db/__tests__/schema/price-nl-history.test.ts`
- **케이스**: 필수 필드 검증, FK 제약, 인덱스 존재 확인

#### Step 5-5: Admin UI 컴포넌트 테스트

- **파일**: `apps/admin/__tests__/components/glm/nl-rule-panel.test.tsx`
- **파일**: `apps/admin/__tests__/components/glm/conversion-preview.test.tsx`
- **접근**: Testing Library + msw tRPC 모킹

---

## 2. 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| LLM API | z.ai GLM (glm-4.5/4.7) | 최신 안정 버전 |
| HTTP Client | openai SDK (OpenAI 호환) 또는 fetch | 프로젝트 기존 |
| ORM | Drizzle ORM | 프로젝트 기존 |
| API | tRPC | 프로젝트 기존 |
| Validation | Zod | 프로젝트 기존 |
| Admin UI | Next.js (App Router) | 프로젝트 기존 |
| UI Components | shadcn/ui | 프로젝트 기존 |
| Testing | Vitest + Testing Library | 프로젝트 기존 |
| DB | PostgreSQL + Drizzle | 프로젝트 기존 |

---

## 3. 리스크 분석

### R1: GLM API 응답 품질 불안정성

- **리스크**: glm-4.5가 인쇄 도메인 특화 규칙을 잘못 해석할 수 있음
- **완화**: 신뢰도 0.85 임계값 + 수동 편집 옵션 항상 제공
- **영향도**: 중간

### R2: z.ai API 연결성

- **리스크**: 한국에서 z.ai 서버까지 레이턴시 (중국 기반)
- **완화**: 3초 타임아웃 + retry 2회 로직; 대안: Anthropic API 교체 가능 구조
- **영향도**: 중간

### R3: GLM 비용 관리

- **리스크**: 자동 변환이 과도하게 API를 호출하면 비용 급증
- **완화**: 버튼 클릭 시에만 API 호출, Rate Limit 100건/일/recipeId
- **영향도**: 낮음

### R4: SPEC-WB-003 기존 API 호환성

- **리스크**: 기존 `recipe_constraints` 저장 로직과 충돌
- **완화**: 기존 코드를 건드리지 않고 `confirmConstraint`에서 동일 저장 패턴 사용
- **영향도**: 낮음

### R5: Admin 페이지 통합 복잡도

- **리스크**: 기존 Step 2/3/4 페이지가 아직 구현 중일 수 있음 (SPEC-WA-001)
- **완화**: NL 패널을 Collapsible 독립 컴포넌트로 설계해 기존 페이지와 느슨하게 결합
- **영향도**: 중간

---

## 4. 참조 구현 패턴

### 4.1 DB 스키마 패턴

기존 `packages/db/src/schema/widget/03-constraint-nl-history.ts`를 참조:
- `pgTable`, `serial PK`, FK 참조, `jsonb` 컬럼, `decimal(3,2)` 신뢰도, `boolean` 승인, timestamptz

### 4.2 tRPC 라우터 패턴

기존 `apps/web/app/api/trpc/routers/order.router.ts` 또는 `utils/create-crud-router.ts` 참조:
- Zod input 스키마, `protectedProcedure`, 트랜잭션 wrapping

### 4.3 GLM API 호출 패턴

```typescript
// OpenAI 호환 방식
const client = new OpenAI({
  apiKey: process.env.GLM_API_KEY,
  baseURL: process.env.GLM_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4',
});

const response = await client.chat.completions.create({
  model: process.env.GLM_MODEL ?? 'glm-4.5',
  messages: [{ role: 'user', content: nlText }],
  response_format: { type: 'json_object' },
  temperature: 0.1,
});
```

### 4.4 Admin UI 패턴

기존 `apps/admin/src/components/forms/paper-form.tsx` + `apps/admin/src/components/ui/` 컴포넌트 참조:
- shadcn/ui Textarea, Button, Badge, Collapsible
- tRPC hooks: `api.glm.convertConstraint.useMutation()`

---

## 5. 마일스톤 요약

| Priority | Phase | 범위 | 산출물 |
|----------|-------|------|--------|
| Primary Goal | Phase 1: DB | price_nl_history 테이블 | Drizzle 스키마 + SQL 마이그레이션 |
| Primary Goal | Phase 2: Backend | GLM 서비스 + tRPC 라우터 | 4개 엔드포인트 + 2개 변환 유틸 |
| Secondary Goal | Phase 3: Admin UI | NL 입력 패널 + 프리뷰 | 3개 컴포넌트 + 1개 hook |
| Secondary Goal | Phase 4: 스킬 | innojini-huni-nlp-builder | SKILL.md |
| Final Goal | Phase 5: 테스트 | 단위 + 통합 + 컴포넌트 | 85%+ 커버리지 |

---

## 6. 구현 의존성

```
Phase 1 (DB) → Phase 2 (Backend) → Phase 3 (UI) → Phase 5 (Tests)
                                  → Phase 4 (Skill) (독립)
```

Phase 4 (스킬)는 다른 Phase와 독립적으로 언제든 생성 가능.

---

*SPEC-WB-007 Implementation Plan v1.0.0*
*Methodology: Hybrid (TDD for new + DDD for existing)*
