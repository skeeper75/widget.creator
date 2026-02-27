# PitStop SDK 워크플로우 예제

## 1. 기본 Preflight (검사만)

```c
#include "EPL_AllHeaders.h"

int main() {
    EPS_ErrorCodes result;
    EPL_ConfigurationHandle config = NULL;
    EPL_DocumentPdfHandle pdfHandle = NULL;
    EPL_DocumentReportHandle reportHandle = NULL;
    
    // 1. 초기화
    EPL_InitializeInfoStruct initInfo;
    SDK_InitStruct(initInfo);
    initInfo.mPrivate = &myPrivateStruct;
    initInfo.mResourceLocation = resourcePath;
    initInfo.mTempPath = tempPath;
    
    result = EPL_Initialize(&initInfo);
    if (result != eEPS_NoError) goto cleanup;
    
    // 2. Configuration 생성
    result = EPL_CreateConfiguration(&config);
    if (result != eEPS_NoError) goto cleanup;
    
    result = EPL_SetAsCurrentConfiguration(config);
    if (result != eEPS_NoError) goto cleanup;
    
    // 3. Preflight Profile 설정
    EPS_FilePathStruct profilePath;
    SDK_InitStruct(profilePath);
    profilePath.mEncoding = eEPS_EncodingUTF8;
    profilePath.mFilePath = "/path/to/profile.ppp";
    
    result = EPL_SetFilePathToSetting(config, 
        eEPL_Mutator_FilePath_SetMutator, &profilePath);
    if (result != eEPS_NoError) goto cleanup;
    
    // 4. PDF 열기
    EPL_CreatePdfHandleStruct pdfStruct;
    SDK_InitStruct(pdfStruct);
    pdfStruct.mFilePath = inputPdfPath;
    
    result = EPL_CreatePdfHandle(&pdfStruct);
    if (result != eEPS_NoError) goto cleanup;
    pdfHandle = pdfStruct.mDocumentPdfHandle;
    
    // 5. 처리
    EPL_ProcessStruct processStruct;
    SDK_InitStruct(processStruct);
    processStruct.mPdfHandle = pdfHandle;
    
    result = EPL_Process(&processStruct);
    if (result != eEPS_NoError) goto cleanup;
    reportHandle = processStruct.mReportHandle;
    
    // 6. 보고서 통계 확인
    EPL_ReportStatsForReportStruct stats;
    SDK_InitStruct(stats);
    stats.mReportHandle = reportHandle;
    
    EPL_GetReportStatsForReport(&stats);
    printf("Errors: %ld, Warnings: %ld, Fixes: %ld\n",
           stats.mErrors, stats.mWarnings, stats.mFixes);
    
    // 7. JSON 보고서 내보내기
    EPL_ExportJSONReportStruct jsonExport;
    SDK_InitStruct(jsonExport);
    jsonExport.mReportHandle = reportHandle;
    jsonExport.mOutputPath = reportJsonPath;
    
    EPL_ExportJSONReport(&jsonExport);
    
cleanup:
    if (reportHandle) EPL_DeleteReportHandle(reportHandle);
    if (pdfHandle) EPL_DeletePdfHandle(pdfHandle);
    if (config) EPL_CloseConfiguration(config);
    EPL_Finalize();
    
    return (result == eEPS_NoError) ? 0 : -1;
}
```

---

## 2. Preflight + Fix (검사 및 수정)

```c
// 3. Preflight Profile과 Action List 설정
// Action List 먼저 설정 (순서대로 처리됨)
EPS_FilePathStruct actionPath;
SDK_InitStruct(actionPath);
actionPath.mEncoding = eEPS_EncodingUTF8;
actionPath.mFilePath = "/path/to/fix-colors.eal";

EPL_SetFilePathToSetting(config, 
    eEPL_Mutator_FilePath_SetMutator, &actionPath);

// Preflight Profile 설정
EPS_FilePathStruct profilePath;
SDK_InitStruct(profilePath);
profilePath.mEncoding = eEPS_EncodingUTF8;
profilePath.mFilePath = "/path/to/profile.ppp";

EPL_SetFilePathToSetting(config, 
    eEPL_Mutator_FilePath_SetMutator, &profilePath);

// 처리 (PDF 수정 활성화)
EPL_ProcessStruct processStruct;
SDK_InitStruct(processStruct);
processStruct.mPdfHandle = pdfHandle;
processStruct.mCreateOutputPdf = eEPS_True;

EPL_Process(&processStruct);

// 수정된 PDF 저장
EPL_SavePdfStruct saveStruct;
SDK_InitStruct(saveStruct);
saveStruct.mPdfHandle = pdfHandle;
saveStruct.mOutputPath = outputPdfPath;

EPL_SavePdf(&saveStruct);
```

---

## 3. 보고서 항목 순회

```c
// 이터레이터 생성
EPL_IteratorHandle iterator = NULL;
EPL_CreateIterator(eEPL_ReportItemIterator, &iterator);

// 순회 시작 (경고만 필터링)
EPL_StartIteratorReportItemStruct startIter;
SDK_InitStruct(startIter);
startIter.mIterator = iterator;
startIter.mReportHandle = reportHandle;
startIter.mPdfHandle = pdfHandle;  // 상세 정보용
startIter.mItemType = eEPL_ReportItemWarning;

EPS_ErrorCodes result = EPL_StartIteratorReportItem(&startIter);

// 항목 순회
while (result == eEPS_NoError) {
    EPL_GetIteratorReportItemStruct item;
    SDK_InitStruct(item);
    item.mIterator = iterator;
    
    EPL_GetIteratorReportItem(&item);
    
    printf("Page %ld: %s\n", item.mPage, item.mMessage->mString);
    
    result = EPL_NextIterator(iterator);
}

EPL_EndIterator(iterator);
```

---

## 4. PDF 렌더링 (썸네일 생성)

```c
EPL_RenderImagesStruct render;
SDK_InitStruct(render);
render.mPdfHandle = pdfHandle;
render.mOutputPath = thumbnailPath;
render.mPageRange = "1";           // 첫 페이지만
render.mResolution = 150.0;        // 150 DPI
render.mColorSpace = eEPL_OutputColorSpaceRGB;
render.mFileFormat = "png";

EPL_RenderImages(&render);
```

---

## 5. 진행률 콜백

```c
// 콜백 함수 정의
enum EPS_Boolean ProgressCallback(
    EPL_ProgressCallbackInfoPtr inInfo, 
    void* inUserData
) {
    switch (inInfo->mAction) {
        case eEPL_ProgressStart:
            printf("Processing started\n");
            break;
        case eEPL_ProgressUpdate:
            printf("Progress: %ld%%\n", inInfo->mProgress);
            break;
        case eEPL_ProgressEnd:
            printf("Processing completed\n");
            break;
        case eEPL_ProgressCancel:
            // 취소 여부 반환
            return shouldCancel ? eEPS_True : eEPS_False;
    }
    return eEPS_False;
}

// 콜백 등록
EPL_ProgressCallbackParamsStruct cbParams;
SDK_InitStruct(cbParams);
cbParams.mFunction = ProgressCallback;
cbParams.mUserData = myUserData;

EPL_RegisterProgressCallback(&cbParams);
long callbackID = cbParams.mCallbackID;

// 처리 후 콜백 제거
EPL_RemoveProgressCallback(callbackID);
```

---

## 6. Certified PDF 워크플로우

```c
// Certified 설정 활성화
EPL_SetBoolToSetting(config, 
    eEPL_Certify_Bool_EnableCertifiedWF, eEPS_True);

// 사용자 정보 설정
EPL_SetCertifiedWFDefaultParamsStruct certParams;
SDK_InitStruct(certParams);
certParams.mConfig = config;
certParams.mUserName = userNameStr;
certParams.mOrganization = orgStr;
certParams.mEmail = emailStr;

EPL_SetCertifiedWFDefaultParams(&certParams);

// 처리 후 편집 로그 추가
EPL_AddEditLogEntryStruct logEntry;
SDK_InitStruct(logEntry);
logEntry.mPdfHandle = pdfHandle;
logEntry.mComment = commentStr;

EPL_AddEditLogEntry(&logEntry);
```

---

## 7. 색상 관리

```c
EPL_ConfigureColorManagementStruct colorMng;
SDK_InitStruct(colorMng);
colorMng.mConfig = config;
colorMng.mEnable = eEPS_True;
colorMng.mRGBProfile = sRGBProfilePath;
colorMng.mCMYKProfile = fogra39ProfilePath;
colorMng.mIntent = eEPS_RenderingIntentRelativeColorimetric;

EPL_ConfigureColorManagement(&colorMng);
```

---

## 8. 배치 처리 (폴더 순회)

```c
EPL_IteratorHandle folderIter = NULL;
EPL_CreateIterator(eEPL_IteratorFolder, &folderIter);

EPL_StartIteratorFolderStruct startFolder;
SDK_InitStruct(startFolder);
startFolder.mIterator = folderIter;
startFolder.mFolderPath = inputFolderPath;
startFolder.mRecursive = eEPS_False;

EPS_ErrorCodes result = EPL_StartIteratorFolder(&startFolder);

while (result == eEPS_NoError) {
    // 현재 파일 경로 가져오기
    EPS_FilePathStruct currentPath;
    SDK_InitStruct(currentPath);
    EPL_GetIteratorPath(folderIter, &currentPath);
    
    // PDF 파일인지 확인
    if (strstr(currentPath.mFilePath, ".pdf")) {
        // 처리...
        processPDF(currentPath.mFilePath);
    }
    
    result = EPL_NextIterator(folderIter);
}

EPL_EndIterator(folderIter);
```

---

## 9. 멀티 Configuration 전환

```c
// Configuration 1: 엄격한 검사
EPL_ConfigurationHandle strictConfig;
EPL_CreateConfiguration(&strictConfig);
EPL_SetFilePathToSetting(strictConfig, 
    eEPL_Mutator_FilePath_SetMutator, strictProfilePath);

// Configuration 2: 기본 검사
EPL_ConfigurationHandle basicConfig;
EPL_CreateConfiguration(&basicConfig);
EPL_SetFilePathToSetting(basicConfig, 
    eEPL_Mutator_FilePath_SetMutator, basicProfilePath);

// 전환하며 처리
EPL_SetAsCurrentConfiguration(strictConfig);
processStrictFiles();

EPL_SetAsCurrentConfiguration(basicConfig);
processBasicFiles();

// 정리
EPL_CloseConfiguration(strictConfig);
EPL_CloseConfiguration(basicConfig);
```

---

## 10. 에러 처리 패턴

```c
EPS_ErrorCodes processWithErrorHandling(const char* inputPath) {
    EPS_ErrorCodes result;
    
    // PDF 열기
    EPL_CreatePdfHandleStruct pdfStruct;
    SDK_InitStruct(pdfStruct);
    pdfStruct.mFilePath = inputPath;
    
    result = EPL_CreatePdfHandle(&pdfStruct);
    if (result != eEPS_NoError) {
        char* errorDesc = NULL;
        EPL_GetLastErrorDescription(&errorDesc);
        
        fprintf(stderr, "Error opening PDF: %s\n", 
                EPL_GetErrorString(result));
        if (errorDesc) {
            fprintf(stderr, "Detail: %s\n", errorDesc);
        }
        return result;
    }
    
    // 처리 계속...
}
```
