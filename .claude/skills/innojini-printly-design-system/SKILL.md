---
name: printly-design-system
description: >
  Printly 표준 디자인 시스템. React 아티팩트 및 대시보드 UI 제작 시 일관된 스타일 적용.
  MycomEstimatorV6 기반 5색 팔레트 + NNGroup 컨텍스트 메뉴 가이드라인.
  
  🎨 스타일: "Printly 스타일로", "디자인 시스템 적용", "표준 UI"
  🧩 컴포넌트: "카드", "버튼", "토글", "배지", "컨텍스트 메뉴"
  📐 레이아웃: "대시보드", "사이드바", "스티키바"
---

# Printly Design System Skill

## 개요
Printly 표준 디자인 시스템. React 아티팩트 및 대시보드 UI 제작 시 일관된 스타일 적용.

**기반**: MycomEstimatorV6 (인쇄 견적 시스템) + NNGroup UX 가이드라인

## 트리거 키워드
🎨 스타일: `Printly 스타일로`, `디자인 시스템 적용`, `표준 UI`
🧩 컴포넌트: `카드`, `버튼`, `토글`, `배지`, `패널`, `스티키바`, `컨텍스트 메뉴`
📐 레이아웃: `사이드바 레이아웃`, `그리드`, `반응형`
🎯 사용 시점: React 아티팩트, 대시보드, 견적 시스템, 관리 도구 UI

---

## 핵심 원칙

### 1. 기술 스택
```
- React (함수형 컴포넌트 + Hooks)
- Tailwind CSS (순수 유틸리티 클래스)
- lucide-react (아이콘)
- ⚠️ shadcn/ui import 금지 (Claude.ai 아티팩트에서 실패)
```

### 2. 색상 시스템 (5색 팔레트)
```
Primary   : blue-500    (#3b82f6)  → 주요 액션, 선택 상태
Secondary : emerald-500 (#10b981)  → 성공, 해외/글로벌
Warning   : amber-500   (#f59e0b)  → 경고, 자투리, 옵션
Alert     : red-500     (#ef4444)  → 에러, 절감, 강조
Neutral   : gray-500    (#6b7280)  → 텍스트, 비활성
```

### 3. 타이포그래피 스케일
```css
text-[7px]   /* 극소: 태그 내부 */
text-[8px]   /* 미세: 서브텍스트 */
text-[9px]   /* 초소: 배지, 라벨, 캡션 */
text-[10px]  /* 소: 설명, 메타 정보 */
text-[11px]  /* 중소: 본문 보조 */
text-xs      /* 기본 본문 (12px) */
text-sm      /* 중간 (14px) */
text-base    /* 제목 (16px) */
text-lg      /* 대제목 (18px) */

/* 숫자/코드: font-mono 필수 */
```

### 4. 모서리 반경
```css
rounded-sm   /* 작은 요소 */
rounded      /* 기본 */
rounded-lg   /* 카드, 버튼 */
rounded-xl   /* 패널, 컨테이너 */
rounded-full /* 배지, 토글 */
```

---

## 컴포넌트 레퍼런스

### 헤더 (Sticky Header)
```jsx
<header className="bg-gray-800 text-white px-4 py-2 sticky top-0 z-40 shadow">
  <div className="max-w-7xl mx-auto flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Calculator className="w-4 h-4 text-blue-400" />
      <h1 className="text-sm font-bold">타이틀</h1>
      <span className="text-[9px] bg-gradient-to-r from-blue-500 to-emerald-500 px-1.5 py-0.5 rounded">v2</span>
    </div>
  </div>
</header>
```

### 카드 (Card)
```jsx
{/* 기본 카드 */}
<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
  <div className="p-3">내용</div>
</div>

{/* 선택된 카드 */}
<div className="bg-blue-50 rounded-xl border-2 border-blue-500 shadow-sm">
  <div className="p-3">선택됨</div>
</div>

{/* 컬러 카드 */}
<div className="bg-amber-50 rounded-xl border border-amber-200 p-3">
  <div className="text-amber-700 font-bold">경고/정보</div>
</div>
```

### 버튼 (Button)
```jsx
{/* Primary */}
<button className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors">
  확인
</button>

{/* Secondary */}
<button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
  취소
</button>

{/* Ghost */}
<button className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs">
  더보기
</button>
```

### 배지 (Badge)
```jsx
<span className="text-[7px] bg-blue-500 text-white px-1 rounded">최적</span>
<span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">성공</span>
<span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">경고</span>
<span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">필수</span>
<span className="text-[9px] bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-1.5 py-0.5 rounded">프리미엄</span>
```

### 토글 스위치 (Toggle)
```jsx
function Toggle({ enabled, onChange, label, icon: Icon }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${
      enabled ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
    }`}>
      {Icon && <Icon className={`w-3 h-3 ${enabled ? 'text-blue-600' : 'text-gray-400'}`} />}
      {label && <span className="font-medium text-[10px]">{label}</span>}
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-7 h-3.5 rounded-full transition-colors ${enabled ? 'bg-blue-500' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-3.5' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  );
}
```

### 모드 토글 (Segmented Control)
```jsx
function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
      {[
        { id: 'domestic', label: '국내식', icon: Flag, color: 'text-blue-700' },
        { id: 'international', label: '해외식', icon: Globe, color: 'text-emerald-700' },
      ].map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
            mode === opt.id ? `bg-white ${opt.color} shadow-sm` : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <opt.icon className="w-3 h-3" />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

### 그리드 비용 카드
```jsx
<div className="grid grid-cols-6 gap-1">
  {[
    { label: '용지', value: 50000, sub: '0.5R' },
    { label: 'CTP', value: 28000, sub: '4판' },
    { label: '인쇄', value: 24000, sub: '4회전' },
    { label: '코팅', value: 30000, sub: '양면' },
    { label: '후공정', value: 13000, sub: '×1.0' },
  ].map((item, i) => (
    <div key={i} className="bg-gray-50 p-2 rounded-lg text-center">
      <div className="text-[9px] text-gray-500 mb-0.5">{item.label}</div>
      <div className="font-mono font-bold text-xs">₩{(item.value/1000).toFixed(0)}K</div>
      <div className="text-[8px] text-gray-400">{item.sub}</div>
    </div>
  ))}
  <div className="bg-blue-500 p-2 rounded-lg text-center text-white">
    <div className="text-[9px] opacity-80 mb-0.5">합계</div>
    <div className="font-mono font-bold text-xs">₩145K</div>
  </div>
</div>
```

### 스티키 하단바
```jsx
<div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-xl z-50">
  <div className="max-w-7xl mx-auto px-4 py-2">
    <div className="flex items-center justify-between gap-3">
      {/* 왼쪽: 정보 */}
      <div className="flex items-center gap-3">
        <div>
          <div className="text-[8px] text-gray-400">원가</div>
          <div className="text-sm font-mono font-bold text-gray-600">₩145,000</div>
        </div>
        <div className="flex gap-1">
          <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">옵션A</span>
        </div>
      </div>
      
      {/* 중앙: 슬라이더 */}
      <div className="flex items-center gap-2 flex-1 max-w-xs">
        <span className="text-[10px] text-gray-500">마진</span>
        <input type="range" min="0" max="50" className="flex-1 h-1.5 bg-gray-200 rounded accent-blue-500" />
        <span className="text-xs font-bold text-blue-600 w-8">15%</span>
      </div>
      
      {/* 오른쪽: 최종가 */}
      <div className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-center">
        <div className="text-[8px] opacity-80">견적가</div>
        <div className="text-lg font-bold font-mono">₩166,750</div>
      </div>
    </div>
  </div>
</div>
```

### 알림/정보 박스
```jsx
{/* Blue (정보) */}
<div className="text-[9px] bg-blue-50 border border-blue-200 rounded px-2 py-1 text-blue-700">
  <b>안내:</b> 추가 정보 설명
</div>

{/* Emerald (성공) */}
<div className="text-[9px] bg-emerald-50 border border-emerald-200 rounded px-2 py-1 text-emerald-700">
  <b>완료:</b> 처리되었습니다
</div>

{/* Amber (경고) */}
<div className="text-[9px] bg-amber-50 border border-amber-200 rounded px-2 py-1 text-amber-700">
  <b>주의:</b> 확인이 필요합니다
</div>

{/* Red (에러) */}
<div className="text-[9px] bg-red-50 border border-red-200 rounded px-2 py-1 text-red-700">
  <b>오류:</b> 문제가 발생했습니다
</div>
```

---

## 컨텍스트 메뉴 가이드라인

> NNGroup Research (2025) 기반 - "Designing Effective Contextual Menus: 10 Guidelines"

### 아이콘 유형
| 아이콘 | 이름 | 용도 |
|--------|------|------|
| ⋮ | Kebab (케밥) | 카드/리스트 아이템용 |
| ⋯ | Meatball (미트볼) | 인라인/헤더용 |
| ☰ | Hamburger | ⚠️ **글로벌 네비게이션 전용** |

### 10가지 핵심 규칙

1. **부차적 액션만** - 핵심 기능(저장, 계산)은 직접 노출
2. **근접 배치** - 관련 콘텐츠 바로 옆에 (카드 우상단)
3. **충분한 크기** - 최소 `w-6 h-6`, 대비 `text-gray-600`
4. **관련 액션 그룹화** - 전역 vs 항목별 분리
5. **일관된 동작** - 같은 아이콘 = 같은 기능
6. **구체적 툴팁** - `"견적 옵션: 수정, 복제, 삭제"`
7. **액션 전용** - 콘텐츠 확장은 ChevronDown 사용
8. **최소 3개** - 1-2개면 직접 노출
9. **햄버거 분리** - 글로벌 네비게이션 전용
10. **접근성** - `aria-haspopup`, `aria-expanded`, 키보드 지원

### 컨텍스트 메뉴 컴포넌트
```jsx
function ContextMenu({ items, variant = 'kebab', tooltip, position = 'bottom-right' }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const Icon = variant === 'kebab' ? MoreVertical : MoreHorizontal;
  
  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  const positions = {
    'bottom-right': 'top-full right-0 mt-1',
    'bottom-left': 'top-full left-0 mt-1',
  };
  
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
        aria-label={tooltip || '옵션 메뉴'}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={tooltip}
      >
        <Icon className="w-5 h-5 text-gray-600" />
      </button>
      
      {isOpen && (
        <div className={`absolute ${positions[position]} z-50 min-w-[140px] w-max bg-white rounded-xl border border-gray-200 shadow-lg py-1`}>
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              {item.divider ? (
                <div className="border-t border-gray-100 my-1" />
              ) : (
                <button
                  onClick={() => { item.onClick?.(); setIsOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] text-left whitespace-nowrap transition-colors ${
                    item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.icon && <item.icon className="w-3.5 h-3.5 flex-shrink-0" />}
                  {item.label}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 사용 예시
```jsx
// 카드 내 컨텍스트 메뉴
<div className="absolute top-2 right-2">
  <ContextMenu
    items={[
      { icon: Edit2, label: '수정', onClick: handleEdit },
      { icon: Copy, label: '복제', onClick: handleCopy },
      { icon: Star, label: '즐겨찾기', onClick: handleStar },
      { divider: true },
      { icon: Download, label: 'PDF 내보내기', onClick: handleExport },
      { icon: Share2, label: '공유', onClick: handleShare },
      { divider: true },
      { icon: Trash2, label: '삭제', danger: true, onClick: handleDelete },
    ]}
    variant="kebab"
    tooltip="견적 옵션: 수정, 복제, 삭제 등"
  />
</div>

// 헤더 전역 메뉴
<ContextMenu
  items={[
    { icon: Plus, label: '새 견적', onClick: handleNew },
    { icon: Download, label: '전체 내보내기', onClick: handleExportAll },
    { icon: Settings, label: '설정', onClick: handleSettings },
  ]}
  variant="meatball"
  tooltip="전역 옵션"
/>
```

---

## 레이아웃 패턴

### 기본 대시보드 구조
```jsx
<div className="min-h-screen bg-gray-100 pb-16">
  {/* 헤더 */}
  <header className="bg-gray-800 text-white px-4 py-2 sticky top-0 z-40 shadow">...</header>
  
  {/* 메인 */}
  <main className="max-w-7xl mx-auto p-3">
    <div className="flex gap-3">
      {/* 사이드바 */}
      <aside className="w-64 flex-shrink-0 hidden lg:block">...</aside>
      
      {/* 컨텐츠 */}
      <section className="flex-1 min-w-0">...</section>
    </div>
  </main>
  
  {/* 스티키 하단바 */}
  <div className="fixed bottom-0 left-0 right-0 ...">...</div>
</div>
```

### 탭 네비게이션
```jsx
<div className="bg-white border-b px-2 py-2 flex gap-1 overflow-x-auto">
  {tabs.map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
        activeTab === tab.id ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

---

## 모바일 반응형

```jsx
{/* 터치 친화적 크기 */}
className="min-h-[44px] min-w-[44px]"

{/* 가로 스크롤 */}
className="overflow-x-auto"

{/* 숨김/표시 */}
className="hidden lg:block"  // 모바일 숨김
className="lg:hidden"        // 데스크톱 숨김

{/* 그리드 반응형 */}
className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6"

{/* 플렉스 방향 */}
className="flex flex-col lg:flex-row gap-3"
```

---

## 금지 사항

1. **shadcn/ui import 금지** (Claude.ai 아티팩트에서 실패)
   - ❌ `import { Card } from '@/components/ui/card'`
   - ✅ 순수 Tailwind div로 구현

2. **복잡한 외부 라이브러리 금지**
   - ✅ lucide-react만 사용
   - ✅ recharts (차트 필요시)

3. **브라우저 스토리지 금지**
   - ❌ localStorage, sessionStorage
   - ✅ React state (useState, useReducer)

4. **햄버거 아이콘 오용 금지**
   - ❌ 컨텍스트 메뉴용
   - ✅ 글로벌 네비게이션 전용

---

## 체크리스트

### 컴포넌트 적용
- [ ] 색상 5색 팔레트 사용
- [ ] 타이포그래피 스케일 준수
- [ ] rounded-xl 카드/패널
- [ ] font-mono 숫자 표시

### 컨텍스트 메뉴
- [ ] 3개 이상 액션?
- [ ] 부차적 액션만?
- [ ] 관련 콘텐츠 근처 배치?
- [ ] `w-max whitespace-nowrap` 적용?
- [ ] 구체적 tooltip?

### 접근성
- [ ] aria-label 적용
- [ ] 키보드 네비게이션
- [ ] 터치 타겟 44px

---

## 파일 참조

- `components/context-menu.jsx` - 컨텍스트 메뉴 컴포넌트
- `templates/dashboard.jsx` - 대시보드 템플릿
- `references/color-palette.md` - 색상 팔레트 상세
- `references/nngroup-guidelines.md` - NNGroup 가이드라인 원문 분석
