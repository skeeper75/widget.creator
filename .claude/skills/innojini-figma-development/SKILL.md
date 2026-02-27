---
name: figma-development
description: >
  Comprehensive Figma development toolkit for Plugins, Widgets, Code Connect, and MCP Server integration.
  
  🔹 플러그인: "Figma plugin", "플러그인 개발", "Figma 확장", "Plugin API"
  🔹 위젯: "Figma widget", "FigJam 위젯", "인터랙티브 협업", "Widget API"
  🔹 Code Connect: "Code Connect", "디자인-코드 연결", "Dev Mode 코드", "컴포넌트 매핑"
  🔹 MCP Server: "Figma MCP", "Cursor Figma", "AI 코딩 Figma", "디자인→코드 AI"
  🔹 REST API: "Figma API", "Variables API", "디자인 토큰", "design tokens"
  
  Use when building Figma extensions, connecting design systems to code, or integrating Figma with AI coding tools.
---

# Figma Development Skill

Figma 개발 생태계를 위한 종합 가이드입니다. Plugin, Widget, Code Connect, MCP Server 개발을 지원합니다.

## Quick Decision Tree

```
요청 유형 판단:
├─► "플러그인" / "plugin" ──────────► Plugin Development
├─► "위젯" / "widget" / "FigJam" ──► Widget Development  
├─► "Code Connect" / "코드 연결" ──► Code Connect Guide
├─► "MCP" / "AI 코딩" / "Cursor" ──► MCP Server Setup
└─► "토큰" / "Variables" / "API" ──► REST API / Design Tokens
```

## 1. Plugin Development

### 개요
플러그인은 Figma 에디터 기능을 확장하는 JavaScript/TypeScript 프로그램입니다.

### 프로젝트 초기화
```bash
# 권장: create-figma-plugin 사용
npx create-figma-plugin

# 또는 Figma 앱에서:
# Menu > Plugins > Development > New Plugin...
```

### 기본 구조
```typescript
// code.ts - 플러그인 메인 코드
figma.showUI(__html__, { width: 320, height: 480 })

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-rectangles') {
    const nodes: SceneNode[] = []
    for (let i = 0; i < msg.count; i++) {
      const rect = figma.createRectangle()
      rect.x = i * 150
      rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }]
      figma.currentPage.appendChild(rect)
      nodes.push(rect)
    }
    figma.currentPage.selection = nodes
    figma.viewport.scrollAndZoomIntoView(nodes)
  }
  figma.closePlugin()
}
```

```html
<!-- ui.html - 플러그인 UI -->
<div id="app">
  <input id="count" type="number" value="5">
  <button id="create">Create</button>
</div>
<script>
  document.getElementById('create').onclick = () => {
    const count = parseInt(document.getElementById('count').value, 10)
    parent.postMessage({ pluginMessage: { type: 'create-rectangles', count } }, '*')
  }
</script>
```

### 핵심 API 퀵 레퍼런스
```typescript
// 노드 생성
figma.createFrame()
figma.createRectangle()
figma.createText()
figma.createComponent()
figma.createComponentSet()

// 선택 & 페이지
figma.currentPage
figma.currentPage.selection
figma.root.children  // 모든 페이지

// UI 통신
figma.showUI(__html__)
figma.ui.postMessage(data)
figma.ui.onmessage = (msg) => {}

// 비동기 작업
await figma.loadFontAsync({ family: "Inter", style: "Regular" })
await figma.clientStorage.getAsync('key')
await figma.clientStorage.setAsync('key', value)

// 종료
figma.closePlugin()
figma.closePlugin('완료 메시지')
```

더 상세한 가이드: [references/plugin-development.md](references/plugin-development.md)

---

## 2. Widget Development

### 개요
위젯은 모든 사용자가 볼 수 있고 상호작용할 수 있는 인터랙티브 객체입니다. React와 유사한 선언적 방식으로 개발합니다.

### 프로젝트 초기화
```bash
npm init @figma/widget
```

### 기본 구조
```tsx
const { widget } = figma
const { useSyncedState, AutoLayout, Text, usePropertyMenu } = widget

function MyWidget() {
  const [count, setCount] = useSyncedState('count', 0)
  
  usePropertyMenu([
    {
      itemType: 'action',
      propertyName: 'reset',
      tooltip: 'Reset counter',
    }
  ], ({ propertyName }) => {
    if (propertyName === 'reset') setCount(0)
  })

  return (
    <AutoLayout
      direction="vertical"
      padding={16}
      cornerRadius={8}
      fill="#FFFFFF"
      stroke="#E5E5E5"
      onClick={() => setCount(count + 1)}
    >
      <Text fontSize={24} fontWeight="bold">
        {count}
      </Text>
      <Text fontSize={12} fill="#666">
        Click to increment
      </Text>
    </AutoLayout>
  )
}

widget.register(MyWidget)
```

### 핵심 Hooks
```typescript
// 상태 동기화 (모든 사용자 공유)
const [state, setState] = useSyncedState('key', defaultValue)

// 멀티플레이어 안전 맵
const map = useSyncedMap('mapKey')
map.set('user1', value)
map.get('user1')

// 속성 메뉴
usePropertyMenu(items, handler)

// 사이드 이펙트
useEffect(() => { /* 비동기 작업 */ })

// 위젯 ID
const widgetId = useWidgetId()

// FigJam 전용: 스티커 기능
useStickable()
useStickableHost()
```

### Plugin vs Widget
| 특성 | Plugin | Widget |
|------|--------|--------|
| 가시성 | 실행한 사용자만 | 모든 사용자 |
| 상태 | 세션 기반 | 파일에 저장 |
| UI | iframe 모달 | 캔버스 위 렌더링 |
| 사용 사례 | 자동화, 도구 | 협업, 게임, 투표 |

더 상세한 가이드: [references/widget-development.md](references/widget-development.md)

---

## 3. Code Connect

### 개요
Code Connect는 디자인 시스템 컴포넌트를 실제 코드베이스와 연결합니다.

### CLI 설정 (권장)
```bash
npm install @figma/code-connect

# 인터랙티브 설정
npx figma connect create --token YOUR_TOKEN
```

### React 컴포넌트 연결
```tsx
// Button.figma.tsx
import figma from '@figma/code-connect/react'
import { Button } from './Button'

figma.connect(Button, 'https://figma.com/file/xxx?node-id=1:2', {
  props: {
    label: figma.string('Label'),
    variant: figma.enum('Variant', {
      'Primary': 'primary',
      'Secondary': 'secondary',
    }),
    disabled: figma.boolean('Disabled'),
    icon: figma.instance('Icon'),
    size: figma.enum('Size', {
      'Large': 'lg',
      'Medium': 'md',
      'Small': 'sm',
    }),
  },
  example: ({ label, variant, disabled, icon, size }) => (
    <Button 
      variant={variant} 
      size={size}
      disabled={disabled}
      leftIcon={icon}
    >
      {label}
    </Button>
  ),
})
```

### 게시 명령어
```bash
# 로컬 테스트
npx figma connect parse

# Figma에 게시
npx figma connect publish --token YOUR_TOKEN

# 특정 컴포넌트 삭제
npx figma connect unpublish --node NODE_URL --label React
```

### 속성 매핑 헬퍼
```typescript
figma.string('PropName')           // 문자열 속성
figma.boolean('PropName')          // 불리언 속성
figma.enum('PropName', mapping)    // 열거형 매핑
figma.instance('PropName')         // 인스턴스 스왑
figma.textContent('LayerName')     // 텍스트 레이어 콘텐츠
figma.className([...])             // CSS 클래스 조합
figma.children('SlotName')         // 자식 요소
```

더 상세한 가이드: [references/code-connect.md](references/code-connect.md)

---

## 4. MCP Server Integration

### 개요
Figma MCP Server는 AI 코딩 도구(Cursor, VS Code, Claude Code)에 디자인 컨텍스트를 제공합니다.

### Remote Server 설정 (권장)

#### Cursor
1. Figma MCP deep link 클릭 또는 설정에서 추가
2. OAuth 인증 완료

```json
// ~/.cursor/mcp.json
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

#### Claude Code
```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
# /mcp 명령으로 인증
```

#### VS Code
```json
// mcp.json
{
  "servers": {
    "figma": {
      "type": "http",
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

### Desktop Server 설정
1. Figma Desktop 앱 실행
2. Dev Mode에서 "Enable desktop MCP server" 클릭
3. `http://127.0.0.1:3845/mcp` 로 연결

### 사용 방법
```
# 프레임 선택 후 프롬프트
"Implement my current Figma selection using React and Tailwind"

# URL 기반
"Generate code for this Figma design: [Figma URL]"

# 변수 추출
"Extract all design tokens from this Figma file"
```

더 상세한 가이드: [references/mcp-server.md](references/mcp-server.md)

---

## 5. REST API & Design Tokens

### Variables API
```typescript
// GET: 변수 조회
const response = await fetch(
  `https://api.figma.com/v1/files/${fileKey}/variables/local`,
  { headers: { 'X-Figma-Token': token } }
)

// POST: 변수 생성/수정
await fetch(
  `https://api.figma.com/v1/files/${fileKey}/variables`,
  {
    method: 'POST',
    headers: { 
      'X-Figma-Token': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ variables, variableCollections })
  }
)
```

### Design Tokens 동기화 워크플로우
```bash
# 1. Figma에서 토큰 내보내기 (플러그인 사용)
# 2. Style Dictionary로 변환
style-dictionary build

# 3. 플랫폼별 출력
# CSS: --color-primary: #0066FF;
# iOS: static let colorPrimary = UIColor(...)
# Android: <color name="colorPrimary">#0066FF</color>
```

더 상세한 가이드: [references/design-tokens.md](references/design-tokens.md)

---

## 6. 개발 도구 & 리소스

### 핵심 패키지
```bash
# 플러그인 개발
npm install -D @figma/plugin-typings
npx create-figma-plugin

# 위젯 개발  
npm install -D @figma/widget-typings
npm init @figma/widget

# Code Connect
npm install @figma/code-connect
```

### 유용한 라이브러리
| 라이브러리 | 용도 |
|-----------|------|
| create-figma-plugin | 플러그인/위젯 CLI 툴킷 |
| figma-plugin-ds | Figma 스타일 UI 컴포넌트 |
| @create-figma-plugin/ui | 내장 UI 컴포넌트 |
| style-dictionary | 디자인 토큰 변환 |

### 디버깅
```typescript
// 플러그인 콘솔 로그
console.log('debug:', data)

// Figma DevTools
// View > Development > Open Console
```

### 테스트
```bash
# TypeScript 검증
npx tsc --noEmit

# 빌드 테스트
npm run build

# MCP Inspector
npx @modelcontextprotocol/inspector
```

---

## 참고 문서

### 공식 문서
- Plugin API: https://developers.figma.com/docs/plugins/
- Widget API: https://developers.figma.com/docs/widgets/
- Code Connect: https://developers.figma.com/docs/code-connect/
- MCP Server: https://developers.figma.com/docs/figma-mcp-server/
- REST API: https://developers.figma.com/docs/rest-api/

### 📚 상세 API 레퍼런스 (references/)

**핵심 API 문서** - 실제 개발 시 필수 참조:
- [api-figma-global.md](references/api-figma-global.md) - **figma 글로벌 객체 전체 API** (100+ 메서드)
  - figma.ui, figma.viewport, figma.variables, figma.codegen 등 모든 서브 객체
  - 이벤트 핸들링, 스타일 관리, Team Library
- [api-nodes.md](references/api-nodes.md) - **Node Types 상세 속성** (35+ 노드 타입)
  - FrameNode, TextNode, ComponentNode 등 모든 속성
  - Mixin 인터페이스 (GeometryMixin, LayoutMixin, BlendMixin 등)
  - Data Types (Paint, Effect, Color, Font 등)
- [api-widgets.md](references/api-widgets.md) - **Widget 컴포넌트 전체 Props**
  - AutoLayout, Text, Input, Image 등 모든 컴포넌트
  - useSyncedState, useSyncedMap, usePropertyMenu 등 Hooks
  - 이벤트, 스타일, 애니메이션

**개발 가이드**:
- [plugin-development.md](references/plugin-development.md) - 플러그인 개발 심화
- [widget-development.md](references/widget-development.md) - 위젯 개발 심화
- [code-connect.md](references/code-connect.md) - Code Connect 전체 가이드
- [mcp-server.md](references/mcp-server.md) - MCP 서버 통합
- [design-tokens.md](references/design-tokens.md) - 디자인 토큰 워크플로우

### 🛠️ 템플릿 (templates/)

복사해서 바로 사용할 수 있는 보일러플레이트 코드:
- [plugin-templates.md](templates/plugin-templates.md) - **13개 플러그인 템플릿**
  - 기본 플러그인, UI 포함, 텍스트/이미지/컴포넌트 생성
  - Variables, clientStorage, Dev Mode Codegen
  - create-figma-plugin 설정
- [widget-templates.md](templates/widget-templates.md) - **10개 위젯 템플릿**
  - 카운터, 투표, To-Do, 입력 폼
  - 이미지 갤러리, 타이머, 테마 전환
  - useSyncedMap, usePropertyMenu 활용 예제

### TypeScript 타입 정의
```bash
# 최신 타입 정의 설치
npm install --save-dev @figma/plugin-typings  # 플러그인용
npm install --save-dev @figma/widget-typings  # 위젯용
```

VSCode에서 자동완성 및 타입 검사 활성화됨.
