#!/usr/bin/env python3
"""
책등/오시/크립 계산기
- 책등 두께 계산
- 표지 오시 줄 수
- 표지 펼침 크기
- 크립 보정
"""

import argparse
import json
import math
from pathlib import Path
from typing import Dict, List, Optional, Tuple


# 용지 두께 데이터 로드
def load_paper_thickness() -> Dict:
    """data/paper-thickness.json 로드"""
    data_path = Path(__file__).parent.parent / "data" / "paper-thickness.json"
    if data_path.exists():
        with open(data_path, "r", encoding="utf-8") as f:
            return json.load(f)
    # 기본값
    return {
        "default_thickness": {
            "80g": 0.10, "100g": 0.11, "120g": 0.12,
            "150g": 0.14, "200g": 0.18, "250g": 0.22
        }
    }


def get_paper_thickness(paper_type: str, weight: str) -> float:
    """
    용지 두께 조회
    
    Args:
        paper_type: 용지 종류 (모조지, 아트지, 스노우지 등)
        weight: 평량 (80g, 100g 등)
    
    Returns:
        두께 (mm)
    """
    data = load_paper_thickness()
    
    # 특정 용지 타입 검색
    if paper_type in data.get("paper_thickness", {}):
        paper_data = data["paper_thickness"][paper_type]
        if weight in paper_data:
            return paper_data[weight]
    
    # 기본값 사용
    defaults = data.get("default_thickness", {})
    return defaults.get(weight, 0.10)


def calculate_spine(
    pages: int,
    paper_type: str = "모조지",
    weight: str = "80g",
    thickness: Optional[float] = None
) -> Dict:
    """
    책등 두께 계산
    
    Args:
        pages: 페이지 수
        paper_type: 용지 종류
        weight: 평량
        thickness: 직접 지정 두께 (mm)
    
    Returns:
        Dict: 책등 계산 결과
    """
    # 두께 결정
    if thickness is None:
        thickness = get_paper_thickness(paper_type, weight)
    
    # 책등 두께 = (페이지/2) × 용지두께
    sheets = pages / 2
    spine_mm = sheets * thickness
    
    return {
        "pages": pages,
        "paper": f"{paper_type} {weight}",
        "thickness_mm": thickness,
        "sheets": int(sheets),
        "spine_mm": round(spine_mm, 1),
        "formula": f"({pages}÷2) × {thickness}mm = {round(spine_mm, 1)}mm"
    }


def calculate_score_lines(
    binding: str = "무선",
    has_wing: bool = False,
    cover_weight: str = "250g"
) -> Dict:
    """
    표지 오시 줄 수 계산
    
    Args:
        binding: 제본 방식 (무선, 중철, PUR, 양장)
        has_wing: 날개 여부
        cover_weight: 표지 평량
    
    Returns:
        Dict: 오시 계산 결과
    """
    # 오시 줄 수 결정
    if binding == "중철":
        lines = 0
        components = ["접지만 (오시 없음)"]
    elif binding in ["무선", "PUR"]:
        if has_wing:
            lines = 6
            components = ["책등 2줄", "힌지 2줄", "날개 2줄"]
        else:
            lines = 4
            components = ["책등 2줄", "힌지 2줄"]
    elif binding == "양장":
        lines = 4
        components = ["책등 2줄", "힌지 2줄"]
    else:
        lines = 4
        components = ["책등 2줄", "힌지 2줄"]
    
    # 힌지 간격
    weight_num = int(cover_weight.replace("g", ""))
    if weight_num <= 250:
        hinge_gap = 6
    elif weight_num <= 300:
        hinge_gap = 8
    else:
        hinge_gap = 10
    
    return {
        "binding": binding,
        "has_wing": has_wing,
        "lines": lines,
        "components": components,
        "hinge_gap_mm": hinge_gap,
        "cover_weight": cover_weight
    }


def calculate_cover_spread(
    width: float,
    height: float,
    spine_mm: float,
    bleed: float = 3.0,
    wing_width: Optional[float] = None
) -> Dict:
    """
    표지 펼침 크기 계산
    
    Args:
        width: 완성물 너비 (mm)
        height: 완성물 높이 (mm)
        spine_mm: 책등 두께 (mm)
        bleed: 도련 (mm)
        wing_width: 날개 너비 (mm), None이면 날개 없음
    
    Returns:
        Dict: 펼침 크기 결과
    """
    if wing_width:
        # 날개 있음
        spread_w = wing_width + bleed + width + spine_mm + width + bleed + wing_width
        components = [
            f"날개({wing_width})",
            f"도련({bleed})",
            f"뒤표지({width})",
            f"책등({spine_mm})",
            f"앞표지({width})",
            f"도련({bleed})",
            f"날개({wing_width})"
        ]
    else:
        # 날개 없음
        spread_w = bleed + width + spine_mm + width + bleed
        components = [
            f"도련({bleed})",
            f"뒤표지({width})",
            f"책등({spine_mm})",
            f"앞표지({width})",
            f"도련({bleed})"
        ]
    
    spread_h = bleed + height + bleed
    
    return {
        "product_size": f"{width}×{height}mm",
        "spine_mm": spine_mm,
        "bleed": bleed,
        "wing_width": wing_width,
        "spread_w": round(spread_w, 1),
        "spread_h": round(spread_h, 1),
        "spread_size": f"{round(spread_w, 1)}×{round(spread_h, 1)}mm",
        "components": " + ".join(components)
    }


def calculate_creep(
    pages: int,
    paper_type: str = "모조지",
    weight: str = "80g",
    thickness: Optional[float] = None
) -> Dict:
    """
    크립 보정 계산 (중철제본 전용)
    
    Args:
        pages: 페이지 수
        paper_type: 용지 종류
        weight: 평량
        thickness: 직접 지정 두께 (mm)
    
    Returns:
        Dict: 크립 보정 결과
    """
    # 두께 결정
    if thickness is None:
        thickness = get_paper_thickness(paper_type, weight)
    
    # 크립 적용 조건 확인
    needs_correction = pages >= 40
    
    if not needs_correction:
        return {
            "pages": pages,
            "needs_correction": False,
            "reason": "40P 미만은 크립 보정 불필요",
            "total_creep_mm": 0,
            "adjustments": []
        }
    
    # 총 스프레드 수
    total_spreads = pages // 4
    
    # 총 크립량 = (스프레드수 - 1) × 용지두께
    total_creep = (total_spreads - 1) * thickness
    
    # 스프레드별 보정값
    adjustments = []
    for i in range(1, total_spreads + 1):
        if total_spreads > 1:
            adjustment = total_creep * (i - 1) / (total_spreads - 1)
        else:
            adjustment = 0
        
        # 페이지 번호 계산
        outer_pages = (i * 2 - 1, pages - (i * 2 - 2))
        inner_pages = (i * 2, pages - (i * 2 - 1))
        
        adjustments.append({
            "spread": i,
            "pages": f"P{outer_pages[0]}-{outer_pages[1]}, P{inner_pages[0]}-{inner_pages[1]}",
            "adjustment_mm": round(adjustment, 2)
        })
    
    return {
        "pages": pages,
        "paper": f"{paper_type} {weight}",
        "thickness_mm": thickness,
        "needs_correction": True,
        "total_spreads": total_spreads,
        "total_creep_mm": round(total_creep, 2),
        "formula": f"({total_spreads} - 1) × {thickness}mm = {round(total_creep, 2)}mm",
        "adjustments": adjustments[:5] + (["..."] if len(adjustments) > 5 else [])
                      + ([adjustments[-1]] if len(adjustments) > 5 else [])
    }


def main():
    parser = argparse.ArgumentParser(description="책등/오시/크립 계산기")
    subparsers = parser.add_subparsers(dest="command", help="명령어")
    
    # 책등 계산
    spine_parser = subparsers.add_parser("spine", help="책등 두께 계산")
    spine_parser.add_argument("--pages", "-p", type=int, required=True, help="페이지 수")
    spine_parser.add_argument("--paper", type=str, default="모조지", help="용지 종류")
    spine_parser.add_argument("--weight", "-w", type=str, default="80g", help="평량")
    spine_parser.add_argument("--json", action="store_true", help="JSON 출력")
    
    # 오시 계산
    score_parser = subparsers.add_parser("score", help="오시 줄 수 계산")
    score_parser.add_argument("--binding", "-b", type=str, default="무선", help="제본 방식")
    score_parser.add_argument("--wing", action="store_true", help="날개 있음")
    score_parser.add_argument("--cover-weight", type=str, default="250g", help="표지 평량")
    score_parser.add_argument("--json", action="store_true", help="JSON 출력")
    
    # 펼침 크기
    spread_parser = subparsers.add_parser("spread", help="표지 펼침 크기 계산")
    spread_parser.add_argument("--width", type=float, required=True, help="완성물 너비")
    spread_parser.add_argument("--height", type=float, required=True, help="완성물 높이")
    spread_parser.add_argument("--spine", type=float, required=True, help="책등 두께")
    spread_parser.add_argument("--bleed", type=float, default=3.0, help="도련")
    spread_parser.add_argument("--wing", type=float, help="날개 너비")
    spread_parser.add_argument("--json", action="store_true", help="JSON 출력")
    
    # 크립 보정
    creep_parser = subparsers.add_parser("creep", help="크립 보정 계산")
    creep_parser.add_argument("--pages", "-p", type=int, required=True, help="페이지 수")
    creep_parser.add_argument("--paper", type=str, default="모조지", help="용지 종류")
    creep_parser.add_argument("--weight", "-w", type=str, default="80g", help="평량")
    creep_parser.add_argument("--json", action="store_true", help="JSON 출력")
    
    args = parser.parse_args()
    
    if args.command == "spine":
        result = calculate_spine(args.pages, args.paper, args.weight)
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(f"\n📏 책등 두께: {result['spine_mm']}mm")
            print(f"   {result['formula']}")
    
    elif args.command == "score":
        result = calculate_score_lines(args.binding, args.wing, args.cover_weight)
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(f"\n📐 오시 줄 수: {result['lines']}줄")
            print(f"   구성: {', '.join(result['components'])}")
            print(f"   힌지 간격: {result['hinge_gap_mm']}mm")
    
    elif args.command == "spread":
        result = calculate_cover_spread(
            args.width, args.height, args.spine,
            args.bleed, args.wing
        )
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(f"\n📄 표지 펼침 크기: {result['spread_size']}")
            print(f"   구성: {result['components']}")
    
    elif args.command == "creep":
        result = calculate_creep(args.pages, args.paper, args.weight)
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            if result["needs_correction"]:
                print(f"\n⚠️ 크립 보정 필요: {result['total_creep_mm']}mm")
                print(f"   {result['formula']}")
                print(f"\n   스프레드별 보정값:")
                for adj in result["adjustments"][:5]:
                    if isinstance(adj, dict):
                        print(f"   스프레드 {adj['spread']}: {adj['adjustment_mm']}mm")
                    else:
                        print(f"   {adj}")
            else:
                print(f"\n✅ 크립 보정 불필요: {result['reason']}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
