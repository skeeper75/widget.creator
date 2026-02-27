# Figma Widget Development Guide

## 개요

Widget은 Figma/FigJam 파일에서 모든 사용자가 상호작용할 수 있는 인터랙티브 객체입니다. React와 유사한 선언적 방식으로 개발합니다.

## 프로젝트 설정

```bash
# 공식 CLI
npm init @figma/widget

# 또는 create-figma-plugin
npx create-figma-plugin --widget
```

### 수동 설정
```json
// package.json
{
  "dependencies": {},
  "devDependencies": {
    "@figma/widget-typings": "^1.0.0",
    "typescript": "^5.0.0",
    "esbuild": "^0.19.0"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "figma.widget.h",
    "jsxFragmentFactory": "figma.widget.Fragment",
    "target": "ES2020",
    "strict": true,
    "typeRoots": ["./node_modules/@types", "./node_modules/@figma"]
  }
}
```

```json
// manifest.json
{
  "name": "My Widget",
  "id": "unique-widget-id",
  "api": "1.0.0",
  "main": "dist/code.js",
  "editorType": ["figma", "figjam"],
  "containsWidget": true,
  "widgetApi": "1.0.0"
}
```

## 기본 구조

```tsx
const { widget } = figma
const { 
  AutoLayout, Frame, Text, Rectangle, Image, SVG, Ellipse, Line, Input, Fragment,
  useSyncedState, useSyncedMap, usePropertyMenu, useEffect, useWidgetId,
  useStickable, useStickableHost,
  register, waitForTask
} = widget

function MyWidget() {
  // 상태
  const [count, setCount] = useSyncedState('count', 0)
  
  // 렌더링
  return (
    <AutoLayout
      direction="vertical"
      padding={16}
      spacing={8}
      cornerRadius={8}
      fill="#FFFFFF"
      stroke="#E5E5E5"
    >
      <Text fontSize={24} fontWeight="bold">{count}</Text>
      <AutoLayout
        onClick={() => setCount(count + 1)}
        padding={{ horizontal: 16, vertical: 8 }}
        fill="#18A0FB"
        cornerRadius={6}
      >
        <Text fill="#FFFFFF">Click me</Text>
      </AutoLayout>
    </AutoLayout>
  )
}

widget.register(MyWidget)
```

## Components

### AutoLayout
```tsx
<AutoLayout
  // 방향
  direction="horizontal" // 'horizontal' | 'vertical'
  
  // 크기
  width={200}
  height="hug-contents" // number | 'fill-parent' | 'hug-contents'
  
  // 패딩
  padding={16}
  padding={{ top: 8, right: 16, bottom: 8, left: 16 }}
  padding={{ horizontal: 16, vertical: 8 }}
  
  // 간격
  spacing={8}
  
  // 정렬
  horizontalAlignItems="center" // 'start' | 'center' | 'end'
  verticalAlignItems="center"
  
  // 스타일
  fill="#FFFFFF"
  stroke="#E5E5E5"
  strokeWidth={1}
  cornerRadius={8}
  
  // 이벤트
  onClick={() => {}}
  onMouseEnter={() => {}}
>
```

### Text
```tsx
<Text
  fontSize={16}
  fontFamily="Inter"
  fontWeight="bold" // 'normal' | 'medium' | 'semibold' | 'bold'
  fill="#000000"
  textDecoration="underline"
  letterSpacing={0.5}
  lineHeight={24}
  textCase="upper" // 'upper' | 'lower' | 'title' | 'original'
  horizontalAlignText="center" // 'left' | 'center' | 'right'
  truncate={2} // 줄 수 제한
>
  Hello World
</Text>
```

### Input
```tsx
<Input
  value={text}
  placeholder="Enter text..."
  onTextEditEnd={(e) => setText(e.characters)}
  inputBehavior="wrap" // 'wrap' | 'truncate' | 'multiline'
  fontSize={14}
  fill="#000000"
  width="fill-parent"
/>
```

### Image
```tsx
<Image
  src={imageUrl} // 또는 base64
  width={200}
  height={150}
  cornerRadius={8}
/>

// 이미지 업로드
useEffect(() => {
  waitForTask(
    figma.ui.postMessage({ type: 'upload-image' })
  )
})
```

### SVG
```tsx
<SVG
  src={`<svg viewBox="0 0 24 24">
    <path d="M12 2L2 22h20L12 2z" fill="currentColor"/>
  </svg>`}
  width={24}
  height={24}
/>
```

### Rectangle & Ellipse
```tsx
<Rectangle
  width={100}
  height={50}
  fill="#FF0000"
  cornerRadius={8}
/>

<Ellipse
  width={100}
  height={100}
  fill="#00FF00"
/>
```

## Hooks

### useSyncedState
모든 사용자가 공유하는 상태입니다.
```tsx
const [value, setValue] = useSyncedState('uniqueKey', defaultValue)

// 복잡한 상태
const [data, setData] = useSyncedState('data', { 
  items: [], 
  lastUpdated: null 
})

// 상태 업데이트 (불변성 유지)
setData({ ...data, items: [...data.items, newItem] })
```

### useSyncedMap
멀티플레이어 안전 맵입니다. 동시 편집 시 충돌 방지.
```tsx
const votes = useSyncedMap<number>('votes')

// 현재 사용자 ID로 투표
const userId = figma.currentUser?.id || 'anonymous'
votes.set(userId, 1)

// 전체 투표 수
const totalVotes = Array.from(votes.values()).reduce((a, b) => a + b, 0)
```

### usePropertyMenu
위젯 선택 시 표시되는 속성 메뉴.
```tsx
usePropertyMenu(
  [
    {
      itemType: 'action',
      propertyName: 'reset',
      tooltip: 'Reset',
    },
    {
      itemType: 'separator',
    },
    {
      itemType: 'dropdown',
      propertyName: 'theme',
      tooltip: 'Theme',
      selectedOption: theme,
      options: [
        { option: 'light', label: 'Light' },
        { option: 'dark', label: 'Dark' },
      ],
    },
    {
      itemType: 'color-selector',
      propertyName: 'color',
      tooltip: 'Color',
      selectedOption: color,
      options: [
        { option: '#FF0000', tooltip: 'Red' },
        { option: '#00FF00', tooltip: 'Green' },
        { option: '#0000FF', tooltip: 'Blue' },
      ],
    },
    {
      itemType: 'toggle',
      propertyName: 'showBorder',
      tooltip: 'Show Border',
      isToggled: showBorder,
    },
    {
      itemType: 'link',
      propertyName: 'help',
      tooltip: 'Help',
      href: 'https://example.com/help',
    }
  ],
  ({ propertyName, propertyValue }) => {
    if (propertyName === 'reset') {
      setCount(0)
    } else if (propertyName === 'theme') {
      setTheme(propertyValue)
    }
  }
)
```

### useEffect
비동기 작업 및 사이드 이펙트.
```tsx
useEffect(() => {
  // 비동기 작업 시작
  waitForTask(
    fetch('https://api.example.com/data')
      .then(res => res.json())
      .then(data => setData(data))
  )
})

// UI와 통신
useEffect(() => {
  figma.ui.on('message', (msg) => {
    if (msg.type === 'image-uploaded') {
      setImageUrl(msg.url)
    }
  })
})
```

### useWidgetId
현재 위젯 노드 ID.
```tsx
const widgetId = useWidgetId()

// 위젯 노드에 접근
const widgetNode = figma.getNodeById(widgetId) as WidgetNode
```

### useStickable / useStickableHost (FigJam 전용)
```tsx
// 다른 노드에 붙을 수 있음 (스티커처럼)
useStickable()

// 다른 노드가 이 위젯에 붙을 수 있음
useStickableHost({
  allowedNodeTypes: ['STICKY', 'SHAPE_WITH_TEXT']
})
```

## UI iframe 사용

### manifest.json
```json
{
  "ui": "dist/ui.html"
}
```

### Widget에서 UI 열기
```tsx
const openUI = () => {
  return new Promise((resolve) => {
    figma.showUI(__html__, { width: 400, height: 300 })
    figma.ui.on('message', (msg) => {
      if (msg.type === 'done') {
        resolve(msg.data)
      }
    })
  })
}

<AutoLayout onClick={() => waitForTask(openUI())}>
  <Text>Open Settings</Text>
</AutoLayout>
```

### UI에서 Widget으로 메시지
```typescript
// ui.ts
parent.postMessage({ pluginMessage: { type: 'done', data: result } }, '*')
```

## Plugin API 사용

Widget에서 Plugin API 접근:
```tsx
const [nodes, setNodes] = useSyncedState('nodes', [])

useEffect(() => {
  // 페이지의 모든 노드 가져오기
  const allNodes = figma.currentPage.findAll()
  setNodes(allNodes.map(n => ({ id: n.id, name: n.name })))
})

// 노드 생성
const createRect = () => {
  const rect = figma.createRectangle()
  rect.resize(100, 100)
  figma.currentPage.appendChild(rect)
}
```

## 디자인 패턴

### Voting Widget
```tsx
function VotingWidget() {
  const votes = useSyncedMap<boolean>('votes')
  const userId = figma.currentUser?.id || 'guest'
  
  const hasVoted = votes.get(userId) === true
  const totalVotes = Array.from(votes.values()).filter(v => v).length
  
  const toggleVote = () => {
    votes.set(userId, !hasVoted)
  }
  
  return (
    <AutoLayout direction="horizontal" spacing={8} padding={16}>
      <AutoLayout 
        onClick={toggleVote}
        fill={hasVoted ? '#18A0FB' : '#F5F5F5'}
        padding={8}
        cornerRadius={4}
      >
        <Text fill={hasVoted ? '#FFFFFF' : '#000000'}>👍</Text>
      </AutoLayout>
      <Text fontSize={16}>{totalVotes}</Text>
    </AutoLayout>
  )
}
```

### Card Widget
```tsx
function CardWidget() {
  const [title, setTitle] = useSyncedState('title', 'Untitled')
  const [content, setContent] = useSyncedState('content', '')
  
  return (
    <AutoLayout
      direction="vertical"
      width={280}
      padding={16}
      spacing={12}
      fill="#FFFFFF"
      stroke="#E5E5E5"
      cornerRadius={8}
    >
      <Input
        value={title}
        onTextEditEnd={(e) => setTitle(e.characters)}
        fontWeight="bold"
        fontSize={18}
        width="fill-parent"
      />
      <Input
        value={content}
        onTextEditEnd={(e) => setContent(e.characters)}
        placeholder="Add description..."
        fontSize={14}
        fill="#666666"
        width="fill-parent"
        inputBehavior="multiline"
      />
    </AutoLayout>
  )
}
```

## 에러 처리

```tsx
useEffect(() => {
  waitForTask(
    fetchData()
      .then(data => setData(data))
      .catch(err => {
        console.error(err)
        figma.notify('Failed to load data', { error: true })
      })
  )
})
```

## 성능 최적화

1. **Dynamic Page Loading**: `documentAccess` manifest 설정
2. **상태 최소화**: 필요한 데이터만 저장
3. **렌더링 최적화**: 복잡한 계산 캐싱
4. **이미지 최적화**: 적절한 크기로 리사이즈

```json
// manifest.json
{
  "documentAccess": "dynamic-page"
}
```

## 배포

```bash
# 빌드
npm run build

# Figma Desktop에서 게시
# Widgets > Development > Your Widget > Publish
```
