#!/usr/bin/env python3
"""
CTP 판수 계산기
- 책자 내지/표지 CTP 계산
- Work&Turn 지원
- 대지 최적화
"""

import argparse
import json
import math
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class BindingConfig:
    """제본 방식별 설정"""
    name: str
    min_pages: int
    max_pages: int
    page_unit: int  # 페이지 증가 단위
    has_cover: bool  # 별도 표지 여부
    signature_default: int  # 기본 대지 크기


BINDING_CONFIGS = {
    "중철": BindingConfig("중철", 8, 64, 4, False, 16),
    "무선": BindingConfig("무선", 24, 400, 2, True, 16),
    "PUR": BindingConfig("PUR", 24, 400, 2, True, 16),
    "양장": BindingConfig("양장", 48, 500, 2, True, 16),
}


def calculate_ctp(
    pages: int,
    signature: int = 16,
    colors: int = 4,
    print_mode: str = "sheetwise",
    binding: str = "무선",
    cover_colors: Optional[int] = None
) -> Dict:
    """
    CTP 판수 계산
    
    Args:
        pages: 총 페이지 수
        signature: 대지당 페이지 수 (4, 8, 16, 32)
        colors: 색상 수 (1=먹, 4=CMYK)
        print_mode: "sheetwise" 또는 "work_turn"
        binding: 제본 방식
        cover_colors: 표지 색상 수 (None이면 내지와 동일)
    
    Returns:
        Dict: CTP 계산 결과
    """
    config = BINDING_CONFIGS.get(binding, BINDING_CONFIGS["무선"])
    
    # 인쇄면수
    sides = 1 if print_mode == "work_turn" else 2
    
    # 내지 대지 수
    inner_signatures = math.ceil(pages / signature)
    
    # 여백 페이지
    actual_pages = inner_signatures * signature
    waste_pages = actual_pages - pages
    
    # 내지 CTP
    inner_ctp = inner_signatures * colors * sides
    
    # 표지 CTP (무선/PUR/양장은 별도 표지)
    cover_ctp = 0
    if config.has_cover:
        cover_c = cover_colors if cover_colors else colors
        cover_ctp = 1 * cover_c * sides  # 표지 1대지
    
    # 총 CTP
    total_ctp = inner_ctp + cover_ctp
    
    # 효율
    efficiency = (pages / actual_pages) * 100 if actual_pages > 0 else 0
    
    return {
        "input": {
            "pages": pages,
            "signature": signature,
            "colors": colors,
            "print_mode": print_mode,
            "binding": binding
        },
        "inner": {
            "signatures": inner_signatures,
            "actual_pages": actual_pages,
            "waste_pages": waste_pages,
            "ctp_plates": inner_ctp
        },
        "cover": {
            "colors": cover_colors or colors,
            "ctp_plates": cover_ctp
        },
        "total_ctp_plates": total_ctp,
        "efficiency": round(efficiency, 1),
        "formula": f"{inner_signatures}대지 × {colors}색 × {sides}면 = {inner_ctp}판"
                  + (f" + 표지 {cover_ctp}판" if cover_ctp else "")
    }


def optimize_signature(
    pages: int,
    binding: str = "무선",
    colors: int = 4
) -> List[Dict]:
    """
    최적 대지 크기 분석
    
    Args:
        pages: 총 페이지 수
        binding: 제본 방식
        colors: 색상 수
    
    Returns:
        List[Dict]: 대지별 분석 결과 (효율순)
    """
    results = []
    
    for sig_size in [4, 8, 16, 32]:
        calc = calculate_ctp(pages, sig_size, colors, "sheetwise", binding)
        results.append({
            "signature": sig_size,
            "signatures": calc["inner"]["signatures"],
            "waste_pages": calc["inner"]["waste_pages"],
            "total_ctp": calc["total_ctp_plates"],
            "efficiency": calc["efficiency"]
        })
    
    # 효율 + 낭비 기준 정렬
    results.sort(key=lambda x: (-x["efficiency"], x["waste_pages"]))
    
    return results


def calculate_booklet_ctp(
    pages: int,
    binding: str = "무선",
    colors: int = 4,
    cover_colors: int = 4,
    signature: int = 16
) -> Dict:
    """
    책자 전체 CTP 계산 (상세)
    
    Args:
        pages: 내지 페이지 수
        binding: 제본 방식
        colors: 내지 색상 수
        cover_colors: 표지 색상 수
        signature: 대지 크기
    
    Returns:
        Dict: 상세 CTP 계산 결과
    """
    config = BINDING_CONFIGS.get(binding, BINDING_CONFIGS["무선"])
    
    # 내지
    inner_signatures = math.ceil(pages / signature)
    inner_ctp = inner_signatures * colors * 2  # 양면
    
    # 표지
    cover_ctp = 0
    if config.has_cover:
        cover_ctp = 1 * cover_colors * 2
    
    # 중철은 표지=내지의 바깥 대지
    if binding == "중철":
        inner_ctp = inner_signatures * colors * 2
        cover_ctp = 0  # 표지 별도 없음
    
    total_ctp = inner_ctp + cover_ctp
    
    return {
        "binding": binding,
        "pages": pages,
        "signature": signature,
        "inner": {
            "signatures": inner_signatures,
            "colors": colors,
            "ctp": inner_ctp,
            "breakdown": f"{inner_signatures} × {colors}색 × 2면"
        },
        "cover": {
            "exists": config.has_cover,
            "colors": cover_colors if config.has_cover else 0,
            "ctp": cover_ctp,
            "breakdown": f"1 × {cover_colors}색 × 2면" if config.has_cover else "N/A"
        },
        "total_ctp": total_ctp
    }


def main():
    parser = argparse.ArgumentParser(description="CTP 판수 계산기")
    parser.add_argument("--pages", "-p", type=int, required=True, help="총 페이지 수")
    parser.add_argument("--signature", "-s", type=int, default=16, 
                        choices=[4, 8, 16, 32], help="대지 크기 (기본 16)")
    parser.add_argument("--colors", "-c", type=int, default=4, help="색상 수 (기본 4)")
    parser.add_argument("--binding", "-b", type=str, default="무선",
                        choices=["중철", "무선", "PUR", "양장"], help="제본 방식")
    parser.add_argument("--mode", "-m", type=str, default="sheetwise",
                        choices=["sheetwise", "work_turn"], help="인쇄 방식")
    parser.add_argument("--optimize", "-o", action="store_true", help="대지 크기 최적화 분석")
    parser.add_argument("--json", action="store_true", help="JSON 출력")
    
    args = parser.parse_args()
    
    if args.optimize:
        # 대지 최적화 분석
        results = optimize_signature(args.pages, args.binding, args.colors)
        
        if args.json:
            print(json.dumps(results, ensure_ascii=False, indent=2))
        else:
            print(f"\n🔧 대지 크기 최적화: {args.pages}P {args.binding}")
            print("=" * 50)
            print(f"{'대지':<8} {'대지수':<8} {'낭비':<8} {'CTP':<8} {'효율':<8}")
            print("-" * 50)
            
            for i, r in enumerate(results):
                marker = "★" if i == 0 else " "
                print(f"{marker}{r['signature']}P{'':<5} {r['signatures']:<8} "
                      f"{r['waste_pages']}P{'':<5} {r['total_ctp']}판{'':<4} {r['efficiency']}%")
    else:
        # 단일 계산
        result = calculate_ctp(
            args.pages, args.signature, args.colors,
            args.mode, args.binding
        )
        
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(f"\n📊 CTP 판수 계산: {args.pages}P {args.binding} {args.colors}도")
            print("=" * 50)
            print(f"대지 크기: {args.signature}P")
            print(f"대지 수: {result['inner']['signatures']}대지")
            print(f"여백 페이지: {result['inner']['waste_pages']}P")
            print(f"인쇄 방식: {args.mode}")
            print("-" * 50)
            print(f"내지 CTP: {result['inner']['ctp_plates']}판")
            if result['cover']['ctp_plates'] > 0:
                print(f"표지 CTP: {result['cover']['ctp_plates']}판")
            print(f"총 CTP: {result['total_ctp_plates']}판")
            print("-" * 50)
            print(f"공식: {result['formula']}")
            print(f"효율: {result['efficiency']}%")


if __name__ == "__main__":
    main()
