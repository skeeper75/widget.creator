# Figma Widget Templates

실제 동작하는 위젯 템플릿 코드 모음.

## 1. 기본 위젯

### manifest.json
```json
{
  "name": "My Widget",
  "id": "123456789",
  "api": "1.0.0",
  "widgetApi": "1.0.0",
  "main": "code.js",
  "editorType": ["figma", "figjam"]
}
```

### code.tsx
```tsx
const { widget } = figma
const { AutoLayout, Text } = widget

function MyWidget() {
  return (
    <AutoLayout
      direction="vertical"
      spacing={8}
      padding={16}
      fill="#FFFFFF"
      cornerRadius={8}
      effect={{
        type: 'drop-shadow',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 2 },
        blur: 4
      }}
    >
      <Text fontSize={16} fontWeight="bold">Hello Widget!</Text>
    </AutoLayout>
  )
}

widget.register(MyWidget)
```

---

## 2. 카운터 위젯

```tsx
const { widget } = figma
const { AutoLayout, Text, useSyncedState, usePropertyMenu } = widget

function Counter() {
  const [count, setCount] = useSyncedState('count', 0)
  
  // 속성 메뉴
  usePropertyMenu([
    {
      itemType: 'action',
      propertyName: 'reset',
      tooltip: 'Reset to 0'
    }
  ], ({ propertyName }) => {
    if (propertyName === 'reset') {
      setCount(0)
    }
  })
  
  return (
    <AutoLayout
      direction="horizontal"
      spacing={16}
      padding={16}
      fill="#FFFFFF"
      stroke="#E5E5E5"
      cornerRadius={8}
      verticalAlignItems="center"
    >
      <AutoLayout
        padding={8}
        fill="#F0F0F0"
        cornerRadius={4}
        hoverStyle={{ fill: '#E0E0E0' }}
        onClick={() => setCount(c => c - 1)}
      >
        <Text fontSize={24}>−</Text>
      </AutoLayout>
      
      <Text
        fontSize={32}
        fontWeight="bold"
        width={80}
        horizontalAlignText="center"
      >
        {count.toString()}
      </Text>
      
      <AutoLayout
        padding={8}
        fill="#007AFF"
        cornerRadius={4}
        hoverStyle={{ fill: '#0066CC' }}
        onClick={() => setCount(c => c + 1)}
      >
        <Text fontSize={24} fill="#FFFFFF">+</Text>
      </AutoLayout>
    </AutoLayout>
  )
}

widget.register(Counter)
```

---

## 3. 투표 위젯 (useSyncedMap)

```tsx
const { widget } = figma
const { AutoLayout, Text, useSyncedState, useSyncedMap, usePropertyMenu } = widget

interface VoteOption {
  id: string
  label: string
}

function VoteWidget() {
  const [title, setTitle] = useSyncedState('title', '투표해주세요')
  const [options, setOptions] = useSyncedState<VoteOption[]>('options', [
    { id: '1', label: 'Option A' },
    { id: '2', label: 'Option B' },
    { id: '3', label: 'Option C' },
  ])
  const votes = useSyncedMap<string>('votes')  // Map<sessionId, optionId>
  
  usePropertyMenu([
    {
      itemType: 'action',
      propertyName: 'clearVotes',
      tooltip: 'Clear all votes'
    },
    {
      itemType: 'action',
      propertyName: 'addOption',
      tooltip: 'Add option'
    }
  ], ({ propertyName }) => {
    if (propertyName === 'clearVotes') {
      for (const key of votes.keys()) {
        votes.delete(key)
      }
    }
    if (propertyName === 'addOption') {
      setOptions([...options, {
        id: Date.now().toString(),
        label: `Option ${options.length + 1}`
      }])
    }
  })
  
  const getVoteCount = (optionId: string) => {
    return Array.from(votes.values()).filter(v => v === optionId).length
  }
  
  const totalVotes = votes.size
  
  const handleVote = (optionId: string) => {
    const user = figma.currentUser
    if (user) {
      // 사용자 ID 기반으로 1인 1투표
      const sessionKey = user.sessionId?.toString() || user.id
      votes.set(sessionKey, optionId)
    }
  }
  
  return (
    <AutoLayout
      direction="vertical"
      spacing={12}
      padding={20}
      fill="#FFFFFF"
      cornerRadius={12}
      width={280}
      effect={{
        type: 'drop-shadow',
        color: { r: 0, g: 0, b: 0, a: 0.08 },
        offset: { x: 0, y: 4 },
        blur: 12
      }}
    >
      <Text fontSize={18} fontWeight="bold">{title}</Text>
      
      {options.map(option => {
        const count = getVoteCount(option.id)
        const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0
        
        return (
          <AutoLayout
            key={option.id}
            direction="vertical"
            spacing={4}
            width="fill-parent"
            onClick={() => handleVote(option.id)}
            hoverStyle={{ opacity: 0.8 }}
          >
            <AutoLayout
              direction="horizontal"
              spacing={8}
              width="fill-parent"
            >
              <Text fontSize={14} width="fill-parent">{option.label}</Text>
              <Text fontSize={14} fontWeight="medium">{count}</Text>
            </AutoLayout>
            
            {/* Progress bar */}
            <AutoLayout
              width="fill-parent"
              height={8}
              fill="#F0F0F0"
              cornerRadius={4}
            >
              <AutoLayout
                width={`${percentage}%` as any}
                height="fill-parent"
                fill="#007AFF"
                cornerRadius={4}
              />
            </AutoLayout>
          </AutoLayout>
        )
      })}
      
      <Text fontSize={12} fill="#666666">
        Total: {totalVotes} votes
      </Text>
    </AutoLayout>
  )
}

widget.register(VoteWidget)
```

---

## 4. Input 위젯 (텍스트 입력)

```tsx
const { widget } = figma
const { AutoLayout, Text, Input, useSyncedState } = widget

function NoteWidget() {
  const [title, setTitle] = useSyncedState('title', 'Untitled')
  const [content, setContent] = useSyncedState('content', '')
  
  return (
    <AutoLayout
      direction="vertical"
      spacing={12}
      padding={16}
      fill="#FFF9C4"  // 노란 메모 색상
      cornerRadius={4}
      width={300}
      effect={{
        type: 'drop-shadow',
        color: { r: 0, g: 0, b: 0, a: 0.15 },
        offset: { x: 2, y: 2 },
        blur: 4
      }}
    >
      <Input
        value={title}
        placeholder="Title"
        onTextEditEnd={(e) => setTitle(e.characters)}
        fontSize={18}
        fontWeight="bold"
        fill="#333333"
        width="fill-parent"
        inputFrameProps={{
          fill: 'transparent',
          padding: 0
        }}
      />
      
      <AutoLayout
        width="fill-parent"
        height={1}
        fill="#E0D68A"
      />
      
      <Input
        value={content}
        placeholder="Write your note here..."
        onTextEditEnd={(e) => setContent(e.characters)}
        fontSize={14}
        fill="#555555"
        width="fill-parent"
        inputBehavior="multiline"
        inputFrameProps={{
          fill: 'transparent',
          padding: 0,
          minHeight: 100
        }}
      />
    </AutoLayout>
  )
}

widget.register(NoteWidget)
```

---

## 5. To-Do 리스트 위젯

```tsx
const { widget } = figma
const { AutoLayout, Text, Input, SVG, useSyncedState, useSyncedMap } = widget

interface TodoItem {
  text: string
  completed: boolean
  createdAt: number
}

function TodoWidget() {
  const todos = useSyncedMap<TodoItem>('todos')
  const [newTodo, setNewTodo] = useSyncedState('newTodo', '')
  
  const addTodo = () => {
    if (newTodo.trim()) {
      todos.set(Date.now().toString(), {
        text: newTodo.trim(),
        completed: false,
        createdAt: Date.now()
      })
      setNewTodo('')
    }
  }
  
  const toggleTodo = (id: string) => {
    const todo = todos.get(id)
    if (todo) {
      todos.set(id, { ...todo, completed: !todo.completed })
    }
  }
  
  const deleteTodo = (id: string) => {
    todos.delete(id)
  }
  
  const sortedTodos = Array.from(todos.entries())
    .sort((a, b) => a[1].createdAt - b[1].createdAt)
  
  const checkIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="1" y="1" width="18" height="18" rx="4" stroke="currentColor" stroke-width="2"/>
  </svg>`
  
  const checkedIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="1" y="1" width="18" height="18" rx="4" fill="#007AFF"/>
    <path d="M6 10L9 13L14 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
  
  const deleteIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`
  
  return (
    <AutoLayout
      direction="vertical"
      spacing={12}
      padding={16}
      fill="#FFFFFF"
      cornerRadius={12}
      width={320}
      effect={{
        type: 'drop-shadow',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 4 },
        blur: 12
      }}
    >
      <Text fontSize={20} fontWeight="bold">To-Do List</Text>
      
      {/* 입력 영역 */}
      <AutoLayout
        direction="horizontal"
        spacing={8}
        width="fill-parent"
      >
        <Input
          value={newTodo}
          placeholder="Add a new task..."
          onTextEditEnd={(e) => {
            setNewTodo(e.characters)
            if (e.characters.trim()) {
              addTodo()
            }
          }}
          fontSize={14}
          width="fill-parent"
          inputFrameProps={{
            fill: '#F5F5F5',
            cornerRadius: 8,
            padding: 12
          }}
        />
      </AutoLayout>
      
      {/* Todo 목록 */}
      <AutoLayout direction="vertical" spacing={8} width="fill-parent">
        {sortedTodos.map(([id, todo]) => (
          <AutoLayout
            key={id}
            direction="horizontal"
            spacing={12}
            padding={8}
            width="fill-parent"
            fill={todo.completed ? '#F0F0F0' : '#FFFFFF'}
            cornerRadius={8}
            verticalAlignItems="center"
          >
            <AutoLayout
              onClick={() => toggleTodo(id)}
              hoverStyle={{ opacity: 0.7 }}
            >
              <SVG
                src={todo.completed ? checkedIcon : checkIcon}
                fill={todo.completed ? '#007AFF' : '#999999'}
              />
            </AutoLayout>
            
            <Text
              fontSize={14}
              fill={todo.completed ? '#999999' : '#333333'}
              textDecoration={todo.completed ? 'strikethrough' : 'none'}
              width="fill-parent"
            >
              {todo.text}
            </Text>
            
            <AutoLayout
              onClick={() => deleteTodo(id)}
              hoverStyle={{ opacity: 0.7 }}
              padding={4}
            >
              <SVG src={deleteIcon} fill="#999999" />
            </AutoLayout>
          </AutoLayout>
        ))}
      </AutoLayout>
      
      {sortedTodos.length === 0 && (
        <Text fontSize={14} fill="#999999" horizontalAlignText="center" width="fill-parent">
          No tasks yet. Add one above!
        </Text>
      )}
    </AutoLayout>
  )
}

widget.register(TodoWidget)
```

---

## 6. 이미지 갤러리 위젯

```tsx
const { widget } = figma
const { AutoLayout, Image, Text, useSyncedState, usePropertyMenu } = widget

function GalleryWidget() {
  const [images, setImages] = useSyncedState<string[]>('images', [])
  const [currentIndex, setCurrentIndex] = useSyncedState('currentIndex', 0)
  
  usePropertyMenu([
    {
      itemType: 'action',
      propertyName: 'addImage',
      tooltip: 'Add image from selection'
    }
  ], async ({ propertyName }) => {
    if (propertyName === 'addImage') {
      // 선택한 노드에서 이미지 추출
      const selection = figma.currentPage.selection
      for (const node of selection) {
        if ('fills' in node && Array.isArray(node.fills)) {
          for (const fill of node.fills) {
            if (fill.type === 'IMAGE' && fill.imageHash) {
              setImages([...images, fill.imageHash])
            }
          }
        }
      }
    }
  })
  
  const nextImage = () => {
    setCurrentIndex((currentIndex + 1) % images.length)
  }
  
  const prevImage = () => {
    setCurrentIndex((currentIndex - 1 + images.length) % images.length)
  }
  
  return (
    <AutoLayout
      direction="vertical"
      spacing={8}
      padding={8}
      fill="#FFFFFF"
      cornerRadius={12}
      width={320}
    >
      {images.length > 0 ? (
        <>
          <Image
            src={images[currentIndex]}
            width={304}
            height={200}
            cornerRadius={8}
          />
          
          <AutoLayout
            direction="horizontal"
            spacing={8}
            width="fill-parent"
            horizontalAlignItems="center"
          >
            <AutoLayout
              padding={8}
              fill="#F0F0F0"
              cornerRadius={4}
              onClick={prevImage}
              hoverStyle={{ fill: '#E0E0E0' }}
            >
              <Text>◀</Text>
            </AutoLayout>
            
            <Text fontSize={14}>
              {currentIndex + 1} / {images.length}
            </Text>
            
            <AutoLayout
              padding={8}
              fill="#F0F0F0"
              cornerRadius={4}
              onClick={nextImage}
              hoverStyle={{ fill: '#E0E0E0' }}
            >
              <Text>▶</Text>
            </AutoLayout>
          </AutoLayout>
        </>
      ) : (
        <AutoLayout
          width={304}
          height={200}
          fill="#F5F5F5"
          cornerRadius={8}
          horizontalAlignItems="center"
          verticalAlignItems="center"
        >
          <Text fontSize={14} fill="#999999">
            Select images and use property menu to add
          </Text>
        </AutoLayout>
      )}
    </AutoLayout>
  )
}

widget.register(GalleryWidget)
```

---

## 7. useEffect와 Plugin API 사용

```tsx
const { widget } = figma
const { AutoLayout, Text, useSyncedState, useEffect, useWidgetId } = widget

function SelectionInfoWidget() {
  const [selectionCount, setSelectionCount] = useSyncedState('selectionCount', 0)
  const widgetId = useWidgetId()
  
  useEffect(() => {
    // 위젯이 렌더링될 때마다 실행
    figma.on('selectionchange', () => {
      setSelectionCount(figma.currentPage.selection.length)
    })
  })
  
  return (
    <AutoLayout
      direction="vertical"
      spacing={8}
      padding={16}
      fill="#FFFFFF"
      cornerRadius={8}
      onClick={async () => {
        // Plugin API 사용
        const widget = await figma.getNodeByIdAsync(widgetId) as WidgetNode
        console.log('Widget node:', widget)
        
        // 선택된 노드 정보 출력
        for (const node of figma.currentPage.selection) {
          console.log(`${node.name}: ${node.type}`)
        }
      }}
    >
      <Text fontSize={14}>Selected nodes:</Text>
      <Text fontSize={24} fontWeight="bold">{selectionCount}</Text>
    </AutoLayout>
  )
}

widget.register(SelectionInfoWidget)
```

---

## 8. Dropdown 메뉴 위젯

```tsx
const { widget } = figma
const { AutoLayout, Text, useSyncedState, usePropertyMenu } = widget

type Theme = 'light' | 'dark' | 'blue'

const themes: Record<Theme, { bg: string, text: string, accent: string }> = {
  light: { bg: '#FFFFFF', text: '#333333', accent: '#007AFF' },
  dark: { bg: '#1E1E1E', text: '#FFFFFF', accent: '#0A84FF' },
  blue: { bg: '#E3F2FD', text: '#1565C0', accent: '#1976D2' }
}

function ThemeWidget() {
  const [theme, setTheme] = useSyncedState<Theme>('theme', 'light')
  const [size, setSize] = useSyncedState<'small' | 'medium' | 'large'>('size', 'medium')
  
  const sizes = {
    small: { font: 12, padding: 8 },
    medium: { font: 16, padding: 16 },
    large: { font: 20, padding: 24 }
  }
  
  usePropertyMenu([
    {
      itemType: 'dropdown',
      propertyName: 'theme',
      tooltip: 'Theme',
      selectedOption: theme,
      options: [
        { option: 'light', label: 'Light' },
        { option: 'dark', label: 'Dark' },
        { option: 'blue', label: 'Blue' }
      ]
    },
    {
      itemType: 'dropdown',
      propertyName: 'size',
      tooltip: 'Size',
      selectedOption: size,
      options: [
        { option: 'small', label: 'Small' },
        { option: 'medium', label: 'Medium' },
        { option: 'large', label: 'Large' }
      ]
    }
  ], ({ propertyName, propertyValue }) => {
    if (propertyName === 'theme') {
      setTheme(propertyValue as Theme)
    }
    if (propertyName === 'size') {
      setSize(propertyValue as 'small' | 'medium' | 'large')
    }
  })
  
  const currentTheme = themes[theme]
  const currentSize = sizes[size]
  
  return (
    <AutoLayout
      direction="vertical"
      spacing={8}
      padding={currentSize.padding}
      fill={currentTheme.bg}
      cornerRadius={12}
    >
      <Text fontSize={currentSize.font} fontWeight="bold" fill={currentTheme.text}>
        Themed Widget
      </Text>
      <Text fontSize={currentSize.font * 0.8} fill={currentTheme.accent}>
        Theme: {theme} | Size: {size}
      </Text>
    </AutoLayout>
  )
}

widget.register(ThemeWidget)
```

---

## 9. 타이머 위젯

```tsx
const { widget } = figma
const { AutoLayout, Text, useSyncedState, usePropertyMenu } = widget

function TimerWidget() {
  const [seconds, setSeconds] = useSyncedState('seconds', 0)
  const [isRunning, setIsRunning] = useSyncedState('isRunning', false)
  const [lastUpdate, setLastUpdate] = useSyncedState('lastUpdate', 0)
  
  usePropertyMenu([
    {
      itemType: 'toggle',
      propertyName: 'running',
      tooltip: isRunning ? 'Pause' : 'Start',
      isToggled: isRunning
    },
    {
      itemType: 'action',
      propertyName: 'reset',
      tooltip: 'Reset'
    }
  ], ({ propertyName }) => {
    if (propertyName === 'running') {
      if (!isRunning) {
        setLastUpdate(Date.now())
      }
      setIsRunning(!isRunning)
    }
    if (propertyName === 'reset') {
      setSeconds(0)
      setIsRunning(false)
    }
  })
  
  // 실시간 업데이트를 위해 클릭 시 시간 계산
  const getCurrentSeconds = () => {
    if (isRunning && lastUpdate > 0) {
      const elapsed = Math.floor((Date.now() - lastUpdate) / 1000)
      return seconds + elapsed
    }
    return seconds
  }
  
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <AutoLayout
      direction="vertical"
      spacing={12}
      padding={24}
      fill={isRunning ? '#E8F5E9' : '#FFFFFF'}
      cornerRadius={16}
      horizontalAlignItems="center"
      onClick={() => {
        // 클릭 시 현재 시간 저장하고 업데이트
        if (isRunning) {
          const elapsed = Math.floor((Date.now() - lastUpdate) / 1000)
          setSeconds(seconds + elapsed)
          setLastUpdate(Date.now())
        }
      }}
    >
      <Text fontSize={48} fontWeight="bold" fontFamily="SF Mono">
        {formatTime(getCurrentSeconds())}
      </Text>
      
      <Text fontSize={12} fill="#666666">
        {isRunning ? '▶ Running (click to sync)' : '⏸ Paused'}
      </Text>
    </AutoLayout>
  )
}

widget.register(TimerWidget)
```

---

## 10. 카드 컴포넌트 위젯

```tsx
const { widget } = figma
const { AutoLayout, Text, Image, useSyncedState, usePropertyMenu } = widget

interface CardData {
  title: string
  description: string
  imageHash?: string
  tags: string[]
}

function CardWidget() {
  const [card, setCard] = useSyncedState<CardData>('card', {
    title: 'Card Title',
    description: 'This is a description of the card. Click to edit properties.',
    tags: ['Design', 'Widget']
  })
  
  usePropertyMenu([
    {
      itemType: 'action',
      propertyName: 'setImage',
      tooltip: 'Set image from selection'
    },
    {
      itemType: 'action',
      propertyName: 'addTag',
      tooltip: 'Add tag'
    }
  ], async ({ propertyName }) => {
    if (propertyName === 'setImage') {
      const selection = figma.currentPage.selection[0]
      if (selection && 'fills' in selection) {
        const fills = selection.fills as Paint[]
        const imageFill = fills.find(f => f.type === 'IMAGE')
        if (imageFill && imageFill.type === 'IMAGE') {
          setCard({ ...card, imageHash: imageFill.imageHash || undefined })
        }
      }
    }
    if (propertyName === 'addTag') {
      setCard({ ...card, tags: [...card.tags, `Tag ${card.tags.length + 1}`] })
    }
  })
  
  return (
    <AutoLayout
      direction="vertical"
      spacing={0}
      fill="#FFFFFF"
      cornerRadius={12}
      width={280}
      effect={{
        type: 'drop-shadow',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 4 },
        blur: 16
      }}
    >
      {/* 이미지 영역 */}
      {card.imageHash ? (
        <Image
          src={card.imageHash}
          width={280}
          height={160}
          cornerRadius={{ topLeft: 12, topRight: 12, bottomLeft: 0, bottomRight: 0 }}
        />
      ) : (
        <AutoLayout
          width={280}
          height={160}
          fill="#F0F0F0"
          cornerRadius={{ topLeft: 12, topRight: 12, bottomLeft: 0, bottomRight: 0 }}
          horizontalAlignItems="center"
          verticalAlignItems="center"
        >
          <Text fill="#999999">No Image</Text>
        </AutoLayout>
      )}
      
      {/* 콘텐츠 영역 */}
      <AutoLayout
        direction="vertical"
        spacing={8}
        padding={16}
        width="fill-parent"
      >
        <Text fontSize={18} fontWeight="bold">{card.title}</Text>
        <Text fontSize={14} fill="#666666">{card.description}</Text>
        
        {/* 태그 */}
        <AutoLayout direction="horizontal" spacing={6} wrap>
          {card.tags.map((tag, index) => (
            <AutoLayout
              key={index}
              padding={{ horizontal: 8, vertical: 4 }}
              fill="#E3F2FD"
              cornerRadius={12}
            >
              <Text fontSize={12} fill="#1976D2">{tag}</Text>
            </AutoLayout>
          ))}
        </AutoLayout>
      </AutoLayout>
    </AutoLayout>
  )
}

widget.register(CardWidget)
```
