# PLC Node.js 클라이언트

## 설치

```bash
npm install @enfocussw/pitstop-library-container
```

또는 직접 HTTP 클라이언트 사용:

```bash
npm install axios
```

---

## 공식 SDK 사용

### 초기화

```javascript
const { PLCClient, PLCAWS } = require('@enfocussw/pitstop-library-container');

// 기본 클라이언트
const plc = new PLCClient({
  baseURL: 'http://localhost:3000',
  timeout: 60000
});

// AWS S3 통합
PLCAWS.init({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'ap-northeast-2',
  bucketName: 'my-pdf-bucket'
});
```

### 기본 Preflight

```javascript
async function preflightPDF(inputPath, profilePath) {
  // S3 업로드 및 presigned URL 생성
  const inputURL = await PLCAWS.uploadAndSign(inputPath);
  const profileURL = await PLCAWS.getPresignedURL(profilePath);
  
  // 작업 제출
  const job = await plc.submitJob({
    inputFileURL: inputURL,
    preflightProfileURL: profileURL
  });
  
  console.log(`Job submitted: ${job.jobId}`);
  
  // 완료 대기
  const result = await plc.waitForCompletion(job.jobId);
  
  return result;
}
```

---

## 직접 구현 (Axios)

### 클라이언트 클래스

```javascript
const axios = require('axios');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

class PLCClient {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'http://localhost:3000';
    this.timeout = options.timeout || 60000;
    this.pollInterval = options.pollInterval || 1000;
    
    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 작업 제출
  async submitJob(params) {
    const response = await this.http.post('/job', params);
    return response.data;
  }

  // 작업 상태 조회
  async getJobStatus(jobId) {
    const response = await this.http.get(`/job/${jobId}`);
    return response.data;
  }

  // 보고서 조회
  async getReport(jobId, format = 'json') {
    const response = await this.http.get(`/job/${jobId}/report`, {
      params: { format }
    });
    return response.data;
  }

  // 완료 대기
  async waitForCompletion(jobId, maxWait = 300000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const status = await this.getJobStatus(jobId);
      
      if (status.status === 'completed') {
        return status;
      }
      
      if (status.status === 'failed') {
        throw new Error(`Job failed: ${status.error?.message}`);
      }
      
      await this.sleep(this.pollInterval);
    }
    
    throw new Error('Job timeout');
  }

  // 헬스 체크
  async health() {
    const response = await this.http.get('/health');
    return response.data;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### S3 헬퍼

```javascript
class S3Helper {
  constructor(options) {
    this.client = new S3Client({
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey
      }
    });
    this.bucket = options.bucket;
  }

  // 파일 업로드
  async upload(localPath, s3Key) {
    const fileContent = fs.readFileSync(localPath);
    
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      Body: fileContent,
      ContentType: this.getContentType(localPath)
    }));
    
    return `s3://${this.bucket}/${s3Key}`;
  }

  // Presigned URL 생성 (업로드용)
  async getUploadURL(s3Key, expiresIn = 3600) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  // Presigned URL 생성 (다운로드용)
  async getDownloadURL(s3Key, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.pdf': 'application/pdf',
      '.ppp': 'application/octet-stream',
      '.eal': 'application/octet-stream',
      '.json': 'application/json',
      '.xml': 'application/xml'
    };
    return types[ext] || 'application/octet-stream';
  }
}
```

---

## 사용 예제

### 기본 Preflight

```javascript
const plc = new PLCClient({ baseURL: 'http://localhost:3000' });
const s3 = new S3Helper({
  region: 'ap-northeast-2',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  bucket: 'my-pdf-bucket'
});

async function preflight(localPdfPath, profileKey) {
  // 1. PDF 업로드
  const pdfKey = `input/${Date.now()}-${path.basename(localPdfPath)}`;
  await s3.upload(localPdfPath, pdfKey);
  
  // 2. Presigned URL 생성
  const inputURL = await s3.getDownloadURL(pdfKey);
  const profileURL = await s3.getDownloadURL(profileKey);
  const outputKey = pdfKey.replace('input/', 'output/');
  const outputURL = await s3.getUploadURL(outputKey);
  
  // 3. 작업 제출
  const job = await plc.submitJob({
    inputFileURL: inputURL,
    preflightProfileURL: profileURL,
    outputFileURL: outputURL
  });
  
  // 4. 완료 대기
  const result = await plc.waitForCompletion(job.jobId);
  
  // 5. 보고서 가져오기
  const report = await plc.getReport(job.jobId);
  
  return {
    jobId: job.jobId,
    status: result.status,
    errors: report.summary.errors,
    warnings: report.summary.warnings,
    fixes: report.summary.fixes,
    outputURL: await s3.getDownloadURL(outputKey)
  };
}

// 실행
preflight('./input.pdf', 'profiles/print-ready.ppp')
  .then(console.log)
  .catch(console.error);
```

### Webhook 수신 (Express)

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook/pitstop', (req, res) => {
  const { jobId, status, result } = req.body;
  
  console.log(`Job ${jobId} ${status}`);
  
  if (status === 'completed') {
    // MES 시스템 업데이트
    updateOrderStatus(jobId, result);
  } else if (status === 'failed') {
    // 에러 알림
    notifyError(jobId, result.error);
  }
  
  res.status(200).send('OK');
});

app.listen(3001, () => {
  console.log('Webhook server running on port 3001');
});
```

### 배치 처리

```javascript
async function batchPreflight(pdfPaths, profileKey) {
  const jobs = [];
  
  // 모든 작업 제출
  for (const pdfPath of pdfPaths) {
    const pdfKey = `batch/${Date.now()}-${path.basename(pdfPath)}`;
    await s3.upload(pdfPath, pdfKey);
    
    const job = await plc.submitJob({
      inputFileURL: await s3.getDownloadURL(pdfKey),
      preflightProfileURL: await s3.getDownloadURL(profileKey),
      callbackURL: 'https://your-server.com/webhook/pitstop'
    });
    
    jobs.push({ pdfPath, jobId: job.jobId });
  }
  
  return jobs;
}
```

---

## TypeScript 타입

```typescript
interface PLCJobRequest {
  inputFileURL: string;
  outputFileURL?: string;
  actionListURLs?: string[];
  preflightProfileURL?: string;
  reportURL?: string;
  callbackURL?: string;
}

interface PLCJobResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: {
    errors: number;
    warnings: number;
    fixes: number;
    outputFileURL?: string;
    reportURL?: string;
  };
  error?: {
    code: string;
    message: string;
  };
  createdAt: string;
  completedAt?: string;
}

interface PLCReport {
  summary: {
    errors: number;
    warnings: number;
    fixes: number;
    infos: number;
  };
  items: PLCReportItem[];
  profile: {
    name: string;
    version: string;
  };
}

interface PLCReportItem {
  type: 'error' | 'warning' | 'fix' | 'info';
  message: string;
  page?: number;
  objectId?: string;
}
```

---

## 에러 처리

```javascript
try {
  const result = await plc.submitJob(params);
} catch (error) {
  if (error.response) {
    // 서버 에러
    const { code, message } = error.response.data.error;
    
    switch (code) {
      case 'INVALID_PDF':
        console.error('유효하지 않은 PDF:', message);
        break;
      case 'WORKER_UNAVAILABLE':
        console.error('서버 과부하, 잠시 후 재시도');
        await sleep(5000);
        break;
      default:
        console.error('처리 오류:', message);
    }
  } else {
    // 네트워크 에러
    console.error('연결 실패:', error.message);
  }
}
```
