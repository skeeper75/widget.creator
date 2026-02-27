/**
 * Printly Context Menu Component
 * NNGroup 10가지 가이드라인 준수
 */

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, MoreHorizontal } from 'lucide-react';

export function ContextMenu({ 
  items, 
  variant = 'kebab',  // 'kebab' (⋮) | 'meatball' (⋯)
  tooltip,
  position = 'bottom-right',
  size = 'md'  // 'sm' | 'md'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const Icon = variant === 'kebab' ? MoreVertical : MoreHorizontal;
  
  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  // 키보드 접근성
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };
  
  const positions = {
    'bottom-right': 'top-full right-0 mt-1',
    'bottom-left': 'top-full left-0 mt-1',
    'top-right': 'bottom-full right-0 mb-1',
  };
  
  const sizes = {
    sm: { button: 'w-6 h-6', icon: 'w-4 h-4' },
    md: { button: 'w-8 h-8', icon: 'w-5 h-5' },
  };
  
  return (
    <div className="relative" ref={menuRef}>
      {/* 트리거 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`${sizes[size].button} flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500`}
        aria-label={tooltip || '옵션 메뉴'}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={tooltip}
      >
        <Icon className={`${sizes[size].icon} text-gray-600`} />
      </button>
      
      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div 
          className={`absolute ${positions[position]} z-50 min-w-[140px] w-max bg-white rounded-xl border border-gray-200 shadow-lg py-1`}
          role="menu"
        >
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              {item.divider ? (
                <div className="border-t border-gray-100 my-1" />
              ) : (
                <button
                  onClick={() => { 
                    item.onClick?.(); 
                    setIsOpen(false); 
                  }}
                  disabled={item.disabled}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] text-left whitespace-nowrap transition-colors ${
                    item.disabled 
                      ? 'text-gray-300 cursor-not-allowed'
                      : item.danger 
                        ? 'text-red-600 hover:bg-red-50' 
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  role="menuitem"
                >
                  {item.icon && <item.icon className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <span className="ml-auto text-[9px] text-gray-400 font-mono">{item.shortcut}</span>
                  )}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 사용 예시
 * 
 * import { ContextMenu } from './context-menu';
 * import { Edit2, Copy, Trash2, Download, Share2 } from 'lucide-react';
 * 
 * // 카드 내 컨텍스트 메뉴
 * <ContextMenu
 *   items={[
 *     { icon: Edit2, label: '수정', onClick: () => {} },
 *     { icon: Copy, label: '복제', onClick: () => {} },
 *     { divider: true },
 *     { icon: Download, label: '내보내기', onClick: () => {} },
 *     { icon: Share2, label: '공유', onClick: () => {} },
 *     { divider: true },
 *     { icon: Trash2, label: '삭제', danger: true, onClick: () => {} },
 *   ]}
 *   variant="kebab"
 *   tooltip="항목 옵션: 수정, 복제, 삭제"
 *   position="bottom-right"
 *   size="sm"
 * />
 */
