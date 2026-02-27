# Figma Auto Layout ↔ CSS Flexbox Mapping

Figma Auto Layout과 CSS Flexbox 간의 속성 매핑 가이드.

## 기본 속성 매핑

| Figma Auto Layout | CSS Flexbox | 설명 |
|-------------------|-------------|------|
| **Direction** | | |
| Horizontal | `flex-direction: row` | 가로 방향 |
| Vertical | `flex-direction: column` | 세로 방향 |
| **Spacing Mode** | | |
| Packed | `gap: Npx` | 고정 간격 |
| Space between | `justify-content: space-between` | 양 끝 정렬 |
| **Primary Axis Alignment** | | |
| Min (Top/Left) | `justify-content: flex-start` | 시작점 정렬 |
| Center | `justify-content: center` | 중앙 정렬 |
| Max (Bottom/Right) | `justify-content: flex-end` | 끝점 정렬 |
| Space between | `justify-content: space-between` | 균등 분배 |
| **Counter Axis Alignment** | | |
| Min (Top/Left) | `align-items: flex-start` | 시작점 정렬 |
| Center | `align-items: center` | 중앙 정렬 |
| Max (Bottom/Right) | `align-items: flex-end` | 끝점 정렬 |
| Baseline | `align-items: baseline` | 텍스트 기준선 |
| **Sizing** | | |
| Hug contents | `width: auto` / `height: auto` | 내용에 맞춤 |
| Fill container | `flex-grow: 1` | 컨테이너 채우기 |
| Fixed | `width: Npx` / `height: Npx` | 고정 크기 |
| **Wrapping** | | |
| No wrap (default) | `flex-wrap: nowrap` | 줄바꿈 없음 |
| Wrap | `flex-wrap: wrap` | 줄바꿈 |
| **Padding** | | |
| Padding | `padding` | 내부 여백 |
| Independent padding | `padding-top/right/bottom/left` | 개별 여백 |

## 복합 예제

### 1. 수평 중앙 정렬 버튼 그룹

**Figma:**
- Direction: Horizontal
- Spacing: 16
- Alignment: Center (both axes)

**CSS:**
```css
.button-group {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 16px;
}
```

### 2. 수직 리스트 (채우기)

**Figma:**
- Direction: Vertical
- Spacing: 8
- Children: Fill container

**CSS:**
```css
.list-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  flex-grow: 1;
}
```

### 3. Space Between 네비게이션

**Figma:**
- Direction: Horizontal
- Spacing mode: Space between
- Counter alignment: Center

**CSS:**
```css
.nav {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
```

### 4. 반응형 그리드 (Wrap)

**Figma:**
- Direction: Horizontal
- Wrap: On
- Spacing: 16 (both)
- Item sizing: Fixed 200px

**CSS:**
```css
.grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16px;
}

.grid-item {
  width: 200px;
  flex-shrink: 0;
}
```

## Figma API 속성

Figma Plugin/REST API에서 Auto Layout 속성 접근:

```typescript
// Figma Plugin API
const frame = figma.currentPage.selection[0] as FrameNode;

if (frame.layoutMode !== 'NONE') {
  // Auto Layout이 적용된 프레임
  const layout = {
    direction: frame.layoutMode,           // 'HORIZONTAL' | 'VERTICAL'
    spacing: frame.itemSpacing,            // number
    padding: {
      top: frame.paddingTop,
      right: frame.paddingRight,
      bottom: frame.paddingBottom,
      left: frame.paddingLeft,
    },
    primaryAxisAlignItems: frame.primaryAxisAlignItems,    // 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
    counterAxisAlignItems: frame.counterAxisAlignItems,    // 'MIN' | 'CENTER' | 'MAX' | 'BASELINE'
    layoutWrap: frame.layoutWrap,          // 'NO_WRAP' | 'WRAP'
  };
}

// 자식 요소 크기 모드
const child = frame.children[0] as FrameNode;
const childSizing = {
  horizontal: child.layoutSizingHorizontal,  // 'FIXED' | 'HUG' | 'FILL'
  vertical: child.layoutSizingVertical,
};
```

## Figma → CSS 변환 함수

```typescript
function figmaToCSS(frame: FrameNode): CSSProperties {
  const css: CSSProperties = {
    display: 'flex',
  };
  
  // Direction
  css.flexDirection = frame.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
  
  // Gap
  css.gap = `${frame.itemSpacing}px`;
  
  // Padding
  css.padding = `${frame.paddingTop}px ${frame.paddingRight}px ${frame.paddingBottom}px ${frame.paddingLeft}px`;
  
  // Primary Axis (justify-content)
  const justifyMap = {
    'MIN': 'flex-start',
    'CENTER': 'center',
    'MAX': 'flex-end',
    'SPACE_BETWEEN': 'space-between',
  };
  css.justifyContent = justifyMap[frame.primaryAxisAlignItems];
  
  // Counter Axis (align-items)
  const alignMap = {
    'MIN': 'flex-start',
    'CENTER': 'center',
    'MAX': 'flex-end',
    'BASELINE': 'baseline',
  };
  css.alignItems = alignMap[frame.counterAxisAlignItems];
  
  // Wrap
  css.flexWrap = frame.layoutWrap === 'WRAP' ? 'wrap' : 'nowrap';
  
  return css;
}

function childSizingToCSS(child: FrameNode): CSSProperties {
  const css: CSSProperties = {};
  
  // Horizontal sizing
  if (child.layoutSizingHorizontal === 'FIXED') {
    css.width = `${child.width}px`;
  } else if (child.layoutSizingHorizontal === 'FILL') {
    css.flexGrow = 1;
    css.flexBasis = 0;
  }
  // HUG = width: auto (default)
  
  // Vertical sizing
  if (child.layoutSizingVertical === 'FIXED') {
    css.height = `${child.height}px`;
  } else if (child.layoutSizingVertical === 'FILL') {
    css.flexGrow = 1;
    css.flexBasis = 0;
  }
  
  return css;
}
```

## 참고 자료

- [Figma Auto Layout](https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties)
- [CSS Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [Yoga Layout](https://yogalayout.com/) - Facebook의 크로스 플랫폼 Flexbox 구현
- [Taffy](https://github.com/DioxusLabs/taffy) - Rust Flexbox/Grid 엔진
