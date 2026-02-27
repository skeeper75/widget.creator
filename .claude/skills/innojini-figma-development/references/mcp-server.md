# Figma MCP Server Integration Guide

## 개요

Figma MCP (Model Context Protocol) Server는 AI 코딩 도구에 Figma 디자인 컨텍스트를 제공합니다. Cursor, VS Code, Claude Code, Windsurf 등과 통합됩니다.

## 연결 방식

### Remote Server (권장)
- Figma Desktop 앱 불필요
- OAuth 인증
- URL: `https://mcp.figma.com/mcp`

### Desktop Server
- Figma Desktop 앱 필요
- 로컬 실행
- URL: `http://127.0.0.1:3845/mcp`

## Remote Server 설정

### Cursor

**방법 1: Deep Link (권장)**
1. https://cursor.com/settings 에서 MCP 설정
2. Figma MCP 추가 후 OAuth 인증

**방법 2: 수동 설정**
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

### Claude Code
```bash
# MCP 서버 추가
claude mcp add --transport http figma https://mcp.figma.com/mcp

# 인증
# Claude Code에서 /mcp 입력 후 figma 선택 > Authenticate
```

### VS Code
```json
// .vscode/mcp.json 또는 ~/.vscode/mcp.json
{
  "servers": {
    "figma": {
      "type": "http",
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

### Windsurf
```json
// MCP 설정 파일
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

## Desktop Server 설정

### 1. Desktop App에서 활성화
1. Figma Desktop 앱 실행
2. Dev Mode 진입
3. Inspect 패널에서 "Enable desktop MCP server" 클릭
4. 서버 상태 확인: `http://127.0.0.1:3845/mcp`

### 2. 클라이언트 설정

**Cursor**
```json
// ~/.cursor/mcp.json
{
  "mcpServers": {
    "figma-desktop": {
      "url": "http://127.0.0.1:3845/mcp"
    }
  }
}
```

**VS Code**
1. `⌘ Shift P` > "MCP: Add Server"
2. HTTP 선택
3. URL: `http://127.0.0.1:3845/mcp`
4. Server ID: `figma-desktop`

### Desktop Server 설정 옵션
Figma > Preferences > Desktop MCP server settings:

- **Local server**: localhost 이미지 링크 사용
- **Download assets**: 이미지 자동 다운로드
- **Placeholders**: 이미지 대신 플레이스홀더 (deprecated)

## MCP Tools

### 핵심 도구
| Tool | 설명 |
|------|------|
| `get_figma_data` | 선택한 노드의 디자인 데이터 |
| `get_code` | 프레임의 코드 생성 |
| `get_variables` | 디자인 토큰/변수 추출 |
| `get_components` | 컴포넌트 정보 조회 |

### 컨텍스트 제공 방식

**1. 선택 기반 (Desktop Server)**
```
프롬프트: "Implement my current Figma selection"
```

**2. URL 기반**
```
프롬프트: "Generate code for https://figma.com/file/abc?node-id=1:2"
```

**3. 변수 추출**
```
프롬프트: "Extract all design tokens from this file"
```

## 효과적인 프롬프트

### 기본 코드 생성
```
Implement this Figma design using React and Tailwind CSS.
Use semantic HTML and ensure accessibility.
```

### 컴포넌트 매칭
```
Generate code for this design. Match it to our existing 
component library in src/components if possible.
```

### 변수 사용
```
Extract the design tokens and generate CSS variables.
Then implement the component using those variables.
```

### 반응형 구현
```
Implement this design as a responsive component.
It should work on mobile (375px), tablet (768px), and desktop (1440px).
```

### 디자인 시스템 적용
```
Generate code for this design using our design system.
Check Code Connect for component mappings.
```

## Code Connect 통합

MCP Server는 Code Connect와 자동 통합됩니다:

1. **컴포넌트 매핑**: Figma 컴포넌트 → 코드 컴포넌트 자동 참조
2. **속성 매핑**: 디자인 속성 → 코드 속성 변환
3. **import 경로**: 정확한 import 문 생성

### Code Connect 활용 프롬프트
```
Implement this design. Use the components from our design system 
as mapped in Code Connect. Don't create new components if 
existing ones can be used.
```

## Make 리소스 연동

Figma Make 파일에서 코드 리소스 추출:
```
Get the Make resources from this prototype and use them 
as the basis for the implementation.
```

## 문제 해결

### 연결 실패
```bash
# 서버 상태 확인 (Desktop)
curl http://127.0.0.1:3845/mcp

# OAuth 재인증 (Remote)
# 클라이언트에서 재연결
```

### 도구 미표시
1. 클라이언트 재시작
2. MCP 설정 파일 확인
3. Figma Desktop 앱 재시작 (Desktop Server)

### 느린 응답
- 작은 프레임 선택
- 복잡한 파일 분리
- 필요한 페이지만 로드

### 500 에러
- API 요청 제한 확인
- 파일 권한 확인
- 토큰 유효성 확인

## Rate Limits

| 플랜 | 제한 |
|------|------|
| Starter (View/Collab) | 월 6회 tool call |
| Professional+ (Dev/Full) | 분당 REST API Tier 1 제한 |

## 보안

- OAuth 2.0 인증
- SOC2 준수
- 데이터는 컨텍스트 제공에만 사용
- 모델 학습에 사용되지 않음

## 모범 사례

### 파일 구조 최적화
1. 페이지당 적절한 프레임 수
2. 명확한 레이어 네이밍
3. 컴포넌트 활용

### 프롬프트 최적화
1. 구체적인 기술 스택 명시
2. 디자인 시스템 참조 요청
3. 접근성 고려 명시

### Code Connect 활용
1. 주요 컴포넌트 연결
2. 속성 매핑 완성
3. CI/CD로 동기화 유지

## 고급 사용 사례

### 커스텀 MCP 서버
직접 MCP 서버를 구현하여 Figma API와 통합:

```typescript
// cursor-talk-to-figma-mcp 참고
import { Server } from '@modelcontextprotocol/sdk/server'

const server = new Server({
  name: 'figma-custom',
  version: '1.0.0'
})

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_figma_frame',
      description: 'Get Figma frame data',
      inputSchema: { type: 'object', properties: { url: { type: 'string' } } }
    }
  ]
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'get_figma_frame') {
    const data = await fetchFigmaData(request.params.arguments.url)
    return { content: [{ type: 'text', text: JSON.stringify(data) }] }
  }
})
```

### Figma Plugin과 MCP 연동
```typescript
// WebSocket으로 플러그인과 MCP 서버 연결
// cursor-talk-to-figma-mcp, claude-talk-to-figma-mcp 참고

// Plugin -> WebSocket Server -> MCP Server -> AI Client
```

## 참고 자료

- 공식 문서: https://developers.figma.com/docs/figma-mcp-server/
- MCP 프로토콜: https://modelcontextprotocol.io/
- MCP 카탈로그: https://www.figma.com/mcp-catalog/
