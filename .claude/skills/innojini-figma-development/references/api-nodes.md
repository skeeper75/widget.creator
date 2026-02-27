# Figma Plugin API - Node Types 상세 레퍼런스

> 모든 노드 타입과 상세 속성 정의

## 목차
1. [Node 타입 구조](#node-타입-구조)
2. [공통 Mixin](#공통-mixin)
3. [주요 Node 타입별 속성](#주요-node-타입별-속성)
4. [Data Types](#data-types)

---

## Node 타입 구조

### BaseNode (최상위)

```typescript
type BaseNode = DocumentNode | PageNode | SceneNode
```

### SceneNode (캔버스 내 모든 노드)

```typescript
type SceneNode =
  | BooleanOperationNode
  | CodeBlockNode
  | ComponentNode
  | ComponentSetNode
  | ConnectorNode
  | EllipseNode
  | EmbedNode
  | FrameNode
  | GroupNode
  | HighlightNode
  | InstanceNode
  | InteractiveSlideElementNode
  | LineNode
  | LinkUnfurlNode
  | MediaNode
  | PolygonNode
  | RectangleNode
  | SectionNode
  | ShapeWithTextNode
  | SliceNode
  | SlideGridNode
  | SlideNode
  | SlideRowNode
  | StampNode
  | StarNode
  | StickyNode
  | TableNode
  | TextNode
  | TextPathNode
  | TransformGroupNode
  | VectorNode
  | WashiTapeNode
  | WidgetNode
```

### NodeType (문자열 리터럴)

```typescript
type NodeType =
  | "BOOLEAN_OPERATION"
  | "CODE_BLOCK"
  | "COMPONENT"
  | "COMPONENT_SET"
  | "CONNECTOR"
  | "DOCUMENT"
  | "ELLIPSE"
  | "EMBED"
  | "FRAME"
  | "GROUP"
  | "HIGHLIGHT"
  | "INSTANCE"
  | "LINE"
  | "LINK_UNFURL"
  | "MEDIA"
  | "PAGE"
  | "POLYGON"
  | "RECTANGLE"
  | "SECTION"
  | "SHAPE_WITH_TEXT"
  | "SLICE"
  | "SLIDE"
  | "STAMP"
  | "STAR"
  | "STICKY"
  | "TABLE"
  | "TEXT"
  | "VECTOR"
  | "WIDGET"
  // ... 기타
```

---

## 공통 Mixin

### BaseNodeMixin (모든 노드)

```typescript
interface BaseNodeMixin {
  readonly id: string
  readonly parent: (BaseNode & ChildrenMixin) | null
  name: string
  readonly removed: boolean
  
  toString(): string
  remove(): void
  
  // Plugin Data
  getPluginData(key: string): string
  setPluginData(key: string, value: string): void
  getPluginDataKeys(): string[]
  
  // Shared Plugin Data
  getSharedPluginData(namespace: string, key: string): string
  setSharedPluginData(namespace: string, key: string, value: string): void
  getSharedPluginDataKeys(namespace: string): string[]
  
  // Relaunch
  setRelaunchData(data: { [command: string]: string }): void
  getRelaunchData(): { [command: string]: string }
}
```

### SceneNodeMixin (캔버스 노드)

```typescript
interface SceneNodeMixin {
  visible: boolean
  locked: boolean
  readonly stuckNodes: SceneNode[]
  readonly attachedConnectors: ConnectorNode[]
  componentPropertyReferences: { [nodeProperty: string]: string } | null
  
  // Variables
  readonly boundVariables?: { [field: string]: VariableAlias | VariableAlias[] }
  setBoundVariable(field: VariableBindableNodeField, variable: Variable | null): void
  readonly inferredVariables?: { [field: string]: VariableAlias[] }
  readonly resolvedVariableModes: { [collectionId: string]: string }
  explicitVariableModes: { [collectionId: string]: string }
}
```

### ChildrenMixin (자식 포함 가능)

```typescript
interface ChildrenMixin {
  readonly children: ReadonlyArray<SceneNode>
  
  appendChild(child: SceneNode): void
  insertChild(index: number, child: SceneNode): void
  
  findChildren(callback?: (node: SceneNode) => boolean): SceneNode[]
  findChild(callback: (node: SceneNode) => boolean): SceneNode | null
  findAll(callback?: (node: SceneNode) => boolean): SceneNode[]
  findOne(callback: (node: SceneNode) => boolean): SceneNode | null
  findAllWithCriteria<T extends NodeType[]>(criteria: FindAllCriteria<T>): Array<SceneNode>
  findWidgetNodesByWidgetId(widgetId: string): WidgetNode[]
}
```

### GeometryMixin (도형 속성)

```typescript
interface GeometryMixin {
  fills: ReadonlyArray<Paint> | typeof figma.mixed
  fillStyleId: string | typeof figma.mixed
  strokes: ReadonlyArray<Paint>
  strokeStyleId: string
  strokeWeight: number | typeof figma.mixed
  strokeJoin: StrokeJoin | typeof figma.mixed
  strokeAlign: 'CENTER' | 'INSIDE' | 'OUTSIDE'
  strokeCap: StrokeCap | typeof figma.mixed
  strokeMiterLimit: number
  dashPattern: ReadonlyArray<number>
  readonly fillGeometry: VectorPaths
  readonly strokeGeometry: VectorPaths
  
  outlineStroke(): VectorNode | null
  setFillStyleIdAsync(styleId: string): Promise<void>
  setStrokeStyleIdAsync(styleId: string): Promise<void>
}
```

### LayoutMixin (레이아웃 속성)

```typescript
interface LayoutMixin {
  x: number
  y: number
  readonly width: number
  readonly height: number
  minWidth: number | null
  maxWidth: number | null
  minHeight: number | null
  maxHeight: number | null
  
  relativeTransform: Transform
  readonly absoluteTransform: Transform
  readonly absoluteBoundingBox: Rect | null
  readonly absoluteRenderBounds: Rect | null
  
  rotation: number
  constrainProportions: boolean  // deprecated
  readonly targetAspectRatio: Vector | null
  
  // Auto Layout 자식 속성
  layoutAlign: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT'
  layoutGrow: number
  layoutPositioning: 'AUTO' | 'ABSOLUTE'
  layoutSizingHorizontal: 'FIXED' | 'HUG' | 'FILL'
  layoutSizingVertical: 'FIXED' | 'HUG' | 'FILL'
  
  // Grid Auto Layout 자식 속성
  gridRowAnchorIndex: number
  gridColumnAnchorIndex: number
  gridRowSpan: number
  gridColumnSpan: number
  gridChildHorizontalAlign: 'MIN' | 'CENTER' | 'MAX' | 'AUTO'
  gridChildVerticalAlign: 'MIN' | 'CENTER' | 'MAX' | 'AUTO'
  setGridChildPosition(rowIndex: number, columnIndex: number): void
  
  resize(width: number, height: number): void
  resizeWithoutConstraints(width: number, height: number): void
  rescale(scale: number): void
  lockAspectRatio(): void
  unlockAspectRatio(): void
}
```

### BlendMixin (블렌드/효과)

```typescript
interface BlendMixin {
  opacity: number                    // 0-1
  blendMode: BlendMode
  isMask: boolean
  maskType: MaskType
  effects: ReadonlyArray<Effect>
  effectStyleId: string
  
  setEffectStyleIdAsync(styleId: string): Promise<void>
}
```

### CornerMixin (모서리)

```typescript
interface CornerMixin {
  cornerRadius: number | typeof figma.mixed
  cornerSmoothing: number            // 0-1
  topLeftRadius: number
  topRightRadius: number
  bottomLeftRadius: number
  bottomRightRadius: number
}
```

### ConstraintMixin (제약조건)

```typescript
interface ConstraintMixin {
  constraints: Constraints
}

interface Constraints {
  horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE'
  vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE'
}
```

### ExportMixin (내보내기)

```typescript
interface ExportMixin {
  exportSettings: ReadonlyArray<ExportSettings>
  exportAsync(settings?: ExportSettings): Promise<Uint8Array>
  exportAsync(settings: ExportSettingsSVGString): Promise<string>
}
```

### ReactionMixin (프로토타입)

```typescript
interface ReactionMixin {
  reactions: ReadonlyArray<Reaction>
  setReactionsAsync(reactions: Reaction[]): Promise<void>
}
```

---

## 주요 Node 타입별 속성

### FrameNode

```typescript
interface FrameNode extends
  BaseNodeMixin,
  SceneNodeMixin,
  ChildrenMixin,
  GeometryMixin,
  CornerMixin,
  LayoutMixin,
  BlendMixin,
  ConstraintMixin,
  ExportMixin,
  ReactionMixin {
  
  readonly type: 'FRAME'
  clone(): FrameNode
  
  // Frame 전용
  layoutGrids: ReadonlyArray<LayoutGrid>
  gridStyleId: string
  clipsContent: boolean
  guides: ReadonlyArray<Guide>
  readonly inferredAutoLayout: InferredAutoLayoutResult | null
  readonly detachedInfo: DetachedInfo | null
  expanded: boolean
  devStatus: DevStatus
  annotations: ReadonlyArray<Annotation>
  
  // Auto Layout
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID'
  primaryAxisSizingMode: 'FIXED' | 'AUTO'
  counterAxisSizingMode: 'FIXED' | 'AUTO'
  primaryAxisAlignItems: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN'
  counterAxisAlignItems: 'MIN' | 'MAX' | 'CENTER' | 'BASELINE'
  counterAxisAlignContent: 'AUTO' | 'SPACE_BETWEEN'
  layoutWrap: 'NO_WRAP' | 'WRAP'
  
  paddingLeft: number
  paddingRight: number
  paddingTop: number
  paddingBottom: number
  itemSpacing: number
  counterAxisSpacing: number | null
  itemReverseZIndex: boolean
  strokesIncludedInLayout: boolean
  
  // Grid Auto Layout
  gridRowCount: number
  gridColumnCount: number
  gridRowGap: number
  gridColumnGap: number
  gridRowSizes: GridTrackSize[]
  gridColumnSizes: GridTrackSize[]
  appendChildAt(node: SceneNode, rowIndex: number, columnIndex: number): void
  
  // Prototype
  overflowDirection: OverflowDirection
  numberOfFixedChildren: number
  readonly overlayPositionType: OverlayPositionType
  readonly overlayBackground: OverlayBackground
  readonly overlayBackgroundInteraction: OverlayBackgroundInteraction
  
  // Individual Strokes
  strokeTopWeight: number
  strokeBottomWeight: number
  strokeLeftWeight: number
  strokeRightWeight: number
  
  setGridStyleIdAsync(styleId: string): Promise<void>
  readonly isAsset: boolean
  getCSSAsync(): Promise<{ [key: string]: string }>
  getTopLevelFrame(): FrameNode | undefined
}
```

### TextNode

```typescript
interface TextNode extends
  BaseNodeMixin,
  SceneNodeMixin,
  GeometryMixin,
  LayoutMixin,
  BlendMixin,
  ConstraintMixin,
  ExportMixin,
  ReactionMixin {
  
  readonly type: 'TEXT'
  clone(): TextNode
  readonly hasMissingFont: boolean
  
  // 텍스트 정렬
  textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'
  textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM'
  
  // 텍스트 크기 조절
  textAutoResize: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE'
  textTruncation: 'DISABLED' | 'ENDING'
  maxLines: number | null
  
  // 단락
  paragraphIndent: number
  paragraphSpacing: number
  listSpacing: number
  hangingPunctuation: boolean
  hangingList: boolean
  autoRename: boolean
  
  // 텍스트 내용
  characters: string
  insertCharacters(start: number, characters: string, useStyle?: 'BEFORE' | 'AFTER'): void
  deleteCharacters(start: number, end: number): void
  
  // 텍스트 스타일 (전체 또는 mixed)
  fontSize: number | typeof figma.mixed
  fontName: FontName | typeof figma.mixed
  readonly fontWeight: number | typeof figma.mixed
  textCase: TextCase | typeof figma.mixed
  textDecoration: TextDecoration | typeof figma.mixed
  letterSpacing: LetterSpacing | typeof figma.mixed
  lineHeight: LineHeight | typeof figma.mixed
  leadingTrim: LeadingTrim | typeof figma.mixed
  textStyleId: string | typeof figma.mixed
  hyperlink: HyperlinkTarget | null | typeof figma.mixed
  readonly openTypeFeatures: { [feature: string]: boolean } | typeof figma.mixed
  
  // Range 함수들
  getStyledTextSegments<T extends string[]>(fields: T, start?: number, end?: number): StyledTextSegment[]
  
  getRangeFontSize(start: number, end: number): number | typeof figma.mixed
  setRangeFontSize(start: number, end: number, value: number): void
  
  getRangeFontName(start: number, end: number): FontName | typeof figma.mixed
  setRangeFontName(start: number, end: number, value: FontName): void
  getRangeAllFontNames(start: number, end: number): FontName[]
  
  getRangeTextCase(start: number, end: number): TextCase | typeof figma.mixed
  setRangeTextCase(start: number, end: number, value: TextCase): void
  
  getRangeTextDecoration(start: number, end: number): TextDecoration | typeof figma.mixed
  setRangeTextDecoration(start: number, end: number, value: TextDecoration): void
  
  getRangeLetterSpacing(start: number, end: number): LetterSpacing | typeof figma.mixed
  setRangeLetterSpacing(start: number, end: number, value: LetterSpacing): void
  
  getRangeLineHeight(start: number, end: number): LineHeight | typeof figma.mixed
  setRangeLineHeight(start: number, end: number, value: LineHeight): void
  
  getRangeFills(start: number, end: number): Paint[] | typeof figma.mixed
  setRangeFills(start: number, end: number, value: Paint[]): void
  
  getRangeHyperlink(start: number, end: number): HyperlinkTarget | null | typeof figma.mixed
  setRangeHyperlink(start: number, end: number, value: HyperlinkTarget | null): void
  
  getRangeTextStyleId(start: number, end: number): string | typeof figma.mixed
  setRangeTextStyleIdAsync(start: number, end: number, styleId: string): Promise<void>
  
  getRangeFillStyleId(start: number, end: number): string | typeof figma.mixed
  setRangeFillStyleIdAsync(start: number, end: number, styleId: string): Promise<void>
  
  getRangeListOptions(start: number, end: number): TextListOptions | typeof figma.mixed
  setRangeListOptions(start: number, end: number, value: TextListOptions): void
  
  setTextStyleIdAsync(styleId: string): Promise<void>
}
```

### RectangleNode

```typescript
interface RectangleNode extends
  BaseNodeMixin,
  SceneNodeMixin,
  GeometryMixin,
  CornerMixin,
  LayoutMixin,
  BlendMixin,
  ConstraintMixin,
  ExportMixin,
  ReactionMixin {
  
  readonly type: 'RECTANGLE'
  clone(): RectangleNode
  
  // Individual Strokes
  strokeTopWeight: number
  strokeBottomWeight: number
  strokeLeftWeight: number
  strokeRightWeight: number
}
```

### ComponentNode

```typescript
interface ComponentNode extends FrameNode {
  readonly type: 'COMPONENT'
  clone(): ComponentNode
  
  readonly key: string  // 라이브러리 import용
  readonly defaultVariant: ComponentNode | null
  readonly isDefaultVariant: boolean
  
  // Component Properties
  componentPropertyDefinitions: ComponentPropertyDefinitions
  addComponentProperty(name: string, type: ComponentPropertyType, defaultValue: any): string
  editComponentProperty(name: string, newValue: Partial<ComponentPropertyDefinition>): string
  deleteComponentProperty(name: string): void
  
  createInstance(): InstanceNode
}

type ComponentPropertyType = 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT'
```

### InstanceNode

```typescript
interface InstanceNode extends Omit<FrameNode, 'type'> {
  readonly type: 'INSTANCE'
  clone(): InstanceNode
  
  mainComponent: ComponentNode | null
  readonly componentProperties: { [name: string]: ComponentProperty }
  
  setProperties(properties: { [name: string]: any }): void
  resetOverrides(): void
  detachInstance(): FrameNode
  swapComponent(component: ComponentNode): void
  
  readonly scaleFactor: number
  readonly exposedInstances: InstanceNode[]
  readonly isExposedInstance: boolean
  readonly overrides: { id: string, overriddenFields: string[] }[]
}
```

### ComponentSetNode

```typescript
interface ComponentSetNode extends Omit<FrameNode, 'type'> {
  readonly type: 'COMPONENT_SET'
  clone(): ComponentSetNode
  
  readonly key: string
  readonly defaultVariant: ComponentNode
  componentPropertyDefinitions: ComponentPropertyDefinitions
  
  addComponentProperty(name: string, type: ComponentPropertyType, defaultValue: any): string
  editComponentProperty(name: string, newValue: Partial<ComponentPropertyDefinition>): string
  deleteComponentProperty(name: string): void
}
```

### VectorNode

```typescript
interface VectorNode extends
  BaseNodeMixin,
  SceneNodeMixin,
  GeometryMixin,
  CornerMixin,
  LayoutMixin,
  BlendMixin,
  ConstraintMixin,
  ExportMixin,
  ReactionMixin {
  
  readonly type: 'VECTOR'
  clone(): VectorNode
  
  vectorNetwork: VectorNetwork
  vectorPaths: VectorPaths
  handleMirroring: HandleMirroring
}
```

### GroupNode

```typescript
interface GroupNode extends
  BaseNodeMixin,
  SceneNodeMixin,
  ChildrenMixin,
  LayoutMixin,
  BlendMixin,
  ExportMixin,
  ReactionMixin {
  
  readonly type: 'GROUP'
  clone(): GroupNode
  expanded: boolean
}
```

### PageNode

```typescript
interface PageNode extends BaseNodeMixin, ChildrenMixin, ExportMixin {
  readonly type: 'PAGE'
  clone(): PageNode
  
  backgrounds: ReadonlyArray<Paint>
  readonly selection: ReadonlyArray<SceneNode>
  selectedTextRange: { node: TextNode, start: number, end: number } | null
  flowStartingPoints: ReadonlyArray<{ nodeId: string, name: string }>
  readonly prototypeBackgrounds: ReadonlyArray<Paint>
  guides: ReadonlyArray<Guide>
  readonly isPageDivider: boolean
  
  loadAsync(): Promise<void>  // dynamic-page 모드에서 필요
}
```

### DocumentNode

```typescript
interface DocumentNode extends BaseNodeMixin {
  readonly type: 'DOCUMENT'
  readonly children: ReadonlyArray<PageNode>
  
  appendChild(child: PageNode): void
  insertChild(index: number, child: PageNode): void
  findChildren(callback?: (node: PageNode) => boolean): PageNode[]
  findChild(callback: (node: PageNode) => boolean): PageNode | null
  findAll(callback?: (node: SceneNode) => boolean): SceneNode[]
  findOne(callback: (node: SceneNode) => boolean): SceneNode | null
  findAllWithCriteria<T extends NodeType[]>(criteria: FindAllCriteria<T>): SceneNode[]
}
```

---

## Data Types

### Paint (채우기/획)

```typescript
type Paint = SolidPaint | GradientPaint | ImagePaint | VideoPaint

interface SolidPaint {
  type: 'SOLID'
  color: RGB
  opacity?: number
  visible?: boolean
  blendMode?: BlendMode
  boundVariables?: { color?: VariableAlias }
}

interface GradientPaint {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND'
  gradientTransform: Transform
  gradientStops: ColorStop[]
  opacity?: number
  visible?: boolean
  blendMode?: BlendMode
}

interface ImagePaint {
  type: 'IMAGE'
  imageHash: string | null
  scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE'
  imageTransform?: Transform
  scalingFactor?: number
  rotation?: number
  filters?: ImageFilters
  opacity?: number
  visible?: boolean
  blendMode?: BlendMode
}
```

### Effect (효과)

```typescript
type Effect = DropShadowEffect | InnerShadowEffect | BlurEffect

interface DropShadowEffect {
  type: 'DROP_SHADOW'
  color: RGBA
  offset: Vector
  radius: number
  spread?: number
  visible: boolean
  blendMode: BlendMode
  showShadowBehindNode?: boolean
}

interface InnerShadowEffect {
  type: 'INNER_SHADOW'
  color: RGBA
  offset: Vector
  radius: number
  spread?: number
  visible: boolean
  blendMode: BlendMode
}

interface BlurEffect {
  type: 'LAYER_BLUR' | 'BACKGROUND_BLUR'
  radius: number
  visible: boolean
}
```

### Color

```typescript
interface RGB {
  r: number  // 0-1
  g: number  // 0-1
  b: number  // 0-1
}

interface RGBA extends RGB {
  a: number  // 0-1
}

interface ColorStop {
  position: number  // 0-1
  color: RGBA
}
```

### Transform

```typescript
type Transform = [[number, number, number], [number, number, number]]
// [[m00, m01, m02], [m10, m11, m12]]
// m02 = x position, m12 = y position
```

### Vector/Rect

```typescript
interface Vector {
  x: number
  y: number
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}
```

### Font

```typescript
interface FontName {
  family: string
  style: string
}

interface Font {
  fontName: FontName
}

type TextCase = 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS' | 'SMALL_CAPS_FORCED'
type TextDecoration = 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH'

interface LetterSpacing {
  value: number
  unit: 'PIXELS' | 'PERCENT'
}

interface LineHeight {
  value: number
  unit: 'PIXELS' | 'PERCENT' | 'AUTO'
}

type LeadingTrim = 'NONE' | 'CAP_HEIGHT'
```

### BlendMode

```typescript
type BlendMode =
  | 'PASS_THROUGH'
  | 'NORMAL'
  | 'DARKEN'
  | 'MULTIPLY'
  | 'LINEAR_BURN'
  | 'COLOR_BURN'
  | 'LIGHTEN'
  | 'SCREEN'
  | 'LINEAR_DODGE'
  | 'COLOR_DODGE'
  | 'OVERLAY'
  | 'SOFT_LIGHT'
  | 'HARD_LIGHT'
  | 'DIFFERENCE'
  | 'EXCLUSION'
  | 'HUE'
  | 'SATURATION'
  | 'COLOR'
  | 'LUMINOSITY'
```

### StrokeJoin / StrokeCap

```typescript
type StrokeJoin = 'MITER' | 'BEVEL' | 'ROUND'
type StrokeCap = 'NONE' | 'ROUND' | 'SQUARE' | 'LINE_ARROW' | 'TRIANGLE_ARROW' | 'DIAMOND_FILLED' | 'CIRCLE_FILLED' | 'TRIANGLE_FILLED' | 'WASHI_TAPE_1' | 'WASHI_TAPE_2' | 'WASHI_TAPE_3' | 'WASHI_TAPE_4' | 'WASHI_TAPE_5' | 'WASHI_TAPE_6'
```

### Export Settings

```typescript
interface ExportSettings {
  format: 'JPG' | 'PNG' | 'SVG' | 'PDF'
  suffix?: string
  contentsOnly?: boolean
  constraint?: { type: 'SCALE' | 'WIDTH' | 'HEIGHT', value: number }
}

interface ExportSettingsSVGString {
  format: 'SVG_STRING'
}
```

### Variable Types

```typescript
interface Variable {
  readonly id: string
  name: string
  readonly key: string
  readonly variableCollectionId: string
  resolvedType: VariableResolvedDataType
  
  valuesByMode: { [modeId: string]: VariableValue }
  setValueForMode(modeId: string, value: VariableValue): void
  remove(): void
}

interface VariableCollection {
  readonly id: string
  name: string
  readonly key: string
  modes: { modeId: string, name: string }[]
  defaultModeId: string
  
  addMode(name: string): string
  renameMode(modeId: string, name: string): void
  removeMode(modeId: string): void
  remove(): void
}

type VariableValue = boolean | string | number | RGB | RGBA | VariableAlias

interface VariableAlias {
  type: 'VARIABLE_ALIAS'
  id: string
}

type VariableResolvedDataType = 'BOOLEAN' | 'COLOR' | 'FLOAT' | 'STRING'
```

---

## 노드 타입 판별 예시

```typescript
// type 속성으로 판별
if (node.type === 'FRAME') {
  // node는 FrameNode
}

// findAllWithCriteria 사용
const frames = figma.currentPage.findAllWithCriteria({
  types: ['FRAME', 'COMPONENT']
})

// 여러 타입 체크
function isContainer(node: SceneNode): node is FrameNode | GroupNode | ComponentNode {
  return ['FRAME', 'GROUP', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'].includes(node.type)
}
```
