# Figma Plugin Templates

실제 동작하는 플러그인 템플릿 코드 모음.

## 1. 기본 플러그인 (UI 없음)

### manifest.json
```json
{
  "name": "My Plugin",
  "id": "123456789",
  "api": "1.0.0",
  "main": "code.js",
  "editorType": ["figma"]
}
```

### code.ts
```typescript
// 선택한 노드의 이름 변경
for (const node of figma.currentPage.selection) {
  node.name = "Renamed: " + node.name
}

figma.closePlugin("Done!")
```

---

## 2. UI 포함 플러그인

### manifest.json
```json
{
  "name": "Plugin with UI",
  "id": "123456789",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma"]
}
```

### code.ts
```typescript
// UI 표시
figma.showUI(__html__, {
  width: 300,
  height: 400,
  themeColors: true
})

// UI에서 메시지 수신
figma.ui.onmessage = async (msg: { type: string, [key: string]: any }) => {
  if (msg.type === 'create-rectangle') {
    const rect = figma.createRectangle()
    rect.x = 0
    rect.y = 0
    rect.resize(msg.width, msg.height)
    rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }]
    
    figma.currentPage.appendChild(rect)
    figma.currentPage.selection = [rect]
    figma.viewport.scrollAndZoomIntoView([rect])
  }
  
  if (msg.type === 'cancel') {
    figma.closePlugin()
  }
}
```

### ui.html
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Inter, sans-serif;
      margin: 0;
      padding: 16px;
    }
    
    /* Figma 테마 변수 사용 */
    body {
      background: var(--figma-color-bg);
      color: var(--figma-color-text);
    }
    
    input {
      width: 100%;
      padding: 8px;
      margin: 8px 0;
      border: 1px solid var(--figma-color-border);
      border-radius: 4px;
      background: var(--figma-color-bg-secondary);
      color: var(--figma-color-text);
    }
    
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 8px;
    }
    
    .primary {
      background: var(--figma-color-bg-brand);
      color: white;
    }
    
    .secondary {
      background: var(--figma-color-bg-secondary);
      color: var(--figma-color-text);
    }
  </style>
</head>
<body>
  <h3>Create Rectangle</h3>
  
  <label>Width</label>
  <input type="number" id="width" value="100">
  
  <label>Height</label>
  <input type="number" id="height" value="100">
  
  <div style="margin-top: 16px">
    <button class="primary" id="create">Create</button>
    <button class="secondary" id="cancel">Cancel</button>
  </div>
  
  <script>
    document.getElementById('create').onclick = () => {
      const width = parseInt(document.getElementById('width').value)
      const height = parseInt(document.getElementById('height').value)
      parent.postMessage({ pluginMessage: { type: 'create-rectangle', width, height } }, '*')
    }
    
    document.getElementById('cancel').onclick = () => {
      parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*')
    }
  </script>
</body>
</html>
```

---

## 3. 선택 노드 정보 읽기

```typescript
function getSelectionInfo() {
  const selection = figma.currentPage.selection
  
  if (selection.length === 0) {
    figma.notify("Please select something")
    return null
  }
  
  return selection.map(node => ({
    id: node.id,
    name: node.name,
    type: node.type,
    width: 'width' in node ? node.width : null,
    height: 'height' in node ? node.height : null,
    x: 'x' in node ? node.x : null,
    y: 'y' in node ? node.y : null,
  }))
}

const info = getSelectionInfo()
if (info) {
  console.log(info)
  figma.ui.postMessage({ type: 'selection-info', data: info })
}
```

---

## 4. 텍스트 노드 생성/수정

```typescript
async function createText(content: string, options?: {
  fontFamily?: string
  fontSize?: number
  color?: RGB
}) {
  // 폰트 로드 필수!
  const fontName = { family: options?.fontFamily || 'Inter', style: 'Regular' }
  await figma.loadFontAsync(fontName)
  
  const text = figma.createText()
  text.fontName = fontName
  text.fontSize = options?.fontSize || 16
  text.characters = content
  
  if (options?.color) {
    text.fills = [{ type: 'SOLID', color: options.color }]
  }
  
  figma.currentPage.appendChild(text)
  return text
}

// 사용
createText("Hello World!", {
  fontFamily: 'Roboto',
  fontSize: 24,
  color: { r: 0.2, g: 0.2, b: 0.8 }
})
```

---

## 5. Auto Layout 프레임 생성

```typescript
function createAutoLayoutFrame(options: {
  direction?: 'HORIZONTAL' | 'VERTICAL'
  spacing?: number
  padding?: number
  fill?: RGB
}) {
  const frame = figma.createFrame()
  
  // Auto Layout 활성화
  frame.layoutMode = options.direction || 'VERTICAL'
  frame.primaryAxisSizingMode = 'AUTO'
  frame.counterAxisSizingMode = 'AUTO'
  
  // 간격
  frame.itemSpacing = options.spacing || 8
  
  // 패딩
  const p = options.padding || 16
  frame.paddingTop = p
  frame.paddingBottom = p
  frame.paddingLeft = p
  frame.paddingRight = p
  
  // 채우기
  if (options.fill) {
    frame.fills = [{ type: 'SOLID', color: options.fill }]
  }
  
  return frame
}

// 사용
const container = createAutoLayoutFrame({
  direction: 'VERTICAL',
  spacing: 12,
  padding: 24,
  fill: { r: 1, g: 1, b: 1 }
})
```

---

## 6. 컴포넌트 인스턴스 생성

```typescript
async function createInstanceFromLibrary(componentKey: string) {
  try {
    const component = await figma.importComponentByKeyAsync(componentKey)
    const instance = component.createInstance()
    
    figma.currentPage.appendChild(instance)
    figma.currentPage.selection = [instance]
    figma.viewport.scrollAndZoomIntoView([instance])
    
    return instance
  } catch (error) {
    figma.notify("Failed to import component")
    console.error(error)
    return null
  }
}
```

---

## 7. 노드 트리 순회

```typescript
function traverseNode(node: BaseNode, callback: (node: BaseNode) => void) {
  callback(node)
  
  if ('children' in node) {
    for (const child of node.children) {
      traverseNode(child, callback)
    }
  }
}

// 모든 텍스트 노드 찾기
const textNodes: TextNode[] = []
traverseNode(figma.currentPage, (node) => {
  if (node.type === 'TEXT') {
    textNodes.push(node as TextNode)
  }
})
```

---

## 8. 스타일 적용

```typescript
async function applyStyleToSelection(styleId: string, styleType: 'fill' | 'stroke' | 'effect' | 'text') {
  const selection = figma.currentPage.selection
  
  for (const node of selection) {
    switch (styleType) {
      case 'fill':
        if ('fillStyleId' in node) {
          await (node as GeometryMixin).setFillStyleIdAsync(styleId)
        }
        break
      case 'stroke':
        if ('strokeStyleId' in node) {
          await (node as GeometryMixin).setStrokeStyleIdAsync(styleId)
        }
        break
      case 'effect':
        if ('effectStyleId' in node) {
          await (node as BlendMixin).setEffectStyleIdAsync(styleId)
        }
        break
      case 'text':
        if (node.type === 'TEXT') {
          await node.setTextStyleIdAsync(styleId)
        }
        break
    }
  }
}
```

---

## 9. Variables 사용

```typescript
async function createColorVariable(name: string, color: RGB) {
  // 컬렉션 가져오기 또는 생성
  let collections = await figma.variables.getLocalVariableCollectionsAsync()
  let collection = collections.find(c => c.name === 'Colors')
  
  if (!collection) {
    collection = figma.variables.createVariableCollection('Colors')
  }
  
  // 변수 생성
  const variable = figma.variables.createVariable(name, collection.id, 'COLOR')
  variable.setValueForMode(collection.defaultModeId, color)
  
  return variable
}

async function bindVariableToNode(node: SceneNode, variable: Variable, field: string) {
  if ('setBoundVariable' in node) {
    (node as any).setBoundVariable(field, variable)
  }
}

// 사용
const primaryColor = await createColorVariable('primary', { r: 0.2, g: 0.4, b: 0.8 })
const rect = figma.createRectangle()
rect.fills = [figma.variables.setBoundVariableForPaint(
  { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
  'color',
  primaryColor
)]
```

---

## 10. clientStorage 사용

```typescript
// 저장
await figma.clientStorage.setAsync('lastUsedColor', '#FF5500')
await figma.clientStorage.setAsync('settings', { 
  darkMode: true, 
  fontSize: 14 
})

// 불러오기
const lastColor = await figma.clientStorage.getAsync('lastUsedColor')
const settings = await figma.clientStorage.getAsync('settings')

// 삭제
await figma.clientStorage.deleteAsync('lastUsedColor')

// 모든 키 조회
const keys = await figma.clientStorage.keysAsync()
```

---

## 11. Dev Mode Codegen 플러그인

### manifest.json
```json
{
  "name": "Code Generator",
  "id": "123456789",
  "api": "1.0.0",
  "main": "code.js",
  "editorType": ["dev"],
  "capabilities": ["codegen"]
}
```

### code.ts
```typescript
figma.codegen.on('generate', async (event) => {
  const node = event.node
  
  // CSS 생성
  const css = await node.getCSSAsync()
  const cssCode = Object.entries(css)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n')
  
  // 결과 반환
  return [
    {
      title: 'CSS',
      code: `.${node.name.toLowerCase().replace(/\s+/g, '-')} {\n${cssCode}\n}`,
      language: 'CSS'
    }
  ]
})
```

---

## 12. 드롭 이벤트 처리

```typescript
figma.on('drop', (event) => {
  const { items, files, x, y, absoluteX, absoluteY } = event
  
  // 텍스트 드롭
  for (const item of items) {
    if (item.type === 'text/plain') {
      // 텍스트 노드 생성
      figma.loadFontAsync({ family: 'Inter', style: 'Regular' }).then(() => {
        const text = figma.createText()
        text.characters = item.data
        text.x = x
        text.y = y
        figma.currentPage.appendChild(text)
      })
      return true  // 이벤트 처리됨
    }
  }
  
  // 파일 드롭
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      file.getBytesAsync().then(bytes => {
        const image = figma.createImage(bytes)
        const rect = figma.createRectangle()
        rect.resize(200, 200)
        rect.x = x
        rect.y = y
        rect.fills = [{
          type: 'IMAGE',
          imageHash: image.hash,
          scaleMode: 'FILL'
        }]
        figma.currentPage.appendChild(rect)
      })
      return true
    }
  }
  
  return false  // 이벤트 미처리
})
```

---

## 13. create-figma-plugin 설정

### package.json
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "main": "build/main.js",
  "ui": "build/ui.js",
  "scripts": {
    "build": "build-figma-plugin --typecheck --minify",
    "watch": "build-figma-plugin --typecheck --watch"
  },
  "dependencies": {
    "@create-figma-plugin/ui": "latest",
    "@create-figma-plugin/utilities": "latest",
    "preact": "^10.0.0"
  },
  "devDependencies": {
    "@create-figma-plugin/build": "latest",
    "@create-figma-plugin/tsconfig": "latest",
    "@figma/plugin-typings": "latest",
    "typescript": "^5.0.0"
  },
  "figma-plugin": {
    "editorType": ["figma"],
    "id": "123456789",
    "name": "My Plugin",
    "main": "src/main.ts",
    "ui": "src/ui.tsx"
  }
}
```

### src/main.ts
```typescript
import { emit, on, showUI } from '@create-figma-plugin/utilities'

export default function () {
  on('CREATE_SHAPE', (data: { width: number, height: number }) => {
    const rect = figma.createRectangle()
    rect.resize(data.width, data.height)
    figma.currentPage.appendChild(rect)
    emit('SHAPE_CREATED', { id: rect.id })
  })
  
  showUI({ width: 300, height: 200 })
}
```

### src/ui.tsx
```tsx
import { h } from 'preact'
import { useState } from 'preact/hooks'
import { render, Button, TextboxNumeric } from '@create-figma-plugin/ui'
import { emit, on } from '@create-figma-plugin/utilities'

function Plugin() {
  const [width, setWidth] = useState('100')
  const [height, setHeight] = useState('100')
  
  const handleCreate = () => {
    emit('CREATE_SHAPE', { 
      width: parseInt(width), 
      height: parseInt(height) 
    })
  }
  
  return (
    <div style={{ padding: 16 }}>
      <TextboxNumeric
        value={width}
        onValueInput={setWidth}
        placeholder="Width"
      />
      <TextboxNumeric
        value={height}
        onValueInput={setHeight}
        placeholder="Height"
      />
      <Button onClick={handleCreate}>Create</Button>
    </div>
  )
}

export default render(Plugin)
```
