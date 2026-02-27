"""
Optical Auto Layout Engine - Python Implementation
CSS Flexbox 기반 Auto Layout + 시각 보정(Optical Alignment)
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Any
import math


# =============================================================================
# Enums
# =============================================================================

class FlexDirection(Enum):
    ROW = "row"
    COLUMN = "column"
    ROW_REVERSE = "row-reverse"
    COLUMN_REVERSE = "column-reverse"


class JustifyContent(Enum):
    FLEX_START = "flex-start"
    FLEX_END = "flex-end"
    CENTER = "center"
    SPACE_BETWEEN = "space-between"
    SPACE_AROUND = "space-around"
    SPACE_EVENLY = "space-evenly"


class AlignItems(Enum):
    FLEX_START = "flex-start"
    FLEX_END = "flex-end"
    CENTER = "center"
    STRETCH = "stretch"


class SizeType(Enum):
    FIXED = "fixed"
    AUTO = "auto"
    PERCENT = "percent"
    FILL = "fill"


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class EdgeInsets:
    top: float = 0
    right: float = 0
    bottom: float = 0
    left: float = 0


@dataclass
class Dimension:
    type: SizeType = SizeType.AUTO
    value: float = 0


@dataclass
class ComputedLayout:
    x: float = 0
    y: float = 0
    width: float = 0
    height: float = 0


@dataclass
class OpticalCorrection:
    offset_x: float = 0      # 비율 (0.08 = 8%)
    offset_y: float = 0
    size_multiplier: float = 1.0


# =============================================================================
# Shape Corrections Database
# =============================================================================

SHAPE_CORRECTIONS: Dict[str, OpticalCorrection] = {
    'square':         OpticalCorrection(0,     0,     1.00),
    'circle':         OpticalCorrection(0,     0,     1.13),
    'triangle_right': OpticalCorrection(0.08,  0,     1.27),
    'triangle_left':  OpticalCorrection(-0.08, 0,     1.27),
    'triangle_up':    OpticalCorrection(0,    -0.05,  1.27),
    'triangle_down':  OpticalCorrection(0,     0.05,  1.27),
    'diamond':        OpticalCorrection(0,     0,     1.15),
    'star':           OpticalCorrection(0,     0,     1.20),
    'hexagon':        OpticalCorrection(0,     0,     1.08),
    'heart':          OpticalCorrection(0,     0.03,  1.18),
}


# =============================================================================
# Layout Style
# =============================================================================

@dataclass
class LayoutStyle:
    width: Dimension = field(default_factory=lambda: Dimension(SizeType.AUTO))
    height: Dimension = field(default_factory=lambda: Dimension(SizeType.AUTO))
    min_width: Optional[float] = None
    max_width: Optional[float] = None
    min_height: Optional[float] = None
    max_height: Optional[float] = None
    
    flex_direction: FlexDirection = FlexDirection.ROW
    justify_content: JustifyContent = JustifyContent.FLEX_START
    align_items: AlignItems = AlignItems.STRETCH
    flex_wrap: bool = False
    flex_grow: float = 0
    flex_shrink: float = 1
    
    gap: float = 0
    padding: EdgeInsets = field(default_factory=EdgeInsets)


# =============================================================================
# Layout Node
# =============================================================================

@dataclass
class LayoutNode:
    id: str
    style: LayoutStyle = field(default_factory=LayoutStyle)
    children: List['LayoutNode'] = field(default_factory=list)
    layout: ComputedLayout = field(default_factory=ComputedLayout)
    optical_shape: Optional[str] = None


# =============================================================================
# Layout Engine
# =============================================================================

class OpticalLayoutEngine:
    def __init__(self, correction_strength: float = 1.0):
        self.correction_strength = correction_strength
    
    def compute_layout(
        self, 
        node: LayoutNode, 
        available_width: float, 
        available_height: float,
        enable_optical: bool = True
    ) -> None:
        """메인 레이아웃 계산 함수"""
        # 1. 기본 Flexbox 레이아웃 계산
        self._compute_flexbox_layout(node, available_width, available_height)
        
        # 2. Optical Correction 적용
        if enable_optical:
            self._apply_optical_corrections(node)
    
    def _compute_flexbox_layout(
        self, 
        node: LayoutNode, 
        available_width: float, 
        available_height: float
    ) -> None:
        """Flexbox 알고리즘 기반 레이아웃 계산"""
        style = node.style
        padding = style.padding
        
        # 노드 크기 결정
        node_width = self._resolve_dimension(style.width, available_width)
        node_height = self._resolve_dimension(style.height, available_height)
        
        node.layout.width = node_width
        node.layout.height = node_height
        
        if not node.children:
            return
        
        # Content 영역 계산
        content_width = node_width - padding.left - padding.right
        content_height = node_height - padding.top - padding.bottom
        
        is_row = style.flex_direction in [FlexDirection.ROW, FlexDirection.ROW_REVERSE]
        main_size = content_width if is_row else content_height
        cross_size = content_height if is_row else content_width
        
        # 자식 크기 측정
        child_sizes = []
        total_main = 0
        max_cross = 0
        
        for child in node.children:
            child_style = child.style
            child_main = self._resolve_dimension(
                child_style.width if is_row else child_style.height,
                main_size
            )
            child_cross = self._resolve_dimension(
                child_style.height if is_row else child_style.width,
                cross_size
            )
            
            child_sizes.append((child_main, child_cross))
            total_main += child_main
            max_cross = max(max_cross, child_cross)
        
        # Gap 추가
        total_gaps = (len(node.children) - 1) * style.gap if node.children else 0
        total_main += total_gaps
        
        # Justify Content에 따른 위치 계산
        positions = self._distribute_space(
            style.justify_content,
            [s[0] for s in child_sizes],
            main_size,
            style.gap
        )
        
        # 자식 배치
        for i, child in enumerate(node.children):
            child_main, child_cross = child_sizes[i]
            pos = positions[i]
            
            # Cross axis 정렬
            cross_offset = self._align_on_cross_axis(
                style.align_items,
                child_cross,
                cross_size
            )
            
            if is_row:
                child.layout.x = padding.left + pos
                child.layout.y = padding.top + cross_offset
                child.layout.width = child_main
                child.layout.height = child_cross
            else:
                child.layout.x = padding.left + cross_offset
                child.layout.y = padding.top + pos
                child.layout.width = child_cross
                child.layout.height = child_main
            
            # 재귀적으로 자식의 자식들 계산
            if child.children:
                self._compute_flexbox_layout(
                    child,
                    child.layout.width,
                    child.layout.height
                )
    
    def _resolve_dimension(self, dim: Dimension, available: float) -> float:
        """Dimension을 실제 픽셀 값으로 변환"""
        if dim.type == SizeType.FIXED:
            return dim.value
        elif dim.type == SizeType.PERCENT:
            return available * (dim.value / 100)
        elif dim.type == SizeType.FILL:
            return available
        else:  # AUTO
            return available
    
    def _distribute_space(
        self,
        justify: JustifyContent,
        sizes: List[float],
        available: float,
        gap: float
    ) -> List[float]:
        """Justify Content에 따른 공간 분배"""
        if not sizes:
            return []
        
        total_size = sum(sizes) + (len(sizes) - 1) * gap
        remaining = available - total_size
        
        positions = []
        current = 0
        
        if justify == JustifyContent.FLEX_START:
            for i, size in enumerate(sizes):
                positions.append(current)
                current += size + gap
                
        elif justify == JustifyContent.FLEX_END:
            current = remaining
            for i, size in enumerate(sizes):
                positions.append(current)
                current += size + gap
                
        elif justify == JustifyContent.CENTER:
            current = remaining / 2
            for i, size in enumerate(sizes):
                positions.append(current)
                current += size + gap
                
        elif justify == JustifyContent.SPACE_BETWEEN:
            if len(sizes) <= 1:
                positions = [0]
            else:
                space = remaining / (len(sizes) - 1)
                for i, size in enumerate(sizes):
                    positions.append(current)
                    current += size + gap + space
                    
        elif justify == JustifyContent.SPACE_AROUND:
            space = remaining / len(sizes)
            current = space / 2
            for i, size in enumerate(sizes):
                positions.append(current)
                current += size + gap + space
                
        elif justify == JustifyContent.SPACE_EVENLY:
            space = remaining / (len(sizes) + 1)
            current = space
            for i, size in enumerate(sizes):
                positions.append(current)
                current += size + gap + space
        
        return positions
    
    def _align_on_cross_axis(
        self,
        align: AlignItems,
        item_size: float,
        container_size: float
    ) -> float:
        """Cross Axis 정렬 오프셋 계산"""
        if align == AlignItems.FLEX_START:
            return 0
        elif align == AlignItems.FLEX_END:
            return container_size - item_size
        elif align == AlignItems.CENTER:
            return (container_size - item_size) / 2
        else:  # STRETCH
            return 0
    
    def _apply_optical_corrections(self, node: LayoutNode) -> None:
        """Optical Correction 재귀 적용"""
        for child in node.children:
            if child.optical_shape:
                correction = SHAPE_CORRECTIONS.get(
                    child.optical_shape,
                    SHAPE_CORRECTIONS['square']
                )
                
                base_size = min(child.layout.width, child.layout.height)
                
                # 크기 보정
                size_adjust = 1 + (correction.size_multiplier - 1) * self.correction_strength
                new_width = child.layout.width * size_adjust
                new_height = child.layout.height * size_adjust
                
                # 중심 기준으로 크기 조정
                width_diff = new_width - child.layout.width
                height_diff = new_height - child.layout.height
                
                child.layout.x -= width_diff / 2
                child.layout.y -= height_diff / 2
                child.layout.width = new_width
                child.layout.height = new_height
                
                # 위치 오프셋 적용
                child.layout.x += base_size * correction.offset_x * self.correction_strength
                child.layout.y += base_size * correction.offset_y * self.correction_strength
            
            # 재귀 적용
            if child.children:
                self._apply_optical_corrections(child)


# =============================================================================
# Demo / Test
# =============================================================================

def demo():
    """데모: 아이콘 툴바 레이아웃"""
    
    # 툴바 노드 생성
    toolbar = LayoutNode(
        id='toolbar',
        style=LayoutStyle(
            width=Dimension(SizeType.FIXED, 200),
            height=Dimension(SizeType.FIXED, 48),
            flex_direction=FlexDirection.ROW,
            justify_content=JustifyContent.CENTER,
            align_items=AlignItems.CENTER,
            gap=16,
            padding=EdgeInsets(8, 16, 8, 16),
        ),
        children=[
            LayoutNode(
                id='home',
                style=LayoutStyle(
                    width=Dimension(SizeType.FIXED, 24),
                    height=Dimension(SizeType.FIXED, 24),
                ),
                optical_shape='square'
            ),
            LayoutNode(
                id='search',
                style=LayoutStyle(
                    width=Dimension(SizeType.FIXED, 24),
                    height=Dimension(SizeType.FIXED, 24),
                ),
                optical_shape='circle'
            ),
            LayoutNode(
                id='play',
                style=LayoutStyle(
                    width=Dimension(SizeType.FIXED, 24),
                    height=Dimension(SizeType.FIXED, 24),
                ),
                optical_shape='triangle_right'
            ),
        ]
    )
    
    # 레이아웃 계산
    engine = OpticalLayoutEngine(correction_strength=1.0)
    
    print("=" * 60)
    print("Optical Auto Layout Engine Demo")
    print("=" * 60)
    
    # Without optical correction
    print("\n[Without Optical Correction]")
    engine.compute_layout(toolbar, 200, 48, enable_optical=False)
    for child in toolbar.children:
        print(f"  {child.id:8s}: x={child.layout.x:6.1f}, y={child.layout.y:6.1f}, "
              f"w={child.layout.width:5.1f}, h={child.layout.height:5.1f}")
    
    # With optical correction
    print("\n[With Optical Correction]")
    engine.compute_layout(toolbar, 200, 48, enable_optical=True)
    for child in toolbar.children:
        correction = SHAPE_CORRECTIONS.get(child.optical_shape, SHAPE_CORRECTIONS['square'])
        print(f"  {child.id:8s} ({child.optical_shape:14s}): "
              f"x={child.layout.x:6.1f}, y={child.layout.y:6.1f}, "
              f"w={child.layout.width:5.1f}, h={child.layout.height:5.1f}  "
              f"[size: {correction.size_multiplier:.0%}, offset: ({correction.offset_x:+.0%}, {correction.offset_y:+.0%})]")
    
    print("\n" + "=" * 60)
    print("→ 시각적으로 동일한 크기와 정렬 달성!")
    print("=" * 60)


if __name__ == '__main__':
    demo()
