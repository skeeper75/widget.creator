---
name: optical-auto-layout
description: |
  범용 레이아웃 엔진 스킬. CSS Flexbox 기반 Auto Layout과 시각 보정(Optical Alignment)을 결합하여 수학적으로 정확하면서 시각적으로 자연스러운 레이아웃을 생성.
  
  🔹 레이아웃: "auto layout 구현", "flexbox 알고리즘", "레이아웃 엔진", "배치 계산"
  🔹 시각 보정: "optical alignment", "시각적 중심", "visual center", "아이콘 정렬"
  🔹 통합: "스마트 레이아웃", "자동 배치 + 시각 보정", "디자인 시스템 레이아웃"
  🔹 구현: "Yoga", "Taffy", "Polylabel", "layout engine"
  🔹 인쇄: "스티커 배치", "명함 레이아웃", "인쇄물 조판"
  
  핵심 기능: Shape Corrections (원 +13%, 삼각형 +27%), Visual Center (Polylabel), Typography Overshoot/Kerning
  구현체: Python layout_engine.py, React OpticalAutoLayout.tsx
---

# Optical Auto Layout Engine Skill

범용 레이아웃 엔진 스킬. CSS Flexbox 기반 Auto Layout과 시각 보정(Optical Alignment)을 결합하여 **수학적으로 정확하면서 시각적으로 자연스러운** 레이아웃을 생성.

## Trigger Patterns

```
🔹 레이아웃: "auto layout 구현", "flexbox 알고리즘", "레이아웃 엔진", "배치 계산"
🔹 시각 보정: "optical alignment", "시각적 중심", "visual center", "아이콘 정렬"
🔹 통합: "스마트 레이아웃", "자동 배치 + 시각 보정", "디자인 시스템 레이아웃"
🔹 구현: "Yoga", "Taffy", "Polylabel", "layout engine"
🔹 인쇄: "스티커 배치", "명함 레이아웃", "인쇄물 조판"
```

## Core Concept

```
┌─────────────────────────────────────────────────────────┐
│              Optical Auto Layout Engine                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Input: Elements + Layout Rules + Shape Info           │
│                      │                                  │
│                      ▼                                  │
│   ┌─────────────────────────────────────┐              │
│   │         Auto Layout Engine          │              │
│   │   (Flexbox Algorithm)               │              │
│   │   • direction, wrap                 │              │
│   │   • justify-content, align-items    │              │
│   │   • flex-grow, flex-shrink          │              │
│   │   • gap, padding                    │              │
│   └─────────────────────────────────────┘              │
│                      │                                  │
│                      ▼                                  │
│   ┌─────────────────────────────────────┐              │
│   │       Optical Correction Layer      │              │
│   │   • Visual center offset            │              │
│   │   • Shape size compensation         │              │
│   │   • Typography overshoot            │              │
│   │   • Weight-based adjustment         │              │
│   └─────────────────────────────────────┘              │
│                      │                                  │
│                      ▼                                  │
│   Output: Final positions with optical corrections     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Part 1: Optical Alignment 이론

### 1.1 왜 필요한가?

수학적으로 정확한 정렬이 인간의 눈에는 불균형하게 보이는 현상:

```
수학적 정렬 (어색함)          시각적 정렬 (자연스러움)
┌─────────────────┐         ┌─────────────────┐
│  ■    ●    ▶   │         │  ■    ●    ▶   │
│  │    │    │   │         │  │    │     │  │
│  중심  중심  중심 │         │  중심  중심   중심│
│ (정확) (작아보임)(왼쪽치우침)│    (보정됨)        │
└─────────────────┘         └─────────────────┘
```

### 1.2 핵심 원리

| 현상 | 원인 | 보정 방법 |
|------|------|----------|
| 원이 작아 보임 | 면적이 사각형의 78.5% | 크기 +13% |
| 삼각형 치우침 | 무게중심 ≠ 기하중심 | 위치 오프셋 |
| 곡선 글자 낮아 보임 | 접촉 면적 작음 | Overshoot +3% |
| AV 간격 넓어 보임 | 열린 공간 | Kerning 조정 |

---

## Part 2: Shape Corrections Database

### 2.1 기본 형태 보정 계수

```yaml
# 기준: square = 1.0, offset = 0
shapes:
  square:
    size_multiplier: 1.00
    offset_x: 0.00
    offset_y: 0.00
    
  circle:
    size_multiplier: 1.13    # π/4 보정
    offset_x: 0.00
    offset_y: 0.00
    
  triangle_right:            # 재생 버튼 ▶
    size_multiplier: 1.27
    offset_x: 0.08           # 우측으로 8%
    offset_y: 0.00
    
  triangle_left:             # ◀
    size_multiplier: 1.27
    offset_x: -0.08
    offset_y: 0.00
    
  triangle_up:               # ▲
    size_multiplier: 1.27
    offset_x: 0.00
    offset_y: -0.05
    
  triangle_down:             # ▼
    size_multiplier: 1.27
    offset_x: 0.00
    offset_y: 0.05
    
  diamond:                   # ◆
    size_multiplier: 1.15
    offset_x: 0.00
    offset_y: 0.00
    
  star:                      # ★
    size_multiplier: 1.20
    offset_x: 0.00
    offset_y: 0.00
    
  hexagon:                   # ⬡
    size_multiplier: 1.08
    offset_x: 0.00
    offset_y: 0.00
    
  heart:                     # ♥
    size_multiplier: 1.18
    offset_x: 0.00
    offset_y: 0.03           # 아래로 약간
```

### 2.2 복합 아이콘 보정

```yaml
icons:
  play_button:               # 원 안의 삼각형
    container_shape: circle
    inner_shape: triangle_right
    inner_offset_x: 0.05     # 컨테이너 대비 5% 우측
    
  pause_button:              # 원 안의 두 막대
    container_shape: circle
    inner_shape: rectangle
    inner_offset_x: 0.00
    
  home:                      # 집 모양
    size_multiplier: 1.05
    offset_x: 0.00
    offset_y: -0.02          # 위로 약간
    
  settings_gear:             # 톱니바퀴
    size_multiplier: 1.10
    offset_x: 0.00
    offset_y: 0.00
```

---

## Part 3: Auto Layout Algorithm (Flexbox)

### 3.1 Core Data Structures

```typescript
interface LayoutNode {
  id: string;
  children: LayoutNode[];
  style: LayoutStyle;
  layout: ComputedLayout;      // output
  opticalShape?: ShapeType;    // for optical correction
}

interface LayoutStyle {
  // Dimensions
  width: Dimension;            // fixed | auto | percent | fill
  height: Dimension;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  
  // Flexbox
  flexDirection: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch';
  flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse';
  flexGrow: number;
  flexShrink: number;
  flexBasis: Dimension;
  
  // Spacing
  gap: number;
  padding: EdgeInsets;
  margin: EdgeInsets;
}

interface ComputedLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Dimension = 
  | { type: 'fixed'; value: number }
  | { type: 'auto' }
  | { type: 'percent'; value: number }
  | { type: 'fill' };
```

### 3.2 Layout Algorithm (Simplified)

```typescript
function computeLayout(node: LayoutNode, availableWidth: number, availableHeight: number): void {
  const style = node.style;
  const padding = style.padding;
  
  // 1. Resolve node's own size
  const contentWidth = availableWidth - padding.left - padding.right;
  const contentHeight = availableHeight - padding.top - padding.bottom;
  
  // 2. Measure children
  const isRow = style.flexDirection === 'row' || style.flexDirection === 'row-reverse';
  const mainAxis = isRow ? 'width' : 'height';
  const crossAxis = isRow ? 'height' : 'width';
  
  let totalMainSize = 0;
  let maxCrossSize = 0;
  const childSizes: { main: number; cross: number }[] = [];
  
  for (const child of node.children) {
    const childMain = resolveSize(child.style[mainAxis], isRow ? contentWidth : contentHeight);
    const childCross = resolveSize(child.style[crossAxis], isRow ? contentHeight : contentWidth);
    
    childSizes.push({ main: childMain, cross: childCross });
    totalMainSize += childMain;
    maxCrossSize = Math.max(maxCrossSize, childCross);
  }
  
  // 3. Add gaps
  const totalGaps = (node.children.length - 1) * style.gap;
  totalMainSize += totalGaps;
  
  // 4. Calculate remaining space for flex-grow/shrink
  const availableMain = isRow ? contentWidth : contentHeight;
  const remainingSpace = availableMain - totalMainSize;
  
  // 5. Distribute space based on justify-content
  const positions = distributeSpace(
    style.justifyContent,
    childSizes.map(s => s.main),
    availableMain,
    style.gap
  );
  
  // 6. Position children
  let mainOffset = isRow ? padding.left : padding.top;
  
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const pos = positions[i];
    
    // Cross-axis alignment
    const crossOffset = alignOnCrossAxis(
      style.alignItems,
      childSizes[i].cross,
      isRow ? contentHeight : contentWidth
    );
    
    child.layout = {
      x: isRow ? mainOffset + pos : padding.left + crossOffset,
      y: isRow ? padding.top + crossOffset : mainOffset + pos,
      width: isRow ? childSizes[i].main : childSizes[i].cross,
      height: isRow ? childSizes[i].cross : childSizes[i].main,
    };
    
    mainOffset += childSizes[i].main + style.gap;
  }
  
  // 7. Set node's layout
  node.layout = {
    x: 0,
    y: 0,
    width: availableWidth,
    height: availableHeight,
  };
}

function distributeSpace(
  justify: string,
  sizes: number[],
  available: number,
  gap: number
): number[] {
  const totalSize = sizes.reduce((a, b) => a + b, 0) + (sizes.length - 1) * gap;
  const remaining = available - totalSize;
  
  switch (justify) {
    case 'flex-start':
      return sizes.map((_, i) => sizes.slice(0, i).reduce((a, b) => a + b, 0) + i * gap);
      
    case 'flex-end':
      return sizes.map((_, i) => remaining + sizes.slice(0, i).reduce((a, b) => a + b, 0) + i * gap);
      
    case 'center':
      const start = remaining / 2;
      return sizes.map((_, i) => start + sizes.slice(0, i).reduce((a, b) => a + b, 0) + i * gap);
      
    case 'space-between':
      if (sizes.length <= 1) return [0];
      const spaceBetween = remaining / (sizes.length - 1);
      return sizes.map((_, i) => sizes.slice(0, i).reduce((a, b) => a + b, 0) + i * (gap + spaceBetween));
      
    case 'space-around':
      const spaceAround = remaining / sizes.length;
      return sizes.map((_, i) => 
        spaceAround / 2 + sizes.slice(0, i).reduce((a, b) => a + b, 0) + i * (gap + spaceAround)
      );
      
    case 'space-evenly':
      const spaceEvenly = remaining / (sizes.length + 1);
      return sizes.map((_, i) => 
        spaceEvenly * (i + 1) + sizes.slice(0, i).reduce((a, b) => a + b, 0) + i * gap
      );
      
    default:
      return sizes.map((_, i) => sizes.slice(0, i).reduce((a, b) => a + b, 0) + i * gap);
  }
}
```

---

## Part 4: Optical Correction Integration

### 4.1 Visual Center 계산 (Polylabel Algorithm)

```typescript
// Polylabel: 다각형 내부의 시각적 중심점 찾기
// 가장 큰 내접원의 중심 = 시각적 중심

interface Point { x: number; y: number; }

function polylabel(polygon: Point[][], precision: number = 1.0): Point {
  // Find bounding box
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const ring of polygon) {
    for (const p of ring) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  
  const width = maxX - minX;
  const height = maxY - minY;
  const cellSize = Math.min(width, height);
  
  if (cellSize === 0) {
    return { x: minX, y: minY };
  }
  
  // Priority queue of cells
  const cells: Cell[] = [];
  
  // Cover polygon with initial cells
  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      cells.push(new Cell(x + cellSize / 2, y + cellSize / 2, cellSize / 2, polygon));
    }
  }
  
  // Find best cell
  let bestCell = getCentroidCell(polygon);
  
  while (cells.length > 0) {
    // Pick cell with highest potential
    cells.sort((a, b) => b.max - a.max);
    const cell = cells.shift()!;
    
    if (cell.d > bestCell.d) {
      bestCell = cell;
    }
    
    if (cell.max - bestCell.d <= precision) continue;
    
    // Subdivide
    const h = cell.h / 2;
    cells.push(
      new Cell(cell.x - h, cell.y - h, h, polygon),
      new Cell(cell.x + h, cell.y - h, h, polygon),
      new Cell(cell.x - h, cell.y + h, h, polygon),
      new Cell(cell.x + h, cell.y + h, h, polygon)
    );
  }
  
  return { x: bestCell.x, y: bestCell.y };
}

class Cell {
  x: number;
  y: number;
  h: number;
  d: number;   // distance to polygon
  max: number; // max possible distance
  
  constructor(x: number, y: number, h: number, polygon: Point[][]) {
    this.x = x;
    this.y = y;
    this.h = h;
    this.d = pointToPolygonDist(x, y, polygon);
    this.max = this.d + this.h * Math.SQRT2;
  }
}
```

### 4.2 Optical Correction 적용

```typescript
interface OpticalCorrection {
  offsetX: number;       // 비율 (예: 0.08 = 8%)
  offsetY: number;
  sizeMultiplier: number;
}

const SHAPE_CORRECTIONS: Record<string, OpticalCorrection> = {
  'square':         { offsetX: 0,     offsetY: 0,     sizeMultiplier: 1.00 },
  'circle':         { offsetX: 0,     offsetY: 0,     sizeMultiplier: 1.13 },
  'triangle_right': { offsetX: 0.08,  offsetY: 0,     sizeMultiplier: 1.27 },
  'triangle_left':  { offsetX: -0.08, offsetY: 0,     sizeMultiplier: 1.27 },
  'triangle_up':    { offsetX: 0,     offsetY: -0.05, sizeMultiplier: 1.27 },
  'triangle_down':  { offsetX: 0,     offsetY: 0.05,  sizeMultiplier: 1.27 },
  'diamond':        { offsetX: 0,     offsetY: 0,     sizeMultiplier: 1.15 },
  'star':           { offsetX: 0,     offsetY: 0,     sizeMultiplier: 1.20 },
  'hexagon':        { offsetX: 0,     offsetY: 0,     sizeMultiplier: 1.08 },
  'heart':          { offsetX: 0,     offsetY: 0.03,  sizeMultiplier: 1.18 },
};

function applyOpticalCorrection(
  node: LayoutNode,
  baseSize: number,
  correctionStrength: number = 1.0
): { width: number; height: number; offsetX: number; offsetY: number } {
  const shape = node.opticalShape || 'square';
  const correction = SHAPE_CORRECTIONS[shape] || SHAPE_CORRECTIONS['square'];
  
  // Apply size compensation
  const sizeAdjust = 1 + (correction.sizeMultiplier - 1) * correctionStrength;
  const correctedWidth = node.layout.width * sizeAdjust;
  const correctedHeight = node.layout.height * sizeAdjust;
  
  // Calculate position offset
  const offsetX = baseSize * correction.offsetX * correctionStrength;
  const offsetY = baseSize * correction.offsetY * correctionStrength;
  
  return {
    width: correctedWidth,
    height: correctedHeight,
    offsetX,
    offsetY,
  };
}

// 통합 레이아웃 함수
function computeOpticalLayout(
  node: LayoutNode,
  availableWidth: number,
  availableHeight: number,
  enableOptical: boolean = true
): void {
  // 1. 기본 Auto Layout 계산
  computeLayout(node, availableWidth, availableHeight);
  
  if (!enableOptical) return;
  
  // 2. 각 자식 노드에 Optical Correction 적용
  for (const child of node.children) {
    if (child.opticalShape) {
      const baseSize = Math.min(child.layout.width, child.layout.height);
      const correction = applyOpticalCorrection(child, baseSize);
      
      // 크기 보정 (중심 기준)
      const widthDiff = correction.width - child.layout.width;
      const heightDiff = correction.height - child.layout.height;
      
      child.layout.x -= widthDiff / 2;
      child.layout.y -= heightDiff / 2;
      child.layout.width = correction.width;
      child.layout.height = correction.height;
      
      // 위치 오프셋 적용
      child.layout.x += correction.offsetX;
      child.layout.y += correction.offsetY;
    }
    
    // 재귀 적용
    if (child.children.length > 0) {
      computeOpticalLayout(child, child.layout.width, child.layout.height, enableOptical);
    }
  }
}
```

---

## Part 5: Typography Optical Adjustments

### 5.1 Overshoot (곡선 문자 보정)

```typescript
const CHAR_SHAPES = {
  round: ['O', 'Q', 'C', 'G', 'o', 'c', 'e', '0'],
  pointed: ['A', 'V', 'W', 'v', 'w'],
  flat: ['H', 'I', 'T', 'E', 'F', 'L', 'x', 'z'],
};

function getOvershoot(char: string, fontSize: number): number {
  const baseOvershoot = fontSize * 0.03;  // 3% of font size
  
  if (CHAR_SHAPES.round.includes(char)) {
    return baseOvershoot;
  }
  if (CHAR_SHAPES.pointed.includes(char)) {
    return baseOvershoot * 1.5;
  }
  return 0;
}
```

### 5.2 Optical Kerning

```typescript
const KERNING_PAIRS: Record<string, number> = {
  'AV': -0.08, 'AW': -0.06, 'AT': -0.06, 'AY': -0.07,
  'FA': -0.05, 'LT': -0.06, 'LV': -0.06, 'LW': -0.05,
  'LY': -0.06, 'PA': -0.05, 'TA': -0.06, 'TO': -0.04,
  'Ty': -0.04, 'VA': -0.08, 'Vo': -0.04, 'WA': -0.06,
  'Ya': -0.05, 'Yo': -0.05,
};

function getKerning(char1: string, char2: string, fontSize: number): number {
  const pair = char1 + char2;
  const factor = KERNING_PAIRS[pair] ?? 0;
  return factor * fontSize;
}
```

---

## Part 6: Figma ↔ CSS Flexbox Mapping

| Figma Auto Layout | CSS Flexbox | 비고 |
|-------------------|-------------|------|
| Horizontal | `flex-direction: row` | |
| Vertical | `flex-direction: column` | |
| Spacing (packed) | `gap` | |
| Spacing (space between) | `justify-content: space-between` | |
| Alignment (Min) | `justify-content: flex-start` | |
| Alignment (Center) | `justify-content: center` | |
| Alignment (Max) | `justify-content: flex-end` | |
| Counter Alignment (Min) | `align-items: flex-start` | |
| Counter Alignment (Center) | `align-items: center` | |
| Counter Alignment (Max) | `align-items: flex-end` | |
| Hug Contents | `width/height: auto` | |
| Fill Container | `flex-grow: 1` | |
| Fixed | `width/height: Xpx` | |
| Padding | `padding` | |
| Wrap | `flex-wrap: wrap` | |

---

## Part 7: Use Cases

### 7.1 아이콘 툴바

```typescript
const toolbar: LayoutNode = {
  id: 'toolbar',
  style: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: { top: 8, right: 16, bottom: 8, left: 16 },
    width: { type: 'fixed', value: 200 },
    height: { type: 'fixed', value: 48 },
  },
  children: [
    { id: 'home', opticalShape: 'square', style: { width: { type: 'fixed', value: 24 }, height: { type: 'fixed', value: 24 } } },
    { id: 'search', opticalShape: 'circle', style: { width: { type: 'fixed', value: 24 }, height: { type: 'fixed', value: 24 } } },
    { id: 'play', opticalShape: 'triangle_right', style: { width: { type: 'fixed', value: 24 }, height: { type: 'fixed', value: 24 } } },
  ],
};

// 결과: 모든 아이콘이 시각적으로 동일한 크기와 정렬로 표시됨
```

### 7.2 Printly 스티커 시트

```typescript
const stickerSheet: LayoutNode = {
  id: 'sheet',
  style: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 8,
    padding: { top: 10, right: 10, bottom: 10, left: 10 },
    width: { type: 'fixed', value: 210 },  // A4 width in mm
    height: { type: 'fixed', value: 297 },
  },
  children: [
    { id: 'sticker1', opticalShape: 'circle', style: { width: { type: 'fixed', value: 30 }, height: { type: 'fixed', value: 30 } } },
    { id: 'sticker2', opticalShape: 'star', style: { width: { type: 'fixed', value: 30 }, height: { type: 'fixed', value: 30 } } },
    { id: 'sticker3', opticalShape: 'heart', style: { width: { type: 'fixed', value: 30 }, height: { type: 'fixed', value: 30 } } },
    // ...
  ],
};
```

### 7.3 명함 레이아웃

```typescript
const businessCard: LayoutNode = {
  id: 'card',
  style: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: { top: 10, right: 10, bottom: 10, left: 10 },
    width: { type: 'fixed', value: 90 },
    height: { type: 'fixed', value: 50 },
  },
  children: [
    {
      id: 'logo-row',
      style: { flexDirection: 'row', alignItems: 'center', gap: 8 },
      children: [
        { id: 'logo', opticalShape: 'circle', style: { width: { type: 'fixed', value: 12 }, height: { type: 'fixed', value: 12 } } },
        { id: 'company', style: { width: { type: 'auto' }, height: { type: 'auto' } } },
      ],
    },
    {
      id: 'contact-row',
      style: { flexDirection: 'row', alignItems: 'center', gap: 4 },
      children: [
        { id: 'phone-icon', opticalShape: 'square', style: { width: { type: 'fixed', value: 8 }, height: { type: 'fixed', value: 8 } } },
        { id: 'phone-text', style: { width: { type: 'auto' }, height: { type: 'auto' } } },
      ],
    },
  ],
};
```

---

## Part 8: Reference Libraries

| 라이브러리 | 언어 | 용도 |
|-----------|------|------|
| **Yoga** | C++/JS/etc | Facebook의 Flexbox 레이아웃 엔진 |
| **Taffy** | Rust | 고성능 Flexbox/Grid 엔진 |
| **Polylabel** | JS | 시각적 중심점 계산 |
| **Mapbox** | JS | Polylabel 원본 구현 |

---

## Quick Reference

### 형태별 보정값 요약

| Shape | Size | Offset X | Offset Y |
|-------|------|----------|----------|
| Square | 1.00 | 0 | 0 |
| Circle | 1.13 | 0 | 0 |
| Triangle ▶ | 1.27 | +8% | 0 |
| Triangle ◀ | 1.27 | -8% | 0 |
| Triangle ▲ | 1.27 | 0 | -5% |
| Triangle ▼ | 1.27 | 0 | +5% |
| Diamond | 1.15 | 0 | 0 |
| Star | 1.20 | 0 | 0 |
| Hexagon | 1.08 | 0 | 0 |
| Heart | 1.18 | 0 | +3% |

### 적용 예시

```
Input:  24x24px icons (square, circle, play)

With Optical Correction:
  square:   24.0 x 24.0px  (기준)
  circle:   27.1 x 27.1px  (+13%)
  play:     30.5 x 30.5px  (+27%, +1.9px 우측)

→ 시각적으로 동일한 크기와 정렬
```
