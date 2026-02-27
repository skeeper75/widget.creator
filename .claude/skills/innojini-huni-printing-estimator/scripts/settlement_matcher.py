#!/usr/bin/env python3
"""
후니프린팅 정산 매칭 스크립트

사용법:
    python settlement_matcher.py --partner bizhouse --file "02__비즈하우스.xlsx"
    python settlement_matcher.py --partner fujifilm --file "01__후지필름.xlsx" --mes "00__MES.xlsx"
"""

import argparse
import json
import re
import sys
from typing import Dict, Optional, Any

try:
    import pandas as pd
except ImportError:
    print("pandas 필요: pip install pandas openpyxl --break-system-packages")
    sys.exit(1)


def normalize_id(x) -> Optional[str]:
    """ID 정규화 (float → str)"""
    if pd.isna(x):
        return None
    if isinstance(x, float):
        return str(int(x))
    return str(x)


def normalize_order_id(order_id) -> Optional[str]:
    """주문번호 정규화 (S1, S2 접미사 제거)"""
    if pd.isna(order_id):
        return None
    return re.sub(r'S\d+$', '', str(order_id))


def format_currency(amount: float) -> str:
    return f"₩{amount:,.0f}"


def match_bizhouse(file_path: str) -> Dict[str, Any]:
    """비즈하우스 데이터 매칭"""
    print(f"\n📂 파일: {file_path}")
    
    # 시트 로드
    df_partner = pd.read_excel(file_path, sheet_name='인화업체정산_2025-11-03')
    df_internal = pd.read_excel(file_path, sheet_name='후니내역')
    df_mapping = pd.read_excel(file_path, sheet_name='중복')
    df_correction = pd.read_excel(file_path, sheet_name='보정', header=1)
    df_island = pd.read_excel(file_path, sheet_name='제주도서')
    
    df_mapping.columns = ['상품IDX', '작업번호', '비고']
    work_no_col = [c for c in df_internal.columns if '작업번호' in c or '제작' in c][0]
    
    print(f"  인화업체정산: {len(df_partner)}건")
    print(f"  후니내역: {len(df_internal)}건")
    
    # 제외 조건
    exclude_mask = df_mapping['비고'].isin(['9월정산', '취소', '환불'])
    df_mapping_valid = df_mapping[~exclude_mask]
    
    # 매핑 딕셔너리
    mapping_dict = {}
    for _, row in df_mapping_valid.iterrows():
        pid = normalize_id(row['상품IDX'])
        wno = normalize_id(row['작업번호'])
        if pid and wno:
            mapping_dict[pid] = wno
    
    # 후니내역 인덱싱
    internal_dict = {}
    for _, row in df_internal.iterrows():
        wno = normalize_id(row[work_no_col])
        if wno:
            internal_dict[wno] = row
    
    excluded_pids = set(df_mapping[exclude_mask]['상품IDX'].apply(normalize_id).dropna())
    
    # 매칭 수행
    results = {'matched': [], 'no_mapping': [], 'no_internal': [], 'excluded': []}
    
    for _, row in df_partner.iterrows():
        pid = normalize_id(row['상품 IDX'])
        
        if pid in excluded_pids:
            results['excluded'].append({'product_idx': pid})
            continue
        
        if pid not in mapping_dict:
            results['no_mapping'].append({'product_idx': pid})
            continue
        
        wno = mapping_dict[pid]
        
        if wno not in internal_dict:
            results['no_internal'].append({'product_idx': pid, 'work_no': wno})
            continue
        
        results['matched'].append({'product_idx': pid, 'work_no': wno})
    
    # 금액 계산
    supply_col = [c for c in df_partner.columns if '총 공급가격' in c][0]
    
    product_total = df_partner[supply_col].sum()
    shipping_total = df_partner['배송비'].fillna(0).sum()
    island_total = pd.to_numeric(df_island['기타운임'], errors='coerce').sum()
    correction_total = pd.to_numeric(df_correction['합계금액'], errors='coerce').sum()
    
    subtotal = product_total + shipping_total + island_total + correction_total
    vat = subtotal * 0.1
    grand_total = subtotal + vat
    
    return {
        'partner': 'bizhouse',
        'total': len(df_partner),
        'matched': len(results['matched']),
        'excluded': len(results['excluded']),
        'no_mapping': len(results['no_mapping']),
        'no_internal': len(results['no_internal']),
        'match_rate': len(results['matched']) / len(df_partner) * 100,
        'amounts': {
            'product': float(product_total),
            'shipping': float(shipping_total),
            'island': float(island_total),
            'island_count': len(df_island),
            'correction': float(correction_total),
            'subtotal': float(subtotal),
            'vat': float(vat),
            'grand_total': float(grand_total)
        },
        'discrepancies': {
            'no_mapping': results['no_mapping'][:5],
            'no_internal': results['no_internal'][:5]
        }
    }


def match_fujifilm(fuji_path: str, mes_path: str) -> Dict[str, Any]:
    """후지필름 데이터 매칭"""
    print(f"\n📂 후지필름: {fuji_path}")
    print(f"📂 MES: {mes_path}")
    
    df_fuji = pd.read_excel(fuji_path, sheet_name='Sheet')
    df_mes = pd.read_excel(mes_path, sheet_name='주문통합 상품별리스트')
    
    fuji_orders = set(df_fuji['거래처주문번호'].apply(normalize_order_id).dropna())
    mes_orders = set(df_mes['주문번호'].apply(normalize_order_id).dropna())
    
    matched = fuji_orders & mes_orders
    only_fuji = fuji_orders - mes_orders
    only_mes = mes_orders - fuji_orders
    
    product_qty = df_fuji.groupby('품목 명')['제작수량'].sum().to_dict()
    amounts_empty = all(df_fuji[col].isna().all() for col in ['생산단가', '금액'] if col in df_fuji.columns)
    
    return {
        'partner': 'fujifilm',
        'total': len(df_fuji),
        'unique_fuji': len(fuji_orders),
        'unique_mes': len(mes_orders),
        'matched': len(matched),
        'only_fuji': len(only_fuji),
        'only_mes': len(only_mes),
        'match_rate': len(matched) / len(fuji_orders) * 100 if fuji_orders else 0,
        'amounts_empty': amounts_empty,
        'product_breakdown': product_qty,
        'status': df_fuji['주문상태'].value_counts().to_dict()
    }


def print_result(result: Dict[str, Any]):
    """결과 출력"""
    print("\n" + "=" * 60)
    print(f"📊 {result['partner'].upper()} 정산 분석 결과")
    print("=" * 60)
    
    if result['partner'] == 'bizhouse':
        print(f"""
  총 건수:        {result['total']:,}건
  매칭 성공:      {result['matched']:,}건 ({result['match_rate']:.2f}%)
  이전 정산 제외: {result['excluded']}건
  매핑 없음:      {result['no_mapping']}건
  내부 없음:      {result['no_internal']}건

  💰 정산 금액
  상품:           {format_currency(result['amounts']['product'])}
  배송비:         {format_currency(result['amounts']['shipping'])}
  제주도서:       {format_currency(result['amounts']['island'])} ({result['amounts']['island_count']}건)
  보정:           {format_currency(result['amounts']['correction'])}
  ─────────────────────────────
  소계:           {format_currency(result['amounts']['subtotal'])}
  VAT:            {format_currency(result['amounts']['vat'])}
  ─────────────────────────────
  총액:           {format_currency(result['amounts']['grand_total'])}
""")
    else:
        print(f"""
  총 건수:        {result['total']}건
  유니크 (후지):  {result['unique_fuji']}개
  유니크 (MES):   {result['unique_mes']}개
  매칭 성공:      {result['matched']}건
  후지에만:       {result['only_fuji']}건
  MES에만:        {result['only_mes']}건

  📦 품목별 수량
""")
        for product, qty in sorted(result['product_breakdown'].items(), key=lambda x: -x[1]):
            print(f"    {product}: {qty}건")
        
        if result['amounts_empty']:
            print("\n  ⚠️ 금액 데이터 없음 - 가격표 연동 필요")


def main():
    parser = argparse.ArgumentParser(description='후니프린팅 정산 매칭')
    parser.add_argument('--partner', required=True, choices=['bizhouse', 'fujifilm'])
    parser.add_argument('--file', required=True, help='외주사 파일')
    parser.add_argument('--mes', help='MES 파일 (후지필름용)')
    parser.add_argument('--output', help='결과 JSON 파일')
    
    args = parser.parse_args()
    
    if args.partner == 'bizhouse':
        result = match_bizhouse(args.file)
    else:
        if not args.mes:
            print("❌ 후지필름에는 --mes 필요")
            sys.exit(1)
        result = match_fujifilm(args.file, args.mes)
    
    print_result(result)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n✅ 저장: {args.output}")


if __name__ == '__main__':
    main()
