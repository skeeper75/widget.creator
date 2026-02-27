-- =============================================================================
-- Migration: 0003_add_korean_comments.sql
-- Purpose: Add Korean-language COMMENT ON statements for all tables and columns
-- Coverage: Widget Builder (packages/db/src/schema/widget/)
--           Huni Integration (packages/shared/src/db/schema/)
-- =============================================================================

-- =============================================================================
-- WIDGET BUILDER DOMAIN (packages/db/src/schema/widget/)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- option_element_types (01-element-types.ts)
-- 옵션 타입 어휘 사전
-- -----------------------------------------------------------------------------
COMMENT ON TABLE option_element_types IS '옵션 타입 어휘 사전: 위젯 빌더에서 사용 가능한 모든 옵션 타입을 정의하는 마스터 데이터';

COMMENT ON COLUMN option_element_types.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN option_element_types.type_key IS '옵션 타입 고유 식별자 (예: SIZE, PAPER, COLOR, FINISHING)';
COMMENT ON COLUMN option_element_types.type_name_ko IS '옵션 타입 한국어 표시명';
COMMENT ON COLUMN option_element_types.type_name_en IS '옵션 타입 영문 표시명';
COMMENT ON COLUMN option_element_types.ui_control IS 'UI 컨트롤 종류 (예: select, radio, chip, slider 등)';
COMMENT ON COLUMN option_element_types.option_category IS '옵션 카테고리 분류 (예: print, material, finishing, delivery)';
COMMENT ON COLUMN option_element_types.allows_custom IS '사용자 정의 값 입력 허용 여부 (SIZE 타입의 사이즈 직접 입력 등)';
COMMENT ON COLUMN option_element_types.display_order IS '옵션 타입 목록 표시 순서';
COMMENT ON COLUMN option_element_types.is_active IS '활성 상태 여부 (비활성 시 위젯에서 노출되지 않음)';
COMMENT ON COLUMN option_element_types.description IS '옵션 타입에 대한 부가 설명';
COMMENT ON COLUMN option_element_types.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN option_element_types.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- product_categories (02-product-categories.ts)
-- 상품 카테고리 계층
-- -----------------------------------------------------------------------------
COMMENT ON TABLE product_categories IS '상품 카테고리 계층 루트: 위젯 빌더 상품을 분류하는 계층형 카테고리 트리';

COMMENT ON COLUMN product_categories.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN product_categories.name IS '카테고리 표시명';
COMMENT ON COLUMN product_categories.slug IS '카테고리 URL 슬러그 (고유값)';
COMMENT ON COLUMN product_categories.parent_id IS '상위 카테고리 ID (NULL이면 최상위 카테고리)';
COMMENT ON COLUMN product_categories.depth IS '카테고리 계층 깊이 (0: 최상위, 1: 2단계, 2: 3단계)';
COMMENT ON COLUMN product_categories.display_order IS '카테고리 목록 표시 순서';
COMMENT ON COLUMN product_categories.is_active IS '활성 상태 여부';
COMMENT ON COLUMN product_categories.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN product_categories.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- wb_products (02-products.ts)
-- 위젯 빌더 상품 마스터
-- -----------------------------------------------------------------------------
COMMENT ON TABLE wb_products IS '위젯 빌더 상품 마스터: 위젯으로 주문 가능한 상품 목록과 외부 시스템 연동 코드를 관리';

COMMENT ON COLUMN wb_products.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN wb_products.name IS '상품 표시명';
COMMENT ON COLUMN wb_products.slug IS '상품 URL 슬러그 (고유값)';
COMMENT ON COLUMN wb_products.category_id IS '상품 카테고리 ID (product_categories 참조)';
COMMENT ON COLUMN wb_products.edicus_code IS '에디커스 통합 디자인 에디터 상품 코드 (불변값 - 생성 후 변경 불가)';
COMMENT ON COLUMN wb_products.mes_code IS 'MES(생산관리시스템) 연동 상품 코드';
COMMENT ON COLUMN wb_products.shopby_product_no IS '샵바이 쇼핑몰 플랫폼 상품 번호';
COMMENT ON COLUMN wb_products.description IS '상품 상세 설명';
COMMENT ON COLUMN wb_products.is_active IS '활성 상태 여부 (비활성 시 위젯에서 노출되지 않음)';
COMMENT ON COLUMN wb_products.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN wb_products.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- product_recipes (02-product-recipes.ts)
-- 상품 레시피 버전 관리
-- -----------------------------------------------------------------------------
COMMENT ON TABLE product_recipes IS '상품 레시피 버전 관리: 상품별 옵션 구성과 가격 계산 방식을 버전별로 관리';

COMMENT ON COLUMN product_recipes.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN product_recipes.product_id IS '소속 상품 ID (wb_products 참조)';
COMMENT ON COLUMN product_recipes.version IS '레시피 버전 번호 (상품당 순차 증가)';
COMMENT ON COLUMN product_recipes.name IS '레시피 버전 식별명';
COMMENT ON COLUMN product_recipes.status IS '레시피 상태 (draft: 작성중, active: 활성, archived: 보관)';
COMMENT ON COLUMN product_recipes.published_at IS '레시피 활성화(게시) 일시';
COMMENT ON COLUMN product_recipes.created_by IS '레시피 생성자 식별자';
COMMENT ON COLUMN product_recipes.is_active IS '현재 활성 레시피 여부 (상품당 하나만 활성 가능)';
COMMENT ON COLUMN product_recipes.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN product_recipes.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- option_element_choices (02-element-choices.ts)
-- 옵션 타입별 선택지 라이브러리
-- -----------------------------------------------------------------------------
COMMENT ON TABLE option_element_choices IS '옵션 타입별 선택지 라이브러리: 각 옵션 타입에서 사용 가능한 전체 선택지 풀 (스파스 컬럼 설계: SIZE/PAPER/FINISHING 타입에 따라 사용하는 컬럼이 다름)';

COMMENT ON COLUMN option_element_choices.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN option_element_choices.element_type_id IS '소속 옵션 타입 ID (option_element_types 참조)';
COMMENT ON COLUMN option_element_choices.choice_key IS '선택지 고유 식별자 (예: A4, ART_170, SADDLE_STITCH)';
COMMENT ON COLUMN option_element_choices.label_ko IS '선택지 한국어 표시명';
COMMENT ON COLUMN option_element_choices.label_en IS '선택지 영문 표시명';
COMMENT ON COLUMN option_element_choices.width_mm IS '사이즈 타입: 재단 폭 (mm) - SIZE 타입에서만 사용';
COMMENT ON COLUMN option_element_choices.height_mm IS '사이즈 타입: 재단 높이 (mm) - SIZE 타입에서만 사용';
COMMENT ON COLUMN option_element_choices.bleed_mm IS '사이즈 타입: 재단 여백(도련) (mm) - SIZE 타입에서만 사용';
COMMENT ON COLUMN option_element_choices.paper_weight IS '용지 타입: 용지 평량 (g/m²) - PAPER 타입에서만 사용';
COMMENT ON COLUMN option_element_choices.paper_texture IS '용지 타입: 용지 질감 분류 - PAPER 타입에서만 사용';
COMMENT ON COLUMN option_element_choices.finishing_group IS '후가공 타입: 후가공 그룹 분류 - FINISHING 타입에서만 사용';
COMMENT ON COLUMN option_element_choices.display_order IS '선택지 목록 표시 순서';
COMMENT ON COLUMN option_element_choices.is_active IS '활성 상태 여부';
COMMENT ON COLUMN option_element_choices.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN option_element_choices.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- recipe_option_bindings (02-recipe-option-bindings.ts)
-- 레시피-옵션 바인딩
-- -----------------------------------------------------------------------------
COMMENT ON TABLE recipe_option_bindings IS '레시피-옵션 바인딩: 특정 레시피에 포함되는 옵션 타입과 UI 표시 방식을 정의 (display_order는 UI 노출 순서, processing_order는 가격 계산 의존성 순서로 별도 관리)';

COMMENT ON COLUMN recipe_option_bindings.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN recipe_option_bindings.recipe_id IS '소속 레시피 ID (product_recipes 참조)';
COMMENT ON COLUMN recipe_option_bindings.element_type_id IS '바인딩된 옵션 타입 ID (option_element_types 참조)';
COMMENT ON COLUMN recipe_option_bindings.display_order IS 'UI에서 옵션 표시 순서 (사용자 화면 기준)';
COMMENT ON COLUMN recipe_option_bindings.processing_order IS '가격 계산 처리 순서 (의존성 기준, display_order와 다를 수 있음)';
COMMENT ON COLUMN recipe_option_bindings.is_required IS '필수 선택 옵션 여부';
COMMENT ON COLUMN recipe_option_bindings.is_visible IS 'UI에 표시 여부 (내부 계산용 숨김 옵션 지원)';
COMMENT ON COLUMN recipe_option_bindings.default_choice_id IS '기본 선택값 ID (option_element_choices 참조)';
COMMENT ON COLUMN recipe_option_bindings.is_active IS '활성 상태 여부';
COMMENT ON COLUMN recipe_option_bindings.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN recipe_option_bindings.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- recipe_choice_restrictions (02-recipe-choice-restrictions.ts)
-- 레시피별 허용/제외 선택지
-- -----------------------------------------------------------------------------
COMMENT ON TABLE recipe_choice_restrictions IS '레시피별 허용/제외 선택지: 특정 레시피에서 허용 또는 제외할 선택지를 화이트리스트/블랙리스트 방식으로 관리';

COMMENT ON COLUMN recipe_choice_restrictions.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN recipe_choice_restrictions.recipe_id IS '소속 레시피 ID (product_recipes 참조)';
COMMENT ON COLUMN recipe_choice_restrictions.element_type_id IS '대상 옵션 타입 ID (option_element_types 참조)';
COMMENT ON COLUMN recipe_choice_restrictions.choice_id IS '제한 대상 선택지 ID (option_element_choices 참조)';
COMMENT ON COLUMN recipe_choice_restrictions.restriction_type IS '제한 유형 (allow: 허용 목록, deny: 제외 목록)';
COMMENT ON COLUMN recipe_choice_restrictions.is_active IS '활성 상태 여부';
COMMENT ON COLUMN recipe_choice_restrictions.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN recipe_choice_restrictions.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- addon_groups (03-addon-groups.ts)
-- 부가 상품 그룹
-- -----------------------------------------------------------------------------
COMMENT ON TABLE addon_groups IS '부가 상품 그룹: 레시피에 추가할 수 있는 부가 상품(파우치, 가방 등)의 그룹 정의';

COMMENT ON COLUMN addon_groups.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN addon_groups.recipe_id IS '소속 레시피 ID (product_recipes 참조)';
COMMENT ON COLUMN addon_groups.name IS '부가 상품 그룹명';
COMMENT ON COLUMN addon_groups.display_order IS '그룹 목록 표시 순서';
COMMENT ON COLUMN addon_groups.is_required IS '필수 선택 여부 (true이면 반드시 선택해야 주문 가능)';
COMMENT ON COLUMN addon_groups.is_active IS '활성 상태 여부';
COMMENT ON COLUMN addon_groups.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN addon_groups.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- addon_group_items (03-addon-group-items.ts)
-- 부가 상품 그룹 항목
-- -----------------------------------------------------------------------------
COMMENT ON TABLE addon_group_items IS '부가 상품 그룹 항목: 부가 상품 그룹에 속하는 개별 부가 상품 항목과 가격 정보';

COMMENT ON COLUMN addon_group_items.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN addon_group_items.addon_group_id IS '소속 부가 상품 그룹 ID (addon_groups 참조)';
COMMENT ON COLUMN addon_group_items.name IS '부가 상품 항목명';
COMMENT ON COLUMN addon_group_items.description IS '부가 상품 항목 설명';
COMMENT ON COLUMN addon_group_items.price IS '부가 상품 단가 (원화)';
COMMENT ON COLUMN addon_group_items.display_order IS '항목 목록 표시 순서';
COMMENT ON COLUMN addon_group_items.is_active IS '활성 상태 여부';
COMMENT ON COLUMN addon_group_items.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN addon_group_items.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- constraint_templates (03-constraint-templates.ts)
-- ECA 제약 조건 템플릿
-- -----------------------------------------------------------------------------
COMMENT ON TABLE constraint_templates IS 'ECA 제약 조건 템플릿: 재사용 가능한 이벤트-조건-액션(ECA) 규칙 템플릿 라이브러리';

COMMENT ON COLUMN constraint_templates.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN constraint_templates.name IS '템플릿 이름';
COMMENT ON COLUMN constraint_templates.description IS '템플릿 목적 및 사용 방법 설명';
COMMENT ON COLUMN constraint_templates.trigger_type IS '트리거 이벤트 유형 (예: option_change, quantity_change)';
COMMENT ON COLUMN constraint_templates.condition_schema IS '조건 JSON 스키마 정의';
COMMENT ON COLUMN constraint_templates.action_schema IS '액션 JSON 스키마 정의';
COMMENT ON COLUMN constraint_templates.is_active IS '활성 상태 여부';
COMMENT ON COLUMN constraint_templates.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN constraint_templates.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- constraint_nl_history (03-constraint-nl-history.ts)
-- NL 제약 조건 해석 이력
-- -----------------------------------------------------------------------------
COMMENT ON TABLE constraint_nl_history IS 'NL 제약 조건 해석 이력: 자연어(Natural Language)로 입력된 제약 조건을 AI가 ECA 규칙으로 변환한 이력 추적';

COMMENT ON COLUMN constraint_nl_history.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN constraint_nl_history.recipe_id IS '소속 레시피 ID (product_recipes 참조)';
COMMENT ON COLUMN constraint_nl_history.nl_input IS '사용자가 입력한 자연어 제약 조건 원문';
COMMENT ON COLUMN constraint_nl_history.interpreted_rule IS 'AI가 해석하여 생성한 ECA 규칙 JSON';
COMMENT ON COLUMN constraint_nl_history.confidence_score IS 'AI 해석 신뢰도 점수 (0.0 ~ 1.0)';
COMMENT ON COLUMN constraint_nl_history.status IS '해석 상태 (pending: 대기, accepted: 승인, rejected: 거부)';
COMMENT ON COLUMN constraint_nl_history.accepted_by IS '규칙 승인자 식별자';
COMMENT ON COLUMN constraint_nl_history.accepted_at IS '규칙 승인 일시';
COMMENT ON COLUMN constraint_nl_history.created_at IS '레코드 생성일시 (UTC)';

-- -----------------------------------------------------------------------------
-- recipe_constraints (03-recipe-constraints.ts)
-- ECA 제약 조건 규칙
-- -----------------------------------------------------------------------------
COMMENT ON TABLE recipe_constraints IS 'ECA 제약 조건 규칙: 레시피별 이벤트-조건-액션 형식의 UI 동적 제어 규칙 (trigger_values: 감지할 선택값 목록, actions: 실행할 액션 배열 JSONB)';

COMMENT ON COLUMN recipe_constraints.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN recipe_constraints.recipe_id IS '소속 레시피 ID (product_recipes 참조)';
COMMENT ON COLUMN recipe_constraints.template_id IS '기반 템플릿 ID (constraint_templates 참조, NULL이면 커스텀 규칙)';
COMMENT ON COLUMN recipe_constraints.name IS '제약 조건 규칙 이름';
COMMENT ON COLUMN recipe_constraints.trigger_element_type_id IS '트리거 옵션 타입 ID (option_element_types 참조)';
COMMENT ON COLUMN recipe_constraints.trigger_values IS '트리거 조건 감지값 목록 (JSONB 배열, 예: ["A4", "A5"])';
COMMENT ON COLUMN recipe_constraints.actions IS '트리거 발동 시 실행할 액션 배열 (JSONB, 예: [{type: "hide", target: "FINISHING"}])';
COMMENT ON COLUMN recipe_constraints.priority IS '동일 트리거 규칙 실행 우선순위 (낮을수록 먼저 실행)';
COMMENT ON COLUMN recipe_constraints.is_active IS '활성 상태 여부';
COMMENT ON COLUMN recipe_constraints.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN recipe_constraints.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- print_cost_base (04-print-cost-base.ts)
-- 인쇄 원가 기준표
-- -----------------------------------------------------------------------------
COMMENT ON TABLE print_cost_base IS '인쇄 원가 기준표 (LOOKUP 모드): 용지·인쇄 방식·사이즈 조합별 장당 인쇄 원가 조회 테이블';

COMMENT ON COLUMN print_cost_base.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN print_cost_base.recipe_id IS '소속 레시피 ID (product_recipes 참조)';
COMMENT ON COLUMN print_cost_base.paper_choice_id IS '용지 선택지 ID (option_element_choices 참조)';
COMMENT ON COLUMN print_cost_base.size_choice_id IS '사이즈 선택지 ID (option_element_choices 참조)';
COMMENT ON COLUMN print_cost_base.print_mode_choice_id IS '인쇄 방식 선택지 ID (option_element_choices 참조)';
COMMENT ON COLUMN print_cost_base.cost_per_sheet IS '장당 인쇄 원가 (원화, 소수점 2자리)';
COMMENT ON COLUMN print_cost_base.is_active IS '활성 상태 여부';
COMMENT ON COLUMN print_cost_base.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN print_cost_base.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- postprocess_cost (04-postprocess-cost.ts)
-- 후가공 원가표
-- -----------------------------------------------------------------------------
COMMENT ON TABLE postprocess_cost IS '후가공 원가표: 후가공 옵션별 단가 및 원가 정보';

COMMENT ON COLUMN postprocess_cost.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN postprocess_cost.recipe_id IS '소속 레시피 ID (product_recipes 참조)';
COMMENT ON COLUMN postprocess_cost.finishing_choice_id IS '후가공 선택지 ID (option_element_choices 참조)';
COMMENT ON COLUMN postprocess_cost.cost_per_unit IS '단위당 원가 (원화, 소수점 2자리)';
COMMENT ON COLUMN postprocess_cost.selling_price IS '단위당 판매가 (원화, 소수점 2자리)';
COMMENT ON COLUMN postprocess_cost.price_basis IS '가격 산정 기준 (per_unit: 건당, per_sheet: 장당)';
COMMENT ON COLUMN postprocess_cost.is_active IS '활성 상태 여부';
COMMENT ON COLUMN postprocess_cost.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN postprocess_cost.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- product_price_configs (04-product-price-configs.ts)
-- 상품별 가격 모드 설정
-- -----------------------------------------------------------------------------
COMMENT ON TABLE product_price_configs IS '상품별 가격 모드 설정: 레시피별 가격 계산 방식(LOOKUP/FORMULA)과 마진율 설정';

COMMENT ON COLUMN product_price_configs.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN product_price_configs.recipe_id IS '소속 레시피 ID (product_recipes 참조, 고유값)';
COMMENT ON COLUMN product_price_configs.pricing_mode IS '가격 계산 방식 (lookup: 원가 조회 테이블, formula: 수식 계산)';
COMMENT ON COLUMN product_price_configs.margin_rate IS '마진율 (예: 0.30 = 30%)';
COMMENT ON COLUMN product_price_configs.vat_included IS '판매가 VAT 포함 여부';
COMMENT ON COLUMN product_price_configs.min_order_qty IS '최소 주문 수량';
COMMENT ON COLUMN product_price_configs.max_order_qty IS '최대 주문 수량 (NULL이면 제한 없음)';
COMMENT ON COLUMN product_price_configs.is_active IS '활성 상태 여부';
COMMENT ON COLUMN product_price_configs.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN product_price_configs.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- qty_discount (04-qty-discount.ts)
-- 수량별 할인 구간
-- -----------------------------------------------------------------------------
COMMENT ON TABLE qty_discount IS '수량별 할인 구간: 주문 수량에 따른 단계별 할인율 정의';

COMMENT ON COLUMN qty_discount.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN qty_discount.recipe_id IS '소속 레시피 ID (product_recipes 참조)';
COMMENT ON COLUMN qty_discount.min_qty IS '할인 구간 시작 수량 (이상)';
COMMENT ON COLUMN qty_discount.max_qty IS '할인 구간 종료 수량 (이하, NULL이면 최대 수량 제한 없음)';
COMMENT ON COLUMN qty_discount.discount_rate IS '할인율 (예: 0.05 = 5% 할인)';
COMMENT ON COLUMN qty_discount.is_active IS '활성 상태 여부';
COMMENT ON COLUMN qty_discount.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN qty_discount.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- publish_history (05-publish-history.ts)
-- 상품 게시/비게시 이력
-- -----------------------------------------------------------------------------
COMMENT ON TABLE publish_history IS '상품 게시/비게시 이력: 레시피 활성화 및 비활성화 이력 감사 로그';

COMMENT ON COLUMN publish_history.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN publish_history.recipe_id IS '대상 레시피 ID (product_recipes 참조)';
COMMENT ON COLUMN publish_history.action IS '수행된 액션 (publish: 게시, unpublish: 비게시)';
COMMENT ON COLUMN publish_history.performed_by IS '액션 수행자 식별자 (관리자 ID 또는 시스템)';
COMMENT ON COLUMN publish_history.memo IS '게시/비게시 사유 메모';
COMMENT ON COLUMN publish_history.created_at IS '액션 수행 일시 (UTC)';

-- -----------------------------------------------------------------------------
-- simulation_runs (05-simulation-runs.ts)
-- 시뮬레이션 실행 기록
-- -----------------------------------------------------------------------------
COMMENT ON TABLE simulation_runs IS '시뮬레이션 실행 기록: 가격 계산 로직 검증을 위한 시뮬레이션 배치 실행 메타데이터';

COMMENT ON COLUMN simulation_runs.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN simulation_runs.recipe_id IS '시뮬레이션 대상 레시피 ID (product_recipes 참조)';
COMMENT ON COLUMN simulation_runs.run_name IS '시뮬레이션 실행 이름 (식별용)';
COMMENT ON COLUMN simulation_runs.status IS '실행 상태 (pending: 대기, running: 실행중, completed: 완료, failed: 실패)';
COMMENT ON COLUMN simulation_runs.total_cases IS '총 시뮬레이션 케이스 수';
COMMENT ON COLUMN simulation_runs.completed_cases IS '완료된 케이스 수';
COMMENT ON COLUMN simulation_runs.failed_cases IS '실패한 케이스 수';
COMMENT ON COLUMN simulation_runs.started_at IS '시뮬레이션 시작 일시';
COMMENT ON COLUMN simulation_runs.completed_at IS '시뮬레이션 완료 일시';
COMMENT ON COLUMN simulation_runs.created_at IS '레코드 생성일시 (UTC)';

-- -----------------------------------------------------------------------------
-- simulation_cases (05-simulation-runs.ts)
-- 시뮬레이션 케이스별 결과
-- -----------------------------------------------------------------------------
COMMENT ON TABLE simulation_cases IS '시뮬레이션 케이스별 결과: 각 옵션 조합에 대한 가격 계산 결과와 예상값 비교 데이터';

COMMENT ON COLUMN simulation_cases.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN simulation_cases.run_id IS '소속 시뮬레이션 실행 ID (simulation_runs 참조)';
COMMENT ON COLUMN simulation_cases.case_input IS '케이스 입력값 (선택 옵션 조합 JSONB)';
COMMENT ON COLUMN simulation_cases.expected_price IS '예상 판매가 (원화)';
COMMENT ON COLUMN simulation_cases.calculated_price IS '실제 계산된 판매가 (원화)';
COMMENT ON COLUMN simulation_cases.price_diff IS '예상가와 계산가의 차이 (원화)';
COMMENT ON COLUMN simulation_cases.status IS '케이스 상태 (pass: 통과, fail: 실패, error: 오류)';
COMMENT ON COLUMN simulation_cases.error_message IS '계산 오류 발생 시 오류 메시지';
COMMENT ON COLUMN simulation_cases.created_at IS '레코드 생성일시 (UTC)';

-- -----------------------------------------------------------------------------
-- orders (06-orders.ts) - wb_orders / wbOrders
-- 위젯 빌더 주문
-- -----------------------------------------------------------------------------
COMMENT ON TABLE orders IS '위젯 빌더 주문 스냅샷: 위젯을 통해 접수된 주문 정보와 MES 연동 상태 관리 (status: 위젯 주문 상태 머신, mes_status: MES 연동 상태 머신)';

COMMENT ON COLUMN orders.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN orders.order_number IS '주문 번호 (고유값, 인쇄물 주문 식별용)';
COMMENT ON COLUMN orders.recipe_id IS '주문 시점 레시피 ID (product_recipes 참조, 스냅샷 목적)';
COMMENT ON COLUMN orders.selected_options IS '고객이 선택한 옵션 조합 스냅샷 (JSONB)';
COMMENT ON COLUMN orders.quantity IS '주문 수량';
COMMENT ON COLUMN orders.unit_price IS '주문 시점 단가 (원화)';
COMMENT ON COLUMN orders.total_price IS '총 주문금액 (원화)';
COMMENT ON COLUMN orders.customer_name IS '고객 이름';
COMMENT ON COLUMN orders.customer_email IS '고객 이메일';
COMMENT ON COLUMN orders.customer_phone IS '고객 연락처';
COMMENT ON COLUMN orders.status IS '주문 상태 (unpaid→paid→production→shipped→delivered, cancel_requested→cancelled)';
COMMENT ON COLUMN orders.mes_status IS 'MES 연동 상태 (pending→dispatched→completed, error 전환 가능)';
COMMENT ON COLUMN orders.mes_dispatched_at IS 'MES 작업 지시 전송 일시';
COMMENT ON COLUMN orders.is_active IS '활성 상태 여부 (소프트 삭제 플래그)';
COMMENT ON COLUMN orders.created_at IS '주문 접수 일시 (UTC)';
COMMENT ON COLUMN orders.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- quote_logs (06-orders.ts)
-- 견적 계산 감사 로그
-- -----------------------------------------------------------------------------
COMMENT ON TABLE quote_logs IS '견적 계산 감사 로그: 위젯에서 실시간으로 발생하는 가격 견적 요청과 계산 결과 추적';

COMMENT ON COLUMN quote_logs.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN quote_logs.recipe_id IS '견적 대상 레시피 ID (product_recipes 참조)';
COMMENT ON COLUMN quote_logs.request_payload IS '견적 요청 입력값 (선택 옵션 + 수량 JSONB)';
COMMENT ON COLUMN quote_logs.response_payload IS '견적 계산 결과 (가격 내역 JSONB)';
COMMENT ON COLUMN quote_logs.calculation_time_ms IS '가격 계산 소요 시간 (밀리초)';
COMMENT ON COLUMN quote_logs.source IS '요청 출처 (widget: 위젯, api: 직접 API 호출, simulation: 시뮬레이션)';
COMMENT ON COLUMN quote_logs.created_at IS '견적 요청 일시 (UTC)';


-- =============================================================================
-- HUNI INTEGRATION DOMAIN (packages/shared/src/db/schema/)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- categories (huni-catalog.schema.ts)
-- 상품 카테고리 계층
-- -----------------------------------------------------------------------------
COMMENT ON TABLE categories IS 'Huni 상품 카테고리 계층: 인쇄물 상품을 분류하는 계층형 카테고리 트리 (MES 자재공정 시트 기반)';

COMMENT ON COLUMN categories.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN categories.code IS '카테고리 고유 코드 (예: PRINT, BOOK, STICKER)';
COMMENT ON COLUMN categories.name IS '카테고리 표시명';
COMMENT ON COLUMN categories.parent_id IS '상위 카테고리 ID (NULL이면 최상위)';
COMMENT ON COLUMN categories.depth IS '카테고리 계층 깊이 (0: 최상위)';
COMMENT ON COLUMN categories.display_order IS '카테고리 목록 표시 순서';
COMMENT ON COLUMN categories.sheet_name IS 'MES 엑셀 시트명 (데이터 임포트 소스 추적용)';
COMMENT ON COLUMN categories.icon_url IS '카테고리 아이콘 이미지 URL';
COMMENT ON COLUMN categories.is_active IS '활성 상태 여부';
COMMENT ON COLUMN categories.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN categories.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- products (huni-catalog.schema.ts)
-- Huni 상품 마스터
-- -----------------------------------------------------------------------------
COMMENT ON TABLE products IS 'Huni 상품 마스터: 인쇄물 주문 가능한 전체 상품 목록과 외부 시스템(에디커스, 샵바이, MES) 연동 코드';

COMMENT ON COLUMN products.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN products.category_id IS '소속 카테고리 ID (categories 참조)';
COMMENT ON COLUMN products.huni_code IS 'Huni 내부 상품 코드 (고유값, 예: P001)';
COMMENT ON COLUMN products.edicus_code IS '에디커스 통합 디자인 에디터 상품 코드 (고유값)';
COMMENT ON COLUMN products.shopby_id IS '샵바이 쇼핑몰 플랫폼 상품 ID (고유값)';
COMMENT ON COLUMN products.name IS '상품 표시명';
COMMENT ON COLUMN products.slug IS '상품 URL 슬러그 (고유값)';
COMMENT ON COLUMN products.product_type IS '상품 유형 분류 (예: leaflet, booklet, sticker, business_card)';
COMMENT ON COLUMN products.pricing_model IS '가격 산정 방식 (예: table, fixed, package)';
COMMENT ON COLUMN products.sheet_standard IS '용지 규격 기준 (예: A4, B4, 국전)';
COMMENT ON COLUMN products.figma_section IS 'Figma 디자인 섹션 참조명';
COMMENT ON COLUMN products.order_method IS '주문 방식 (upload: 파일 업로드, editor: 에디터 제작)';
COMMENT ON COLUMN products.editor_enabled IS '에디커스 에디터 사용 가능 여부';
COMMENT ON COLUMN products.description IS '상품 상세 설명';
COMMENT ON COLUMN products.is_active IS '활성 상태 여부';
COMMENT ON COLUMN products.mes_registered IS 'MES 시스템에 등록된 상품 여부';
COMMENT ON COLUMN products.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN products.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- product_sizes (huni-catalog.schema.ts)
-- 상품별 사이즈 규격
-- -----------------------------------------------------------------------------
COMMENT ON TABLE product_sizes IS '상품별 사이즈 규격: 각 상품에서 선택 가능한 재단 사이즈와 실제 인쇄 작업 사이즈 정보';

COMMENT ON COLUMN product_sizes.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN product_sizes.product_id IS '소속 상품 ID (products 참조)';
COMMENT ON COLUMN product_sizes.code IS '사이즈 코드 (예: A4, A5, CUSTOM)';
COMMENT ON COLUMN product_sizes.display_name IS '사이즈 표시명 (예: A4 (210×297mm))';
COMMENT ON COLUMN product_sizes.cut_width IS '재단 폭 (mm, 최종 완성 사이즈)';
COMMENT ON COLUMN product_sizes.cut_height IS '재단 높이 (mm, 최종 완성 사이즈)';
COMMENT ON COLUMN product_sizes.work_width IS '작업 폭 (mm, 도련 포함 인쇄 사이즈)';
COMMENT ON COLUMN product_sizes.work_height IS '작업 높이 (mm, 도련 포함 인쇄 사이즈)';
COMMENT ON COLUMN product_sizes.bleed IS '도련 여백 (mm, 기본값 3.0mm)';
COMMENT ON COLUMN product_sizes.imposition_count IS '한 용지에 배치되는 면수 (예: 4 = 4면 배치)';
COMMENT ON COLUMN product_sizes.sheet_standard IS '적용 용지 규격 (예: A4, B4, 국전)';
COMMENT ON COLUMN product_sizes.display_order IS '사이즈 목록 표시 순서';
COMMENT ON COLUMN product_sizes.is_custom IS '사용자 직접 입력 사이즈 여부';
COMMENT ON COLUMN product_sizes.custom_min_w IS '커스텀 사이즈 최소 폭 (mm)';
COMMENT ON COLUMN product_sizes.custom_min_h IS '커스텀 사이즈 최소 높이 (mm)';
COMMENT ON COLUMN product_sizes.custom_max_w IS '커스텀 사이즈 최대 폭 (mm)';
COMMENT ON COLUMN product_sizes.custom_max_h IS '커스텀 사이즈 최대 높이 (mm)';
COMMENT ON COLUMN product_sizes.is_active IS '활성 상태 여부';
COMMENT ON COLUMN product_sizes.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN product_sizes.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- papers (huni-materials.schema.ts)
-- 용지 규격
-- -----------------------------------------------------------------------------
COMMENT ON TABLE papers IS '용지 규격: 인쇄에 사용되는 용지 종류, 평량, 원가 정보';

COMMENT ON COLUMN papers.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN papers.code IS '용지 고유 코드 (예: ART_170, MATTE_120)';
COMMENT ON COLUMN papers.name IS '용지 표시명 (예: 아트지 170g)';
COMMENT ON COLUMN papers.abbreviation IS '용지 약어 (관리자 화면 표시용)';
COMMENT ON COLUMN papers.weight IS '용지 평량 (g/m²)';
COMMENT ON COLUMN papers.sheet_size IS '용지 원지 규격 (예: 국전, A4)';
COMMENT ON COLUMN papers.cost_per_ream IS '연(500장)당 원가 (원화)';
COMMENT ON COLUMN papers.selling_per_ream IS '연(500장)당 판매가 (원화)';
COMMENT ON COLUMN papers.cost_per4_cut IS '4절 기준 장당 원가 (원화)';
COMMENT ON COLUMN papers.selling_per4_cut IS '4절 기준 장당 판매가 (원화)';
COMMENT ON COLUMN papers.display_order IS '용지 목록 표시 순서';
COMMENT ON COLUMN papers.is_active IS '활성 상태 여부';
COMMENT ON COLUMN papers.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN papers.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- materials (huni-materials.schema.ts)
-- 비용지 재료 규격
-- -----------------------------------------------------------------------------
COMMENT ON TABLE materials IS '비용지 재료 규격: 용지 외 인쇄 재료(특수 재질, 플라스틱 등) 사양 정보';

COMMENT ON COLUMN materials.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN materials.code IS '재료 고유 코드';
COMMENT ON COLUMN materials.name IS '재료 표시명';
COMMENT ON COLUMN materials.material_type IS '재료 유형 분류 (예: plastic, fabric, vinyl)';
COMMENT ON COLUMN materials.thickness IS '재료 두께 (예: 0.3mm)';
COMMENT ON COLUMN materials.description IS '재료 상세 설명';
COMMENT ON COLUMN materials.is_active IS '활성 상태 여부';
COMMENT ON COLUMN materials.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN materials.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- paper_product_mapping (huni-materials.schema.ts)
-- 용지-상품 매핑
-- -----------------------------------------------------------------------------
COMMENT ON TABLE paper_product_mapping IS '용지-상품 매핑: 특정 상품에서 사용 가능한 용지 목록과 기본 선택 용지 설정';

COMMENT ON COLUMN paper_product_mapping.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN paper_product_mapping.paper_id IS '용지 ID (papers 참조)';
COMMENT ON COLUMN paper_product_mapping.product_id IS '상품 ID (products 참조)';
COMMENT ON COLUMN paper_product_mapping.cover_type IS '표지 구분 (cover: 표지용, inner: 내지용, NULL: 구분 없음)';
COMMENT ON COLUMN paper_product_mapping.is_default IS '기본 선택 용지 여부 (상품 최초 진입 시 자동 선택됨)';
COMMENT ON COLUMN paper_product_mapping.is_active IS '활성 상태 여부';
COMMENT ON COLUMN paper_product_mapping.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN paper_product_mapping.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- print_modes (huni-processes.schema.ts)
-- 인쇄 방식 규격
-- -----------------------------------------------------------------------------
COMMENT ON TABLE print_modes IS '인쇄 방식 규격: 단면/양면, 흑백/컬러 등 인쇄 방식 조합과 가격 코드';

COMMENT ON COLUMN print_modes.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN print_modes.code IS '인쇄 방식 고유 코드 (예: SINGLE_COLOR, DOUBLE_MONO)';
COMMENT ON COLUMN print_modes.name IS '인쇄 방식 표시명 (예: 단면 컬러, 양면 흑백)';
COMMENT ON COLUMN print_modes.sides IS '인쇄 면수 (single: 단면, double: 양면)';
COMMENT ON COLUMN print_modes.color_type IS '색상 유형 (color: 컬러, mono: 흑백)';
COMMENT ON COLUMN print_modes.price_code IS 'MES 가격표 조회 코드 (비트 플래그 조합: 1=단면흑백, 2=양면흑백, 4=단면컬러, 8=양면컬러)';
COMMENT ON COLUMN print_modes.display_order IS '인쇄 방식 목록 표시 순서';
COMMENT ON COLUMN print_modes.is_active IS '활성 상태 여부';
COMMENT ON COLUMN print_modes.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN print_modes.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- post_processes (huni-processes.schema.ts)
-- 후가공 규격
-- -----------------------------------------------------------------------------
COMMENT ON TABLE post_processes IS '후가공 규격: 타공, 접지, 코팅 등 후가공 공정 종류와 가격 산정 방식';

COMMENT ON COLUMN post_processes.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN post_processes.group_code IS '후가공 그룹 코드 (예: PP001=타공, PP002=접지)';
COMMENT ON COLUMN post_processes.code IS '후가공 고유 코드 (고유값)';
COMMENT ON COLUMN post_processes.name IS '후가공 표시명 (예: 타공, 접지, 3단접지)';
COMMENT ON COLUMN post_processes.process_type IS '후가공 공정 유형 (예: perforation, folding, lamination)';
COMMENT ON COLUMN post_processes.sub_option_code IS '하위 옵션 코드 (세부 공정 구분용)';
COMMENT ON COLUMN post_processes.sub_option_name IS '하위 옵션 표시명';
COMMENT ON COLUMN post_processes.price_basis IS '가격 산정 기준 (per_unit: 건당, per_sheet: 장당)';
COMMENT ON COLUMN post_processes.sheet_standard IS '적용 가능한 용지 규격 제한';
COMMENT ON COLUMN post_processes.display_order IS '후가공 목록 표시 순서';
COMMENT ON COLUMN post_processes.is_active IS '활성 상태 여부';
COMMENT ON COLUMN post_processes.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN post_processes.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- bindings (huni-processes.schema.ts)
-- 제본 규격
-- -----------------------------------------------------------------------------
COMMENT ON TABLE bindings IS '제본 규격: 책자류 상품의 제본 방식과 페이지 수 제약 조건';

COMMENT ON COLUMN bindings.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN bindings.code IS '제본 방식 고유 코드 (예: BIND_SADDLE_STITCH, BIND_PERFECT)';
COMMENT ON COLUMN bindings.name IS '제본 방식 표시명 (예: 중철제본, 무선제본, 트윈링제본)';
COMMENT ON COLUMN bindings.min_pages IS '최소 페이지 수 제약';
COMMENT ON COLUMN bindings.max_pages IS '최대 페이지 수 제약 (NULL이면 제한 없음)';
COMMENT ON COLUMN bindings.page_step IS '페이지 수 증가 단위 (예: 4 = 4페이지 단위로만 선택 가능)';
COMMENT ON COLUMN bindings.display_order IS '제본 방식 목록 표시 순서';
COMMENT ON COLUMN bindings.is_active IS '활성 상태 여부';
COMMENT ON COLUMN bindings.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN bindings.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- imposition_rules (huni-processes.schema.ts)
-- 면부 계산 규칙
-- -----------------------------------------------------------------------------
COMMENT ON TABLE imposition_rules IS '면부 계산 규칙: 재단 사이즈와 용지 규격 조합에 따른 한 용지당 배치 가능한 면수(건수) 계산 기준';

COMMENT ON COLUMN imposition_rules.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN imposition_rules.cut_size_code IS '재단 사이즈 코드 참조명';
COMMENT ON COLUMN imposition_rules.cut_width IS '재단 폭 (mm)';
COMMENT ON COLUMN imposition_rules.cut_height IS '재단 높이 (mm)';
COMMENT ON COLUMN imposition_rules.work_width IS '작업 폭 (mm, 도련 포함)';
COMMENT ON COLUMN imposition_rules.work_height IS '작업 높이 (mm, 도련 포함)';
COMMENT ON COLUMN imposition_rules.imposition_count IS '한 용지에 배치 가능한 면수 (건수)';
COMMENT ON COLUMN imposition_rules.sheet_standard IS '기준 용지 규격 (예: A4, 국전)';
COMMENT ON COLUMN imposition_rules.description IS '면부 규칙 설명';
COMMENT ON COLUMN imposition_rules.is_active IS '활성 상태 여부';
COMMENT ON COLUMN imposition_rules.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN imposition_rules.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- option_definitions (huni-options.schema.ts)
-- 옵션 정의 마스터
-- -----------------------------------------------------------------------------
COMMENT ON TABLE option_definitions IS '옵션 정의 마스터: Huni 시스템에서 사용되는 주문 옵션의 종류와 UI 표시 방식 정의';

COMMENT ON COLUMN option_definitions.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN option_definitions.key IS '옵션 고유 키 (예: paper_type, print_mode, binding)';
COMMENT ON COLUMN option_definitions.name IS '옵션 표시명';
COMMENT ON COLUMN option_definitions.option_class IS '옵션 클래스 분류 (예: material, process, delivery)';
COMMENT ON COLUMN option_definitions.option_type IS '옵션 데이터 유형 (예: single_select, multi_select, numeric)';
COMMENT ON COLUMN option_definitions.ui_component IS 'UI 렌더링 컴포넌트 종류 (예: select, radio, chip_group)';
COMMENT ON COLUMN option_definitions.description IS '옵션 용도 설명';
COMMENT ON COLUMN option_definitions.display_order IS '옵션 목록 표시 순서';
COMMENT ON COLUMN option_definitions.is_active IS '활성 상태 여부';
COMMENT ON COLUMN option_definitions.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN option_definitions.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- product_options (huni-options.schema.ts)
-- 상품별 옵션 설정
-- -----------------------------------------------------------------------------
COMMENT ON TABLE product_options IS '상품별 옵션 설정: 특정 상품에서 제공되는 옵션 구성과 표시 방식 설정';

COMMENT ON COLUMN product_options.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN product_options.product_id IS '소속 상품 ID (products 참조)';
COMMENT ON COLUMN product_options.option_definition_id IS '옵션 정의 ID (option_definitions 참조)';
COMMENT ON COLUMN product_options.display_order IS '상품 내 옵션 표시 순서';
COMMENT ON COLUMN product_options.is_required IS '필수 선택 옵션 여부';
COMMENT ON COLUMN product_options.is_visible IS '고객 화면 표시 여부 (false이면 내부 계산용)';
COMMENT ON COLUMN product_options.is_internal IS '내부 관리 전용 옵션 여부';
COMMENT ON COLUMN product_options.ui_component_override IS '상품별 UI 컴포넌트 재정의 (NULL이면 option_definitions 기본값 사용)';
COMMENT ON COLUMN product_options.default_choice_id IS '기본 선택지 ID (option_choices 참조)';
COMMENT ON COLUMN product_options.is_active IS '활성 상태 여부';
COMMENT ON COLUMN product_options.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN product_options.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- option_choices (huni-options.schema.ts)
-- 옵션별 선택지
-- -----------------------------------------------------------------------------
COMMENT ON TABLE option_choices IS '옵션별 선택지: 각 옵션에서 고객이 선택 가능한 값 목록과 외부 시스템 참조 연결';

COMMENT ON COLUMN option_choices.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN option_choices.option_definition_id IS '소속 옵션 정의 ID (option_definitions 참조)';
COMMENT ON COLUMN option_choices.code IS '선택지 고유 코드 (예: ART_170, SADDLE_STITCH)';
COMMENT ON COLUMN option_choices.name IS '선택지 표시명';
COMMENT ON COLUMN option_choices.price_key IS '가격표 조회 키 (price_tables와 매핑)';
COMMENT ON COLUMN option_choices.ref_paper_id IS '참조 용지 ID (papers 참조, 용지 옵션인 경우)';
COMMENT ON COLUMN option_choices.ref_material_id IS '참조 재료 ID (materials 참조, 특수 재료인 경우)';
COMMENT ON COLUMN option_choices.ref_print_mode_id IS '참조 인쇄 방식 ID (print_modes 참조)';
COMMENT ON COLUMN option_choices.ref_post_process_id IS '참조 후가공 ID (post_processes 참조)';
COMMENT ON COLUMN option_choices.ref_binding_id IS '참조 제본 방식 ID (bindings 참조)';
COMMENT ON COLUMN option_choices.display_order IS '선택지 목록 표시 순서';
COMMENT ON COLUMN option_choices.is_active IS '활성 상태 여부';
COMMENT ON COLUMN option_choices.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN option_choices.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- option_constraints (huni-options.schema.ts)
-- 옵션 UI 제약 조건
-- -----------------------------------------------------------------------------
COMMENT ON TABLE option_constraints IS '옵션 UI 제약 조건: 특정 조건에 따라 옵션 표시 여부나 값 범위를 동적으로 제어하는 규칙';

COMMENT ON COLUMN option_constraints.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN option_constraints.product_id IS '적용 상품 ID (products 참조)';
COMMENT ON COLUMN option_constraints.constraint_type IS '제약 유형 (visibility: 표시 제어, value_range: 값 범위 제한)';
COMMENT ON COLUMN option_constraints.source_option_id IS '조건 소스 옵션 ID (option_definitions 참조)';
COMMENT ON COLUMN option_constraints.source_field IS '조건 소스 필드명';
COMMENT ON COLUMN option_constraints.operator IS '비교 연산자 (eq, ne, gt, lt, gte, lte, in)';
COMMENT ON COLUMN option_constraints.value IS '비교 단일 값';
COMMENT ON COLUMN option_constraints.value_min IS '범위 조건 최솟값';
COMMENT ON COLUMN option_constraints.value_max IS '범위 조건 최댓값';
COMMENT ON COLUMN option_constraints.target_option_id IS '제어 대상 옵션 ID (option_definitions 참조)';
COMMENT ON COLUMN option_constraints.target_field IS '제어 대상 필드명';
COMMENT ON COLUMN option_constraints.target_action IS '적용 액션 (show: 표시, hide: 숨김, set_range: 범위 설정)';
COMMENT ON COLUMN option_constraints.target_value IS '액션 적용값';
COMMENT ON COLUMN option_constraints.description IS '제약 조건 설명';
COMMENT ON COLUMN option_constraints.priority IS '동일 조건 규칙 우선순위 (낮을수록 먼저 적용)';
COMMENT ON COLUMN option_constraints.is_active IS '활성 상태 여부';
COMMENT ON COLUMN option_constraints.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN option_constraints.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- option_dependencies (huni-options.schema.ts)
-- 옵션 의존성 규칙
-- -----------------------------------------------------------------------------
COMMENT ON TABLE option_dependencies IS '옵션 의존성 규칙: 부모 옵션 선택값에 따른 자식 옵션 표시/숨김 의존 관계 정의';

COMMENT ON COLUMN option_dependencies.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN option_dependencies.product_id IS '적용 상품 ID (products 참조)';
COMMENT ON COLUMN option_dependencies.parent_option_id IS '부모 옵션 ID (option_definitions 참조)';
COMMENT ON COLUMN option_dependencies.parent_choice_id IS '부모 선택지 ID (option_choices 참조, NULL이면 모든 선택값에 적용)';
COMMENT ON COLUMN option_dependencies.child_option_id IS '자식 옵션 ID (option_definitions 참조)';
COMMENT ON COLUMN option_dependencies.dependency_type IS '의존 유형 (visibility: 표시 제어, 기본값)';
COMMENT ON COLUMN option_dependencies.is_active IS '활성 상태 여부';
COMMENT ON COLUMN option_dependencies.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN option_dependencies.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- price_tables (huni-pricing.schema.ts)
-- 가격표 헤더
-- -----------------------------------------------------------------------------
COMMENT ON TABLE price_tables IS '가격표 헤더: 인쇄물 가격 산정에 사용되는 가격표 메타데이터 (가격 구간은 price_tiers에서 관리)';

COMMENT ON COLUMN price_tables.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN price_tables.code IS '가격표 고유 코드 (고유값)';
COMMENT ON COLUMN price_tables.name IS '가격표 이름';
COMMENT ON COLUMN price_tables.price_type IS '가격 유형 (예: print, postprocess, binding)';
COMMENT ON COLUMN price_tables.quantity_basis IS '수량 산정 기준 (예: per_sheet: 장당, per_unit: 건당)';
COMMENT ON COLUMN price_tables.sheet_standard IS '적용 용지 규격 (예: A4, 국전)';
COMMENT ON COLUMN price_tables.description IS '가격표 설명';
COMMENT ON COLUMN price_tables.is_active IS '활성 상태 여부';
COMMENT ON COLUMN price_tables.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN price_tables.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- price_tiers (huni-pricing.schema.ts)
-- 가격 구간
-- -----------------------------------------------------------------------------
COMMENT ON TABLE price_tiers IS '가격 구간: 가격표별 수량 구간에 따른 단가 정보 (수량이 많을수록 단가 감소)';

COMMENT ON COLUMN price_tiers.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN price_tiers.price_table_id IS '소속 가격표 ID (price_tables 참조)';
COMMENT ON COLUMN price_tiers.option_code IS '옵션 코드 (가격표 내 옵션 구분자)';
COMMENT ON COLUMN price_tiers.min_qty IS '수량 구간 시작 (이상)';
COMMENT ON COLUMN price_tiers.max_qty IS '수량 구간 종료 (이하, 기본값 999999)';
COMMENT ON COLUMN price_tiers.unit_price IS '구간 단가 (원화, 소수점 2자리)';
COMMENT ON COLUMN price_tiers.is_active IS '활성 상태 여부';
COMMENT ON COLUMN price_tiers.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN price_tiers.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- fixed_prices (huni-pricing.schema.ts)
-- 고정 단가
-- -----------------------------------------------------------------------------
COMMENT ON TABLE fixed_prices IS '고정 단가: 상품·사이즈·용지·인쇄방식 조합에 따른 확정 판매가 (가격표 조회 방식이 아닌 직접 지정 방식)';

COMMENT ON COLUMN fixed_prices.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN fixed_prices.product_id IS '상품 ID (products 참조)';
COMMENT ON COLUMN fixed_prices.size_id IS '사이즈 ID (product_sizes 참조)';
COMMENT ON COLUMN fixed_prices.paper_id IS '용지 ID (papers 참조)';
COMMENT ON COLUMN fixed_prices.material_id IS '재료 ID (materials 참조)';
COMMENT ON COLUMN fixed_prices.print_mode_id IS '인쇄 방식 ID (print_modes 참조)';
COMMENT ON COLUMN fixed_prices.option_label IS '추가 옵션 식별 레이블';
COMMENT ON COLUMN fixed_prices.base_qty IS '기준 수량 (기본값 1)';
COMMENT ON COLUMN fixed_prices.selling_price IS '판매가 (원화, 소수점 2자리)';
COMMENT ON COLUMN fixed_prices.cost_price IS '원가 (원화, 소수점 2자리)';
COMMENT ON COLUMN fixed_prices.vat_included IS '판매가 VAT 포함 여부';
COMMENT ON COLUMN fixed_prices.is_active IS '활성 상태 여부';
COMMENT ON COLUMN fixed_prices.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN fixed_prices.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- package_prices (huni-pricing.schema.ts)
-- 패키지 가격 (책자류)
-- -----------------------------------------------------------------------------
COMMENT ON TABLE package_prices IS '패키지 가격 (책자류): 사이즈·인쇄방식·페이지수·수량 조합에 따른 책자 패키지 판매가';

COMMENT ON COLUMN package_prices.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN package_prices.product_id IS '상품 ID (products 참조)';
COMMENT ON COLUMN package_prices.size_id IS '사이즈 ID (product_sizes 참조)';
COMMENT ON COLUMN package_prices.print_mode_id IS '인쇄 방식 ID (print_modes 참조)';
COMMENT ON COLUMN package_prices.page_count IS '책자 페이지 수';
COMMENT ON COLUMN package_prices.min_qty IS '수량 구간 시작 (이상)';
COMMENT ON COLUMN package_prices.max_qty IS '수량 구간 종료 (이하, 기본값 999999)';
COMMENT ON COLUMN package_prices.selling_price IS '판매가 (원화, 소수점 2자리)';
COMMENT ON COLUMN package_prices.cost_price IS '원가 (원화, 소수점 2자리)';
COMMENT ON COLUMN package_prices.is_active IS '활성 상태 여부';
COMMENT ON COLUMN package_prices.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN package_prices.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- foil_prices (huni-pricing.schema.ts)
-- 박 가격표
-- -----------------------------------------------------------------------------
COMMENT ON TABLE foil_prices IS '박 가격표: 금박/은박 등 호일 스탬핑 가격 (박 유형·색상·크기 조합별 단가)';

COMMENT ON COLUMN foil_prices.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN foil_prices.foil_type IS '박 유형 (예: gold: 금박, silver: 은박, hologram: 홀로그램)';
COMMENT ON COLUMN foil_prices.foil_color IS '박 색상 세부 분류';
COMMENT ON COLUMN foil_prices.plate_material IS '인판 재질 (예: magnesium, brass)';
COMMENT ON COLUMN foil_prices.target_product_type IS '적용 가능 상품 유형 제한 (NULL이면 제한 없음)';
COMMENT ON COLUMN foil_prices.width IS '박 면적 폭 (mm)';
COMMENT ON COLUMN foil_prices.height IS '박 면적 높이 (mm)';
COMMENT ON COLUMN foil_prices.selling_price IS '판매가 (원화, 소수점 2자리)';
COMMENT ON COLUMN foil_prices.cost_price IS '원가 (원화, 소수점 2자리)';
COMMENT ON COLUMN foil_prices.display_order IS '박 목록 표시 순서';
COMMENT ON COLUMN foil_prices.is_active IS '활성 상태 여부';
COMMENT ON COLUMN foil_prices.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN foil_prices.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- loss_quantity_config (huni-pricing.schema.ts)
-- 생산 손실 수량 설정
-- -----------------------------------------------------------------------------
COMMENT ON TABLE loss_quantity_config IS '생산 손실 수량 설정: 인쇄 공정의 준비 손실(makeready) 수량 비율 설정 (scopeType에 따라 scopeId 참조 대상이 달라지는 폴리모픽 FK 패턴)';

COMMENT ON COLUMN loss_quantity_config.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN loss_quantity_config.scope_type IS '적용 범위 유형 (global: 전체, product: 상품별, process: 공정별)';
COMMENT ON COLUMN loss_quantity_config.scope_id IS '적용 대상 ID (scope_type에 따라 products.id 또는 post_processes.id 참조, NULL이면 전체 적용)';
COMMENT ON COLUMN loss_quantity_config.loss_rate IS '손실 비율 (예: 0.0500 = 5% 손실)';
COMMENT ON COLUMN loss_quantity_config.min_loss_qty IS '최소 손실 수량 (손실비율 계산값보다 크면 이 값 사용)';
COMMENT ON COLUMN loss_quantity_config.description IS '손실 설정 설명';
COMMENT ON COLUMN loss_quantity_config.is_active IS '활성 상태 여부';
COMMENT ON COLUMN loss_quantity_config.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN loss_quantity_config.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- orders (huni-orders.schema.ts)
-- Huni 주문 마스터
-- -----------------------------------------------------------------------------
COMMENT ON TABLE orders IS 'Huni 주문 마스터: 위젯을 통해 접수된 인쇄물 주문 전체 정보 (주문 상태, 고객 정보, 배송 정보 통합 관리)';

-- NOTE: The orders table appears in both widget builder (06-orders.ts) and huni-orders.schema.ts
-- The following column comments apply to the Huni orders domain context
COMMENT ON COLUMN orders.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN orders.order_id IS '외부 연동용 주문 UUID (고유값)';
COMMENT ON COLUMN orders.order_number IS '표시용 주문 번호 (고유값, 예: ORD-20240101-0001)';
COMMENT ON COLUMN orders.status IS '주문 상태 (unpaid: 미결제, paid: 결제완료, production: 생산중, shipped: 발송, delivered: 배송완료)';
COMMENT ON COLUMN orders.total_price IS '총 주문금액 (원화, 소수점 2자리)';
COMMENT ON COLUMN orders.currency IS '결제 통화 (기본값 KRW)';
COMMENT ON COLUMN orders.quote_data IS '주문 시점 견적 데이터 스냅샷 (JSONB, 선택 옵션 + 수량 + 가격 내역)';
COMMENT ON COLUMN orders.customer_name IS '주문자 이름';
COMMENT ON COLUMN orders.customer_email IS '주문자 이메일';
COMMENT ON COLUMN orders.customer_phone IS '주문자 연락처';
COMMENT ON COLUMN orders.customer_company IS '주문자 회사명';
COMMENT ON COLUMN orders.shipping_method IS '배송 방법 (예: express: 특급, standard: 일반, pickup: 방문수령)';
COMMENT ON COLUMN orders.shipping_address IS '배송지 주소';
COMMENT ON COLUMN orders.shipping_postal_code IS '배송지 우편번호';
COMMENT ON COLUMN orders.shipping_memo IS '배송 요청사항 메모';
COMMENT ON COLUMN orders.shipping_tracking_number IS '운송장 번호';
COMMENT ON COLUMN orders.shipping_estimated_date IS '배송 예정일 (YYYY-MM-DD 형식 문자열)';
COMMENT ON COLUMN orders.widget_id IS '주문 접수 위젯 ID (widgets 참조)';
COMMENT ON COLUMN orders.product_id IS '주문 상품 ID (products 참조, 삭제 시 NULL 유지)';
COMMENT ON COLUMN orders.is_active IS '활성 상태 여부 (소프트 삭제)';
COMMENT ON COLUMN orders.created_at IS '주문 접수 일시 (UTC)';
COMMENT ON COLUMN orders.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- order_status_history (huni-orders.schema.ts)
-- 주문 상태 변경 이력
-- -----------------------------------------------------------------------------
COMMENT ON TABLE order_status_history IS '주문 상태 변경 이력: 주문 상태 전환의 감사 로그 (불변 기록, 삭제 불가)';

COMMENT ON COLUMN order_status_history.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN order_status_history.order_id IS '주문 ID (orders 참조)';
COMMENT ON COLUMN order_status_history.status IS '변경된 주문 상태값';
COMMENT ON COLUMN order_status_history.memo IS '상태 변경 사유 메모';
COMMENT ON COLUMN order_status_history.changed_at IS '상태 변경 일시 (UTC)';

-- -----------------------------------------------------------------------------
-- order_design_files (huni-orders.schema.ts)
-- 주문 디자인 파일
-- -----------------------------------------------------------------------------
COMMENT ON TABLE order_design_files IS '주문 디자인 파일: 주문에 첨부된 인쇄용 디자인 파일 정보 (업로드 상태 및 스토리지 URL 관리)';

COMMENT ON COLUMN order_design_files.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN order_design_files.order_id IS '소속 주문 ID (orders 참조)';
COMMENT ON COLUMN order_design_files.file_id IS '파일 고유 ID (UUID, 외부 스토리지 식별자)';
COMMENT ON COLUMN order_design_files.original_name IS '원본 파일명 (업로드 시 파일명)';
COMMENT ON COLUMN order_design_files.file_number IS '파일 관리 번호 (내부 추적용)';
COMMENT ON COLUMN order_design_files.file_size IS '파일 크기 (바이트)';
COMMENT ON COLUMN order_design_files.mime_type IS '파일 MIME 타입 (예: application/pdf, image/jpeg)';
COMMENT ON COLUMN order_design_files.storage_url IS '파일 스토리지 접근 URL';
COMMENT ON COLUMN order_design_files.status IS '파일 처리 상태 (pending: 대기, uploaded: 업로드완료, processing: 처리중, ready: 준비완료, error: 오류)';
COMMENT ON COLUMN order_design_files.uploaded_at IS '파일 업로드 완료 일시 (UTC)';

-- -----------------------------------------------------------------------------
-- mes_items (huni-integration.schema.ts)
-- MES 품목 마스터
-- -----------------------------------------------------------------------------
COMMENT ON TABLE mes_items IS 'MES 품목 마스터: 생산관리시스템(MES)에 등록된 자재·공정 품목 목록';

COMMENT ON COLUMN mes_items.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN mes_items.item_code IS 'MES 품목 코드 (고유값, MES 시스템의 품목 식별자)';
COMMENT ON COLUMN mes_items.group_code IS 'MES 품목 그룹 코드 (예: PP001=타공그룹, MA001=용지그룹)';
COMMENT ON COLUMN mes_items.name IS 'MES 품목명';
COMMENT ON COLUMN mes_items.abbreviation IS 'MES 품목 약어';
COMMENT ON COLUMN mes_items.item_type IS '품목 유형 (예: material: 자재, process: 공정, product: 완제품)';
COMMENT ON COLUMN mes_items.unit IS '수량 단위 (기본값 EA)';
COMMENT ON COLUMN mes_items.is_active IS '활성 상태 여부';
COMMENT ON COLUMN mes_items.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN mes_items.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- mes_item_options (huni-integration.schema.ts)
-- MES 품목 옵션값
-- -----------------------------------------------------------------------------
COMMENT ON TABLE mes_item_options IS 'MES 품목 옵션값: MES 품목별 부가 옵션 값 목록 (품목당 최대 10개 옵션 지원)';

COMMENT ON COLUMN mes_item_options.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN mes_item_options.mes_item_id IS 'MES 품목 ID (mes_items 참조)';
COMMENT ON COLUMN mes_item_options.option_number IS '옵션 번호 (1~10, 품목 내 순번)';
COMMENT ON COLUMN mes_item_options.option_value IS '옵션값 문자열';
COMMENT ON COLUMN mes_item_options.is_active IS '활성 상태 여부';
COMMENT ON COLUMN mes_item_options.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN mes_item_options.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- product_mes_mapping (huni-integration.schema.ts)
-- 상품-MES 매핑
-- -----------------------------------------------------------------------------
COMMENT ON TABLE product_mes_mapping IS '상품-MES 매핑: Huni 상품과 MES 품목의 연결 관계 (표지/내지 구분 지원)';

COMMENT ON COLUMN product_mes_mapping.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN product_mes_mapping.product_id IS '상품 ID (products 참조)';
COMMENT ON COLUMN product_mes_mapping.mes_item_id IS 'MES 품목 ID (mes_items 참조)';
COMMENT ON COLUMN product_mes_mapping.cover_type IS '표지 구분 (cover: 표지, inner: 내지, NULL: 구분 없음)';
COMMENT ON COLUMN product_mes_mapping.is_active IS '활성 상태 여부';
COMMENT ON COLUMN product_mes_mapping.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN product_mes_mapping.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- product_editor_mapping (huni-integration.schema.ts)
-- 상품-에디터 매핑
-- -----------------------------------------------------------------------------
COMMENT ON TABLE product_editor_mapping IS '상품-에디터 매핑: Huni 상품과 에디커스 통합 디자인 에디터의 1:1 연결 및 템플릿 설정';

COMMENT ON COLUMN product_editor_mapping.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN product_editor_mapping.product_id IS '상품 ID (products 참조, 1:1 고유값)';
COMMENT ON COLUMN product_editor_mapping.editor_type IS '에디터 유형 (기본값: edicus)';
COMMENT ON COLUMN product_editor_mapping.template_id IS '에디터 템플릿 ID';
COMMENT ON COLUMN product_editor_mapping.template_config IS '에디터 템플릿 추가 설정 (JSONB)';
COMMENT ON COLUMN product_editor_mapping.is_active IS '활성 상태 여부';
COMMENT ON COLUMN product_editor_mapping.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN product_editor_mapping.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- option_choice_mes_mapping (huni-integration.schema.ts)
-- 옵션 선택지-MES 매핑
-- -----------------------------------------------------------------------------
COMMENT ON TABLE option_choice_mes_mapping IS '옵션 선택지-MES 매핑: 주문 옵션 선택값을 MES 작업지시서의 품목 코드로 변환하는 매핑 테이블';

COMMENT ON COLUMN option_choice_mes_mapping.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN option_choice_mes_mapping.option_choice_id IS '옵션 선택지 ID (option_choices 참조)';
COMMENT ON COLUMN option_choice_mes_mapping.mes_item_id IS 'MES 품목 ID (mes_items 참조, NULL이면 코드 직접 사용)';
COMMENT ON COLUMN option_choice_mes_mapping.mes_code IS 'MES 직접 코드 참조 (mes_item_id가 NULL인 경우 사용)';
COMMENT ON COLUMN option_choice_mes_mapping.mapping_type IS '매핑 유형 (material: 자재, process: 공정, product: 완제품)';
COMMENT ON COLUMN option_choice_mes_mapping.mapping_status IS '매핑 상태 (pending: 매핑 대기, mapped: 매핑완료, verified: 검증완료)';
COMMENT ON COLUMN option_choice_mes_mapping.mapped_by IS '매핑 작업자 식별자';
COMMENT ON COLUMN option_choice_mes_mapping.mapped_at IS '매핑 완료 일시';
COMMENT ON COLUMN option_choice_mes_mapping.notes IS '매핑 관련 메모';
COMMENT ON COLUMN option_choice_mes_mapping.is_active IS '활성 상태 여부';
COMMENT ON COLUMN option_choice_mes_mapping.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN option_choice_mes_mapping.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- integration_dead_letters (huni-integration.schema.ts)
-- 연동 실패 이벤트 큐
-- -----------------------------------------------------------------------------
COMMENT ON TABLE integration_dead_letters IS '연동 실패 이벤트 큐 (Dead Letter Queue): 외부 시스템 연동 실패 이벤트를 보관하고 재처리 대기하는 큐';

COMMENT ON COLUMN integration_dead_letters.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN integration_dead_letters.event_type IS '실패한 이벤트 유형 (예: mes_dispatch, shopby_sync, edicus_register)';
COMMENT ON COLUMN integration_dead_letters.event_payload IS '실패 이벤트 원본 페이로드 (JSONB)';
COMMENT ON COLUMN integration_dead_letters.adapter_name IS '실패 발생 어댑터 이름 (예: mes-client, shopby-client)';
COMMENT ON COLUMN integration_dead_letters.error_message IS '오류 메시지 상세 내용';
COMMENT ON COLUMN integration_dead_letters.retry_count IS '재시도 횟수';
COMMENT ON COLUMN integration_dead_letters.status IS '처리 상태 (pending: 재처리 대기, processing: 처리중, resolved: 처리완료, abandoned: 포기)';
COMMENT ON COLUMN integration_dead_letters.created_at IS '이벤트 실패 발생 일시 (UTC)';
COMMENT ON COLUMN integration_dead_letters.replayed_at IS '마지막 재처리 시도 일시 (UTC)';

-- -----------------------------------------------------------------------------
-- widgets (huni-widgets.schema.ts)
-- 위젯 설정
-- -----------------------------------------------------------------------------
COMMENT ON TABLE widgets IS '임베드 위젯 설정: 외부 사이트에 삽입 가능한 주문 인터페이스 위젯 구성 및 보안 설정';

COMMENT ON COLUMN widgets.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN widgets.widget_id IS '위젯 공개 식별자 (고유값, 임베드 코드에 사용)';
COMMENT ON COLUMN widgets.name IS '위젯 관리자 표시명';
COMMENT ON COLUMN widgets.status IS '위젯 상태 (active: 활성, inactive: 비활성, maintenance: 점검중)';
COMMENT ON COLUMN widgets.theme IS '위젯 UI 테마 설정 JSONB (primary_color, secondary_color, font_family, border_radius)';
COMMENT ON COLUMN widgets.api_base_url IS '위젯이 호출할 API 기본 URL (NULL이면 기본 설정 사용)';
COMMENT ON COLUMN widgets.allowed_origins IS '위젯 임베드 허용 도메인 목록 JSONB (["*"] 이면 모든 도메인 허용)';
COMMENT ON COLUMN widgets.features IS '위젯 기능 활성화 설정 JSONB (file_upload, editor_integration, price_preview)';
COMMENT ON COLUMN widgets.token_secret IS 'API 요청 인증 토큰 비밀키 (암호화 저장 권장)';
COMMENT ON COLUMN widgets.is_active IS '활성 상태 여부';
COMMENT ON COLUMN widgets.created_at IS '레코드 생성일시 (UTC)';
COMMENT ON COLUMN widgets.updated_at IS '레코드 최종 수정일시 (UTC)';

-- -----------------------------------------------------------------------------
-- data_import_log (huni-import-log.schema.ts)
-- 데이터 임포트 실행 로그
-- -----------------------------------------------------------------------------
COMMENT ON TABLE data_import_log IS '데이터 임포트 실행 로그: 마스터 데이터 임포트 파이프라인의 실행 이력과 버전 관리 정보 (변경 없는 임포트 스킵 지원)';

COMMENT ON COLUMN data_import_log.id IS '기본키 (자동 증가)';
COMMENT ON COLUMN data_import_log.table_name IS '임포트 대상 테이블명';
COMMENT ON COLUMN data_import_log.source_file IS '임포트 소스 파일 경로';
COMMENT ON COLUMN data_import_log.source_hash IS '소스 파일 해시값 (변경 감지용, SHA 계열 128자)';
COMMENT ON COLUMN data_import_log.import_version IS '임포트 버전 번호 (테이블당 순차 증가)';
COMMENT ON COLUMN data_import_log.records_total IS '처리 대상 총 레코드 수';
COMMENT ON COLUMN data_import_log.records_inserted IS '신규 삽입된 레코드 수';
COMMENT ON COLUMN data_import_log.records_updated IS '갱신된 레코드 수';
COMMENT ON COLUMN data_import_log.records_skipped IS '변경 없이 스킵된 레코드 수';
COMMENT ON COLUMN data_import_log.records_errored IS '오류 발생 레코드 수';
COMMENT ON COLUMN data_import_log.started_at IS '임포트 시작 일시 (UTC)';
COMMENT ON COLUMN data_import_log.completed_at IS '임포트 완료 일시 (UTC, 실행중이면 NULL)';
COMMENT ON COLUMN data_import_log.status IS '임포트 상태 (running: 실행중, completed: 완료, failed: 실패, skipped: 스킵)';
COMMENT ON COLUMN data_import_log.error_message IS '실패 시 오류 메시지';
COMMENT ON COLUMN data_import_log.metadata IS '추가 메타데이터 JSONB (임포트 파라미터, 소요 시간 등)';
