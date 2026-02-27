# Figma Widget API - 컴포넌트 상세 레퍼런스

> Widget JSX 컴포넌트와 Hooks의 모든 props/API 정의

## 목차
1. [Widget 기본 구조](#widget-기본-구조)
2. [Components](#components)
3. [Hooks](#hooks)
4. [Functions](#functions)
5. [공통 Props](#공통-props)

---

## Widget 기본 구조

### Destructuring

```typescript
const { widget } = figma
const {
  // Components
  AutoLayout,
  Frame,
  Text,
  Input,
  Rectangle,
  Image,
  SVG,
  Ellipse,
  Line,
  Fragment,
  Span,
  
  // Hooks
  useSyncedState,
  useSyncedMap,
  usePropertyMenu,
  useEffect,
  useWidgetId,
  useStickable,
  useStickableHost,
  
  // Functions
  register,
  waitForTask
} = widget
```

### 기본 위젯

```typescript
function MyWidget() {
  return (
    <AutoLayout>
      <Text>Hello Widget!</Text>
    </AutoLayout>
  )
}

widget.register(MyWidget)
```

---

## Components

### AutoLayout

가장 많이 사용하는 컨테이너. CSS Flexbox와 유사.

```typescript
<AutoLayout
  // 레이아웃
  direction="horizontal"        // 'horizontal' | 'vertical'
  spacing={8}                   // number | 'auto' (space-between)
  padding={16}                  // number | { top, bottom, left, right, horizontal, vertical }
  wrap={false}                  // boolean (wrap 허용)
  
  // 정렬
  horizontalAlignItems="center" // 'start' | 'center' | 'end'
  verticalAlignItems="center"   // 'start' | 'center' | 'end'
  
  // 크기
  width={200}                   // number | 'fill-parent' | 'hug-contents'
  height={100}                  // number | 'fill-parent' | 'hug-contents'
  minWidth={50}
  maxWidth={300}
  minHeight={50}
  maxHeight={300}
  
  // 스타일
  fill="#FFFFFF"                // string | Paint | Paint[]
  stroke="#000000"              // string | Paint | Paint[]
  strokeWidth={1}
  strokeAlign="inside"          // 'inside' | 'outside' | 'center'
  cornerRadius={8}              // number | { topLeft, topRight, bottomLeft, bottomRight }
  
  // 위치 (부모가 AutoLayout이 아닐 때)
  x={0}
  y={0}
  positioning="absolute"        // 'auto' | 'absolute'
  
  // 기타
  name="MyFrame"
  hidden={false}
  opacity={1}
  blendMode="normal"
  effect={shadowEffect}
  overflow="visible"            // 'visible' | 'hidden' | 'scroll'
  rotation={0}                  // -180 ~ 180
  
  // 이벤트
  onClick={(event) => { }}
  hoverStyle={{ fill: '#f0f0f0' }}
  tooltip="Hover text"
  key="unique-key"
>
  {children}
</AutoLayout>
```

### Frame

AutoLayout 없는 절대 위치 컨테이너.

```typescript
<Frame
  width={200}
  height={100}
  
  fill="#FFFFFF"
  stroke="#000000"
  strokeWidth={1}
  cornerRadius={8}
  
  // 자식은 절대 위치로 배치
>
  <Rectangle x={10} y={10} width={50} height={50} />
</Frame>
```

### Text

텍스트 표시 컴포넌트.

```typescript
<Text
  // 내용
  children="Hello"              // 문자열 또는 <Span> 자식
  
  // 폰트
  fontFamily="Inter"            // Google Fonts 지원
  fontSize={16}
  fontWeight={400}              // number | 'thin' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'black'
  italic={false}
  
  // 스타일
  fill="#000000"                // 텍스트 색상
  textCase="original"           // 'original' | 'upper' | 'lower' | 'title'
  textDecoration="none"         // 'none' | 'underline' | 'strikethrough'
  letterSpacing={0}             // number (픽셀) 또는 { value, unit: 'percent' }
  lineHeight={24}               // number | 'auto' | { value, unit }
  
  // 정렬
  horizontalAlignText="left"    // 'left' | 'center' | 'right' | 'justified'
  verticalAlignText="top"       // 'top' | 'center' | 'bottom'
  
  // 크기
  width={200}
  height="hug-contents"
  
  // 단락
  paragraphIndent={0}
  paragraphSpacing={0}
  
  // 링크
  href="https://example.com"
  
  // 기타
  truncate={false}              // deprecated
  onClick={(e) => { }}
/>
```

### Span

Text 내부에서 스타일 범위 지정.

```typescript
<Text fontSize={16}>
  Normal text 
  <Span fontWeight="bold" fill="#FF0000">Bold red</Span>
  more text
</Text>
```

### Input

편집 가능한 텍스트 입력.

```typescript
<Input
  // 값
  value={text}
  placeholder="Enter text..."
  
  // 이벤트
  onTextEditEnd={(e) => {
    setText(e.characters)
  }}
  
  // 스타일 (Text와 동일)
  fontSize={16}
  fontFamily="Inter"
  fill="#000000"
  
  // 입력 프레임 스타일
  inputFrameProps={{
    fill: "#FFFFFF",
    stroke: "#CCCCCC",
    cornerRadius: 8,
    padding: 12
  }}
  
  // 플레이스홀더 스타일
  placeholderProps={{
    fill: "#999999"
  }}
  
  // 동작
  inputBehavior="wrap"          // 'wrap' | 'truncate' | 'multiline'
  width={200}
/>
```

### Rectangle

사각형 도형.

```typescript
<Rectangle
  width={100}
  height={100}
  
  fill="#FF0000"
  stroke="#000000"
  strokeWidth={2}
  strokeAlign="center"
  
  cornerRadius={8}
  // 또는 개별 지정
  topLeftRadius={8}
  topRightRadius={8}
  bottomLeftRadius={0}
  bottomRightRadius={0}
  
  opacity={1}
  rotation={45}
  
  onClick={(e) => { }}
/>
```

### Ellipse

원/타원 도형.

```typescript
<Ellipse
  width={100}
  height={100}     // width와 같으면 원
  
  fill="#00FF00"
  stroke="#000000"
  strokeWidth={1}
  
  // Arc (부채꼴)
  arcData={{
    startingAngle: 0,
    endingAngle: 270,
    innerRadius: 0.5  // 0-1, 도넛 모양
  }}
/>
```

### Line

선 도형.

```typescript
<Line
  length={100}
  rotation={45}
  
  stroke="#000000"
  strokeWidth={2}
  strokeCap="round"   // 'none' | 'round' | 'square'
/>
```

### Image

이미지 표시.

```typescript
<Image
  // 이미지 소스 (둘 중 하나 필수)
  src="https://example.com/image.png"
  // 또는
  src={imageHash}   // figma.createImage()로 얻은 해시
  
  width={200}
  height={150}
  
  cornerRadius={8}
/>
```

### SVG

SVG 코드 렌더링.

```typescript
<SVG
  src={`
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path d="M12 2L2 22h20L12 2z" fill="currentColor"/>
    </svg>
  `}
  
  // currentColor 대체
  fill="#FF0000"
/>
```

### Fragment

그룹화 없이 자식들 렌더링.

```typescript
<Fragment>
  <Text>First</Text>
  <Text>Second</Text>
</Fragment>
```

---

## Hooks

### useSyncedState

모든 사용자에게 동기화되는 상태.

```typescript
const [count, setCount] = useSyncedState<number>('count', 0)

// 사용
setCount(count + 1)
setCount(prev => prev + 1)

// 키는 고유해야 함
const [name, setName] = useSyncedState('name', 'default')
```

### useSyncedMap

멀티플레이어 안전한 맵. 동시 편집 시 마지막 쓰기 승리 (키 단위).

```typescript
const votesMap = useSyncedMap<boolean>('votes')

// 읽기
votesMap.get(optionId)
votesMap.has(optionId)
votesMap.size
votesMap.keys()
votesMap.values()
votesMap.entries()

// 쓰기
votesMap.set(optionId, true)
votesMap.delete(optionId)
```

### usePropertyMenu

위젯 선택 시 표시되는 속성 메뉴.

```typescript
usePropertyMenu(
  [
    // Action item
    {
      itemType: 'action',
      propertyName: 'reset',
      tooltip: 'Reset counter',
      icon: `<svg>...</svg>`,  // 선택사항
    },
    
    // Toggle item
    {
      itemType: 'toggle',
      propertyName: 'darkMode',
      tooltip: 'Dark mode',
      isToggled: isDarkMode,
      icon: `<svg>...</svg>`,
    },
    
    // Dropdown
    {
      itemType: 'dropdown',
      propertyName: 'size',
      tooltip: 'Size',
      selectedOption: size,
      options: [
        { option: 'small', label: 'Small' },
        { option: 'medium', label: 'Medium' },
        { option: 'large', label: 'Large' },
      ]
    },
    
    // Color selector
    {
      itemType: 'color-selector',
      propertyName: 'color',
      tooltip: 'Color',
      selectedOption: color,
      options: [
        { option: '#FF0000', tooltip: 'Red' },
        { option: '#00FF00', tooltip: 'Green' },
        { option: '#0000FF', tooltip: 'Blue' },
      ]
    },
    
    // Link
    {
      itemType: 'link',
      propertyName: 'help',
      tooltip: 'Help',
      href: 'https://example.com',
      icon: `<svg>...</svg>`,
    },
    
    // Separator
    {
      itemType: 'separator',
    },
  ],
  // 콜백
  ({ propertyName, propertyValue }) => {
    if (propertyName === 'reset') {
      setCount(0)
    } else if (propertyName === 'size') {
      setSize(propertyValue as string)
    }
  }
)
```

### useEffect

상태 변경 시 사이드 이펙트 실행.

```typescript
useEffect(() => {
  // 상태가 변경될 때마다 실행
  console.log('Widget rendered')
  
  // 비동기 작업
  async function fetchData() {
    const response = await fetch('...')
    // ...
  }
  fetchData()
})
```

### useWidgetId

현재 위젯 노드 ID 반환.

```typescript
const widgetId = useWidgetId()

// Plugin API에서 사용
onClick={async () => {
  const widgetNode = await figma.getNodeByIdAsync(widgetId) as WidgetNode
  // widgetNode 조작
}}
```

### useStickable (FigJam)

다른 노드에 붙을 수 있게 함.

```typescript
const { stuckToRef } = useStickable({
  onStuckTo: (host) => {
    console.log('Stuck to', host.id)
  },
  onUnstuck: () => {
    console.log('Unstuck')
  }
})
```

### useStickableHost (FigJam)

다른 노드가 붙을 수 있게 함.

```typescript
useStickableHost()
```

---

## Functions

### register

위젯 함수 등록 (필수).

```typescript
function MyWidget() {
  return <AutoLayout>...</AutoLayout>
}

widget.register(MyWidget)
```

### waitForTask

비동기 작업 완료까지 위젯 유지.

```typescript
onClick={() => {
  return new Promise((resolve) => {
    waitForTask(
      fetch('https://api.example.com/data')
        .then(res => res.json())
        .then(data => {
          setData(data)
          resolve()
        })
    )
  })
}}
```

---

## 공통 Props

### 모든 컴포넌트 공통

```typescript
interface CommonProps {
  // 식별
  key?: string
  name?: string
  
  // 표시
  hidden?: boolean
  opacity?: number                    // 0-1
  blendMode?: BlendMode
  
  // 위치/크기
  x?: number
  y?: number
  width?: number | 'fill-parent' | 'hug-contents'
  height?: number | 'fill-parent' | 'hug-contents'
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  rotation?: number                   // -180 ~ 180
  
  // AutoLayout 자식으로서
  positioning?: 'auto' | 'absolute'
  
  // 효과
  effect?: Effect | Effect[]
  
  // 상호작용
  onClick?: (event: WidgetClickEvent) => void | Promise<void>
  hoverStyle?: HoverStyle
  tooltip?: string
}
```

### WidgetClickEvent

```typescript
interface WidgetClickEvent {
  // 캔버스 좌표
  canvasX: number
  canvasY: number
  
  // 클릭 위치 (0-1 범위)
  offsetX: number
  offsetY: number
}
```

### HoverStyle

```typescript
interface HoverStyle {
  fill?: string | Paint | Paint[]
  stroke?: string | Paint | Paint[]
  opacity?: number
}
```

### Paint Types

```typescript
// 단색
fill="#FF0000"
fill={{ type: 'solid', color: { r: 1, g: 0, b: 0 } }}

// 그라데이션
fill={{
  type: 'gradient-linear',
  gradientStops: [
    { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
    { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
  ],
  gradientTransform: [[1, 0, 0], [0, 1, 0]]
}}

// 이미지
fill={{
  type: 'image',
  src: 'https://...',
  scaleMode: 'fill'  // 'fill' | 'fit' | 'tile' | 'crop'
}}

// 배열
fill={[paint1, paint2]}
```

### Effect Types

```typescript
// Drop shadow
effect={{
  type: 'drop-shadow',
  color: { r: 0, g: 0, b: 0, a: 0.25 },
  offset: { x: 0, y: 4 },
  blur: 8,
  spread: 0
}}

// Inner shadow
effect={{
  type: 'inner-shadow',
  color: { r: 0, g: 0, b: 0, a: 0.25 },
  offset: { x: 0, y: 2 },
  blur: 4
}}

// Blur
effect={{
  type: 'layer-blur',
  blur: 8
}}
```

---

## 완전한 예제

### 카운터 위젯

```typescript
const { widget } = figma
const { 
  AutoLayout, 
  Text, 
  useSyncedState, 
  usePropertyMenu 
} = widget

function Counter() {
  const [count, setCount] = useSyncedState('count', 0)
  
  usePropertyMenu([
    { itemType: 'action', propertyName: 'reset', tooltip: 'Reset' }
  ], ({ propertyName }) => {
    if (propertyName === 'reset') setCount(0)
  })
  
  return (
    <AutoLayout
      direction="horizontal"
      spacing={8}
      padding={16}
      fill="#FFFFFF"
      stroke="#E0E0E0"
      cornerRadius={8}
      effect={{
        type: 'drop-shadow',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 2 },
        blur: 4
      }}
    >
      <AutoLayout
        onClick={() => setCount(c => c - 1)}
        padding={{ horizontal: 12, vertical: 8 }}
        fill="#F0F0F0"
        cornerRadius={4}
        hoverStyle={{ fill: '#E0E0E0' }}
      >
        <Text fontSize={20}>-</Text>
      </AutoLayout>
      
      <Text fontSize={24} fontWeight="bold" width={60} horizontalAlignText="center">
        {count}
      </Text>
      
      <AutoLayout
        onClick={() => setCount(c => c + 1)}
        padding={{ horizontal: 12, vertical: 8 }}
        fill="#4A90D9"
        cornerRadius={4}
        hoverStyle={{ fill: '#3A80C9' }}
      >
        <Text fontSize={20} fill="#FFFFFF">+</Text>
      </AutoLayout>
    </AutoLayout>
  )
}

widget.register(Counter)
```

### 투표 위젯

```typescript
const { widget } = figma
const { AutoLayout, Text, useSyncedMap, useWidgetId } = widget

function VoteWidget() {
  const votes = useSyncedMap<string>('votes')
  const widgetId = useWidgetId()
  
  const options = ['Option A', 'Option B', 'Option C']
  
  const getVoteCount = (option: string) => {
    return Array.from(votes.values()).filter(v => v === option).length
  }
  
  return (
    <AutoLayout direction="vertical" spacing={8} padding={16} fill="#FFF" cornerRadius={8}>
      <Text fontSize={18} fontWeight="bold">Vote</Text>
      
      {options.map(option => (
        <AutoLayout
          key={option}
          direction="horizontal"
          spacing={8}
          padding={8}
          fill="#F5F5F5"
          cornerRadius={4}
          width="fill-parent"
          onClick={async () => {
            const user = figma.currentUser
            if (user) {
              votes.set(user.id, option)
            }
          }}
        >
          <Text width="fill-parent">{option}</Text>
          <Text fontWeight="bold">{getVoteCount(option)}</Text>
        </AutoLayout>
      ))}
    </AutoLayout>
  )
}

widget.register(VoteWidget)
```
