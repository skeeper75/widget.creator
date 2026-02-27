# 네스팅 알고리즘 가이드 (Nesting Algorithms)

비정형 조판을 위한 2D 배치 최적화 알고리즘.

---

## 1. 알고리즘 분류

### 1.1 문제 유형별 분류

| 유형 | 문제 정의 | 적용 | 복잡도 |
|-----|---------|-----|-------|
| **1D Cutting Stock** | 고정 길이 막대에서 최소 낭비로 절단 | 롤 길이 최적화 | O(n log n) |
| **2D Bin Packing** | 고정 크기 빈에 사각형 배치 | 낱장 판형 | O(n²) |
| **2D Strip Packing** | 고정 폭, 가변 높이 스트립 | 롤 조판 | O(n²) |
| **2D Irregular Nesting** | 비정형 도형 배치 | 자유형 스티커 | NP-hard |

### 1.2 휴리스틱 vs 메타휴리스틱

**휴리스틱 (Heuristic)**:
- Bottom-Left Fill (BLF)
- First Fit Decreasing (FFD)
- Best Fit Decreasing (BFD)
- 빠르지만 최적해 보장 없음

**메타휴리스틱 (Metaheuristic)**:
- Genetic Algorithm (GA)
- Simulated Annealing (SA)
- Tabu Search
- Cuckoo Search
- 전역 최적화, 느리지만 더 나은 해

---

## 2. 핵심 알고리즘

### 2.1 No-Fit Polygon (NFP)

비정형 네스팅의 기초 기하학 도구.

**정의**: 두 다각형 A, B가 있을 때, B가 A와 겹치지 않으면서 이동할 수 있는 B의 기준점 위치 집합

```
NFP 생성 원리:

다각형 A (고정)    다각형 B (이동)
┌───────┐          ┌───┐
│       │          │ B │
│   A   │          └─●─┘  ← 기준점
│       │
└───────┘

NFP = B의 기준점이 이 경계 위 또는 바깥에 있으면 겹치지 않음
```

**NFP 계산 방법**:
1. Minkowski Sum 사용
2. Orbiting (궤도 방식)
3. Sliding (미끄럼 방식)

### 2.2 Bottom-Left Fill (BLF)

가장 기본적인 배치 알고리즘.

```python
def bottom_left_fill(items, bin_width, bin_height):
    """
    Bottom-Left Fill 알고리즘
    
    1. 아이템을 면적 기준 내림차순 정렬
    2. 각 아이템을 가능한 가장 왼쪽-아래에 배치
    3. 충돌 시 위로/오른쪽으로 이동
    """
    placed = []
    items_sorted = sorted(items, key=lambda x: -x.area)
    
    for item in items_sorted:
        best_pos = find_bottom_left_position(item, placed, bin_width, bin_height)
        if best_pos:
            item.x, item.y = best_pos
            placed.append(item)
    
    return placed
```

**장점**: 빠름, 구현 간단
**단점**: 지역 최적해에 빠질 수 있음

### 2.3 MaxRects (Jukka Jylänki, 2010)

사각형 전용 고성능 알고리즘.

**변형**:
- **MAXRECTS-BL**: Bottom-Left
- **MAXRECTS-BSSF**: Best Short Side Fit
- **MAXRECTS-BAF**: Best Area Fit
- **MAXRECTS-CP**: Contact Point (Touching Perimeter)

```python
# 핵심 아이디어: 빈 공간을 분할하여 최대 사각형 목록 유지

class MaxRects:
    def __init__(self, width, height):
        self.free_rects = [Rect(0, 0, width, height)]
    
    def insert(self, w, h):
        # 1. 최적 위치 찾기 (휴리스틱에 따라)
        best_rect = self.find_best_rect(w, h)
        
        # 2. 아이템 배치
        placed = Rect(best_rect.x, best_rect.y, w, h)
        
        # 3. 빈 공간 분할 및 업데이트
        self.split_free_rects(placed)
        
        return placed
```

### 2.4 Genetic Algorithm (GA)

네스팅에 가장 많이 사용되는 메타휴리스틱.

```python
# 유전자 구조
chromosome = {
    "sequence": [item_ids],      # 배치 순서
    "rotations": [angles]        # 각 아이템 회전각
}

# 적합도 함수
def fitness(chromosome):
    layout = apply_placement(chromosome)
    used_area = calculate_used_area(layout)
    total_area = bin_width * used_height
    return used_area / total_area  # 효율

# 연산
def crossover(parent1, parent2):
    # 순서 교차 (Order Crossover, OX)
    pass

def mutate(chromosome):
    # 순서 교환 또는 회전 변경
    pass
```

### 2.5 Strip Packing (롤 최적화)

**문제**: 고정 폭 W, 무한 길이 스트립에서 높이(길이) 최소화

```
롤 폭 (고정)
┌───────────────────────────┐
│ ┌───┐ ┌─────┐ ┌───────┐   │
│ │   │ │     │ │       │   │
│ └───┘ └─────┘ └───────┘   │
│     ┌─────────┐ ┌───┐     │
│     │         │ │   │     │
│     └─────────┘ └───┘     │  높이 (최소화)
│ ┌───────────────────┐     │
│ │                   │     │
│ └───────────────────┘     │
└───────────────────────────┘
          ↓
   최소화 대상: 사용 높이
```

**알고리즘**:
- NFDH (Next Fit Decreasing Height): 근사비 2
- FFDH (First Fit Decreasing Height): 근사비 1.7
- Sleator's Algorithm: 근사비 2.5

---

## 3. 오픈소스 라이브러리

### 3.1 rectpack (Python)

사각형 전용, 가장 사용하기 쉬움.

```python
from rectpack import newPacker, SORT_AREA

# 패커 생성
packer = newPacker(
    mode=PackingMode.Offline,
    pack_algo=MaxRectsBssf,
    sort_algo=SORT_AREA,
    rotation=True
)

# 사각형 추가
rectangles = [(100, 30), (40, 60), (30, 30), (70, 70)]
for r in rectangles:
    packer.add_rect(*r)

# 빈 추가
bins = [(300, 450)]
for b in bins:
    packer.add_bin(*b)

# 패킹
packer.pack()

# 결과
for rect in packer.rect_list():
    b, x, y, w, h, rid = rect
    print(f"Bin {b}: ({x}, {y}) - {w}×{h}")
```

**지원 알고리즘**:
- MaxRects (BL, BSSF, BAF, CP)
- Skyline (BL, MW)
- Guillotine (BSSF, SAS)

### 3.2 SVGnest (JavaScript)

비정형 네스팅, 웹 기반.

```javascript
// 브라우저에서 실행
// SVG 파일 입력
// 유전 알고리즘 + NFP

특징:
- 실시간 시각화
- Part-in-part (구멍 안 배치) 지원
- 상용 소프트웨어급 성능
```

GitHub: https://github.com/Jack000/SVGnest

### 3.3 libnest2d (C++)

고성능 산업용 라이브러리.

```cpp
// Prusa Slicer, Cura에서 사용
// Python 바인딩: pynest2d

#include <libnest2d/libnest2d.hpp>

Nester<ClipperPolygon, BottomLeftPlacer, FirstFitSelection> nester;
nester.execute(items, bins);
```

### 3.4 2D-Irregular-Packing-Algorithm (Python)

학술 알고리즘 모음.

```
포함 알고리즘:
- Bottom-Left-Fill
- Genetic Algorithm
- NFP Test
- Cuckoo Search
- Fast Neighbor Search
```

GitHub: https://github.com/liuhaoran/2D-Irregular-Packing-Algorithm

---

## 4. 상용 소프트웨어

| 제품 | 특징 | 주요 고객 |
|-----|-----|---------|
| **Esko Phoenix** | AI 기반, 인쇄업계 표준 | 대형 인쇄소 |
| **ONYX TruFit** | HP 실사출력 최적화 | 실사출력 업체 |
| **Zünd Cut Center** | 커팅 장비 연동 | 커팅 장비 사용자 |
| **Ultimate Impostrip** | True-Shaped Nesting | 패키지 인쇄 |
| **SAi Flexi** | 사인/간판 업계 표준 | 사인 제작 업체 |
| **InSoft Imp** | 옵셋 특화 | 옵셋 인쇄소 |

---

## 5. 인쇄 적용 시 고려사항

### 5.1 오브젝트 간격

| 장비 | 최소 간격 | 블리드 | 비고 |
|-----|---------|-------|-----|
| 디지털 커터 (Zünd) | 2mm | 2~3mm | 정밀도 높음 |
| 롤 플로터 (Roland) | 2mm | 2~3mm | OPOS 마크 |
| 레이저 커터 | 0.5mm | 1mm | 공통칼선 가능 |
| 톰슨 (옵셋용) | 3mm | 3mm | 대량생산 |

### 5.2 레지스트레이션 마크

```
┌─────────────────────────────────────────┐
│  ●                                   ●  │
│     ┌─────┐  ┌─────┐  ┌─────┐         │
│     │ A   │  │ B   │  │ C   │         │
│     └─────┘  └─────┘  └─────┘         │
│  ●              ●                    ●  │
│     ┌───────────────┐  ┌─────────┐     │
│     │      D        │  │    E    │     │
│     └───────────────┘  └─────────┘     │
│  ●                                   ●  │
└─────────────────────────────────────────┘

● = 레지스트레이션 마크
위치: 첫/마지막 + 500mm 간격
종류: 크롭마크, QR코드, 십자마크
```

### 5.3 롤 조판 특수 고려

```
롤 제약:
├─ 롤 폭 고정 (914mm, 1370mm 등)
├─ 길이 가변 → 네스팅 직접 영향
├─ 측면 여백 필수 (10~15mm)
├─ 스티커 간 간격: 3~5mm
└─ 잔재 활용 고려
```

---

## 6. 구현 가이드

### 6.1 단계별 구현

1. **사각형 전용 (즉시 구현 가능)**
   - rectpack 라이브러리 사용
   - 규격 스티커, 라벨에 적용

2. **Strip Packing (단기)**
   - FFDH 알고리즘 직접 구현
   - 롤 조판 최적화

3. **NFP 기반 (중기)**
   - SVGnest 참조 구현
   - 자유형 스티커 대응

4. **GA 최적화 (장기)**
   - 유전 알고리즘 추가
   - 대량 배치 최적화

### 6.2 성능 고려사항

```
실시간 견적 시스템:
├─ 응답시간 목표: < 1초
├─ 사각형 100개: rectpack으로 충분
├─ 비정형 50개: NFP 사전계산 필요
└─ 복잡한 배치: 근사해 + 백그라운드 최적화
```

---

## 7. 참고 자료

### 논문
- Jukka Jylänki, "A Thousand Ways to Pack the Bin" (2010)
- E.K. Burke et al., "Complete and robust no-fit polygon generation" (2006)

### 라이브러리
- rectpack: https://github.com/secnot/rectpack
- SVGnest: https://github.com/Jack000/SVGnest
- libnest2d: https://github.com/tamasmeszaros/libnest2d

### 시각화 도구
- SVGnest Demo: https://svgnest.com/
- Bin Packing Visualizer: https://codeincomplete.com/articles/bin-packing/

---

*Last Updated: 2025-12-12*
