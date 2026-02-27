---
name: pitstop-sdk
description: |
  Enfocus PitStop Library SDK (v25.11) for PDF preflight, processing, and quality control automation.
  
  🔹 Native SDK: "EPL_", "EPM_", "preflight", "Action List", "Preflight Profile", "Certified PDF"
  🔹 Web Integration: "PitStop Library Container", "PLC", "Docker", "REST API", "cloud preflight"
  🔹 Processing: "PDF 품질검사", "인쇄용 PDF", "색상 관리", "PDF 렌더링", "썸네일 생성"
  🔹 Reports: "preflight report", "JSON report", "XML report", "에러/경고/수정"
  
  Use when: (1) Processing PDF with preflight profiles, (2) Creating preflight reports, 
  (3) Web/cloud PDF processing architecture, (4) PLC Docker deployment, (5) MES integration
---

# Enfocus PitStop Library SDK

PDF preflight, 수정, 품질 관리를 위한 전문 SDK. 인쇄 워크플로우 자동화 필수 도구.

## Quick Start

### 1. 초기화/종료
```c
EPL_InitializeInfoStruct initInfo;
SDK_InitStruct(initInfo);
initInfo.mResourceLocation = "/path/to/resources";
initInfo.mTempPath = "/tmp/pitstop";
EPL_Initialize(&initInfo);

// 작업 완료 후
EPL_Finalize();
```

### 2. PDF 처리
```c
// PDF 핸들 생성
EPL_CreatePdfHandleStruct pdfStruct;
SDK_InitStruct(pdfStruct);
pdfStruct.mFilePath = "/path/to/input.pdf";
EPL_CreatePdfHandle(&pdfStruct);

// Preflight Profile로 처리
EPL_ProcessStruct processStruct;
SDK_InitStruct(processStruct);
processStruct.mPdfHandle = pdfStruct.mDocumentPdfHandle;
processStruct.mMutatorPath = "/path/to/profile.ppp";
EPL_Process(&processStruct);

// 저장 및 정리
EPL_SavePdf(&saveStruct);
EPL_DeletePdfHandle(pdfStruct.mDocumentPdfHandle);
```

## Core Modules

| 모듈 | 접두어 | 용도 |
|------|--------|------|
| Library Management | `EPL_Initialize/Finalize` | SDK 초기화/종료 |
| Document Processing | `EPL_Process` | PDF preflight 및 수정 |
| Document Handling | `EPL_CreatePdfHandle` | PDF 열기/저장/닫기 |
| Preflight Profiles | `EPM_*` | 프로파일 생성/편집 |
| Reports | `EPL_ExportJSONReport` | 결과 보고서 생성 |
| Certified PDF | `EPL_*CertifiedWF*` | 인증 PDF 워크플로우 |
| Rendering | `EPL_RenderImages` | PDF→이미지 변환 |
| Color Management | `EPL_ConfigureColorManagement` | 색상 관리 설정 |

## 핵심 워크플로우

### Preflight Only (검사만)
```
Initialize → CreatePdfHandle → Process(profile) → ExportJSONReport → DeletePdfHandle → Finalize
```

### Preflight + Fix (검사 및 수정)
```
Initialize → CreatePdfHandle → Process(profile+actions) → SavePdf → ExportJSONReport → Finalize
```

### Batch Processing
```
Initialize → CreateIterator → Loop(Process each) → EndIterator → Finalize
```

## Web Integration (PLC)

웹/클라우드 환경에서 PitStop 사용 시 **PitStop Library Container (PLC)** 권장:

- Docker 컨테이너로 배포
- REST API 기본 제공
- AWS S3/SQS 네이티브 지원
- npm 패키지: `@enfocussw/pitstop-library-container`

**상세 가이드:**
- [PLC REST API](references/plc-api.md) - 엔드포인트 및 사용법
- [PLC Docker 배포](references/plc-deployment.md) - 설치 및 구성
- [Node.js 클라이언트](references/plc-nodejs.md) - 백엔드 통합 예제

## API 상세 가이드

- [함수 레퍼런스](references/functions.md) - 주요 함수 120개
- [열거형 정의](references/enums.md) - 25개 열거형
- [데이터 구조](references/data-structures.md) - 80개 구조체
- [워크플로우 예제](references/workflows.md) - 실전 예제 10개
- [에러 코드](references/error-codes.md) - 에러 처리 가이드

## 에러 처리 패턴

```c
EPS_ErrorCodes result = EPL_SomeFunction(&params);
if (result != eEPS_NoError) {
    char* errorMsg = NULL;
    EPL_GetLastErrorDescription(&errorMsg);
    printf("Error: %s\n", errorMsg);
}
```

## 리소스 정리 체크리스트

```c
// 역순으로 정리
if (reportHandle) EPL_DeleteReportHandle(reportHandle);
if (pdfHandle) EPL_DeletePdfHandle(pdfHandle);
if (config) EPL_CloseConfiguration(config);
EPL_CollectGarbage();
EPL_Finalize();
```

## 참고사항

1. **멀티스레드**: 별도 프로세스에서 처리 (스레드 안전하지 않음)
2. **Configuration**: 설정 세트를 빠르게 전환하려면 여러 Configuration 사용
3. **구조체 초기화**: 항상 `SDK_InitStruct()` 매크로 사용
4. **인코딩**: UTF-8 권장 (`eEPS_EncodingUTF8`)

---

*PitStop Library SDK v25.11 (build 1637109) - Enfocus (an Esko Company)*
