/**
 * 후니프린팅 주문 시뮬레이터 & 제품 프리뷰어
 * 
 * 사용법: Claude 아티팩트로 렌더링하여 고객에게 제공
 * 기능:
 * 1. 상품 선택 → 옵션 가이드
 * 2. 선택 옵션 기반 제품 미리보기
 * 3. 파일 규격 안내
 * 4. 견적 계산
 */

import React, { useState, useMemo } from 'react';

// 상품 데이터
const PRODUCTS = {
  "무선책자": {
    category: "책자",
    description: "소프트커버 제본, 24P~300P",
    layers: ["내지", "표지", "제본", "후가공"],
    options: {
      size: {
        label: "판형",
        values: [
          { id: "A5", name: "A5 (148×210mm)", width: 148, height: 210 },
          { id: "B5", name: "B5 (176×250mm)", width: 176, height: 250 },
          { id: "A4", name: "A4 (210×297mm)", width: 210, height: 297 },
        ]
      },
      pages: {
        label: "페이지 수",
        type: "range",
        min: 24, max: 300, step: 2, default: 48
      },
      innerPaper: {
        label: "내지 용지",
        values: [
          { id: "모조지100", name: "백색모조지 100g", thickness: 0.12 },
          { id: "모조지120", name: "백색모조지 120g", thickness: 0.14 },
          { id: "아트지100", name: "아트지 100g", thickness: 0.08 },
          { id: "아트지120", name: "아트지 120g", thickness: 0.10 },
        ]
      },
      coverPaper: {
        label: "표지 용지",
        values: [
          { id: "아트지250", name: "아트지 250g" },
          { id: "아트지300", name: "아트지 300g" },
          { id: "스노우지250", name: "스노우지 250g" },
          { id: "몽블랑240", name: "몽블랑 240g" },
        ]
      },
      coating: {
        label: "표지 코팅",
        values: [
          { id: "none", name: "코팅없음" },
          { id: "matte", name: "무광코팅" },
          { id: "gloss", name: "유광코팅" },
        ]
      },
      binding: {
        label: "제본 방향",
        values: [
          { id: "left", name: "좌철 (왼쪽 제본)" },
          { id: "right", name: "우철 (오른쪽 제본)" },
        ]
      }
    },
    preview: "book"
  },
  "프리미엄엽서": {
    category: "카드/엽서",
    description: "고급 용지 양면 인쇄",
    options: {
      size: {
        label: "사이즈",
        values: [
          { id: "100x150", name: "100×150mm", width: 100, height: 150 },
          { id: "105x148", name: "A6 (105×148mm)", width: 105, height: 148 },
          { id: "148x210", name: "A5 (148×210mm)", width: 148, height: 210 },
        ]
      },
      paper: {
        label: "용지",
        values: [
          { id: "몽블랑240", name: "몽블랑 240g" },
          { id: "아코팩250", name: "아코팩 250g" },
          { id: "매쉬멜로우233", name: "매쉬멜로우 233g" },
        ]
      },
      print: {
        label: "인쇄",
        values: [
          { id: "single", name: "단면 인쇄" },
          { id: "double", name: "양면 인쇄" },
        ]
      },
      coating: {
        label: "코팅",
        values: [
          { id: "none", name: "코팅없음" },
          { id: "matte", name: "무광코팅" },
          { id: "gloss", name: "유광코팅" },
        ]
      }
    },
    preview: "card"
  },
  "스티커": {
    category: "스티커",
    description: "다양한 모양, 재질 선택",
    options: {
      shape: {
        label: "모양",
        values: [
          { id: "rect", name: "사각형" },
          { id: "circle", name: "원형" },
          { id: "custom", name: "칼선(도무송)" },
        ]
      },
      size: {
        label: "사이즈",
        values: [
          { id: "30x30", name: "30×30mm", width: 30, height: 30 },
          { id: "50x50", name: "50×50mm", width: 50, height: 50 },
          { id: "70x100", name: "70×100mm", width: 70, height: 100 },
        ]
      },
      material: {
        label: "재질",
        values: [
          { id: "art", name: "아트지 (광택)" },
          { id: "matte", name: "모조지 (무광)" },
          { id: "transparent", name: "투명 PET" },
          { id: "kraft", name: "크라프트지" },
        ]
      }
    },
    preview: "sticker"
  }
};

// 책 3D 프리뷰 컴포넌트
const BookPreview = ({ options, size }) => {
  const pages = options.pages || 48;
  const paperThickness = options.innerPaper?.thickness || 0.12;
  const spineWidth = Math.round((pages / 2) * paperThickness + 1);
  
  const width = size?.width || 148;
  const height = size?.height || 210;
  
  // 스케일 계산 (미리보기 영역에 맞게)
  const scale = Math.min(200 / width, 280 / height);
  const scaledWidth = width * scale * 0.8;
  const scaledHeight = height * scale * 0.8;
  const scaledSpine = Math.max(spineWidth * scale * 0.3, 8);

  return (
    <div className="flex flex-col items-center">
      {/* 3D 책 표현 */}
      <div className="relative" style={{ perspective: '800px' }}>
        <div 
          className="relative"
          style={{ 
            transformStyle: 'preserve-3d',
            transform: 'rotateY(-25deg) rotateX(5deg)'
          }}
        >
          {/* 표지 앞면 */}
          <div 
            className="absolute bg-gradient-to-br from-blue-500 to-blue-700 rounded-r-sm shadow-lg flex items-center justify-center"
            style={{ 
              width: scaledWidth, 
              height: scaledHeight,
              transform: `translateZ(${scaledSpine/2}px)`,
            }}
          >
            <div className="text-white text-center p-2">
              <div className="text-xs opacity-70">표지</div>
              <div className="text-sm font-bold mt-1">TITLE</div>
            </div>
          </div>
          
          {/* 책등 */}
          <div 
            className="absolute bg-gradient-to-b from-blue-600 to-blue-800"
            style={{ 
              width: scaledSpine, 
              height: scaledHeight,
              transform: `rotateY(90deg) translateZ(${scaledWidth/2}px) translateX(-${scaledSpine/2}px)`,
            }}
          >
            <div className="h-full flex items-center justify-center">
              <span className="text-white text-xs transform -rotate-90 whitespace-nowrap">
                {spineWidth}mm
              </span>
            </div>
          </div>
          
          {/* 페이지들 (내지) */}
          <div 
            className="absolute bg-gradient-to-r from-gray-100 to-gray-200"
            style={{ 
              width: scaledWidth - 2, 
              height: scaledHeight - 2,
              transform: `translateZ(${-scaledSpine/2 + 1}px) translateX(1px) translateY(1px)`,
            }}
          >
            <div className="h-full flex items-center justify-center text-gray-400 text-xs">
              {pages}P
            </div>
          </div>
        </div>
      </div>
      
      {/* 치수 정보 */}
      <div className="mt-8 text-center">
        <div className="text-sm text-gray-600">
          판형: {width} × {height}mm
        </div>
        <div className="text-sm text-gray-600">
          책등: {spineWidth}mm ({pages}P 기준)
        </div>
      </div>
    </div>
  );
};

// 카드/엽서 프리뷰 컴포넌트
const CardPreview = ({ options, size }) => {
  const width = size?.width || 148;
  const height = size?.height || 210;
  const scale = Math.min(180 / width, 250 / height);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const isDouble = options.print?.id === 'double';
  
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4">
        {/* 앞면 */}
        <div className="flex flex-col items-center">
          <div 
            className="bg-gradient-to-br from-purple-100 to-purple-200 rounded shadow-md flex items-center justify-center border border-purple-300"
            style={{ width: scaledWidth, height: scaledHeight }}
          >
            <div className="text-purple-600 text-center">
              <div className="text-xs">앞면</div>
              <div className="text-2xl">🎨</div>
            </div>
          </div>
          <span className="text-xs text-gray-500 mt-1">Front</span>
        </div>
        
        {/* 뒷면 */}
        <div className="flex flex-col items-center">
          <div 
            className={`rounded shadow-md flex items-center justify-center border ${
              isDouble 
                ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200' 
                : 'bg-gray-100 border-gray-200'
            }`}
            style={{ width: scaledWidth, height: scaledHeight }}
          >
            <div className={`text-center ${isDouble ? 'text-purple-500' : 'text-gray-400'}`}>
              <div className="text-xs">뒷면</div>
              <div className="text-2xl">{isDouble ? '🎨' : '⬜'}</div>
            </div>
          </div>
          <span className="text-xs text-gray-500 mt-1">Back</span>
        </div>
      </div>
      
      {/* 치수 정보 */}
      <div className="text-center">
        <div className="text-sm text-gray-600">
          사이즈: {width} × {height}mm
        </div>
        <div className="text-sm text-gray-600">
          인쇄: {isDouble ? '양면' : '단면'}
        </div>
      </div>
    </div>
  );
};

// 스티커 프리뷰 컴포넌트
const StickerPreview = ({ options, size }) => {
  const width = size?.width || 50;
  const height = size?.height || 50;
  const scale = Math.min(120 / width, 120 / height);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const shape = options.shape?.id || 'rect';
  
  const shapeStyle = {
    rect: 'rounded',
    circle: 'rounded-full',
    custom: 'rounded-lg',
  };
  
  return (
    <div className="flex flex-col items-center gap-4">
      {/* 스티커 시트 */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3,4,5,6].map(i => (
            <div 
              key={i}
              className={`${shapeStyle[shape]} bg-gradient-to-br from-yellow-200 to-orange-300 shadow flex items-center justify-center`}
              style={{ width: scaledWidth * 0.5, height: scaledHeight * 0.5 }}
            >
              <span className="text-xs">🌟</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* 단일 스티커 확대 */}
      <div className="flex flex-col items-center">
        <div 
          className={`${shapeStyle[shape]} bg-gradient-to-br from-yellow-200 to-orange-300 shadow-lg flex items-center justify-center border-2 border-dashed border-orange-400`}
          style={{ width: scaledWidth, height: scaledHeight }}
        >
          <span className="text-2xl">🌟</span>
        </div>
        <div className="text-sm text-gray-600 mt-2">
          {width} × {height}mm
        </div>
      </div>
    </div>
  );
};

// 파일 규격 안내 컴포넌트
const FileSpecGuide = ({ product, options, size }) => {
  const bleed = 3; // 도련 3mm
  const safeMargin = 3; // 안전영역 3mm
  
  let workWidth, workHeight, spineWidth = 0;
  
  if (product === '무선책자') {
    const pages = options.pages || 48;
    const thickness = options.innerPaper?.thickness || 0.12;
    spineWidth = Math.round((pages / 2) * thickness + 1);
    
    // 표지 펼침면 크기
    workWidth = (size?.width || 148) * 2 + spineWidth + bleed * 2;
    workHeight = (size?.height || 210) + bleed * 2;
  } else {
    workWidth = (size?.width || 148) + bleed * 2;
    workHeight = (size?.height || 210) + bleed * 2;
  }
  
  const scale = Math.min(250 / workWidth, 150 / workHeight);
  
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="font-bold text-sm mb-3">📐 파일 규격</h4>
      
      {/* 시각화 */}
      <div className="flex justify-center mb-4">
        <div 
          className="relative border-2 border-red-400 bg-red-50"
          style={{ 
            width: workWidth * scale, 
            height: workHeight * scale 
          }}
        >
          {/* 도련 영역 표시 */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-red-200 opacity-50" />
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-red-200 opacity-50" />
          <div className="absolute top-0 bottom-0 left-0 w-2 bg-red-200 opacity-50" />
          <div className="absolute top-0 bottom-0 right-0 w-2 bg-red-200 opacity-50" />
          
          {/* 재단선 */}
          <div 
            className="absolute border border-dashed border-gray-400 bg-white"
            style={{
              top: bleed * scale,
              left: bleed * scale,
              right: bleed * scale,
              bottom: bleed * scale,
            }}
          >
            {/* 안전영역 */}
            <div 
              className="absolute border border-blue-300 bg-blue-50"
              style={{
                top: safeMargin * scale,
                left: safeMargin * scale,
                right: safeMargin * scale,
                bottom: safeMargin * scale,
              }}
            >
              <div className="h-full flex items-center justify-center text-xs text-blue-500">
                안전영역
              </div>
            </div>
          </div>
          
          {/* 책등 표시 (책자인 경우) */}
          {product === '무선책자' && (
            <div 
              className="absolute top-2 bottom-2 bg-yellow-200 border-l border-r border-yellow-400 flex items-center justify-center"
              style={{
                left: `calc(50% - ${spineWidth * scale / 2}px)`,
                width: spineWidth * scale,
              }}
            >
              <span className="text-xs transform -rotate-90 whitespace-nowrap">책등</span>
            </div>
          )}
        </div>
      </div>
      
      {/* 범례 */}
      <div className="flex gap-4 justify-center text-xs mb-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-200" />
          <span>도련 (3mm)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border border-dashed border-gray-400" />
          <span>재단선</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-100 border border-blue-300" />
          <span>안전영역</span>
        </div>
      </div>
      
      {/* 크기 정보 */}
      <div className="text-sm space-y-1">
        {product === '무선책자' ? (
          <>
            <div>📄 <b>내지 작업 크기:</b> {(size?.width || 148) + bleed*2} × {(size?.height || 210) + bleed*2}mm</div>
            <div>📕 <b>표지 작업 크기:</b> {workWidth} × {workHeight}mm (펼침면)</div>
            <div>📏 <b>책등:</b> {spineWidth}mm</div>
          </>
        ) : (
          <div>📄 <b>작업 크기:</b> {workWidth} × {workHeight}mm</div>
        )}
        <div className="text-gray-500">
          ※ 재단 크기 + 도련 3mm 포함
        </div>
      </div>
    </div>
  );
};

// 메인 컴포넌트
export default function OrderSimulator() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [options, setOptions] = useState({});
  const [quantity, setQuantity] = useState(10);
  const [step, setStep] = useState(1); // 1: 상품선택, 2: 옵션선택, 3: 미리보기
  
  const product = selectedProduct ? PRODUCTS[selectedProduct] : null;
  
  const currentSize = useMemo(() => {
    if (!product?.options?.size) return null;
    const sizeOption = options.size || product.options.size.values[0];
    return sizeOption;
  }, [product, options.size]);
  
  const handleProductSelect = (name) => {
    setSelectedProduct(name);
    setOptions({});
    setStep(2);
  };
  
  const handleOptionChange = (key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };
  
  const renderPreview = () => {
    if (!product) return null;
    
    const previewProps = { options, size: currentSize };
    
    switch (product.preview) {
      case 'book':
        return <BookPreview {...previewProps} />;
      case 'card':
        return <CardPreview {...previewProps} />;
      case 'sticker':
        return <StickerPreview {...previewProps} />;
      default:
        return null;
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4 bg-white min-h-screen">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🖨️ 주문 시뮬레이터</h1>
        <p className="text-gray-500 text-sm">상품을 선택하고 옵션을 확인하세요</p>
      </div>
      
      {/* 진행 단계 */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-2">
          {['상품 선택', '옵션 설정', '미리보기'].map((label, i) => (
            <React.Fragment key={i}>
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step > i ? 'bg-blue-500 text-white' : 
                  step === i + 1 ? 'bg-blue-100 text-blue-600 border-2 border-blue-500' : 
                  'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-sm ${step === i + 1 ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                {label}
              </span>
              {i < 2 && <div className="w-8 h-0.5 bg-gray-300" />}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Step 1: 상품 선택 */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(PRODUCTS).map(([name, data]) => (
            <button
              key={name}
              onClick={() => handleProductSelect(name)}
              className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
            >
              <div className="text-lg font-bold">{name}</div>
              <div className="text-sm text-gray-500">{data.category}</div>
              <div className="text-xs text-gray-400 mt-1">{data.description}</div>
            </button>
          ))}
        </div>
      )}
      
      {/* Step 2: 옵션 선택 */}
      {step === 2 && product && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 옵션 패널 */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg border-b pb-2">
              📋 {selectedProduct} 옵션
            </h3>
            
            {Object.entries(product.options).map(([key, opt]) => (
              <div key={key} className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  {opt.label}
                </label>
                
                {opt.type === 'range' ? (
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={opt.min}
                      max={opt.max}
                      step={opt.step}
                      value={options[key] || opt.default}
                      onChange={(e) => handleOptionChange(key, parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-16 text-right font-mono">
                      {options[key] || opt.default}P
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map(v => (
                      <button
                        key={v.id}
                        onClick={() => handleOptionChange(key, v)}
                        className={`px-3 py-1 text-sm rounded border ${
                          (options[key]?.id || opt.values[0].id) === v.id
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white hover:bg-gray-100 border-gray-300'
                        }`}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {/* 수량 */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">수량</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <button
              onClick={() => setStep(3)}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              미리보기 →
            </button>
          </div>
          
          {/* 실시간 프리뷰 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-bold text-lg mb-4 text-center">👁️ 실시간 미리보기</h3>
            <div className="flex justify-center items-center min-h-[300px]">
              {renderPreview()}
            </div>
          </div>
        </div>
      )}
      
      {/* Step 3: 최종 미리보기 & 파일 규격 */}
      {step === 3 && product && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 제품 미리보기 */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-bold text-lg mb-4 text-center">📦 제품 미리보기</h3>
              <div className="flex justify-center items-center min-h-[300px]">
                {renderPreview()}
              </div>
            </div>
            
            {/* 파일 규격 */}
            <div>
              <FileSpecGuide 
                product={selectedProduct} 
                options={options} 
                size={currentSize} 
              />
              
              {/* 선택 옵션 요약 */}
              <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                <h4 className="font-bold text-sm mb-2">✅ 선택 옵션 요약</h4>
                <div className="text-sm space-y-1">
                  <div>상품: <b>{selectedProduct}</b></div>
                  {Object.entries(options).map(([key, val]) => (
                    <div key={key}>
                      {product.options[key]?.label}: <b>{typeof val === 'object' ? val.name : `${val}P`}</b>
                    </div>
                  ))}
                  <div>수량: <b>{quantity}부</b></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 파일 제작 체크리스트 */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h4 className="font-bold text-sm mb-2">⚠️ 파일 제작 체크리스트</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>☐ CMYK 색상</div>
              <div>☐ 300dpi 해상도</div>
              <div>☐ 도련 3mm</div>
              <div>☐ 서체 아웃라인</div>
            </div>
          </div>
          
          {/* 네비게이션 */}
          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            >
              ← 옵션 수정
            </button>
            <button
              onClick={() => {
                setSelectedProduct(null);
                setOptions({});
                setStep(1);
              }}
              className="flex-1 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
            >
              🔄 처음부터
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
