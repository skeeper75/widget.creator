#!/usr/bin/env python3
"""
Shopify 마진 계산기
===================
Shopify Payments 수수료를 고려한 실수령액 및 마진율 계산

수수료 구조:
- 카드 결제: 2.9%
- 건당 고정: $0.30
- 공식: 실수령액 = 결제금액 × 0.971 - $0.30
"""

import argparse
import csv
import json
from dataclasses import dataclass
from typing import Optional


@dataclass
class MarginResult:
    """마진 계산 결과"""
    selling_price: float      # 판매가
    product_cost: float       # 상품원가
    shipping_cost: float      # 배송비
    payment_fee_rate: float   # 결제 수수료율 (2.9%)
    payment_fee_fixed: float  # 건당 고정 수수료 ($0.30)
    
    @property
    def payment_fee(self) -> float:
        """결제 수수료 (비율 + 고정)"""
        return self.selling_price * self.payment_fee_rate + self.payment_fee_fixed
    
    @property
    def net_revenue(self) -> float:
        """실수령액"""
        return self.selling_price - self.payment_fee
    
    @property
    def total_cost(self) -> float:
        """총 비용 (원가 + 배송)"""
        return self.product_cost + self.shipping_cost
    
    @property
    def margin(self) -> float:
        """마진 (이익)"""
        return self.net_revenue - self.total_cost
    
    @property
    def margin_rate(self) -> float:
        """마진율 (%)"""
        if self.selling_price <= 0:
            return 0.0
        return (self.margin / self.selling_price) * 100
    
    @property
    def roi(self) -> float:
        """투자수익률 (%)"""
        if self.total_cost <= 0:
            return 0.0
        return (self.margin / self.total_cost) * 100
    
    def to_dict(self) -> dict:
        return {
            "selling_price": round(self.selling_price, 2),
            "product_cost": round(self.product_cost, 2),
            "shipping_cost": round(self.shipping_cost, 2),
            "payment_fee": round(self.payment_fee, 2),
            "net_revenue": round(self.net_revenue, 2),
            "margin": round(self.margin, 2),
            "margin_rate": round(self.margin_rate, 1),
            "roi": round(self.roi, 1),
        }
    
    def __str__(self) -> str:
        return f"""
╔══════════════════════════════════════════════════════╗
║           Shopify 마진 계산 결과                     ║
╠══════════════════════════════════════════════════════╣
║  판매가 (고객 결제)      │  ${self.selling_price:>10,.2f}         ║
║  ─────────────────────────────────────────────────── ║
║  결제 수수료 (2.9%)      │  -${self.selling_price * self.payment_fee_rate:>9,.2f}         ║
║  건당 고정 수수료        │  -${self.payment_fee_fixed:>9,.2f}         ║
║  ─────────────────────────────────────────────────── ║
║  실수령액                │  ${self.net_revenue:>10,.2f}         ║
║  ─────────────────────────────────────────────────── ║
║  상품 원가               │  -${self.product_cost:>9,.2f}         ║
║  배송비                  │  -${self.shipping_cost:>9,.2f}         ║
╠══════════════════════════════════════════════════════╣
║  💰 마진 (이익)          │  ${self.margin:>10,.2f}         ║
║  📊 마진율               │    {self.margin_rate:>9,.1f}%         ║
║  📈 ROI                  │    {self.roi:>9,.1f}%         ║
╚══════════════════════════════════════════════════════╝
"""


def calculate_margin(
    selling_price: float,
    product_cost: float,
    shipping_cost: float = 0.0,
    payment_fee_rate: float = 0.029,  # 2.9%
    payment_fee_fixed: float = 0.30,  # $0.30
) -> MarginResult:
    """
    Shopify 마진 계산
    
    Args:
        selling_price: 판매가 (고객 결제 금액)
        product_cost: 상품 원가
        shipping_cost: 배송비 (기본 0)
        payment_fee_rate: 결제 수수료율 (기본 2.9%)
        payment_fee_fixed: 건당 고정 수수료 (기본 $0.30)
    
    Returns:
        MarginResult 객체
    """
    return MarginResult(
        selling_price=selling_price,
        product_cost=product_cost,
        shipping_cost=shipping_cost,
        payment_fee_rate=payment_fee_rate,
        payment_fee_fixed=payment_fee_fixed,
    )


def calculate_break_even_price(
    product_cost: float,
    shipping_cost: float = 0.0,
    payment_fee_rate: float = 0.029,
    payment_fee_fixed: float = 0.30,
) -> float:
    """
    손익분기 판매가 계산
    
    마진 = 0 일 때의 판매가
    selling_price - (selling_price * rate + fixed) - cost - shipping = 0
    selling_price * (1 - rate) = fixed + cost + shipping
    selling_price = (fixed + cost + shipping) / (1 - rate)
    """
    total_cost = product_cost + shipping_cost + payment_fee_fixed
    return total_cost / (1 - payment_fee_rate)


def calculate_target_margin_price(
    product_cost: float,
    target_margin_rate: float,  # 목표 마진율 (예: 0.3 = 30%)
    shipping_cost: float = 0.0,
    payment_fee_rate: float = 0.029,
    payment_fee_fixed: float = 0.30,
) -> float:
    """
    목표 마진율 달성을 위한 판매가 계산
    
    margin_rate = margin / selling_price
    margin = net_revenue - total_cost
    margin = (selling_price - selling_price * rate - fixed) - total_cost
    
    target_margin_rate * selling_price = selling_price * (1 - rate) - fixed - total_cost
    selling_price * (target_margin_rate - 1 + rate) = -fixed - total_cost
    selling_price = (fixed + total_cost) / (1 - rate - target_margin_rate)
    """
    total_cost = product_cost + shipping_cost
    denominator = 1 - payment_fee_rate - target_margin_rate
    if denominator <= 0:
        raise ValueError(f"목표 마진율 {target_margin_rate*100:.1f}%는 달성 불가능합니다.")
    return (payment_fee_fixed + total_cost) / denominator


def process_csv(filepath: str, output_format: str = "table") -> None:
    """CSV 파일에서 일괄 계산"""
    results = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            result = calculate_margin(
                selling_price=float(row.get('price', row.get('selling_price', 0))),
                product_cost=float(row.get('cost', row.get('product_cost', 0))),
                shipping_cost=float(row.get('shipping', row.get('shipping_cost', 0))),
            )
            result_dict = result.to_dict()
            result_dict['name'] = row.get('name', row.get('product', 'Unknown'))
            results.append(result_dict)
    
    if output_format == "json":
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        # Table format
        print(f"{'상품명':<20} {'판매가':>10} {'원가':>10} {'마진':>10} {'마진율':>8}")
        print("-" * 60)
        for r in results:
            print(f"{r['name']:<20} ${r['selling_price']:>8,.2f} ${r['product_cost']:>8,.2f} ${r['margin']:>8,.2f} {r['margin_rate']:>6,.1f}%")


def main():
    parser = argparse.ArgumentParser(
        description="Shopify 마진 계산기",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  # 기본 계산
  python margin_calculator.py --price 50 --cost 28
  
  # 배송비 포함
  python margin_calculator.py --price 50 --cost 28 --shipping 5
  
  # 목표 마진율 30%를 위한 판매가 계산
  python margin_calculator.py --cost 28 --target-margin 30
  
  # 손익분기 판매가 계산
  python margin_calculator.py --cost 28 --break-even
  
  # CSV 일괄 계산
  python margin_calculator.py --csv products.csv
        """
    )
    
    parser.add_argument('--price', type=float, help='판매가 (고객 결제 금액)')
    parser.add_argument('--cost', type=float, help='상품 원가')
    parser.add_argument('--shipping', type=float, default=0, help='배송비 (기본 0)')
    parser.add_argument('--fee-rate', type=float, default=2.9, help='결제 수수료율 %% (기본 2.9)')
    parser.add_argument('--fee-fixed', type=float, default=0.30, help='건당 고정 수수료 (기본 $0.30)')
    parser.add_argument('--target-margin', type=float, help='목표 마진율 %%')
    parser.add_argument('--break-even', action='store_true', help='손익분기 판매가 계산')
    parser.add_argument('--csv', type=str, help='CSV 파일 경로')
    parser.add_argument('--json', action='store_true', help='JSON 형식으로 출력')
    
    args = parser.parse_args()
    fee_rate = args.fee_rate / 100  # % to decimal
    
    # CSV 일괄 처리
    if args.csv:
        output_format = "json" if args.json else "table"
        process_csv(args.csv, output_format)
        return
    
    # 손익분기 계산
    if args.break_even and args.cost:
        price = calculate_break_even_price(
            product_cost=args.cost,
            shipping_cost=args.shipping,
            payment_fee_rate=fee_rate,
            payment_fee_fixed=args.fee_fixed,
        )
        print(f"\n📊 손익분기 판매가: ${price:.2f}")
        print(f"   (원가 ${args.cost:.2f}, 배송비 ${args.shipping:.2f} 기준)\n")
        return
    
    # 목표 마진율 계산
    if args.target_margin and args.cost:
        try:
            price = calculate_target_margin_price(
                product_cost=args.cost,
                target_margin_rate=args.target_margin / 100,
                shipping_cost=args.shipping,
                payment_fee_rate=fee_rate,
                payment_fee_fixed=args.fee_fixed,
            )
            print(f"\n🎯 목표 마진율 {args.target_margin}% 달성을 위한 판매가: ${price:.2f}")
            print(f"   (원가 ${args.cost:.2f}, 배송비 ${args.shipping:.2f} 기준)\n")
            
            # 검증용 계산 결과 출력
            result = calculate_margin(
                selling_price=price,
                product_cost=args.cost,
                shipping_cost=args.shipping,
                payment_fee_rate=fee_rate,
                payment_fee_fixed=args.fee_fixed,
            )
            print(result)
        except ValueError as e:
            print(f"\n❌ 오류: {e}\n")
        return
    
    # 기본 마진 계산
    if args.price and args.cost is not None:
        result = calculate_margin(
            selling_price=args.price,
            product_cost=args.cost,
            shipping_cost=args.shipping,
            payment_fee_rate=fee_rate,
            payment_fee_fixed=args.fee_fixed,
        )
        
        if args.json:
            print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
        else:
            print(result)
        return
    
    # 인자 부족
    parser.print_help()


if __name__ == "__main__":
    main()
