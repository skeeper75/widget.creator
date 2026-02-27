#!/usr/bin/env python3
"""
접지 단가 조회 스크립트
마이컴프린팅 스킬에서 호출하여 사용

사용법:
  python folding_lookup.py --method "2단(반)접지" --format "국" --qty 500 --fold 2
  python folding_lookup.py --list-methods
"""

import sqlite3
import argparse
import os
import json

# 스크립트 위치 기준으로 DB 경로 설정
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "..", "data", "folding.db")


def get_connection():
    """SQLite 연결"""
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"DB 파일 없음: {DB_PATH}")
    return sqlite3.connect(DB_PATH)


def list_methods():
    """접지방법 목록 조회"""
    conn = get_connection()
    cursor = conn.execute("SELECT DISTINCT method FROM folding_prices ORDER BY method")
    methods = [row[0] for row in cursor.fetchall()]
    conn.close()
    return methods


def lookup_price(method: str, format: str, qty: int, fold: int = 2) -> dict:
    """
    접지 단가 조회
    
    Args:
        method: 접지방법 (예: "2단(반)접지", "3단접지")
        format: 판형 (예: "국", "46")
        qty: R수량/부수
        fold: 절수 (기본 2)
    
    Returns:
        dict: {price: 금액, matched: True/False, query: 조회조건}
    """
    conn = get_connection()
    
    query = """
    SELECT price, qty_min, qty_max, fold_min, fold_max
    FROM folding_prices
    WHERE method = ?
      AND format = ?
      AND qty_min < ?
      AND qty_max >= ?
      AND fold_min <= ?
      AND fold_max >= ?
    LIMIT 1
    """
    
    cursor = conn.execute(query, [method, format, qty, qty, fold, fold])
    row = cursor.fetchone()
    conn.close()
    
    result = {
        "method": method,
        "format": format,
        "qty": qty,
        "fold": fold,
        "matched": False,
        "price": None
    }
    
    if row:
        result["matched"] = True
        result["price"] = int(row[0])
        result["qty_range"] = f"{int(row[1])}~{int(row[2])}"
        result["fold_range"] = f"{row[3]}~{row[4]}"
    
    return result


def search_prices(method: str = None, format: str = None, limit: int = 20) -> list:
    """조건별 단가 검색"""
    conn = get_connection()
    
    query = "SELECT method, format, qty_min, qty_max, fold_min, fold_max, price FROM folding_prices WHERE 1=1"
    params = []
    
    if method:
        query += " AND method = ?"
        params.append(method)
    if format:
        query += " AND format = ?"
        params.append(format)
    
    query += f" ORDER BY qty_min LIMIT {limit}"
    
    cursor = conn.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [
        {
            "method": r[0],
            "format": r[1],
            "qty_range": f"{int(r[2])}~{int(r[3])}",
            "fold_range": f"{r[4]}~{r[5]}",
            "price": int(r[6])
        }
        for r in rows
    ]


def main():
    parser = argparse.ArgumentParser(description="접지 단가 조회")
    parser.add_argument("--method", "-m", help="접지방법")
    parser.add_argument("--format", "-f", help="판형 (국/46)")
    parser.add_argument("--qty", "-q", type=int, help="R수량")
    parser.add_argument("--fold", type=int, default=2, help="절수 (기본 2)")
    parser.add_argument("--list-methods", action="store_true", help="접지방법 목록")
    parser.add_argument("--search", action="store_true", help="조건 검색")
    parser.add_argument("--json", action="store_true", help="JSON 출력")
    
    args = parser.parse_args()
    
    if args.list_methods:
        methods = list_methods()
        if args.json:
            print(json.dumps(methods, ensure_ascii=False))
        else:
            print("접지방법 목록:")
            for m in methods:
                print(f"  - {m}")
        return
    
    if args.search:
        results = search_prices(args.method, args.format)
        if args.json:
            print(json.dumps(results, ensure_ascii=False, indent=2))
        else:
            for r in results:
                print(f"{r['method']} | {r['format']} | {r['qty_range']} | {r['fold_range']} | {r['price']:,}원")
        return
    
    if args.method and args.format and args.qty:
        result = lookup_price(args.method, args.format, args.qty, args.fold)
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            if result["matched"]:
                print(f"✅ 접지 단가: {result['price']:,}원")
                print(f"   조건: {result['method']} | {result['format']}판 | {result['qty_range']}부 | {result['fold_range']}절")
            else:
                print(f"❌ 해당 조건의 단가를 찾을 수 없습니다")
                print(f"   조건: {args.method} | {args.format} | {args.qty}부 | {args.fold}절")
        return
    
    parser.print_help()


if __name__ == "__main__":
    main()
