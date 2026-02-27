# SPEC-DATA-002 DB 재설계 심층 분석 보고서 v2

> 작성일: 2026-02-24
> 버전: v2.0
> SPEC 참조: SPEC-DATA-002
> 대상: widget.creator 인쇄 자동견적 PostgreSQL 스키마 (Drizzle ORM)
> 현재 상태: 26개 테이블, 9개 스키마 파일, 6개 도메인
> v1 대비 확장: Excel 시트별 컬럼 분류, 가격 모델별 수식 분석, 외부 플랫폼 통합 설계, 권장 정규화 스키마

---

## 목차

1. [Excel 구조와 DB 역할 분석](#1-excel-구조와-db-역할-분석)
2. [시트별 컬럼 분류표](#2-시트별-컬럼-분류표)
3. [가격 계산 모델별 분석](#3-가격-계산-모델별-분석)
4. [외부 플랫폼 통합 설계 요구사항](#4-외부-플랫폼-통합-설계-요구사항)
5. [정규화 문제 심층 분석](#5-정규화-문제-심층-분석)
6. [권장 DB 스키마 설계](#6-권장-db-스키마-설계)
7. [현재 스키마와 권장 스키마 갭 분석](#7-현재-스키마와-권장-스키마-갭-분석)
8. [실행 계획 (Phase별)](#8-실행-계획-phase별)

---

## 1. Excel 구조와 DB 역할 분석

### 1.1 왜 상품마스터와 가격표가 분리되었는가

후니프린팅의 Excel 데이터는 의도적으로 **두 개의 독립 파일**로 분리되어 있다:

| 파일 | 시트 수 | 역할 | 데이터 성격 |
|------|---------|------|------------|
| `!후니프린팅_상품마스터_260209_updated.xlsx` | 13개 | **무엇을** 주문할 수 있는가 (카탈로그) | 상품 정의, 옵션 구성, 사이즈, MES 코드, 파일 사양 |
| `!후니프린팅_인쇄상품_가격표_260214.xlsx` | 16개 | **얼마에** 생산하는가 (가격 계산) | 단가 조회 테이블, 수량 구간, 계산 매트릭스 |

이 분리는 인쇄업 운영 현실을 반영한다:

- **상품마스터**는 영업/기획 담당이 관리한다. 새 상품 추가, 옵션 변경, MES 코드 매핑 등이 여기서 일어난다.
- **가격표**는 원가/재무 담당이 관리한다. 용지 단가 변동, 출력비 조정, 할인율 변경 등이 여기서 일어난다.
- 두 파일의 **변경 주기가 다르다**: 상품마스터는 신상품 출시 시(월 1~2회), 가격표는 원자재 가격 변동 시(분기 1~2회) 변경된다.

### 1.2 각 Excel 시트의 역할 분류

#### 상품마스터 시트 역할

| 시트명 | 역할 분류 | 설명 |
|--------|----------|------|
| MAP | 카탈로그 구조 | 12개 대분류 카테고리 계층 트리 |
| 디지털인쇄 | 상품 카탈로그 | 엽서/전단/포스터 등 디지털인쇄 상품 정의 |
| 스티커 | 상품 카탈로그 | 스티커 상품 정의 + 옵션(종이/인쇄/커팅/조각수) |
| 명함 | 상품 카탈로그 | 명함 상품 정의 (간단한 옵션) |
| 책자 | 상품 카탈로그 | 복합 상품 정의 (내지+표지+제본, 이중 MES) |
| 아크릴 | 상품 카탈로그 | 아크릴 상품 정의 (비규격 지원, 직접입력 가격) |
| 캘린더 | 상품 카탈로그 | 캘린더 상품 정의 |
| 사진 | 상품 카탈로그 | 사진 인화 상품 정의 |
| 실사 | 상품 카탈로그 | 실사 출력 상품 정의 |
| 문구 | 상품 카탈로그 | 문구 상품 정의 |
| 굿즈 | 상품 카탈로그 | 굿즈 상품 정의 |
| 사인 | 상품 카탈로그 | PET배너 등 사인 상품 정의 |
| 포장 | 상품 카탈로그 | 포장 상품 정의 |

#### 가격표 시트 역할

| 시트명 | 역할 분류 | 조회 패턴 | 사용 모델 |
|--------|----------|----------|----------|
| 사이즈별 판걸이수 | 계산 규칙 | 재단사이즈 -> 판걸이수 | Model 1,2,5 |
| 디지털용지 | 자재 단가 | 용지코드 -> 국4절 단가 | Model 1,2,5 |
| 디지털출력비 | 공정 단가 (Tier) | 판수 x 인쇄코드 -> 단가 | Model 1,2,5 |
| 후가공 | 공정 단가 (Tier) | 수량 x 후가공코드 -> 단가 | Model 1,2,5 |
| 후가공_박 | 공정 단가 (Matrix) | 가로mm x 세로mm -> 동판비 | Model 5 |
| 명함 | 고정 단가 | 상품 x 용지 x 인쇄 -> 고정가 | Model 3 |
| 제본 | 공정 단가 (Tier) | 수량 x 제본코드 -> 단가 | Model 5 |
| 스티커 | 공정 단가 (Tier) | 사이즈+커팅 x 수량 -> 가공비 | Model 2 |
| 아크릴 | 고정 단가 (Matrix) | 가로mm x 세로mm -> 단가 | Model 7 |
| 포스터(실사) | 고정 단가 (Matrix+회배) | 폭mm x 높이mm -> 단가 | Model 6 |
| 옵션결합상품(엽서북) | 패키지 단가 (3D Matrix) | 사이즈 x 인쇄 x 페이지 x 수량 | Model 4 |
| 사인 | 고정 단가 | 사이즈 x 옵션조합 -> 고정가 | Model 6 변형 |

### 1.3 현재 DB가 이 역할 분리를 어떻게 위반했는가

현재 DB의 핵심 위반 사항:

**위반 1: 카탈로그와 가격 데이터의 혼재**

```
products 테이블에 shopby_id, edicus_code, editor_enabled, mes_registered가 포함
-> 카탈로그(상품 정의) + 외부연동(Shopby/Edicus/MES) + UI 설정이 한 테이블에 혼재
```

**위반 2: 가격 조회 키에 Excel 표시명 직접 사용**

```
price_tiers.option_code = "1줄", "2줄", "무광코팅(단면)"
-> 가격표 Excel의 한국어 헤더를 DB 조회 키로 사용
-> 엑셀 헤더 변경 시 DB 데이터도 변경 필요 (결합도 최대)
```

**위반 3: 단일 price_tiers로 이종 가격 데이터 통합**

```
동일한 price_tiers 테이블이 출력비, 코팅비, 가공비, 제본비를 모두 저장
-> option_code의 의미가 price_table_id에 따라 달라짐
-> FK 무결성 검증 불가
```

**위반 4: 2D/3D 매트릭스 가격 모델링 부재**

```
아크릴(가로x세로), 포스터(폭x높이), 박/형압(가로x세로) 같은
2차원 매트릭스 가격 조회를 위한 전용 구조 없음
-> fixed_prices에 모든 조합을 행으로 펼쳐야 함 (비효율)
```

**위반 5: 상품 유형별 가격 계산 경로 미분리**

```
7개 가격 모델이 동일한 테이블 세트를 공유하면서
어떤 테이블을 어떤 순서로 조회해야 하는지 코드에만 의존
-> DB 스키마만 보고는 가격 계산 경로를 이해할 수 없음
```

---

## 2. 시트별 컬럼 분류표

### 2.1 [디지털인쇄] 시트 컬럼 분류

| 컬럼명 | 원천 | 분류 | DB 반영 필요 | 현재 위치 | 권장 위치 |
|--------|------|------|-------------|----------|----------|
| 구분 | 마스터 | 내부처리용 | N (카테고리 분류 보조) | - | - |
| ID (Shopby ID) | 마스터 | 외부통합용 | Y | `products.shopby_id` | `shopby_product_mapping.shopby_id` |
| MES ITEM_CD | 마스터 | 외부통합용 | Y | `mes_items.item_code` | `product_mes_mapping` (현행 유지) |
| 상품명 | 마스터 | UI표시용 | Y | `products.name` | `products.name` (현행 유지) |
| 사이즈(필수) | 마스터 | UI표시용+가격계산용 | Y | `product_sizes.display_name` | `product_sizes` (현행 유지) |
| 판수 | 마스터 | 가격계산용 | Y | `product_sizes.imposition_count` | `product_sizes.imposition_count` (현행 유지) |
| 블리드 | 마스터 | 내부처리용 | N (상수 3.0mm) | `product_sizes.bleed` | 제거 (코드 상수) |
| 작업사이즈 | 마스터 | 내부처리용 | N (판걸이 규칙에서 파생) | `product_sizes.work_width/height` | 제거 (`imposition_rules`에서 조회) |
| 재단사이즈 | 마스터 | 가격계산용 | Y | `product_sizes.cut_width/height` | `product_sizes` (현행 유지) |
| 출력용지규격 | 마스터 | 가격계산용 | Y | `products.sheet_standard` | `products.sheet_standard` (현행 유지) |
| 파일명약어 | 마스터 | 파일/운영용 | N (MES 연동 시에만) | `mes_items.abbreviation` | `mes_items` (현행 유지) |
| 출력파일 | 마스터 | 파일/운영용 | N | - | 미저장 (운영 프로세스용) |
| 폴더 | 마스터 | 파일/운영용 | N | - | 미저장 (운영 프로세스용) |
| 주문방법 | 마스터 | UI표시용+운영 | Y | `products.order_method` | `products.order_method` (현행 유지) |

### 2.2 [스티커] 시트 컬럼 분류

| 컬럼명 | 원천 | 분류 | DB 반영 필요 | 현재 위치 | 권장 위치 |
|--------|------|------|-------------|----------|----------|
| 구분 | 마스터 | 내부처리용 | N | - | - |
| ID (Shopby ID) | 마스터 | 외부통합용 | Y | `products.shopby_id` | `shopby_product_mapping` |
| MES ITEM_CD | 마스터 | 외부통합용 | Y | `product_mes_mapping` | 현행 유지 |
| 상품명 | 마스터 | UI표시용 | Y | `products.name` | 현행 유지 |
| 사이즈(필수) | 마스터 | UI+가격계산 | Y | `product_sizes` | 현행 유지 |
| 판수 | 마스터 | 가격계산용 | Y | `product_sizes.imposition_count` | 현행 유지 |
| 블리드/작업사이즈/재단사이즈 | 마스터 | 내부처리용 | 부분적 | `product_sizes` | 재단사이즈만 유지 |
| 출력용지규격 | 마스터 | 가격계산용 | Y | `products.sheet_standard` | 현행 유지 |
| 파일명약어/출력파일/폴더 | 마스터 | 파일/운영용 | N | `mes_items` | 현행 유지 |
| 주문방법 | 마스터 | UI+운영 | Y | `products.order_method` | 현행 유지 |
| 종이(필수) | 마스터 | UI옵션+가격계산 | Y | `option_choices` -> `papers` | `paper_product_mapping` + UI layer |
| 인쇄(옵션) | 마스터 | UI옵션+가격계산 | Y | `option_choices` -> `print_modes` | `product_options` + UI layer |
| 별색인쇄 (화이트/클리어/핑크/금색/은색) | 마스터 | UI옵션+가격계산 | Y | `option_choices` -> `print_modes` | 별색 플래그별 `print_modes` 매핑 |
| 코팅(옵션) | 마스터 | UI옵션+가격계산 | Y | `option_choices` -> `post_processes` | `product_options` + UI layer |
| 커팅(옵션) | 마스터 | UI옵션+가격계산 | Y | `option_choices` | 커팅 전용 가격 테이블 필요 |
| 조각수(옵션: min/max/step) | 마스터 | UI옵션+가격계산 | Y | `option_constraints` | `product_options` (range config) |
| 제작수량(필수: min/max/step) | 마스터 | UI옵션+가격계산 | Y | `option_constraints` | `product_options` (range config) |
| 후가공(가변텍스트/가변이미지) | 마스터 | UI옵션 | Y | `option_choices` | `product_options` |
| 추가상품 | 마스터 | UI옵션+가격 | Y | 미구현 | `addon_products` (신규 필요) |

### 2.3 [책자] 시트 컬럼 분류

책자는 **복합 상품**으로 내지(body)와 표지(cover) 두 파트로 구성된다.

#### 내지(Body) 파트

| 컬럼명 | 원천 | 분류 | DB 반영 필요 | 현재 위치 | 권장 위치 |
|--------|------|------|-------------|----------|----------|
| MES ITEM_CD (내지) | 마스터 | 외부통합용 | Y | `product_mes_mapping` (cover_type='inner') | 현행 유지 |
| 블리드/작업사이즈/재단사이즈 | 마스터 | 내부처리용 | 부분적 | `product_sizes` | 재단사이즈만 |
| 파일명약어/출력파일/폴더 | 마스터 | 파일/운영용 | N | `mes_items` | 현행 유지 |
| 내지종이(필수) | 마스터 | UI옵션+가격계산 | Y | `option_choices` -> `papers` | `paper_product_mapping` (cover_type='inner') |
| 내지인쇄(필수) | 마스터 | UI옵션+가격계산 | Y | `option_choices` -> `print_modes` | `product_options` |
| 내지페이지수(min/max/step) | 마스터 | UI옵션+가격계산 | Y | `option_constraints` | `product_options` (range config) |

#### 표지(Cover) 파트

| 컬럼명 | 원천 | 분류 | DB 반영 필요 | 현재 위치 | 권장 위치 |
|--------|------|------|-------------|----------|----------|
| MES ITEM_CD (표지) | 마스터 | 외부통합용 | Y | `product_mes_mapping` (cover_type='cover') | 현행 유지 |
| 블리드/작업사이즈 | 마스터 | 내부처리용 | N | `product_sizes` | 제거 |
| 파일명약어/출력파일/폴더 | 마스터 | 파일/운영용 | N | `mes_items` | 현행 유지 |
| 표지종이(필수) | 마스터 | UI옵션+가격계산 | Y | `option_choices` -> `papers` | `paper_product_mapping` (cover_type='cover') |
| 표지인쇄(필수) | 마스터 | UI옵션+가격계산 | Y | `option_choices` -> `print_modes` | `product_options` |
| 표지코팅(옵션) | 마스터 | UI옵션+가격계산 | Y | `option_choices` -> `post_processes` | `product_options` |
| 투명커버(옵션) | 마스터 | UI옵션+가격 | Y | `option_choices` | `product_options` |

#### 공통 파트

| 컬럼명 | 원천 | 분류 | DB 반영 필요 | 현재 위치 | 권장 위치 |
|--------|------|------|-------------|----------|----------|
| 박/형압가공 | 마스터 | UI옵션+가격계산 | Y | `option_choices` | `product_options` + `foil_prices` |
| 크기 | 마스터 | 가격계산용 | Y | - | `foil_prices` 조회 키 |
| 박칼라 | 마스터 | UI옵션+가격계산 | Y | - | `foil_prices.foil_color` |
| 제본방식(필수) | 마스터 | UI옵션+가격계산 | Y | `option_choices` -> `bindings` | `product_options` + `binding_price_tiers` |
| 제본방향(옵션) | 마스터 | UI옵션 | Y | `option_choices` | `product_options` |
| 면지(옵션) | 마스터 | UI옵션+가격 | Y | `option_choices` | `product_options` |
| 링컬러/바인더링(옵션) | 마스터 | UI옵션 | Y | `option_choices` | `product_options` |
| 제작수량(min/max/step) | 마스터 | UI+가격계산 | Y | `option_constraints` | `product_options` |
| 주문방법 | 마스터 | UI+운영 | Y | `products.order_method` | 현행 유지 |
| 개별포장(옵션) | 마스터 | UI옵션+가격 | Y | `option_choices` | `product_options` |

**핵심 발견**: 책자는 **두 개의 MES ITEM_CD**를 갖는다 (내지 + 표지 = 별도 생산 품목). 현재 `product_mes_mapping.cover_type` 컬럼이 이를 지원하지만, `cover_type`의 값이 명확히 정의되지 않았다. `'body'`/`'cover'` 또는 `'inner'`/`'cover'`로 표준화 필요.

### 2.4 [아크릴] 시트 컬럼 분류

| 컬럼명 | 원천 | 분류 | DB 반영 필요 | 현재 위치 | 권장 위치 |
|--------|------|------|-------------|----------|----------|
| 구분 | 마스터 | 내부처리용 | N | - | - |
| code (아크릴자체코드) | 마스터 | 내부처리용 | Y | `products.huni_code` | 현행 유지 |
| MES ITEM_CD | 마스터 | 외부통합용 | Y | `product_mes_mapping` | 현행 유지 |
| 상품명 | 마스터 | UI표시용 | Y | `products.name` | 현행 유지 |
| 사이즈(필수) | 마스터 | UI+가격계산 | Y | `product_sizes` | 현행 유지 |
| 비규격(가로min/max, 세로min/max) | 마스터 | UI+가격계산 | Y | `product_sizes.custom_*` | 현행 유지 |
| 가격(직접입력!) | **가격표** | 가격계산용 | Y | `fixed_prices` | `matrix_prices` (신규) |
| 블리드/작업사이즈/재단사이즈 | 마스터 | 내부처리용 | 부분적 | `product_sizes` | 재단사이즈만 |
| 출력용지규격 | 마스터 | 가격계산용 | Y | `products.sheet_standard` | 현행 유지 |
| 파일명약어/출력파일/폴더 | 마스터 | 파일/운영용 | N | `mes_items` | 현행 유지 |
| 주문방법 | 마스터 | UI+운영 | Y | `products.order_method` | 현행 유지 |
| 소재(필수) | 마스터 | UI옵션 | Y | `option_choices` -> `materials` | `product_options` |
| 인쇄사양 | 마스터 | 내부처리용 | N (고정값) | - | 미저장 |
| 조각수(옵션) | 마스터 | UI+가격계산 | Y | `option_constraints` | `product_options` |
| 가공(가공명/가격) | 마스터 | UI+가격 | Y | `option_choices` | `product_options` + 가격 데이터 |
| 추가상품 | 마스터 | UI+가격 | Y | 미구현 | `addon_products` (신규 필요) |

**핵심 발견**: 아크릴은 **직접입력형 가격**을 사용한다. 수식 기반이 아닌 가로x세로 2D 매트릭스에서 단가를 직접 조회한다. 이는 `fixed_prices`보다 `matrix_prices` 전용 테이블이 더 적합하다.

### 2.5 가격표 주요 시트 컬럼 분류

#### [디지털용지] 시트

| 컬럼명 | 분류 | DB 반영 필요 | 현재 위치 | 권장 위치 |
|--------|------|-------------|----------|----------|
| 구분 | 내부처리용 | N | - | - |
| 종이명 | UI표시용 | Y | `papers.name` | 현행 유지 |
| 평량(g/m2) | UI표시+자재식별 | Y | `papers.weight` | 현행 유지 |
| 코드(paper code) | 시스템식별용 | Y | `papers.code` | 현행 유지 |
| 비고(Mass Code) | 외부통합용 | N (MES 참조용) | - | `mes_items` 연동 시 |
| 전지(full sheet size) | 내부처리용 | N (견적 불필요) | `papers.sheet_size` | 제거 |
| 구매원가 | 가격계산용(원가) | Y | `papers.cost_per_ream` | `papers.cost_per_4cut`만 유지 |
| 연당가 | 가격계산용(원가) | N (4절 단가로 충분) | `papers.selling_per_ream` | 제거 |
| 종이사이즈 | 내부처리용 | N | - | 미저장 |
| **가격(국4절)** | **가격계산용(핵심!)** | **Y** | `papers.selling_per_4cut` | **현행 유지 (데이터 시드 필수)** |
| 기본공급수량 | 내부처리용 | N | - | 미저장 |
| 상품유형별 적용 Y/N | 카탈로그 매핑 | Y | `paper_product_mapping` | 현행 유지 |

#### [디지털출력비] 시트

| 컬럼명 | 분류 | DB 반영 필요 | 현재 위치 | 권장 위치 |
|--------|------|-------------|----------|----------|
| 판수 (행 축) | 가격계산 키 | Y | `price_tiers.min_qty/max_qty` | `print_price_tiers.imposition_count` |
| 인쇄방식 코드 (열 축: 0,1,2,4,8,11,12...) | 가격계산 키 | Y | `price_tiers.option_code` (문제!) | `print_price_tiers.print_mode_id` (FK) |
| 단가 값 | 가격 데이터 | Y | `price_tiers.unit_price` | `print_price_tiers.unit_price` |

**핵심 문제**: 현재 `price_tiers.option_code`에 인쇄방식의 `price_code` 숫자를 문자열로 저장하거나 한국어 표시명을 저장하고 있다. 올바른 키는 `print_modes.price_code` (0,1,2,4,8,11,12,21,22,31,32)이며, 이를 `print_price_tiers.print_mode_id`로 FK 참조해야 한다.

#### [후가공] 시트

| 컬럼명 | 분류 | DB 반영 필요 | 현재 위치 | 권장 위치 |
|--------|------|-------------|----------|----------|
| 수량 (행 축) | 가격계산 키 | Y | `price_tiers.min_qty/max_qty` | `pp_price_tiers.min_qty/max_qty` |
| 후가공 코드 (열 축: 0,10,20,30,50...) | 가격계산 키 | Y | `price_tiers.option_code` (문제!) | `pp_price_tiers.post_process_id` (FK) |
| 단가 값 | 가격 데이터 | Y | `price_tiers.unit_price` | `pp_price_tiers.unit_price` |

**핵심 문제**: 후가공 하위옵션 코드(10=1줄, 20=2줄, 30=3줄, 50=5줄)가 `price_tiers.option_code`에 한국어 "1줄", "2줄"로 저장되어 있다. 올바른 키는 숫자 코드(10,20,30,50)이며, `post_processes` 테이블의 `sub_option_code`에 대응된다.

#### [제본] 시트

| 컬럼명 | 분류 | DB 반영 필요 | 현재 위치 | 권장 위치 |
|--------|------|-------------|----------|----------|
| 수량 (행 축) | 가격계산 키 | Y | `price_tiers.min_qty/max_qty` | `binding_price_tiers.min_qty/max_qty` |
| 제본코드 (열 축: 101,102,103,104) | 가격계산 키 | Y | `price_tiers.option_code` | `binding_price_tiers.binding_id` (FK) |
| 단가 값 | 가격 데이터 | Y | `price_tiers.unit_price` | `binding_price_tiers.unit_price` |

---

## 3. 가격 계산 모델별 분석

### 3.1 Model 1: 디지털인쇄 기본 (수식 기반)

**대상 상품**: 엽서, 전단, 포스터 (디지털인쇄 일반)

**계산 공식**:

```
총가격 = 용지비 + 출력비 + [별색비] + [코팅비] + [후가공비]
```

**세부 계산식**:

```
용지비 = papers.selling_per_4cut / imposition_count * (quantity + loss_quantity)
  - selling_per_4cut: [디지털용지] 시트의 가격(국4절) 컬럼
  - imposition_count: [사이즈별 판걸이수] 시트에서 재단사이즈로 조회
  - loss_quantity: loss_quantity_config에서 scope별 조회

출력비 = print_price_tiers에서 조회
  - 키: (price_table_id, print_mode_id, imposition_count 구간)
  - [디지털출력비] 시트: 판수(행) x 인쇄방식코드(열) -> 단가

별색비 = print_price_tiers에서 조회 (별색 인쇄코드: 11,12,21,22,31,32)
  - 별색인쇄 선택 시에만 추가
  - 화이트(11/12), 클리어(21/22), 핑크(31/32)

코팅비 = pp_price_tiers에서 조회
  - 키: (price_table_id, post_process_id, quantity 구간)
  - [후가공] 시트의 코팅 섹션

후가공비 = pp_price_tiers에서 조회
  - 미싱, 타공, 접지 등 각 후가공 항목별 조회 후 합산
```

**필요한 입력 데이터**:

| 입력 | 소스 | DB 테이블 |
|------|------|----------|
| 상품 ID | 사용자 선택 | `products` |
| 사이즈 | 사용자 선택 | `product_sizes` |
| 수량 | 사용자 입력 | - |
| 종이 | 사용자 선택 | `papers` (via `paper_product_mapping`) |
| 인쇄방식 | 사용자 선택 | `print_modes` |
| 별색인쇄 | 사용자 선택 (복수) | `print_modes` (별색 코드) |
| 코팅 | 사용자 선택 | `post_processes` (코팅 그룹) |
| 후가공 | 사용자 선택 (복수) | `post_processes` (각 그룹) |

**Excel 시트 참조 경로**:

```
[디지털용지].가격(국4절) -> papers.selling_per_4cut
[사이즈별 판걸이수] -> imposition_rules.imposition_count
[디지털출력비] -> print_price_tiers (판수 x 인쇄코드 -> 단가)
[후가공] -> pp_price_tiers (수량 x 후가공코드 -> 단가)
```

**현재 DB 지원 여부**: 부분 지원
- `papers.selling_per_4cut` 컬럼 존재하나 데이터 시드 상태 미확인
- `imposition_rules` 존재 및 동작
- `price_tiers`로 출력비/후가공비 통합 저장 중 (FK 미분리 문제)

### 3.2 Model 2: 스티커 (수식 + 커팅 가공비)

**대상 상품**: 스티커 전 종류

**계산 공식**:

```
총가격 = 용지비 + 출력비 + [별색비] + [코팅비] + 커팅가공비
```

**세부 계산식**: Model 1과 동일 + 커팅 가공비 추가

```
커팅가공비 = cutting_price_tiers에서 조회
  - 키: (사이즈+커팅조합, quantity 구간)
  - [스티커] 시트: "A5/반칼(자유형)4판", "A4/반칼(자유형)2판" 같은 복합 키
  - 설명: "사이즈별 용지비, 출력비 계산 후 커팅모양 가공비 추가 => 국4절 기준"
```

**현재 DB 지원 여부**: 미지원
- 스티커 커팅 가공비 전용 조회 구조 없음
- `price_tiers`에 통합 저장 시 복합 키(사이즈+커팅) 표현 어려움
- **신규 `cutting_price_tiers` 테이블 필요**

### 3.3 Model 3: 명함 (고정가격 조회)

**대상 상품**: 명함

**계산 공식**:

```
총가격 = fixed_price_lookup(상품명, 용지, 인쇄방식)
```

**세부 계산식**:

```
단가 = fixed_prices에서 조회
  - 키: (product_id, paper_id/condition_key, print_mode_id)
  - [명함] 시트: 상품명 x 용지 x 100장(단면/양면) -> 고정가
  - 수량 기본 100장, 배수 단위 가격
```

**현재 DB 지원 여부**: 지원
- `fixed_prices` 테이블 존재
- `product_id`, `paper_id`, `print_mode_id` FK로 조건 지정 가능

### 3.4 Model 4: 엽서북 (3D 매트릭스 패키지가)

**대상 상품**: 엽서북 (옵션결합상품)

**계산 공식**:

```
총가격 = package_price_lookup(사이즈, 인쇄방식, 페이지수, 수량)
```

**세부 계산식**:

```
패키지가 = package_prices에서 조회
  - 키: (product_id, size_id, print_mode_id, page_count, quantity 구간)
  - [옵션결합상품(엽서북)] 시트:
    사이즈(100*150, 150*100, 135*135...)
    x 인쇄방식코드(4=단면칼라, 8=양면칼라)
    x 페이지수(20, 30)
    x 수량구간 -> 패키지 단가
  - 사전 계산된 패키지 가격 (구성요소 분리 불필요)
```

**현재 DB 지원 여부**: 구조 존재, 데이터 미시드
- `package_prices` 테이블 존재 (product_id, size_id, print_mode_id, page_count, min_qty, selling_price)
- 데이터 시드 필요

### 3.5 Model 5: 책자 (구성품 합산)

**대상 상품**: 책자 전 종류 (중철, 무선, 트윈링, PUR 제본)

**계산 공식**:

```
총가격 = 내지가격 + 표지가격 + [후가공(박/형압)] + 제본가격 + [개별포장]
```

**세부 계산식**:

```
내지가격 = 내지용지비 + 내지출력비
  - 내지용지비 = papers.selling_per_4cut / imposition_count * (내지장수 + loss)
    내지장수 = page_count / (인쇄방식이 양면이면 2, 단면이면 1)
  - 내지출력비 = print_price_tiers 조회 (내지인쇄코드 x 내지판수)

표지가격 = 표지용지비 + 표지출력비 + [표지코팅비]
  - 표지용지비 = papers.selling_per_4cut / imposition_count * (1 + loss)
    표지는 항상 1장
  - 표지출력비 = print_price_tiers 조회 (표지인쇄코드 x 표지판수)
  - 표지코팅비 = pp_price_tiers 조회 (코팅옵션 x quantity)

후가공(박/형압) = foil_prices에서 조회
  - 동판비: foil_prices 2D 매트릭스 (가로mm x 세로mm -> 동판 가격)
  - 박가공비: 별도 면적 기반 가격
  - [후가공_박] 시트 참조

제본가격 = binding_price_tiers에서 조회
  - 키: (binding_id, quantity 구간)
  - [제본] 시트: 제본코드(101=중철,102=무선,103=트윈링,104=PUR) x 수량 -> 단가

개별포장 = pp_price_tiers에서 조회 (옵션 선택 시)
```

**핵심 복잡성**:
- 책자는 **두 개의 MES 생산 품목** (내지 + 표지)으로 분리 발주
- 내지 페이지수가 인쇄방식에 따라 장수 계산이 달라짐
- 제본 방식에 따라 최소/최대 페이지수 제약이 달라짐

**현재 DB 지원 여부**: 부분 지원
- 용지비/출력비 계산 경로 존재 (Model 1과 공유)
- `foil_prices` 테이블 존재하나 데이터 미시드
- 제본비: `price_tiers`에 통합 저장 (분리 필요)
- `product_mes_mapping.cover_type`으로 이중 MES 지원

### 3.6 Model 6: 포스터/실사 (2D 매트릭스 + 회배 계산)

**대상 상품**: 포스터, 실사 출력물

**계산 공식**:

```
총가격 = matrix_price_lookup(폭mm, 높이mm) * [회배계수] * quantity + [옵션가]
```

**세부 계산식**:

```
기본단가 = matrix_prices에서 조회
  - 키: (product_id, width_mm, height_mm)
  - [포스터(실사)] 시트: 폭mm(600,800,1000,1200) x 높이mm(600,800,...,1600) -> 단가

회배 계산 (표준 사이즈 초과 시):
  - 기준 높이 이상일 때: 가격 = base_price * (actual_height / base_height)
  - 예: 높이 1500mm, 기준 1000mm -> 가격 = base_price * 1.5
  - scaling_rules 테이블 또는 코드 로직으로 처리

옵션가 (사인 상품의 경우):
  - PET배너: 코팅(무광/유광) x 거치대(없음/실내/실외단면/실외양면) 조합
  - fixed_prices에서 옵션 조합별 추가가 조회
```

**현재 DB 지원 여부**: 미지원
- 2D 매트릭스 조회 전용 구조 없음
- 회배 계산 로직 미모델링
- **신규 `matrix_prices` 테이블 + `scaling_rules` 테이블 필요**

### 3.7 Model 7: 아크릴/굿즈 (직접입력 2D 매트릭스 + 수량 할인)

**대상 상품**: 아크릴, 굿즈

**계산 공식**:

```
총가격 = matrix_price_lookup(가로mm, 세로mm) * quantity * discount_rate(quantity)
```

**세부 계산식**:

```
단가 = matrix_prices에서 조회
  - 키: (product_id, width_mm, height_mm)
  - [아크릴] 시트: 가로mm(20,30,...,100) x 세로mm(20,30,...,100) -> 단가
  - "아크릴3T 단가표(직접입력형) 양면9도/단면7도 통용"

수량할인 = quantity_discount_rules에서 조회
  - 키: (product_id, quantity 구간)
  - 수량 구간별 할인율 적용
```

**현재 DB 지원 여부**: 미지원
- `fixed_prices`로 대체 가능하나 비효율 (모든 가로x세로 조합을 행으로 저장)
- `quantity_discount_rules` 테이블 부재
- **신규 `matrix_prices` + `quantity_discount_rules` 테이블 필요**

### 3.8 가격 모델별 DB 갭 요약

| 모델 | 대상 | 필요 테이블 | 현재 지원 | 갭 |
|------|------|-----------|----------|-----|
| Model 1 | 디지털인쇄 | papers, imposition_rules, print_price_tiers, pp_price_tiers | 부분 | price_tiers FK 미분리, selling_per_4cut 데이터 미확인 |
| Model 2 | 스티커 | Model 1 + cutting_price_tiers | 미지원 | cutting_price_tiers 부재 |
| Model 3 | 명함 | fixed_prices | 지원 | - |
| Model 4 | 엽서북 | package_prices | 구조만 | 데이터 미시드 |
| Model 5 | 책자 | Model 1 + foil_prices + binding_price_tiers | 부분 | binding 분리 필요, foil 데이터 미시드 |
| Model 6 | 포스터/실사 | matrix_prices + scaling_rules | 미지원 | 2D matrix + 회배 구조 부재 |
| Model 7 | 아크릴/굿즈 | matrix_prices + quantity_discount_rules | 미지원 | 2D matrix + 수량할인 부재 |

---

## 4. 외부 플랫폼 통합 설계 요구사항

### 4.1 MES (Manufacturing Execution System) 연동 설계

#### MES ITEM_CD 체계

```
형식: "XXX-XXXX" (3자리 카테고리 코드 + 4자리 순번)
예시: "001-0001" (디지털인쇄 첫 번째 품목)
```

#### 현재 스키마 분석

```
mes_items.item_code: VARCHAR(20) UNIQUE NOT NULL  -- MES ITEM_CD 저장
product_mes_mapping: product_id <-> mes_item_id (N:M)
  cover_type: VARCHAR(10)  -- 책자의 내지/표지 구분
mes_item_options: mes_item_id -> option_number + option_value (최대 10개)
option_choice_mes_mapping: option_choice_id -> mes_item_id (옵션별 MES 매핑)
```

#### 책자 복수 MES 항목 처리

책자는 **내지(body)**와 **표지(cover)**가 별도 MES 생산 품목이다:

```
product_mes_mapping 예시:
  product_id=100 (무선제본 책자A4)
    mes_item_id=201 (001-0101, 내지), cover_type='body'
    mes_item_id=202 (001-0102, 표지), cover_type='cover'
```

현재 구조는 이를 지원하지만 개선 필요:
- `cover_type` 값 표준화: `'body'` | `'cover'` | `NULL` (단일 MES 품목)
- `cover_type`에 CHECK 제약 추가

#### MES 연동 설계 원칙

1. **MES ITEM_CD는 불변 식별자**: 한번 할당되면 변경 불가
2. **옵션 조합 -> MES 품목 매핑**: `option_choice_mes_mapping`으로 처리
3. **생산 발주 데이터**: item_code + quantity + specifications (JSON)
4. **코어 도메인과 분리**: 가격 계산은 MES 코드를 참조하지 않음

### 4.2 Shopby (E-commerce Platform) 연동 설계

#### 현재 문제

```typescript
// huni-catalog.schema.ts
products = {
  shopbyId: integer('shopby_id').unique(),  // 관심사 위반: 외부 시스템 ID가 코어 테이블에
}
```

Shopby ID는 **외부 e-commerce 플랫폼의 식별자**로, 코어 상품 테이블에 포함되면 안 된다.

#### 권장 설계

```sql
-- 신규: shopby_product_mapping (Integration 레이어)
CREATE TABLE shopby_product_mapping (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  shopby_product_id INTEGER NOT NULL,        -- Shopby 상품 ID
  shopby_product_no VARCHAR(50),             -- Shopby 상품번호 (별도 체계)
  sync_status VARCHAR(20) DEFAULT 'synced',  -- synced, pending, error
  last_synced_at TIMESTAMPTZ,
  price_sync_enabled BOOLEAN DEFAULT true,   -- 가격 자동 동기화 여부
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id),
  UNIQUE(shopby_product_id)
);
```

#### Shopby 연동 설계 원칙

1. **가격 동기화**: 내부 가격 엔진 결과 -> Shopby 상품 가격 업데이트
2. **주문 수신**: Shopby 주문 -> 내부 주문 시스템 변환
3. **1:1 매핑**: 하나의 내부 상품 = 하나의 Shopby 상품
4. **동기화 상태 추적**: `sync_status`로 마지막 동기화 상태 관리

### 4.3 Edicus (In-browser Design Editor) 연동 설계

#### 현재 스키마 분석

```typescript
// huni-catalog.schema.ts - 코어 테이블에 혼재
products = {
  edicusCode: varchar('edicus_code', { length: 15 }).unique(),  // 관심사 위반
  editorEnabled: boolean('editor_enabled').default(false),       // 관심사 위반 (파생 가능)
}

// huni-integration.schema.ts - 적절한 분리
productEditorMappings = {
  productId: FK(products.id),
  editorType: VARCHAR(30) DEFAULT 'edicus',
  templateId: VARCHAR(100),
  templateConfig: JSONB,
}
```

#### 권장 개선

1. `products.edicus_code` -> `product_editor_mapping.edicus_code`로 이동
2. `products.editor_enabled` -> 제거 (`product_editor_mapping` 존재 여부로 파생)
3. `product_editor_mapping`에 사이즈별 템플릿 매핑 지원 추가

```sql
-- product_editor_mapping 개선
ALTER TABLE product_editor_mapping
  ADD COLUMN edicus_code VARCHAR(15),         -- products에서 이동
  ADD COLUMN size_id INTEGER REFERENCES product_sizes(id),  -- 사이즈별 템플릿
  DROP CONSTRAINT product_editor_mapping_product_id_key;     -- 1:1 -> 1:N 변경

-- 복합 유니크: 같은 상품의 같은 사이즈에 같은 에디터 타입은 하나
ALTER TABLE product_editor_mapping
  ADD CONSTRAINT uq_editor_product_size UNIQUE(product_id, size_id, editor_type);
```

#### Edicus 연동 설계 원칙

1. **편집기 활성화**: `product_editor_mapping` 레코드 존재 = 편집기 사용 가능
2. **템플릿 매핑**: 상품 + 사이즈 조합별 Edicus 템플릿 ID 지정
3. **설정 저장**: `template_config` JSONB로 Edicus 에디터 설정 전달
4. **코어 도메인과 분리**: 가격 계산은 Edicus 정보를 참조하지 않음

### 4.4 통합 레이어 분리 원칙

```
┌─────────────────────────────────────────────┐
│              Core Pricing Domain             │
│  products, papers, print_modes, price_tiers  │
│  (외부 시스템 ID 없음, 순수 가격 계산만)       │
└──────────────────┬──────────────────────────┘
                   │ code 기반 연결 (FK 아님)
┌──────────────────┴──────────────────────────┐
│           Integration Adapter Layer          │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │   MES    │ │  Shopby  │ │   Edicus     │ │
│  │ Adapter  │ │ Adapter  │ │  Adapter     │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
│  integration_dead_letters (공통 오류 처리)     │
└─────────────────────────────────────────────┘
```

**핵심 규칙**:
- Core Domain은 Integration Layer를 `import`하지 않음
- Integration Layer만 Core Domain을 참조함 (단방향 의존)
- 외부 시스템 장애 시 Core Domain (가격 계산)은 영향 없음
- `integration_dead_letters`로 실패한 연동 이벤트 재처리

---

## 5. 정규화 문제 심층 분석

### 5.1 엑셀 표시명 -> 시스템 코드 매핑 누락 전체 목록

현재 DB에서 발견된 모든 엑셀 표시명 직접 사용 사례:

| # | 테이블.컬럼 | 현재 값 예시 | 올바른 시스템 코드 | 원본 Excel 코드 |
|---|-----------|------------|-----------------|----------------|
| 1 | `price_tiers.option_code` | "1줄" | `PP_PERFORATION_1LINE` | sub_option_code=10 |
| 2 | `price_tiers.option_code` | "2줄" | `PP_PERFORATION_2LINE` | sub_option_code=20 |
| 3 | `price_tiers.option_code` | "3줄" | `PP_PERFORATION_3LINE` | sub_option_code=30 |
| 4 | `price_tiers.option_code` | "5줄" | `PP_PERFORATION_5LINE` | sub_option_code=50 |
| 5 | `price_tiers.option_code` | "무광코팅(단면)" | `PP_COATING_MATTE_SINGLE` | sub_option_code 해당 |
| 6 | `price_tiers.option_code` | "무광코팅(양면)" | `PP_COATING_MATTE_DOUBLE` | sub_option_code 해당 |
| 7 | `price_tiers.option_code` | "유광코팅(단면)" | `PP_COATING_GLOSS_SINGLE` | sub_option_code 해당 |
| 8 | `price_tiers.option_code` | "유광코팅(양면)" | `PP_COATING_GLOSS_DOUBLE` | sub_option_code 해당 |
| 9 | `post_processes.group_code` | "PP001" | 유지 (영문 코드) | Postprocess001 |
| 10 | `categories.sheet_name` | "디지털인쇄" | `CAT_DIGITAL_PRINT` | Excel 시트명 |
| 11 | `categories.sheet_name` | "스티커" | `CAT_STICKER` | Excel 시트명 |

**패턴**: `price_tiers.option_code`가 가장 심각한 위반. 후가공, 코팅 관련 한국어 표시명이 직접 사용되고 있어 국제화, 코드 안정성, FK 무결성 모두 위반.

### 5.2 3단계 명칭 체계 상세 설계

모든 코드 기반 엔티티에 3단계 명칭을 적용한다:

```
Level 1: system_code (영문 snake_case, DB 식별자 + FK 조인 키)
  규칙: {DOMAIN}_{TYPE}_{VARIANT}
  제약: ^[A-Z][A-Z0-9_]+$ (영문 대문자 + 숫자 + 밑줄만 허용)
  용도: DB 조회, 코드 참조, API 파라미터

Level 2: display_name (한국어, UI 표시용)
  규칙: 비즈니스 도메인 표준 용어
  용도: 사용자 인터페이스, 보고서, 관리 화면

Level 3: legacy_code (원본 Excel 코드, 추적용)
  규칙: 원본 그대로 보존
  용도: 데이터 마이그레이션 역추적, Excel 동기화 검증
```

#### 도메인별 네이밍 컨벤션

```
카테고리:
  CAT_DIGITAL_PRINT       "디지털인쇄"       sheet_name="디지털인쇄"
  CAT_STICKER             "스티커"           sheet_name="스티커"
  CAT_BOOKLET             "책자"             sheet_name="책자"
  CAT_ACRYLIC             "아크릴"           sheet_name="아크릴"
  CAT_SIGN                "사인"             sheet_name="사인"

인쇄방식 (print_modes):
  PRINT_NONE              "없음"             price_code=0
  PRINT_SINGLE_MONO       "단면1도"          price_code=1
  PRINT_DOUBLE_MONO       "양면1도"          price_code=2
  PRINT_SINGLE_COLOR      "단면칼라"         price_code=4
  PRINT_DOUBLE_COLOR      "양면칼라"         price_code=8
  PRINT_SINGLE_WHITE      "단면화이트"       price_code=11
  PRINT_DOUBLE_WHITE      "양면화이트"       price_code=12
  PRINT_SINGLE_CLEAR      "단면클리어"       price_code=21
  PRINT_DOUBLE_CLEAR      "양면클리어"       price_code=22
  PRINT_SINGLE_PINK       "핑크단면"         price_code=31
  PRINT_DOUBLE_PINK       "핑크양면"         price_code=32

후가공 (post_processes):
  PP_PERFORATION_1LINE    "미싱 1줄"         sub_option_code=10
  PP_PERFORATION_2LINE    "미싱 2줄"         sub_option_code=20
  PP_PERFORATION_3LINE    "미싱 3줄"         sub_option_code=30
  PP_PERFORATION_5LINE    "미싱 5줄"         sub_option_code=50
  PP_COATING_MATTE_SINGLE "무광코팅(단면)"   sub_option_code 해당
  PP_COATING_MATTE_DOUBLE "무광코팅(양면)"   sub_option_code 해당
  PP_COATING_GLOSS_SINGLE "유광코팅(단면)"   sub_option_code 해당
  PP_COATING_GLOSS_DOUBLE "유광코팅(양면)"   sub_option_code 해당

제본 (bindings):
  BIND_SADDLE_STITCH      "중철제본"         binding_code=101
  BIND_PERFECT            "무선제본"         binding_code=102
  BIND_TWIN_RING          "트윈링제본"       binding_code=103
  BIND_PUR                "PUR제본"          binding_code=104

용지 (papers):
  PAPER_ART_250           "아트지 250g"      paper_code (Excel 코드)
  PAPER_SNOW_300          "스노우지 300g"    paper_code (Excel 코드)
```

### 5.3 현재 `price_tiers.option_code` 문제와 올바른 코드 체계

**현재 문제의 근본 원인**:

```
price_tiers 테이블이 출력비, 코팅비, 후가공비, 제본비를 모두 저장하면서
option_code 컬럼 하나로 서로 다른 도메인의 코드를 표현하려 함

-> price_table_id가 "디지털출력비" 테이블이면 option_code는 인쇄방식 코드
-> price_table_id가 "후가공" 테이블이면 option_code는 후가공 하위옵션 코드
-> price_table_id가 "제본" 테이블이면 option_code는 제본방식 코드

결과: FK 제약 불가, 코드 의미 불명확, 타입 안전성 없음
```

**올바른 해결 (v2 권장)**:

`price_tiers`를 도메인별 전용 테이블로 분리하여 각각 명시적 FK를 갖도록 한다:

| 현재 | 권장 | FK 참조 |
|------|------|---------|
| `price_tiers` (option_code=인쇄코드) | `print_price_tiers` | `print_mode_id -> print_modes.id` |
| `price_tiers` (option_code=후가공코드) | `pp_price_tiers` | `post_process_id -> post_processes.id` |
| `price_tiers` (option_code=제본코드) | `binding_price_tiers` | `binding_id -> bindings.id` |
| (없음) | `cutting_price_tiers` | `product_id + size_code` (스티커 전용) |

---

## 6. 권장 DB 스키마 설계

### 6.1 스키마 레이어 개요

```
Layer 1: Core Catalog (7개 테이블)
  - 무엇을 주문할 수 있는가

Layer 2: Core Pricing (14개 테이블)
  - 얼마에 생산하는가

Layer 3: UI/Ordering (5개 테이블)
  - 사용자에게 어떻게 보여주는가

Layer 4: External Integration (7개 테이블)
  - 외부 시스템과 어떻게 연동하는가

Layer 5: Operations (5개 테이블)
  - 주문/운영 관리
```

### 6.2 Layer 1: Core Catalog

#### T1: categories

```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,        -- CAT_DIGITAL_PRINT (system_code)
  name VARCHAR(100) NOT NULL,              -- 디지털인쇄 (display_name)
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  depth SMALLINT NOT NULL DEFAULT 0,
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- **설계 근거**: `sheet_name` 제거 (legacy_code는 code에서 추적 가능), `icon_url` 제거 (UI 메타데이터)
- **FK**: 자기참조 (parent_id)

#### T2: products

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  huni_code VARCHAR(10) UNIQUE NOT NULL,   -- 내부 고유 식별자
  name VARCHAR(200) NOT NULL,              -- 상품명 (display_name)
  slug VARCHAR(200) UNIQUE NOT NULL,       -- URL 슬러그
  pricing_model VARCHAR(30) NOT NULL,      -- formula, fixed_unit, package, component, fixed_size, fixed_per_unit
  sheet_standard VARCHAR(5),               -- A3, T3 (용지 규격, formula 계산용)
  order_method VARCHAR(20) NOT NULL DEFAULT 'upload', -- upload, editor, both
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- **제거**: `product_type` (pricing_model과 중복), `shopby_id` (Integration으로 이동), `edicus_code` (Integration으로 이동), `editor_enabled` (파생 가능), `mes_registered` (파생 가능), `figma_section` (UI 메타데이터)
- **설계 근거**: 코어 테이블에는 가격 계산과 상품 식별에 필요한 최소한의 컬럼만 유지

#### T3: product_sizes

```sql
CREATE TABLE product_sizes (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,               -- SIZE_90X50 (system_code)
  display_name VARCHAR(100) NOT NULL,      -- 90x50mm (display_name)
  cut_width NUMERIC(8,2),                  -- 재단 가로 (mm)
  cut_height NUMERIC(8,2),                 -- 재단 세로 (mm)
  imposition_count SMALLINT,               -- 판걸이 수 (사전 계산)
  sheet_standard VARCHAR(5),               -- A3, T3
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_custom BOOLEAN NOT NULL DEFAULT false, -- 비규격 사이즈 지원
  custom_min_w NUMERIC(8,2),
  custom_min_h NUMERIC(8,2),
  custom_max_w NUMERIC(8,2),
  custom_max_h NUMERIC(8,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, code)
);
```

- **제거**: `work_width`, `work_height` (imposition_rules에서 조회), `bleed` (상수 3.0mm)

#### T4: papers

```sql
CREATE TABLE papers (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,        -- PAPER_ART_250 (system_code)
  name VARCHAR(100) NOT NULL,              -- 아트지 250g (display_name)
  weight SMALLINT,                         -- 평량 (g/m2)
  cost_per_4cut NUMERIC(10,2),             -- 국4절 원가
  selling_per_4cut NUMERIC(10,2),          -- 국4절 판매가 (견적 핵심!)
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- **제거**: `abbreviation`, `sheet_size`, `cost_per_ream`, `selling_per_ream` (견적 계산에 불필요)
- **핵심**: `selling_per_4cut`이 용지비 계산의 핵심 입력값

#### T5: materials

```sql
CREATE TABLE materials (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,        -- MAT_CLEAR_ACRYLIC_3MM
  name VARCHAR(100) NOT NULL,              -- 투명 아크릴 3mm
  material_type VARCHAR(30) NOT NULL,      -- acrylic, pvc, pet 등
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- **제거**: `thickness` (코드에 포함), `description` (견적 불필요)

#### T6: print_modes

```sql
CREATE TABLE print_modes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,        -- PRINT_SINGLE_COLOR (system_code)
  name VARCHAR(100) NOT NULL,              -- 단면칼라 (display_name)
  sides VARCHAR(10) NOT NULL,              -- single, double
  color_type VARCHAR(20) NOT NULL,         -- color, mono, white, clear, pink
  price_code SMALLINT NOT NULL,            -- 원본 Excel 숫자코드 (legacy_code): 0,1,2,4,8,11...
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- **변경 없음**: 이미 3단계 명칭 체계 준수

#### T7: post_processes

```sql
CREATE TABLE post_processes (
  id SERIAL PRIMARY KEY,
  group_code VARCHAR(20) NOT NULL,         -- PP001~PP008 (그룹 식별)
  code VARCHAR(50) UNIQUE NOT NULL,        -- PP_PERFORATION_1LINE (system_code)
  name VARCHAR(100) NOT NULL,              -- 미싱 1줄 (display_name)
  process_type VARCHAR(30) NOT NULL,       -- perforation, coating, punching, folding
  price_basis VARCHAR(15) NOT NULL DEFAULT 'per_unit',
  sheet_standard VARCHAR(5),
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- **제거**: `sub_option_code`, `sub_option_name` (code/name으로 충분)

### 6.3 Layer 2: Core Pricing

#### T8: bindings

```sql
CREATE TABLE bindings (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,        -- BIND_SADDLE_STITCH
  name VARCHAR(50) NOT NULL,               -- 중철제본
  binding_code SMALLINT,                   -- 원본 Excel 코드: 101,102,103,104
  min_pages SMALLINT,
  max_pages SMALLINT,
  page_step SMALLINT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### T9: imposition_rules

```sql
CREATE TABLE imposition_rules (
  id SERIAL PRIMARY KEY,
  cut_width NUMERIC(8,2) NOT NULL,
  cut_height NUMERIC(8,2) NOT NULL,
  work_width NUMERIC(8,2) NOT NULL,
  work_height NUMERIC(8,2) NOT NULL,
  imposition_count SMALLINT NOT NULL,
  sheet_standard VARCHAR(5) NOT NULL,      -- A3, T3
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cut_width, cut_height, sheet_standard)
);
```

#### T10: paper_product_mapping

```sql
CREATE TABLE paper_product_mapping (
  id SERIAL PRIMARY KEY,
  paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE RESTRICT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  cover_type VARCHAR(10),                  -- 'body', 'cover', NULL
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(paper_id, product_id, cover_type)
);
```

#### T11: price_tables (메타데이터)

```sql
CREATE TABLE price_tables (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,        -- PT_OUTPUT_SELL_A3
  name VARCHAR(100) NOT NULL,
  price_type VARCHAR(10) NOT NULL,         -- selling, cost
  quantity_basis VARCHAR(20) NOT NULL,      -- sheet_count, production_qty
  sheet_standard VARCHAR(5),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### T12: print_price_tiers (출력비 전용 -- 핵심 개선)

```sql
CREATE TABLE print_price_tiers (
  id SERIAL PRIMARY KEY,
  price_table_id INTEGER NOT NULL REFERENCES price_tables(id) ON DELETE CASCADE,
  print_mode_id INTEGER NOT NULL REFERENCES print_modes(id) ON DELETE RESTRICT,
  min_qty INTEGER NOT NULL,                -- 판수 구간 시작 (imposition count)
  max_qty INTEGER NOT NULL DEFAULT 999999, -- 판수 구간 끝
  unit_price NUMERIC(12,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_print_price_lookup ON print_price_tiers(price_table_id, print_mode_id, min_qty);
```

- **설계 근거**: `price_tiers.option_code` 문자열 -> `print_mode_id` 명시적 FK
- **조회**: `WHERE price_table_id=? AND print_mode_id=? AND min_qty <= ? AND max_qty >= ?`

#### T13: pp_price_tiers (후가공비 전용 -- 핵심 개선)

```sql
CREATE TABLE pp_price_tiers (
  id SERIAL PRIMARY KEY,
  price_table_id INTEGER NOT NULL REFERENCES price_tables(id) ON DELETE CASCADE,
  post_process_id INTEGER NOT NULL REFERENCES post_processes(id) ON DELETE RESTRICT,
  min_qty INTEGER NOT NULL,                -- 수량 구간 시작
  max_qty INTEGER NOT NULL DEFAULT 999999,
  unit_price NUMERIC(12,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pp_price_lookup ON pp_price_tiers(price_table_id, post_process_id, min_qty);
```

#### T14: binding_price_tiers (제본비 전용 -- 핵심 개선)

```sql
CREATE TABLE binding_price_tiers (
  id SERIAL PRIMARY KEY,
  price_table_id INTEGER NOT NULL REFERENCES price_tables(id) ON DELETE CASCADE,
  binding_id INTEGER NOT NULL REFERENCES bindings(id) ON DELETE RESTRICT,
  min_qty INTEGER NOT NULL,
  max_qty INTEGER NOT NULL DEFAULT 999999,
  unit_price NUMERIC(12,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_binding_price_lookup ON binding_price_tiers(price_table_id, binding_id, min_qty);
```

#### T15: cutting_price_tiers (스티커 커팅비 전용 -- 신규)

```sql
CREATE TABLE cutting_price_tiers (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  size_code VARCHAR(50) NOT NULL,          -- 사이즈 코드
  cutting_type VARCHAR(30) NOT NULL,       -- half_cut_free, kiss_cut 등
  imposition_info VARCHAR(50),             -- "4판", "2판" 등
  min_qty INTEGER NOT NULL,
  max_qty INTEGER NOT NULL DEFAULT 999999,
  unit_price NUMERIC(12,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cutting_price_lookup ON cutting_price_tiers(product_id, size_code, cutting_type, min_qty);
```

- **설계 근거**: 스티커 커팅비는 "사이즈+커팅유형+판수" 복합 키를 가지며 다른 가격 테이블과 구조가 다름

#### T16: fixed_prices (고정 단가 -- 개선)

```sql
CREATE TABLE fixed_prices (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  size_id INTEGER REFERENCES product_sizes(id) ON DELETE SET NULL,
  condition_key VARCHAR(100),              -- "PAPER_ART_250:PRINT_SINGLE_COLOR" (코드 조합)
  base_qty INTEGER NOT NULL DEFAULT 1,
  selling_price NUMERIC(12,2) NOT NULL,
  cost_price NUMERIC(12,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fixed_prices_lookup ON fixed_prices(product_id, size_id, condition_key);
```

- **개선**: 4개 nullable FK (paper_id, material_id, print_mode_id, option_label) -> 단일 `condition_key` 문자열

#### T17: package_prices (패키지 단가 -- 변경 없음)

```sql
CREATE TABLE package_prices (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  size_id INTEGER NOT NULL REFERENCES product_sizes(id) ON DELETE RESTRICT,
  print_mode_id INTEGER NOT NULL REFERENCES print_modes(id) ON DELETE RESTRICT,
  page_count SMALLINT NOT NULL,
  min_qty INTEGER NOT NULL,
  max_qty INTEGER NOT NULL DEFAULT 999999,
  selling_price NUMERIC(12,2) NOT NULL,
  cost_price NUMERIC(12,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_package_prices_lookup ON package_prices(product_id, size_id, print_mode_id, page_count, min_qty);
```

#### T18: foil_prices (박/형압 단가 -- 변경 없음)

```sql
CREATE TABLE foil_prices (
  id SERIAL PRIMARY KEY,
  foil_type VARCHAR(30) NOT NULL,          -- stamping, emboss
  foil_color VARCHAR(30),
  plate_material VARCHAR(20),              -- zinc (동판)
  target_product_type VARCHAR(30),
  width NUMERIC(8,2) NOT NULL,             -- 가로 mm
  height NUMERIC(8,2) NOT NULL,            -- 세로 mm
  selling_price NUMERIC(12,2) NOT NULL,
  cost_price NUMERIC(12,2),
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_foil_prices_lookup ON foil_prices(foil_type, width, height);
```

#### T19: matrix_prices (2D 매트릭스 단가 -- 신규)

```sql
CREATE TABLE matrix_prices (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  width NUMERIC(8,2) NOT NULL,             -- 가로 mm (아크릴) 또는 폭 mm (포스터)
  height NUMERIC(8,2) NOT NULL,            -- 세로 mm (아크릴) 또는 높이 mm (포스터)
  selling_price NUMERIC(12,2) NOT NULL,
  cost_price NUMERIC(12,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, width, height)
);
CREATE INDEX idx_matrix_prices_lookup ON matrix_prices(product_id, width, height);
```

- **설계 근거**: 아크릴, 포스터/실사 등 2D 치수 기반 단가 조회 전용
- **사용**: Model 6 (포스터) + Model 7 (아크릴)

#### T20: quantity_discount_rules (수량 할인 -- 신규)

```sql
CREATE TABLE quantity_discount_rules (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  min_qty INTEGER NOT NULL,
  max_qty INTEGER NOT NULL DEFAULT 999999,
  discount_rate NUMERIC(5,4) NOT NULL,     -- 0.0000 ~ 1.0000 (1.0 = 할인 없음)
  display_price NUMERIC(12,2),             -- QuantitySlider UI 표시용 단가
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_qty_discount_lookup ON quantity_discount_rules(product_id, min_qty);
```

#### T21: loss_quantity_config (로스량 설정 -- Polymorphic FK 해소)

```sql
CREATE TABLE loss_quantity_config (
  id SERIAL PRIMARY KEY,
  scope_type VARCHAR(20) NOT NULL,         -- global, category, product
  category_id INTEGER REFERENCES categories(id),   -- scope_type='category'일 때
  product_id INTEGER REFERENCES products(id),      -- scope_type='product'일 때
  loss_rate NUMERIC(5,4) NOT NULL,
  min_loss_qty INTEGER NOT NULL DEFAULT 0,
  description VARCHAR(200),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scope_type, category_id, product_id),
  CONSTRAINT chk_scope_fk CHECK (
    (scope_type = 'global' AND category_id IS NULL AND product_id IS NULL)
    OR (scope_type = 'category' AND category_id IS NOT NULL AND product_id IS NULL)
    OR (scope_type = 'product' AND product_id IS NOT NULL)
  )
);
```

### 6.4 Layer 3: UI/Ordering (변경 최소)

```sql
-- T22: option_definitions (변경 없음)
-- T23: product_options (변경 없음)
-- T24: option_choices (Polymorphic FK 정리)
-- T25: option_constraints (변경 없음)
-- T26: option_dependencies (변경 없음)
```

`option_choices`의 5개 nullable FK 문제는 **장기 과제**로 분류. 단기적으로는 현행 유지하되, 장기적으로 `ref_entity_type` + `ref_entity_id` 2-컬럼 패턴 또는 code 기반 조인으로 전환.

### 6.5 Layer 4: External Integration

```sql
-- T27: mes_items (변경 없음)
-- T28: mes_item_options (변경 없음)
-- T29: product_mes_mapping (cover_type CHECK 추가)
-- T30: option_choice_mes_mapping (변경 없음)
-- T31: shopby_product_mapping (신규 - products에서 shopby_id 이동)
-- T32: product_editor_mapping (edicus_code 이동, size_id 추가)
-- T33: integration_dead_letters (변경 없음)
```

### 6.6 Layer 5: Operations (변경 없음)

```sql
-- T34: orders
-- T35: order_status_history
-- T36: order_design_files
-- T37: widgets
-- T38: data_import_log
```

### 6.7 전체 테이블 수 요약

| 레이어 | 테이블 수 | 신규 | 삭제 | 변경 |
|--------|----------|------|------|------|
| Core Catalog | 7 | 0 | 0 | 3 (products, product_sizes, papers 컬럼 정리) |
| Core Pricing | 14 | 4 (print_price_tiers, pp_price_tiers, binding_price_tiers, cutting_price_tiers, matrix_prices, quantity_discount_rules) | 1 (price_tiers 분리 후 제거) | 2 (fixed_prices, loss_quantity_config) |
| UI/Ordering | 5 | 0 | 0 | 1 (option_choices 장기) |
| External Integration | 7 | 1 (shopby_product_mapping) | 0 | 2 (product_mes_mapping, product_editor_mapping) |
| Operations | 5 | 0 | 0 | 0 |
| **합계** | **38** | **5** | **1** | **8** |

---

## 7. 현재 스키마와 권장 스키마 갭 분석

### 7.1 테이블별 변경 필요 사항

#### 수정 대상

| 테이블 | 변경 유형 | 상세 |
|--------|----------|------|
| `products` | 컬럼 제거/이동 | `product_type`, `shopby_id`, `edicus_code`, `editor_enabled`, `mes_registered`, `figma_section` 제거 |
| `product_sizes` | 컬럼 제거 | `work_width`, `work_height`, `bleed` 제거 |
| `papers` | 컬럼 제거 | `abbreviation`, `sheet_size`, `cost_per_ream`, `selling_per_ream` 제거 |
| `materials` | 컬럼 제거 | `thickness`, `description` 제거 |
| `post_processes` | 컬럼 제거 | `sub_option_code`, `sub_option_name` 제거 |
| `categories` | 컬럼 제거 | `sheet_name`, `icon_url` 제거 |
| `fixed_prices` | FK 구조 변경 | 4개 nullable FK -> `condition_key` 통합 |
| `loss_quantity_config` | FK 추가 | `category_id`, `product_id` 명시적 FK + CHECK |

#### 분리 대상

| 현재 테이블 | 분리 결과 | 설명 |
|-----------|----------|------|
| `price_tiers` | `print_price_tiers` + `pp_price_tiers` + `binding_price_tiers` | 도메인별 전용 테이블로 분리, 명시적 FK |

#### 신규 생성

| 테이블 | 용도 | 우선순위 |
|--------|------|---------|
| `print_price_tiers` | 출력비 전용 (print_modes FK) | P1 |
| `pp_price_tiers` | 후가공비 전용 (post_processes FK) | P1 |
| `binding_price_tiers` | 제본비 전용 (bindings FK) | P1 |
| `cutting_price_tiers` | 스티커 커팅비 전용 | P2 |
| `matrix_prices` | 2D 매트릭스 단가 (아크릴/포스터) | P2 |
| `quantity_discount_rules` | 수량 할인 규칙 | P2 |
| `shopby_product_mapping` | Shopby 연동 매핑 | P3 |

#### 삭제 대상

| 테이블 | 조치 | 시점 |
|--------|------|------|
| `price_tiers` | 데이터를 3개 전용 테이블로 마이그레이션 후 삭제 | P1 완료 후 |

### 7.2 데이터 마이그레이션 전략

#### 단계 1: 신규 테이블 생성 (비파괴적)

```sql
-- 1a: print_price_tiers 생성
CREATE TABLE print_price_tiers (...);

-- 1b: pp_price_tiers 생성
CREATE TABLE pp_price_tiers (...);

-- 1c: binding_price_tiers 생성
CREATE TABLE binding_price_tiers (...);

-- 기존 price_tiers 데이터를 전용 테이블로 복사
-- (price_tables.code로 도메인 식별 후 분기)
```

#### 단계 2: 데이터 마이그레이션

```sql
-- 2a: 출력비 데이터 마이그레이션
INSERT INTO print_price_tiers (price_table_id, print_mode_id, min_qty, max_qty, unit_price)
SELECT pt.price_table_id, pm.id, pt.min_qty, pt.max_qty, pt.unit_price
FROM price_tiers pt
JOIN price_tables ptbl ON pt.price_table_id = ptbl.id
JOIN print_modes pm ON pm.price_code::text = pt.option_code
  OR pm.code = pt.option_code
WHERE ptbl.code LIKE 'PT_OUTPUT%';

-- 2b: 후가공비 데이터 마이그레이션
INSERT INTO pp_price_tiers (price_table_id, post_process_id, min_qty, max_qty, unit_price)
SELECT pt.price_table_id, pp.id, pt.min_qty, pt.max_qty, pt.unit_price
FROM price_tiers pt
JOIN price_tables ptbl ON pt.price_table_id = ptbl.id
JOIN post_processes pp ON pp.code = pt.option_code
  OR pp.sub_option_name = pt.option_code
WHERE ptbl.code LIKE 'PT_PP%';

-- 2c: 제본비 데이터 마이그레이션
INSERT INTO binding_price_tiers (price_table_id, binding_id, min_qty, max_qty, unit_price)
SELECT pt.price_table_id, b.id, pt.min_qty, pt.max_qty, pt.unit_price
FROM price_tiers pt
JOIN price_tables ptbl ON pt.price_table_id = ptbl.id
JOIN bindings b ON b.code = pt.option_code
WHERE ptbl.code LIKE 'PT_BIND%';
```

#### 단계 3: 코드 레벨 전환

```
3a: 견적 엔진 코드에서 price_tiers 대신 전용 테이블 사용하도록 변경
3b: Admin CRUD에서 전용 테이블 사용하도록 변경
3c: 기존 price_tiers 테이블 참조 제거
```

#### 단계 4: 기존 테이블 정리

```sql
-- price_tiers 테이블은 마이그레이션 검증 완료 후 삭제
-- 최소 2주간 병행 운영 후 삭제
DROP TABLE price_tiers;
```

### 7.3 우선순위별 작업량 추정

| Phase | 작업 항목 수 | DDL 변경 | 데이터 마이그레이션 | 코드 변경 | 위험도 |
|-------|------------|---------|-----------------|----------|--------|
| P1 | 5 | 3 테이블 생성 | price_tiers 분리 | 견적 엔진 | 높음 |
| P2 | 6 | 3 테이블 생성, 2 컬럼 추가 | 엑셀 -> 신규 테이블 시드 | 견적 엔진 확장 | 중간 |
| P3 | 5 | 1 테이블 생성, 컬럼 이동 | shopby_id 이동 | Integration 코드 | 낮음 |
| P4 | 6 | 컬럼 삭제 | 없음 | UI/Admin 코드 | 낮음 |

---

## 8. 실행 계획 (Phase별)

### Phase 1: 가격 엔진 핵심 정규화 (명칭 정규화 + 가격 테이블 분리)

**목표**: 7개 가격 모델 중 Model 1, 2, 3, 5의 DB 데이터 무결성 확보

| # | 작업 | 상세 | 영향 범위 | 위험도 |
|---|------|------|----------|--------|
| 1-1 | `print_price_tiers` 테이블 생성 | 출력비 전용, `print_mode_id` FK | DDL | 낮 |
| 1-2 | `pp_price_tiers` 테이블 생성 | 후가공비 전용, `post_process_id` FK | DDL | 낮 |
| 1-3 | `binding_price_tiers` 테이블 생성 | 제본비 전용, `binding_id` FK | DDL | 낮 |
| 1-4 | `price_tiers` -> 전용 테이블 데이터 마이그레이션 | 한국어 코드 -> 시스템 코드 변환 포함 | 데이터 | **높** |
| 1-5 | `papers.selling_per_4cut` 데이터 검증/시드 | 용지비 계산 핵심, 빈 값 확인 | 데이터 | **높** |

**완료 기준**: Model 1 (디지털인쇄) 계산이 전용 테이블 기반으로 정확히 동작

**위험 완화**:
- 1-4 전 전수 매핑 테이블 작성 (한국어 코드 -> 시스템 코드)
- 1-4 전 기존 계산 결과 snapshot 테스트 작성 (regression 방지)
- 1-5 전 Excel 원본 데이터와 DB 비교 스크립트 작성

### Phase 2: 누락 가격 모델 지원 (신규 테이블 + 데이터 시드)

**목표**: Model 2, 4, 6, 7 계산 지원 구조 완성

| # | 작업 | 상세 | 영향 범위 | 위험도 |
|---|------|------|----------|--------|
| 2-1 | `cutting_price_tiers` 테이블 생성 | 스티커 커팅비 전용 | DDL | 낮 |
| 2-2 | `matrix_prices` 테이블 생성 | 아크릴/포스터 2D 매트릭스 | DDL | 낮 |
| 2-3 | `quantity_discount_rules` 테이블 생성 | 수량 할인 (Model 7) | DDL | 낮 |
| 2-4 | `cutting_price_tiers` 데이터 시드 | [스티커] 가격표 시트에서 추출 | 데이터 | 중 |
| 2-5 | `matrix_prices` 데이터 시드 | [아크릴] + [포스터] 시트에서 추출 | 데이터 | 중 |
| 2-6 | `package_prices` 데이터 시드 | [엽서북] 시트에서 추출 | 데이터 | 낮 |
| 2-7 | `foil_prices` 데이터 시드 | [후가공_박] 시트에서 추출 | 데이터 | 낮 |
| 2-8 | `loss_quantity_config` Polymorphic FK 해소 | `category_id`, `product_id` FK + CHECK | DDL+데이터 | 낮 |

**완료 기준**: 7개 가격 모델 모두 DB 데이터 기반 자동 계산 가능, 샘플 상품 검증 통과

### Phase 3: 외부 통합 레이어 분리

**목표**: 코어 도메인에서 외부 시스템 ID/설정 분리

| # | 작업 | 상세 | 영향 범위 | 위험도 |
|---|------|------|----------|--------|
| 3-1 | `shopby_product_mapping` 테이블 생성 | `products.shopby_id` 이동 | DDL | 낮 |
| 3-2 | `products.shopby_id` 데이터 -> `shopby_product_mapping` 이관 | 1:1 데이터 복사 | 데이터 | 낮 |
| 3-3 | `products.edicus_code` -> `product_editor_mapping.edicus_code` 이동 | 코드+DDL | 중 |
| 3-4 | `products.editor_enabled`, `products.mes_registered` 파생 로직 구현 | 코드 변경 | 중 |
| 3-5 | `product_mes_mapping.cover_type` CHECK 제약 추가 | DDL | 낮 |

**완료 기준**: `products` 테이블에 외부 시스템 ID/플래그 없음, Integration 레이어 독립 동작

### Phase 4: UI 레이어 최적화 + 정리

**목표**: 불필요 컬럼 제거, option_choices 정리

| # | 작업 | 상세 | 영향 범위 | 위험도 |
|---|------|------|----------|--------|
| 4-1 | `products.product_type`, `products.figma_section` 제거 | DDL + 코드 | 중 |
| 4-2 | `product_sizes.work_width/height`, `product_sizes.bleed` 제거 | DDL | 낮 |
| 4-3 | `papers` 불필요 컬럼 제거 (abbreviation, sheet_size, per_ream) | DDL | 낮 |
| 4-4 | `post_processes.sub_option_code/name` 제거 | DDL | 낮 |
| 4-5 | `categories.sheet_name`, `categories.icon_url` 제거 | DDL | 낮 |
| 4-6 | `option_choices` Polymorphic FK 정리 (장기) | DDL+데이터+코드 | **높** |

**완료 기준**: 견적 핵심 테이블 최적화 완료, 불필요 컬럼 0개

---

## 부록 A: 현재 vs 권장 테이블 전체 대응표

| # | 현재 테이블 | 권장 테이블 | 레이어 | 변경 사항 |
|---|-----------|-----------|--------|----------|
| 1 | categories | categories | Catalog | sheet_name, icon_url 제거 |
| 2 | products | products | Catalog | 6개 컬럼 제거/이동 |
| 3 | product_sizes | product_sizes | Catalog | work_w/h, bleed 제거 |
| 4 | papers | papers | Catalog | 4개 컬럼 제거 |
| 5 | materials | materials | Catalog | 2개 컬럼 제거 |
| 6 | print_modes | print_modes | Catalog | 변경 없음 |
| 7 | post_processes | post_processes | Catalog | 2개 컬럼 제거 |
| 8 | bindings | bindings | Pricing | 변경 없음 |
| 9 | imposition_rules | imposition_rules | Pricing | cut_size_code 제거 |
| 10 | paper_product_mapping | paper_product_mapping | Pricing | 변경 없음 |
| 11 | price_tables | price_tables | Pricing | 변경 없음 |
| 12 | **price_tiers** | **print_price_tiers** | Pricing | **분리 (출력비 전용)** |
| 13 | - | **pp_price_tiers** | Pricing | **분리 (후가공 전용)** |
| 14 | - | **binding_price_tiers** | Pricing | **분리 (제본 전용)** |
| 15 | - | **cutting_price_tiers** | Pricing | **신규 (스티커 커팅)** |
| 16 | fixed_prices | fixed_prices | Pricing | condition_key 통합 |
| 17 | package_prices | package_prices | Pricing | 데이터 시드 필요 |
| 18 | foil_prices | foil_prices | Pricing | 데이터 시드 필요 |
| 19 | - | **matrix_prices** | Pricing | **신규 (2D 매트릭스)** |
| 20 | - | **quantity_discount_rules** | Pricing | **신규 (수량 할인)** |
| 21 | loss_quantity_config | loss_quantity_config | Pricing | Polymorphic FK 해소 |
| 22 | option_definitions | option_definitions | UI | 변경 없음 |
| 23 | product_options | product_options | UI | 변경 없음 |
| 24 | option_choices | option_choices | UI | 장기: Polymorphic FK 정리 |
| 25 | option_constraints | option_constraints | UI | 변경 없음 |
| 26 | option_dependencies | option_dependencies | UI | 변경 없음 |
| 27 | mes_items | mes_items | Integration | 변경 없음 |
| 28 | mes_item_options | mes_item_options | Integration | 변경 없음 |
| 29 | product_mes_mapping | product_mes_mapping | Integration | cover_type CHECK 추가 |
| 30 | option_choice_mes_mapping | option_choice_mes_mapping | Integration | 변경 없음 |
| 31 | - | **shopby_product_mapping** | Integration | **신규** |
| 32 | product_editor_mapping | product_editor_mapping | Integration | edicus_code 이동, size_id 추가 |
| 33 | integration_dead_letters | integration_dead_letters | Integration | 변경 없음 |
| 34 | orders | orders | Operations | 변경 없음 |
| 35 | order_status_history | order_status_history | Operations | 변경 없음 |
| 36 | order_design_files | order_design_files | Operations | 변경 없음 |
| 37 | widgets | widgets | Operations | 변경 없음 |
| 38 | data_import_log | data_import_log | Operations | 변경 없음 |

## 부록 B: 위험 요소 및 완화 전략

| 위험 | 영향 | 확률 | 완화 전략 |
|------|------|------|----------|
| price_tiers 분리 마이그레이션 시 매핑 누락 | 견적 금액 오류 | 중 | 마이그레이션 전 전수 검증, 기존 결과 snapshot 테스트 |
| 한국어 option_code -> 시스템 코드 변환 불일치 | 가격 조회 실패 | 중 | 완전한 매핑 사전 작성, 누락 코드 alert |
| papers.selling_per_4cut 데이터 부재 | 용지비 계산 불가 (전체 견적 실패) | 높 | P1 최우선 확인, Excel 원본 대조 |
| 견적 엔진 리팩토링 시 계산 결과 변경 | 고객 불만, 가격 불일치 | 높 | 변경 전 characterization test, A/B 검증 |
| Shopby ID 이동 시 기존 연동 중단 | 주문 수신 실패 | 중 | 병행 운영 기간 (2주), 점진적 전환 |
| option_choices Polymorphic FK 변경 시 쿼리 파손 | 옵션 조회 오류 | 중 | P4 (최후순위), 충분한 테스트 커버리지 확보 후 |

## 부록 C: 가격 모델별 DB 조회 경로 다이어그램

```
Model 1 (디지털인쇄):
  products -> product_sizes -> imposition_rules
  papers.selling_per_4cut (via paper_product_mapping)
  print_price_tiers (출력비)
  pp_price_tiers (코팅비, 후가공비)
  loss_quantity_config

Model 2 (스티커):
  [Model 1 전체] + cutting_price_tiers (커팅비)

Model 3 (명함):
  products -> fixed_prices (product_id + condition_key)

Model 4 (엽서북):
  products -> package_prices (size_id + print_mode_id + page_count + qty)

Model 5 (책자):
  [Model 1 내지 부분] + [Model 1 표지 부분]
  + foil_prices (박/형압)
  + binding_price_tiers (제본비)
  + product_mes_mapping (cover_type='body'/'cover')

Model 6 (포스터/실사):
  products -> matrix_prices (width x height)
  + 회배 계산 로직 (코드 레벨)
  + fixed_prices (옵션 추가가)

Model 7 (아크릴/굿즈):
  products -> matrix_prices (width x height)
  + quantity_discount_rules (수량 할인)
```

---

---

## Section 9: Excel 색상 코드 체계와 암묵적 비즈니스 규칙 관리

> **추가 요구사항 (2026-02-24)**: 굿즈 시트의 `폴더` 컬럼에 "고주파"가 있으면 고주파 전용 수량할인을 적용하는 것처럼, Excel 작성자만 알 수 있는 암묵적 비즈니스 규칙들이 존재한다. 이 규칙들을 DB에서 어떻게 명시적으로 관리할지 설계가 필요하다.

---

### 9.1 Excel 색상 코드 체계 — 컬럼 역할의 암묵적 문서화

상품마스터 Excel의 컬럼 배경색은 단순 시각 구분이 아니라 **컬럼의 역할과 사용 주체를 표현하는 비공식 문서 체계**이다.

#### 색상별 컬럼 역할 분류표

| 배경색 코드 | 색상명 | DB 역할 분류 | 포함 컬럼 예시 |
|------------|--------|-------------|--------------|
| `FFC4BD97` | **갈색 (Brown)** | 내부 식별자 (Internal ID) | 구분, ID(Shopby), MES ITEM_CD, 상품명, 판수 |
| `FFE06666` | **빨간색 (Red)** | UI 필수 입력 (Customer Required) | 사이즈(필수), 주문방법, 종이(필수), 제작수량, 최소/최대/증가 |
| `FFF6B26B` | **주황색 (Orange)** | UI 선택 입력 (Customer Optional) | 인쇄(옵션), 별색인쇄, 코팅, 커팅, 후가공, 추가상품 |
| `FFD9D9D9` / `FFCCCCCC` | **회색 (Gray)** | 내부 생산/파일 처리 (Internal Production) | 블리드, 작업사이즈, 재단사이즈, 출력용지규격, **파일명약어, 출력파일, 폴더**, COMMENT |
| `FF92D050` | **연두색 (Green)** | 디자인 자산 (Design Asset) | 가이드파일, 템플릿, 디자인보유 (캘린더/포토북만) |
| `FFF4CCCC` | **연분홍 (Light Pink)** | 편집기 전용 설정 (Edicus-only) | 내지페이지(편집기), 편집기 페이지 범위 |

> **핵심 발견**: 사용자가 말한 "검은색 컬럼"은 실제로 **회색(FFD9D9D9, FFCCCCCC) 컬럼들**이다. 이 컬럼들이 바로 내부 생산 처리용 데이터로, UI에 절대 노출되어서는 안 되는 컬럼들이다.

#### 가격표 색상 체계

| 배경색 코드 | 색상명 | 의미 |
|------------|--------|------|
| `FFFFFF00` | 노란색 | 가격 Lookup Key (행/열 헤더) |
| `FFD9D2E9` | 연보라 | 가격 행렬 축 값 |
| `FFB6DDE8` | 파란색 | 수량 구간별 할인율 |
| `FFFABF8F` | 연주황 | 직접 입력 가격 |

---

### 9.2 회색 컬럼의 암묵적 비즈니스 규칙 — `폴더` 컬럼 분석

회색 컬럼 중 `폴더` 컬럼은 단순한 파일 경로가 아니라 **생산 방식 코드이자 가격 계산 로직 선택자** 역할을 한다.

#### `폴더` 컬럼의 값별 암묵적 규칙 목록

| 폴더 값 | 발견 시트 | 암묵적 규칙 | DB 반영 필요성 |
|---------|---------|-----------|--------------|
| `"디지털인쇄"` | 디지털인쇄, 굿즈, 스티커 | 디지털 출력비 가격표 적용 | `production_method = 'DIGITAL_PRINT'` |
| `"전사인쇄"` | 굿즈(머그컵, 양말, 쿠션 등) | 전사인쇄 방식 → 별도 외주 또는 전사 출력비 | `production_method = 'SUBLIMATION'` |
| `"UV인쇄"` | 굿즈(아크릴키링, 틴케이스 등) | UV 잉크 출력 방식 → UV 출력비 적용 | `production_method = 'UV_PRINT'` |
| `"실사출력"` | 굿즈(레더코스터), 실사 시트 | 실사 출력 방식 → 포스터/실사 가격표 적용 | `production_method = 'REAL_SIZE_PRINT'` |
| `"특수인쇄"` | 굿즈(레더, 매트, 레더키링) | 특수 방식 → 외주 고정가 | `production_method = 'SPECIAL_PRINT'` |
| **`"고주파"`** | 굿즈(말랑키링, 말랑포카홀더) | **PVC 고주파 용접 → 고주파 전용 수량 구간할인 적용** | `production_method = 'HIGH_FREQ_WELD'` + 별도 할인 규칙 |
| `"만년도장"` | 굿즈(만년스탬프) | 특수 도장 제품 → 직접 입력 고정가 | `production_method = 'PERMANENT_STAMP'` + `pricing_type = 'FIXED'` |
| `"고주파"` 행 상단의 주석 | 굿즈 시트 Row 71 | `"고주파상품 구간할인"` → 고주파 제품군 전체에 별도 할인 구간 적용 | `discount_rule_code = 'HIGH_FREQ_QTY_DISCOUNT'` |

**가장 중요한 암묵적 규칙**: `폴더 = "고주파"` 이면 일반 수량 단가표가 아닌 **고주파 전용 구간 할인 테이블**을 참조해야 한다. 이 규칙은 Excel Row 71의 주석 한 줄로만 표현되어 있어, 시스템 구현 시 누락될 가능성이 매우 높다.

---

### 9.3 발견된 모든 암묵적 비즈니스 규칙 목록

#### A. 폴더 컬럼 기반 생산 방식 + 가격 로직 선택 규칙

위 9.2 표 참조 (6종 생산 방식)

#### B. COMMENT 컬럼의 암묵적 추가 공정 규칙

| COMMENT 내용 | 발견 위치 | 암묵적 의미 | DB 반영 방안 |
|------------|---------|-----------|-----------|
| `"*PVC커버"` | 문구(노트) - 만년다이어리 소프트커버 | PVC 투명 커버 추가 공정 포함, 별도 비용? | `product_notes` 컬럼 + `post_processes` 추가 항목 |
| `"*합지보드"` | 문구(노트) - 스프링노트, 메모패드 | 합지보드 후처리 포함, 비용 내재됨 | 동일 |
| `"*출력+미싱"` | 문구(노트) - 만년다이어리 레더소프트 | 출력 + 미싱 가공이 결합된 제품 → 미싱 가공비 포함 필요 | `required_processes: ['PRINT', 'PERFORATION']` |

#### C. 굿즈 가격 직접 입력 규칙

```
폴더 컬럼 = "전사인쇄" / "UV인쇄" / "특수인쇄" 인 경우:
  → 가격 컬럼(회색)에 직접 숫자 입력 = 고정 단가
  → 디지털 출력비 가격표를 참조하지 않음

폴더 컬럼 = "디지털인쇄" 인 경우:
  → 가격 컬럼이 비어있음 = 디지털출력비 + 용지비 공식 계산
```

#### D. 비규격 사이즈 처리 규칙 (아크릴, 실사)

```
사이즈(필수) = "사용자입력" AND 비규격(가로/세로 범위) 존재:
  → 최소/최대 범위 내 자유 입력 허용
  → 아크릴: Acryl_3T 매트릭스에서 가장 가까운 mm 단위로 lookup
  → 실사: 회배 계산 공식 적용 (size / 1000) × base_price
```

#### E. 책자/포토북 멀티파트 MES 규칙

```
책자 제품에 대해:
  내지 MES ITEM_CD ≠ 표지 MES ITEM_CD
  → 하나의 주문이 MES에 2개의 생산 지시로 분리되어야 함
  → 현재 DB의 1:1 product → mes_item 매핑으로는 처리 불가
```

#### F. 파우치 수량 구간 할인율 규칙 (가격표에만 존재)

```
파우치 제품 수량별 할인율:
  10~49장:  3% 할인
  50~99장:  5% 할인
  100~499장: 10% 할인
  500~999장: 15% 할인
  1000장 이상: 20% 할인

→ 이 규칙은 가격표 [파우치] 시트의 파란색 헤더에만 존재
→ 상품마스터와 현재 DB 어디에도 연결 고리 없음
```

---

### 9.4 암묵적 비즈니스 규칙 관리 — 권장 DB 설계

#### 9.4.1 `production_methods` 테이블 신규 추가

```sql
CREATE TABLE production_methods (
  id SERIAL PRIMARY KEY,
  system_code VARCHAR(30) NOT NULL UNIQUE,  -- 'DIGITAL_PRINT', 'HIGH_FREQ_WELD', ...
  display_name VARCHAR(50) NOT NULL,         -- '디지털인쇄', '고주파', ...
  excel_folder_value VARCHAR(50),            -- Excel 폴더 컬럼 원본 값 (역추적용)
  pricing_type VARCHAR(20) NOT NULL,         -- 'FORMULA', 'FIXED', 'MATRIX', 'EXTERNAL'
  discount_rule_code VARCHAR(50),            -- NULL이면 기본 수량 할인 적용, 있으면 별도 할인 참조
  requires_external_quote BOOLEAN DEFAULT FALSE,  -- 외주 견적 필요 여부
  notes TEXT,                                -- '*합지보드' 같은 특이사항
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 데이터 예시
INSERT INTO production_methods VALUES
  ('DIGITAL_PRINT',    '디지털인쇄', '디지털인쇄', 'FORMULA',  NULL,                       FALSE, NULL),
  ('SUBLIMATION',      '전사인쇄',   '전사인쇄',   'FIXED',    NULL,                       TRUE,  '외주 전사 인쇄'),
  ('UV_PRINT',         'UV인쇄',     'UV인쇄',     'FIXED',    NULL,                       FALSE, NULL),
  ('REAL_SIZE_PRINT',  '실사출력',   '실사출력',   'MATRIX',   NULL,                       FALSE, '회배 계산 적용'),
  ('SPECIAL_PRINT',    '특수인쇄',   '특수인쇄',   'FIXED',    NULL,                       TRUE,  '외주 특수 인쇄'),
  ('HIGH_FREQ_WELD',   '고주파',     '고주파',     'MATRIX',   'HIGH_FREQ_QTY_DISCOUNT',   FALSE, 'PVC 고주파 용접, 전용 수량 구간 할인 적용'),
  ('PERMANENT_STAMP',  '만년도장',   '만년도장',   'FIXED',    NULL,                       FALSE, '고정가 직접 입력 상품');
```

#### 9.4.2 `business_rules` 테이블 신규 추가

암묵적 비즈니스 규칙을 명시적으로 저장하는 범용 규칙 테이블:

```sql
CREATE TABLE business_rules (
  id SERIAL PRIMARY KEY,
  rule_code VARCHAR(50) NOT NULL UNIQUE,     -- 'HIGH_FREQ_QTY_DISCOUNT', 'POSTER_ROTATION_PRICING'
  rule_category VARCHAR(30) NOT NULL,        -- 'DISCOUNT', 'PRICING_OVERRIDE', 'PRODUCTION_NOTE'
  trigger_condition JSONB NOT NULL,          -- 규칙 발동 조건
  rule_action JSONB NOT NULL,                -- 규칙 적용 내용
  description TEXT,                          -- 사람이 읽을 수 있는 설명
  source_excel_note TEXT,                    -- Excel에서 해당 규칙이 어디에 있었는지
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 고주파 구간 할인 규칙
INSERT INTO business_rules VALUES (
  DEFAULT,
  'HIGH_FREQ_QTY_DISCOUNT',
  'DISCOUNT',
  '{"production_method": "HIGH_FREQ_WELD"}',
  '{
    "type": "TIERED_DISCOUNT",
    "tiers": [
      {"min_qty": 1,    "max_qty": 9,    "discount_rate": 0},
      {"min_qty": 10,   "max_qty": 29,   "discount_rate": 0.05},
      {"min_qty": 30,   "max_qty": 99,   "discount_rate": 0.10},
      {"min_qty": 100,  "max_qty": 999,  "discount_rate": 0.15},
      {"min_qty": 1000, "max_qty": null,  "discount_rate": 0.20}
    ]
  }',
  'PVC 고주파 용접 제품(말랑키링 등)에 적용되는 전용 수량 구간 할인',
  '굿즈 시트 Row 71: "고주파상품 구간할인" 주석'
);

-- 파우치 수량 할인 규칙 (가격표 파우치 시트 파란색 헤더)
INSERT INTO business_rules VALUES (
  DEFAULT,
  'POUCH_QTY_DISCOUNT',
  'DISCOUNT',
  '{"category_code": "CAT_POUCH"}',
  '{
    "type": "TIERED_DISCOUNT",
    "tiers": [
      {"min_qty": 1,    "max_qty": 9,    "discount_rate": 0},
      {"min_qty": 10,   "max_qty": 49,   "discount_rate": 0.03},
      {"min_qty": 50,   "max_qty": 99,   "discount_rate": 0.05},
      {"min_qty": 100,  "max_qty": 499,  "discount_rate": 0.10},
      {"min_qty": 500,  "max_qty": 999,  "discount_rate": 0.15},
      {"min_qty": 1000, "max_qty": null,  "discount_rate": 0.20}
    ]
  }',
  '레더파우치 등 파우치 제품군 수량 구간 할인 (3%~20%)',
  '가격표 [파우치] 시트 파란색 헤더: 10~49(3%), 50~99(5%)...'
);

-- 포스터 회배 계산 규칙
INSERT INTO business_rules VALUES (
  DEFAULT,
  'POSTER_ROTATION_PRICING',
  'PRICING_OVERRIDE',
  '{"production_method": "REAL_SIZE_PRINT", "height_mm": {">": 1000}}',
  '{
    "type": "SCALE_FORMULA",
    "formula": "base_price * (height_mm / reference_height_mm)",
    "reference_height_mm": 1000,
    "segments": [
      {"max_height": 600,  "pricing": "MATRIX_LOOKUP"},
      {"max_height": 1000, "pricing": "MATRIX_LOOKUP"},
      {"min_height": 1001, "pricing": "SCALE_FORMULA"}
    ]
  }',
  '실사/포스터 1000mm 초과 사이즈는 회배 계산 공식 적용',
  '가격표 [포스터(실사)] 시트 주석: "1회배 넘는구간부터는 회배당 가격적용"'
);
```

#### 9.4.3 `product_variants` 테이블에 `production_method_id` 추가

```sql
-- 기존 products 또는 product_variants 테이블에 추가
ALTER TABLE product_variants ADD COLUMN
  production_method_id INTEGER REFERENCES production_methods(id);

-- 파일 처리 관련 컬럼들도 product_variants에 추가 (회색 컬럼들)
ALTER TABLE product_variants ADD COLUMN
  bleed_mm SMALLINT,                    -- 블리드(mm)
ALTER TABLE product_variants ADD COLUMN
  work_size VARCHAR(30),               -- 작업사이즈
ALTER TABLE product_variants ADD COLUMN
  trim_size VARCHAR(30),               -- 재단사이즈 (이미 있을 수 있음)
ALTER TABLE product_variants ADD COLUMN
  output_paper_spec VARCHAR(50),       -- 출력용지규격
ALTER TABLE product_variants ADD COLUMN
  file_name_abbr VARCHAR(30),          -- 파일명약어
ALTER TABLE product_variants ADD COLUMN
  output_file_type VARCHAR(20),        -- 출력파일 (PDF, JPG, AI 등)
ALTER TABLE product_variants ADD COLUMN
  production_folder VARCHAR(30);       -- 폴더 (이 값이 production_method와 1:1 대응)
```

> **설계 원칙**: `production_folder` 원본 값은 역추적용으로 보존하되, `production_method_id`가 실제 로직 선택 FK가 되어야 한다. `production_folder = '고주파'` → `production_method.system_code = 'HIGH_FREQ_WELD'` 매핑을 마이그레이션 시 자동 변환.

---

### 9.5 색상별 컬럼의 DB 레이어 배치 전략

```
색상            → 역할              → DB 레이어           → 노출 범위
─────────────────────────────────────────────────────────────────────
갈색 (Brown)   → 내부 식별자       → Core Catalog        → 내부 API만
빨간색 (Red)   → UI 필수 입력      → UI/Ordering Layer   → Widget UI 노출
주황색 (Orange)→ UI 선택 입력      → UI/Ordering Layer   → Widget UI 노출
회색 (Gray)    → 내부 생산/파일    → Core Catalog + new  → 절대 UI 미노출
                  (production_folder, bleed, work_size 등)  (내부 시스템만)
연두색 (Green) → 디자인 자산       → External Integration → 관리자 UI만
연분홍 (Pink)  → 편집기 전용 설정  → External Integration → Edicus API만
```

#### API 레이어 필터링 규칙

```typescript
// 회색 컬럼은 절대 Widget API 응답에 포함하지 않음
const INTERNAL_ONLY_FIELDS = [
  'productionFolder',  // 폴더
  'bleedMm',           // 블리드
  'workSize',          // 작업사이즈
  'outputPaperSpec',   // 출력용지규격
  'fileNameAbbr',      // 파일명약어
  'outputFileType',    // 출력파일
  'productionNotes',   // COMMENT
];

// Widget API 응답에서 제외
function sanitizeForWidget(product: ProductVariant) {
  return omit(product, INTERNAL_ONLY_FIELDS);
}

// MES API 응답에는 포함
function sanitizeForMes(product: ProductVariant) {
  return product; // 모든 필드 포함
}
```

---

### 9.6 암묵적 규칙 발굴 체크리스트

Excel을 DB로 마이그레이션할 때 누락될 수 있는 암묵적 규칙을 발굴하기 위한 체크리스트:

| 검사 항목 | 방법 | 발견된 사례 |
|---------|------|-----------|
| 회색 컬럼 값의 다양성 확인 | `폴더` 컬럼 유니크 값 열거 | `"디지털인쇄"`, `"고주파"`, `"전사인쇄"` 등 7개 값 |
| 행 사이 주석 텍스트 확인 | 색상 없는 행의 단독 텍스트 셀 | `"고주파상품 구간할인"` (Row 71) |
| COMMENT 컬럼의 `*` 접두사 항목 | COMMENT 값에서 `*` 시작 항목 필터 | `"*합지보드"`, `"*출력+미싱"` |
| 가격 컬럼이 비어있는 이유 확인 | 가격이 있어야 할 곳에 NULL인 경우 | 디지털인쇄 제품은 공식 계산이므로 비어있음 |
| 별도 시트 주석 확인 | 가격표 각 시트의 Comment 텍스트 | `"사이즈별 용지비, 출력비 계산 후 커팅모양 가공비 추가"` |
| 색상이 다른 특이 행 | 일반 행과 다른 배경색의 행 | 파우치 시트 파란색 헤더 = 수량할인 규칙 |

---

### 9.7 요약: 회색 컬럼 관리 3원칙

1. **분류 원칙**: 회색 컬럼 = 내부 생산/파일 데이터. UI에 절대 노출 금지. DB에는 저장하되 Widget API 필터링.

2. **명시화 원칙**: 회색 컬럼 값(특히 `폴더`)에 숨겨진 로직 선택 규칙을 `production_methods` + `business_rules` 테이블로 명시화. "고주파 → 고주파 할인" 같은 암묵적 연결고리를 FK로 표현.

3. **추적 원칙**: Excel 원본 값을 `excel_folder_value`, `source_excel_note` 등으로 보존하여 마이그레이션 후에도 "이 규칙이 Excel 어디에서 왔는지" 역추적 가능하게 유지.

---

> 이 보고서는 v1 보고서를 기반으로, Excel 원본 데이터 구조 분석, 7개 가격 모델 수식 분석,
> 3개 외부 플랫폼(MES/Shopby/Edicus) 통합 요구사항, 5-레이어 정규화 스키마 설계, 그리고
> Excel 색상 코드 체계 분석 및 암묵적 비즈니스 규칙 관리 방안(Section 9)을 추가하여
> 작성되었습니다. 모든 SQL 예시는 현재 Drizzle ORM 구조에서 변환 가능한 형태입니다.
>
> 작성 기준: 현재 코드베이스 9개 스키마 파일 + Excel 구조 데이터 + SPEC-DATA-002 spec.md

---

## Section 10: 가격표 미커버 영역과 작성자 주의사항 분석

이 섹션은 Python openpyxl을 통한 Excel 수식 분석 결과를 바탕으로, **가격표(pricing sheets)에서 다루지 않는 가격 계산 방식**, COMMENT 컬럼에만 존재하는 공임비, 작성자의 범례/주의사항이 DB 스키마에 미치는 영향, 그리고 신규 상품(★) 관리 전략을 다룬다.

---

### 10.1 가격표 미커버 가격 계산 방식 (4가지)

가격표 시트들이 커버하지 않는 4가지 가격 결정 메커니즘이 상품마스터 Excel에 존재한다. 각각의 계산 로직, 적용 상품, DB 반영 방안을 아래에 정리한다.

#### 10.1.1 연당가 기반 용지비 계산 (`!디지털인쇄용지` 시트 수식)

**수식 체계:**

| 컬럼 | 수식 | 설명 | 예시 (백색모조지 100g) |
|------|------|------|----------------------|
| G | 직접 입력 | 연당가 (원/연) | 61,460원 |
| H | `=G/2000` | 국4절 1장 단가 (1연 = 2,000매 기준) | 30.73원 |
| I | `=H/2` | A4 1장 단가 (국4절의 절반) | 15.365원 |

**적용 상품:**
- 디지털인쇄 전 상품군의 공통 용지비 계산에 사용
- 적용 범위: #디지털인쇄용지, #봉투, #엽서, #명함, #스티커, 책자내지/표지, 캘린더용지 등
- 가격표의 최종 가격은 이 용지비 + 인쇄비 + 후가공비의 합산이나, 용지비 자체는 이 수식으로 독립 계산

**가격표 커버 여부:**
- 가격표에 `디지털용지` 시트가 존재하지만, 이는 최종 가격이 아닌 **이 계산의 입력값(연당가)을 제공하는 역할**
- 실제 고객 판매가를 결정하는 최종 가격표 시트와는 별개의 원가 계산 시트

**DB 반영 방안:**
- `paper_types` 테이블에 `per_ream_price` (연당가, integer) 컬럼 추가
- 국4절/A4 단가 계산은 앱 레이어(pricing engine)에서 수행
- 1연 = 2,000매 상수는 `system_constants` 또는 용지 규격별 매수로 관리

```sql
-- paper_types 테이블 확장
ALTER TABLE paper_types ADD COLUMN per_ream_price INTEGER;
-- 예: 백색모조지 100g → per_ream_price = 61460
-- 국4절 단가 = per_ream_price / 2000
-- A4 단가 = per_ream_price / 4000
```

#### 10.1.2 실사 상품 VAT 계산 (`실사` 시트 수식)

**수식 체계:**

| 컬럼 | 수식 | 설명 |
|------|------|------|
| R | 직접 입력 | 판매가 (VAT 제외) |
| S | `=SUM(R)*1.1` | 판매가 x 1.1 (VAT 10% 포함) |

**적용 상품:**
- 포스터(실사), 배너, 현수막, 액자류 등 실사 출력 전 상품
- 작성자 메모: "수량별 할인구간 아직은 계획 없음" (가격표 포스터(실사) Row 1)

**가격표 커버 여부:**
- 가격표 `포스터(실사)` 시트에 가격이 존재하지만, **VAT 포함/제외 여부가 불명확**
- 상품마스터의 `실사` 시트에서만 VAT 제외/포함 가격이 명확히 구분됨
- 확인 필요: 가격표의 실사 가격이 VAT 포함인지 제외인지 작성자에게 확인 필수

**DB 반영 방안:**
- 모든 가격은 **VAT 제외 금액으로 저장** (일관성 원칙)
- VAT 계산은 앱 레이어에서 처리 (국가/상품별 세율 유연성 확보)
- `price_entries` 또는 `pricing_rules` 테이블에 `is_vat_included` 플래그 불필요 — 저장 원칙을 "항상 VAT 제외"로 통일

```sql
-- pricing 관련 테이블 원칙
-- 모든 price 컬럼: VAT 제외 금액 저장
-- VAT 계산: 앱 레이어에서 price * 1.1 (한국 기준)
-- 향후 세율 변경 시: 앱 설정만 변경하면 됨
```

#### 10.1.3 공임비 (COMMENT 전용 가격) -- 가격표에 없음

**발견 위치:** `실사` 시트 Column AD (COMMENT)

가격표 어디에도 존재하지 않으며, **오직 COMMENT 컬럼에만 기록된 추가 공임비(surcharge)**가 3개 상품 카테고리에서 발견되었다.

**프레임리스우드액자 (Row 75-76):**

| 사이즈 | 공임비 |
|--------|--------|
| A3 | +3,000원 |
| A2 | +4,000원 |
| A1 | +5,000원 |

**레더아트액자 (Row 79-80):**

| 사이즈 | 공임비 |
|--------|--------|
| 5x5 | +5,000원 |
| 8x8 | +5,000원 |
| A4 | +5,000원 |
| A3 | +6,000원 |
| A2 | +7,000원 |

**족자포스터 (Row 94-95):**

| 사이즈 | 공임비 |
|--------|--------|
| A3 | +3,000원 |
| A2 | +4,000원 |
| A1 | +5,000원 |
| 30x60 | +3,000원 |
| 90x120 | +5,000원 |

**추가 발견 -- COMMENT 내 가격 규칙:**
- 아크릴 시트 Row 4: `개별가격에 수량할인` -- 아크릴키링 각 사이즈별 개별가격 + 수량할인 적용
- 문구(노트) COMMENT: `*PVC커버`, `*출력+미싱`, `*합지보드` -- 추가 공정 포함 (별도 가격 반영 필요)

**DB 반영 방안:**
- `product_surcharges` 테이블 신규 생성 (제품-사이즈-공임비 매핑)

```sql
-- 신규 테이블: product_surcharges
CREATE TABLE product_surcharges (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  surcharge_type VARCHAR(50) NOT NULL,        -- 'LABOR', 'PROCESSING', 'MATERIAL'
  size_key VARCHAR(50) NOT NULL,               -- 'A3', 'A2', 'A1', '5x5', '30x60' 등
  surcharge_amount INTEGER NOT NULL,           -- 공임비 (원, VAT 제외)
  description TEXT,                             -- 원본 COMMENT 텍스트 보존
  source_excel_note TEXT,                       -- Excel COMMENT 원문
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 예시 데이터
INSERT INTO product_surcharges (product_id, surcharge_type, size_key, surcharge_amount, description)
VALUES
  (/* 프레임리스우드액자 id */, 'LABOR', 'A3', 3000, '프레임리스우드액자 A3 공임'),
  (/* 프레임리스우드액자 id */, 'LABOR', 'A2', 4000, '프레임리스우드액자 A2 공임'),
  (/* 프레임리스우드액자 id */, 'LABOR', 'A1', 5000, '프레임리스우드액자 A1 공임'),
  (/* 레더아트액자 id */, 'LABOR', '5x5', 5000, '레더아트액자 5x5 공임'),
  (/* 레더아트액자 id */, 'LABOR', 'A2', 7000, '레더아트액자 A2 공임');
```

#### 10.1.4 특수인쇄(외주) 고정가 -- 가격표에 없음

**해당 상품 (9개):**
- 접착투명포스터, 린넨패브릭포스터, 캔버스패브릭포스터, 타이벡프린트, 메쉬프린트
- 캔버스 행잉포스터, 린넨 우드봉 족자, 메쉬배너, 메쉬현수막

**특성:**
- 상품마스터 `폴더` 값 = `특수인쇄`
- 외부 업체(외주)에 의한 생산 → 업체 견적에 따른 고정가 직접 입력
- 가격표에 수식이나 구간별 가격 없음 -- 관리자가 직접 가격 설정
- 수량별 할인 없음 (외주 특성상 고정가 적용)

**DB 반영 방안:**
- `production_methods` 테이블에 `requires_external_quote = TRUE` 설정
- `products` 테이블에 `fixed_price` 컬럼 추가 (또는 별도 `external_pricing` 테이블)
- `pricing_source = 'EXTERNAL'`로 가격 출처 명시

```sql
-- production_methods 확장
ALTER TABLE production_methods ADD COLUMN requires_external_quote BOOLEAN DEFAULT FALSE;

-- products 확장 (고정가 상품용)
ALTER TABLE products ADD COLUMN fixed_price INTEGER;  -- NULL이면 가격표/수식 기반 계산
-- 또는 pricing_source 컬럼으로 통합 관리 (10.5절 참조)
```

---

### 10.2 가격표 커버리지 매핑 테이블

아래 테이블은 전체 상품 카테고리별 가격 출처와 DB 처리 방안을 요약한다.

| 상품 카테고리 | 가격 출처 | 가격표 시트 | DB 필요 처리 |
|-------------|---------|-----------|------------|
| 디지털인쇄 (명함, 엽서, 스티커 등) | 가격표 + 연당가 수식 | O (각 상품별 시트) | `per_ream_price` 컬럼 + pricing engine 계산 |
| 실사/포스터 | 가격표 + VAT 수식 | O (`포스터(실사)`) | VAT 제외 저장 원칙, pricing engine에서 VAT 계산 |
| 배너/현수막 | 가격표 + VAT 수식 | O (`배너/현수막`) | 실사와 동일 처리 |
| 스티커 (일반) | 가격표 | O (`스티커`) | 표준 가격표 매핑 |
| 스티커 (투명/홀로그램) | 가격표 일부 + 신규 | △ (일부만) | 신규 상품은 `mes_status = 'PENDING'` |
| 명함 | 가격표 | O (`명함`) | 표준 가격표 매핑 |
| 책자 (내지/표지) | 가격표 + 연당가 | O (`책자`) | 용지비 분리 계산, 페이지 수 기반 가격 |
| 아크릴 (키링, 스티커 등) | 가격표 + 개별가격 | O (`아크릴`) | `개별가격 + 수량할인` COMMENT 규칙 반영 |
| 굿즈/고주파 (파우치, 코스터 등) | 가격표 일부 | △ (일부만) | 신규 굿즈 다수, 가격 미정 상품 존재 |
| 포토북 | **없음** (Edicus) | X | `pricing_source = 'EDICUS'`, API 연동 |
| 캘린더 | **없음** (Edicus) | X | `pricing_source = 'EDICUS'`, API 연동 |
| 특수인쇄 (외주) | **없음** (외주 견적) | X | `requires_external_quote = TRUE`, `fixed_price` |
| 공임비 상품 (액자, 족자) | **가격표 없음** (COMMENT만) | X | `product_surcharges` 테이블 신규 생성 |
| 상품 악세사리 | 가격표 일부 | △ | 악세사리별 개별 가격 입력 또는 상품 번들 |

**범례:**
- **O**: 가격표 시트에 완전히 커버됨
- **△**: 가격표에 일부만 커버 (신규 상품 또는 특수 조건 미반영)
- **X**: 가격표에 전혀 없음 -- 별도 가격 메커니즘 필요

---

### 10.3 작성자 주의사항 -> DB 상태 필드 매핑

상품마스터 작성자가 정의한 **범례 노트**(모든 시트 공통)의 전문과, 각 항목이 DB 스키마에 미치는 영향을 분석한다.

#### 작성자 범례 노트 전문

```
노랑색배경은 신규상품으로 MES에도 없어 등록해야하는 상품입니다
★의 빨간글씨는 옵션선택시 제약조건입니다.
그레이칼라의 글씨는 사용자에는 보여지지 않은(파일사양의 구분을 위한) 글씨입니다
*오렌지글씨는 저만의 commemt이니 개발시 무시해주세요
모든 종이는 MES와 통합관리해야함 (별도로 설정해야하며, 입력되어 있더라도 무시)
제목부분 (필수/빨강)는 모든 상품에 반드시 설정해야하는 부분
(옵션/오렌지)은 상품에 따라 있을수도 없을 수도 있습니다
그레이배경의 상품은 품절이거나 준비중인 상품입니다.
모든 항목은 Figma를 참고해주세요
```

#### 항목별 DB 필드 매핑

**1. 노랑 배경 = MES 미등록 신규 상품**

- 의미: MES(Manufacturing Execution System)에 ITEM_CD가 없는 신규 상품
- DB 매핑: `products.mes_status` ENUM 필드 추가

| mes_status 값 | 설명 | 대응하는 Excel 표시 |
|---------------|------|-------------------|
| `PENDING` | MES 미등록, 등록 대기 | 노랑 배경 |
| `REGISTERED` | MES 등록 완료, ITEM_CD 발급됨 | 배경 없음 (일반) |
| `NOT_REQUIRED` | MES 등록 불필요 (외주/디지털 전용) | 해당 없음 |

**2. 그레이 배경 = 품절 또는 준비중 상품**

- 의미: 현재 판매 불가 상태 (품절이거나 아직 출시 준비중)
- DB 매핑: `products.status` ENUM 필드 확장

| status 값 | 설명 | 대응하는 Excel 표시 |
|-----------|------|-------------------|
| `ACTIVE` | 정상 판매중 | 배경 없음 (일반) |
| `OUT_OF_STOCK` | 일시 품절 (재입고 예정) | 그레이 배경 |
| `COMING_SOON` | 출시 준비중 (신규 상품) | 그레이 배경 |
| `DISCONTINUED` | 단종 (재입고 없음) | 삭제선 또는 별도 표시 |

**3. ★ 빨간글씨 = 옵션 선택 시 제약조건**

- 의미: 특정 옵션 조합이 불가능하거나 제한되는 규칙
- DB 매핑: `option_constraints` 테이블의 `constraint_type` 활용

| constraint_type 값 | 설명 | 예시 |
|-------------------|------|------|
| `SIZE_RESTRICTION` | 특정 사이즈에서만 선택 가능 | 양면인쇄는 A4 이상만 |
| `MATERIAL_RESTRICTION` | 특정 재질에서만 선택 가능 | 금박은 아트지만 가능 |
| `COMBINATION_EXCLUSION` | 특정 옵션 조합 불가 | 코팅 + 박 동시 불가 |
| `QUANTITY_RESTRICTION` | 수량 제한 | 최소 100매 이상 |

**4. *오렌지글씨 = 개발 무시**

- 의미: 작성자의 개인 메모, 개발에 반영할 필요 없음
- DB 매핑: **DB 반영 불필요**
- 처리: 마이그레이션 스크립트에서 오렌지 폰트 컬러(RGB) 감지 시 skip
- 문서화: `SPEC-DATA-002` 기술 문서에 "오렌지 텍스트는 무시" 규칙 명시

**5. 모든 종이는 MES 통합관리**

- 의미: Excel에 용지 정보가 입력되어 있더라도 **MES 시스템의 용지 데이터가 최종 권위(source of truth)**
- DB 매핑: `paper_types.mes_sync_required` BOOLEAN 필드 추가

| mes_sync_required | 설명 |
|-------------------|------|
| `TRUE` | MES에서 동기화 필요 (Excel 값 무시, MES 값 사용) |
| `FALSE` | MES 동기화 불필요 (로컬 관리 가능) |

- 구현: 용지 관련 시드 데이터 입력 시 `mes_sync_required = TRUE` 기본값 설정
- MES API 연동 시 주기적 동기화 작업(sync job) 필요

**6. 그레이칼라 글씨 = 사용자 비노출 (파일사양 구분용)**

- 의미: Widget UI에 표시하지 않는 내부 참조용 데이터 (Section 9 분석과 동일)
- DB 매핑: 이미 Section 9에서 분석한 `is_internal` / `display_in_widget` 필드로 처리
- 크로스 참조: Section 9.3 "회색 글씨 -> DB 매핑 규칙" 참조

#### 권장 SQL: products 테이블 추가 컬럼

```sql
-- products 테이블 확장 (작성자 주의사항 반영)
ALTER TABLE products
  ADD COLUMN mes_status VARCHAR(20) DEFAULT 'REGISTERED'
    CHECK (mes_status IN ('PENDING', 'REGISTERED', 'NOT_REQUIRED')),
  ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'OUT_OF_STOCK', 'COMING_SOON', 'DISCONTINUED')),
  ADD COLUMN pricing_source VARCHAR(20) DEFAULT 'PRICE_TABLE'
    CHECK (pricing_source IN ('PRICE_TABLE', 'FORMULA', 'EDICUS', 'EXTERNAL', 'FIXED')),
  ADD COLUMN fixed_price INTEGER,                -- 외주/고정가 상품용 (NULL이면 계산 기반)
  ADD COLUMN source_excel_note TEXT;              -- Excel 원본 메모 보존

-- paper_types 테이블 확장
ALTER TABLE paper_types
  ADD COLUMN per_ream_price INTEGER,              -- 연당가 (원/연)
  ADD COLUMN mes_sync_required BOOLEAN DEFAULT TRUE;
```

---

### 10.4 신규 상품 (★) 관리 전략

MAP 시트에서 추출한 **40개 이상의 ★(노랑 배경) 신규 상품**은 MES에 미등록 상태이며, 가격이 미정인 경우가 대부분이다. 이들의 체계적 관리를 위한 전략을 아래에 정리한다.

#### 신규 상품 전체 목록

```
반칼 자유형 투명스티커, 아트페이퍼포스터, 메쉬배너, 먼슬리플래너,
투명엽서, 낱장 자유형 투명스티커, 메쉬현수막, 사각손거울,
박엽서, 투명명함, 접착투명포스터, 블랙사각손거울,
화이트인쇄엽서, 화이트인쇄명함, 맥세이프 스마트톡,
무광시트커팅, 홀로그램시트커팅, 유광아크릴스티커,
캔버스패브릭포스터, 미러아크릴스티커, 아크릴포카키링,
아크릴머리끈, 캔버스 플랫 파우치, 레더아트프린트,
규조토코스터, 캔버스 삼각 파우치, 타이벡프린트,
린넨코스터, 메쉬프린트, 종이코스터, 포토카드,
홀로그램스티커, 투명포토카드, 만년스탬프,
말랑키링, 캔버스행잉포스터, 말랑증사홀더,
말랑포카홀더, 말랑4컷홀더, 말랑네임택, 말랑 여권케이스
```

#### 공통 특성

- **MES ITEM_CD 없음**: MES 시스템에 등록되지 않아 생산 코드 미발급
- **가격 미정**: 대부분 가격표에 가격이 없거나 불완전
- **옵션 구조 미확정**: 일부 상품은 사이즈/재질/후가공 옵션이 Excel에 정의되어 있으나, 검증 미완료
- **카테고리 다양**: 스티커, 포스터, 굿즈, 아크릴, 패브릭 등 다양한 카테고리에 분산

#### 개발 단계별 관리 방안

**Phase 0: DB 등록 (즉시)**
- `mes_status = 'PENDING'`으로 DB에 상품 레코드 등록
- `status = 'COMING_SOON'`으로 설정 (Widget에 표시되지 않음)
- 상품명, 카테고리, 기본 옵션 구조만 입력
- 가격 관련 필드는 NULL 유지

**Phase 1: MES 등록 (운영팀 협조)**
- MES 관리자 채널을 통해 ITEM_CD 발급 요청
- ITEM_CD 수신 후 `mes_item_cd` 필드 업데이트
- `mes_status = 'REGISTERED'`로 전환
- 생산 방법(`production_methods`) 연결

**Phase 2: 가격 확정 및 활성화 (영업/기획팀 협조)**
- 가격표 확정 후 `pricing_rules` 또는 `fixed_price` 입력
- 옵션 구조 최종 검증 및 `option_constraints` 설정
- `status = 'ACTIVE'`로 전환 -- Widget에 노출 시작
- QA 테스트 후 실서비스 반영

#### 등록 이력 추적 테이블 제안

신규 상품의 등록/활성화 과정을 추적하기 위한 이력 테이블:

```sql
-- 신규 테이블: product_registration_log
CREATE TABLE product_registration_log (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  event_type VARCHAR(30) NOT NULL,             -- 'CREATED', 'MES_REGISTERED', 'PRICE_SET', 'ACTIVATED', 'DEACTIVATED'
  previous_value TEXT,                          -- 변경 전 값 (JSON)
  new_value TEXT,                               -- 변경 후 값 (JSON)
  changed_by VARCHAR(100),                      -- 변경자 (admin user 또는 system)
  notes TEXT,                                   -- 변경 사유
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_registration_log_product ON product_registration_log(product_id);
CREATE INDEX idx_registration_log_event ON product_registration_log(event_type);
CREATE INDEX idx_registration_log_date ON product_registration_log(created_at);
```

**활용 시나리오:**
- "이 상품은 언제 MES에 등록되었는가?" 추적
- "가격이 언제 확정되었고, 누가 설정했는가?" 감사 추적
- 신규 상품 파이프라인 현황 대시보드 구성 (PENDING -> REGISTERED -> ACTIVE 전환율)

---

### 10.5 포토북/캘린더 Edicus 연동 가격 처리

포토북과 캘린더는 다른 상품과 근본적으로 다른 가격 결정 메커니즘을 가진다.

#### 현재 상황

- **가격표에 가격 없음**: 포토북, 캘린더 시트에 최종 판매가 미존재
- **내지 페이지 수 = Edicus 편집기 결정**: 상품마스터 헤더에 `내지페이지(편집기)` 컬럼 존재
  - 고객이 Edicus 편집기에서 직접 콘텐츠를 편집하며 페이지 수가 결정됨
  - 페이지 수에 따라 가격이 동적으로 변화
- **가격 계산 주체**: Edicus API 응답에서 가격 계산 (Edicus 서버 측 로직)

#### DB 반영 방안

**pricing_source 통합 필드:**

`products` 테이블에 `pricing_source` ENUM 필드를 추가하여 모든 상품의 가격 결정 방식을 명시한다.

| pricing_source 값 | 설명 | 해당 상품 |
|-------------------|------|---------|
| `PRICE_TABLE` | 가격표 시트 기반 | 디지털인쇄, 스티커, 명함 등 대부분 |
| `FORMULA` | 연당가 등 수식 기반 | 용지비 계산 상품 |
| `EDICUS` | Edicus 편집기 API 연동 | 포토북, 캘린더 |
| `EXTERNAL` | 외주 업체 견적 | 특수인쇄 9개 상품 |
| `FIXED` | 관리자 직접 입력 고정가 | 일부 굿즈, 악세사리 |

**Edicus 연동 상품 처리 흐름:**

```
1. Widget에서 상품 선택 (포토북/캘린더)
2. Edicus 편집기로 리디렉트
3. 고객이 편집 완료 (페이지 수 결정)
4. Edicus API → Widget으로 가격 정보 전달
5. Widget pricing engine: pricing_source = 'EDICUS' 감지 → API 가격 사용
6. 주문 생성 시 Edicus 응답 가격을 order_items에 저장
```

**주의사항:**
- Edicus 연동 상품은 가격표 기반 pricing engine을 **우회**해야 함
- 주문 시점의 가격을 `order_items.unit_price`에 스냅샷으로 저장 (Edicus API 가격 변동 대비)
- Edicus API 장애 시 폴백 처리: `products.fixed_price`에 기본가 설정 가능

---

### 10.6 핵심 액션 아이템 (우선순위별)

Section 10에서 도출된 모든 발견 사항을 우선순위별로 정리한 액션 아이템 테이블이다.

| 우선순위 | 항목 | 현재 문제 | 필요 조치 | 관련 테이블 |
|---------|------|---------|---------|-----------|
| **P0 (Critical)** | 공임비 테이블 신규 생성 | COMMENT에만 존재하여 자동 계산 불가. 3개 상품(액자, 족자)의 사이즈별 추가 금액이 DB에 없음 | `product_surcharges` 테이블 생성, COMMENT 데이터 마이그레이션 | `product_surcharges` (신규) |
| **P0 (Critical)** | pricing_source 필드 추가 | 상품별 가격 결정 방식이 암묵적. 가격표/수식/Edicus/외주 중 어떤 방식인지 코드에서 판단 불가 | `products.pricing_source` ENUM 컬럼 추가, 전 상품 분류 | `products` |
| **P1 (High)** | 연당가 컬럼 추가 | 용지비 계산에 필요한 연당가가 DB에 없음. 현재 Excel 수식에만 존재 | `paper_types.per_ream_price` 컬럼 추가, Excel 데이터 마이그레이션 | `paper_types` |
| **P1 (High)** | MES 등록 상태 필드 추가 | 40+ 신규 상품의 MES 등록 상태 추적 불가 | `products.mes_status` ENUM 추가, 신규 상품 일괄 'PENDING' 설정 | `products` |
| **P1 (High)** | 실사 VAT 처리 방식 확인 및 통일 | 가격표의 실사 가격이 VAT 포함인지 제외인지 불명확 | 작성자에게 확인 후, "VAT 제외 저장" 원칙으로 데이터 정규화 | `pricing_rules`, `price_entries` |
| **P2 (Medium)** | 특수인쇄 고정가 입력 방법 설계 | 9개 외주 상품의 가격 입력/수정 UI 없음 | Admin 페이지에 고정가 입력 폼 추가, `fixed_price` 컬럼 활용 | `products`, `production_methods` |
| **P2 (Medium)** | 상품 상태 필드 확장 | 품절/준비중 상품 구분 불가 (현재 binary active/inactive만) | `products.status` ENUM 확장 (4가지 상태) | `products` |
| **P2 (Medium)** | 등록 이력 추적 | 신규 상품 등록 과정 추적 불가 | `product_registration_log` 테이블 생성 | `product_registration_log` (신규) |
| **P3 (Low)** | Edicus 연동 가격 처리 설계 | 포토북/캘린더 가격 결정 로직 미정의 | Edicus API 스펙 확인 후 연동 설계 | `products`, `order_items` |
| **P3 (Low)** | MES 용지 동기화 설계 | 용지 데이터의 MES 연동 주기/방식 미정의 | `paper_types.mes_sync_required` 추가, sync job 설계 | `paper_types` |

---

### 10.7 Section 10 요약

| 분석 항목 | 발견 수 | DB 영향도 |
|----------|---------|----------|
| 가격표 미커버 가격 방식 | 4가지 | 신규 테이블 1개 + 컬럼 5개 추가 |
| 작성자 주의사항 | 9개 항목 | ENUM 필드 3개 + BOOLEAN 1개 추가 |
| 신규 상품 (★) | 40+ 상품 | 3단계 등록 프로세스 + 이력 테이블 |
| Edicus 연동 | 2개 카테고리 | pricing_source 분기 + API 연동 설계 |
| COMMENT 전용 공임비 | 3개 상품, 15개 사이즈별 항목 | product_surcharges 테이블 신규 |

**핵심 결론:**

1. **가격 결정 방식의 다양성**: 가격표 기반, 수식 기반, COMMENT 기반, 외주 견적, Edicus API 등 **최소 5가지** 가격 결정 메커니즘이 존재하며, 이를 `pricing_source` ENUM으로 명시적 관리 필수
2. **COMMENT 공임비의 위험성**: 가격표 어디에도 없는 공임비가 COMMENT에만 기록되어 있어, 마이그레이션 누락 시 **액자/족자 상품의 가격 계산 오류** 발생 위험
3. **신규 상품 파이프라인**: 40+ 신규 상품의 체계적 관리를 위해 `mes_status` + `status` + `product_registration_log` 3중 추적 체계 필요
4. **VAT 통일 원칙**: "모든 가격은 VAT 제외로 저장" 원칙을 DB 레벨에서 강제하여 실사/디지털 간 가격 혼란 방지

---

> Section 10은 Python openpyxl을 통한 Excel 수식 분석, COMMENT 컬럼 전수 조사,
> MAP 시트 신규 상품 목록 추출을 바탕으로 작성되었습니다.
> 이 섹션의 발견 사항들은 SPEC-DATA-002 구현 시 반드시 반영되어야 합니다.
