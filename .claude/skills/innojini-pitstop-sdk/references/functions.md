# PitStop SDK 함수 레퍼런스

## Library Management

### EPL_Initialize
라이브러리 초기화. 모든 PitStop 함수 호출 전 필수.

```c
enum EPS_ErrorCodes EPL_Initialize(EPL_InitializeInfoPtr inInitInfo);
```

**주요 파라미터:**
- `mPrivate` - 핸드셰이크 구조체 (필수)
- `mResourceLocation` - 리소스 폴더 경로
- `mTempPath` - 임시 파일 경로

### EPL_Finalize
라이브러리 종료. 모든 리소스 해제.

```c
enum EPS_ErrorCodes EPL_Finalize(void);
```

### EPL_GetLibraryInfo
라이브러리 버전 정보 조회.

```c
enum EPS_ErrorCodes EPL_GetLibraryInfo(EPL_GetLibraryInfoPtr outInfo);
```

---

## Document Handling

### EPL_CreatePdfHandle
PDF 파일 열기.

```c
enum EPS_ErrorCodes EPL_CreatePdfHandle(EPL_CreatePdfHandlePtr ioInfo);
```

**주요 파라미터:**
- `mFilePath` - PDF 파일 경로
- `mDocumentPdfHandle` - 출력: PDF 핸들
- `mPassword` - 암호화된 PDF용 비밀번호

### EPL_DeletePdfHandle
PDF 핸들 해제.

```c
enum EPS_ErrorCodes EPL_DeletePdfHandle(EPL_DocumentPdfHandle inHandle);
```

### EPL_SavePdf
PDF 저장.

```c
enum EPS_ErrorCodes EPL_SavePdf(EPL_SavePdfPtr inInfo);
```

### EPL_GetPdfInfo
PDF 정보 조회 (페이지 수, 버전 등).

```c
enum EPS_ErrorCodes EPL_GetPdfInfo(EPL_GetPdfInfoPtr ioInfo);
```

---

## Processing

### EPL_Process
Preflight Profile/Action List로 PDF 처리.

```c
enum EPS_ErrorCodes EPL_Process(EPL_ProcessPtr inInfo);
```

**주요 파라미터:**
- `mPdfHandle` - 처리할 PDF 핸들
- `mReportHandle` - 출력: 보고서 핸들
- `mPageRange` - 페이지 범위 (예: "1-5", "1,3,5")

### EPL_CheckConfiguration
Configuration 유효성 검사.

```c
enum EPS_ErrorCodes EPL_CheckConfiguration(EPL_ConfigurationHandle inConfig);
```

---

## Configuration

### EPL_CreateConfiguration
새 Configuration 생성.

```c
enum EPS_ErrorCodes EPL_CreateConfiguration(EPL_ConfigurationHandle* outHandle);
```

### EPL_SetAsCurrentConfiguration
Configuration 활성화.

```c
enum EPS_ErrorCodes EPL_SetAsCurrentConfiguration(EPL_ConfigurationHandle inHandle);
```

### EPL_CloseConfiguration
Configuration 닫기.

```c
enum EPS_ErrorCodes EPL_CloseConfiguration(EPL_ConfigurationHandle inHandle);
```

---

## Settings

### EPL_SetBoolToSetting
Boolean 설정 변경.

```c
enum EPS_ErrorCodes EPL_SetBoolToSetting(
    EPL_ConfigurationHandle inConfig,
    enum EPL_SettingType inType,
    enum EPS_Boolean inValue
);
```

### EPL_SetLongToSetting
Long/Enum 설정 변경.

```c
enum EPS_ErrorCodes EPL_SetLongToSetting(
    EPL_ConfigurationHandle inConfig,
    enum EPL_SettingType inType,
    long inValue
);
```

### EPL_SetStringToSetting
String 설정 변경.

```c
enum EPS_ErrorCodes EPL_SetStringToSetting(
    EPL_ConfigurationHandle inConfig,
    enum EPL_SettingType inType,
    EPS_StringStructPtr inValue
);
```

### EPL_SetFilePathToSetting
파일 경로 설정 (Action List, Preflight Profile 지정).

```c
enum EPS_ErrorCodes EPL_SetFilePathToSetting(
    EPL_ConfigurationHandle inConfig,
    enum EPL_SettingType inType,
    EPS_FilePathPtr inPath
);
```

---

## Reports

### EPL_ExportJSONReport
JSON 형식 보고서 내보내기.

```c
enum EPS_ErrorCodes EPL_ExportJSONReport(EPL_ExportJSONReportPtr inInfo);
```

### EPL_ExportXMLReport
XML 형식 보고서 내보내기.

```c
enum EPS_ErrorCodes EPL_ExportXMLReport(EPL_ExportXMLReportPtr inInfo);
```

### EPL_SaveReport
PDF 형식 보고서 저장.

```c
enum EPS_ErrorCodes EPL_SaveReport(EPL_SaveReportPtr inInfo);
```

### EPL_GetReportStatsForReport
보고서 통계 (에러/경고/수정 개수).

```c
enum EPS_ErrorCodes EPL_GetReportStatsForReport(EPL_ReportStatsForReportPtr ioInfo);
```

### EPL_DeleteReportHandle
보고서 핸들 해제.

```c
enum EPS_ErrorCodes EPL_DeleteReportHandle(EPL_DocumentReportHandle inHandle);
```

---

## Report Iteration

### EPL_CreateIterator
이터레이터 생성.

```c
enum EPS_ErrorCodes EPL_CreateIterator(
    enum EPL_IteratorType inType,
    EPL_IteratorHandle* outHandle
);
```

### EPL_StartIteratorReportItem
보고서 항목 순회 시작.

```c
enum EPS_ErrorCodes EPL_StartIteratorReportItem(EPL_StartIteratorReportItemPtr ioInfo);
```

### EPL_NextIterator
다음 항목으로 이동.

```c
enum EPS_ErrorCodes EPL_NextIterator(EPL_IteratorHandle inIterator);
```

### EPL_GetIteratorReportItem
현재 보고서 항목 정보 조회.

```c
enum EPS_ErrorCodes EPL_GetIteratorReportItem(EPL_GetIteratorReportItemPtr ioInfo);
```

### EPL_EndIterator
이터레이터 종료.

```c
enum EPS_ErrorCodes EPL_EndIterator(EPL_IteratorHandle inIterator);
```

---

## Rendering

### EPL_RenderImages
PDF 페이지를 이미지로 렌더링.

```c
enum EPS_ErrorCodes EPL_RenderImages(EPL_RenderImagesPtr inInfo);
```

**주요 파라미터:**
- `mPdfHandle` - PDF 핸들
- `mResolution` - 해상도 (DPI)
- `mOutputPath` - 출력 경로
- `mPageRange` - 페이지 범위

---

## Color Management

### EPL_ConfigureColorManagement
색상 관리 설정.

```c
enum EPS_ErrorCodes EPL_ConfigureColorManagement(EPL_ConfigureColorManagementPtr inInfo);
```

---

## Certified PDF

### EPL_SetCertifiedWFDefaultParams
Certified PDF 기본 파라미터 설정.

```c
enum EPS_ErrorCodes EPL_SetCertifiedWFDefaultParams(EPL_SetCertifiedWFDefaultParamsPtr inInfo);
```

### EPL_AddEditLogEntry
편집 로그 항목 추가.

```c
enum EPS_ErrorCodes EPL_AddEditLogEntry(EPL_AddEditLogEntryPtr inInfo);
```

### EPL_StatusCheck_GetNumSessions
Certified PDF 세션 수 조회.

```c
enum EPS_ErrorCodes EPL_StatusCheck_GetNumSessions(EPL_StatusCheck_GetNumSessionsPtr ioInfo);
```

---

## Callbacks

### EPL_RegisterProgressCallback
진행률 콜백 등록.

```c
enum EPS_ErrorCodes EPL_RegisterProgressCallback(EPL_ProgressCallbackParamsPtr inParams);
```

### EPL_RemoveProgressCallback
진행률 콜백 제거.

```c
enum EPS_ErrorCodes EPL_RemoveProgressCallback(long inCallbackID);
```

---

## Error Handling

### EPL_GetErrorString
에러 코드를 문자열로 변환.

```c
const char* EPL_GetErrorString(enum EPS_ErrorCodes inErrorCode);
```

### EPL_GetLastErrorDescription
마지막 에러의 상세 설명 조회.

```c
enum EPS_ErrorCodes EPL_GetLastErrorDescription(char** outDescription);
```

---

## Utility

### EPL_CollectGarbage
가비지 컬렉션 실행.

```c
enum EPS_ErrorCodes EPL_CollectGarbage(void);
```

### EPL_FontAddDefaultSystemFontFolders
시스템 폰트 폴더 추가.

```c
enum EPS_ErrorCodes EPL_FontAddDefaultSystemFontFolders(void);
```
