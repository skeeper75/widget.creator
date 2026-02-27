#!/usr/bin/env python3
"""
후니프린팅 견적 계산기 (TOON 버전)

Usage:
  python calculate_estimate.py --product "무선책자" --options '{"pages":100}' --qty 50
  python calculate_estimate.py --product "프리미엄엽서" --options '{"size":"148x210","paper":"몽블랑240"}' --qty 100

가격 데이터: assets/data/prices.toon
"""

import json
import argparse
from pathlib import Path
from typing import Dict, Any, Optional

# TOON 로더 임포트
from toon_loader import ToonLoader


# =============================================================================
# 가격 데이터 로더 (TOON 기반)
# =============================================================================

_loader: Optional[ToonLoader] = None
_prices_path: Optional[Path] = None


def get_loader() -> ToonLoader:
    """싱글톤 로더 반환"""
    global _loader
    if _loader is None:
        _loader = ToonLoader()
    return _loader


def get_prices_path() -> Path:
    """가격 데이터 경로"""
    global _prices_path
    if _prices_path is None:
        _prices_path = Path(__file__).parent.parent / "assets" / "data" / "prices.toon"
    return _prices_path


def load_price_data() -> Dict:
    """
    TOON 가격 데이터를 기존 포맷과 호환되는 딕셔너리로 변환
    
    Returns:
        기존 DEFAULT_PRICES와 동일한 구조의 딕셔너리
    """
    loader = get_loader()
    prices_path = str(get_prices_path())
    
    # 용지: name+weight를 키로 하는 딕셔너리
    paper_table = loader.load_table(prices_path, "paper")
    paper = {}
    for row in paper_table:
        key = f"{row['name']}{row['weight']}"
        paper[key] = row['price']
    
    # 출력비
    output = loader.get_table_as_dict(prices_path, "output", "type", "price")
    
    # 제본비 (수량 구간별)
    binding = {
        "중철제본": _convert_binding_table(loader.load_table(prices_path, "binding_saddle")),
        "무선제본": _convert_binding_table(loader.load_table(prices_path, "binding_perfect")),
        "PUR제본": _convert_binding_table(loader.load_table(prices_path, "binding_pur")),
    }
    
    # 코팅비
    coating = loader.get_table_as_dict(prices_path, "coating", "type", "price")
    
    # 후가공비
    finishing = loader.get_table_as_dict(prices_path, "finishing", "type", "price")
    
    # 박가공
    foil = loader.get_table_as_dict(prices_path, "foil", "name", "base_price")
    
    # 포장비
    packaging = loader.get_table_as_dict(prices_path, "packaging", "type", "price")
    
    # 할인율
    discount_table = loader.load_table(prices_path, "discount_tiers")
    discount_tiers = [
        {"min": row["qty_min"], "max": row["qty_max"] if row["qty_max"] < 99999 else None, "rate": row["rate"]}
        for row in discount_table
    ]
    
    return {
        "paper": paper,
        "output": output,
        "binding": binding,
        "coating": coating,
        "finishing": finishing,
        "foil": foil,
        "packaging": packaging,
        "discount_tiers": discount_tiers,
    }


def _convert_binding_table(table: list) -> Dict[int, int]:
    """제본비 테이블을 기존 포맷으로 변환"""
    result = {}
    for row in table:
        result[row["qty_min"]] = row["price"]
    return result


# =============================================================================
# 가격 계산 함수
# =============================================================================

def get_discount_rate(quantity: int, prices: Dict) -> float:
    """수량별 할인율 조회"""
    for tier in prices.get("discount_tiers", []):
        max_qty = tier["max"] if tier["max"] else float('inf')
        if tier["min"] <= quantity <= max_qty:
            return tier["rate"]
    return 0


def get_binding_price(method: str, quantity: int, prices: Dict) -> int:
    """제본비 조회 (수량구간별)"""
    binding_prices = prices.get("binding", {})
    method_prices = binding_prices.get(method, {})
    
    # 수량 구간에 맞는 가격 찾기
    applicable_price = 0
    for qty_threshold, price in sorted(method_prices.items(), key=lambda x: int(x[0])):
        if quantity >= int(qty_threshold):
            applicable_price = price
    
    return applicable_price


def calculate_book_estimate(options: Dict, quantity: int, prices: Dict) -> Dict:
    """
    책자 견적 계산 (중철/무선/PUR)
    
    Args:
        options: 옵션 딕셔너리
            - pages: 페이지 수
            - inner_paper: 내지 용지
            - cover_paper: 표지 용지
            - print_type: 인쇄 타입 (양면_4도 등)
            - coating: 코팅
            - binding: 제본 방식
            - foil: 박가공 (없음/금유광/...)
            - foil_size: 박크기 (mm)
            - packaging: 포장
        quantity: 수량
        prices: 가격 데이터
    
    Returns:
        dict: 견적 결과
    """
    paper_prices = prices.get("paper", {})
    output_prices = prices.get("output", {})
    coating_prices = prices.get("coating", {})
    foil_prices = prices.get("foil", {})
    packaging_prices = prices.get("packaging", {})
    
    # 기본값 설정
    pages = options.get("pages", 100)
    inner_paper = options.get("inner_paper", "백색모조지100g")
    cover_paper = options.get("cover_paper", "아트지250g")
    print_type = options.get("print_type", "양면_4도")
    coating = options.get("coating", "없음")
    binding = options.get("binding", "무선제본")
    foil = options.get("foil", "없음")
    foil_size = options.get("foil_size", 0)  # mm
    packaging = options.get("packaging", "없음")
    
    # 1. 내지비 계산
    inner_sheets = pages // 2  # 양면이므로 장수 = 페이지/2
    inner_paper_cost = paper_prices.get(inner_paper, 50) * inner_sheets
    inner_output_cost = output_prices.get(print_type, 280) * inner_sheets
    inner_total = inner_paper_cost + inner_output_cost
    
    # 2. 표지비 계산 (표지는 1장)
    cover_paper_cost = paper_prices.get(cover_paper, 100)
    cover_output_cost = output_prices.get(print_type, 280)
    cover_coating_cost = coating_prices.get(coating, 0)
    cover_total = cover_paper_cost + cover_output_cost + cover_coating_cost
    
    # 3. 제본비
    binding_cost = get_binding_price(binding, quantity, prices)
    
    # 4. 후가공비
    finishing_cost = 0
    
    # 박가공
    if foil != "없음" and foil_size > 0:
        foil_base = foil_prices.get(foil, 15000)
        # 크기에 따른 추가비 (간단화: 100mm 기준 +50%)
        size_multiplier = 1 + (foil_size - 50) / 100 if foil_size > 50 else 1
        finishing_cost += int(foil_base * size_multiplier)
    
    # 포장
    finishing_cost += packaging_prices.get(packaging, 0)
    
    # 5. 단가 합계
    unit_cost = inner_total + cover_total + binding_cost + finishing_cost
    
    # 6. 총액 및 할인
    subtotal = unit_cost * quantity
    discount_rate = get_discount_rate(quantity, prices)
    discount_amount = int(subtotal * discount_rate)
    total = subtotal - discount_amount
    
    return {
        "product_type": "책자",
        "quantity": quantity,
        "unit_cost": unit_cost,
        "subtotal": subtotal,
        "discount": {
            "rate": f"{discount_rate * 100:.0f}%",
            "amount": discount_amount
        },
        "total": total,
        "breakdown": {
            "inner": {
                "paper": inner_paper_cost,
                "output": inner_output_cost,
                "total": inner_total
            },
            "cover": {
                "paper": cover_paper_cost,
                "output": cover_output_cost,
                "coating": cover_coating_cost,
                "total": cover_total
            },
            "binding": binding_cost,
            "finishing": finishing_cost
        },
        "options_applied": {
            "pages": pages,
            "inner_paper": inner_paper,
            "cover_paper": cover_paper,
            "print_type": print_type,
            "coating": coating,
            "binding": binding,
            "foil": foil,
            "packaging": packaging
        }
    }


def calculate_digital_estimate(product: str, options: Dict, quantity: int, prices: Dict) -> Dict:
    """
    디지털인쇄 견적 계산 (엽서, 명함, 스티커 등)
    
    Args:
        product: 상품명
        options: 옵션 딕셔너리
        quantity: 수량
        prices: 가격 데이터
    """
    paper_prices = prices.get("paper", {})
    output_prices = prices.get("output", {})
    coating_prices = prices.get("coating", {})
    finishing_prices = prices.get("finishing", {})
    
    # 옵션 추출
    paper = options.get("paper", "몽블랑240g")
    print_type = options.get("print_type", "양면_4도")
    coating = options.get("coating", "없음")
    finishing = options.get("finishing", [])
    
    # 1. 용지비
    paper_cost = paper_prices.get(paper, 100)
    
    # 2. 출력비
    output_cost = output_prices.get(print_type, 280)
    
    # 3. 코팅비
    coating_cost = coating_prices.get(coating, 0)
    
    # 4. 후가공비
    finishing_cost = 0
    for finish in finishing:
        finishing_cost += finishing_prices.get(finish, 0)
    
    # 5. 단가
    unit_cost = paper_cost + output_cost + coating_cost + finishing_cost
    
    # 6. 총액 및 할인
    subtotal = unit_cost * quantity
    discount_rate = get_discount_rate(quantity, prices)
    discount_amount = int(subtotal * discount_rate)
    total = subtotal - discount_amount
    
    return {
        "product_type": product,
        "quantity": quantity,
        "unit_cost": unit_cost,
        "subtotal": subtotal,
        "discount": {
            "rate": f"{discount_rate * 100:.0f}%",
            "amount": discount_amount
        },
        "total": total,
        "breakdown": {
            "paper": paper_cost,
            "output": output_cost,
            "coating": coating_cost,
            "finishing": finishing_cost
        }
    }


# =============================================================================
# 출력 함수
# =============================================================================

def format_currency(amount: int) -> str:
    """금액 포맷팅"""
    return f"{amount:,}원"


def print_estimate(result: Dict):
    """견적 결과 출력"""
    print("\n" + "=" * 60)
    print(f"📋 {result['product_type']} 견적서")
    print("=" * 60)
    
    print(f"\n📦 상품: {result['product_type']}")
    print(f"📊 수량: {result['quantity']:,}개")
    
    print(f"\n💰 가격 상세")
    print("-" * 40)
    
    breakdown = result["breakdown"]
    if "inner" in breakdown:
        # 책자 타입
        print(f"  내지비: {format_currency(breakdown['inner']['total'])}")
        print(f"    - 용지: {format_currency(breakdown['inner']['paper'])}")
        print(f"    - 출력: {format_currency(breakdown['inner']['output'])}")
        print(f"  표지비: {format_currency(breakdown['cover']['total'])}")
        print(f"    - 용지: {format_currency(breakdown['cover']['paper'])}")
        print(f"    - 출력: {format_currency(breakdown['cover']['output'])}")
        print(f"    - 코팅: {format_currency(breakdown['cover']['coating'])}")
        print(f"  제본비: {format_currency(breakdown['binding'])}")
        print(f"  후가공: {format_currency(breakdown['finishing'])}")
    else:
        # 디지털 타입
        print(f"  용지비: {format_currency(breakdown['paper'])}")
        print(f"  출력비: {format_currency(breakdown['output'])}")
        print(f"  코팅비: {format_currency(breakdown['coating'])}")
        print(f"  후가공: {format_currency(breakdown['finishing'])}")
    
    print("-" * 40)
    print(f"  단가: {format_currency(result['unit_cost'])}")
    print(f"  소계: {format_currency(result['subtotal'])}")
    
    if result["discount"]["amount"] > 0:
        print(f"  할인 ({result['discount']['rate']}): -{format_currency(result['discount']['amount'])}")
    
    print("=" * 40)
    print(f"  🎯 최종가: {format_currency(result['total'])}")
    print("=" * 40)
    
    # 적용된 옵션 출력
    if "options_applied" in result:
        print(f"\n⚙️ 적용 옵션")
        for key, value in result["options_applied"].items():
            print(f"  - {key}: {value}")


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="후니프린팅 견적 계산기 (TOON 버전)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  # 무선책자 견적
  python calculate_estimate.py --product "무선책자" \\
    --options '{"pages":100,"inner_paper":"아트지120g","coating":"무광코팅_단면"}' \\
    --qty 50
  
  # 프리미엄엽서 견적
  python calculate_estimate.py --product "프리미엄엽서" \\
    --options '{"paper":"몽블랑240g","print_type":"양면_4도"}' \\
    --qty 100
  
  # JSON 출력
  python calculate_estimate.py --product "무선책자" --options '{"pages":50}' --qty 10 --json
        """
    )
    
    parser.add_argument("--product", required=True, help="상품명")
    parser.add_argument("--options", required=True, help="옵션 JSON 문자열")
    parser.add_argument("--qty", type=int, required=True, help="수량")
    parser.add_argument("--json", action="store_true", help="JSON 형식 출력")
    
    args = parser.parse_args()
    
    # 가격 데이터 로드 (TOON)
    prices = load_price_data()
    
    # 옵션 파싱
    try:
        options = json.loads(args.options)
    except json.JSONDecodeError as e:
        print(f"❌ 옵션 JSON 파싱 오류: {e}")
        return
    
    # 상품 타입에 따른 계산
    product_lower = args.product.lower()
    
    if any(x in product_lower for x in ["책자", "book", "무선", "중철", "pur"]):
        result = calculate_book_estimate(options, args.qty, prices)
        result["product_type"] = args.product
    else:
        result = calculate_digital_estimate(args.product, options, args.qty, prices)
    
    # 출력
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print_estimate(result)


if __name__ == "__main__":
    main()
