#!/usr/bin/env python3
"""
자투리 추가배치 배열표 생성
- 정규 배열 + 자투리 배치 시각화
- 모든 용지 규격별 비교
"""

import math
from dataclasses import dataclass
from typing import List, Tuple, Optional

# 용지 규격 (mm)
PAPER_FORMATS = {
    "국전": (636, 939),
    "46전": (788, 1091),
    "46전횡": (1091, 788),
    "46반": (545, 788),
    "국반": (468, 636),
    "A1": (594, 841),
    "A2": (420, 594),
}

@dataclass
class WasteLayout:
    """자투리 배치 결과"""
    format_name: str
    paper_w: float
    paper_h: float
    print_w: float
    print_h: float
    # 정규 배열
    main_cols: int
    main_rows: int
    main_ups: int
    main_orientation: str
    # 자투리 배치
    waste_right_cols: int
    waste_right_rows: int
    waste_right_ups: int
    waste_right_orientation: str
    waste_bottom_cols: int
    waste_bottom_rows: int
    waste_bottom_ups: int
    waste_bottom_orientation: str
    # 합계
    total_ups: int
    efficiency: float
    # 여백
    remaining_w: float
    remaining_h: float


def analyze_waste_layout(finished_w: float, finished_h: float, 
                         paper_format: str, bleed: float = 3) -> WasteLayout:
    """자투리 배치 상세 분석"""
    
    paper_w, paper_h = PAPER_FORMATS[paper_format]
    print_w = finished_w + (bleed * 2)
    print_h = finished_h + (bleed * 2)
    
    # 가로 배치 (정규)
    cols_h = int(paper_w // print_w)
    rows_h = int(paper_h // print_h)
    
    # 세로 배치 (정규, 90° 회전)
    cols_v = int(paper_w // print_h)
    rows_v = int(paper_h // print_w)
    
    # 더 효율적인 방향 선택
    if cols_h * rows_h >= cols_v * rows_v:
        main_cols, main_rows = cols_h, rows_h
        main_orientation = "가로"
        used_w = main_cols * print_w
        used_h = main_rows * print_h
    else:
        main_cols, main_rows = cols_v, rows_v
        main_orientation = "세로"
        used_w = main_cols * print_h
        used_h = main_rows * print_w
    
    main_ups = main_cols * main_rows
    remaining_w = paper_w - used_w
    remaining_h = paper_h - used_h
    
    # 오른쪽 자투리 (회전 배치)
    waste_right_cols = 0
    waste_right_rows = 0
    waste_right_ups = 0
    waste_right_orientation = ""
    
    if main_orientation == "가로":
        # 오른쪽에 세로 방향으로 배치 시도
        if remaining_w >= print_h:
            waste_right_cols = int(remaining_w // print_h)
            waste_right_rows = int(paper_h // print_w)
            waste_right_ups = waste_right_cols * waste_right_rows
            waste_right_orientation = "세로(90°)"
    else:
        # 오른쪽에 가로 방향으로 배치 시도
        if remaining_w >= print_w:
            waste_right_cols = int(remaining_w // print_w)
            waste_right_rows = int(paper_h // print_h)
            waste_right_ups = waste_right_cols * waste_right_rows
            waste_right_orientation = "가로(90°)"
    
    # 아래쪽 자투리 (회전 배치)
    waste_bottom_cols = 0
    waste_bottom_rows = 0
    waste_bottom_ups = 0
    waste_bottom_orientation = ""
    
    if main_orientation == "가로":
        # 아래쪽에 세로 방향으로 배치 시도
        if remaining_h >= print_w:
            waste_bottom_cols = int(paper_w // print_h)
            waste_bottom_rows = int(remaining_h // print_w)
            waste_bottom_ups = waste_bottom_cols * waste_bottom_rows
            waste_bottom_orientation = "세로(90°)"
    else:
        # 아래쪽에 가로 방향으로 배치 시도
        if remaining_h >= print_h:
            waste_bottom_cols = int(paper_w // print_w)
            waste_bottom_rows = int(remaining_h // print_h)
            waste_bottom_ups = waste_bottom_cols * waste_bottom_rows
            waste_bottom_orientation = "가로(90°)"
    
    total_ups = main_ups + waste_right_ups + waste_bottom_ups
    total_area = paper_w * paper_h
    used_area = total_ups * print_w * print_h
    efficiency = (used_area / total_area) * 100
    
    return WasteLayout(
        format_name=paper_format,
        paper_w=paper_w,
        paper_h=paper_h,
        print_w=print_w,
        print_h=print_h,
        main_cols=main_cols,
        main_rows=main_rows,
        main_ups=main_ups,
        main_orientation=main_orientation,
        waste_right_cols=waste_right_cols,
        waste_right_rows=waste_right_rows,
        waste_right_ups=waste_right_ups,
        waste_right_orientation=waste_right_orientation,
        waste_bottom_cols=waste_bottom_cols,
        waste_bottom_rows=waste_bottom_rows,
        waste_bottom_ups=waste_bottom_ups,
        waste_bottom_orientation=waste_bottom_orientation,
        total_ups=total_ups,
        efficiency=efficiency,
        remaining_w=remaining_w,
        remaining_h=remaining_h
    )


def draw_layout_diagram(layout: WasteLayout) -> str:
    """ASCII 다이어그램 생성"""
    
    # 스케일 (1 문자 = 약 50mm)
    scale = 50
    diagram_w = int(layout.paper_w / scale) + 2
    diagram_h = int(layout.paper_h / scale) + 2
    
    # 빈 캔버스
    canvas = [[' ' for _ in range(diagram_w)] for _ in range(diagram_h)]
    
    # 외곽선
    for x in range(diagram_w):
        canvas[0][x] = '─'
        canvas[diagram_h-1][x] = '─'
    for y in range(diagram_h):
        canvas[y][0] = '│'
        canvas[y][diagram_w-1] = '│'
    canvas[0][0] = '┌'
    canvas[0][diagram_w-1] = '┐'
    canvas[diagram_h-1][0] = '└'
    canvas[diagram_h-1][diagram_w-1] = '┘'
    
    # 정규 배열 영역
    main_w = int((layout.main_cols * layout.print_w) / scale)
    main_h = int((layout.main_rows * layout.print_h) / scale) if layout.main_orientation == "가로" else int((layout.main_rows * layout.print_w) / scale)
    
    for y in range(1, min(main_h + 1, diagram_h - 1)):
        for x in range(1, min(main_w + 1, diagram_w - 1)):
            canvas[y][x] = '▓'
    
    # 오른쪽 자투리
    if layout.waste_right_ups > 0:
        for y in range(1, diagram_h - 1):
            for x in range(main_w + 1, min(main_w + int(layout.waste_right_cols * layout.print_h / scale) + 1, diagram_w - 1)):
                canvas[y][x] = '░'
    
    # 아래쪽 자투리
    if layout.waste_bottom_ups > 0:
        for y in range(main_h + 1, min(main_h + int(layout.waste_bottom_rows * layout.print_w / scale) + 1, diagram_h - 1)):
            for x in range(1, diagram_w - 1):
                if canvas[y][x] == ' ':
                    canvas[y][x] = '░'
    
    return '\n'.join([''.join(row) for row in canvas])


def generate_waste_table(finished_w: float, finished_h: float, bleed: float = 3):
    """자투리 배치 종합표 생성"""
    
    print(f"\n{'='*90}")
    print(f"📊 자투리 추가배치 배열표")
    print(f"   완성물: {finished_w}×{finished_h}mm | 인쇄: {finished_w + bleed*2}×{finished_h + bleed*2}mm (도련 {bleed}mm)")
    print('='*90)
    
    results = []
    for fmt in PAPER_FORMATS:
        layout = analyze_waste_layout(finished_w, finished_h, fmt, bleed)
        results.append(layout)
    
    # 효율순 정렬
    results.sort(key=lambda x: x.total_ups, reverse=True)
    
    # 헤더
    print(f"\n{'용지':<8} {'크기':<14} │ {'정규배열':<12} {'정규UP':>6} │ {'우측자투리':<10} {'하단자투리':<10} │ {'합계':>6} {'효율':>7}")
    print('─'*90)
    
    for r in results:
        main_str = f"{r.main_cols}×{r.main_rows} ({r.main_orientation})"
        
        right_str = "-"
        if r.waste_right_ups > 0:
            right_str = f"+{r.waste_right_ups} ({r.waste_right_cols}×{r.waste_right_rows})"
        
        bottom_str = "-"
        if r.waste_bottom_ups > 0:
            bottom_str = f"+{r.waste_bottom_ups} ({r.waste_bottom_cols}×{r.waste_bottom_rows})"
        
        # 효율 아이콘
        eff_icon = "🟢" if r.efficiency >= 80 else "🟡" if r.efficiency >= 60 else "🔴"
        
        # 자투리 있으면 하이라이트
        total_str = f"{r.total_ups}UP"
        if r.waste_right_ups > 0 or r.waste_bottom_ups > 0:
            total_str = f"★{r.total_ups}UP"
        
        print(f"{r.format_name:<8} {int(r.paper_w)}×{int(r.paper_h):<7} │ {main_str:<12} {r.main_ups:>4}UP │ {right_str:<10} {bottom_str:<10} │ {total_str:>6} {eff_icon}{r.efficiency:>5.1f}%")
    
    print('─'*90)
    print("  ▓ = 정규 배열 | ░ = 자투리 추가배치 | ★ = 자투리 활용")
    
    # 상세 다이어그램 출력
    print(f"\n{'='*90}")
    print("📐 배치 다이어그램 (자투리 활용 용지)")
    print('='*90)
    
    for r in results:
        if r.waste_right_ups > 0 or r.waste_bottom_ups > 0:
            print(f"\n┌─ {r.format_name} ({int(r.paper_w)}×{int(r.paper_h)}mm) ─────────────────────────────────────────┐")
            print(f"│")
            print(f"│  정규: {r.main_cols}×{r.main_rows} = {r.main_ups}UP ({r.main_orientation})")
            if r.waste_right_ups > 0:
                print(f"│  우측자투리: {r.waste_right_cols}×{r.waste_right_rows} = +{r.waste_right_ups}UP ({r.waste_right_orientation})")
            if r.waste_bottom_ups > 0:
                print(f"│  하단자투리: {r.waste_bottom_cols}×{r.waste_bottom_rows} = +{r.waste_bottom_ups}UP ({r.waste_bottom_orientation})")
            print(f"│  합계: {r.total_ups}UP (효율 {r.efficiency:.1f}%)")
            print(f"│")
            
            # 시각적 배열도
            print(f"│  ┌{'─'*40}┐")
            
            # 정규 배열 표시
            for row in range(min(r.main_rows, 5)):
                row_str = "│  │ "
                for col in range(min(r.main_cols, 8)):
                    idx = row * r.main_cols + col + 1
                    row_str += f"[{idx:2d}] "
                
                # 우측 자투리
                if r.waste_right_ups > 0 and row < r.waste_right_rows:
                    row_str += "│ "
                    for col in range(min(r.waste_right_cols, 3)):
                        idx = r.main_ups + row * r.waste_right_cols + col + 1
                        row_str += f"〈{idx:2d}〉"
                
                print(row_str)
            
            if r.main_rows > 5:
                print(f"│  │ ... (총 {r.main_rows}행)")
            
            # 하단 자투리
            if r.waste_bottom_ups > 0:
                print(f"│  ├{'─'*40}┤")
                for row in range(min(r.waste_bottom_rows, 2)):
                    row_str = "│  │ "
                    for col in range(min(r.waste_bottom_cols, 8)):
                        idx = r.main_ups + r.waste_right_ups + row * r.waste_bottom_cols + col + 1
                        row_str += f"〈{idx:2d}〉"
                    print(row_str)
            
            print(f"│  └{'─'*40}┘")
            print(f"│")
            print(f"│  [nn] = 정규배열 | 〈nn〉= 자투리 추가배치 (90° 회전)")
            print(f"└{'─'*60}┘")
    
    return results


def main():
    # 테스트 케이스
    test_cases = [
        {"name": "A5", "w": 148, "h": 210},
        {"name": "A4", "w": 210, "h": 297},
        {"name": "B5변형", "w": 176, "h": 248},
        {"name": "신국판", "w": 152, "h": 225},
    ]
    
    for tc in test_cases:
        print(f"\n{'#'*90}")
        print(f"# 테스트: {tc['name']} ({tc['w']}×{tc['h']}mm)")
        print('#'*90)
        generate_waste_table(tc['w'], tc['h'])


if __name__ == "__main__":
    main()
