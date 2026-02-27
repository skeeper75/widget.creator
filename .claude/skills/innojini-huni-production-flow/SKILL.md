---
name: innojini-huni-production-flow
description: >
  후니프린팅 생산 공정 플로우 도메인 지식 베이스. 17가지 공정 케이스별
  단계별 플로우, 인쇄 방식별 후가공 연결, 공정 단계 코드 체계를 포함.
  MES 연동 API 설계, 공정 상태 관리, 생산 팀 구성 파악 시 활용.
  Use when designing production APIs, MES integration, process status tracking,
  or building manufacturing workflow systems for HuniPrinting.
license: Apache-2.0
compatibility: Designed for Claude Code - widget.creator project
user-invocable: false
metadata:
  version: "1.0.0"
  category: "domain"
  status: "active"
  updated: "2026-02-27"
  tags: "huni, production, manufacturing, process, MES, workflow, case"
  source: "후니프린팅_공정관리_시행초안_20260210.pdf"

# MoAI Extension: Progressive Disclosure
progressive_disclosure:
  enabled: true
  level1_tokens: 130
  level2_tokens: 2000

# MoAI Extension: Triggers
triggers:
  keywords: ["공정", "생산", "제작", "후가공", "코팅", "재단", "제본", "production", "manufacturing", "case", "케이스", "MES", "낱장", "스티커공정", "아크릴공정", "UV", "레이저커팅"]
  agents: ["expert-backend", "team-backend-dev", "manager-spec"]
  phases: ["plan", "run"]
---

# 후니프린팅 생산 공정 플로우

출처: `후니프린팅_공정관리_시행초안_20260210.pdf` (2026.02.10)

---

## 공정 케이스 개요

총 **17개 공정 케이스**로 모든 생산 흐름을 분류.
각 케이스는 인쇄 방식 + 후가공 조합으로 정의.

---

## 17가지 공정 케이스 (Production Flow Cases)

### Case 1 — 낱장인쇄 (Single Sheet Printing)
```
디지털출력 → 코팅 → 재단 → 1차포장
```
대표 상품: 명함, 엽서, 포스터, 전단, 포토카드

---

### Case 2 — 스티커 (Sticker)
```
디지털출력 → 코팅 → 반칼커팅 / 완칼커팅 → 재단 → 1차포장
```
- 반칼커팅: 뒷면 이형지 유지 (일반 스티커)
- 완칼커팅: 완전 커팅 (낱장 스티커)

---

### Case 3 — 인쇄후가공 (Print + Post-Processing)
```
디지털출력 → 코팅 → 재단 → 오시 / 접지 / 타공 / 귀돌이 / 수동도무송 → 1차포장
```
후가공 종류:
- 오시: 접는 선 내기
- 접지: 반접기, 3단접기 등
- 타공: 구멍 뚫기
- 귀돌이: 모서리 라운딩
- 수동도무송: 수동 형압 커팅

---

### Case 4 — 책자 (링제본) (Booklet - Ring Binding)
```
디지털출력 → 코팅 → 재단 → 링제본 → 1차포장
```
링 재질: 와이어O링, 플라스틱링

---

### Case 5 — 책자 (제본) (Booklet - Binding)
```
디지털출력 → 코팅 → 재단 → 중철제본 / PUR제본 / 박제본 → 재단 → 1차포장
```
제본 방식:
- 중철제본: 스테이플러 방식 (중간 철사 고정)
- PUR제본: 무선 PUR 접착 (표지+내지)
- 박제본: 양장 하드커버

---

### Case 6 — 실사/사인 (Large Format / Signage)
```
실사출력 → 올코팅 → 조립/후가공 → 1차포장 + 박스포장
```
올코팅: 전면 라미네이팅 (방수, 내구성)
대표 상품: 현수막, 배너, 포스터 (대형)

---

### Case 7 — 투명실사 (Transparent Large Format)
```
라텍스(화이트)출력 → 조립/후가공 → 1차포장 + 박스포장
```
화이트 레이어 후 컬러 출력으로 투명 소재 위 불투명 인쇄

---

### Case 8 — 커팅 (Cutting)
```
레이저커팅 / 시트커팅 → 1차포장 + 박스포장
```
- 레이저커팅: 정밀 형태 커팅
- 시트커팅: 대형 시트 재단

---

### Case 9 — 봉제미싱 (Fabric Sewing)
```
패브릭출력 → 봉제미싱 → 1차포장
```
대표 상품: 에코백, 파우치, 패브릭 굿즈

---

### Case 10 — UV단품 (UV Flat Print)
```
UV평판출력 → 1차포장
```
UV 잉크 직접 인쇄 (가죽, 금속, 목재 등 다양한 소재)

---

### Case 11 — 투명클립보드 (Transparent Clipboard)
```
UV평판출력 → 레이저커팅 → 조립/후가공 → 1차포장
```

---

### Case 12 — 아크릴가공 (Acrylic Processing)
```
UV평판출력 → 레이저커팅 → 아크릴가공 → 1차포장
```
아크릴가공: 아크릴 절단 + 후가공 (조각, 홀 가공 등)
대표 상품: 아크릴키링, 아크릴스탠드, 굿즈

---

### Case 13 — 전사 (Heat Transfer)
```
전사인쇄 → 1차포장
```
전사지 방식의 고온 압착 인쇄

---

### Case 14 — 도장 (Stamp)
```
도장제작 → 1차포장
```
고무/포토폴리머 스탬프 제작

---

### Case 15 — 외주공정 (Outsourced Special Process)
```
동판제작 + 박작업 → 생산본부
```
- 동판제작: 금박/은박용 동판
- 박작업: 금박, 은박, 홀로그램박 (외주 협력사)

---

### Case 16 — 재고상품 (Stock Product)
```
상품액세사리(재고) → 1차포장
```
별도 제작 없이 재고에서 바로 출고

---

### Case 17 — 외주제작 (Outsourced Manufacturing)
```
책자제작 / 실사현수막 / 합판인쇄 / 고주파 → 1차포장
```
외주사에서 완제품 납품 후 자체 포장·출고

---

## 공정별 인쇄 방식 매핑

| 인쇄 방식 | 해당 케이스 |
|----------|-----------|
| 디지털출력 | Case 1, 2, 3, 4, 5 |
| 실사출력 | Case 6 |
| 라텍스출력 | Case 7 |
| 레이저/시트커팅 | Case 8 |
| 패브릭출력 | Case 9 |
| UV평판출력 | Case 10, 11, 12 |
| 전사인쇄 | Case 13 |
| 도장제작 | Case 14 |
| 외주 (동판+박) | Case 15 |
| 재고 | Case 16 |
| 외주 완제품 | Case 17 |

---

## 공정 현황 참고값 (2026.02.10 기준)

| 항목 | 수치 |
|------|------|
| 당일 발주 처리 | 940건/일 |
| 당일 생산 처리 | 300건/일 |
| 생산팀 구성 | 15개 팀 |

---

## 지식 경계 (Knowledge Boundary)

> **이 스킬에 포함된 것**: 공정 케이스 분류, 단계별 플로우, 인쇄 방식 매핑
> **DB에서 관리되는 것**: 실제 주문별 공정 상태, 각 단계 소요 시간, 작업자 배정
> **업데이트 시점**: 공정관리 문서 개정 시 (후니프린팅_공정관리_시행초안 버전업)
