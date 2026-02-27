#!/usr/bin/env python3
"""
마이컴프린팅 통합 견적 계산기 v3
단가 기준일: 2024-12-03
버전: v3.0 (2024-12-04)

v3 신규 기능:
- 표지 오시 줄 수 자동 계산
- 책등 두께 자동 계산
- 접지별 페이지 배열 매트릭스
- 완성물 크기 고정 검증
- 크립(Creep) 보정 계산

사용법:
  # 기존 기능
  python estimate_v3.py print --format 국전 --r 5 --colors 4
  python estimate_v3.py coating --format 국전 --r 2 --type 유광
  python estimate_v3.py binding --type 중철 --qty 1000 --pages 32
  
  # v3 신규 기능
  python estimate_v3.py cover --width 148 --height 210 --pages 200 --binding 무선 --wing
  python estimate_v3.py layout --type cross_16
  python estimate_v3.py imposition --width 148 --height 210 --compare-all
  python estimate_v3.py creep --pages 48 --paper-weight 80
"""

import argparse
import math
import json
import sys
from dataclasses import dataclass, asdict
from typing import Dict, List, Tuple, Optional
from enum import Enum

# ============================================================
# 상수 및 데이터
# ============================================================

# 용지 두께 테이블 (평량g → 두께mm)
PAPER_THICKNESS: Dict[int, float] = {
    60: 0.08, 70: 0.09, 80: 0.10, 100: 0.11, 120: 0.12,
    150: 0.14, 180: 0.16, 200: 0.18, 250: 0.22, 300: 0.26, 350: 0.30
}

# 용지 규격 (mm)
PAPER_FORMATS: Dict[str, Tuple[float, float]] = {
    "국전": (636, 939),
    "46전": (788, 1091),
    "46전횡": (1091, 788),
    "46반": (545, 788),
    "국반": (468, 636),
    "A1": (594, 841),
    "A2": (420, 594),
}

# 인쇄 구간단가
PRINT_PRICES = {
    "국전": [
        (1, 7000), (2, 6000), (5, 5000), (10, 4000), (15, 3500),
        (25, 3000), (40, 2500), (50, 2000), (99999, 1800)
    ],
    "2절": [
        (1, 7000), (2, 6000), (5, 5500), (10, 5000), (15, 4500),
        (25, 4000), (40, 4000), (50, 3500), (99999, 3000)
    ]
}

# 코팅 구간단가
COATING_PRICES = {
    "무광": {
        "4x6": [(0.4, 45000), (1, 55000), (999999, 60000)],
        "국전": [(0.4, 40000), (1, 50000), (999999, 55000)]
    },
    "유광": {
        "4x6": [(0.4, 45000), (1, 50000), (999999, 55000)],
        "국전": [(0.4, 40000), (1, 45000), (999999, 50000)]
    }
}

# 오시 단가
OSI_PRICES = {
    "국전": {
        "1,2줄": [(0.5, 40000), (1, 44000), (3, 44000), (999, 42000)],
        "3줄": [(0.5, 40000), (1, 44000), (3, 44000), (999, 42000)],
        "4줄": [(0.5, 40000), (1, 44000), (3, 44000), (999, 42000)],
        "5,6줄": [(0.5, 60000), (1, 65000), (3, 65000), (999, 63000)]
    },
    "2절이하": {
        "1,2줄": [(0.5, 28000), (1, 32000), (3, 32000), (999, 30000)],
        "3줄": [(0.5, 36000), (1, 40000), (3, 40000), (999, 38000)],
        "4줄": [(0.5, 36000), (1, 40000), (3, 40000), (999, 38000)],
        "5,6줄": [(0.5, 50000), (1, 55000), (3, 55000), (999, 53000)]
    }
}

# 무선제본 단가
WIRELESS_PRICES = [
    (1000, 0.9, 0.95),
    (4000, 0.85, 0.9),
    (10000, 0.8, 0.85),
    (999999, 0.75, 0.8)
]

# 접지별 페이지 배열 매트릭스
PAGE_LAYOUTS: Dict[str, Dict] = {
    "cross_16": {
        "name": "십자접지 16P",
        "name_en": "Cross-fold 16P",
        "pages": 16,
        "front": [[4, 13, 16, 1], [5, 12, 9, 8]],
        "back": [[6, 11, 14, 3], [7, 10, 15, 2]],
        "rule": "마주보는 페이지 합 = 17 (총페이지+1)",
        "folds": ["가로접기 (Head to Foot)", "세로접기 (Right to Left)", "세로접기 (Spine)"],
        "rotated_pages": [4, 5, 13, 12, 6, 7, 11, 10]  # 180° 회전 페이지
    },
    "cross_8": {
        "name": "직각접지 8P",
        "name_en": "Right-angle 8P",
        "pages": 8,
        "front": [[4, 5], [8, 1]],
        "back": [[6, 3], [2, 7]],
        "rule": "마주보는 페이지 합 = 9",
        "folds": ["가로접기", "세로접기"],
        "rotated_pages": [4, 6]
    },
    "parallel_8": {
        "name": "평행접지 8P",
        "name_en": "Parallel 8P",
        "pages": 8,
        "front": [[8, 1, 4, 5]],
        "back": [[2, 7, 6, 3]],
        "rule": "같은 방향 2회 접지",
        "folds": ["세로접기", "세로접기 (같은 방향)"],
        "rotated_pages": []
    },
    "accordion_4": {
        "name": "병풍접지 4단",
        "name_en": "Accordion 4-panel",
        "pages": 8,
        "front": [[1, 2, 3, 4]],
        "back": [[8, 7, 6, 5]],
        "rule": "모든 패널 같은 크기, 지그재그 접기",
        "folds": ["지그재그 1", "지그재그 2", "지그재그 3"],
        "rotated_pages": []
    },
    "roll_4": {
        "name": "롤접지 4단",
        "name_en": "Roll-fold 4-panel",
        "pages": 8,
        "front": [["1", "2", "3", "4"]],
        "back": [["8", "7", "6", "5"]],
        "rule": "⚠️ 안쪽 패널이 점차 작아짐 (2-3mm씩)",
        "folds": ["안으로 말기 1", "안으로 말기 2", "안으로 말기 3"],
        "panel_widths": ["100%", "97%", "94%", "91%"],  # 상대 크기
        "rotated_pages": []
    },
    "gate": {
        "name": "대문접지",
        "name_en": "Gate-fold",
        "pages": 6,
        "front": [["표지(1/4)", "내용(2/4)", "표지(1/4)"]],
        "back": [["뒷면", "뒷면", "뒷면"]],
        "rule": "중앙 패널 = 양쪽 패널 × 2",
        "folds": ["양쪽을 중앙으로"],
        "rotated_pages": []
    },
    "tri_fold": {
        "name": "3단접지",
        "name_en": "Tri-fold",
        "pages": 6,
        "front": [[6, 1, 2]],
        "back": [[5, 4, 3]],
        "rule": "안쪽 패널 2-3mm 작게",
        "folds": ["오른쪽 안으로", "왼쪽 위로"],
        "panel_widths": ["100%", "100%", "97%"],
        "rotated_pages": []
    },
    "z_fold": {
        "name": "Z접지",
        "name_en": "Z-fold",
        "pages": 6,
        "front": [[1, 2, 3]],
        "back": [[6, 5, 4]],
        "rule": "지그재그로 접기 (모든 패널 같은 크기)",
        "folds": ["지그재그 접기"],
        "rotated_pages": []
    },
    "half": {
        "name": "반접지",
        "name_en": "Half-fold",
        "pages": 4,
        "front": [[4, 1]],
        "back": [[2, 3]],
        "rule": "단순 반으로 접기",
        "folds": ["반접기"],
        "rotated_pages": []
    }
}

# ============================================================
# 데이터 클래스
# ============================================================

@dataclass
class CoverSpec:
    """표지 사양"""
    finished_width: float
    finished_height: float
    pages: int
    paper_weight: int
    cover_weight: int
    binding: str
    has_wing: bool
    wing_width: float
    bleed: float
    spine_thickness: float
    spread_width: float
    spread_height: float
    score_lines: int
    score_detail: str
    hinge_distance: float

@dataclass 
class ImpositionResult:
    """조판 결과"""
    format_name: str
    paper_size: str
    ups: int
    layout: str
    orientation: str
    efficiency: float
    waste_percent: float
    finished_size: str

@dataclass
class CreepResult:
    """크립 보정 결과"""
    total_pages: int
    paper_weight: int
    paper_thickness: float
    needs_correction: bool
    total_creep: float
    adjustments: List[Dict]

# ============================================================
# v3 신규 기능: 표지 오시 계산
# ============================================================

def calc_spine_thickness(pages: int, paper_weight: int) -> float:
    """
    책등 두께 계산
    
    Args:
        pages: 내지 페이지 수 (표지 제외)
        paper_weight: 내지 평량 (g/m²)
    
    Returns:
        책등 두께 (mm)
    """
    sheets = pages / 2
    thickness = PAPER_THICKNESS.get(paper_weight, 0.10)
    return round(sheets * thickness, 1)


def calc_score_lines(binding: str, has_wing: bool) -> Tuple[int, str]:
    """
    오시 줄 수 계산
    
    Args:
        binding: 제본 방식 (무선, 중철, 양장)
        has_wing: 날개 유무
    
    Returns:
        (줄 수, 상세 설명)
    """
    binding = binding.lower()
    
    if binding in ["중철", "saddle", "중철제본"]:
        return (0, "중철제본은 오시 없음 (접지만)")
    
    if binding in ["무선", "perfect", "무선제본"]:
        if has_wing:
            return (6, "책등 2줄 + 힌지 2줄 + 날개 2줄")
        return (4, "책등 2줄 + 힌지 2줄")
    
    if binding in ["양장", "hardcover", "양장제본"]:
        return (4, "책등 2줄 + 힌지 2줄")
    
    if binding in ["스프링", "spiral"]:
        return (0, "스프링제본은 오시 없음")
    
    return (0, "알 수 없는 제본 방식")


def calc_hinge_distance(cover_weight: int) -> float:
    """
    힌지 오시 간격 계산
    
    Args:
        cover_weight: 표지 평량 (g/m²)
    
    Returns:
        힌지 간격 (mm)
    """
    if cover_weight <= 250:
        return 6.0
    elif cover_weight <= 300:
        return 8.0
    else:
        return 10.0


def calc_cover_spread(finished_width: float, finished_height: float, 
                      spine: float, bleed: float, 
                      has_wing: bool, wing_width: float) -> Tuple[float, float]:
    """
    표지 펼침 크기 계산
    
    Returns:
        (펼침 너비, 펼침 높이) mm
    """
    width = (finished_width * 2) + spine + (bleed * 2)
    if has_wing:
        width += (wing_width * 2)
    
    height = finished_height + (bleed * 2)
    
    return (round(width, 1), round(height, 1))


def get_cover_spec(finished_width: float, finished_height: float,
                   pages: int, paper_weight: int = 80, cover_weight: int = 250,
                   binding: str = "무선", has_wing: bool = False, 
                   wing_width: float = 80, bleed: float = 3) -> CoverSpec:
    """
    표지 사양 전체 계산
    """
    spine = calc_spine_thickness(pages, paper_weight)
    score_lines, score_detail = calc_score_lines(binding, has_wing)
    spread_w, spread_h = calc_cover_spread(finished_width, finished_height, 
                                           spine, bleed, has_wing, wing_width)
    hinge = calc_hinge_distance(cover_weight)
    
    return CoverSpec(
        finished_width=finished_width,
        finished_height=finished_height,
        pages=pages,
        paper_weight=paper_weight,
        cover_weight=cover_weight,
        binding=binding,
        has_wing=has_wing,
        wing_width=wing_width if has_wing else 0,
        bleed=bleed,
        spine_thickness=spine,
        spread_width=spread_w,
        spread_height=spread_h,
        score_lines=score_lines,
        score_detail=score_detail,
        hinge_distance=hinge
    )

# ============================================================
# v3 신규 기능: 접지별 페이지 배열
# ============================================================

def get_page_layout(fold_type: str) -> Optional[Dict]:
    """접지 타입별 페이지 배열 반환"""
    return PAGE_LAYOUTS.get(fold_type)


def list_page_layouts() -> List[Dict]:
    """모든 접지 배열 목록"""
    result = []
    for key, layout in PAGE_LAYOUTS.items():
        result.append({
            "type": key,
            "name": layout["name"],
            "name_en": layout["name_en"],
            "pages": layout["pages"]
        })
    return result


def generate_signature_layouts(total_pages: int, pages_per_sig: int = 16,
                               fold_type: str = "cross_16") -> List[Dict]:
    """
    대수별 페이지 배열 생성
    """
    base = PAGE_LAYOUTS.get(fold_type)
    if not base:
        return []
    
    signatures = []
    num_sigs = math.ceil(total_pages / pages_per_sig)
    
    for sig_idx in range(num_sigs):
        offset = sig_idx * pages_per_sig
        
        front = []
        for row in base["front"]:
            new_row = []
            for page in row:
                if isinstance(page, int):
                    new_page = page + offset
                    new_row.append(new_page if new_page <= total_pages else None)
                else:
                    new_row.append(page)
            front.append(new_row)
        
        back = []
        for row in base["back"]:
            new_row = []
            for page in row:
                if isinstance(page, int):
                    new_page = page + offset
                    new_row.append(new_page if new_page <= total_pages else None)
                else:
                    new_row.append(page)
            back.append(new_row)
        
        signatures.append({
            "signature": sig_idx + 1,
            "page_range": f"{offset + 1}~{min(offset + pages_per_sig, total_pages)}",
            "front": front,
            "back": back
        })
    
    return signatures

# ============================================================
# v3 신규 기능: 완성물 크기 검증 및 조판 계산
# ============================================================

def validate_finished_size_change(original_w: float, original_h: float,
                                   new_w: float, new_h: float) -> Dict:
    """완성물 크기 변경 검증"""
    w_changed = abs(new_w - original_w) > 0.1
    h_changed = abs(new_h - original_h) > 0.1
    
    if not w_changed and not h_changed:
        return {"valid": True, "message": "변경 없음", "requires_approval": False}
    
    return {
        "valid": False,
        "message": "⚠️ 완성물 크기 변경 감지",
        "requires_approval": True,
        "original": f"{original_w}×{original_h}mm",
        "requested": f"{new_w}×{new_h}mm",
        "warning": "완성물 크기 변경은 고객 승인이 필요합니다"
    }


def calc_imposition(finished_w: float, finished_h: float, 
                    paper_format: str = None, bleed: float = 3,
                    include_waste: bool = True) -> List[ImpositionResult]:
    """
    조판 계산 (완성물 크기 고정 기준)
    
    Args:
        finished_w: 완성물 너비 (mm)
        finished_h: 완성물 높이 (mm)
        paper_format: 특정 용지 규격 (None이면 전체 비교)
        bleed: 도련 (mm)
        include_waste: 자투리 영역 추가 배치 포함 여부
    """
    print_w = finished_w + (bleed * 2)
    print_h = finished_h + (bleed * 2)
    
    formats_to_check = {paper_format: PAPER_FORMATS[paper_format]} if paper_format else PAPER_FORMATS
    
    results = []
    for name, (paper_w, paper_h) in formats_to_check.items():
        # 가로 배치 (정규 배열)
        cols_h = int(paper_w // print_w)
        rows_h = int(paper_h // print_h)
        
        # 세로 배치 (90° 회전)
        cols_v = int(paper_w // print_h)
        rows_v = int(paper_h // print_w)
        
        # 자투리 영역에 추가 배치 계산
        waste_ups_h = 0
        waste_ups_v = 0
        
        if include_waste:
            # 가로 배치 후 남는 공간
            remaining_w_h = paper_w - (cols_h * print_w)
            remaining_h_h = paper_h - (rows_h * print_h)
            
            # 자투리에 회전 배치 가능한지 확인
            if remaining_w_h >= print_h:  # 오른쪽 자투리에 회전 배치
                waste_cols = int(remaining_w_h // print_h)
                waste_rows = int(paper_h // print_w)
                waste_ups_h = waste_cols * waste_rows
            if remaining_h_h >= print_w:  # 아래 자투리에 회전 배치
                waste_cols = int(paper_w // print_h)
                waste_rows = int(remaining_h_h // print_w)
                waste_ups_h += waste_cols * waste_rows
            
            # 세로 배치 후 남는 공간
            remaining_w_v = paper_w - (cols_v * print_h)
            remaining_h_v = paper_h - (rows_v * print_w)
            
            if remaining_w_v >= print_w:  # 오른쪽 자투리
                waste_cols = int(remaining_w_v // print_w)
                waste_rows = int(paper_h // print_h)
                waste_ups_v = waste_cols * waste_rows
            if remaining_h_v >= print_h:  # 아래 자투리
                waste_cols = int(paper_w // print_w)
                waste_rows = int(remaining_h_v // print_h)
                waste_ups_v += waste_cols * waste_rows
        
        ups_h = cols_h * rows_h + waste_ups_h
        ups_v = cols_v * rows_v + waste_ups_v
        
        if ups_v > ups_h:
            ups = ups_v
            base_ups = cols_v * rows_v
            waste_ups = waste_ups_v
            cols, rows = cols_v, rows_v
            orientation = "세로"
        else:
            ups = ups_h
            base_ups = cols_h * rows_h
            waste_ups = waste_ups_h
            cols, rows = cols_h, rows_h
            orientation = "가로"
        
        if ups == 0:
            continue
            
        used_area = ups * print_w * print_h
        total_area = paper_w * paper_h
        efficiency = round((used_area / total_area) * 100, 1)
        waste = round(100 - efficiency, 1)
        
        # 자투리 정보 포함
        layout_str = f"{cols}×{rows}"
        if waste_ups > 0:
            layout_str += f"+{waste_ups}"
        
        results.append(ImpositionResult(
            format_name=name,
            paper_size=f"{paper_w}×{paper_h}mm",
            ups=ups,
            layout=layout_str,
            orientation=orientation,
            efficiency=efficiency,
            waste_percent=waste,
            finished_size=f"{finished_w}×{finished_h}mm (고정)"
        ))
    
    results.sort(key=lambda x: x.efficiency, reverse=True)
    return results

# ============================================================
# v3 신규 기능: 크립(Creep) 보정
# ============================================================

def calc_creep(total_pages: int, paper_weight: int = 80, 
               binding: str = "중철") -> CreepResult:
    """
    크립 보정 계산
    """
    thickness = PAPER_THICKNESS.get(paper_weight, 0.10)
    needs_correction = binding in ["중철", "saddle"] and total_pages >= 40
    
    if not needs_correction:
        return CreepResult(
            total_pages=total_pages,
            paper_weight=paper_weight,
            paper_thickness=thickness,
            needs_correction=False,
            total_creep=0,
            adjustments=[]
        )
    
    spreads = total_pages // 4 - 1
    total_creep = round(spreads * thickness, 2)
    
    adjustments = []
    num_spreads = total_pages // 4
    creep_per_spread = total_creep / (num_spreads - 1) if num_spreads > 1 else 0
    
    for i in range(num_spreads):
        adj = round(i * creep_per_spread, 3)
        outer_left = i * 2 + 1
        outer_right = total_pages - i * 2
        
        adjustments.append({
            "spread": i + 1,
            "pages": [outer_left, outer_left + 1, outer_right - 1, outer_right],
            "adjustment_mm": adj,
            "direction": "안쪽으로 이동"
        })
    
    return CreepResult(
        total_pages=total_pages,
        paper_weight=paper_weight,
        paper_thickness=thickness,
        needs_correction=True,
        total_creep=total_creep,
        adjustments=adjustments
    )

# ============================================================
# 기존 기능: 인쇄/코팅/제본 단가 계산
# ============================================================

def get_price_by_range(ranges: list, value: float) -> int:
    """구간별 단가 조회"""
    for limit, price in ranges:
        if value <= limit:
            return price
    return ranges[-1][1]


def calc_print(format_type: str, r: float, colors: int = 4) -> int:
    """인쇄비 계산"""
    prices = PRINT_PRICES.get(format_type, PRINT_PRICES["국전"])
    unit_price = get_price_by_range(prices, r)
    total = r * colors * unit_price
    return math.ceil(total / 1000) * 1000


def calc_coating(format_type: str, r: float, coating_type: str = "무광", 
                 both_sides: bool = False) -> int:
    """코팅비 계산"""
    fmt = "국전" if "국" in format_type else "4x6"
    prices = COATING_PRICES.get(coating_type, COATING_PRICES["무광"])
    unit_price = get_price_by_range(prices[fmt], r)
    total = r * unit_price
    if both_sides:
        total *= 2
    return math.ceil(total / 5000) * 5000


def calc_osi(format_type: str, r: float, lines: int = 4) -> int:
    """오시비 계산"""
    fmt = "국전" if "국전" in format_type else "2절이하"
    
    if lines <= 2:
        key = "1,2줄"
    elif lines == 3:
        key = "3줄"
    elif lines == 4:
        key = "4줄"
    else:
        key = "5,6줄"
    
    prices = OSI_PRICES[fmt][key]
    unit_price = get_price_by_range(prices, r)
    total = r * unit_price
    return math.ceil(total / 5000) * 5000


def calc_wireless_binding(qty: int, pages: int, 
                          special_binding: bool = False,
                          special_size: bool = False) -> int:
    """무선제본비 계산"""
    for limit, price_16p, price_8p in WIRELESS_PRICES:
        if qty <= limit:
            unit_price = price_16p
            break
    
    total = qty * pages * unit_price
    
    multiplier = 1.0
    if special_binding:  # 가로좌철/세로상철
        multiplier *= 1.3
    if special_size:  # A5미만/A4초과
        multiplier *= 1.3
    
    total *= multiplier
    return math.ceil(total / 5000) * 5000

# ============================================================
# 올림 유틸리티
# ============================================================

def round_up(value: float, unit: int = 5000) -> int:
    """단위 올림"""
    return math.ceil(value / unit) * unit

# ============================================================
# CLI 핸들러
# ============================================================

def handle_cover(args):
    """표지 오시 계산 핸들러"""
    spec = get_cover_spec(
        finished_width=args.width,
        finished_height=args.height,
        pages=args.pages,
        paper_weight=args.paper_weight,
        cover_weight=args.cover_weight,
        binding=args.binding,
        has_wing=args.wing,
        wing_width=args.wing_width,
        bleed=args.bleed
    )
    
    if args.json:
        print(json.dumps(asdict(spec), ensure_ascii=False, indent=2))
    else:
        print("\n" + "=" * 50)
        print("📐 표지 오시 계산 결과")
        print("=" * 50)
        print(f"  완성물 크기: {spec.finished_width} × {spec.finished_height} mm")
        print(f"  내지 페이지: {spec.pages}P")
        print(f"  내지 평량: {spec.paper_weight}g")
        print(f"  표지 평량: {spec.cover_weight}g")
        print(f"  제본 방식: {spec.binding}")
        print(f"  날개: {'있음 (' + str(spec.wing_width) + 'mm)' if spec.has_wing else '없음'}")
        print("-" * 50)
        print(f"  📏 책등 두께: {spec.spine_thickness} mm")
        print(f"  📐 표지 펼침: {spec.spread_width} × {spec.spread_height} mm")
        print(f"  ✂️  오시 줄 수: {spec.score_lines}줄")
        print(f"     ({spec.score_detail})")
        print(f"  📍 힌지 간격: {spec.hinge_distance} mm")
        print("=" * 50)


def handle_layout(args):
    """접지 배열 핸들러"""
    if args.list:
        layouts = list_page_layouts()
        if args.json:
            print(json.dumps(layouts, ensure_ascii=False, indent=2))
        else:
            print("\n📚 접지 배열 목록:")
            print("-" * 40)
            for l in layouts:
                print(f"  {l['type']:12} | {l['name']:12} | {l['pages']}P")
        return
    
    layout = get_page_layout(args.type)
    if not layout:
        print(f"❌ 알 수 없는 접지 타입: {args.type}")
        print(f"   사용 가능: {', '.join(PAGE_LAYOUTS.keys())}")
        return
    
    if args.json:
        print(json.dumps(layout, ensure_ascii=False, indent=2))
    else:
        print("\n" + "=" * 50)
        print(f"📚 {layout['name']} ({layout['name_en']})")
        print("=" * 50)
        print(f"  페이지 수: {layout['pages']}P")
        print(f"  규칙: {layout['rule']}")
        print("\n  📄 앞면 (Front):")
        for row in layout['front']:
            print(f"     {row}")
        print("\n  📄 뒷면 (Back):")
        for row in layout['back']:
            print(f"     {row}")
        print(f"\n  접지 순서: {' → '.join(layout['folds'])}")
        if layout.get('rotated_pages'):
            print(f"  180° 회전 페이지: {layout['rotated_pages']}")
        print("=" * 50)


def handle_imposition(args):
    """조판 계산 핸들러"""
    fmt = args.format if hasattr(args, 'format') and args.format else None
    results = calc_imposition(args.width, args.height, fmt, args.bleed)
    
    if args.json:
        print(json.dumps([asdict(r) for r in results], ensure_ascii=False, indent=2))
    else:
        print("\n" + "=" * 60)
        print(f"📊 조판 계산 결과 (완성물 {args.width}×{args.height}mm 고정)")
        print("=" * 60)
        print(f"  {'규격':<10} {'용지크기':<16} {'UP수':>6} {'배열':>8} {'효율':>8}")
        print("-" * 60)
        for r in results:
            eff_color = "🟢" if r.efficiency >= 80 else "🟡" if r.efficiency >= 60 else "🔴"
            print(f"  {r.format_name:<10} {r.paper_size:<16} {r.ups:>4}UP {r.layout:>8} {eff_color} {r.efficiency:>5.1f}%")
        print("=" * 60)
        if results:
            best = results[0]
            print(f"  ✅ 추천: {best.format_name} ({best.ups}UP, 효율 {best.efficiency}%)")


def handle_creep(args):
    """크립 보정 핸들러"""
    result = calc_creep(args.pages, args.paper_weight, args.binding)
    
    if args.json:
        print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
    else:
        print("\n" + "=" * 50)
        print("📏 크립(Creep) 보정 계산")
        print("=" * 50)
        print(f"  페이지 수: {result.total_pages}P")
        print(f"  용지 평량: {result.paper_weight}g (두께 {result.paper_thickness}mm)")
        print(f"  보정 필요: {'예' if result.needs_correction else '아니오'}")
        
        if result.needs_correction:
            print(f"  총 크립량: {result.total_creep}mm")
            print("\n  📐 스프레드별 보정값:")
            for adj in result.adjustments[:5]:  # 처음 5개만 표시
                print(f"     스프레드 {adj['spread']}: 페이지 {adj['pages']} → {adj['adjustment_mm']}mm {adj['direction']}")
            if len(result.adjustments) > 5:
                print(f"     ... 외 {len(result.adjustments) - 5}개")
        else:
            print("  💡 40P 미만 또는 무선제본은 크립 보정 불필요")
        print("=" * 50)


def handle_print(args):
    """인쇄비 계산 핸들러"""
    total = calc_print(args.format, args.r, args.colors)
    if args.json:
        print(json.dumps({"print_cost": total}))
    else:
        print(f"✅ 인쇄비: {total:,}원")
        print(f"   조건: {args.format} | {args.r}R | {args.colors}도")


def handle_coating(args):
    """코팅비 계산 핸들러"""
    total = calc_coating(args.format, args.r, args.type, args.both_sides)
    if args.json:
        print(json.dumps({"coating_cost": total}))
    else:
        sides = "양면" if args.both_sides else "단면"
        print(f"✅ 코팅비: {total:,}원")
        print(f"   조건: {args.format} | {args.r}R | {args.type} | {sides}")


def handle_osi(args):
    """오시비 계산 핸들러"""
    total = calc_osi(args.format, args.r, args.lines)
    if args.json:
        print(json.dumps({"osi_cost": total}))
    else:
        print(f"✅ 오시비: {total:,}원")
        print(f"   조건: {args.format} | {args.r}R | {args.lines}줄")


def handle_binding(args):
    """제본비 계산 핸들러"""
    if args.type == "무선":
        total = calc_wireless_binding(
            args.qty, args.pages, 
            args.special_binding, args.special_size
        )
        if args.json:
            print(json.dumps({"binding_cost": total}))
        else:
            print(f"✅ 무선제본비: {total:,}원")
            print(f"   조건: {args.qty}부 | {args.pages}P")
    else:
        print("중철제본은 별도 매트릭스 참조")

# ============================================================
# 메인
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="마이컴프린팅 견적 계산기 v3",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    subparsers = parser.add_subparsers(dest="command", help="명령어")
    
    # cover 명령어 (v3 신규)
    cover_parser = subparsers.add_parser("cover", help="표지 오시 계산")
    cover_parser.add_argument("--width", type=float, required=True, help="완성물 너비 (mm)")
    cover_parser.add_argument("--height", type=float, required=True, help="완성물 높이 (mm)")
    cover_parser.add_argument("--pages", type=int, required=True, help="내지 페이지 수")
    cover_parser.add_argument("--paper-weight", type=int, default=80, help="내지 평량 (g)")
    cover_parser.add_argument("--cover-weight", type=int, default=250, help="표지 평량 (g)")
    cover_parser.add_argument("--binding", default="무선", help="제본 방식")
    cover_parser.add_argument("--wing", action="store_true", help="날개 있음")
    cover_parser.add_argument("--wing-width", type=float, default=80, help="날개 너비 (mm)")
    cover_parser.add_argument("--bleed", type=float, default=3, help="도련 (mm)")
    cover_parser.add_argument("--json", action="store_true", help="JSON 출력")
    
    # layout 명령어 (v3 신규)
    layout_parser = subparsers.add_parser("layout", help="접지별 페이지 배열")
    layout_parser.add_argument("--type", default="cross_16", help="접지 타입")
    layout_parser.add_argument("--list", action="store_true", help="목록 표시")
    layout_parser.add_argument("--json", action="store_true", help="JSON 출력")
    
    # imposition 명령어 (v3 신규)
    impo_parser = subparsers.add_parser("imposition", help="조판 계산")
    impo_parser.add_argument("--width", type=float, required=True, help="완성물 너비 (mm)")
    impo_parser.add_argument("--height", type=float, required=True, help="완성물 높이 (mm)")
    impo_parser.add_argument("--format", help="특정 용지 규격")
    impo_parser.add_argument("--bleed", type=float, default=3, help="도련 (mm)")
    impo_parser.add_argument("--json", action="store_true", help="JSON 출력")
    
    # creep 명령어 (v3 신규)
    creep_parser = subparsers.add_parser("creep", help="크립 보정 계산")
    creep_parser.add_argument("--pages", type=int, required=True, help="페이지 수")
    creep_parser.add_argument("--paper-weight", type=int, default=80, help="용지 평량 (g)")
    creep_parser.add_argument("--binding", default="중철", help="제본 방식")
    creep_parser.add_argument("--json", action="store_true", help="JSON 출력")
    
    # 기존 명령어들
    print_parser = subparsers.add_parser("print", help="인쇄비 계산")
    print_parser.add_argument("--format", default="국전", help="용지 규격")
    print_parser.add_argument("--r", type=float, required=True, help="R수량")
    print_parser.add_argument("--colors", type=int, default=4, help="도수")
    print_parser.add_argument("--json", action="store_true")
    
    coating_parser = subparsers.add_parser("coating", help="코팅비 계산")
    coating_parser.add_argument("--format", default="국전", help="용지 규격")
    coating_parser.add_argument("--r", type=float, required=True, help="R수량")
    coating_parser.add_argument("--type", default="무광", help="코팅 종류")
    coating_parser.add_argument("--both-sides", action="store_true", help="양면")
    coating_parser.add_argument("--json", action="store_true")
    
    osi_parser = subparsers.add_parser("osi", help="오시비 계산")
    osi_parser.add_argument("--format", default="국전", help="용지 규격")
    osi_parser.add_argument("--r", type=float, required=True, help="R수량")
    osi_parser.add_argument("--lines", type=int, default=4, help="오시 줄 수")
    osi_parser.add_argument("--json", action="store_true")
    
    binding_parser = subparsers.add_parser("binding", help="제본비 계산")
    binding_parser.add_argument("--type", required=True, help="제본 종류 (무선/중철)")
    binding_parser.add_argument("--qty", type=int, required=True, help="부수")
    binding_parser.add_argument("--pages", type=int, required=True, help="페이지")
    binding_parser.add_argument("--special-binding", action="store_true", help="특수철")
    binding_parser.add_argument("--special-size", action="store_true", help="특수 사이즈")
    binding_parser.add_argument("--json", action="store_true")
    
    args = parser.parse_args()
    
    if args.command == "cover":
        handle_cover(args)
    elif args.command == "layout":
        handle_layout(args)
    elif args.command == "imposition":
        handle_imposition(args)
    elif args.command == "creep":
        handle_creep(args)
    elif args.command == "print":
        handle_print(args)
    elif args.command == "coating":
        handle_coating(args)
    elif args.command == "osi":
        handle_osi(args)
    elif args.command == "binding":
        handle_binding(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
