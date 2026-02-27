# PitStop SDK 에러 코드 레퍼런스

## 에러 코드 표

| 코드 | 열거형 | 설명 | 해결 방법 |
|------|--------|------|-----------|
| 0 | `eEPS_NoError` | 성공 | - |
| 1 | `eEPS_ErrorIncorrectStructSize` | 잘못된 구조체 크기 | SDK_InitStruct() 사용 확인 |
| 2 | `eEPS_ErrorBadInputArgument` | 잘못된 입력 인자 | 필수 파라미터 확인 |
| 3 | `eEPS_ErrorIncorrectEnumValue` | 잘못된 열거형 값 | 올바른 enum 값 사용 |
| 4 | `eEPS_ErrorInitializationFailed` | 초기화 실패 | 핸드셰이크/리소스 경로 확인 |
| 5 | `eEPS_ErrorBasic` | 기본 오류 | GetLastErrorDescription() 확인 |
| 6 | `eEPS_ErrorBasicTools` | 기본 도구 오류 | GetLastErrorDescription() 확인 |
| 7 | `eEPS_ErrorPDF` | PDF 처리 오류 | PDF 파일 유효성 확인 |
| 8 | `eEPS_ErrorFile` | 파일 오류 | 파일 경로/권한 확인 |
| 9 | `eEPS_ErrorMemory` | 메모리 부족 | 시스템 메모리 확인, 분할 처리 |
| 10 | `eEPS_ErrorPassword` | 비밀번호 오류 | 올바른 비밀번호 입력 |
| 11 | `eEPS_ErrorPermission` | 권한 오류 | PDF 권한 설정 확인 |
| 12 | `eEPS_ErrorCertifiedWorkflow` | Certified PDF 오류 | Certified 설정 확인 |
| 13 | `eEPS_ErrorIterator` | 이터레이터 오류 | 이터레이터 상태 확인 |
| 14 | `eEPS_ErrorMutator` | Mutator 오류 | 프로파일/액션리스트 파일 확인 |
| 15 | `eEPS_ErrorConfiguration` | Configuration 오류 | Configuration 핸들 확인 |
| 16 | `eEPS_ErrorRender` | 렌더링 오류 | 렌더링 설정/메모리 확인 |
| 17 | `eEPS_ErrorColorManagement` | 색상 관리 오류 | ICC 프로파일 경로 확인 |
| 18 | `eEPS_ErrorFlatten` | 평탄화 오류 | 평탄화 라이브러리 확인 |
| 19 | `eEPS_ErrorProcess` | 처리 오류 | 보고서에서 상세 오류 확인 |
| 21 | `eEPS_ErrorCancelled` | 사용자 취소 | 정상적인 취소 |
| 99 | `eEPS_FatalError` | 치명적 오류 | Enfocus 지원 문의 |

---

## 자주 발생하는 에러

### eEPS_ErrorIncorrectStructSize

**원인:**
- 구조체 초기화 안 함
- mStructSize 미설정
- 헤더/라이브러리 버전 불일치

**해결:**
```c
// 올바른 초기화
MyStruct s;
SDK_InitStruct(s);  // memset + mStructSize 설정
```

### eEPS_ErrorInitializationFailed

**원인:**
- 핸드셰이크 오류
- 리소스 폴더 없음
- 라이선스 문제

**해결:**
```c
// 핸드셰이크 확인
EPS_PrivateStruct privateStruct;
EPS_OEM_YourCompany_Private(&privateStruct);

// 리소스 경로 확인
initInfo.mResourceLocation = "/valid/path/to/Resources";
```

### eEPS_ErrorFile

**원인:**
- 파일 경로 오타
- 파일 없음
- 접근 권한 없음

**해결:**
```c
// 절대 경로 사용
pdfStruct.mFilePath = "/absolute/path/to/file.pdf";

// 파일 존재 확인
#include <sys/stat.h>
struct stat buffer;
if (stat(filePath, &buffer) != 0) {
    printf("File not found: %s\n", filePath);
}
```

### eEPS_ErrorPassword

**원인:**
- 잘못된 비밀번호
- 사용자/소유자 비밀번호 혼동

**해결:**
```c
// 둘 다 시도
pdfStruct.mUserPassword = password;
pdfStruct.mOwnerPassword = password;
```

### eEPS_ErrorMutator

**원인:**
- 프로파일 파일 손상
- 호환되지 않는 버전
- 참조 리소스 누락

**해결:**
```c
// Mutator 정보 먼저 확인
EPL_CreateMutatorHandleStruct mutatorStruct;
SDK_InitStruct(mutatorStruct);
mutatorStruct.mFilePath = profilePath;

result = EPL_CreateMutatorHandle(&mutatorStruct);
if (result == eEPS_NoError) {
    // 버전 정보 확인
}
```

### eEPS_ErrorMemory

**원인:**
- 대용량 PDF
- 고해상도 렌더링
- 메모리 누수

**해결:**
```c
// 페이지 범위 분할
processStruct.mPageRange = "1-10";  // 10페이지씩

// 렌더링 해상도 낮추기
renderStruct.mResolution = 150.0;  // 300→150

// 핸들 정리 확인
EPL_DeletePdfHandle(handle);
EPL_CollectGarbage();
```

---

## 에러 처리 패턴

### 기본 패턴

```c
EPS_ErrorCodes result = EPL_SomeFunction(&params);
if (result != eEPS_NoError) {
    printf("Error: %s\n", EPL_GetErrorString(result));
    return result;
}
```

### 상세 정보 포함

```c
EPS_ErrorCodes result = EPL_SomeFunction(&params);
if (result != eEPS_NoError) {
    char* errorDesc = NULL;
    EPL_GetLastErrorDescription(&errorDesc);
    
    fprintf(stderr, "[ERROR] %s failed: %s (%d)\n",
            "FunctionName",
            EPL_GetErrorString(result),
            result);
    
    if (errorDesc) {
        fprintf(stderr, "        Detail: %s\n", errorDesc);
    }
    
    return result;
}
```

### 리소스 정리 포함

```c
EPS_ErrorCodes safeProcess(const char* inputPath) {
    EPS_ErrorCodes result;
    EPL_DocumentPdfHandle pdfHandle = NULL;
    EPL_DocumentReportHandle reportHandle = NULL;
    EPL_ConfigurationHandle config = NULL;
    
    // 작업 수행...
    result = EPL_CreateConfiguration(&config);
    if (result != eEPS_NoError) goto cleanup;
    
    result = EPL_CreatePdfHandle(&pdfStruct);
    if (result != eEPS_NoError) goto cleanup;
    pdfHandle = pdfStruct.mDocumentPdfHandle;
    
    // 처리...
    
cleanup:
    // 역순으로 정리
    if (reportHandle) EPL_DeleteReportHandle(reportHandle);
    if (pdfHandle) EPL_DeletePdfHandle(pdfHandle);
    if (config) EPL_CloseConfiguration(config);
    EPL_CollectGarbage();
    
    return result;
}
```

---

## 디버깅 팁

### Assert 콜백 설정

```c
void MyAssertCallback(EPL_AssertParamsPtr inParams) {
    fprintf(stderr, "ASSERT: %s\n", inParams->mMessage);
}

EPL_AssertParamsStruct assertParams;
SDK_InitStruct(assertParams);
assertParams.mFunction = MyAssertCallback;
EPL_SetAssertCallback(&assertParams);
```

### 로그 레벨 설정

```c
// 환경 변수로 로그 레벨 조정
export EPL_LOG_LEVEL=debug
```

---

## 리소스 정리 체크리스트

핸들은 생성 역순으로 정리:

```c
// 1. 보고서 핸들
if (reportHandle) EPL_DeleteReportHandle(reportHandle);

// 2. PDF 핸들
if (pdfHandle) EPL_DeletePdfHandle(pdfHandle);

// 3. Mutator 핸들
if (mutatorHandle) EPL_DeleteMutatorHandle(mutatorHandle);

// 4. 이터레이터
if (iterator) EPL_EndIterator(iterator);

// 5. Configuration
if (config) EPL_CloseConfiguration(config);

// 6. 가비지 컬렉션
EPL_CollectGarbage();

// 7. 라이브러리 종료 (최후)
EPL_Finalize();
```
