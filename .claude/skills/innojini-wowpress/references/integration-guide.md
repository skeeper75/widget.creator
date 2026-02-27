# Huni-Estimator 통합 가이드

## 개요

본 문서는 Wowpress API 스킬을 huni-estimator 시스템에 통합하는 방법을 설명합니다.

## 시스템 아키텍처

```
huni-estimator/
├── src/
│   ├── estimators/
│   │   └── wowpress_estimator.py    # Wowpress 견적 엔진
│   ├── parsers/
│   │   ├── catalog_parser.py           # 카탈로그 파서
│   │   ├── category_matcher.py         # 카테고리 매처
│   │   └── query_parser.py             # 쿼리 파서
│   └── validators/
│       └── option_validator.py         # 옵션 검증기
├── ref/
│   └── wowpress/
│       └── catalog/                    # Wowpress 카탈로그 데이터
└── .claude/skills/
    └── innojini-wowpress/              # 이 스킬
```

## 의존성 관계

### 필수 스킬

| 스킬 | 용도 | 로드 시점 |
|------|------|-----------|
| innojini-huniprinting-domain | 인쇄 기초 용어 및 계산 | 인쇄 관련 쿼리 시 |
| innojini-mycom-printing-estimator | 옵셋 인쇄 조판/견적 | 옵셋 인쇄 상품 시 |

### 선택적 스킬

| 스킬 | 용도 |
|------|------|
| moai-domain-database | 데이터베이스 연동 시 |
| moai-domain-backend | API 서버 개발 시 |

## 통합 단계

### 1단계: 카탈로그 로더 구현

```python
# src/parsers/catalog_parser.py

import json
from pathlib import Path
from typing import Dict, List, Optional

class WowpressCatalogParser:
    """Wowpress 카탈로그 파서"""

    def __init__(self, catalog_path: str = "ref/wowpress/catalog"):
        self.catalog_path = Path(catalog_path)
        self.index = None
        self.categories = {}
        self.products = {}

    def load_index(self) -> Dict:
        """메인 인덱스 로드"""
        index_file = self.catalog_path / "index.json"
        with open(index_file) as f:
            self.index = json.load(f)
        return self.index

    def load_category(self, category_id: str) -> Dict:
        """카테고리 로드 (캐싱 포함)"""
        if category_id in self.categories:
            return self.categories[category_id]

        category_file = self.catalog_path / "categories" / f"{category_id}.json"
        with open(category_file) as f:
            category = json.load(f)

        self.categories[category_id] = category
        return category

    def load_product(self, product_id: int) -> Dict:
        """상품 로드 (캐싱 포함)"""
        if product_id in self.products:
            return self.products[product_id]

        product_file = self.catalog_path / "products" / f"{product_id}.json"
        with open(product_file) as f:
            product = json.load(f)

        self.products[product_id] = product
        return product

    def search_products_by_keywords(self, keywords: List[str]) -> List[Dict]:
        """키워드로 상품 검색"""
        results = []

        for category in self.index["categories"]:
            category_data = self.load_category(category["id"])

            for product in category_data["products"]:
                # 키워드 매칭
                match_score = 0
                for keyword in keywords:
                    for product_keyword in product["keywords"]:
                        if keyword in product_keyword or product_keyword in keyword:
                            match_score += 1

                if match_score > 0:
                    results.append({
                        "product": product,
                        "score": match_score
                    })

        # 점수순 정렬
        results.sort(key=lambda x: x["score"], reverse=True)
        return [r["product"] for r in results]
```

### 2단계: 쿼리 파서 구현

```python
# src/parsers/query_parser.py

import re
from typing import Dict, Optional

class WowpressQueryParser:
    """Wowpress 쿼리 파서"""

    def parse(self, query: str) -> Dict:
        """
        사용자 쿼리 파싱

        Args:
            query: 사용자 입력 (예: "사각스티커 1000장 인쇄")

        Returns:
            파싱 결과 딕셔너리
        """
        result = {
            "product_name": None,
            "quantity": None,
            "size": None,
            "material": None,
            "finishings": [],
            "raw_query": query
        }

        # 수량 추출
        quantity_match = re.search(r'(\d+)\s*(장|매|개|부|통|세트)', query)
        if quantity_match:
            result["quantity"] = int(quantity_match.group(1))

        # 단위 제거하고 상품명 추출
        product_part = query
        if quantity_match:
            product_part = product_part[:quantity_match.start()] + product_part[quantity_match.end():]

        # 인쇄 관련 키워드 제거
        product_part = re.sub(r'(인쇄|제작|주문|견적|가격|얼마)\s*$', '', product_part)
        result["product_name"] = product_part.strip()

        return result
```

### 3단계: 옵션 검증기 구현

```python
# src/validators/option_validator.py

from typing import Dict, List

class WowpressOptionValidator:
    """Wowpress 옵션 검증기"""

    def validate_quantity(self, product: Dict, quantity: int) -> Dict:
        """수량 검증"""
        result = {
            "valid": False,
            "available_quantities": [],
            "message": ""
        }

        for qty_option in product.get("orderQuantities", []):
            if quantity in qty_option["values"]:
                result["valid"] = True
                result["available_quantities"] = qty_option["values"]
                return result

        # 유효하지 않은 경우 가까운 수량 제안
        all_quantities = []
        for qty_option in product.get("orderQuantities", []):
            all_quantities.extend(qty_option["values"])

        all_quantities = sorted(set(all_quantities))

        # 가장 가까운 수량 찾기
        closest = min(all_quantities, key=lambda x: abs(x - quantity))
        result["available_quantities"] = all_quantities
        result["message"] = f"수량 {quantity}은 유효하지 않습니다. 가장 가까운 수량: {closest}"

        return result

    def validate_file_type(self, product: Dict, file_type: str) -> Dict:
        """파일 형식 검증"""
        result = {
            "valid": False,
            "supported_types": [],
            "message": ""
        }

        supported = product.get("fileTypes", [])

        if file_type.upper() in supported:
            result["valid"] = True
        else:
            result["supported_types"] = supported
            result["message"] = f"파일 형식 {file_type}은 지원하지 않습니다"

        return result
```

### 4단계: 견적 엔진 구현

```python
# src/estimators/wowpress_estimator.py

from typing import Dict, Optional
from .parsers.catalog_parser import WowpressCatalogParser
from .parsers.query_parser import WowpressQueryParser
from .validators.option_validator import WowpressOptionValidator

class WowpressEstimator:
    """Wowpress 견적 엔진"""

    def __init__(self, catalog_path: str = "ref/wowpress/catalog"):
        self.parser = WowpressCatalogParser(catalog_path)
        self.query_parser = WowpressQueryParser()
        self.validator = WowpressOptionValidator()

        # 카탈로그 로드
        self.parser.load_index()

    def estimate(self, query: str) -> Dict:
        """
        견적 생성

        Args:
            query: 사용자 쿼리

        Returns:
            견적 결과
        """
        # 1. 쿼리 파싱
        parsed = self.query_parser.parse(query)

        # 2. 키워드 추출
        keywords = [parsed["product_name"]] if parsed["product_name"] else []

        # 3. 상품 검색
        products = self.parser.search_products_by_keywords(keywords)

        if not products:
            return {
                "success": False,
                "error": "상품을 찾을 수 없습니다",
                "suggestion": "다른 키워드로 시도해주세요"
            }

        # 4. 수량 필터링
        if parsed["quantity"]:
            filtered_products = []
            for product in products:
                validation = self.validator.validate_quantity(product, parsed["quantity"])
                if validation["valid"]:
                    filtered_products.append(product)

            products = filtered_products if filtered_products else [products[0]]

        # 첫 번째 상품 선택
        selected_product = products[0]

        # 5. 견적 생성
        quotation = self._create_quotation(selected_product, parsed)

        return {
            "success": True,
            "quotation": quotation
        }

    def _create_quotation(self, product: Dict, parsed_query: Dict) -> Dict:
        """견적서 생성"""
        return {
            "product_id": product["productId"],
            "product_name": product["name"],
            "product_url": product.get("url"),
            "quantity": parsed_query.get("quantity"),
            "unit": product.get("meta", {}).get("unit", "매"),
            "categories": product.get("categories", []),
            "file_types": product.get("fileTypes", []),
            "delivery": {
                "prepay_required": product.get("delivery", {}).get("prepayRequired", False),
                "group": product.get("delivery", {}).get("group", {}).get("name")
            },
            "quantity_options": self._get_quantity_options(product),
            "pricing": {
                "type": "templated" if product.get("pricing", {}).get("hasTemplate") else "quoted",
                "status": product.get("pricing", {}).get("status")
            },
            "next_steps": self._generate_next_steps(product)
        }

    def _get_quantity_options(self, product: Dict) -> List[int]:
        """수량 옵션 추출"""
        quantities = set()
        for qty in product.get("orderQuantities", []):
            quantities.update(qty["values"])
        return sorted(list(quantities))

    def _generate_next_steps(self, product: Dict) -> List[str]:
        """다음 단계 생성"""
        steps = []

        # 필수 옵션 확인
        if product.get("options", {}).get("sizes"):
            steps.append("사이즈 선택 필요")

        if product.get("options", {}).get("materialPapers"):
            steps.append("용지 선택 필요")

        if product.get("options", {}).get("printOptions"):
            steps.append("인쇄 방식 선택 필요")

        if product.get("options", {}).get("jobOptions"):
            steps.append("후가공 선택 필요")

        return steps
```

## Claude Code 스킬 연동

### 스킬 자동 로드

```yaml
# .claude/config/skills.yaml

skills:
  innojini-wowpress:
    trigger_keywords:
      - wowpress
      - 와우프레스
      - 인쇄
      - 명함
      - 스티커
      - 책자
      - 전단
      - 포스터
      - 팬시
      - 캘린더
    load_priority: medium
```

### 예상 사용 시나리오

**사용자**: "사각스티커 1000장 견적 알려줘"

**Claude 응답**:
```
Wowpress 카탈로그를 검색하겠습니다...

가성비스티커(사각) 상품을 찾았습니다.

상품 정보:
- 상품 ID: 40007
- 카테고리: 스티커 > 사각스티커
- 수량: 1,000매

주문 가능 수량: 500, 1,000, 2,000, 3,000...

선택 필요 옵션:
1. 사이즈 (예: 90 x 50 mm)
2. 용지 (예: 모조 80g)
3. 인쇄 방식 (예: 단면 4도)

지원 파일: AI, EPS, JPG, PNG, CDR, PSD, SIT, ZIP, ALZ, PDF
```

## Huni-Estimator와의 연동

### MES 상품 매핑

Wowpress 상품 ID를 Huni-Estimator MES 상품 코드와 매핑:

```python
# src/mappings/wowpress_to_mes.py

WOWPRESS_TO_MES = {
    # Wowpress productId -> MES 상품 코드
    40007: "MES-STI-SQR-001",  # 가성비스티커(사각)
    40056: "MES-BIZ-CRD-001",  # 레이저마킹명함
    40196: "MES-BOO-PBL-001",  # 무선책자
    # ...
}

def get_mes_product_id(wowpress_product_id: int) -> Optional[str]:
    """Wowpress 상품 ID를 MES 상품 코드로 변환"""
    return WOWPRESS_TO_MES.get(wowpress_product_id)
```

### 가격 계산 연동

```python
# src/calculators/price_calculator.py

from innojini_huniprinting_domain import calculate_layout_pansu
from innojini_mycom_printing_estimator import MycomEstimator

class IntegratedPriceCalculator:
    """통합 가격 계산기"""

    def __init__(self):
        self.mycom_estimator = MycomEstimator()

    def calculate_wowpress_price(self, wowpress_product: Dict, options: Dict) -> Dict:
        """Wowpress 상품 가격 계산"""
        product_id = wowpress_product["productId"]

        # MES 상품 코드 변환
        mes_code = get_mes_product_id(product_id)

        if mes_code and mes_code.startswith("MES-"):
            # Mycom 견적기 사용 (옵셋 인쇄)
            return self.mycom_estimator.estimate(mes_code, options)
        else:
            # Wowpress 자체 견적 사용
            return self._calculate_wowpress_quoted_price(wowpress_product, options)

    def _calculate_wowpress_quoted_price(self, product: Dict, options: Dict) -> Dict:
        """Wowpress quoted 가격 계산"""
        # 실시간 견적 로직 구현
        return {
            "price": None,
            "message": "실시간 견적이 필요합니다. Wowpress 사이트에서 확인해주세요."
        }
```

---

Version: 1.0.0
Last Updated: 2026-01-19
