# SPEC-IM-001: 인수 기준

## 메타데이터

| 항목 | 내용 |
|------|------|
| SPEC ID | SPEC-IM-001 |
| 제목 | 상품 마스터 통합 관리 페이지 |
| 상태 | 초안 |

---

## 1. 페이지 아키텍처 인수 기준

### AC-ARCH-001: 3패널 레이아웃

```gherkin
Given 사용자가 Admin 대시보드에 로그인한 상태
When 사용자가 "/admin/catalog"로 이동
Then 페이지는 3패널 레이아웃을 표시:
  - 왼쪽 패널 (w-56): 카테고리 트리
  - 중앙 패널 (flex-1): 상품 목록 DataTable
  - 오른쪽 패널 (w-[480px]): 6탭 상세 패널 (상품 선택 전 숨김)
```

### AC-ARCH-002: 라우트 구조

```gherkin
Given Admin 앱이 실행 중
When 다음 라우트에 접근:
  | 라우트                              | 기대 콘텐츠                     |
  | /admin/catalog                      | 3패널 통합 카탈로그              |
  | /admin/catalog/papers               | 용지 마스터 DataTable            |
  | /admin/catalog/processes            | 공정 마스터 (3개 섹션)           |
  | /admin/catalog/pricing/imposition   | 조판 규칙 DataTable              |
  | /admin/catalog/mes-items            | MES 품목 마스터 DataTable        |
Then 각 라우트는 오류 없이 기대 콘텐츠를 렌더링
```

### AC-ARCH-003: 사이드바 네비게이션

```gherkin
Given 사용자가 임의의 Admin 페이지에 있는 상태
When 사용자가 사이드바 네비게이션을 확인
Then "카탈로그 관리" 그룹이 다음 하위 항목과 함께 표시:
  - "통합 카탈로그" → "/admin/catalog" 링크
  - "용지" → "/admin/catalog/papers" 링크
  - "공정" → "/admin/catalog/processes" 링크
  - "조판 규칙" → "/admin/catalog/pricing/imposition" 링크
  - "MES 품목" → "/admin/catalog/mes-items" 링크
```

---

## 2. 카테고리 트리 인수 기준

### AC-TREE-001: 카테고리 트리 표시

```gherkin
Given categories 테이블에 8개 최상위 카테고리와 약 30개 하위 카테고리가 있음
When 사용자가 "/admin/catalog"를 방문
Then 왼쪽 패널에 접기 가능한 트리 표시:
  - display_order 순으로 정렬된 8개 최상위 노드
  - 상위 카테고리 아래에 중첩된 하위 카테고리
  - 각 노드에 카테고리 이름 표시
```

### AC-TREE-002: 카테고리 선택으로 상품 필터링

```gherkin
Given 카테고리 트리가 표시된 상태
When 사용자가 하위 카테고리 노드를 클릭 (예: "명함")
Then 중앙 패널 상품 목록이 선택된 하위 카테고리에 해당하는 category_id의 상품만 표시
And 선택된 노드는 bg-primary/10 스타일로 하이라이트

When 사용자가 최상위 카테고리 노드를 클릭 (예: "디지털 인쇄")
Then 중앙 패널에 해당 카테고리의 모든 하위 카테고리 상품 표시
```

### AC-TREE-003: 카테고리 카운트 배지

```gherkin
Given 카테고리 트리가 표시된 상태
When 각 트리 노드를 확인
Then 각 노드에 활성 상품 수 (is_active=true) 배지 표시
And 최상위 노드는 모든 하위 카테고리 합산 수 표시
```

### AC-TREE-004: 전체 상품 노드

```gherkin
Given 사용자가 "/admin/catalog"를 방문
Then 트리 상단에 "전체 상품" 노드 표시
And 이 노드가 기본 선택 상태
And 중앙 패널에 모든 상품 (필터 없음) 표시
```

---

## 3. 상품 목록 인수 기준

### AC-LIST-001: 상품 목록 컬럼

```gherkin
Given 카테고리가 선택된 상태 (또는 "전체 상품")
When 중앙 패널에 상품 목록이 렌더링
Then 다음 컬럼을 가진 DataTable 표시:
  | 컬럼       | 소스                      |
  | 상품명     | products.name             |
  | 후니 코드  | products.huni_code        |
  | 유형       | products.product_type     |
  | 가격 모델  | products.pricing_model    |
  | 활성       | products.is_active (배지) |
  | 사이즈 수  | COUNT(product_sizes)      |
```

### AC-LIST-002: 상품 검색

```gherkin
Given 상품 목록이 표시된 상태
When 사용자가 검색 입력창에 "명함"을 입력
Then 이름, huni_code, 또는 slug에 "명함"이 포함된 상품만 표시 (대소문자 무관)
And 필터는 입력 후 300ms 내에 적용 (디바운스)
```

### AC-LIST-003: 상품 페이지네이션

```gherkin
Given 카테고리에 120개 상품이 있음
When 상품 목록이 렌더링
Then 페이지당 50개 상품만 표시
And 페이지네이션 컨트롤 (이전 / 페이지 N / 다음) 표시
And "다음" 클릭 시 다음 50개 상품 로드
```

### AC-LIST-004: 상품 선택 시 상세 패널 열기

```gherkin
Given 상품 목록이 표시된 상태
When 사용자가 상품 행을 클릭 (예: "명함-100")
Then 해당 행이 하이라이트
And 오른쪽 상세 패널이 6개 탭과 함께 열림
And "기본 정보" 탭이 기본 활성화
And 활성 탭에 상품 데이터 로드
```

---

## 4. 탭 1: 기본 정보 인수 기준

### AC-TAB1-001: 기본 정보 폼 필드

```gherkin
Given 상품이 선택되고 "기본 정보" 탭이 활성화된 상태
Then 다음 편집 가능한 필드 표시:
  | 필드          | UI 컴포넌트      | 소스 컬럼               |
  | 상품명        | Input            | products.name           |
  | 후니 코드     | Input (readonly) | products.huni_code      |
  | 카테고리      | Select           | products.category_id    |
  | 상품 유형     | Select           | products.product_type   |
  | 가격 모델     | Select           | products.pricing_model  |
  | 주문 방식     | Select           | products.order_method   |
  | 에디터 활성화 | Switch           | products.editor_enabled |
  | 활성          | Switch           | products.is_active      |
  | 설명          | Textarea         | products.description    |
```

### AC-TAB1-002: 상품 사이즈 섹션

```gherkin
Given 상품이 선택되고 "기본 정보" 탭이 활성화된 상태
When 사용자가 "사이즈" 접기 섹션을 펼침
Then 상품의 모든 product_sizes를 다음 컬럼의 DataTable로 표시:
  - 코드, 표시 이름, 재단 W×H, 작업 W×H, 여백, 조판 수, 커스텀, 활성
And 각 필드는 인라인 편집 가능
And "사이즈 추가" 버튼으로 새 빈 행 생성
And 삭제 버튼으로 사이즈 레코드 제거
```

### AC-TAB1-003: 기본 정보 변경사항 저장

```gherkin
Given 사용자가 상품명을 "새 이름"으로 수정
When 사용자가 "저장" 클릭
Then products.update mutation이 { name: "새 이름" }과 함께 호출
And 성공 토스트 표시: "상품이 성공적으로 업데이트되었습니다"
And 중앙 패널 상품 목록에 새 이름 반영
```

### AC-TAB1-004: huni_code 5자리 숫자 검증 (신규 등록 시)

```gherkin
Given 새 상품 등록 폼이 열린 상태
When 사용자가 huni_code 필드에 "12345"를 입력
Then 유효한 5자리 숫자로 인정

When 사용자가 huni_code 필드에 "1234"를 입력 (4자리)
Then 유효성 검사 오류 표시: "후니 코드는 5자리 숫자여야 합니다"
And 저장 방지

When 사용자가 huni_code 필드에 "abc12"를 입력 (숫자 외 문자 포함)
Then 유효성 검사 오류 표시: "후니 코드는 숫자만 입력 가능합니다"
And 저장 방지

When 상품이 저장된 이후
Then huni_code 필드는 readonly 상태로 전환
And 수정 버튼 없음 (변경 불가 원칙 적용)

When 사용자가 이미 존재하는 huni_code를 입력
Then 유효성 검사 오류 표시: "이미 사용 중인 후니 코드입니다"
And 저장 방지
```

---

## 5. 탭 2: 자재 & 공정 인수 기준

### AC-TAB2-001: 용지 배정 매트릭스

```gherkin
Given 상품이 선택되고 "자재 & 공정" 탭이 활성화된 상태
Then 용지 배정 섹션에 모든 55개 용지 표시:
  - 체크박스: 해당 상품에 paper_product_mapping이 존재하면 체크
  - 용지 이름 및 중량 배지
  - 활성 매핑마다 커버 유형 선택기 (없음/표지/내지)
  - 기본 라디오 버튼 (상품당 1개)
And 체크박스 클릭 시 paper_product_mapping 레코드 토글
```

### AC-TAB2-002: 인쇄 방식 배정

```gherkin
Given "자재 & 공정" 탭이 활성화된 상태
Then 인쇄 방식 섹션에 체크박스와 함께 모든 12개 print_modes 표시
And 체크된 방식은 인쇄 방식 옵션 정의에 대한 활성 product_options를 나타냄
And 체크박스 토글 시 해당 product_option 생성/비활성화
```

### AC-TAB2-003: 후가공 그룹

```gherkin
Given "자재 & 공정" 탭이 활성화된 상태
Then 후가공은 group_code (PP001~PP008) 별로 그룹 헤더와 함께 그룹화
And 각 그룹은 체크박스와 함께 개별 후가공 옵션 표시
```

### AC-TAB2-004: 책자용 제본 옵션

```gherkin
Given product_type = "saddle_stitch_booklet"인 상품이 선택된 상태
When "자재 & 공정" 탭이 활성화된 상태
Then "제본 옵션" 섹션이 표시:
  - bindings 테이블에서 가져온 제본 방식
  - 각 제본 방식의 페이지 제약 (min_pages, max_pages, page_step)

Given product_type = "namecard"인 상품이 선택된 상태
Then "제본 옵션" 섹션이 표시되지 않음
```

### AC-TAB2-005: 비용지 자재

```gherkin
Given product_type = "acrylic"인 상품이 선택된 상태
When "자재 & 공정" 탭이 활성화된 상태
Then "자재" 섹션에 materials 테이블의 레코드 표시 (용지 대신)
And 용지 배정 섹션이 숨겨짐
```

---

## 6. 탭 3: 가격 책정 인수 기준

### AC-TAB3-001: 가격 유형 감지

```gherkin
Given pricing_model = "tiered"인 상품이 선택된 상태
When "가격 책정" 탭이 활성화된 상태
Then 탭에 "구간" 배지와 수량-구간 편집기 표시

Given pricing_model = "fixed"인 상품이 선택된 상태
Then 탭에 "고정" 배지와 용지 × 수량 매트릭스 표시
```

### AC-TAB3-002: 수량-구간 편집기

```gherkin
Given 구간 가격 상품이 선택되고 가격 책정 탭이 활성화된 상태
Then 다음 컬럼의 편집 가능한 DataTable 표시:
  - 옵션 코드, 최소 수량, 최대 수량, 단가
And 사용자가 새 행 추가 및 기존 행 삭제 가능
And 변경사항은 price_tiers CRUD mutation으로 저장
```

### AC-TAB3-003: 구간 유효성 검사

```gherkin
Given 사용자가 수량 구간을 편집 중
When 공백이 있는 구간 저장 (예: 구간 1: max=100, 구간 2: min=102)
Then 유효성 검사 오류 표시: "수량 구간에 100과 102 사이에 공백이 있습니다"
And 저장 방지

When 중복이 있는 구간 저장 (예: 구간 1: max=100, 구간 2: min=50)
Then 유효성 검사 오류 표시: "수량 구간이 50과 100 사이에서 중복됩니다"
And 저장 방지
```

### AC-TAB3-004: 고정 가격 매트릭스

```gherkin
Given 고정 가격 상품이 선택된 상태
Then 스프레드시트 형식 매트릭스 표시:
  - 행: 해당 상품의 paper_product_mapping에서 가져온 용지 유형
  - 열: 수량 기준점
  - 셀: selling_price 값 (편집 가능)
And 셀 편집 시 즉시 낙관적 업데이트 전송
```

### AC-TAB3-005: 손지 수량 설정

```gherkin
Given 가격 책정 탭이 활성화된 상태
When 사용자가 "손지 설정" 섹션을 펼침
Then 전역 손지 설정 표시 (loss_rate, min_loss_qty)
And 상품별 재정의가 존재하면 "재정의" 배지와 함께 표시
And 사용자가 상품별 재정의 생성/편집 가능
```

---

## 7. 탭 4: 옵션 & 선택지 인수 기준

### AC-TAB4-001: 옵션 정의 목록

```gherkin
Given 상품이 선택되고 "옵션 & 선택지" 탭이 활성화된 상태
Then 모든 30개 option_definitions를 다음과 함께 목록 표시:
  - 키, 이름, 옵션 클래스 (배지), UI 컴포넌트
  - 활성 토글 (이 상품에 대해 켜기/끄기, product_options에서)
```

### AC-TAB4-002: 상품 옵션 활성화

```gherkin
Given "paper_type" 옵션이 현재 상품에 대해 켜짐
Then 다음으로 product_options 레코드 생성:
  - is_required = false, is_visible = true, is_internal = false
And 옵션이 선택지를 표시하도록 확장

Given "paper_type" 옵션이 꺼짐
Then product_options 레코드가 소프트 삭제 (is_active = false)
And 옵션이 접힘
```

### AC-TAB4-003: 선택지 표시

```gherkin
Given 활성 옵션이 확장된 상태
Then option_choices에서 가져온 선택지 표시:
  | 컬럼      | 소스                       |
  | 코드      | option_choices.code        |
  | 이름      | option_choices.name        |
  | 가격 키   | option_choices.price_key   |
And 선택지는 display_order 순으로 정렬
```

### AC-TAB4-004: 상품 옵션 플래그

```gherkin
Given 상품 옵션이 활성화된 상태
Then 다음 플래그를 편집 가능:
  - 필수 체크박스 (is_required)
  - 표시 체크박스 (is_visible)
  - 내부용 체크박스 (is_internal)
  - 기본 선택지 드롭다운 (default_choice_id)
  - UI 재정의 드롭다운 (ui_component_override)
And 변경사항은 product_options.update mutation으로 저장
```

---

## 8. 탭 5: 제약 & 의존성 인수 기준

### AC-TAB5-001: 제약 목록 표시

```gherkin
Given 상품이 선택되고 "제약 & 의존성" 탭이 활성화된 상태
Then 이 상품의 option_constraints가 constraint_type별로 그룹화되어 표시
And 각 제약은 다음을 표시:
  - 소스: 옵션 이름, 필드, 연산자, 값
  - 대상: 옵션 이름, 필드, 작업, 값
  - 우선순위 배지
```

### AC-TAB5-002: 제약 생성

```gherkin
Given 사용자가 "제약 추가" 클릭
When 다음 필드가 있는 폼 표시:
  - 제약 유형, 소스 옵션, 소스 필드, 연산자, 값
  - 대상 옵션, 대상 필드, 대상 작업, 대상 값
  - 우선순위, 설명
And 사용자가 모든 필수 필드를 입력하고 "저장" 클릭
Then 현재 상품에 대한 새 option_constraints 레코드 생성
And 제약 목록 갱신
```

### AC-TAB5-003: 의존성 목록 표시

```gherkin
Given "제약 & 의존성" 탭이 활성화된 상태
Then 이 상품의 option_dependencies가 다음을 표시:
  - 부모 옵션 이름 + 선택지 이름
  - 자식 옵션 이름
  - 의존성 유형 배지 (표시/필수/값 집합)
```

### AC-TAB5-004: 의존성 생성

```gherkin
Given 사용자가 "의존성 추가" 클릭
When 다음이 있는 폼 표시:
  - 부모 옵션 드롭다운 → 부모 선택지 드롭다운 (캐스케이딩)
  - 자식 옵션 드롭다운
  - 의존성 유형 선택
And 사용자가 모든 필드를 입력하고 "저장" 클릭
Then 새 option_dependencies 레코드 생성
And 의존성 목록 갱신
```

---

## 9. 탭 6: MES 연동 인수 기준

### AC-TAB6-001: 상품-MES 매핑

```gherkin
Given 상품이 선택되고 "MES 연동" 탭이 활성화된 상태
Then product_mes_mapping에서 가져온 상품의 MES 매핑 표시:
  - MES 품목: 256개 항목 검색 가능 드롭다운
  - 커버 유형: 선택기 (없음/표지/내지)
And 사용자가 MES 매핑 추가/제거 가능
```

### AC-TAB6-002: 에디터 매핑

```gherkin
Given MES 탭이 활성화된 상태
Then product_editor_mapping에서 가져온 상품의 에디터 매핑 표시:
  - 에디터 유형 (readonly: "edicus")
  - 템플릿 ID (편집 가능 입력, 기본값: huni_code)
  - 활성 상태 스위치
And 변경사항은 product_editor_mapping update mutation으로 저장
```

### AC-TAB6-003: 옵션-선택지 MES 매핑 테이블

```gherkin
Given MES 탭이 활성화된 상태
Then 상품 옵션과 연관된 모든 option_choice_mes_mapping 레코드 표시:
  | 컬럼             | 소스                                    |
  | 옵션 선택지      | option_choices.name (조인)              |
  | 옵션 클래스      | 자재 / 공정 / 후가공 (option_class 기반) |
  | MES 품목         | mes_items 드롭다운                      |
  | MES 코드         | option_choice_mes_mapping.mes_code      |
  | 상태             | mapping_status 배지                     |
  | 매핑 담당자      | mapped_by                               |
  | 매핑 일시        | mapped_at                               |
And 옵션 클래스 (자재/공정/후가공) 별로 필터링 또는 그룹화 가능
```

### AC-TAB6-004: 미완료 매핑 경고

```gherkin
Given 상품에 mapping_status = "pending"인 option_choice_mes_mapping 레코드가 5개
When 상품이 선택됨
Then "MES 연동" 탭 레이블에 경고 배지 "5" 표시
And 탭을 열면 경고 배너 표시: "5개 옵션 선택지의 MES 매핑이 대기 중입니다"
```

### AC-TAB6-005: 매핑 상태 업데이트

```gherkin
Given 옵션 선택지 매핑이 "pending" 상태
When 사용자가 드롭다운에서 MES 품목을 선택하고 저장
Then mapping_status가 "mapped"로 변경
And mapped_by가 현재 Admin 사용자 이름으로 설정
And mapped_at이 현재 타임스탬프로 설정
And 대기 배지 카운트 1 감소
```

### AC-TAB6-006: MES 매핑 완료도 표시기

```gherkin
Given 상품이 선택된 상태
When "MES 연동" 탭 레이블 확인
Then "전체 N / 완료 M" 형식의 배지 표시:
  - N = 전체 option_choice_mes_mapping 수
  - M = mapping_status = "mapped" 또는 "verified"인 수

When M = N (모든 매핑 완료)
Then 탭 레이블에 초록색 ✅ 배지 표시
And 탭 내부 상단에 "주문 가능" 상태 표시

When M < N (미완료 매핑 존재)
Then 탭 레이블에 주황색 숫자 배지 표시 (미완료 수 = N - M)
And 탭 내부 상단에 "주문 불가 — MES 매핑 미완료" 경고 표시
```

---

## 10. 지원 페이지 인수 기준

### AC-SUP-001: 용지 마스터 페이지

```gherkin
Given 사용자가 "/admin/catalog/papers"로 이동
Then DataTable에 모든 용지 표시:
  - 코드, 이름, 약어, 중량, 원지 사이즈, 원가/연, 판매가/연, 순서, 활성
And 필드 인라인 편집 가능
And "용지 추가" 및 삭제 컨트롤 사용 가능
```

### AC-SUP-002: 공정 마스터 페이지

```gherkin
Given 사용자가 "/admin/catalog/processes"로 이동
Then 3개의 접기 가능한 섹션 표시:
  1. 인쇄 방식: 코드, 이름, 면수, 색상 유형, 가격 코드가 있는 DataTable
  2. 후가공: group_code별 그룹화된 코드, 이름, 공정 유형이 있는 DataTable
  3. 제본: 코드, 이름, 최소/최대 페이지, 페이지 단위가 있는 DataTable
And 각 섹션에서 CRUD 작업 지원
```

### AC-SUP-003: 조판 규칙 페이지

```gherkin
Given 사용자가 "/admin/catalog/pricing/imposition"로 이동
Then DataTable에 조판 규칙 표시:
  - 재단 사이즈 코드, 재단 W×H, 작업 W×H, 조판 수, 원지 규격
And 인라인 편집 및 추가/삭제 컨트롤 사용 가능
```

### AC-SUP-004: MES 품목 페이지

```gherkin
Given 사용자가 "/admin/catalog/mes-items"로 이동
Then DataTable에 MES 품목 표시:
  - 품목 코드, 그룹 코드, 이름, 약어, 품목 유형, 단위
And 행 확장 시 품목의 옵션 표시 (mes_item_options: option01~10)
And 레코드 편집 가능 (일반적으로 가져오기에서 읽기 전용)
```

---

## 11. 가져오기 연동 인수 기준

### AC-IMPORT-001: 가져오기 트리거

```gherkin
Given 사용자가 "/admin/catalog"에 있음
When 사용자가 페이지 헤더의 "가져오기" 버튼 클릭
Then 사용 가능한 가져오기 대상이 있는 모달 열림
And 사용자가 각 대상에 대한 Excel 파일 업로드 가능
And "가져오기" 클릭 시 가져오기 파이프라인 트리거
```

### AC-IMPORT-002: 가져오기 상태 표시기

```gherkin
Given 카탈로그 페이지가 로드된 상태
Then 헤더에 가져오기 상태 배지 표시:
  - 마지막 가져오기 날짜
  - 도메인별 레코드 수 요약
  - 데이터 적용률 (데이터가 있는 도메인 / 전체 도메인)
```

### AC-IMPORT-003: 가져오기 로그 링크

```gherkin
Given 가져오기 상태 표시기가 표시된 상태
When 사용자가 클릭
Then 가져오기 로그 뷰로 이동:
  - data_import_log의 가져오기 이력
  - 상태, 레코드 수, 타임스탬프, 오류 메시지
```

---

## 12. 공통 요구사항 인수 기준

### AC-CROSS-001: 낙관적 업데이트

```gherkin
Given 사용자가 필드를 인라인 편집 (예: 용지 중량)
Then UI가 서버 응답 대기 없이 즉시 업데이트
And 서버 mutation 실패 시 UI가 원래 값으로 되돌아감
And 오류 토스트 표시
```

### AC-CROSS-002: 미저장 변경사항 가드

```gherkin
Given 사용자가 "기본 정보" 탭의 필드를 수정했지만 저장하지 않음
When 사용자가 다른 탭을 클릭하거나 다른 상품을 선택
Then 확인 다이얼로그 표시: "저장되지 않은 변경사항이 있습니다. 취소하시겠습니까?"
And "취소" 클릭 시 현재 탭 유지
And "버리기" 클릭 시 이동 후 변경사항 되돌리기
```

### AC-CROSS-003: 반응형 동작

```gherkin
Given 뷰포트 너비가 800px (1024px 미만)
Then 카테고리 트리 패널이 햄버거 토글 뒤에 숨겨짐
And 중앙 및 오른쪽 패널이 수직으로 쌓임
And 오른쪽 상세 패널이 상품 목록 아래 전체 너비 섹션으로 렌더링
```

### AC-CROSS-004: 로딩 상태

```gherkin
Given 사용자가 카테고리를 선택
When 상품 목록이 로딩 중
Then 중앙 패널에 스켈레톤 로더 표시

Given 사용자가 상품을 선택
When 탭 콘텐츠가 로딩 중
Then 오른쪽 패널 탭 영역에 스켈레톤 로더 표시
```

### AC-CROSS-005: 탭 오류 경계

```gherkin
Given 데이터 오류로 가격 책정 탭 로딩 실패
Then 가격 책정 탭에 "재시도" 버튼과 함께 오류 메시지 표시
And 다른 모든 탭은 정상 작동 유지
And 카테고리 트리와 상품 목록은 영향 없음
```

---

## 13. 품질 게이트

### 완료 정의 (Definition of Done)

- [ ] 위의 모든 인수 기준이 수동 테스트 통과
- [ ] 모든 새 컴포넌트에 단위 테스트 있음 (Vitest + Testing Library)
- [ ] tRPC 라우터 확장에 통합 테스트 있음
- [ ] TypeScript 오류 없음 (`tsc --noEmit`)
- [ ] ESLint 오류 없음
- [ ] 새 코드 테스트 커버리지 >= 85%
- [ ] 320px, 768px, 1024px, 1440px 뷰포트에서 반응형 동작 검증
- [ ] 모든 비동기 작업에 로딩 상태 구현
- [ ] 모든 탭에 오류 경계 적용
- [ ] 모든 인라인 편집에 낙관적 업데이트 및 롤백 구현
- [ ] 성능 목표 달성 (상품 상세 로딩 < 500ms)
- [ ] 26개 도메인 테이블 모두 카탈로그 UI에서 접근 가능 (DB 커버리지 100%)
- [ ] **huni_code 5자리 숫자 포맷 검증 로직 테스트 통과**
- [ ] **MES 매핑 완료도 표시기 (전체 N / 완료 M 형식) 정상 동작 확인**
- [ ] **탭 6의 자재/공정/후가공 option_class 구분 표시 검증**

### 테스트 전략

| 테스트 유형   | 커버리지 영역                    | 도구                       |
|---------------|----------------------------------|----------------------------|
| 단위 테스트   | 탭 컴포넌트, 유효성 검사 로직    | Vitest + Testing Library   |
| 통합 테스트   | tRPC 라우터 프로시저             | Vitest                     |
| E2E (선택)    | 전체 사용자 플로우               | Playwright                 |
| 시각 테스트   | 3패널 레이아웃, 반응형           | 수동 / Storybook           |

---

## 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| v0.1 | 2026-02-01 | 영문 초안 |
| v1.0 | 2026-02-27 | 한글 전환 + AC-TAB1-004 (huni_code 5자리 검증) + AC-TAB6-006 (MES 완료도 표시기) + AC-TAB6-003 option_class 컬럼 추가 + 품질 게이트 3개 항목 추가 |
