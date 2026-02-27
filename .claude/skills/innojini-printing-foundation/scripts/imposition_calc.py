#!/usr/bin/env python3
"""
조판 계산기 (Imposition Calculator)
- UP수 계산
- 최적 용지 선택
- 자투리 배치 분석
"""

import argparse
import json
import math
from pathlib import Path
from typing import Dict, List, Tuple, Optional


# 용지 규격 데이터 로드
def load_paper_formats() -> Dict:
    """data/paper-formats.json 로드"""
    data_path = Path(__file__).parent.parent / "data" / "paper-formats.json"
    if data_path.exists():
        with open(data_path, "r", encoding="utf-8") as f:
            return json.load(f)
    # 기본값
    return {
        "offset_formats": {
            "국전": {"paper": [939, 636], "print": [919, 616], "ream": 500},
            "46전": {"paper": [788, 1091], "print": [768, 1071], "ream": 500},
            "46전횡": {"paper": [1091, 788], "print": [1071, 768], "ream": 500},
            "국2절": {"paper": [636, 468], "print": [616, 448], "ream": 500},
        }
    }


def calculate_imposition(
    product_w: float,
    product_h: float,
    print_w: float,
    print_h: float,
    bleed: float = 3.0
) -> Dict:
    """
    단일 용지에 대한 조판 계산
    
    Args:
        product_w: 완성물 가로 (mm)
        product_h: 완성물 세로 (mm)
        print_w: 인쇄영역 가로 (mm)
        print_h: 인쇄영역 세로 (mm)
        bleed: 도련 (mm), 기본 3mm
    
    Returns:
        Dict: 조판 결과
    """
    # 편집 사이즈 (도련 포함)
    edit_w = product_w + bleed * 2
    edit_h = product_h + bleed * 2
    
    # 정배치
    cols1 = int(print_w // edit_w)
    rows1 = int(print_h // edit_h)
    up1 = cols1 * rows1
    
    # 회전배치 (90도)
    cols2 = int(print_w // edit_h)
    rows2 = int(print_h // edit_w)
    up2 = cols2 * rows2
    
    # 최적 선택
    if up1 >= up2:
        best_up = up1
        cols, rows = cols1, rows1
        rotation = "정배치"
        used_w, used_h = edit_w, edit_h
    else:
        best_up = up2
        cols, rows = cols2, rows2
        rotation = "회전"
        used_w, used_h = edit_h, edit_w
    
    # 효율 계산
    used_area = best_up * edit_w * edit_h
    total_area = print_w * print_h
    efficiency = (used_area / total_area) * 100 if total_area > 0 else 0
    
    # 자투리 분석
    waste_w = print_w - (cols * used_w)
    waste_h = print_h - (rows * used_h)
    
    # 자투리 추가 배치 가능 여부
    waste_up = 0
    waste_note = ""
    
    # 우측 자투리에 90도 회전 배치
    if waste_w >= edit_h:
        waste_cols = int(waste_w // edit_h)
        waste_rows = int(print_h // edit_w)
        waste_up = waste_cols * waste_rows
        waste_note = f"우측 자투리 90° 회전: +{waste_up}UP"
    
    # 하단 자투리에 90도 회전 배치
    elif waste_h >= edit_w:
        waste_cols = int(print_w // edit_h)
        waste_rows = int(waste_h // edit_w)
        waste_up = waste_cols * waste_rows
        waste_note = f"하단 자투리 90° 회전: +{waste_up}UP"
    
    return {
        "product_size": f"{product_w}×{product_h}mm",
        "edit_size": f"{edit_w}×{edit_h}mm",
        "print_area": f"{print_w}×{print_h}mm",
        "up": best_up,
        "layout": f"{cols}×{rows}",
        "rotation": rotation,
        "efficiency": round(efficiency, 1),
        "waste_up": waste_up,
        "total_up": best_up + waste_up,
        "waste_note": waste_note
    }


def find_optimal_format(
    product_w: float,
    product_h: float,
    bleed: float = 3.0,
    format_type: str = "offset"
) -> List[Dict]:
    """
    모든 용지 규격에서 최적 배치 찾기
    
    Args:
        product_w: 완성물 가로 (mm)
        product_h: 완성물 세로 (mm)
        bleed: 도련 (mm)
        format_type: "offset" 또는 "roll"
    
    Returns:
        List[Dict]: 효율순 정렬된 결과
    """
    formats = load_paper_formats()
    results = []
    
    if format_type == "offset":
        for name, spec in formats.get("offset_formats", {}).items():
            print_w, print_h = spec["print"]
            result = calculate_imposition(product_w, product_h, print_w, print_h, bleed)
            result["format"] = name
            result["ream"] = spec.get("ream", 500)
            results.append(result)
    
    # 효율순 정렬 (total_up 기준)
    results.sort(key=lambda x: (-x["total_up"], -x["efficiency"]))
    
    return results


def calculate_production(
    product_w: float,
    product_h: float,
    quantity: int,
    bleed: float = 3.0
) -> Dict:
    """
    생산 계획 계산
    
    Args:
        product_w: 완성물 가로 (mm)
        product_h: 완성물 세로 (mm)
        quantity: 주문 수량
        bleed: 도련 (mm)
    
    Returns:
        Dict: 생산 계획
    """
    results = find_optimal_format(product_w, product_h, bleed)
    
    if not results:
        return {"error": "용지 규격 없음"}
    
    best = results[0]
    total_up = best["total_up"]
    ream = best["ream"]
    
    # 필요 매수
    sheets_needed = math.ceil(quantity / total_up)
    
    # R수 계산
    r_count = sheets_needed / ream
    
    # 올림 (0.5R 단위)
    if r_count > 1:
        r_rounded = math.ceil(r_count * 2) / 2
    else:
        r_rounded = r_count
    
    # 실제 생산 수량
    actual_sheets = int(r_rounded * ream)
    actual_qty = actual_sheets * total_up
    
    return {
        "order_qty": quantity,
        "best_format": best["format"],
        "up": best["up"],
        "waste_up": best["waste_up"],
        "total_up": total_up,
        "efficiency": best["efficiency"],
        "sheets_needed": sheets_needed,
        "r_count": round(r_count, 3),
        "r_rounded": r_rounded,
        "actual_sheets": actual_sheets,
        "actual_qty": actual_qty,
        "surplus": actual_qty - quantity
    }


def main():
    parser = argparse.ArgumentParser(description="조판 계산기")
    parser.add_argument("--width", "-W", type=float, required=True, help="완성물 가로 (mm)")
    parser.add_argument("--height", "-H", type=float, required=True, help="완성물 세로 (mm)")
    parser.add_argument("--bleed", "-b", type=float, default=3.0, help="도련 (mm), 기본 3mm")
    parser.add_argument("--qty", "-q", type=int, help="주문 수량")
    parser.add_argument("--format", "-f", type=str, help="특정 용지 규격")
    parser.add_argument("--json", action="store_true", help="JSON 출력")
    
    args = parser.parse_args()
    
    if args.qty:
        # 생산 계획 모드
        result = calculate_production(args.width, args.height, args.qty, args.bleed)
        
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(f"\n📐 생산 계획: {args.width}×{args.height}mm, {args.qty}개")
            print("=" * 50)
            print(f"최적 용지: {result['best_format']}")
            print(f"판걸이: {result['up']}UP + 자투리 {result['waste_up']}UP = {result['total_up']}UP")
            print(f"효율: {result['efficiency']}%")
            print(f"필요 매수: {result['sheets_needed']}매")
            print(f"R수: {result['r_count']}R → {result['r_rounded']}R")
            print(f"실제 생산: {result['actual_qty']}개 (여분 +{result['surplus']})")
    else:
        # 용지 비교 모드
        results = find_optimal_format(args.width, args.height, args.bleed)
        
        if args.json:
            print(json.dumps(results, ensure_ascii=False, indent=2))
        else:
            print(f"\n📐 조판 분석: {args.width}×{args.height}mm (도련 {args.bleed}mm)")
            print("=" * 60)
            print(f"{'용지':<10} {'판걸이':<10} {'자투리':<8} {'총UP':<8} {'효율':<8} {'배치':<8}")
            print("-" * 60)
            
            for i, r in enumerate(results[:8]):
                marker = "★" if i == 0 else " "
                print(f"{marker}{r['format']:<9} {r['layout']:<10} +{r['waste_up']:<7} "
                      f"{r['total_up']:<8} {r['efficiency']}%{'':<4} {r['rotation']}")


if __name__ == "__main__":
    main()
