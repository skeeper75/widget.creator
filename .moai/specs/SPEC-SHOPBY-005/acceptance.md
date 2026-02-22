# SPEC-SHOPBY-005 수용 기준: 디자인 파일 업로드 및 관리

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-SHOPBY-005 |
| 검증 방법 | 단위 테스트, 통합 테스트, E2E 파일 업로드 테스트 |
| 품질 기준 | 테스트 커버리지 85% 이상, PDF 업로드 후 주문 연결 검증 |

---

## 수용 시나리오

### AC-001: Shopby Storage 이미지 업로드 (R-FILE-001)

```gherkin
Feature: Shopby Storage API를 통한 이미지 업로드

  Scenario: JPG 이미지 업로드
    Given 위젯에서 10MB JPG 디자인 파일을 선택했을 때
    When 파일 업로드를 실행하면
    Then Shopby POST /storage/temporary-images API가 호출된다
    And 업로드 성공 후 이미지 URL이 반환된다
    And 위젯에 업로드 완료 상태가 표시된다

  Scenario: 12MB 초과 이미지 자동 라우팅
    Given 위젯에서 15MB PNG 파일을 선택했을 때
    When 파일 업로드를 실행하면
    Then Shopby Storage 대신 S3 Presigned URL 경로로 업로드된다
    And 업로드 완료 후 S3 파일 URL이 반환된다
```

### AC-002: 대용량 디자인 파일 S3 업로드 (R-FILE-002)

```gherkin
Feature: AWS S3 Presigned URL 기반 대용량 파일 업로드

  Scenario: PDF 파일 업로드
    Given 위젯에서 50MB PDF 디자인 파일을 선택했을 때
    When 파일 업로드를 실행하면
    Then Widget Creator API에서 Presigned URL이 발급된다
    And 클라이언트에서 S3에 직접 멀티파트 업로드가 진행된다
    And 업로드 진행률이 실시간으로 표시된다
    And 업로드 완료 후 파일 메타데이터가 DB에 저장된다

  Scenario: AI 파일 업로드
    Given 위젯에서 30MB Adobe Illustrator 파일을 선택했을 때
    When 파일 업로드를 실행하면
    Then S3 Presigned URL을 통해 업로드된다
    And 파일 형식이 "AI"로 정확히 인식된다

  Scenario: 업로드 중단 후 재개
    Given 대용량 파일 업로드 중 네트워크가 끊겼을 때
    When 네트워크가 복구된 후 재시도하면
    Then 이미 업로드된 청크를 건너뛰고 나머지부터 진행된다
    And 전체 파일이 정상적으로 업로드 완료된다
```

### AC-003: 파일-주문 연결 (R-FILE-003)

```gherkin
Feature: 업로드 파일과 주문 아이템 연결

  Scenario: 주문 생성 시 파일 연결
    Given 파일이 업로드되어 PENDING 상태일 때
    When 해당 파일이 포함된 주문서를 생성하면
    Then 파일 상태가 ATTACHED로 변경된다
    And optionInputs.designFileUrl에 파일 접근 URL이 포함된다

  Scenario: 주문 완료 시 파일 확정
    Given 파일이 ATTACHED 상태이고 결제가 완료되었을 때
    When 주문 상태가 "결제완료"로 변경되면
    Then 파일 상태가 CONFIRMED로 변경된다
    And S3에서 temp/ → orders/ 디렉토리로 파일이 이동된다

  Scenario: 주문 취소 시 파일 정리
    Given 파일이 ATTACHED 상태이고 주문이 취소되었을 때
    When 주문 상태가 "취소완료"로 변경되면
    Then 파일 상태가 ORPHANED로 변경된다
    And 30일 후 자동 삭제 스케줄이 설정된다
```

### AC-004: 파일 유효성 검증 (R-FILE-004)

```gherkin
Feature: 디자인 파일 유효성 검증

  Scenario: PDF 파일 형식 검증
    Given PDF 파일이 업로드 완료되었을 때
    When 파일 검증을 실행하면
    Then Magic bytes 기반으로 PDF 형식이 확인된다
    And 확장자가 실제 파일 형식과 일치하는지 확인된다

  Scenario: 해상도 경고
    Given 200DPI 해상도의 이미지 파일이 업로드되었을 때
    When 해상도 검증을 실행하면
    Then validation.resolutionValid가 false이다
    And "인쇄 품질을 위해 300DPI 이상 권장합니다" 경고가 표시된다
    And 주문 진행은 허용된다 (WARNING 상태)

  Scenario: 해상도 차단
    Given 100DPI 해상도의 이미지 파일이 업로드되었을 때
    When 해상도 검증을 실행하면
    Then "해상도가 너무 낮아 인쇄 품질이 보장되지 않습니다" 에러가 표시된다
    And 재업로드가 요구된다 (INVALID 상태)

  Scenario: PDF 페이지 수 검증
    Given 양면 인쇄 명함 주문에 1페이지 PDF가 업로드되었을 때
    When 페이지 수 검증을 실행하면
    Then "양면 인쇄를 위해 2페이지 PDF가 필요합니다" 안내가 표시된다

  Scenario: 바이러스 감염 파일 차단
    Given 바이러스가 포함된 파일이 업로드되었을 때
    When 비동기 바이러스 스캔이 완료되면
    Then virusScanStatus가 INFECTED로 변경된다
    And 파일이 격리 처리된다
    And 사용자에게 "보안 문제가 감지되었습니다. 다른 파일을 업로드해주세요" 안내가 제공된다
```

### AC-005: 파일명 체계 (R-FILE-005)

```gherkin
Feature: 표준 파일명 자동 생성

  Scenario: 명함 파일명 생성
    Given 명함 상품 (90x50mm, 양면, 스노우화이트 250g, 200매) 주문의 파일일 때
    When 표준 파일명을 생성하면
    Then 파일명이 "명함_90x50_양면_스노우화이트250g_직접주문_{고객명}_001_200매.pdf" 형식이다

  Scenario: 한글 파일명 인코딩
    Given 원본 파일명이 한글을 포함할 때
    When 표준 파일명으로 변환하면
    Then 한글이 NFC 정규화되어 저장된다
    And URL 인코딩 시 정상적으로 접근 가능하다
```

### AC-006: 주문 전/후 파일 워크플로우 (R-FILE-006)

```gherkin
Feature: 주문 상태에 따른 파일 관리

  Scenario: 주문 전 파일 교체
    Given 주문서 작성 중이고 파일이 PENDING 상태일 때
    When 다른 파일로 교체하면
    Then 기존 파일이 삭제되고 새 파일이 업로드된다
    And optionInputs의 designFileUrl이 새 파일 URL로 업데이트된다

  Scenario: 주문 후 파일 교체 (제작 전)
    Given 결제 완료 후 제작 대기 상태이고 파일 교체가 필요할 때
    When 고객이 파일 교체를 요청하면
    Then 관리자에게 교체 승인 요청이 전달된다
    And 관리자 승인 후 새 파일 업로드가 가능해진다
    And 기존 파일은 아카이브로 이동된다

  Scenario: 제작 시작 후 파일 교체 불가
    Given 주문 상태가 "제작중"일 때
    When 파일 교체를 요청하면
    Then "제작이 시작된 주문은 파일을 변경할 수 없습니다" 안내가 표시된다
    And 재주문 안내가 제공된다
```

---

## 완료 정의 (Definition of Done)

- [ ] PDF 파일이 S3 Presigned URL을 통해 정상 업로드됨
- [ ] 이미지 파일은 Shopby Storage API로 업로드됨 (12MB 미만)
- [ ] 12MB 초과 이미지는 자동으로 S3 경로로 라우팅됨
- [ ] 파일 형식이 Magic bytes 기반으로 정확히 검증됨
- [ ] 해상도 미달 시 경고/차단 메시지가 표시됨
- [ ] PDF 페이지 수가 인쇄 사양과 일치 검증됨
- [ ] 파일명이 표준 명명 규칙으로 자동 생성됨
- [ ] 주문 생성 시 파일이 정상 연결되고 상태가 변경됨
- [ ] 주문 후 파일 교체 워크플로우 (관리자 승인) 동작
- [ ] 업로드 진행률이 위젯에 실시간 표시됨
- [ ] 테스트 커버리지 85% 이상

---

문서 버전: 1.0.0
