# Figma Plugin API - figma 글로벌 객체 전체 레퍼런스

> 이 문서는 `figma` 글로벌 객체의 모든 메서드와 속성을 포함합니다.

## 목차
1. [General](#general)
2. [Sub-objects](#sub-objects)
3. [Node 생성](#node-생성)
4. [Node 조회](#node-조회)
5. [Style 관리](#style-관리)
6. [Team Library](#team-library)
7. [Event Handling](#event-handling)
8. [기타 유틸리티](#기타-유틸리티)

---

## General

### 읽기 전용 속성

```typescript
figma.apiVersion: string        // API 버전 (예: "1.0.0")
figma.fileKey: string | undefined  // 파일 키 (private plugin만)
figma.command: string           // 현재 실행 중인 명령
figma.pluginId?: string         // 플러그인 ID
figma.widgetId?: string         // 위젯 ID
figma.editorType: 'figma' | 'figjam' | 'dev' | 'slides' | 'buzz'
figma.mode: 'default' | 'textreview' | 'inspect' | 'codegen' | 'linkpreview' | 'auth'
figma.hasMissingFont: boolean   // 누락된 폰트 여부
```

### 페이지/문서 접근

```typescript
figma.currentPage: PageNode     // 현재 페이지 (읽기/쓰기)
figma.root: DocumentNode        // 문서 루트 (읽기 전용)

// 페이지 전환
await figma.setCurrentPageAsync(page: PageNode): Promise<void>
```

### 플러그인 제어

```typescript
figma.closePlugin(message?: string): void  // 플러그인 종료
figma.notify(message: string, options?: NotificationOptions): NotificationHandler
figma.openExternal(url: string): void      // 외부 URL 열기

// NotificationOptions
interface NotificationOptions {
  timeout?: number        // 밀리초 (Infinity도 가능)
  error?: boolean         // 에러 스타일
  onDequeue?: () => void  // 알림 제거 시 콜백
}
```

---

## Sub-objects

### figma.ui - UI 제어

```typescript
figma.showUI(html: string, options?: ShowUIOptions): void
figma.ui.show(): void
figma.ui.hide(): void
figma.ui.resize(width: number, height: number): void
figma.ui.reposition(x: number, y: number): void
figma.ui.close(): void
figma.ui.postMessage(message: any): void
figma.ui.on('message', callback: (message: any) => void): void
figma.ui.off('message', callback): void

interface ShowUIOptions {
  visible?: boolean       // 기본: true
  title?: string
  width?: number          // 기본: 300
  height?: number         // 기본: 200
  position?: { x: number, y: number }
  themeColors?: boolean   // CSS 변수로 테마 색상 제공
}
```

### figma.viewport - 뷰포트 제어

```typescript
figma.viewport.center: Vector           // 뷰포트 중심
figma.viewport.zoom: number             // 줌 레벨
figma.viewport.bounds: Rect             // 뷰포트 경계

figma.viewport.scrollAndZoomIntoView(nodes: SceneNode[]): void
```

### figma.clientStorage - 로컬 저장소

```typescript
await figma.clientStorage.getAsync(key: string): Promise<any>
await figma.clientStorage.setAsync(key: string, value: any): Promise<void>
await figma.clientStorage.deleteAsync(key: string): Promise<void>
await figma.clientStorage.keysAsync(): Promise<string[]>
```

### figma.parameters - 파라미터 입력

```typescript
figma.parameters.on('input', callback: (event: ParameterInputEvent) => void): void
figma.parameters.off('input', callback): void

interface ParameterInputEvent {
  query: string
  key: string
  parameters: Partial<ParameterValues>
  result: SuggestionResults
}

// result 메서드
result.setSuggestions(suggestions: string[] | Suggestion[]): void
result.setError(message: string): void
result.setLoadingMessage(message: string): void
```

### figma.variables - 변수 관리

```typescript
// 변수 컬렉션
await figma.variables.getLocalVariableCollectionsAsync(): Promise<VariableCollection[]>
await figma.variables.getVariableCollectionByIdAsync(id: string): Promise<VariableCollection | null>
figma.variables.createVariableCollection(name: string): VariableCollection

// 변수
await figma.variables.getLocalVariablesAsync(type?: VariableResolvedDataType): Promise<Variable[]>
await figma.variables.getVariableByIdAsync(id: string): Promise<Variable | null>
figma.variables.createVariable(name: string, collectionId: string, type: VariableResolvedDataType): Variable

// 변수 타입
type VariableResolvedDataType = 'BOOLEAN' | 'COLOR' | 'FLOAT' | 'STRING'

// 헬퍼 함수
figma.variables.createVariableAlias(variable: Variable): VariableAlias
figma.variables.setBoundVariableForPaint(paint: SolidPaint, field: string, variable: Variable): SolidPaint
figma.variables.setBoundVariableForEffect(effect: Effect, field: string, variable: Variable): Effect
```

### figma.codegen - Dev Mode 코드 생성

```typescript
figma.codegen.on('generate', callback: (event: CodegenEvent) => CodegenResult[]): void

interface CodegenEvent {
  node: SceneNode
  language: string
}

interface CodegenResult {
  title: string
  code: string
  language: string
}
```

### figma.teamLibrary - 팀 라이브러리

```typescript
await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync(): Promise<LibraryVariableCollection[]>
await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection: LibraryVariableCollection): Promise<LibraryVariable[]>
```

---

## Node 생성

### 기본 도형

```typescript
figma.createRectangle(): RectangleNode
figma.createEllipse(): EllipseNode
figma.createPolygon(): PolygonNode
figma.createStar(): StarNode
figma.createLine(): LineNode
figma.createVector(): VectorNode
```

### 컨테이너/레이아웃

```typescript
figma.createFrame(): FrameNode
figma.createComponent(): ComponentNode
figma.createComponentFromNode(node: SceneNode): ComponentNode
figma.createPage(): PageNode
figma.createSlice(): SliceNode
figma.createSection(): SectionNode
```

### 텍스트/미디어

```typescript
figma.createText(): TextNode
figma.createImage(data: Uint8Array): Image
await figma.createImageAsync(src: string): Promise<Image>
await figma.createVideoAsync(data: Uint8Array): Promise<Video>
```

### FigJam 전용

```typescript
figma.createSticky(): StickyNode
figma.createShapeWithText(): ShapeWithTextNode
figma.createConnector(): ConnectorNode
figma.createCodeBlock(): CodeBlockNode
figma.createTable(numRows?: number, numColumns?: number): TableNode
figma.createGif(hash: string): MediaNode
```

### 그룹/불리언

```typescript
figma.group(nodes: SceneNode[], parent: BaseNode & ChildrenMixin, index?: number): GroupNode
figma.ungroup(node: SceneNode & ChildrenMixin): SceneNode[]
figma.union(nodes: SceneNode[], parent, index?): BooleanOperationNode
figma.subtract(nodes: SceneNode[], parent, index?): BooleanOperationNode
figma.intersect(nodes: SceneNode[], parent, index?): BooleanOperationNode
figma.exclude(nodes: SceneNode[], parent, index?): BooleanOperationNode
figma.flatten(nodes: SceneNode[], parent?, index?): VectorNode
```

### 컴포넌트 변형

```typescript
figma.combineAsVariants(components: ComponentNode[], parent, index?): ComponentSetNode
```

### SVG/JSX

```typescript
figma.createNodeFromSvg(svg: string): FrameNode
await figma.createNodeFromJSXAsync(jsx: any): Promise<SceneNode>
```

---

## Node 조회

```typescript
// ID로 조회
await figma.getNodeByIdAsync(id: string): Promise<BaseNode | null>
figma.getNodeById(id: string): BaseNode | null  // deprecated

// 이미지 조회
figma.getImageByHash(hash: string): Image | null

// 선택 색상
figma.getSelectionColors(): { paints: Paint[], styles: PaintStyle[] } | null

// 썸네일 노드
await figma.getFileThumbnailNodeAsync(): Promise<FrameNode | ComponentNode | ComponentSetNode | SectionNode | null>
await figma.setFileThumbnailNodeAsync(node: FrameNode | ... | null): Promise<void>
```

---

## Style 관리

### Style 생성

```typescript
figma.createPaintStyle(): PaintStyle
figma.createTextStyle(): TextStyle
figma.createEffectStyle(): EffectStyle
figma.createGridStyle(): GridStyle
```

### Style 조회

```typescript
await figma.getStyleByIdAsync(id: string): Promise<BaseStyle | null>
await figma.getLocalPaintStylesAsync(): Promise<PaintStyle[]>
await figma.getLocalTextStylesAsync(): Promise<TextStyle[]>
await figma.getLocalEffectStylesAsync(): Promise<EffectStyle[]>
await figma.getLocalGridStylesAsync(): Promise<GridStyle[]>
```

### Style 정렬

```typescript
figma.moveLocalPaintStyleAfter(target: PaintStyle, reference: PaintStyle | null): void
figma.moveLocalTextStyleAfter(target: TextStyle, reference: TextStyle | null): void
figma.moveLocalEffectStyleAfter(target: EffectStyle, reference: EffectStyle | null): void
figma.moveLocalGridStyleAfter(target: GridStyle, reference: GridStyle | null): void
```

---

## Team Library

```typescript
await figma.importComponentByKeyAsync(key: string): Promise<ComponentNode>
await figma.importComponentSetByKeyAsync(key: string): Promise<ComponentSetNode>
await figma.importStyleByKeyAsync(key: string): Promise<BaseStyle>
await figma.importVariableByKeyAsync(key: string): Promise<Variable>
```

---

## Event Handling

### 이벤트 등록

```typescript
figma.on(type: EventType, callback: Function): void
figma.once(type: EventType, callback: Function): void
figma.off(type: EventType, callback: Function): void

// ArgFreeEventType (콜백에 인자 없음)
type ArgFreeEventType = 
  | 'selectionchange'
  | 'currentpagechange'
  | 'close'
  | 'timerstart'
  | 'timerpause'
  | 'timerstop'
  | 'timerdone'
  | 'timerresume'
```

### 이벤트 타입별 콜백

```typescript
// 실행 이벤트
figma.on('run', (event: RunEvent) => void)
interface RunEvent {
  command: string
  parameters?: ParameterValues
}

// 드롭 이벤트
figma.on('drop', (event: DropEvent) => boolean)
interface DropEvent {
  node: BaseNode | null
  x: number
  y: number
  absoluteX: number
  absoluteY: number
  items: DropItem[]
  files: DropFile[]
  dropMetadata?: any
}

// 문서 변경
figma.on('documentchange', (event: DocumentChangeEvent) => void)
interface DocumentChangeEvent {
  documentChanges: DocumentChange[]
}

// 스타일 변경
figma.on('stylechange', (event: StyleChangeEvent) => void)
```

---

## 기타 유틸리티

### 폰트

```typescript
await figma.listAvailableFontsAsync(): Promise<Font[]>
await figma.loadFontAsync(fontName: FontName): Promise<void>

interface FontName {
  family: string
  style: string
}
```

### 인코딩

```typescript
figma.base64Encode(data: Uint8Array): string
figma.base64Decode(data: string): Uint8Array
```

### Undo/버전

```typescript
figma.commitUndo(): void
figma.triggerUndo(): void
await figma.saveVersionHistoryAsync(title: string, description?: string): Promise<VersionHistoryResult>
```

### 페이지 로드

```typescript
await figma.loadAllPagesAsync(): Promise<void>  // dynamic-page 모드에서 필요
```

### Mixed 값

```typescript
figma.mixed: unique symbol  // 혼합 속성값 비교용
// 예: if (node.fontSize === figma.mixed) { ... }
```

---

## 전체 타입 정의 참조

상세 타입 정의는 `@figma/plugin-typings` 패키지 참조:

```bash
npm install --save-dev @figma/plugin-typings
```

VSCode에서 자동완성 활성화됨.
