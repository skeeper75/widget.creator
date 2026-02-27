# PitStop SDK 열거형 레퍼런스

## Error Codes (EPS_ErrorCodes)

```c
enum EPS_ErrorCodes {
    eEPS_NoError = 0,                      // 성공
    eEPS_ErrorIncorrectStructSize = 1,     // 잘못된 구조체 크기
    eEPS_ErrorBadInputArgument = 2,        // 잘못된 입력 인자
    eEPS_ErrorIncorrectEnumValue = 3,      // 잘못된 열거형 값
    eEPS_ErrorInitializationFailed = 4,    // 초기화 실패
    eEPS_ErrorBasic = 5,                   // 기본 오류
    eEPS_ErrorBasicTools = 6,              // 기본 도구 오류
    eEPS_ErrorPDF = 7,                     // PDF 처리 오류
    eEPS_ErrorFile = 8,                    // 파일 오류
    eEPS_ErrorMemory = 9,                  // 메모리 부족
    eEPS_ErrorPassword = 10,               // 비밀번호 오류
    eEPS_ErrorPermission = 11,             // 권한 오류
    eEPS_ErrorCertifiedWorkflow = 12,      // Certified PDF 오류
    eEPS_ErrorIterator = 13,               // 이터레이터 오류
    eEPS_ErrorMutator = 14,                // Mutator 오류
    eEPS_ErrorConfiguration = 15,          // Configuration 오류
    eEPS_ErrorRender = 16,                 // 렌더링 오류
    eEPS_ErrorColorManagement = 17,        // 색상 관리 오류
    eEPS_ErrorFlatten = 18,                // 평탄화 오류
    eEPS_ErrorProcess = 19,                // 처리 오류
    eEPS_ErrorReport = 20,                 // 보고서 오류
    eEPS_ErrorCancelled = 21,              // 사용자 취소
    eEPS_FatalError = 99                   // 치명적 오류
};
```

---

## Boolean (EPS_Boolean)

```c
enum EPS_Boolean {
    eEPS_False = 0,
    eEPS_True = 1
};
```

---

## Encoding (EPS_Encoding)

```c
enum EPS_Encoding {
    eEPS_EncodingASCII = 0,         // 7-bit ASCII
    eEPS_EncodingPlatform = 1,      // 플랫폼 네이티브
    eEPS_EncodingUTF8 = 2,          // UTF-8 (권장)
    eEPS_EncodingUTF16 = 3          // UTF-16
};
```

---

## Document Type (EPS_DocumentType)

```c
enum EPS_DocumentType {
    eEPS_DocumentPdf = 0,           // PDF 문서
    eEPS_DocumentReport = 1,        // 보고서 문서
    eEPS_DocumentActionList = 2,    // Action List
    eEPS_DocumentPdfProfile = 3     // Preflight Profile
};
```

---

## Iterator Type (EPL_IteratorType)

```c
enum EPL_IteratorType {
    eEPL_IteratorFolder = 0,        // 폴더 순회
    eEPL_IteratorDatabase = 1,      // DB 순회
    eEPL_IteratorMutator = 2,       // Mutator 순회
    eEPL_ReportItemIterator = 3     // 보고서 항목 순회
};
```

---

## Report Item Type (EPL_ReportItemType)

```c
enum EPL_ReportItemType {
    eEPL_ReportItemError = 0,               // 에러
    eEPL_ReportItemWarning = 1,             // 경고
    eEPL_ReportItemFix = 2,                 // 수정됨
    eEPL_ReportItemInfo = 3,                // 정보
    eEPL_ReportItemSignOff = 4,             // 승인됨
    eEPL_ReportItemFailure = 5,             // 실패
    eEPL_ReportItemNonCriticalFailure = 6   // 비심각 실패
};
```

---

## Mutator Type (EPM_MutatorType)

```c
enum EPM_MutatorType {
    eEPM_MutatorTypeUnknown = 0,            // 알 수 없음
    eEPM_MutatorTypePreflightProfile = 1,   // Preflight Profile (.ppp)
    eEPM_MutatorTypeActionList = 2,         // Action List (.eal)
    eEPM_MutatorTypeCheck = 3               // Check (.chk)
};
```

---

## Database Type (EPS_DatabaseType)

```c
enum EPS_DatabaseType {
    eEPS_DatabaseActionLists = 0,           // Action Lists
    eEPS_DatabasePreflightProfiles = 1,     // Preflight Profiles
    eEPS_DatabaseVariableSets = 2,          // Variable Sets
    eEPS_DatabaseReportTemplates = 3        // Report Templates
};
```

---

## Color Space (EPL_ColorSpaceType)

```c
enum EPL_ColorSpaceType {
    eEPL_ColorSpaceGray = 0,        // 그레이스케일
    eEPL_ColorSpaceRGB = 1,         // RGB
    eEPL_ColorSpaceCMYK = 2,        // CMYK
    eEPL_ColorSpaceLab = 3,         // Lab
    eEPL_ColorSpaceDeviceN = 4,     // DeviceN
    eEPL_ColorSpaceSeparation = 5,  // Separation
    eEPL_ColorSpaceICCBased = 6,    // ICC 기반
    eEPL_ColorSpaceIndexed = 7,     // 인덱스
    eEPL_ColorSpacePattern = 8      // 패턴
};
```

---

## Rendering Intent (EPS_RenderingIntent)

```c
enum EPS_RenderingIntent {
    eEPS_RenderingIntentPerceptual = 0,         // 지각적
    eEPS_RenderingIntentRelativeColorimetric = 1, // 상대 색도계
    eEPS_RenderingIntentSaturation = 2,         // 채도
    eEPS_RenderingIntentAbsoluteColorimetric = 3  // 절대 색도계
};
```

---

## Progress Action (EPL_ProgressActionType)

```c
enum EPL_ProgressActionType {
    eEPL_ProgressStart = 0,         // 작업 시작
    eEPL_ProgressUpdate = 1,        // 진행률 업데이트
    eEPL_ProgressEnd = 2,           // 작업 완료
    eEPL_ProgressCancel = 3         // 취소 확인
};
```

---

## Certified PDF Status (EPL_ECWDocumentStatus)

```c
enum EPL_ECWDocumentStatus {
    eEPL_ECWDocumentUnknown = 0,        // 알 수 없음
    eEPL_ECWDocumentNotCertified = 1,   // 인증되지 않음
    eEPL_ECWDocumentCertified = 2,      // 인증됨
    eEPL_ECWDocumentModified = 3        // 인증 후 수정됨
};
```

---

## Unit Type (EPL_UnitType)

```c
enum EPL_UnitType {
    eEPL_UnitPoint = 0,             // 포인트 (pt)
    eEPL_UnitMillimeter = 1,        // 밀리미터 (mm)
    eEPL_UnitInch = 2,              // 인치 (in)
    eEPL_UnitCentimeter = 3,        // 센티미터 (cm)
    eEPL_UnitPica = 4               // 파이카
};
```

---

## 주요 Setting Types (EPL_SettingType)

```c
// 언어 설정
eEPL_Language_String_Language           // 언어 코드 (enUS, koKR, jaJA 등)

// 단위 설정
eEPL_Main_Int_Unit                      // 측정 단위

// Mutator 설정
eEPL_Mutator_FilePath_SetMutator        // Mutator 파일 경로 지정
eEPL_Mutator_Int_SetMutatorNone         // Mutator 초기화

// Certified PDF 설정
eEPL_Certify_Bool_EnableCertifiedWF     // Certified 워크플로우 활성화
eEPL_Certify_String_UserName            // 사용자 이름
eEPL_Certify_String_Organization        // 조직명

// 보고서 설정
eEPL_Report_Bool_IncludeInfo            // 정보 항목 포함
eEPL_Report_FilePath_Template           // 보고서 템플릿 경로

// 폰트 설정
eEPL_Font_FilePath_AddFolder            // 폰트 폴더 추가
```
