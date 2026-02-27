# Figma Plugin Development Guide

## 프로젝트 설정

### create-figma-plugin 사용 (권장)
```bash
npx create-figma-plugin
# 프롬프트에 따라 설정
# - Plugin name
# - Template (empty, with UI, etc.)
# - Framework (Preact, React, etc.)

cd your-plugin
npm install
npm run watch  # 개발 모드
```

### 수동 설정
```bash
mkdir my-plugin && cd my-plugin
npm init -y
npm install -D typescript @figma/plugin-typings
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "strict": true,
    "typeRoots": ["./node_modules/@types", "./node_modules/@figma"]
  }
}
```

```json
// manifest.json
{
  "name": "My Plugin",
  "id": "unique-plugin-id",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "editorType": ["figma", "figjam"],
  "capabilities": [],
  "permissions": []
}
```

## 아키텍처

### 샌드박스 모델
```
┌─────────────────────────────────────────────────────┐
│                   Figma Application                  │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────┐      ┌─────────────────────┐  │
│  │   Plugin Core   │      │     Plugin UI       │  │
│  │   (Sandbox)     │      │     (iframe)        │  │
│  │                 │      │                     │  │
│  │  - No DOM       │      │  - Full DOM         │  │
│  │  - No fetch     │◄────►│  - fetch/XHR        │  │
│  │  - figma.*      │      │  - Canvas/WebGL     │  │
│  │                 │      │  - External libs    │  │
│  └─────────────────┘      └─────────────────────┘  │
│          │                         │                │
│          │    postMessage()        │                │
│          └─────────────────────────┘                │
└─────────────────────────────────────────────────────┘
```

### Main Thread ↔ UI 통신
```typescript
// main.ts (Plugin Core)
figma.showUI(__html__)

// UI로 메시지 보내기
figma.ui.postMessage({ type: 'selection', data: nodes })

// UI에서 메시지 받기
figma.ui.onmessage = (msg) => {
  if (msg.type === 'create') {
    // 노드 생성 로직
  }
}
```

```typescript
// ui.tsx (Plugin UI)
// Main으로 메시지 보내기
parent.postMessage({ pluginMessage: { type: 'create', data } }, '*')

// Main에서 메시지 받기
window.onmessage = (event) => {
  const msg = event.data.pluginMessage
  if (msg.type === 'selection') {
    // UI 업데이트
  }
}
```

## Node Types

### 기본 노드 생성
```typescript
// Frame
const frame = figma.createFrame()
frame.resize(200, 100)
frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]

// Rectangle
const rect = figma.createRectangle()
rect.cornerRadius = 8

// Ellipse
const ellipse = figma.createEllipse()

// Line
const line = figma.createLine()
line.strokeWeight = 2

// Text
const text = figma.createText()
await figma.loadFontAsync({ family: "Inter", style: "Regular" })
text.characters = "Hello World"
text.fontSize = 24

// Vector
const vector = figma.createVector()
vector.vectorPaths = [{ windingRule: "EVENODD", data: "M 0 0 L 100 100" }]
```

### 컴포넌트 & 인스턴스
```typescript
// Component 생성
const component = figma.createComponent()
component.name = "Button"

// Component Set (Variants)
const componentSet = figma.combineAsVariants([comp1, comp2], parent)

// Instance 생성
const instance = component.createInstance()

// Instance 속성 변경
instance.setProperties({ 'Variant': 'Primary', 'Size': 'Large' })
```

## 스타일 & 변수

### Fills & Strokes
```typescript
node.fills = [
  { type: 'SOLID', color: { r: 0.2, g: 0.4, b: 1 } },
  { type: 'GRADIENT_LINEAR', gradientStops: [...] },
  { type: 'IMAGE', imageHash: '...', scaleMode: 'FILL' }
]

node.strokes = [
  { type: 'SOLID', color: { r: 0, g: 0, b: 0 } }
]
node.strokeWeight = 2
node.strokeAlign = 'INSIDE' // 'INSIDE' | 'CENTER' | 'OUTSIDE'
```

### Effects
```typescript
node.effects = [
  {
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    offset: { x: 0, y: 4 },
    radius: 8,
    visible: true
  },
  {
    type: 'BLUR',
    radius: 10,
    visible: true
  }
]
```

### Variables 사용
```typescript
// 변수 조회
const variables = await figma.variables.getLocalVariablesAsync()
const collections = await figma.variables.getLocalVariableCollectionsAsync()

// 변수 생성
const collection = figma.variables.createVariableCollection('Colors')
const variable = figma.variables.createVariable('primary', collection.id, 'COLOR')
variable.setValueForMode(collection.defaultModeId, { r: 0, g: 0.4, b: 1 })

// 변수 바인딩
node.setBoundVariable('fills', 0, 'color', variable.id)
```

## Auto Layout

```typescript
const frame = figma.createFrame()

// Auto Layout 활성화
frame.layoutMode = 'HORIZONTAL' // 'HORIZONTAL' | 'VERTICAL'
frame.primaryAxisSizingMode = 'AUTO'
frame.counterAxisSizingMode = 'AUTO'

// 패딩
frame.paddingTop = 16
frame.paddingRight = 16
frame.paddingBottom = 16
frame.paddingLeft = 16

// 간격
frame.itemSpacing = 8

// 정렬
frame.primaryAxisAlignItems = 'CENTER' // 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
frame.counterAxisAlignItems = 'CENTER' // 'MIN' | 'CENTER' | 'MAX'

// Wrap
frame.layoutWrap = 'WRAP' // 'NO_WRAP' | 'WRAP'
```

## Selection & Navigation

```typescript
// 현재 선택
const selection = figma.currentPage.selection

// 선택 변경
figma.currentPage.selection = [node1, node2]

// 노드로 이동
figma.viewport.scrollAndZoomIntoView([node])

// 페이지 이동
figma.setCurrentPageAsync(figma.root.children[1])

// 노드 찾기
const nodes = figma.currentPage.findAll(n => n.name === 'Button')
const node = figma.currentPage.findOne(n => n.type === 'COMPONENT')
const children = figma.currentPage.findAllWithCriteria({ types: ['TEXT'] })
```

## 비동기 작업

```typescript
// 폰트 로드 (필수)
await figma.loadFontAsync({ family: "Inter", style: "Regular" })

// 페이지 로드 (Dynamic Page Loading)
await figma.loadAllPagesAsync()
// 또는 특정 페이지
await figma.getNodeByIdAsync(pageId)

// 컴포넌트 Import
const component = await figma.importComponentByKeyAsync(componentKey)

// Client Storage
await figma.clientStorage.setAsync('key', { data: 'value' })
const data = await figma.clientStorage.getAsync('key')

// 네트워크 요청 (UI에서)
// main.ts에서 networkAccess 권한 필요
```

## UI 개발

### HTML/CSS 직접 작성
```html
<!-- ui.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, sans-serif; padding: 16px; }
    .button { 
      background: #18A0FB; 
      color: white; 
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <button class="button" onclick="handleClick()">Create</button>
  <script>
    function handleClick() {
      parent.postMessage({ pluginMessage: { type: 'create' } }, '*')
    }
  </script>
</body>
</html>
```

### React 사용
```tsx
// ui.tsx
import { render } from '@create-figma-plugin/ui'
import { h } from 'preact'
import { useState } from 'preact/hooks'

function Plugin() {
  const [count, setCount] = useState(0)
  
  const handleCreate = () => {
    parent.postMessage({ pluginMessage: { type: 'create', count } }, '*')
  }

  return (
    <div>
      <input 
        type="number" 
        value={count} 
        onChange={(e) => setCount(parseInt(e.target.value))} 
      />
      <button onClick={handleCreate}>Create</button>
    </div>
  )
}

export default render(Plugin)
```

### Figma Plugin DS 사용
```tsx
import { Button, Input, Container } from 'figma-plugin-ds'
import 'figma-plugin-ds/dist/figma-plugin-ds.css'

function App() {
  return (
    <Container>
      <Input placeholder="Enter text..." />
      <Button>Create</Button>
    </Container>
  )
}
```

## Dev Mode 플러그인

### Inspect Panel 플러그인
```json
// manifest.json
{
  "editorType": ["dev"],
  "inspectByDefault": true,
  "permissions": ["inspect"]
}
```

```typescript
// 선택된 노드 검사
figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection
  if (selection.length === 1) {
    const node = selection[0]
    // CSS 속성 추출
    const css = node.getCSSAsync()
  }
})
```

### Codegen 플러그인
```json
// manifest.json
{
  "codegenLanguages": [
    { "label": "React", "value": "react" }
  ]
}
```

```typescript
figma.codegen.on('generate', async (event) => {
  const { node, language } = event
  
  if (language === 'react') {
    return [{
      title: 'React Component',
      code: `<div style={{...}}>${node.name}</div>`,
      language: 'JAVASCRIPT'
    }]
  }
  return []
})
```

## 권한 & 보안

### manifest.json 권한
```json
{
  "permissions": [
    "currentuser"  // 현재 사용자 정보
  ],
  "networkAccess": {
    "allowedDomains": ["https://api.example.com"],
    "reasoning": "API 통신에 필요"
  },
  "enableProposedApi": false
}
```

## 에러 처리 & 디버깅

```typescript
try {
  // 플러그인 로직
} catch (error) {
  figma.notify(`Error: ${error.message}`, { error: true })
  console.error(error)
}

// 토스트 알림
figma.notify('작업 완료!')
figma.notify('오류 발생', { error: true })
figma.notify('처리 중...', { timeout: Infinity })

// 콘솔 로그 (Figma DevTools에서 확인)
console.log('Debug:', data)
```

## 배포

### 빌드
```bash
npm run build
```

### 게시
1. Figma Desktop: Plugins > Development > Publish
2. manifest.json, 코드, 아이콘, 설명 제출
3. Figma 검토 후 승인

### 버전 관리
- 업데이트 시 재검토 불필요
- Version history에 변경 내용 기록
- 롤백은 이전 버전 재게시로
