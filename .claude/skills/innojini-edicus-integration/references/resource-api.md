# Edicus Resource API Reference

## Base URL
```
https://resource-dot-edicusbase.appspot.com
```

## 공통 사항

### Headers
```
edicus-api-key: {API_KEY}
```

**주의**: 서버에서만 호출 (브라우저 금지)

---

## Product API

### Get Product List
전체 상품 및 카테고리 목록

```
GET /resapi/product/list
```

**Response**
```json
{
  "prodCates": [
    { "cateCode": "NC", "dpName": "명함" },
    { "cateCode": "MB", "dpName": "머그컵" }
  ],
  "products": [
    {
      "prodCode": "NC",
      "dpName": "명함",
      "cateCode": "NC",
      "editor": "template",
      "template_option": {...},
      "print_option": {...},
      "userData": "",
      "sizes": [...]
    }
  ]
}
```

### Product 타입 정의

```typescript
interface Product {
  prodCode: string;
  dpName: string;
  cateCode: string;
  editor: 'template' | 'print';
  template_option: TemplateProductOption;
  print_option: PrintProductOption;
  userData: string;
  sizes: ProductSize[];
}

interface TemplateProductOption {
  // Page Option
  cover: boolean;              // 커버 유무
  splitPage: boolean;          // 페이지 분리
  doubleSide: boolean;         // 양면 상품
  multiPage: boolean;          // 복수 페이지
  minContentPage: number;      // 최소 페이지 수
  maxContentPage: number;      // 최대 페이지 수
  pageMenu: boolean;           // 스토리보드 페이지 메뉴

  // Tab Option
  photoTab: boolean;
  templateTab: boolean;
  backgroundTab: boolean;
  layoutTab: boolean;
  stickerTab: boolean;
  maskTab: boolean;
  textTab: boolean;
  cutoutTab: boolean;

  // Feature Option
  autoImport: boolean;         // 사진 자동 넣기
  effectCellUI: boolean;       // 효과 기능
  borderCellUI: boolean;       // 테두리 기능
  staticCellUI: boolean;       // 이동/순서/복사/삭제
  optionChange: boolean;       // 옵션 변경 버튼
  initialZoom: 'fill' | '100%';
}

interface PrintProductOption {
  ui_paperType: boolean;
  ui_rendition: boolean;
  ui_showBorder: boolean;
  ui_showDate: boolean;
  ui_autoAdjust: boolean;
  def_paperType: string;
  def_rendition: string;
  def_showBorder: boolean;
  def_showDate: boolean;
  def_autoAdjust: boolean;
  fixedOrientation: boolean;
}

interface ProductSize {
  sizeCode: string;
  dpName: string;
  refDPI: number;              // 권장 DPI
  lowDPI: number;              // 화질 경고 기준 DPI
  editorMargin_mm: { width: number; height: number };
  pageInfos: ProductPageInfo[];
  printInfo: ProductPrintInfo;
}

interface ProductPageInfo {
  pageType: string;
  width_mm: number;
  height_mm: number;
  cutMargin_mm: { width: number; height: number };
}

interface ProductPrintInfo {
  width_mm: number;
  height_mm: number;
  borderLeft_mm: number;
  borderTop_mm: number;
  borderRight_mm: number;
  borderBottom_mm: number;
  borderColor: string;
  borderRound_mm: number;
}
```

### Get Product
특정 상품 정보

```
GET /resapi/product/:prod_code
```

**Response**
```json
{ "product": {...} }
```

### Set Product Userdata
상품 userData 업데이트

```
GET /resapi/product/userdata/:product_id
```

**Request Body**
```json
{ "userdata": "custom data string" }
```

---

## Template API

### Issue Resource Token
템플릿 등록용 토큰 발급

```
GET /resapi/token
```

**Response**
```json
{ "token": "eyJhbGciOiJIUzI1NiIs..." }
```

이 토큰을 `token.jwt` 파일로 저장하여 템플릿 패키지에 포함

### Upload Template Package
템플릿 패키지 업로드 (32MB 이하)

```
POST /resapi/package
```

**Headers**
```
edicus-api-key: {API_KEY}
download-json: true  // optional, doc JSON 반환
```

**Form Data**
- 템플릿 파일들 (인디자인 JSON, 이미지 등)
- metadata.json

**metadata.json**
```json
{
  "template_type": "mot1-indd-json",
  "partner_code": "mot1",
  "ps_codes": ["150x300@MB"],
  "tags": [],
  "generate_layout": true,
  "cell_movable": false,
  "sticker_movable": false,
  "sticker_selectable": true,
  "post_layer": ["Scodix"]
}
```

**Response**
```json
{
  "template_uri": "gcs://template/partners/motion1/res/template/284.json",
  "template_dp_url": "https://...",
  "layout_uris": [],
  "res_uris": [],
  "doc": "...",  // download-json: true일 때
  "unregistered_fonts_found": [
    { "familyName": "Arial", "typeStyle": "Bold" }
  ]
}
```

### Get Upload URL (대용량)
32MB 초과 템플릿용 업로드 URL 발급

```
GET /resapi/pkg-upload-url
```

**Response**
```json
{
  "upload_url": "https://storage.googleapis.com/...",
  "filename": "SyGN0Dge3D.zip"
}
```

발급받은 URL에 ZIP 파일 업로드 후 `/resapi/pkg-uploaded` 호출

### Template Package Uploaded
대용량 업로드 완료 알림

```
POST /resapi/pkg-uploaded
```

**Headers**
```
edicus-api-key: {API_KEY}
filename: {GET에서 받은 filename}
```

### Preview Template
템플릿 미리보기 SVG 생성

```
POST /resapi/preview
```

**Form Data**: 템플릿 파일들

**Response**
```json
{
  "pageInfos": [
    {
      "svg": "<?xml version=\"1.0\"...",
      "layers": [{ "type": "...", "svg": "..." }]
    }
  ],
  "unregistered_fonts_found": [...],
  "unresolved_font_group_ids": [...]
}
```

---

## Query API

### Query Resource
리소스 검색

```
POST /resapi/query
```

**Request Body**
```json
{
  "option": {
    "type": "template",
    "visibilities": ["public", "private"],
    "order": "asc",
    "limit": 30,
    "tags": [],
    "psCodes": ["150x300@MB"]
  }
}
```

**Response**
```json
{
  "items": [
    {
      "id": 284,
      "type": "template",
      "visibility": "public",
      "psCodes": ["150x300@MB"],
      "dpUri": "https://...",
      "resUri": "gcs://...",
      "pageType": "content",
      "itemCount": 4,
      "tags": []
    }
  ]
}
```

### Resource 타입 정의
```typescript
interface Resource {
  id: number;
  type: 'template' | 'background' | 'layout' | 'sticker' | 'mask' | 'guide';
  visibility: 'public' | 'private' | 'deleted';
  deletedTime: string;
  psCodes: string[];
  dpUri: string;
  dpWidth: number;
  dpHeight: number;
  resUri: string;
  resWidth: number;
  resHeight: number;
  valueUri: string;
  pageType: string;
  itemCount: number;
  userData: string;
  userDataGen: string;
  tags: string[];
}
```

### Query Resource Count
리소스 개수 조회

```
POST /resapi/query/count
```

요청/응답은 Query Resource와 동일

### Get User Resource URLs
프로젝트에 사용된 사용자 이미지 목록

```
POST /manapi/project/get_user_rsc_urls
```

**Request Body**
```json
{
  "user_id": "uid-xxx",
  "project_id": "-Kzcs...",
  "size_tag": "edit",
  "limit": 10
}
```
