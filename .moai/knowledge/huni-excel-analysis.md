# 후니프린팅 엑셀 데이터 분석 결과

> 분석일: 2026-02-22
> SPEC: SPEC-DATA-002

## 1. 파일 구조

### 상품마스터 (13 시트)
- MAP: 12개 대분류 카테고리 트리 (▶︎=카테고리, ★=조건부 상품)
- !디지털인쇄용지 (빨강탭): 용지 마스터 (용지명/평량/원가/상품매핑●)
- 디지털인쇄~상품악세사리: 11개 카테고리별 상품 정의

### 인쇄상품 가격표 (16 시트)
- 사이즈별 판걸이수: 임포지션 테이블
- 디지털용지 (주황탭): 용지-상품 교차매핑
- 디지털출력비 (주황탭): A3/T3 판매가 (12개 인쇄모드)
- 디지털출력비가수정 (초록탭): A3/T3 원가
- 후가공 (주황탭): 8개 섹션 (미싱/오시/접지/가변/모서리/코팅)
- 후가공_박: 동판비 + 일반박 크기매트릭스
- 후가공_박명함: 명함전용 박
- 옵션결합상품 (빨강탭): 엽서북 등 패키지가격
- 명함~파우치: 상품별 고정가격

### 품목관리 (2 시트)
- Sheet: 260개 MES 품목 (그룹/코드/옵션10개)
- Sheet2 (숨김): 드롭다운 참조값

## 2. 색상 코딩 체계

### 헤더 배경색
- #FFE06666 (빨강): 필수 → required=true
- #FFF6B26B (주황): 옵션 → required=false
- #FFD9D9D9 (회색): 내부전용 → internal=true
- #FFC4BD97 (베이지): 기본식별정보
- #FFCCCCCC (연회색): 내부사양 (포토북/캘린더/문구)
- #FFF4CCCC (연분홍): 편집기 전용
- #FF92D050 (초록): 가이드파일/템플릿/디자인보유
- #FFFABF8F (연주황): 가격참조

### 데이터 색상
- 빨간글씨+★: 제약조건
- 회색글씨: 내부전용 텍스트
- 오렌지글씨: 작성자메모 (무시)
- 노랑배경: 신규상품 (MES 미등록)

## 3. 견적 공식 (행 256)

총가 = 출력비(판당×매수) + 별색비(판당×매수) + 지대(용지단가÷판걸이수×매수+로스) + 코팅비(판당×매수) + 가공비(매수별) + 후가공비(매수별)
예외: 명함/포토카드 = 고정 상품단가

## 4. ★ 제약조건 3유형
- A: ★사이즈선택 : {size} → 부속품 조건부 노출
- B: ★최소 {min} / 최대 {max} → 가공 크기 제한
- C: ★{조건} : {값} → 용지/두께 조건

## 5. 7가지 가격 모델
1. Formula (디지털인쇄일반): 출력+별색+지대+코팅+가공+후가공
2. Formula+Cutting (스티커): 위 + 커팅가공비
3. Fixed Unit (명함/포토카드): 상품단가×수량
4. Package (엽서북): 조합별 고정가
5. Component (책자): 내지+표지+제본+코팅+박
6. Fixed Size (실사): 사이즈별 고정가
7. Fixed Per-Unit (아크릴/굿즈): 개당가+수량할인

## 6. 30개 옵션키 (v5 기반)
자재(5): size, paper, innerPaper, coverPaper, material
공정(18): printType, specialPrint, coating, coverCoating, cuttingType, folding, finishing, foilStamp, processing, calendarProcess, binding, bindingDirection, bindingOption, bindingSpec, endpaper, ringColor, standColor, transparentCover
설정(7): quantity, pageCount, pieceCount, packaging, additionalProduct, selection, innerType

## 7. MES 매칭 결과
- 정확 매칭: 129/184 (70%)
- v5 매핑 오류: ID 14567 (레더하드커버책자↔접착투명포스터)
- 엑셀에만 있는 상품: 20개
- MES에만 있는 품목: 137개

## 8. 사용자 요구사항
- 모든 요소 CRUD 가능
- MES + edicus(에디터 디자인) 매핑
- 원가/판매가 이중 가격 구조
- 로스량 확장형 설계
- PDF 주문/에디터 모드 확장
- UI 옵션 배치순서/의존성 관리
