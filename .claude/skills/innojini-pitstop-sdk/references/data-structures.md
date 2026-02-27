# PitStop SDK 데이터 구조 레퍼런스

## 구조체 초기화 패턴

모든 구조체는 사용 전 반드시 초기화해야 합니다:

```c
#define SDK_InitStruct(s) do { \
    memset(&s, 0, sizeof(s)); \
    s.mStructSize = sizeof(s); \
} while(0)
```

---

## 핵심 구조체

### EPL_InitializeInfoStruct
라이브러리 초기화 정보.

```c
typedef struct {
    unsigned long mStructSize;
    EPS_PrivateStructPtr mPrivate;          // 핸드셰이크 (필수)
    EPS_FilePathPtr mResourceLocation;       // 리소스 폴더
    EPS_FilePathPtr mTempPath;              // 임시 파일 경로
    EPS_StringStructPtr mApplicationName;    // 애플리케이션 이름
    EPS_StringStructPtr mApplicationVersion; // 애플리케이션 버전
} EPL_InitializeInfoStruct;
```

### EPL_CreatePdfHandleStruct
PDF 핸들 생성 정보.

```c
typedef struct {
    unsigned long mStructSize;
    EPS_FilePathPtr mFilePath;              // PDF 파일 경로 (입력)
    EPL_DocumentPdfHandle mDocumentPdfHandle; // PDF 핸들 (출력)
    EPS_StringStructPtr mUserPassword;       // 사용자 비밀번호
    EPS_StringStructPtr mOwnerPassword;      // 소유자 비밀번호
} EPL_CreatePdfHandleStruct;
```

### EPL_ProcessStruct
PDF 처리 정보.

```c
typedef struct {
    unsigned long mStructSize;
    EPL_DocumentPdfHandle mPdfHandle;        // 처리할 PDF
    EPL_DocumentReportHandle mReportHandle;  // 보고서 핸들 (출력)
    EPS_StringStructPtr mPageRange;          // 페이지 범위 ("1-5", "1,3,5")
    enum EPS_Boolean mCreateOutputPdf;       // 출력 PDF 생성 여부
} EPL_ProcessStruct;
```

### EPL_SavePdfStruct
PDF 저장 정보.

```c
typedef struct {
    unsigned long mStructSize;
    EPL_DocumentPdfHandle mPdfHandle;        // 저장할 PDF
    EPS_FilePathPtr mOutputPath;             // 출력 경로
    enum EPS_Boolean mKeepPassword;          // 기존 비밀번호 유지
    EPS_StringStructPtr mNewUserPassword;    // 새 사용자 비밀번호
    EPS_StringStructPtr mNewOwnerPassword;   // 새 소유자 비밀번호
} EPL_SavePdfStruct;
```

---

## 보고서 구조체

### EPL_ReportStatsForReportStruct
보고서 통계.

```c
typedef struct {
    unsigned long mStructSize;
    EPL_DocumentReportHandle mReportHandle;  // 보고서 핸들
    long mErrors;                            // 에러 수 (출력)
    long mWarnings;                          // 경고 수 (출력)
    long mFixes;                             // 수정 수 (출력)
    long mInfos;                             // 정보 수 (출력)
    long mSignOffs;                          // 승인 수 (출력)
    long mFailures;                          // 실패 수 (출력)
} EPL_ReportStatsForReportStruct;
```

### EPL_ExportJSONReportStruct
JSON 보고서 내보내기.

```c
typedef struct {
    unsigned long mStructSize;
    EPL_DocumentReportHandle mReportHandle;  // 보고서 핸들
    EPS_FilePathPtr mOutputPath;             // 출력 경로
    enum EPS_Boolean mPrettyPrint;           // 포맷팅 여부
} EPL_ExportJSONReportStruct;
```

### EPL_GetIteratorReportItemStruct
보고서 항목 정보.

```c
typedef struct {
    unsigned long mStructSize;
    EPL_IteratorHandle mIterator;            // 이터레이터 핸들
    enum EPL_ReportItemType mType;           // 항목 타입 (출력)
    EPS_StringStructPtr mMessage;            // 메시지 (출력)
    long mPage;                              // 페이지 번호 (출력)
    long mObjectCount;                       // 관련 객체 수 (출력)
} EPL_GetIteratorReportItemStruct;
```

---

## 렌더링 구조체

### EPL_RenderImagesStruct
이미지 렌더링 정보.

```c
typedef struct {
    unsigned long mStructSize;
    EPL_DocumentPdfHandle mPdfHandle;        // PDF 핸들
    EPS_FilePathPtr mOutputPath;             // 출력 폴더
    EPS_StringStructPtr mPageRange;          // 페이지 범위
    double mResolution;                      // 해상도 (DPI)
    enum EPL_OutputColorSpace mColorSpace;   // 출력 색상 공간
    EPS_StringStructPtr mFileFormat;         // 파일 형식 (png, jpg, tiff)
} EPL_RenderImagesStruct;
```

---

## 공통 구조체

### EPS_FilePathStruct
파일 경로.

```c
typedef struct {
    unsigned long mStructSize;
    enum EPS_Encoding mEncoding;             // 인코딩
    const char* mFilePath;                   // 경로 문자열
} EPS_FilePathStruct;
```

### EPS_StringStruct
문자열.

```c
typedef struct {
    unsigned long mStructSize;
    enum EPS_Encoding mEncoding;             // 인코딩
    const char* mString;                     // 문자열
    unsigned long mLength;                   // 길이 (바이트)
} EPS_StringStruct;
```

---

## 콜백 구조체

### EPL_ProgressCallbackParamsStruct
진행률 콜백 파라미터.

```c
typedef struct {
    unsigned long mStructSize;
    EPL_ProgressCallbackFunc mFunction;      // 콜백 함수
    void* mUserData;                         // 사용자 데이터
    long mCallbackID;                        // 콜백 ID (출력)
} EPL_ProgressCallbackParamsStruct;

// 콜백 함수 시그니처
typedef enum EPS_Boolean (*EPL_ProgressCallbackFunc)(
    EPL_ProgressCallbackInfoPtr inInfo,
    void* inUserData
);
```

### EPL_ProgressCallbackInfoStruct
진행률 콜백 정보.

```c
typedef struct {
    unsigned long mStructSize;
    enum EPL_ProgressActionType mAction;     // 액션 타입
    long mProgress;                          // 진행률 (0-100)
    EPS_StringStructPtr mMessage;            // 메시지
} EPL_ProgressCallbackInfoStruct;
```

---

## Certified PDF 구조체

### EPL_SetCertifiedWFDefaultParamsStruct
Certified PDF 기본 설정.

```c
typedef struct {
    unsigned long mStructSize;
    EPL_ConfigurationHandle mConfig;         // Configuration 핸들
    EPS_StringStructPtr mUserName;           // 사용자 이름
    EPS_StringStructPtr mOrganization;       // 조직명
    EPS_StringStructPtr mEmail;              // 이메일
} EPL_SetCertifiedWFDefaultParamsStruct;
```

---

## 색상 관리 구조체

### EPL_ConfigureColorManagementStruct
색상 관리 설정.

```c
typedef struct {
    unsigned long mStructSize;
    EPL_ConfigurationHandle mConfig;         // Configuration 핸들
    enum EPS_Boolean mEnable;                // 활성화 여부
    EPS_FilePathPtr mRGBProfile;             // RGB ICC 프로파일
    EPS_FilePathPtr mCMYKProfile;            // CMYK ICC 프로파일
    EPS_FilePathPtr mGrayProfile;            // Gray ICC 프로파일
    enum EPS_RenderingIntent mIntent;        // 렌더링 인텐트
} EPL_ConfigureColorManagementStruct;
```

---

## 이터레이터 구조체

### EPL_StartIteratorFolderStruct
폴더 이터레이터 시작.

```c
typedef struct {
    unsigned long mStructSize;
    EPL_IteratorHandle mIterator;            // 이터레이터 핸들
    EPS_FilePathPtr mFolderPath;             // 폴더 경로
    enum EPS_Boolean mRecursive;             // 재귀 탐색 여부
} EPL_StartIteratorFolderStruct;
```

### EPL_StartIteratorReportItemStruct
보고서 이터레이터 시작.

```c
typedef struct {
    unsigned long mStructSize;
    EPL_IteratorHandle mIterator;            // 이터레이터 핸들
    EPL_DocumentReportHandle mReportHandle;  // 보고서 핸들
    EPL_DocumentPdfHandle mPdfHandle;        // PDF 핸들 (상세 정보용)
    enum EPL_ReportItemType mItemType;       // 필터할 항목 타입
} EPL_StartIteratorReportItemStruct;
```
