# Edicus JavaScript SDK Reference

## 설치

```html
<script src="edicus-sdk-v2.js"></script>
```

## 초기화

```javascript
const editor = window.edicusSDK.init({
  base_url: "https://..."  // optional, 기본값 사용
});
```

---

## 프로젝트 생성

### create_project

새 프로젝트 생성 및 편집기 열기

```javascript
editor.create_project(params, callback);
```

**params**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| parent_element | DOM | ✅ | 편집기 iframe이 추가될 DOM 요소 |
| partner | string | ✅ | 파트너 ID |
| token | string | ✅ | JWT 토큰 |
| ps_code | string | ✅ | 상품+사이즈 코드 (예: 90x50@NC) |
| template_uri | string | ✅ | 템플릿 URI |
| title | string | | 프로젝트 제목 |
| mobile | boolean | | 모바일 UI (기본: false) |
| lang | string | | 언어 (ko/ja/en, 기본: ko) |
| ui_locale | string | | UI 로케일 |
| div | string | | division code (기본: host) |
| run_mode | string | | 'standard' / 'passive' |
| edit_mode | string | | 'standard' / 'design' |
| num_page | number | | 포토북 내지 스프레드 수 |
| max_page | number | | 최대 페이지 수 |
| min_page | number | | 최소 페이지 수 |
| cal_date | string | | 달력 시작 날짜 (예: '2025-1') |
| private_css | string | | CSS 오버라이드 |
| clear_src | string | | item default src 삭제 ("cell") |
| no_update | boolean | | true면 저장 대신 '나가기' 버튼 |

**callback(err, data)**
```javascript
// 프로젝트 생성 성공
{ type: "from-edicus", action: "project-id-created", info: { project_id: "-Kti..." } }

// 편집 완료
{ type: "from-edicus", action: "goto-cart" }
{ type: "from-edicus", action: "close" }

// 토큰 재발급 필요
{ type: "from-edicus", action: "request-user-token" }

// 도움말 요청 (모바일)
{ type: "from-edicus", action: "request-help-message", info: { case: "photo-import" } }
```

**예시**
```javascript
editor.create_project({
  parent_element: document.getElementById('editor'),
  partner: 'my-partner',
  token: 'eyJhbGciOi...',
  ps_code: '90x50@NC',
  template_uri: 'gcs://template/partners/xxx/res/template/100.json',
  title: '내 명함'
}, (err, data) => {
  if (data.action === 'project-id-created') {
    console.log('생성된 프로젝트:', data.info.project_id);
  }
  if (data.action === 'goto-cart') {
    // 편집 완료 → 장바구니 이동
  }
  if (data.action === 'request-user-token') {
    // 토큰 재발급 후 전송
    getNewToken().then(token => {
      editor.post_to_editor('send-user-token', { token });
    });
  }
});
```

---

## 프로젝트 열기

### open_project

저장된 프로젝트 편집기로 열기

```javascript
editor.open_project(params, callback);
```

**params**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| parent_element | DOM | ✅ | 편집기 iframe이 추가될 DOM 요소 |
| partner | string | | 파트너 ID |
| token | string | ✅ | JWT 토큰 |
| prjid | string | ✅ | 프로젝트 ID |
| mobile | boolean | | 모바일 UI |
| lang | string | | 언어 |
| run_mode | string | | 'standard' / 'passive' / 'preview' |
| edit_mode | string | | 'standard' / 'design' |
| no_update | boolean | | 저장 기능 제어 |

**예시**
```javascript
editor.open_project({
  parent_element: document.getElementById('editor'),
  prjid: '-Kti4dGm3_I6iyZSpB5n',
  token: 'eyJhbGciOi...'
}, (err, data) => {
  if (data.action === 'goto-cart') {
    console.log('편집 완료');
  }
});
```

---

## 편집기 제어

### close
편집기 닫기

```javascript
editor.close({ parent_element: el });
```

### destroy
SDK 리소스 해제

```javascript
editor.destroy({ parent_element: el });
```

### change_project
열린 편집기에서 다른 프로젝트로 변경

```javascript
editor.change_project({ project_id: "-LEnOT..." });
```

### change_template
열린 편집기에서 템플릿 변경

```javascript
editor.change_template({
  ps_code: "90x50@NC",
  template_uri: "gcs://template/partners/xxx/res/template/200.json"
});
```

---

## 템플릿 수정 모드

### edit_template

템플릿 수정 모드로 편집기 열기 (리소스 업데이트 가능)

```javascript
editor.edit_template({
  parent_element: el,
  token: 'staff-token',  // 스태프 토큰 필요
  ps_code: '90x50@NC',
  template_uri: 'gcs://...',
  div: 'host',
  lang: 'ko'
}, callback);
```

---

## 패시브 모드

편집기 캔버스만 표시하고 외부 UI와 연동

### 활성화
```javascript
editor.create_project({ ..., run_mode: 'passive' }, callback);
editor.open_project({ ..., run_mode: 'passive' }, callback);
```

### post_to_editor

편집기로 메시지 전송

```javascript
editor.post_to_editor(action, info);
```

**Actions**

| action | info | 설명 |
|--------|------|------|
| `command` | `{ type: 'undo' }` | Undo |
| `command` | `{ type: 'redo' }` | Redo |
| `command` | `{ type: 'save', force_save: true }` | 저장 |
| `add-image` | `{ src_type: 'file-input', method: 'add', item_type: 'sticker' }` | 이미지 추가 |
| `add-text` | `{ name: '_text_001_', feature: 'var:text', data: { text: '입력', font_size: 10, align: 'left' } }` | 텍스트 추가 |
| `var-changed` | `{ name, feature, data: { text }, item_id, page_id, page_index }` | 변수 변경 |
| `send-user-token` | `{ token: 'new-token' }` | 토큰 재전송 |
| `request-feature` | `{ feature: 'promo-window', option: {...} }` | 기능 요청 |

**command.type 값**
- `undo`, `redo`, `save`, `exit`

**src_type 값**
- `file-input`: 파일 입력
- `url`: URL

**method 값**
- `add`: 추가
- `replace`: 교체

### 콜백 메시지

패시브 모드에서 수신되는 콜백 데이터

**load-project-report / change-project-report**
```javascript
{ action: "load-project-report", info: { status: "start" | "end" | "error", project_id, error } }
```

**project-id-created**
```javascript
{ action: "project-id-created", info: { project_id } }
```

**doc-changed**
```javascript
{ action: "doc-changed", info: { ps_code, page_count, vdp_catalog } }
```

**save-doc-report**
```javascript
// 일반 상품
{
  action: "save-doc-report",
  info: {
    status: "end",
    docInfo: {
      projectID, docRevision, totalPageCount, contentPageCount,
      totalCellCount, emptyCellCount, lowResCellCount,
      vdpList, tnUrlList, usedFontsList, unresolvedFontsList
    }
  }
}

// 사진인화
{
  action: "save-doc-report",
  info: {
    status: "end",
    docInfo: {
      projectID, docRevision, totalPrintCount, totalOrderCount,
      paperType, lowResPrintCount, tnUrlList, prints
    }
  }
}
```

**page-changed**
```javascript
{ action: "page-changed", info: { page_index, page_type } }
```

**state-history**
```javascript
{ action: "state-history", info: { can_undo, can_redo, doc_dirty } }
```

**var-added / var-deleted / var-changed**
```javascript
{
  action: "var-changed",
  info: {
    item_type, path: { item_id, page_id, page_index },
    variable: { type, id, title, group_id, extra },
    data: { text }, state: { enable }
  }
}
```

---

## 썸네일 뷰어 (TnView)

저장된 프로젝트의 썸네일 표시

### open_tnview

```javascript
editor.open_tnview({
  parent_element: el,
  token: 'JWT',
  prjid: '-Kti...',
  npage: 2,              // 한 화면에 표시할 페이지 수
  flow: 'horizontal'     // horizontal / vertical
}, callback);
```

### 페이지 이동

```javascript
editor.post_to_tnview('move-page', { direction: 'next' }); // 또는 'prev'
// 또는
editor.move_page_tnview('next');
```

### VDP 데이터 주입

```javascript
editor.set_variable_data_row({
  cols: [
    { id: 'name', value: { text: '홍길동' }, shrink: true },
    { id: 'title', value: { text: '대리' } }
  ]
});
```

**shrink 옵션**: 텍스트박스 폭에 맞춰 장평 자동 조정

---

## 미리보기 모드

### open_preview

```javascript
editor.open_preview({
  parent_element: el,
  partner: 'partner-id',
  uid: 'user-id',
  prjid: '-Kti...',
  npage: 2,              // 숫자 또는 'auto'
  flow: 'horizontal'     // horizontal / vertical / grid:{size}
}, (err, data) => {
  if (data.type === 'from-edicus-preview' && data.action === 'close') {
    // back button 클릭
    editor.destroy({ parent_element: el });
  }
});
```

### 페이지 이동

```javascript
editor.post_to_preview('move-page', { direction: 'prev' });
editor.post_to_preview('move-page', { direction: 'next' });
```

---

## 프로젝트 재활용

### recycle_project

기존 프로젝트 기반 새 프로젝트 생성 (사용자 사진 제거)

```javascript
editor.recycle_project({
  parent_element: el,
  partner: 'partner-id',
  token: 'JWT',
  prjid: '-Kti...',  // 원본 프로젝트
  title: '새 제목',
  mobile: false,
  lang: 'ko'
}, callback);
```

콜백은 `create_project`와 동일

---

## 타입 정의

### VariableDataSet
```typescript
interface VariableDataSet {
  rows: VariableDataRow[];
}

interface VariableDataRow {
  cols: VariableData[];
}

interface VariableData {
  id: string;
  value: { text: string };
  shrink?: boolean;  // 장평 자동 조정
}

interface VariableInfo {
  type: string;      // 'input' | 'select'
  id: string;
  title: string;
  group_id: string;
  extra: any;
}

interface ItemPath {
  item_id: number;
  page_id: number;
  page_index: number;
}
```

---

## 주의사항

1. **브라우저 back/forward**: 편집기 iframe은 브라우저 네비게이션으로 복원되지 않음
2. **토큰 만료**: `request-user-token` 콜백 처리 필수
3. **주문된 프로젝트**: 편집기로 열어도 주문 정보는 변경 안 됨
4. **multi-line**: 패시브 모드에서 지원 안 함
