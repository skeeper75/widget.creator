# Code Connect Guide

## 개요

Code Connect는 Figma 디자인 시스템 컴포넌트를 실제 코드베이스와 연결합니다. Dev Mode에서 자동 생성 코드 대신 실제 프로덕션 코드 스니펫을 표시합니다.

## 요구사항

- Figma Organization 또는 Enterprise 플랜
- Full Design 또는 Dev Mode 시트
- Node.js 16+

## CLI 설정

### 설치
```bash
npm install @figma/code-connect
# 또는
yarn add @figma/code-connect
```

### Personal Access Token 생성
1. Figma > Settings > Personal access tokens
2. "Generate new token" 클릭
3. Code Connect 스코프 선택
4. 토큰 복사 및 안전하게 저장

### 환경 변수 설정
```bash
export FIGMA_ACCESS_TOKEN="your-token-here"
```

### 인터랙티브 설정
```bash
npx figma connect create --token $FIGMA_ACCESS_TOKEN
```

## React 연결

### 기본 연결
```tsx
// Button.figma.tsx
import figma from '@figma/code-connect/react'
import { Button } from './Button'

figma.connect(Button, 'https://www.figma.com/file/abc123/Design-System?node-id=1:2')
```

### 속성 매핑
```tsx
figma.connect(Button, 'https://figma.com/...', {
  props: {
    // 문자열 속성
    label: figma.string('Label'),
    
    // 불리언 속성
    disabled: figma.boolean('Disabled'),
    
    // 기본값이 있는 불리언
    isLoading: figma.boolean('Loading', { true: true, false: false }),
    
    // 열거형 속성
    variant: figma.enum('Variant', {
      'Primary': 'primary',
      'Secondary': 'secondary',
      'Danger': 'danger'
    }),
    
    // 크기 열거형
    size: figma.enum('Size', {
      'Large': 'lg',
      'Medium': 'md',
      'Small': 'sm'
    }),
    
    // 인스턴스 스왑 (아이콘 등)
    icon: figma.instance('Icon'),
    
    // 텍스트 레이어 콘텐츠
    buttonText: figma.textContent('Button Label'),
    
    // 자식 요소
    children: figma.children('Content')
  },
  
  example: ({ label, variant, size, disabled, icon, buttonText }) => (
    <Button 
      variant={variant}
      size={size}
      disabled={disabled}
      leftIcon={icon}
    >
      {buttonText || label}
    </Button>
  )
})
```

### 변형 제한 (Variant Restrictions)
하나의 Figma 컴포넌트가 여러 코드 컴포넌트에 매핑될 때:
```tsx
// Primary 버튼
figma.connect(PrimaryButton, 'https://figma.com/...', {
  variant: { Type: 'Primary' },
  example: () => <PrimaryButton />
})

// Secondary 버튼
figma.connect(SecondaryButton, 'https://figma.com/...', {
  variant: { Type: 'Secondary' },
  example: () => <SecondaryButton />
})

// 여러 조건
figma.connect(IconButton, 'https://figma.com/...', {
  variant: { Type: 'Icon', Size: 'Small' },
  example: () => <IconButton />
})
```

### 클래스명 조합
```tsx
figma.connect('https://figma.com/...', {
  props: {
    className: figma.className([
      'btn',
      figma.enum('Size', { Large: 'btn-lg', Medium: 'btn-md' }),
      figma.enum('Variant', { Primary: 'btn-primary' }),
      figma.boolean('Disabled', { true: 'btn-disabled', false: '' })
    ])
  },
  example: ({ className }) => <button className={className}>Click</button>
})
```

### 네이티브 HTML 요소
```tsx
// React 컴포넌트 없이 HTML 태그 직접 연결
figma.connect('https://figma.com/...', {
  example: () => <button className="btn">Click me</button>
})
```

## HTML (Vue, Angular, Web Components)

### 기본 연결
```ts
// button.figma.ts
import figma from '@figma/code-connect/html'

figma.connect('https://figma.com/...', {
  props: {
    variant: figma.enum('Variant', {
      'Primary': 'primary',
      'Secondary': 'secondary'
    })
  },
  example: ({ variant }) => `
    <my-button variant="${variant}">Click me</my-button>
  `
})
```

### Vue 예시
```ts
figma.connect('https://figma.com/...', {
  props: {
    label: figma.string('Label'),
    disabled: figma.boolean('Disabled')
  },
  example: ({ label, disabled }) => `
    <Button 
      :disabled="${disabled}"
    >
      ${label}
    </Button>
  `
})
```

### Angular 예시
```ts
figma.connect('https://figma.com/...', {
  props: {
    label: figma.string('Label'),
    variant: figma.enum('Variant', { Primary: 'primary' })
  },
  example: ({ label, variant }) => `
    <app-button [variant]="'${variant}'">
      ${label}
    </app-button>
  `
})
```

## SwiftUI

```swift
// Button.figma.swift
import Figma

struct Button_figma: FigmaConnect {
    let component = Button.self
    let figmaNodeUrl = "https://figma.com/..."
    
    var body: some View {
        Button(
            variant: figma.enum("Variant", [
                "Primary": .primary,
                "Secondary": .secondary
            ]),
            disabled: figma.boolean("Disabled")
        )
    }
}
```

## Jetpack Compose

```kotlin
// Button.figma.kt
import com.figma.code.connect.*

@FigmaConnect(
    url = "https://figma.com/..."
)
class ButtonConnect {
    @FigmaProperty("Variant")
    val variant: ButtonVariant = ButtonVariant.PRIMARY
    
    @FigmaProperty("Disabled")
    val disabled: Boolean = false
    
    fun example() = Button(
        variant = variant,
        enabled = !disabled
    )
}
```

## Storybook 통합

Code Connect는 기존 Storybook 파일과 통합됩니다:

```tsx
// Button.stories.tsx
import { Button } from './Button'

export default {
  component: Button,
  parameters: {
    figma: {
      component: 'https://figma.com/file/abc/DS?node-id=1:2'
    }
  }
}
```

## 설정 파일

### figma.config.json
```json
{
  "codeConnect": {
    "include": ["src/**/*.figma.tsx"],
    "exclude": ["**/node_modules/**"],
    "documentUrlSubstitutions": {
      "DESIGN_SYSTEM_FILE": "https://figma.com/file/abc123"
    }
  }
}
```

## CLI 명령어

### 파싱 (로컬 테스트)
```bash
npx figma connect parse
```

### 게시
```bash
npx figma connect publish --token $FIGMA_ACCESS_TOKEN
```

### 특정 파일만 게시
```bash
npx figma connect publish --dir src/components
```

### 연결 삭제
```bash
# 특정 노드의 특정 라벨 삭제
npx figma connect unpublish \
  --node "https://figma.com/file/abc?node-id=1:2" \
  --label "React"

# 모든 연결 삭제 (주의!)
npx figma connect unpublish
```

### 드라이 런
```bash
npx figma connect publish --dry-run
```

## 아이콘 자동화

대량의 아이콘 연결 스크립트:
```typescript
// scripts/generate-icon-connections.ts
import figma from '@figma/code-connect/react'
import * as Icons from '../icons'

const ICON_FILE_URL = 'https://figma.com/file/abc/Icons'

// 아이콘 목록 순회
Object.entries(Icons).forEach(([name, Icon]) => {
  const nodeId = getNodeIdForIcon(name) // 매핑 로직
  
  figma.connect(Icon, `${ICON_FILE_URL}?node-id=${nodeId}`, {
    example: () => <Icon />
  })
})
```

## CI/CD 통합

### GitHub Actions
```yaml
# .github/workflows/code-connect.yml
name: Publish Code Connect

on:
  push:
    branches: [main]
    paths:
      - 'src/**/*.figma.tsx'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npx figma connect publish
        env:
          FIGMA_ACCESS_TOKEN: ${{ secrets.FIGMA_TOKEN }}
```

## 문제 해결

### 속성 불일치
- Figma 속성명과 코드 속성명이 다를 때 명시적 매핑 필요
- `figma connect parse` 출력에서 누락된 속성 확인

### 타입 오류
```tsx
// 타입 명시
figma.instance<React.ReactElement>('Icon')
figma.enum<'primary' | 'secondary'>('Variant', {...})
```

### 연결 업데이트 안됨
1. `npx figma connect parse` 로 구문 확인
2. 캐시 삭제: `rm -rf node_modules/.cache`
3. 재게시: `npx figma connect publish`

## 모범 사례

1. **파일 위치**: 컴포넌트 옆에 `.figma.tsx` 파일 배치
2. **일관된 네이밍**: `ComponentName.figma.tsx`
3. **문서화**: example에 실제 사용 사례 반영
4. **버전 관리**: Code Connect 파일도 Git에 포함
5. **CI 통합**: 자동 게시로 동기화 유지
