# Edicus 플랫폼 연동 - 코드 예시

실제 사용 가능한 완전한 코드 예시들을 제공합니다.

## 1. 포토북 주문 완전한 예시

```javascript
import { Edicus } from '@edicus/sdk';

class PhotobookOrderService {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.authManager = new EdicusAuthManager(config.clientId, config.clientSecret);
  }

  async startPhotobookOrder(userOptions) {
    try {
      // 1. 인증
      const headers = await this.authManager.getAuthHeaders();
      const token = headers.Authorization.replace('Bearer ', '');

      // 2. 템플릿 조회
      const templates = await getTemplates(token, 'PHOTOBOOK_100');
      const template = templates.find(t => t.templateNo === userOptions.templateNo) || templates[0];

      // 3. 편집기 초기화
      const editor = new Edicus({
        clientId: this.clientId,
        projectCode: 'PHOTOBOOK_100',
        mode: 'create',
        authToken: token,
        templateNo: template.templateNo,
        container: userOptions.container || '#edicus-editor',
        callbacks: {
          onReady: () => console.log('포토북 편집기 로드 완료'),
          onSave: async (projectNo) => {
            console.log('프로젝트 저장:', projectNo);
            userOptions.onProjectSave?.(projectNo);
          },
          onError: (error) => {
            console.error('편집기 에러:', error);
            userOptions.onError?.(error);
          }
        },
        options: {
          language: 'ko',
          theme: 'light',
          enableSave: true,
          enableExport: true
        }
      });

      editor.open();
      return editor;

    } catch (error) {
      console.error('포토북 주문 시작 실패:', error);
      throw error;
    }
  }

  async completeOrder(projectNo, orderInfo) {
    try {
      const token = await this.authManager.getToken();

      // 주문 생성
      const order = await createOrder(token, {
        projectNo: projectNo,
        orderName: orderInfo.orderName || '포토북 주문',
        quantity: orderInfo.quantity || 1,
        receiverName: orderInfo.receiverName,
        receiverPhone: orderInfo.receiverPhone,
        receiverAddress: orderInfo.receiverAddress,
        receiverPostcode: orderInfo.receiverPostcode
      });

      // 렌더링 요청
      const renderResult = await createPreview(token, projectNo);
      const finalResult = await waitForRenderingComplete(token, renderResult.renderingNo);

      return {
        orderNo: order.orderNo,
        fileUrl: finalResult.fileUrl,
        status: 'completed'
      };

    } catch (error) {
      console.error('주문 완료 실패:', error);
      throw error;
    }
  }
}

// 사용 예시
const service = new PhotobookOrderService({
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET'
});

// 편집기 실행
const editor = await service.startPhotobookOrder({
  templateNo: 'TPL001',
  container: '#editor-container',
  onProjectSave: (projectNo) => console.log('저장됨:', projectNo),
  onError: (error) => console.error('에러:', error)
});

// 사용자 편집 후 주문 완료
const result = await service.completeOrder(editor.projectNo, {
  orderName: '우리 가족 포토북',
  quantity: 1,
  receiverName: '홍길동',
  receiverPhone: '010-1234-5678',
  receiverAddress: '서울시 강남구 테헤란로 123',
  receiverPostcode: '06000'
});
```

## 2. 명함 VDP 주문 예시

```javascript
async function createBusinessCardVDP(accessToken, employeeList) {
  try {
    // VDP 프로젝트 생성
    const response = await fetch('https://api.edicus.co.kr/api/v1/projects/vdp', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectCode: 'BUSINESS_CARD_VDP',
        templateNo: 'TPL_VDP_001',
        variableData: employeeList.map(emp => ({
          name: emp.name,
          position: emp.position,
          department: emp.department,
          phone: emp.phone,
          email: emp.email
        })),
        quantity: 100 // 각각 100매씩
      })
    });

    const project = await response.json();
    console.log('VDP 프로젝트 생성됨:', project.projectNo);

    // 렌더링 요청
    const renderResult = await createPreview(accessToken, project.projectNo);
    const finalResult = await waitForRenderingComplete(accessToken, renderResult.renderingNo);

    return {
      projectNo: project.projectNo,
      fileUrl: finalResult.fileUrl,
      totalPages: employeeList.length
    };

  } catch (error) {
    console.error('VDP 명함 생성 실패:', error);
    throw error;
  }
}

// 사용 예시
const authManager = new EdicusAuthManager('YOUR_CLIENT_ID', 'YOUR_CLIENT_SECRET');
const token = await authManager.getToken();

const vdpResult = await createBusinessCardVDP(token, [
  { name: '홍길동', position: '대리', department: '영업팀', phone: '010-1234-5678', email: 'hong@company.com' },
  { name: '김철수', position: '과장', department: '마케팅팀', phone: '010-2345-6789', email: 'kim@company.com' },
  { name: '이영희', position: '사원', department: '인사팀', phone: '010-3456-7890', email: 'lee@company.com' }
]);

console.log('VDP 명함 생성 완료:', vdpResult);
```

## 3. Next.js 페이지 통합 예시

```javascript
// pages/edicus/editor.js
import { useState, useEffect, useRef } from 'react';
import { Edicus } from '@edicus/sdk';

export default function EdicusEditorPage() {
  const [editor, setEditor] = useState(null);
  const [projectNo, setProjectNo] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    initializeEditor();
    return () => {
      if (editor) {
        editor.close();
      }
    };
  }, []);

  const initializeEditor = async () => {
    try {
      setLoading(true);

      // 서버에서 인증 토큰 가져오기
      const tokenResponse = await fetch('/api/edicus/token');
      const { accessToken } = await tokenResponse.json();

      const edicusEditor = new Edicus({
        clientId: process.env.NEXT_PUBLIC_EDICUS_CLIENT_ID,
        projectCode: 'PHOTOBOOK_100',
        mode: 'create',
        authToken: accessToken,
        templateNo: 'TPL001',
        container: '#edicus-editor-container',
        callbacks: {
          onReady: () => {
            console.log('편집기 로드 완료');
            setLoading(false);
          },
          onSave: async (savedProjectNo) => {
            console.log('프로젝트 저장:', savedProjectNo);
            setProjectNo(savedProjectNo);

            // 서버에 프로젝트 저장 알림
            await fetch('/api/edicus/projects/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectNo: savedProjectNo })
            });
          },
          onError: (error) => {
            console.error('편집기 에러:', error);
            setLoading(false);
          }
        },
        options: {
          language: 'ko',
          theme: 'light',
          enableSave: true,
          enableExport: true
        }
      });

      edicusEditor.open();
      setEditor(edicusEditor);

    } catch (error) {
      console.error('편집기 초기화 실패:', error);
      setLoading(false);
    }
  };

  const handleOrderSubmit = async () => {
    if (!projectNo) {
      alert('프로젝트를 먼저 저장해주세요.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/edicus/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectNo: projectNo,
          orderInfo: {
            orderName: '포토북 주문',
            quantity: 1,
            receiverName: '홍길동',
            receiverPhone: '010-1234-5678',
            receiverAddress: '서울시 강남구...',
            receiverPostcode: '06000'
          }
        })
      });

      const result = await response.json();
      console.log('주문 완료:', result);
      alert('주문이 완료되었습니다!');
      setLoading(false);

    } catch (error) {
      console.error('주문 실패:', error);
      alert('주문에 실패했습니다.');
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>포토북 편집기</h1>

      {loading && <p>로딩 중...</p>}

      <div
        id="edicus-editor-container"
        ref={containerRef}
        style={{ width: '100%', height: '600px', border: '1px solid #ccc' }}
      />

      {projectNo && (
        <div style={{ marginTop: '20px' }}>
          <p>프로젝트 번호: {projectNo}</p>
          <button onClick={handleOrderSubmit} disabled={loading}>
            {loading ? '처리 중...' : '주문하기'}
          </button>
        </div>
      )}
    </div>
  );
}
```

## 4. 서버 API 라우터 예시 (Next.js API)

```javascript
// pages/api/edicus/token.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://api.edicus.co.kr/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: process.env.EDICUS_CLIENT_ID,
        clientSecret: process.env.EDICUS_CLIENT_SECRET,
        grantType: 'client_credentials'
      })
    });

    const data = await response.json();
    res.status(200).json({ accessToken: data.access_token });

  } catch (error) {
    console.error('토큰 발급 실패:', error);
    res.status(500).json({ error: '토큰 발급 실패' });
  }
}

// pages/api/edicus/orders.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectNo, orderInfo } = req.body;

    // 인증 토큰 발급
    const tokenResponse = await fetch('https://api.edicus.co.kr/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: process.env.EDICUS_CLIENT_ID,
        clientSecret: process.env.EDICUS_CLIENT_SECRET,
        grantType: 'client_credentials'
      })
    });
    const { access_token } = await tokenResponse.json();

    // 주문 생성
    const orderResponse = await fetch('https://api.edicus.co.kr/api/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectNo: projectNo,
        orderName: orderInfo.orderName,
        quantity: orderInfo.quantity,
        receiverName: orderInfo.receiverName,
        receiverPhone: orderInfo.receiverPhone,
        receiverAddress: orderInfo.receiverAddress,
        receiverPostcode: orderInfo.receiverPostcode
      })
    });
    const order = await orderResponse.json();

    // 렌더링 요청
    const renderResponse = await fetch('https://api.edicus.co.kr/api/v1/rendering/preview', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectNo: projectNo,
        format: 'PDF'
      })
    });
    const renderResult = await renderResponse.json();

    // 렌더링 완료 대기
    let finalResult;
    for (let i = 0; i < 30; i++) {
      const statusResponse = await fetch(
        `https://api.edicus.co.kr/api/v1/rendering/status/${renderResult.renderingNo}`,
        {
          headers: { 'Authorization': `Bearer ${access_token}` }
        }
      );
      finalResult = await statusResponse.json();

      if (finalResult.status === 'completed') break;
      if (finalResult.status === 'failed') {
        throw new Error('렌더링 실패');
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    res.status(200).json({
      orderNo: order.orderNo,
      fileUrl: finalResult.fileUrl,
      status: 'completed'
    });

  } catch (error) {
    console.error('주문 처리 실패:', error);
    res.status(500).json({ error: '주문 처리 실패' });
  }
}
```

## 5. TypeScript 타입 정의

```typescript
// types/edicus.ts

export interface EdicusConfig {
  clientId: string;
  projectCode: string;
  mode: 'create' | 'edit';
  authToken: string;
  projectNo?: string;
  templateNo?: string;
  container: string;
  callbacks: EdicusCallbacks;
  options?: EdicusOptions;
}

export interface EdicusCallbacks {
  onReady?: () => void;
  onSave?: (projectNo: string) => void | Promise<void>;
  onError?: (error: Error) => void;
}

export interface EdicusOptions {
  language?: 'ko' | 'en';
  theme?: 'light' | 'dark';
  enableSave?: boolean;
  enableExport?: boolean;
}

export interface ProjectData {
  projectCode: string;
  templateNo: string;
  projectName: string;
  quantity?: number;
}

export interface OrderData {
  projectNo: string;
  orderName: string;
  quantity: number;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverPostcode: string;
}

export interface RenderingStatus {
  status: 'processing' | 'completed' | 'failed';
  renderingNo: string;
  fileUrl?: string;
  errorMessage?: string;
}

export interface VDPData {
  projectCode: string;
  templateNo: string;
  variableData: Record<string, any>[];
  quantity: number;
}

// Edicus SDK 클래스 선언
declare class Edicus {
  constructor(config: EdicusConfig);
  open(): void;
  close(): void;
  save(): Promise<string>;
  getProjectInfo(): Promise<any>;
  getPreviewImage(): Promise<string>;
  getTexts(): Promise<any[]>;
  export(format: 'PDF' | 'JPG' | 'PNG'): Promise<Blob>;
  addImages(urls: string[]): void;
  setTemplate(templateNo: string): void;
}

export { Edicus };
```
