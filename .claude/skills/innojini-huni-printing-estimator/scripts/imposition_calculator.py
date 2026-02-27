#!/usr/bin/env python3
"""
조판(Imposition) 및 CTP 판수 계산기

Usage:
  python imposition_calculator.py --pages 100 --signature 16 --colors 4 --binding perfect
  python imposition_calculator.py --pages 100 --optimize
  python imposition_calculator.py --pages 100 --layout

HornPenguin Booklet 참고: github.com/HornPenguin/Booklet
"""

import argparse
import math
import json


def calculate_ctp_plates(pages: int, signature_size: int = 16, colors: int = 4, 
                         binding_type: str = "perfect", work_and_turn: bool = False,
                         include_cover: bool = True) -> dict:
    """
    CTP 판수 계산
    
    Args:
        pages: 내지 총 페이지 수
        signature_size: 대지당 페이지 수 (4, 8, 16, 32)
        colors: 색상 수 (1=먹, 2=2도, 4=CMYK)
        binding_type: 'saddle' (중철) or 'perfect' (무선)
        work_and_turn: Work & Turn 적용 여부 (판수 50% 절약)
        include_cover: 표지 CTP 포함 여부
    
    Returns:
        dict: 계산 결과
    """
    # 1. 내지 대지 수 계산
    inner_signatures = math.ceil(pages / signature_size)
    
    # 2. 인쇄면 수 (양면=2, Work&Turn=1)
    sides = 1 if work_and_turn else 2
    
    # 3. 내지 CTP 판수
    inner_plates = inner_signatures * colors * sides
    
    # 4. 표지 CTP (무선제본 시 표지 별도)
    cover_plates = 0
    if include_cover and binding_type == "perfect":
        # 표지 = 앞표지 + 책등 + 뒤표지 (펼침 1장)
        cover_plates = colors * sides  # 보통 양면 4도
    
    # 5. 낭비 페이지
    total_signature_pages = inner_signatures * signature_size
    waste_pages = total_signature_pages - pages
    
    # 6. 효율성
    efficiency = (pages / total_signature_pages) * 100
    
    return {
        "input": {
            "pages": pages,
            "signature_size": signature_size,
            "colors": colors,
            "binding_type": binding_type,
            "work_and_turn": work_and_turn
        },
        "calculation": {
            "inner_signatures": inner_signatures,
            "sides_per_plate": sides,
            "inner_plates": inner_plates,
            "cover_plates": cover_plates,
            "total_ctp_plates": inner_plates + cover_plates
        },
        "efficiency": {
            "waste_pages": waste_pages,
            "efficiency_percent": round(efficiency, 1)
        }
    }


def optimize_signature(pages: int, binding_type: str = "perfect", colors: int = 4) -> list:
    """
    최적 대지 크기 분석 및 추천
    
    Args:
        pages: 총 페이지 수
        binding_type: 제본 방식
        colors: 색상 수
    
    Returns:
        list: 대지 크기별 분석 결과 (효율순 정렬)
    """
    results = []
    
    for sig_size in [4, 8, 16, 32]:
        calc = calculate_ctp_plates(pages, sig_size, colors, binding_type)
        results.append({
            "signature_size": sig_size,
            "signatures": calc["calculation"]["inner_signatures"],
            "ctp_plates": calc["calculation"]["total_ctp_plates"],
            "waste_pages": calc["efficiency"]["waste_pages"],
            "efficiency": calc["efficiency"]["efficiency_percent"]
        })
    
    # 효율성 기준 정렬 (낭비 적고, 판수 적은 순)
    results.sort(key=lambda x: (x["waste_pages"], x["ctp_plates"]))
    
    return results


def generate_imposition_layout(pages: int, signature_size: int, binding_type: str) -> dict:
    """
    조판 레이아웃 생성
    
    Args:
        pages: 총 페이지 수
        signature_size: 대지당 페이지 수
        binding_type: 'saddle' or 'perfect'
    
    Returns:
        dict: 대지별 페이지 배치
    """
    signatures = math.ceil(pages / signature_size)
    layout = {"binding_type": binding_type, "signatures": []}
    
    for sig_num in range(signatures):
        start_page = sig_num * signature_size + 1
        end_page = min((sig_num + 1) * signature_size, pages)
        
        sig_data = {
            "signature_number": sig_num + 1,
            "pages_range": f"{start_page}-{end_page}"
        }
        
        if binding_type == "saddle":
            # 중철: 바깥→안쪽 끼워넣기 방식
            sig_data["layout_type"] = "nested"
            sig_data["front_sheet"], sig_data["back_sheet"] = \
                _generate_saddle_layout(start_page, end_page, pages)
        else:
            # 무선: 순차 배열
            sig_data["layout_type"] = "sequential"
            sig_data["front_sheet"] = list(range(start_page, end_page + 1, 2))
            sig_data["back_sheet"] = list(range(start_page + 1, end_page + 1, 2))
        
        layout["signatures"].append(sig_data)
    
    return layout


def _generate_saddle_layout(start: int, end: int, total_pages: int) -> tuple:
    """중철 조판 페이지 배열 생성"""
    sig_pages = end - start + 1
    front = []
    back = []
    
    for i in range(sig_pages // 4):
        # 앞면: [마지막, 처음], [처음+1, 마지막-1]
        outer_left = total_pages - (i * 2)
        outer_right = (i * 2) + 1
        inner_left = (i * 2) + 2
        inner_right = total_pages - (i * 2) - 1
        
        front.append([outer_left, outer_right])
        back.append([inner_left, inner_right])
    
    return front, back


def calculate_spine_width(pages: int, paper_thickness: float = 0.1) -> float:
    """
    책등 두께 계산
    
    Args:
        pages: 내지 페이지 수
        paper_thickness: 종이 1장 두께 (mm), 기본 0.1mm
    
    Returns:
        float: 책등 두께 (mm)
    """
    sheets = pages / 2  # 양면 인쇄이므로 장수 = 페이지/2
    spine = sheets * paper_thickness
    return round(spine, 1)


def print_summary(result: dict, optimize_results: list = None):
    """결과 요약 출력"""
    print("\n" + "=" * 60)
    print("📚 CTP 판수 계산 결과")
    print("=" * 60)
    
    inp = result["input"]
    calc = result["calculation"]
    eff = result["efficiency"]
    
    print(f"\n📋 입력 정보")
    print(f"   총 페이지: {inp['pages']}P")
    print(f"   대지 크기: {inp['signature_size']}P")
    print(f"   색상: {inp['colors']}도 {'(CMYK)' if inp['colors']==4 else ''}")
    print(f"   제본: {'중철' if inp['binding_type']=='saddle' else '무선'}제본")
    print(f"   Work&Turn: {'적용' if inp['work_and_turn'] else '미적용'}")
    
    print(f"\n📊 계산 결과")
    print(f"   내지 대지 수: {calc['inner_signatures']}대지")
    print(f"   내지 CTP: {calc['inner_plates']}판")
    print(f"   표지 CTP: {calc['cover_plates']}판")
    print(f"   ────────────────")
    print(f"   🎯 총 CTP 판수: {calc['total_ctp_plates']}판")
    
    print(f"\n📈 효율성")
    print(f"   낭비 페이지: {eff['waste_pages']}P")
    print(f"   판 효율: {eff['efficiency_percent']}%")
    
    if optimize_results:
        print(f"\n💡 대지 크기별 비교 (추천순)")
        print(f"   {'대지':<6} {'CTP판':<8} {'낭비':<8} {'효율':<8}")
        print(f"   {'-'*32}")
        for i, r in enumerate(optimize_results):
            marker = "✓ " if i == 0 else "  "
            print(f"   {marker}{r['signature_size']}P{'':<4} {r['ctp_plates']}판{'':<5} "
                  f"{r['waste_pages']}P{'':<5} {r['efficiency']}%")


def main():
    parser = argparse.ArgumentParser(
        description="조판/CTP 판수 계산기",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  # 기본 계산
  python imposition_calculator.py --pages 100 --signature 16 --colors 4 --binding perfect
  
  # 최적 대지 크기 분석
  python imposition_calculator.py --pages 100 --optimize
  
  # 조판 레이아웃 출력
  python imposition_calculator.py --pages 16 --signature 16 --binding saddle --layout
  
  # Work & Turn 적용
  python imposition_calculator.py --pages 100 --work-and-turn
  
  # JSON 출력
  python imposition_calculator.py --pages 100 --json
        """
    )
    
    parser.add_argument("--pages", type=int, required=True, help="내지 총 페이지 수")
    parser.add_argument("--signature", type=int, default=16, 
                        choices=[4, 8, 16, 32], help="대지당 페이지 수 (기본: 16)")
    parser.add_argument("--colors", type=int, default=4, 
                        choices=[1, 2, 4], help="색상 수 (1=먹, 2=2도, 4=CMYK)")
    parser.add_argument("--binding", choices=["saddle", "perfect"], default="perfect",
                        help="제본 방식 (saddle=중철, perfect=무선)")
    parser.add_argument("--work-and-turn", action="store_true",
                        help="Work & Turn 적용 (판수 50% 절약)")
    parser.add_argument("--optimize", action="store_true",
                        help="최적 대지 크기 분석")
    parser.add_argument("--layout", action="store_true",
                        help="조판 레이아웃 출력")
    parser.add_argument("--json", action="store_true",
                        help="JSON 형식 출력")
    parser.add_argument("--no-cover", action="store_true",
                        help="표지 CTP 제외")
    
    args = parser.parse_args()
    
    # 계산 실행
    result = calculate_ctp_plates(
        pages=args.pages,
        signature_size=args.signature,
        colors=args.colors,
        binding_type=args.binding,
        work_and_turn=args.work_and_turn,
        include_cover=not args.no_cover
    )
    
    optimize_results = None
    if args.optimize:
        optimize_results = optimize_signature(args.pages, args.binding, args.colors)
    
    # 출력
    if args.json:
        output = {
            "ctp_calculation": result,
            "optimization": optimize_results
        }
        if args.layout:
            output["layout"] = generate_imposition_layout(
                args.pages, args.signature, args.binding
            )
        print(json.dumps(output, indent=2, ensure_ascii=False))
    else:
        print_summary(result, optimize_results)
        
        if args.layout:
            layout = generate_imposition_layout(args.pages, args.signature, args.binding)
            print(f"\n📐 조판 레이아웃 ({layout['binding_type'].upper()})")
            print("-" * 40)
            for sig in layout["signatures"]:
                print(f"대지 {sig['signature_number']}: 페이지 {sig['pages_range']}")
                print(f"  앞면: {sig['front_sheet']}")
                print(f"  뒷면: {sig['back_sheet']}")


if __name__ == "__main__":
    main()
