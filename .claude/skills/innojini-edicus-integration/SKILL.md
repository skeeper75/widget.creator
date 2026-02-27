---
name: innojini-edicus-integration
description: Edicus 플랫폼(모션원) 연동 전문 스킬. 온라인 편집기 기반 맞춤형 인쇄물(포토북, 명함, 스티커 등) 주문 시스템 구현 시 사용. JS SDK 초기화, Server API 호출, 주문 workflow 연동, 렌더링 처리 필요 시 자동 활성화.
version: 1.0.0
category: domain
modularized: false
user-invocable: false
status: active
updated: 2025-01-19
tags: ["edicus", "모션원", "편집기", "포토북", "명함", "인쇄", "주문시스템"]
allowed-tools: Read, Write, Grep, Glob, Bash
related-skills: innojini-huni-printing-estimator, moai-lang-javascript, moai-domain-frontend
---

# Edicus 플랫폼 연동 스킬

## Quick Reference (30초)

### 에디쿠스(Edicus)란?

온라인 편집기 기반의 맞춤형 인쇄물 주문 시스템으로, 포토북, 명함, 스티커, 카드뉴스, 포스터, 팝몰 등 다양한 인쇄물을 온라인에서 편집하고 주문할 수 있는 플랫폼입니다.

### 핵심 구성요소

**JS SDK (클라이언트)**: 온라인 편집기, 프로젝트 생성/수정/저장, 이미지 업로드, PDF/JPG/PNG 내보내기

**Server API**: 인증 토큰, 프로젝트/템플릿 관리, 주문 생성/조회/취소, 렌더링 처리, 리소스 관리

### 주요 트리거 키워드

- "에디쿠스", "Edicus", "모션원", "온라인 편집기", "포토북 편집기"
- "맞춤형 인쇄물", "명함 제작", "카드뉴스", "인쇄물 주문 시스템"

### 기본 주문 Workflow

```
1. 인증 토큰 발급
2. JS SDK 초기화 및 편집기 실행
3. 사용자 편집 및 저장 (onSave 콜백)
4. 주문 생성 (POST /api/v1/orders)
5. 렌더링 요청 (POST /api/v1/rendering/preview)
6. 렌더링 상태 조회 및 완료 처리
```

---

## Implementation Guide (5분)

### 1. 인증 토큰 발급

```javascript
async function getAuthToken() {
  const response = await fetch('https://api.edicus.co.kr/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: 'YOUR_CLIENT_ID',
      clientSecret: 'YOUR_CLIENT_SECRET',
      grantType: 'client_credentials'
    })
  });

  if (!response.ok) throw new Error(`인증 실패: ${response.status}`);
  const data = await response.json();
  return data.access_token;
}
```

### 2. JS SDK 초기화

**생성 모드**:
```javascript
import { Edicus } from '@edicus/sdk';

const editor = new Edicus({
  clientId: 'YOUR_CLIENT_ID',
  projectCode: 'PHOTOBOOK_100',
  mode: 'create',
  authToken: await getAuthToken(),
  templateNo: 'TPL001',
  container: '#editor-container',
  callbacks: {
    onReady: () => console.log('편집기 로드 완료'),
    onSave: async (projectNo) => await saveProjectToServer(projectNo),
    onError: (error) => console.error('편집기 에러:', error)
  },
  options: { language: 'ko', theme: 'light', enableSave: true, enableExport: true }
});
editor.open();
```

**수정 모드**:
```javascript
const editor = new Edicus({
  clientId: 'YOUR_CLIENT_ID',
  projectCode: 'PHOTOBOOK_100',
  mode: 'edit',
  authToken: await getAuthToken(),
  projectNo: 'PRJ20250119001',
  container: '#editor-container',
  callbacks: {
    onReady: () => {},
    onSave: (projectNo) => {},
    onError: (error) => {}
  }
});
editor.open();
```

### 3. Server API 주요 기능

**프로젝트 관리**:
```javascript
// 생성
async function createProject(accessToken, projectData) {
  const response = await fetch('https://api.edicus.co.kr/api/v1/projects', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectCode: projectData.projectCode,
      templateNo: projectData.templateNo,
      projectName: projectData.projectName,
      quantity: projectData.quantity || 1
    })
  });
  return await response.json();
}

// 조회
async function getProject(accessToken, projectNo) {
  const response = await fetch(`https://api.edicus.co.kr/api/v1/projects/${projectNo}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return await response.json();
}
```

**템플릿 관리**:
```javascript
// 목록 조회
async function getTemplates(accessToken, projectCode) {
  const response = await fetch(`https://api.edicus.co.kr/api/v1/templates?projectCode=${projectCode}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return await response.json();
}

// 상세 조회
async function getTemplate(accessToken, templateNo) {
  const response = await fetch(`https://api.edicus.co.kr/api/v1/templates/${templateNo}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return await response.json();
}
```

**주문 관리**:
```javascript
// 주문 생성
async function createOrder(accessToken, orderData) {
  const response = await fetch('https://api.edicus.co.kr/api/v1/orders', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectNo: orderData.projectNo,
      orderName: orderData.orderName,
      quantity: orderData.quantity,
      receiverName: orderData.receiverName,
      receiverPhone: orderData.receiverPhone,
      receiverAddress: orderData.receiverAddress,
      receiverPostcode: orderData.receiverPostcode
    })
  });
  return await response.json();
}

// 주문 조회
async function getOrder(accessToken, orderNo) {
  const response = await fetch(`https://api.edicus.co.kr/api/v1/orders/${orderNo}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return await response.json();
}

// 주문 취소
async function cancelOrder(accessToken, orderNo, cancelReason) {
  const response = await fetch(`https://api.edicus.co.kr/api/v1/orders/${orderNo}/cancel`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ cancelReason: cancelReason })
  });
  return await response.json();
}
```

**렌더링 처리**:
```javascript
// 썸네일 생성
async function createThumbnail(accessToken, projectNo) {
  const response = await fetch('https://api.edicus.co.kr/api/v1/rendering/thumbnail', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectNo: projectNo, width: 300, height: 300 })
  });
  return await response.json();
}

// 미리보기 생성
async function createPreview(accessToken, projectNo) {
  const response = await fetch('https://api.edicus.co.kr/api/v1/rendering/preview', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectNo: projectNo, format: 'PDF' })
  });
  return await response.json();
}

// 렌더링 상태 조회
async function getRenderingStatus(accessToken, renderingNo) {
  const response = await fetch(`https://api.edicus.co.kr/api/v1/rendering/status/${renderingNo}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return await response.json();
}

// 렌더링 완료 대기
async function waitForRenderingComplete(accessToken, renderingNo, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getRenderingStatus(accessToken, renderingNo);
    if (status.status === 'completed') return status;
    if (status.status === 'failed') throw new Error(`렌더링 실패: ${status.errorMessage}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('렌더링 시간 초과');
}
```

**리소스 관리**:
```javascript
// 폰트 목록
async function getFonts(accessToken) {
  const response = await fetch('https://api.edicus.co.kr/api/v1/resources/fonts', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return await response.json();
}

// 이미지 업로드
async function uploadImage(accessToken, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('https://api.edicus.co.kr/api/v1/resources/images/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` },
    body: formData
  });
  return await response.json();
}
```

### 4. 주문 Workflow 서비스 클래스

```javascript
class EdicusOrderService {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null;
  }

  async authenticate() {
    this.accessToken = await getAuthToken();
    return this.accessToken;
  }

  async startEditor(projectCode, templateNo, container) {
    const editor = new Edicus({
      clientId: this.clientId,
      projectCode: projectCode,
      mode: 'create',
      authToken: this.accessToken,
      templateNo: templateNo,
      container: container,
      callbacks: {
        onSave: async (projectNo) => projectNo,
        onError: (error) => console.error('편집기 에러:', error)
      }
    });
    editor.open();
    return editor;
  }

  async createOrder(projectNo, orderInfo) {
    return await createOrder(this.accessToken, {
      projectNo: projectNo,
      orderName: orderInfo.orderName,
      quantity: orderInfo.quantity || 1,
      receiverName: orderInfo.receiverName,
      receiverPhone: orderInfo.receiverPhone,
      receiverAddress: orderInfo.receiverAddress,
      receiverPostcode: orderInfo.receiverPostcode
    });
  }

  async renderAndDownload(projectNo, format = 'PDF') {
    const renderResult = await createPreview(this.accessToken, projectNo);
    const finalResult = await waitForRenderingComplete(this.accessToken, renderResult.renderingNo);
    return finalResult.fileUrl;
  }

  async processOrder(projectCode, templateNo, orderInfo, container) {
    try {
      await this.authenticate();
      const editor = await this.startEditor(projectCode, templateNo, container);
      const order = await this.createOrder(editor.projectNo, orderInfo);
      const fileUrl = await this.renderAndDownload(editor.projectNo);
      return { orderNo: order.orderNo, fileUrl: fileUrl };
    } catch (error) {
      console.error('주문 처리 실패:', error);
      throw error;
    }
  }
}
```

### 5. 에러 처리

```javascript
class EdicusError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function handleApiCall(apiFunction) {
  try {
    return await apiFunction();
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      const errorMap = {
        401: ['AUTH_FAILED', '인증 실패'],
        403: ['PERMISSION_DENIED', '권한 없음'],
        404: ['NOT_FOUND', '리소스 없음'],
        429: ['RATE_LIMIT', '요청 한도 초과'],
        500: ['SERVER_ERROR', '서버 에러']
      };
      if (errorMap[status]) {
        throw new EdicusError(errorMap[status][0], errorMap[status][1], data);
      }
      throw new EdicusError('UNKNOWN', `알 수 없는 에러: ${status}`, data);
    }
    throw error;
  }
}
```

---

## Advanced Implementation

토큰 자동 갱신, VDP 지원, 배치 렌더링, 웹훅 연동, MES 연동 등의 고급 기능은 [reference.md](reference.md)를 참조하세요.

---

## Works Well With

- **innojini-huni-printing-estimator**: 후니프린팅 견적 시스템 연동
- **innoji-smartstore-mes-integration**: 스마트스토어-MES 연동
- **moai-domain-frontend**: React/Next.js 프론트엔드 개발
- **moai-lang-javascript**: JavaScript SDK 통합

---

## API 참조

### Base URL
- Production: `https://api.edicus.co.kr`
- Testing: `https://api-staging.edicus.co.kr`

### 상태 코드

| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 429 | 요청 한도 초과 |
| 500 | 서버 에러 |

### 렌더링 상태

| 상태 | 설명 |
|------|------|
| processing | 처리 중 |
| completed | 완료 |
| failed | 실패 |

### 지원 상품 (projectCode)

- **포토북**: PHOTOBOOK_100, PHOTOBOOK_150
- **명함**: BUSINESS_CARD, PREMIUM_CARD
- **스티커**: STICKER_ROUND, STICKER_SQUARE
- **카드뉴스**: CARD_NEWS_A4
- **포스터**: POSTER_A4, POSTER_A3
- **팝몰**: POPMALL_STANDARD

---

## 지원 및 문의

- 기술 문의: tech@edicus.co.kr
- 연동 문서: https://docs.edicus.co.kr
- API 레퍼런스: https://api.edicus.co.kr/docs
