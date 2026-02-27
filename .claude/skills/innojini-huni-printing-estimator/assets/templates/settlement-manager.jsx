import React, { useState, useCallback, useMemo } from 'react';
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft,
  X, ChevronRight, Download, RefreshCw, Building2, Layers, DollarSign, 
  Package, FileWarning, Settings, Plus, Eye, FileText, Calculator,
  TrendingUp, AlertTriangle, Check, ChevronDown
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// 디자인 시스템 - 애플 스타일 (그라데이션 없음, 최대 3색)
// ═══════════════════════════════════════════════════════════════════

const theme = {
  colors: {
    bg: '#F5F5F7',
    surface: '#FFFFFF',
    border: '#D2D2D7',
    borderLight: '#E8E8ED',
    
    text: '#1D1D1F',
    textSecondary: '#6E6E73',
    textTertiary: '#86868B',
    
    primary: '#0071E3',
    primaryHover: '#0077ED',
    
    success: '#34C759',
    warning: '#FF9F0A',
    error: '#FF3B30',
  }
};

// ═══════════════════════════════════════════════════════════════════
// 외주사 설정 데이터
// ═══════════════════════════════════════════════════════════════════

const PARTNER_CONFIGS = {
  fujifilm: {
    id: 'fujifilm',
    name: '후지필름',
    color: '#006B3F',
    description: '롯데ON 경유 포토북/굿즈',
    sheets: {
      main: { name: 'Sheet', label: '정산 데이터' }
    },
    keyColumns: {
      orderId: '거래처주문번호',
      productId: '거래처 제작 or 작업번호',
      productName: '품목 명',
      quantity: '제작수량',
      unitPrice: '생산단가',
      amount: '금액',
      status: '주문상태'
    },
    validStatus: ['출고 완료'],
    orderIdSuffix: ['S1', 'S2', 'S3']
  },
  bizhouse: {
    id: 'bizhouse',
    name: '비즈하우스',
    color: '#FF6B00',
    description: '자체 플랫폼 인쇄물',
    sheets: {
      partnerData: { name: '인화업체정산_*', label: '외주사 데이터' },
      internalData: { name: '후니내역', label: '내부 MES 데이터' },
      mapping: { name: '중복', label: '매핑 테이블' },
      correction: { name: '보정', label: '보정 내역' },
      islandShipping: { name: '제주도서', label: '도서산간 배송비' }
    },
    keyColumns: {
      partnerOrderId: '주문 IDX',
      partnerProductId: '상품 IDX',
      internalOrderId: '거래처주문번호',
      internalProductId: '거래처 제작 or 작업번호',
      productName: '상품명',
      quantity: '수량',
      totalPrice: '총 공급가격',
      status: '생산단계'
    },
    validStatus: ['배송완료'],
    islandShippingFee: 3000
  }
};

// 실제 분석 결과 (비즈하우스) - 2025.11 정산
const SAMPLE_BIZHOUSE_RESULT = {
  summary: {
    totalRecords: 10530,
    matched: 10499,
    unmatched: 9,
    corrections: 66,
    excluded: 22,
    matchRate: 99.71
  },
  amounts: {
    productTotal: 226049380,
    shippingTotal: 24273900,
    islandShipping: 407000,
    islandCount: 72,
    correctionTotal: 20382990,
    subtotal: 271113270,
    vat: 27111327,
    grandTotal: 298224597
  },
  discrepancies: [
    { id: 1, productId: '30540857', issue: '매핑 테이블 없음', partnerQty: 1, internalQty: null, diff: -1 },
    { id: 2, productId: '30540766', issue: '매핑 테이블 없음', partnerQty: 1, internalQty: null, diff: -1 },
    { id: 3, productId: '30540774', issue: '매핑 테이블 없음', partnerQty: 1, internalQty: null, diff: -1 },
    { id: 4, productId: '30540860', issue: '매핑 테이블 없음', partnerQty: 1, internalQty: null, diff: -1 },
    { id: 5, productId: '30540875', issue: '매핑 테이블 없음', partnerQty: 1, internalQty: null, diff: -1 },
    { id: 6, productId: '30508768', issue: '내부 데이터 없음', partnerQty: 1, internalQty: null, diff: -1 },
    { id: 7, productId: '30540943', issue: '내부 데이터 없음', partnerQty: 1, internalQty: null, diff: -1 },
    { id: 8, productId: '30518732', issue: '내부 데이터 없음', partnerQty: 1, internalQty: null, diff: -1 },
    { id: 9, productId: '30528408', issue: '내부 데이터 없음', partnerQty: 1, internalQty: null, diff: -1 },
  ],
  corrections: [
    { id: 1, orderId: '8360672', productId: '30148381', memo: '반품 요청됨 - 반품 택배비 청구', amount: 66360 },
    { id: 2, orderId: '8369203', productId: '30190163', memo: '', amount: 29000 },
    { id: 3, orderId: '8381728', productId: '30209949', memo: '', amount: 7370 },
    { id: 4, orderId: '8386056', productId: '30245706', memo: '', amount: 23320 },
    { id: 5, orderId: '8386056', productId: '30245980', memo: '', amount: 35200 },
    { id: 6, orderId: '8388003', productId: '30251733', memo: '', amount: 13530 },
  ],
  productBreakdown: [
    { name: '2단접지카드', qty: 4521, unitPrice: 1200, amount: 54252000 },
    { name: '반칼자유형스티커', qty: 2103, unitPrice: 2500, amount: 52575000 },
    { name: '아크릴키링', qty: 1892, unitPrice: 3000, amount: 56760000 },
    { name: '트레싱지봉투', qty: 856, unitPrice: 1800, amount: 15408000 },
    { name: '인쇄배경지', qty: 743, unitPrice: 800, amount: 5944000 },
    { name: '무광시트커팅', qty: 621, unitPrice: 1500, amount: 9315000 },
    { name: '클립보드', qty: 412, unitPrice: 2200, amount: 9064000 },
  ]
};

// 실제 분석 결과 (후지필름) - 2025.11 정산
const SAMPLE_FUJIFILM_RESULT = {
  summary: {
    totalRecords: 57,
    matched: 27,
    unmatched: 5,
    corrections: 0,
    matchRate: 93.1,
    note: '⚠️ 금액 데이터 없음 - 가격표 연동 필요'
  },
  amounts: {
    productTotal: 0,  // 금액 데이터 없음
    islandShipping: 0,
    islandCount: 0,
    correctionTotal: 0,
    subtotal: 0,
    vat: 0,
    grandTotal: 0,
    needsPriceTable: true
  },
  discrepancies: [
    { id: 1, productId: 'B2510241538223', issue: 'MES에 없음', partnerQty: 1, internalQty: null, diff: -1, customer: '롯데몰 은평점' },
    { id: 2, productId: 'B2510251223363', issue: 'MES에 없음', partnerQty: 1, internalQty: null, diff: -1, customer: '준포토(춘천)' },
    { id: 3, productId: 'M2511211355322', issue: '후지에 없음', partnerQty: null, internalQty: 1, diff: 1, customer: '조민희' },
    { id: 4, productId: 'B2511201920013', issue: '후지에 없음', partnerQty: null, internalQty: 1, diff: 1, customer: '장태양' },
    { id: 5, productId: 'M2511032258328', issue: '후지에 없음', partnerQty: null, internalQty: 1, diff: 1, customer: '이지아' },
  ],
  productBreakdown: [
    { name: '포토북', qty: 96, unitPrice: null, amount: null },
    { name: '레더스트랩키링', qty: 20, unitPrice: null, amount: null },
    { name: '반칼팬시스티커', qty: 12, unitPrice: null, amount: null },
    { name: '아크릴키링', qty: 7, unitPrice: null, amount: null },
    { name: '엽서북', qty: 4, unitPrice: null, amount: null },
    { name: '포토카드', qty: 4, unitPrice: null, amount: null },
    { name: '캔버스 스트랩 라벨파우치', qty: 4, unitPrice: null, amount: null },
    { name: '핀버튼', qty: 3, unitPrice: null, amount: null },
    { name: '래더여권케이스', qty: 1, unitPrice: null, amount: null },
  ],
  statusBreakdown: {
    '출고 완료': 43,
    '제작 대기': 14
  }
};

// ═══════════════════════════════════════════════════════════════════
// UI 컴포넌트
// ═══════════════════════════════════════════════════════════════════

const Card = ({ children, className = '', padding = true }) => (
  <div 
    className={`bg-white rounded-2xl border ${padding ? 'p-6' : ''} ${className}`}
    style={{ borderColor: theme.colors.border }}
  >
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', size = 'md', icon: Icon, onClick, disabled, className = '' }) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl';
  const variants = {
    primary: `text-white ${disabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`,
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
      {children}
    </button>
  );
};

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-700',
    error: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

const StatBox = ({ label, value, subValue, icon: Icon, color = theme.colors.primary }) => (
  <div className="text-center p-5">
    <div 
      className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
      style={{ backgroundColor: `${color}12` }}
    >
      <Icon size={20} style={{ color }} />
    </div>
    <p className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</p>
    <p className="text-sm text-gray-500 mt-1">{label}</p>
    {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
  </div>
);

const ProgressRing = ({ value, size = 120, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E5EA"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={theme.colors.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-semibold text-gray-900">{Math.round(value)}%</span>
      </div>
    </div>
  );
};

const formatCurrency = (num) => {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(num);
};

const formatNumber = (num) => {
  return new Intl.NumberFormat('ko-KR').format(num);
};

// ═══════════════════════════════════════════════════════════════════
// 메인 앱
// ═══════════════════════════════════════════════════════════════════

export default function SettlementManager() {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, upload, analysis, results
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [sheetMapping, setSheetMapping] = useState({});
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  // 분석 시작
  const startAnalysis = useCallback(() => {
    setCurrentView('analysis');
    setAnalysisProgress(0);
    
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setCurrentView('results'), 300);
          return 100;
        }
        return prev + Math.random() * 12 + 3;
      });
    }, 150);
  }, []);

  // 대시보드로 돌아가기
  const goToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedPartner(null);
    setUploadedFiles({});
    setActiveTab('overview');
  };

  // 현재 결과 데이터
  const currentResult = useMemo(() => {
    if (selectedPartner === 'bizhouse') return SAMPLE_BIZHOUSE_RESULT;
    if (selectedPartner === 'fujifilm') return SAMPLE_FUJIFILM_RESULT;
    return null;
  }, [selectedPartner]);

  // ─────────────────────────────────────────────────────────────────
  // 대시보드 뷰
  // ─────────────────────────────────────────────────────────────────
  const DashboardView = () => (
    <div className="max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
          정산 관리
        </h1>
        <p className="text-gray-500 mt-2">
          외주 파트너사 정산을 자동으로 분석하고 관리합니다
        </p>
      </div>

      {/* 파트너 카드 */}
      <div className="grid grid-cols-3 gap-5 mb-10">
        {Object.values(PARTNER_CONFIGS).map(partner => (
          <Card 
            key={partner.id} 
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-gray-300"
            onClick={() => {
              setSelectedPartner(partner.id);
              setCurrentView('upload');
            }}
          >
            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${partner.color}12` }}
              >
                <Building2 size={24} style={{ color: partner.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{partner.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{partner.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-400">
                {partner.id === 'bizhouse' ? '10,530건 • ₩298M' : '57건 • 가격표 필요'}
              </span>
              <ChevronRight size={18} className="text-gray-300" />
            </div>
          </Card>
        ))}

        {/* 신규 추가 카드 */}
        <Card className="border-dashed cursor-pointer hover:border-gray-400 transition-colors">
          <div className="flex flex-col items-center justify-center h-full text-center py-4">
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
              <Plus size={24} className="text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-600">신규 외주사</h3>
            <p className="text-sm text-gray-400 mt-1">파트너 추가</p>
          </div>
        </Card>
      </div>

      {/* 이번 달 현황 */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900">2025년 11월 정산 현황</h2>
          <Button variant="ghost" size="sm">
            상세보기
          </Button>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">총 건수</p>
            <p className="text-xl font-semibold text-gray-900">10,577</p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl">
            <p className="text-sm text-green-600 mb-1">정산 완료</p>
            <p className="text-xl font-semibold text-green-700">2건</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-xl">
            <p className="text-sm text-amber-600 mb-1">검토 필요</p>
            <p className="text-xl font-semibold text-amber-700">14건</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">예상 금액</p>
            <p className="text-xl font-semibold text-gray-900">₩56M</p>
          </div>
        </div>
      </Card>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────
  // 업로드 뷰
  // ─────────────────────────────────────────────────────────────────
  const UploadView = () => {
    const partner = PARTNER_CONFIGS[selectedPartner];
    const isBizhouse = selectedPartner === 'bizhouse';

    const handleFileDrop = (e, type) => {
      e.preventDefault();
      const file = e.dataTransfer?.files[0] || e.target.files[0];
      if (file) {
        setUploadedFiles(prev => ({ ...prev, [type]: file }));
      }
    };

    const FileDropZone = ({ type, label, description }) => (
      <label
        onDrop={(e) => handleFileDrop(e, type)}
        onDragOver={(e) => e.preventDefault()}
        className="flex flex-col items-center justify-center h-44 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => handleFileDrop(e, type)}
          className="hidden"
        />
        {uploadedFiles[type] ? (
          <div className="flex items-center gap-3 px-4">
            <FileSpreadsheet size={28} style={{ color: partner.color }} />
            <div>
              <p className="text-sm font-medium text-gray-900 truncate max-w-48">
                {uploadedFiles[type].name}
              </p>
              <p className="text-xs text-gray-500">
                {(uploadedFiles[type].size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button 
              onClick={(e) => {
                e.preventDefault();
                setUploadedFiles(prev => {
                  const next = { ...prev };
                  delete next[type];
                  return next;
                });
              }}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        ) : (
          <>
            <Upload size={28} className="text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          </>
        )}
      </label>
    );

    return (
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={goToDashboard}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${partner.color}12` }}
            >
              <Building2 size={20} style={{ color: partner.color }} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{partner.name} 정산</h1>
              <p className="text-sm text-gray-500">파일 업로드 및 분석</p>
            </div>
          </div>
        </div>

        {/* 파일 업로드 영역 */}
        <Card className="mb-6">
          <h2 className="font-medium text-gray-900 mb-4">Step 1. 파일 업로드</h2>
          
          <div className={`grid ${isBizhouse ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            {isBizhouse ? (
              <FileDropZone 
                type="bizhouse"
                label="비즈하우스 정산 파일"
                description="인화업체정산, 후니내역 시트 포함"
              />
            ) : (
              <>
                <FileDropZone 
                  type="partner"
                  label="외주사 정산 파일"
                  description="후지필름 정산 리스트"
                />
                <FileDropZone 
                  type="internal"
                  label="내부 MES 파일"
                  description="롯데ON 주문 데이터"
                />
              </>
            )}
          </div>
        </Card>

        {/* 시트 매핑 (비즈하우스만) */}
        {isBizhouse && uploadedFiles.bizhouse && (
          <Card className="mb-6">
            <h2 className="font-medium text-gray-900 mb-4">Step 2. 시트 확인</h2>
            <div className="space-y-3">
              {[
                { key: 'partnerData', label: '외주사 데이터', detected: '인화업체정산_2025-11-03' },
                { key: 'internalData', label: '내부 MES', detected: '후니내역' },
                { key: 'mapping', label: '매핑 테이블', detected: '중복' },
                { key: 'correction', label: '보정 내역', detected: '보정' },
                { key: 'island', label: '도서산간', detected: '제주도서' },
              ].map(sheet => (
                <div key={sheet.key} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">{sheet.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{sheet.detected}</span>
                    <Check size={16} className="text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 분석 시작 */}
        <div className="flex justify-end">
          <Button 
            size="lg"
            icon={ArrowRight}
            onClick={startAnalysis}
            disabled={isBizhouse ? !uploadedFiles.bizhouse : (!uploadedFiles.partner || !uploadedFiles.internal)}
          >
            분석 시작
          </Button>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // 분석 중 뷰
  // ─────────────────────────────────────────────────────────────────
  const AnalysisView = () => {
    const partner = PARTNER_CONFIGS[selectedPartner];
    
    const stages = [
      { label: '파일 구조 분석', threshold: 20 },
      { label: '데이터 정규화', threshold: 40 },
      { label: '주문 매칭', threshold: 60 },
      { label: '불일치 검출', threshold: 80 },
      { label: '결과 집계', threshold: 100 },
    ];

    const currentStage = stages.find(s => analysisProgress < s.threshold) || stages[stages.length - 1];

    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="mb-8">
          <ProgressRing value={Math.min(analysisProgress, 100)} size={140} />
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {partner.name} 데이터 분석 중
        </h2>
        <p className="text-gray-500 mb-8">{currentStage.label}...</p>

        <div className="flex justify-center gap-2">
          {stages.map((stage, idx) => (
            <div 
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                analysisProgress >= stage.threshold ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // 결과 뷰
  // ─────────────────────────────────────────────────────────────────
  const ResultsView = () => {
    const partner = PARTNER_CONFIGS[selectedPartner];
    const result = currentResult;

    const tabs = [
      { id: 'overview', label: '개요', icon: Eye },
      { id: 'discrepancies', label: '불일치', icon: AlertTriangle, count: result.discrepancies.length },
      { id: 'corrections', label: '보정', icon: FileText, count: result.corrections?.length || 0 },
      { id: 'breakdown', label: '품목별', icon: Layers },
    ];

    return (
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={goToDashboard}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-gray-900">{partner.name} 정산 분석</h1>
                <Badge variant="success">완료</Badge>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">2025년 11월 정산</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" icon={RefreshCw} onClick={() => setCurrentView('upload')}>
              다시 분석
            </Button>
            <Button icon={Download}>
              정산서 다운로드
            </Button>
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card padding={false}>
            <StatBox 
              icon={Package} 
              label="총 건수" 
              value={formatNumber(result.summary.totalRecords)}
              color={theme.colors.primary}
            />
          </Card>
          <Card padding={false}>
            <StatBox 
              icon={CheckCircle2} 
              label="일치" 
              value={`${result.summary.matchRate}%`}
              subValue={`${formatNumber(result.summary.matched)}건`}
              color={theme.colors.success}
            />
          </Card>
          <Card padding={false}>
            <StatBox 
              icon={AlertCircle} 
              label="불일치" 
              value={formatNumber(result.summary.unmatched)}
              subValue="확인 필요"
              color={theme.colors.error}
            />
          </Card>
          <Card padding={false}>
            <StatBox 
              icon={DollarSign} 
              label="정산 금액" 
              value={`₩${(result.amounts.grandTotal / 1000000).toFixed(1)}M`}
              subValue="VAT 포함"
              color="#8B5CF6"
            />
          </Card>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            {/* 금액 상세 */}
            <Card>
              <h3 className="font-medium text-gray-900 mb-4">정산 금액 상세</h3>
              {result.amounts.needsPriceTable ? (
                <div className="p-6 bg-amber-50 rounded-xl text-center">
                  <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
                  <p className="font-medium text-amber-700">가격표 연동 필요</p>
                  <p className="text-sm text-amber-600 mt-1">
                    생산단가/금액 데이터가 비어있습니다.<br/>
                    가격표 DB를 연동해주세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">상품 금액</span>
                    <span className="font-medium text-gray-900">{formatCurrency(result.amounts.productTotal)}</span>
                  </div>
                  {result.amounts.shippingTotal > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">일반 배송비</span>
                      <span className="font-medium text-gray-900">{formatCurrency(result.amounts.shippingTotal)}</span>
                    </div>
                  )}
                  {result.amounts.islandCount > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">도서산간 배송비 ({result.amounts.islandCount}건)</span>
                      <span className="font-medium text-gray-900">{formatCurrency(result.amounts.islandShipping)}</span>
                    </div>
                  )}
                  {result.amounts.correctionTotal > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">보정 금액 ({result.summary.corrections}건)</span>
                      <span className="font-medium text-gray-900">{formatCurrency(result.amounts.correctionTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-t border-gray-100">
                    <span className="text-gray-600">합계 (VAT 별도)</span>
                    <span className="font-medium text-gray-900">{formatCurrency(result.amounts.subtotal)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">VAT (10%)</span>
                    <span className="font-medium text-gray-900">{formatCurrency(result.amounts.vat)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 border-gray-200">
                    <span className="font-semibold text-gray-900">총 정산금액</span>
                    <span className="font-semibold text-xl text-blue-600">{formatCurrency(result.amounts.grandTotal)}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* 매칭 현황 */}
            <Card>
              <h3 className="font-medium text-gray-900 mb-4">매칭 현황</h3>
              <div className="flex items-center justify-center py-6">
                <ProgressRing value={result.summary.matchRate} size={160} strokeWidth={12} />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-lg font-semibold text-green-700">{formatNumber(result.summary.matched)}</p>
                  <p className="text-xs text-green-600">일치</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-lg font-semibold text-red-600">{result.summary.unmatched}</p>
                  <p className="text-xs text-red-500">불일치</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-lg font-semibold text-amber-600">{result.summary.corrections}</p>
                  <p className="text-xs text-amber-500">보정</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'discrepancies' && (
          <Card padding={false}>
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">불일치 항목</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{result.discrepancies.length}건의 확인이 필요합니다</p>
                </div>
                <Button variant="outline" size="sm" icon={Download}>
                  Excel 내보내기
                </Button>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">#</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">상품ID</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">이슈</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-5 py-3">외주사</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-5 py-3">내부</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-5 py-3">차이</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.discrepancies.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 text-sm text-gray-400">{idx + 1}</td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm text-gray-900">{item.productId}</span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={item.issue.includes('없음') ? 'error' : 'warning'}>
                        {item.issue}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-gray-900">
                      {item.partnerQty ?? item.partnerAmt ? (item.partnerAmt ? formatCurrency(item.partnerAmt) : item.partnerQty) : '-'}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-gray-900">
                      {item.internalQty ?? item.internalAmt ? (item.internalAmt ? formatCurrency(item.internalAmt) : item.internalQty) : '-'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-medium text-red-600">
                        {item.diff < 0 ? item.diff : `+${item.diff}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {activeTab === 'corrections' && (
          <Card padding={false}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-medium text-gray-900">보정 내역</h3>
              <p className="text-sm text-gray-500 mt-0.5">후니에는 있으나 외주사 데이터에 없는 항목</p>
            </div>
            {result.corrections && result.corrections.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">주문번호</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">상품ID</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">메모</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase px-5 py-3">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.corrections.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-mono text-sm text-gray-900">{item.orderId}</td>
                      <td className="px-5 py-4 font-mono text-sm text-gray-600">{item.productId}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{item.memo || '-'}</td>
                      <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-10 text-center text-gray-500">
                보정 내역이 없습니다
              </div>
            )}
          </Card>
        )}

        {activeTab === 'breakdown' && (
          <Card padding={false}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-medium text-gray-900">품목별 집계</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-5 py-3">품목</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-5 py-3">수량</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-5 py-3">단가</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-5 py-3">금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.productBreakdown.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-5 py-4 text-right text-sm text-gray-600">{formatNumber(item.qty)}</td>
                    <td className="px-5 py-4 text-right text-sm text-gray-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-medium">
                  <td className="px-5 py-4 text-sm text-gray-900">합계</td>
                  <td className="px-5 py-4 text-right text-sm text-gray-900">
                    {formatNumber(result.productBreakdown.reduce((sum, p) => sum + p.qty, 0))}
                  </td>
                  <td className="px-5 py-4"></td>
                  <td className="px-5 py-4 text-right text-sm text-gray-900">
                    {formatCurrency(result.productBreakdown.reduce((sum, p) => sum + p.amount, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────
  // 렌더링
  // ─────────────────────────────────────────────────────────────────
  return (
    <div 
      className="min-h-screen py-10 px-6"
      style={{ 
        backgroundColor: theme.colors.bg,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif'
      }}
    >
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'upload' && <UploadView />}
      {currentView === 'analysis' && <AnalysisView />}
      {currentView === 'results' && <ResultsView />}
    </div>
  );
}
