# 견적 워크플로우 가이드

## 개요

Wowpress API를 사용하여 인쇄 상품 견적을 생성하는 종단 간 프로세스입니다.

## 워크플로우 개요

```
사용자 쿼리
    ↓
키워드 추출
    ↓
카테고리 매칭
    ↓
상품 선택
    ↓
옵션 검증
    ↓
견적 생성
```

## 단계별 상세

### 1단계: 사용자 쿼리 파싱

```python
def parse_user_query(query: str) -> dict:
    """
    사용자 쿼리에서 정보 추출

    예: "사각스티커 1000장 인쇄해줘"
    """
    import re

    result = {
        "product_name": None,
        "quantity": None,
        "size": None,
        "material": None,
        "finishings": []
    }

    # 수량 추출
    quantity_match = re.search(r'(\d+)[장매개부통]', query)
    if quantity_match:
        result["quantity"] = int(quantity_match.group(1))

    # 상품명 추출 (수량 제거)
    product_part = re.sub(r'\d+[장매개부통]', '', query)
    result["product_name"] = product_part.strip()

    return result
```

### 2단계: 카테고리 매칭

```python
def match_category(product_name: str, catalog: dict) -> dict:
    """
    상품명으로 카테고리 매칭
    """
    candidates = []

    for category in catalog["categories"]:
        # 키워드 매칭
        for keyword in category["keywords"]:
            if keyword in product_name or product_name in keyword:
                candidates.append({
                    "category": category,
                    "score": 1.0 if keyword == product_name else 0.8
                })
                break

    # 점수순 정렬
    candidates.sort(key=lambda x: x["score"], reverse=True)

    return candidates[0]["category"] if candidates else None
```

### 3단계: 상품 선택

```python
def select_products(category: dict, parsed_query: dict) -> list:
    """
    카테고리에서 적합한 상품 선택
    """
    category_file = f"ref/wowpress/catalog/{category['file']}"
    with open(category_file) as f:
        category_data = json.load(f)

    products = []

    for product in category_data["products"]:
        # 수량 범위 확인
        if parsed_query["quantity"]:
            for qty in product["orderQuantities"]:
                if qty["minimum"] <= parsed_query["quantity"] <= qty["maximum"]:
                    if parsed_query["quantity"] in qty["values"]:
                        products.append(product)
                        break

    return products
```

### 4단계: 옵션 검증

```python
def validate_options(product: dict, options: dict) -> dict:
    """
    상품 옵션 검증
    """
    validation_result = {
        "valid": True,
        "errors": [],
        "warnings": []
    }

    # 수량 검증
    if options.get("quantity"):
        qty_valid = False
        for qty in product["orderQuantities"]:
            if options["quantity"] in qty["values"]:
                qty_valid = True
                break

        if not qty_valid:
            validation_result["valid"] = False
            validation_result["errors"].append(
                f"수량 {options['quantity']}은 유효하지 않습니다"
            )

    # 파일 형식 검증
    if options.get("file_type"):
        if options["file_type"] not in product["fileTypes"]:
            validation_result["valid"] = False
            validation_result["errors"].append(
                f"파일 형식 {options['file_type']}은 지원하지 않습니다"
            )

    return validation_result
```

### 5단계: 견적 생성

```python
def generate_quotation(product: dict, options: dict) -> dict:
    """
    견적서 생성
    """
    quotation = {
        "product_id": product["productId"],
        "product_name": product["name"],
        "product_url": product["url"],
        "quantity": options["quantity"],
        "unit": product.get("unit", "매"),
        "delivery": {
            "prepay_required": product["delivery"]["prepayRequired"],
            "group": product["delivery"]["group"]["name"]
        },
        "file_types": product["fileTypes"],
        "options": {},
        "pricing": {
            "type": "templated" if product["pricing"]["hasTemplate"] else "quoted",
            "status": product["pricing"]["status"]
        }
    }

    # 선택된 옵션 추가
    if options.get("size"):
        quotation["options"]["size"] = options["size"]
    if options.get("material"):
        quotation["options"]["material"] = options["material"]
    if options.get("finishings"):
        quotation["options"]["finishings"] = options["finishings"]

    return quotation
```

## 완전한 워크플로우 예시

```python
def create_quotation(query: str, catalog_path: str) -> dict:
    """
    종단 간 견적 생성
    """
    # 1. 카탈로그 로드
    with open(f"{catalog_path}/index.json") as f:
        catalog = json.load(f)

    # 2. 쿼리 파싱
    parsed = parse_user_query(query)
    # 예: {"product_name": "사각스티커", "quantity": 1000}

    # 3. 카테고리 매칭
    category = match_category(parsed["product_name"], catalog)
    # 예: cat-916c01a6 (스티커 > 사각스티커)

    # 4. 상품 선택
    products = select_products(category, parsed)
    # 예: [가성비스티커(사각), 강접스티커(사각), ...]

    if not products:
        return {"error": "적합한 상품을 찾을 수 없습니다"}

    # 첫 번째 상품 선택
    product = products[0]

    # 5. 옵션 검증
    options = {"quantity": parsed["quantity"]}
    validation = validate_options(product, options)

    if not validation["valid"]:
        return {
            "error": "옵션 검증 실패",
            "details": validation["errors"]
        }

    # 6. 견적 생성
    quotation = generate_quotation(product, options)

    return quotation
```

## 사용자 응답 형식

```json
{
  "product_name": "가성비스티커(사각)",
  "product_id": 40007,
  "product_url": "https://devshop.wowpress.co.kr/prodt/40007",
  "quantity": 1000,
  "unit": "매",
  "category": "스티커 > 사각스티커",
  "delivery_info": {
    "prepay_required": true,
    "shipping_group": "명함,스티커 묶음"
  },
  "available_file_types": ["AI", "EPS", "JPG", "PNG", "CDR", "PSD", "SIT", "ZIP", "ALZ", "PDF"],
  "quantity_options": [500, 1000, 2000, 3000, 4000, 5000, ...],
  "pricing": {
    "type": "quoted",
    "status": "requires-configuration"
  },
  "next_steps": [
    "사이즈 선택 필요 (예: 90 x 50 mm)",
    "용지 선택 필요 (예: 모조 80g)",
    "인쇄 방식 선택 필요 (예: 단면 4도)",
    "후가공 선택 필요 (예: 재단)"
  ]
}
```

## 오류 처리

### 일반적인 오류 시나리오

1. **카테고리를 찾을 수 없음**
   - 응답: "입력하신 상품을 찾을 수 없습니다. 다른 키워드로 시도해주세요."

2. **수량이 유효하지 않음**
   - 응답: "선택하신 수량은 주문 가능 범위를 벗어납니다. {minimum}~{maximum} 사이의 수량을 선택해주세요."

3. **파일 형식이 지원되지 않음**
   - 응답: "선택하신 파일 형식은 지원하지 않습니다. 지원 파일: {file_types}"

4. **옵션 조합이 유효하지 않음**
   - 응답: "선택하신 옵션 조합은 주문할 수 없습니다. 다른 조합을 시도해주세요."

## 인터랙션 예시

### 예시 1: 사각스티커

**사용자**: "사각스티커 1000장 견적 알려줘"

**응답**:
```
가성비스티커(사각) 상품을 찾았습니다.

상품 정보:
- 상품명: 가성비스티커(사각)
- 상품 ID: 40007
- 카테고리: 스티커 > 사각스티커
- 수량: 1,000매

주문 가능 수량: 500, 1,000, 2,000, 3,000, 4,000, 5,000, 6,000, 8,000, 10,000...

선택 필요 옵션:
1. 사이즈 (예: 90 x 50 mm)
2. 용지 (예: 모조 80g)
3. 인쇄 방식 (예: 단면 4도)
4. 후가공 (예: 재단)

지원 파일 형식: AI, EPS, JPG, PNG, CDR, PSD, SIT, ZIP, ALZ, PDF

배송 정보:
- 선불 결제 필요
- 배송 그룹: 명함,스티커 묶음
```

### 예시 2: 무선책자 (templated pricing)

**사용자**: "무선책자 100부 견적"

**응답**:
```
무선책자 상품을 찾았습니다.

상품 정보:
- 상품명: 무선책자
- 상품 ID: 40196
- 카테고리: 책자
- 수량: 100부

가격 정보 (사전 정의된 가격표):
- 페이지 수: 16p
- 표지: 무선 제본
- 내지: 아르지비 80g
- 표지: 아르지비 200g

옵션 선택 필요:
1. 페이지 수 (8, 16, 24, 32, 40, 48p)
2. 표지 종이
3. 내지 종이
4. 코팅 여부

가격 유형: templated (사전 정의 가격표 사용)
```

---

Version: 1.0.0
Last Updated: 2026-01-19
