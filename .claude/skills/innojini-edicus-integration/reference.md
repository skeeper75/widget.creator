# Edicus 플랫폼 연동 - 고급 기능 레퍼런스

이 문서는 Edicus 플랫폼 연동의 고급 기능과 패턴을 다룹니다.

## 1. 토큰 자동 갱신

### EdicusAuthManager 클래스

```javascript
class EdicusAuthManager {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
    this.expiresAt = null;
  }

  async getToken() {
    // 토큰이 있고 만료전이면 재사용
    if (this.token && this.expiresAt && Date.now() < this.expiresAt) {
      return this.token;
    }

    // 새 토큰 발급
    const response = await fetch('https://api.edicus.co.kr/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        grantType: 'client_credentials'
      })
    });

    if (!response.ok) throw new Error('토큰 발급 실패');

    const data = await response.json();
    this.token = data.access_token;
    // 5분 전에 만료로 설정하여 안전하게 갱신
    this.expiresAt = Date.now() + (data.expires_in - 300) * 1000;
    return this.token;
  }

  // 인증 헤더 생성
  async getAuthHeaders() {
    const token = await this.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
}
```

## 2. SDK 고급 기능

### 프로그래매틱 제어

```javascript
// 이미지 추가
editor.addImages([
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg'
]);

// 텍스트 내보내기
const texts = editor.getTexts();
console.log('편집기 텍스트:', texts);

// 미리보기 이미지
const previewImage = editor.getPreviewImage();
console.log('미리보기:', previewImage);

// 프로젝트 정보
const projectInfo = editor.getProjectInfo();
console.log('프로젝트 정보:', projectInfo);

// 내보내기 (PDF, JPG, PNG)
editor.export('PDF').then(pdfData => {
  console.log('PDF 내보내기 완료:', pdfData);
});

// 템플릿 변경
editor.setTemplate('TPL002');

// 편집기 닫기
editor.close();
```

## 3. VDP (가변 데이터 인쇄) 지원

### VDP 프로젝트 생성

```javascript
async function createVDPProject(accessToken, vdpData) {
  const response = await fetch('https://api.edicus.co.kr/api/v1/projects/vdp', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      projectCode: vdpData.projectCode,
      templateNo: vdpData.templateNo,
      variableData: vdpData.variableData,
      quantity: vdpData.quantity
    })
  });
  return await response.json();
}

// 사용 예시: 명함 VDP
const vdpProject = await createVDPProject(accessToken, {
  projectCode: 'BUSINESS_CARD_VDP',
  templateNo: 'TPL_VDP_001',
  variableData: [
    { name: '홍길동', position: '대리', department: '영업팀', phone: '010-1234-5678' },
    { name: '김철수', position: '과장', department: '마케팅팀', phone: '010-2345-6789' },
    { name: '이영희', position: '사원', department: '인사팀', phone: '010-3456-7890' }
  ],
  quantity: 100 // 각각 100매씩
});
```

## 4. 배치 렌더링

### 다중 프로젝트 렌더링

```javascript
async function batchRender(accessToken, projectNos) {
  const renderPromises = projectNos.map(projectNo =>
    createPreview(accessToken, projectNo)
  );
  const renderResults = await Promise.all(renderPromises);

  // 모든 렌더링 완료 대기
  const results = await Promise.all(
    renderResults.map(result =>
      waitForRenderingComplete(accessToken, result.renderingNo)
    )
  );
  return results;
}

// 사용 예시
const results = await batchRender(accessToken, ['PRJ001', 'PRJ002', 'PRJ003']);
```

## 5. 웹훅 연동

### 주문 상태 변경 웹훅

```javascript
app.post('/webhooks/edicus/order-status', async (req, res) => {
  const { orderNo, status, payload } = req.body;

  try {
    switch (status) {
      case 'confirmed':
        await handleOrderConfirmed(orderNo, payload);
        break;
      case 'processing':
        await handleOrderProcessing(orderNo, payload);
        break;
      case 'shipped':
        await handleOrderShipped(orderNo, payload);
        break;
      case 'delivered':
        await handleOrderDelivered(orderNo, payload);
        break;
      case 'cancelled':
        await handleOrderCancelled(orderNo, payload);
        break;
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('웹훅 처리 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### 웹훅 서명 검증

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const digest = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

app.post('/webhooks/edicus/order-status', (req, res) => {
  const signature = req.headers['x-edicus-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 웹훅 처리 계속...
});
```

## 6. MES 연동 패턴

### Edicus 주문 → MES 작업지시

```javascript
async function syncOrderToMES(orderNo, authToken, mesToken) {
  // 1. Edicus 주문 조회
  const order = await getOrder(authToken, orderNo);

  // 2. MES 품목 매핑
  const mesProductCode = mapEdicusProductToMES(order.projectCode);

  // 3. MES 작업지시 생성
  const mesJobOrder = {
    productCode: mesProductCode,
    quantity: order.quantity,
    customerName: order.receiverName,
    customerAddress: order.receiverAddress,
    externalRef: orderNo,
    specs: {
      paperType: '아트지',
      printType: '디지털인쇄',
      bindingType: '무선제본'
    }
  };

  // 4. MES API 호출
  const mesResponse = await fetch('MES_API_URL/job-orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mesToken}`
    },
    body: JSON.stringify(mesJobOrder)
  });

  return await mesResponse.json();
}

// 제품 코드 매핑
function mapEdicusProductToMES(projectCode) {
  const mapping = {
    'PHOTOBOOK_100': 'MES-PB-100',
    'PHOTOBOOK_150': 'MES-PB-150',
    'BUSINESS_CARD': 'MES-BC-STD',
    'POSTER_A4': 'MES-PS-A4',
    'STICKER_ROUND': 'MES-ST-RND'
  };
  return mapping[projectCode] || 'MES-DEFAULT';
}
```

### MES 렌더링 상태 동기화

```javascript
async function syncRenderingStatus(renderingNo, mesJobId, authToken, mesToken) {
  // Edicus 렌더링 상태 조회
  const status = await getRenderingStatus(authToken, renderingNo);

  // MES에 상태 업데이트
  await fetch(`MES_API_URL/job-orders/${mesJobId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mesToken}`
    },
    body: JSON.stringify({
      renderingStatus: status.status,
      fileUrl: status.fileUrl || null
    })
  });
}
```

## 7. 캐시 전략

### 프로젝트 캐싱

```javascript
class ProjectCache {
  constructor(ttl = 3600000) { // 1시간 기본
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(projectNo, data) {
    this.cache.set(projectNo, {
      data: data,
      expiresAt: Date.now() + this.ttl
    });
  }

  get(projectNo) {
    const item = this.cache.get(projectNo);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(projectNo);
      return null;
    }
    return item.data;
  }

  clear() {
    this.cache.clear();
  }
}
```

## 8. 재시도 로직

### 지수 백오프 재시도

```javascript
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// 사용 예시
const project = await retryWithBackoff(() =>
  getProject(accessToken, projectNo)
);
```

## 9. rate Limit 처리

```javascript
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();
    // 윈도우 내 요청만 유지
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(now);
  }
}

// 사용 예시
const limiter = new RateLimiter(100, 60000); // 100회/분

async function makeApiCall(apiFunction) {
  await limiter.acquire();
  return await apiFunction();
}
```
