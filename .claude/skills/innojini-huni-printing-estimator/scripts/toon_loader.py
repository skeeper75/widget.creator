#!/usr/bin/env python3
"""
TOON Loader - TOON 파일을 Python 객체로 로드하는 경량 모듈

다른 스킬의 스크립트에서 복사하여 사용 가능.
의존성: 없음 (순수 Python)

Usage:
    from toon_loader import ToonLoader
    
    loader = ToonLoader()
    data = loader.load("prices.toon")
    
    # 특정 테이블만 로드
    papers = loader.load_table("prices.toon", "paper")
    
    # 키-값 조회
    price = loader.get_value(data, "paper", "아트지120g")
"""

import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

JsonValue = Union[None, bool, int, float, str, List[Any], Dict[str, Any]]


class ToonLoader:
    """TOON 파일 로더"""
    
    def __init__(self, indent: int = 2):
        self.indent = indent
        self._cache: Dict[str, JsonValue] = {}
    
    def load(self, filepath: str, use_cache: bool = True) -> JsonValue:
        """
        TOON 파일을 Python 객체로 로드
        
        Args:
            filepath: TOON 파일 경로
            use_cache: 캐시 사용 여부
        
        Returns:
            Python dict/list
        """
        filepath = str(Path(filepath).resolve())
        
        if use_cache and filepath in self._cache:
            return self._cache[filepath]
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        result = self.parse(content)
        
        if use_cache:
            self._cache[filepath] = result
        
        return result
    
    def load_table(self, filepath: str, table_name: str) -> List[Dict]:
        """
        특정 테이블만 로드
        
        Args:
            filepath: TOON 파일 경로
            table_name: 테이블 키 이름
        
        Returns:
            테이블 데이터 (dict 리스트)
        """
        data = self.load(filepath)
        if isinstance(data, dict) and table_name in data:
            result = data[table_name]
            if isinstance(result, list):
                return result
        return []
    
    def parse(self, content: str) -> JsonValue:
        """TOON 문자열을 Python 객체로 파싱"""
        lines = content.split('\n')
        # 주석 및 빈 줄 필터링
        lines = [l for l in lines if l.strip() and not l.strip().startswith('#')]
        
        if not lines:
            return {}
        
        return self._parse_object(lines, 0, 0)[0]
    
    def _parse_object(self, lines: List[str], start: int, depth: int) -> tuple:
        """객체 파싱"""
        obj = {}
        i = start
        expected_indent = depth * self.indent
        
        while i < len(lines):
            line = lines[i]
            if not line.strip():
                i += 1
                continue
            
            current_indent = len(line) - len(line.lstrip())
            
            if current_indent < expected_indent and i > start:
                break
            
            if line.lstrip().startswith('- '):
                break
            
            stripped = line.strip()
            
            # 배열 헤더 확인: key[N]{fields}: 또는 key[N]:
            array_match = re.match(
                r'^([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\](?:\{([^}]+)\})?:(.*)$', 
                stripped
            )
            
            if array_match:
                key = array_match.group(1)
                length = int(array_match.group(2))
                fields_str = array_match.group(3)
                inline_values = array_match.group(4).strip()
                
                if fields_str:
                    # 테이블 형식
                    fields = [f.strip() for f in fields_str.split(',')]
                    obj[key], i = self._parse_tabular_rows(
                        lines, i + 1, length, fields, depth + 1
                    )
                elif inline_values:
                    # 인라인 원시 배열
                    obj[key] = self._parse_inline_values(inline_values)
                    i += 1
                else:
                    # 리스트 형식
                    obj[key], i = self._parse_list_array(
                        lines, i + 1, length, depth + 1
                    )
            else:
                # 일반 키-값
                key, value = self._parse_key_value(stripped)
                if key is not None:
                    if value == '':
                        # 중첩 객체
                        obj[key], i = self._parse_object(lines, i + 1, depth + 1)
                    else:
                        obj[key] = self._parse_primitive(value)
                        i += 1
                else:
                    i += 1
        
        return obj, i
    
    def _parse_key_value(self, line: str) -> tuple:
        """키-값 쌍 파싱"""
        # 따옴표로 시작하는 키
        if line.startswith('"'):
            match = re.match(r'^"((?:[^"\\]|\\.)*)"\s*:', line)
            if match:
                key = self._unescape(match.group(1))
                value = line[match.end():].strip()
                return key, value
        
        # 일반 키
        colon_pos = line.find(':')
        if colon_pos > 0:
            key = line[:colon_pos].strip()
            value = line[colon_pos + 1:].strip()
            return key, value
        
        return None, None
    
    def _parse_tabular_rows(
        self, lines: List[str], start: int, length: int, 
        fields: List[str], depth: int
    ) -> tuple:
        """테이블 행 파싱"""
        arr = []
        i = start
        expected_indent = depth * self.indent
        
        while i < len(lines) and len(arr) < length:
            line = lines[i]
            if not line.strip():
                i += 1
                continue
            
            current_indent = len(line) - len(line.lstrip())
            if current_indent < expected_indent:
                break
            
            values = self._split_csv(line.strip())
            obj = {}
            for j, field in enumerate(fields):
                if j < len(values):
                    obj[field] = self._parse_primitive(values[j])
                else:
                    obj[field] = None
            arr.append(obj)
            i += 1
        
        return arr, i
    
    def _parse_list_array(
        self, lines: List[str], start: int, length: int, depth: int
    ) -> tuple:
        """리스트 형식 배열 파싱"""
        arr = []
        i = start
        
        while i < len(lines) and len(arr) < length:
            line = lines[i]
            if not line.strip():
                i += 1
                continue
            
            stripped = line.strip()
            if not stripped.startswith('- '):
                break
            
            item_content = stripped[2:].strip()
            
            if ':' in item_content:
                colon_pos = item_content.find(':')
                key = item_content[:colon_pos].strip()
                value = item_content[colon_pos + 1:].strip()
                
                if value:
                    arr.append({self._unquote(key): self._parse_primitive(value)})
                else:
                    nested_obj, i = self._parse_object(lines, i + 1, depth + 1)
                    arr.append({self._unquote(key): nested_obj})
                    continue
            else:
                arr.append(self._parse_primitive(item_content))
            
            i += 1
        
        return arr, i
    
    def _parse_inline_values(self, values_str: str) -> List:
        """인라인 배열 값 파싱"""
        if not values_str:
            return []
        values = self._split_csv(values_str)
        return [self._parse_primitive(v) for v in values]
    
    def _split_csv(self, row: str) -> List[str]:
        """CSV 스타일 행 분리 (따옴표 처리)"""
        result = []
        current = ''
        in_quotes = False
        escape_next = False
        
        for char in row:
            if escape_next:
                current += char
                escape_next = False
            elif char == '\\':
                current += char
                escape_next = True
            elif char == '"':
                current += char
                in_quotes = not in_quotes
            elif char == ',' and not in_quotes:
                result.append(current.strip())
                current = ''
            else:
                current += char
        
        result.append(current.strip())
        return result
    
    def _parse_primitive(self, s: str) -> JsonValue:
        """원시값 파싱"""
        s = s.strip()
        
        if not s:
            return None
        if s == 'null':
            return None
        if s == 'true':
            return True
        if s == 'false':
            return False
        
        # 따옴표 문자열
        if s.startswith('"') and s.endswith('"'):
            return self._unescape(s[1:-1])
        
        # 숫자
        try:
            if '.' in s:
                return float(s)
            return int(s)
        except ValueError:
            pass
        
        return s
    
    def _unquote(self, s: str) -> str:
        """따옴표 제거"""
        s = s.strip()
        if s.startswith('"') and s.endswith('"'):
            return self._unescape(s[1:-1])
        return s
    
    def _unescape(self, s: str) -> str:
        """이스케이프 시퀀스 처리"""
        return (s.replace('\\n', '\n')
                 .replace('\\r', '\r')
                 .replace('\\t', '\t')
                 .replace('\\"', '"')
                 .replace('\\\\', '\\'))
    
    def clear_cache(self):
        """캐시 초기화"""
        self._cache.clear()
    
    # =========================================================================
    # 편의 메서드
    # =========================================================================
    
    def get_table_as_dict(
        self, filepath: str, table_name: str, 
        key_field: str, value_field: str
    ) -> Dict:
        """
        테이블을 key-value 딕셔너리로 변환
        
        Usage:
            prices = loader.get_table_as_dict(
                "prices.toon", "paper", "name", "price"
            )
            # {"아트지120g": 54, "모조지100g": 31, ...}
        """
        table = self.load_table(filepath, table_name)
        return {row[key_field]: row[value_field] for row in table if key_field in row}
    
    def get_tier_value(
        self, filepath: str, table_name: str,
        quantity: int, min_field: str = "qty_min", 
        max_field: str = "qty_max", value_field: str = "price"
    ) -> Optional[Any]:
        """
        수량 구간별 값 조회 (할인율, 제본비 등)
        
        Usage:
            rate = loader.get_tier_value(
                "prices.toon", "discount_tiers", 
                quantity=150, value_field="rate"
            )
            # 0.10
        """
        table = self.load_table(filepath, table_name)
        for row in table:
            min_qty = row.get(min_field, 0)
            max_qty = row.get(max_field, float('inf'))
            if max_qty is None:
                max_qty = float('inf')
            if min_qty <= quantity <= max_qty:
                return row.get(value_field)
        return None
    
    def find_row(
        self, filepath: str, table_name: str, **conditions
    ) -> Optional[Dict]:
        """
        조건에 맞는 행 찾기
        
        Usage:
            paper = loader.find_row(
                "prices.toon", "paper",
                name="아트지", weight="120g"
            )
            # {"code": "P04", "name": "아트지", "weight": "120g", "price": 54, ...}
        """
        table = self.load_table(filepath, table_name)
        for row in table:
            if all(row.get(k) == v for k, v in conditions.items()):
                return row
        return None


# =============================================================================
# CLI
# =============================================================================

def main():
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: toon_loader.py <file.toon> [table_name]")
        sys.exit(1)
    
    filepath = sys.argv[1]
    table_name = sys.argv[2] if len(sys.argv) > 2 else None
    
    loader = ToonLoader()
    
    if table_name:
        result = loader.load_table(filepath, table_name)
    else:
        result = loader.load(filepath)
    
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
