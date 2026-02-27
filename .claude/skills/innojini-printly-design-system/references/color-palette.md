# Printly Color Palette Reference

## 개요
MycomEstimatorV6 기반 5색 팔레트 시스템

---

## 색상 구조

### Primary - Blue (주요 액션)
```
용도: 선택 상태, 버튼, 링크, 강조
사용 빈도: ████████████████████ (가장 많음)

blue-50:  #eff6ff  → 선택된 배경, 호버 배경
blue-100: #dbeafe  → 배지 배경, 알림 배경
blue-200: #bfdbfe  → 보더 (선택/포커스)
blue-300: #93c5fd  → 보더 (활성)
blue-400: #60a5fa  → 아이콘, 셀 채우기
blue-500: #3b82f6  → Primary 버튼, 배지(solid), 토글
blue-600: #2563eb  → Primary 버튼 호버, 최종가 배경
blue-700: #1d4ed8  → 선택된 텍스트, 강조 텍스트
```

**Tailwind 클래스**
```css
/* 배경 */
bg-blue-50    /* 선택된 카드, 호버 */
bg-blue-100   /* 배지, 알림 */
bg-blue-500   /* Primary 버튼 */
bg-blue-600   /* 버튼 호버, 강조 블록 */

/* 텍스트 */
text-blue-400 /* 아이콘 (헤더 내) */
text-blue-500 /* 링크, 액션 텍스트 */
text-blue-600 /* 강조 값 */
text-blue-700 /* 선택된 라벨 */

/* 보더 */
border-blue-200 /* 알림, 정보 박스 */
border-blue-300 /* 활성 토글 */
border-blue-500 /* 선택된 카드 */
```

---

### Secondary - Emerald (성공/글로벌)
```
용도: 성공 상태, 해외/글로벌 모드, 긍정적 피드백
사용 빈도: ████████████ (보통)

emerald-50:  #ecfdf5  → 성공 알림 배경
emerald-100: #d1fae5  → 배지 배경
emerald-200: #a7f3d0  → 보더
emerald-500: #10b981  → 배지(solid), 그라디언트 종료
emerald-600: #059669  → 버튼, 강조 블록
emerald-700: #047857  → 텍스트
```

**Tailwind 클래스**
```css
/* 배경 */
bg-emerald-50   /* 성공 알림, 해외모드 박스 */
bg-emerald-100  /* 배지 */
bg-emerald-500  /* 해외모드 강조 */
bg-emerald-600  /* 해외모드 버튼/최종가 */

/* 텍스트 */
text-emerald-500 /* 긍정 변화 표시 */
text-emerald-600 /* 배지 텍스트 */
text-emerald-700 /* 해외모드 라벨 */

/* 보더 */
border-emerald-200 /* 성공 알림, 정보 박스 */
```

---

### Warning - Amber (경고/자투리)
```
용도: 경고, 자투리 영역, 옵션 표시, 주의 사항
사용 빈도: ████████ (적음)

amber-50:  #fffbeb  → 경고 알림 배경, 정보 박스
amber-100: #fef3c7  → 배지 배경
amber-200: #fde68a  → 보더
amber-400: #fbbf24  → 자투리 셀 채우기
amber-500: #f59e0b  → 그라디언트, 강조
amber-600: #d97706  → 배지 텍스트
amber-700: #b45309  → 경고 텍스트
```

**Tailwind 클래스**
```css
/* 배경 */
bg-amber-50   /* 경고 알림, 국내모드 박스 */
bg-amber-100  /* 배지 */
bg-yellow-100 /* 자투리 셀 (비활성) */
bg-yellow-400 /* 자투리 셀 (활성) */

/* 텍스트 */
text-amber-600 /* 배지 텍스트 */
text-amber-700 /* 경고 라벨 */

/* 보더 */
border-amber-200 /* 경고 알림, 정보 박스 */
```

---

### Alert - Red (에러/절감)
```
용도: 에러, 필수 표시, 가격 절감 강조
사용 빈도: ████ (드물게)

red-50:  #fef2f2  → 에러 알림 배경
red-100: #fee2e2  → 배지 배경, 절감 배경
red-500: #ef4444  → 에러 강조, 절감 텍스트
red-600: #dc2626  → 배지 텍스트
```

**Tailwind 클래스**
```css
/* 배경 */
bg-red-50   /* 에러 알림 */
bg-red-100  /* 절감 배지, 에러 배지 */

/* 텍스트 */
text-red-500 /* 절감 금액, 가격 하락 */
text-red-600 /* 에러 배지 텍스트, 필수 표시 */

/* 보더 */
border-red-200 /* 에러 알림 */
```

---

### Neutral - Gray (기본)
```
용도: 배경, 보더, 비활성 텍스트, 중립 UI
사용 빈도: ████████████████████████████ (가장 많음)

gray-50:  #f9fafb  → 섹션 배경, 아코디언 헤더
gray-100: #f3f4f6  → 페이지 배경, 비활성 배지
gray-200: #e5e7eb  → 기본 보더, 구분선, 비활성 셀
gray-300: #d1d5db  → 비활성 토글, 스크롤바
gray-400: #9ca3af  → 비활성 아이콘, 서브 텍스트
gray-500: #6b7280  → 메타 텍스트
gray-600: #4b5563  → 본문 보조 텍스트
gray-700: #374151  → 버튼 텍스트 (secondary)
gray-800: #1f2937  → 헤더 배경
gray-900: #111827  → 기본 텍스트
```

**Tailwind 클래스**
```css
/* 배경 */
bg-gray-50    /* 섹션 헤더, 아코디언 */
bg-gray-100   /* 페이지 배경, 토글 컨테이너 */
bg-gray-200   /* 비활성 셀, 슬라이더 트랙 */
bg-gray-800   /* 헤더 */

/* 텍스트 */
text-gray-400 /* 부가 정보, 날짜 */
text-gray-500 /* 라벨, 캡션 */
text-gray-600 /* 아코디언 제목, 본문 */
text-gray-700 /* 버튼 텍스트 */

/* 보더 */
border-gray-200 /* 기본 카드, 구분선 */
border-gray-300 /* 입력 필드 */
```

---

## 색상 조합 가이드

### 선택 상태
```jsx
// 선택됨
className="bg-blue-50 border-2 border-blue-500"
className="bg-blue-100 border-2 border-blue-500"

// 선택 안됨
className="bg-gray-50 border border-gray-200"
className="bg-white border border-gray-200"

// 호버
className="hover:bg-gray-50"
className="hover:border-blue-300"
```

### 모드별 색상
```jsx
// 국내 모드
const domestic = {
  button: 'bg-blue-600',
  badge: 'bg-blue-100 text-blue-700',
  box: 'bg-amber-50 border-amber-200',
  text: 'text-amber-700',
};

// 해외 모드
const international = {
  button: 'bg-emerald-600',
  badge: 'bg-emerald-100 text-emerald-700',
  box: 'bg-emerald-50 border-emerald-200',
  text: 'text-emerald-700',
};
```

### 상태별 피드백
```jsx
// 정보
className="bg-blue-50 border-blue-200 text-blue-700"

// 성공
className="bg-emerald-50 border-emerald-200 text-emerald-700"

// 경고
className="bg-amber-50 border-amber-200 text-amber-700"

// 에러
className="bg-red-50 border-red-200 text-red-700"
```

### 가격 변화
```jsx
// 절감 (가격 하락)
className="text-red-500 font-bold"  // ▼₩5,000

// 상승 (가격 상승)
className="text-blue-500"  // ▲₩3,000

// 긍정 변화
className="text-emerald-500"  // +15%
```

---

## 그라디언트

### Primary 그라디언트 (Blue → Emerald)
```jsx
className="bg-gradient-to-r from-blue-500 to-emerald-500"
```
용도: 프리미엄 배지, 특별 표시

### 블루 계열
```jsx
className="bg-gradient-to-br from-blue-50 to-indigo-50"
```
용도: 옵션 활성화 패널, 특별 섹션

---

## 다크모드 색상 (선택적)

```css
@media (prefers-color-scheme: dark) {
  /* 배경 반전 */
  --gray-50: #1f2937;
  --gray-100: #374151;
  --gray-800: #f3f4f6;
  --gray-900: #f9fafb;
  
  /* 컬러는 유지 또는 약간 밝게 */
  --blue-500: #60a5fa;
  --emerald-500: #34d399;
}
```

---

## 접근성 고려

### 대비율
- 본문 텍스트: gray-900 on white (21:1) ✅
- 라벨 텍스트: gray-500 on white (7:1) ✅
- 배지 텍스트: blue-700 on blue-100 (4.5:1) ✅
- 버튼 텍스트: white on blue-500 (4.7:1) ✅

### 색맹 고려
- 빨강-초록 구분 필요시 아이콘/텍스트 병행
- 상태 표시에 색상만 의존하지 않음
