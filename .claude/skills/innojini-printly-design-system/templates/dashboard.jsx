import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calculator, Folder, ChevronDown, ChevronRight, 
  MoreVertical, MoreHorizontal, Copy, Edit2, Trash2,
  Download, Share2, Star, Archive, RefreshCw, 
  Globe, Flag, X, Check, AlertCircle,
  FileText, Plus, Search, Settings
} from 'lucide-react';

// ============================================================
// 컨텍스트 메뉴 (NNGroup 10가지 가이드라인 준수)
// ============================================================

function ContextMenu({ items, variant = 'kebab', tooltip, position = 'bottom-right', size = 'md' }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const Icon = variant === 'kebab' ? MoreVertical : MoreHorizontal;
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(!isOpen); }
    if (e.key === 'Escape') setIsOpen(false);
  };
  
  const positions = {
    'bottom-right': 'top-full right-0 mt-1',
    'bottom-left': 'top-full left-0 mt-1',
  };
  
  const sizes = { sm: 'w-6 h-6', md: 'w-8 h-8' };
  const iconSizes = { sm: 'w-4 h-4', md: 'w-5 h-5' };
  
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`${sizes[size]} flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500`}
        aria-label={tooltip || '옵션 메뉴'}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={tooltip}
      >
        <Icon className={`${iconSizes[size]} text-gray-600`} />
      </button>
      
      {isOpen && (
        <div className={`absolute ${positions[position]} z-50 min-w-[160px] w-max bg-white rounded-xl border border-gray-200 shadow-lg py-1`} role="menu">
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              {item.divider ? (
                <div className="border-t border-gray-100 my-1" />
              ) : (
                <button
                  onClick={() => { item.onClick?.(); setIsOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-left transition-colors whitespace-nowrap ${
                    item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  role="menuitem"
                >
                  {item.icon && <item.icon className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span>{item.label}</span>
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 기본 컴포넌트
// ============================================================

function Badge({ children, variant = 'blue', size = 'sm' }) {
  const variants = {
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-600',
    gray: 'bg-gray-100 text-gray-600',
    'solid-blue': 'bg-blue-500 text-white',
    gradient: 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white',
  };
  const sizes = { xs: 'text-[7px] px-1', sm: 'text-[9px] px-1.5 py-0.5' };
  return <span className={`inline-flex items-center font-semibold rounded ${variants[variant]} ${sizes[size]}`}>{children}</span>;
}

function Toggle({ enabled, onChange, label, icon: IconComponent }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${enabled ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
      {IconComponent && <IconComponent className={`w-3 h-3 ${enabled ? 'text-blue-600' : 'text-gray-400'}`} />}
      {label && <span className="font-medium text-[10px]">{label}</span>}
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-7 h-3.5 rounded-full transition-colors ${enabled ? 'bg-blue-500' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
      {[
        { id: 'domestic', label: '국내식', icon: Flag, color: 'text-blue-700' },
        { id: 'international', label: '해외식', icon: Globe, color: 'text-emerald-700' },
      ].map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
            mode === opt.id ? `bg-white ${opt.color} shadow-sm` : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <opt.icon className="w-3 h-3" />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Alert({ variant = 'info', children, onClose }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  };
  return (
    <div className={`flex items-start gap-2 text-[10px] border rounded-lg px-2.5 py-2 ${styles[variant]}`}>
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
      {onClose && <button onClick={onClose} className="hover:opacity-70"><X className="w-3 h-3" /></button>}
    </div>
  );
}

// ============================================================
// 데이터
// ============================================================

const ITEMS = [
  { id: 1, name: '카르빈굴절식 크레인', date: '2025-07-02', cat: '7월', status: 'complete', value: 285000 },
  { id: 2, name: '아산폴리텍 카탈로그', date: '2025-07-10', cat: '7월', status: 'complete', value: 520000 },
  { id: 3, name: '플러스중전기 제안서', date: '2025-07-17', cat: '7월', status: 'pending', value: 145000 },
  { id: 4, name: '한국폴리텍 리플렛', date: '2025-08-08', cat: '8월', status: 'complete', value: 180000 },
  { id: 5, name: '성남시청 포스터', date: '2025-08-14', cat: '8월', status: 'pending', value: 95000 },
  { id: 6, name: '드림위드 4단리플렛', date: '2025-08-20', cat: '8월', status: 'draft', value: 310000 },
];

const CATS = ['7월', '8월'];
const STATUS = { complete: { l: '완료', c: 'emerald' }, pending: { l: '진행중', c: 'amber' }, draft: { l: '초안', c: 'gray' } };

// ============================================================
// 아이템 카드 (컨텍스트 메뉴 포함)
// ============================================================

function ItemCard({ item, selected, onSelect }) {
  const st = STATUS[item.status];
  
  // NNGroup 규칙 4: 관련 액션끼리만 그룹화
  const menuItems = [
    { icon: Edit2, label: '수정', onClick: () => alert(`수정: ${item.name}`) },
    { icon: Copy, label: '복제', onClick: () => alert(`복제: ${item.name}`) },
    { icon: Star, label: '즐겨찾기', onClick: () => alert(`즐겨찾기: ${item.name}`) },
    { divider: true },
    { icon: Download, label: 'PDF 내보내기', onClick: () => alert(`내보내기: ${item.name}`) },
    { icon: Share2, label: '공유', onClick: () => alert(`공유: ${item.name}`) },
    { divider: true },
    { icon: Archive, label: '보관', onClick: () => alert(`보관: ${item.name}`) },
    { icon: Trash2, label: '삭제', danger: true, onClick: () => alert(`삭제: ${item.name}`) },
  ];
  
  return (
    <div className={`relative bg-white rounded-xl border transition-all cursor-pointer ${
      selected ? 'border-2 border-blue-500 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
    }`}>
      <div onClick={() => onSelect(item)} className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-8">
            <h4 className="font-bold text-sm text-gray-800 truncate">{item.name}</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">{item.date}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Badge variant={st.c} size="xs">{st.l}</Badge>
          <span className="font-mono font-bold text-xs text-gray-700">₩{item.value.toLocaleString()}</span>
        </div>
      </div>
      
      {/* NNGroup 규칙 2: 관련 콘텐츠 근처에 배치 */}
      <div className="absolute top-2 right-2">
        <ContextMenu
          items={menuItems}
          variant="kebab"
          tooltip={`${item.name} 옵션: 수정, 복제, 삭제 등`}
          size="sm"
        />
      </div>
    </div>
  );
}

// ============================================================
// 비용 그리드
// ============================================================

function CostGrid({ value, mode }) {
  const costs = [
    { l: '용지', v: Math.round(value * 0.35), s: '0.5R' },
    { l: 'CTP', v: Math.round(value * 0.15), s: '4판' },
    { l: '인쇄', v: Math.round(value * 0.20), s: '4회전' },
    { l: '코팅', v: Math.round(value * 0.18), s: '양면' },
    { l: '후공정', v: Math.round(value * 0.12), s: '×1.0' },
  ];
  const total = costs.reduce((s, c) => s + c.v, 0);
  
  return (
    <div className="grid grid-cols-6 gap-1">
      {costs.map((c, i) => (
        <div key={i} className="bg-gray-50 p-2 rounded-lg text-center">
          <div className="text-[9px] text-gray-500 mb-0.5">{c.l}</div>
          <div className="font-mono font-bold text-xs">₩{(c.v/1000).toFixed(0)}K</div>
          <div className="text-[8px] text-gray-400">{c.s}</div>
        </div>
      ))}
      <div className={`p-2 rounded-lg text-center text-white ${mode === 'domestic' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
        <div className="text-[9px] opacity-80 mb-0.5">합계</div>
        <div className="font-mono font-bold text-xs">₩{(total/1000).toFixed(0)}K</div>
      </div>
    </div>
  );
}

// ============================================================
// 메인 대시보드
// ============================================================

export default function PrintlyDashboard() {
  const [selected, setSelected] = useState(null);
  const [expCat, setExpCat] = useState('7월');
  const [mode, setMode] = useState('domestic');
  const [workTurn, setWorkTurn] = useState(false);
  const [margin, setMargin] = useState(15);
  const [showAlert, setShowAlert] = useState(true);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return ITEMS;
    return ITEMS.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const grouped = useMemo(() => CATS.reduce((a, c) => { a[c] = filtered.filter(i => i.cat === c); return a; }, {}), [filtered]);
  const final = selected ? Math.round(selected.value * (1 + margin / 100)) : 0;

  // 헤더 전역 액션 (규칙 4: 전역 액션 분리)
  const headerActions = [
    { icon: Plus, label: '새 견적', onClick: () => alert('새 견적') },
    { icon: Download, label: '전체 내보내기', onClick: () => alert('전체 내보내기') },
    { icon: Settings, label: '설정', onClick: () => alert('설정') },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* 헤더 */}
      <header className="bg-gray-800 text-white px-4 py-2.5 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-400" />
              <h1 className="text-sm font-bold">Printly 견적</h1>
            </div>
            <Badge variant="gradient" size="sm">v2</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-400 rounded-full"></span>완료</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-full"></span>진행</span>
            </div>
            <ContextMenu items={headerActions} variant="meatball" tooltip="전역 옵션" />
          </div>
        </div>
      </header>

      {/* 알림 */}
      {showAlert && (
        <div className="bg-white border-b px-3 py-2">
          <Alert variant="info" onClose={() => setShowAlert(false)}>
            <b>💡 팁:</b> 카드 우상단 <MoreVertical className="w-3 h-3 inline mx-0.5" /> 클릭 시 견적별 옵션 접근 (NNGroup 컨텍스트 메뉴 가이드라인 적용)
          </Alert>
        </div>
      )}

      {/* 메인 */}
      <main className="p-3">
        <div className="flex flex-col lg:flex-row gap-3">
          
          {/* 사이드바 */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-3 border-b bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold">견적 목록</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{filtered.length}건</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="검색..."
                    className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="max-h-[400px] lg:max-h-[calc(100vh-220px)] overflow-y-auto">
                {CATS.map(cat => (
                  <div key={cat}>
                    <button 
                      onClick={() => setExpCat(x => x === cat ? null : cat)}
                      className="w-full flex justify-between items-center px-3 py-2 bg-gray-50 hover:bg-gray-100 border-b text-xs"
                    >
                      <span className="font-bold text-gray-600">{cat}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">{grouped[cat]?.length || 0}</span>
                        {expCat === cat ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                      </span>
                    </button>
                    {expCat === cat && (
                      <div className="p-2 space-y-2">
                        {grouped[cat]?.length > 0 ? (
                          grouped[cat].map(item => (
                            <ItemCard key={item.id} item={item} selected={selected?.id === item.id} onSelect={setSelected} />
                          ))
                        ) : (
                          <div className="text-center py-4 text-[11px] text-gray-400">검색 결과 없음</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* 컨텐츠 */}
          <section className="flex-1 min-w-0">
            {selected ? (
              <div className="space-y-3">
                {/* 헤더 카드 */}
                <div className="bg-white rounded-xl border px-4 py-3 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold text-gray-800">{selected.name}</h2>
                        <Badge variant={STATUS[selected.status].c}>{STATUS[selected.status].l}</Badge>
                      </div>
                      <p className="text-[11px] text-gray-500">{selected.date} │ 원가 ₩{selected.value.toLocaleString()}</p>
                    </div>
                    {/* 규칙 1, 8: 핵심 액션은 직접 노출 */}
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 flex items-center gap-1.5">
                        <Edit2 className="w-3.5 h-3.5" />수정
                      </button>
                      <button className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5" />내보내기
                      </button>
                    </div>
                  </div>
                </div>

                {/* 상세 패널 */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2.5 bg-gray-50 border-b gap-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold text-gray-700">📐 견적 상세</h3>
                      <ModeToggle mode={mode} onChange={setMode} />
                    </div>
                    <Toggle enabled={workTurn} onChange={setWorkTurn} label="돈땡" icon={RefreshCw} />
                  </div>

                  <div className="px-4 py-2 border-b bg-gray-50/50">
                    <div className={`text-[9px] border rounded px-2 py-1 ${
                      mode === 'domestic' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                      <b>{mode === 'domestic' ? '국내식' : '해외식'}:</b> {
                        mode === 'domestic' ? '버림/여분 동일가 | 정량맞춤 = 용지절감' : '여분납품 = 추가청구 | 정량보장 = 프리미엄5%'
                      }
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="text-[9px] text-gray-400 mb-2 font-medium uppercase">비용 상세</div>
                    <CostGrid value={selected.value} mode={mode} />

                    <div className={`mt-4 p-4 rounded-xl border ${
                      mode === 'domestic' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <div className={`text-sm font-bold flex items-center gap-2 mb-3 ${
                        mode === 'domestic' ? 'text-amber-700' : 'text-emerald-700'
                      }`}>
                        <FileText className="w-4 h-4" />
                        {mode === 'domestic' ? '납품 정보' : '글로벌 납품'}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {[{ l: '수량', v: '1,000부' }, { l: '용지', v: '200스노우' }, { l: '규격', v: 'A4' }].map((d, i) => (
                          <div key={i} className="bg-white/60 rounded-lg p-2">
                            <div className="text-[9px] text-gray-500 mb-0.5">{d.l}</div>
                            <div className="font-mono font-bold text-sm">{d.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
                <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-600 mb-1">견적을 선택하세요</h3>
                <p className="text-xs text-gray-400">목록에서 견적을 선택하면 상세 정보가 표시됩니다.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* 스티키 하단바 */}
      {selected && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-xl z-50">
          <div className="px-4 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-[8px] text-gray-400">원가</div>
                  <div className="text-sm font-mono font-bold text-gray-600">₩{selected.value.toLocaleString()}</div>
                </div>
                <div className="hidden sm:flex gap-1.5">
                  <Badge variant={mode === 'domestic' ? 'blue' : 'emerald'} size="sm">
                    {mode === 'domestic' ? '🇰🇷국내' : '🌍해외'}
                  </Badge>
                  {workTurn && <Badge variant="blue" size="sm">돈땡</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                <span className="text-[10px] text-gray-500">마진</span>
                <input 
                  type="range" min="0" max="50" value={margin}
                  onChange={e => setMargin(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-gray-200 rounded-full accent-blue-500" 
                />
                <span className="text-xs font-bold text-blue-600 w-8">{margin}%</span>
              </div>
              <div className={`text-white px-4 py-2 rounded-xl text-center ${mode === 'domestic' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                <div className="text-[8px] opacity-80">견적가</div>
                <div className="text-lg font-bold font-mono">₩{final.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
