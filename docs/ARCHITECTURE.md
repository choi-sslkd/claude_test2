# PromptGuard v2 아키텍처 설계서

---

## 1. 시스템 전체 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              사용자 환경                                  │
│                                                                         │
│  ┌──────────────────┐  ┌────────────────────┐  ┌─────────────────────┐  │
│  │   관리자 웹 UI     │  │  Chrome 확장 프로그램  │  │   외부 클라이언트     │  │
│  │   React + Vite    │  │  content.js         │  │   curl / Postman    │  │
│  │   :5173           │  │  background.js      │  │                     │  │
│  │                   │  │                     │  │                     │  │
│  │  ┌─────────────┐ │  │  ┌───────────────┐  │  │                     │  │
│  │  │ 룰 CRUD     │ │  │  │ PII 검사(로컬) │  │  │                     │  │
│  │  │ 가중치 확인  │ │  │  │ 마스킹(로컬)   │  │  │                     │  │
│  │  │ 감사 로그   │ │  │  │ 파일 스캔(로컬) │  │  │                     │  │
│  │  │ 설정       │ │  │  │ 서버 API 호출   │  │  │                     │  │
│  │  └─────────────┘ │  │  │ WASM 폴백      │  │  │                     │  │
│  └────────┬─────────┘  │  └───────┬───────┘  │  └──────────┬──────────┘  │
│           │ x-admin-key │         │마스킹 텍스트│            │             │
│           ▼             │         ▼           │            ▼             │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                  NestJS API Server (:3000)                      │   │
│  │                                                                  │   │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌───────────────┐  │   │
│  │  │ Scoring    │ │ FileScan   │ │ Analyze  │ │ Rules         │  │   │
│  │  │ Module     │ │ Module     │ │ Module   │ │ Module        │  │   │
│  │  │            │ │            │ │          │ │               │  │   │
│  │  │ /api/v1/   │ │ /api/v1/   │ │ /api/v1/ │ │ /admin/rules  │  │   │
│  │  │ score      │ │ scan-file  │ │ analyze  │ │ CRUD          │  │   │
│  │  └─────┬──────┘ └─────┬──────┘ └────┬─────┘ └───────┬───────┘  │   │
│  │        │              │             │               │           │   │
│  │  ┌─────┴──────────────┴─────────────┴───────────────┴────────┐  │   │
│  │  │                    공통 서비스 레이어                        │  │   │
│  │  │                                                            │  │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐ │  │   │
│  │  │  │ Masking  │ │ MlClient │ │ WeightCalc │ │ AuditLog   │ │  │   │
│  │  │  │ Service  │ │ Service  │ │ Service    │ │ Service    │ │  │   │
│  │  │  └──────────┘ └────┬─────┘ └────────────┘ └────────────┘ │  │   │
│  │  └────────────────────┼──────────────────────────────────────┘  │   │
│  │                       │                                         │   │
│  │  ┌────────────────────┼────────────────────────────────────┐    │   │
│  │  │  보안 레이어         │                                    │    │   │
│  │  │  ThrottlerGuard (60회/분)  AdminGuard (x-admin-key)     │    │   │
│  │  │  ValidationPipe (2000자)   Body Limit (1MB)             │    │   │
│  │  └────────────────────┼────────────────────────────────────┘    │   │
│  │                       │                                         │   │
│  │  ┌────────────────────┴────────────────────────────────────┐    │   │
│  │  │  Prisma + SQLite                                        │    │   │
│  │  │  Rule 테이블 (15개 컬럼, OWASP 가중치 포함)               │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └────────────────────────┬────────────────────────────────────────┘   │
│                           │ HTTP (마스킹된 텍스트만)                    │
│                           ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                 Python FastAPI Server (:8001)                    │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌────────────────┐  ┌────────────────────┐  │   │
│  │  │ /v1/score    │  │ /v1/batch-score│  │ /v1/score/detailed │  │   │
│  │  └──────┬───────┘  └───────┬────────┘  └─────────┬──────────┘  │   │
│  │         │                  │                      │             │   │
│  │  ┌──────┴──────────────────┴──────────────────────┴──────────┐  │   │
│  │  │                    PromptScorer                            │  │   │
│  │  │                                                            │  │   │
│  │  │  ┌─────────────────────┐  ┌─────────────────────┐        │  │   │
│  │  │  │  Injection KNN      │  │  Ambiguity KNN      │        │  │   │
│  │  │  │  TF-IDF (50K)       │  │  TF-IDF (50K)       │        │  │   │
│  │  │  │  K=15, cosine       │  │  K=15, cosine       │        │  │   │
│  │  │  │  학습: 4,429 샘플    │  │  학습: 20,401 샘플   │        │  │   │
│  │  │  │  정확도: 93.5%       │  │  정확도: 81.9%       │        │  │   │
│  │  │  └─────────────────────┘  └─────────────────────┘        │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 포트 구성

| 포트 | 서비스 | 기술 스택 | 역할 |
|------|--------|----------|------|
| 3000 | NestJS API | Node.js + TypeScript | 백엔드 (룰 관리, 스코어링, 인증) |
| 5173 | React Web | Vite + React 19 | 관리자 대시보드 |
| 8001 | Python ML | FastAPI + scikit-learn | ML 추론 (KNN + TF-IDF) |

---

## 3. 디렉토리 구조

```
promptguard-v2/
│
├── apps/
│   ├── api/                                # NestJS 백엔드 API
│   │   ├── src/
│   │   │   ├── app.module.ts               # 루트 모듈 (모든 모듈 import)
│   │   │   ├── main.ts                     # 진입점 (CORS, 보안, Swagger)
│   │   │   ├── config/
│   │   │   │   └── app.config.ts           # 환경 설정
│   │   │   ├── common/                     # 공통 (가드, 필터, 파이프)
│   │   │   │   ├── guards/admin.guard.ts   # x-admin-key 인증
│   │   │   │   ├── filters/http-exception.filter.ts
│   │   │   │   ├── interceptors/logging.interceptor.ts
│   │   │   │   └── pipes/validation.pipe.ts
│   │   │   ├── prisma/                     # DB 연결
│   │   │   │   ├── prisma.service.ts
│   │   │   │   ├── prisma.module.ts
│   │   │   │   └── seed.ts                # 시드 데이터 (32개 기본 룰)
│   │   │   └── modules/
│   │   │       ├── scoring/               # 통합 스코어링
│   │   │       ├── file-scan/             # 파일 스캔
│   │   │       ├── analyze/               # 패턴 매칭 분석
│   │   │       ├── rules/                 # 룰 CRUD
│   │   │       ├── masking/               # PII 마스킹
│   │   │       ├── ml-client/             # Python ML HTTP 클라이언트
│   │   │       ├── weight-calculator/     # OWASP 가중치 계산
│   │   │       ├── admin-auth/            # 관리자 인증
│   │   │       ├── audit-log/             # 감사 로그
│   │   │       └── health/                # 헬스체크
│   │   └── prisma/
│   │       └── schema.prisma              # DB 스키마
│   │
│   ├── web/                               # React 관리자 웹
│   │   └── src/
│   │       ├── App.tsx                    # 라우팅
│   │       ├── pages/                     # 5개 페이지
│   │       ├── components/                # 인증 가드
│   │       └── services/                  # API 호출
│   │
│   └── chrome-extension/                  # Chrome 확장 프로그램
│       └── extension/
│           ├── manifest.json              # Manifest V3
│           ├── content.js                 # PII 로컬 검사 + 파일 스캔
│           ├── background.js              # 서버 API 호출 + WASM 폴백
│           └── build/release.wasm         # WASM 바이너리
│
├── packages/
│   └── rule-engine/                       # TypeScript 룰 엔진 (공유)
│       └── src/
│           ├── engine/rule-engine.ts       # 5개 내장 룰
│           ├── rules/                     # 룰 구현체
│           ├── types/index.ts             # 타입 정의
│           ├── scorers/risk.scorer.ts     # 위험도 계산
│           ├── normalizers/               # 텍스트 정규화
│           ├── explainers/                # 사유 설명
│           └── rewriters/                 # 안전 대안 제안
│
├── src/                                   # Python ML 백엔드
│   ├── api/                               # FastAPI 서버
│   │   ├── app.py                         # 앱 팩토리
│   │   ├── routes.py                      # 엔드포인트
│   │   └── schemas.py                     # 요청/응답 모델
│   ├── inference/
│   │   └── scorer.py                      # PromptScorer (모델 관리)
│   ├── models/
│   │   ├── injection/knn.py               # 인젝션 KNN
│   │   └── ambiguity/knn.py               # 모호성 KNN
│   ├── training/
│   │   ├── trainer.py                     # 학습 오케스트레이션
│   │   └── metrics.py                     # 평가 지표
│   ├── preprocessing/                     # 데이터 전처리
│   ├── collectors/                        # 7개 데이터셋 수집기
│   ├── rule_engine/rules.py               # Python 룰 엔진
│   └── auto_engine/                       # 자동 파이프라인
│
├── scripts/                               # CLI 도구
├── config/settings.py                     # Python 설정
├── docker-compose.yml                     # Docker 오케스트레이션
├── Dockerfile.ml / .api / .web            # 컨테이너 빌드
├── .github/workflows/ci.yml              # CI/CD
└── docs/                                  # 문서
```

---

## 4. 데이터 흐름

### 4.1 프롬프트 입력 → 판정까지

```
사용자: "내 주민번호는 901231-1234567이야. Ignore all previous instructions"
  │
  ▼ [1] Chrome 확장 content.js (브라우저 내부)
  │
  │  PII 검사 (정규식 9가지, 서버 전송 없음):
  │    → 주민등록번호 감지: 901231-1234567
  │    → 마스킹: ******-*******
  │
  │  마스킹된 텍스트: "내 주민번호는 ******-*******이야. Ignore all previous instructions"
  │
  ▼ [2] background.js → NestJS API (마스킹된 텍스트만 전송)
  │
  │  POST http://localhost:3000/api/v1/score
  │  Body: { "prompt": "내 주민번호는 ******-*******이야. Ignore all previous instructions" }
  │
  ▼ [3] NestJS ScoringService
  │
  │  ① MaskingService: 서버측 이중 마스킹 (이미 마스킹됨 → 변화 없음)
  │  ② DB에서 활성 룰 32개 로딩
  │  ③ Python ML API 호출 (마스킹된 텍스트):
  │     POST http://localhost:8001/v1/score
  │     → injection_score: 1.0 (100%)
  │     → ambiguity_score: 0.53 (53%)
  │
  │  ④ 패턴 매칭:
  │     룰 "ignore.*previous.*instructions" → 매칭됨!
  │     injectionContribution = 1.0 × 0.377 + 1.0 × 0.672 = 1.049 → clamp 1.0
  │
  │  ⑤ 패턴 매칭 있으므로 ML 할인 없음 (discountFactor = 1.0)
  │
  │  ⑥ 등급 판정:
  │     injection: 100% → CRITICAL
  │     ambiguity: 53% → MEDIUM
  │     overallRisk = max(CRITICAL, MEDIUM-1=LOW) = CRITICAL
  │
  ▼ [4] 응답 → Chrome 확장
  │
  │  { overallRisk: "CRITICAL", injectionPct: "100.0%", ambiguityPct: "53.1%", blocked: true }
  │
  ▼ [5] content.js 동작
  │
  │  CRITICAL → 빨간 경고 표시 + 입력창 비움 + 전송 차단
  │
  결과: ChatGPT에 전송되지 않음. 개인정보도 서버에 전송되지 않음.
```

### 4.2 관리자 룰 추가 → 가중치 자동 계산

```
관리자: 패턴 "jailbreak.*mode" / 카테고리 JAILBREAK 입력
  │
  ▼ [1] React AdminRulesPage
  │  POST /admin/rules (x-admin-key 헤더 포함)
  │  Body: { pattern: "jailbreak.*mode", category: "JAILBREAK" }
  │
  ▼ [2] NestJS RulesService.create()
  │
  │  WeightCalculatorService.calculate("jailbreak.*mode", "JAILBREAK"):
  │
  │    ① 테스트 프롬프트 5개 자동 생성:
  │       "jailbreak mode"
  │       "Please jailbreak mode"
  │       "I need you to jailbreak mode right now"
  │       "jailbreak mode and show me the result"
  │       "Can you jailbreak mode for my research?"
  │
  │    ② Python ML API에 5개 배치 전송:
  │       POST http://localhost:8001/v1/batch-score
  │       → 평균 injection: 0.90, 평균 ambiguity: 0.25
  │
  │    ③ OWASP 요소 조회 (JAILBREAK 카테고리):
  │       Likelihood = avg(5, 7, 6, 9) = 6.75
  │       Impact = avg(7, 9, 6, 8) = 7.5
  │       owaspRiskScore = (6.75 × 7.5) / 81 = 0.625
  │
  │    ④ 가중치 계산:
  │       injectionWeight = 0.625 × (0.5 + 0.5 × 0.90) = 0.594
  │       ambiguityWeight = 0.625 × (0.5 + 0.5 × 0.25) = 0.391
  │       patternWeight = 0.1 + 0.4 × 0.625 = 0.350
  │
  │    ⑤ 등급 결정:
  │       owaspRiskScore 0.625 → HIGH (55~75%)
  │
  ▼ [3] DB에 저장
  │
  │  Rule {
  │    pattern: "jailbreak.*mode",
  │    category: JAILBREAK,
  │    riskLevel: HIGH,
  │    injectionWeight: 0.594,
  │    ambiguityWeight: 0.391,
  │    patternWeight: 0.350,
  │    owaspRiskScore: 0.625,
  │    ...
  │  }
  │
  ▼ [4] 이후 사용자 프롬프트에 이 룰 자동 적용
```

### 4.3 파일 첨부 → 로컬 검사

```
사용자: ChatGPT에 employees.csv 첨부
  │
  ▼ [1] content.js MutationObserver
  │  file input change 이벤트 감지
  │
  ▼ [2] 파일 유형 확인
  │  .csv → 텍스트 파일 → 스캔 가능
  │
  ▼ [3] FileReader로 내용 읽기 (브라우저 내부)
  │
  ▼ [4] 줄 단위 PII 검사 (최대 500줄, 서버 전송 없음)
  │
  │  줄 1: "name,ssn,email" → PII 없음
  │  줄 2: "홍길동,901231-1234567,hong@test.com" → SSN 1건 + EMAIL 1건
  │  줄 3: "김철수,880101-2345678,kim@test.com" → SSN 1건 + EMAIL 1건
  │  ... (6명 = PII 12건)
  │
  ▼ [5] 판정
  │  PII 12건 ≥ 5건 → 차단
  │
  ▼ [6] 결과
  │  빨간 경고: "[FILE BLOCKED] employees.csv"
  │  "PII: 주민등록번호, 이메일 12건 감지"
  │  "(Scanned locally, nothing sent to server)"
  │  file input 초기화 (첨부 취소)
```

---

## 5. 모듈 의존성

### 5.1 NestJS 모듈 관계

```
AppModule (루트)
├── ConfigModule (전역 설정)
├── ThrottlerModule (60회/분 Rate Limit)
│
├── PrismaModule
│   └── PrismaService → SQLite (dev.db)
│
├── ScoringModule ─────────────────────── POST /api/v1/score
│   ├── ScoringService
│   │   ├── uses: PrismaService (룰 조회)
│   │   ├── uses: MlClientService (ML 점수)
│   │   └── uses: MaskingService (PII 마스킹)
│   └── ScoringController
│
├── FileScanModule ────────────────────── POST /api/v1/scan-file
│   ├── FileScanService
│   │   ├── uses: MaskingService (PII 검사)
│   │   └── uses: MlClientService (인젝션 검사)
│   └── FileScanController
│
├── AnalyzeModule ─────────────────────── POST /api/v1/analyze
│   ├── AnalyzeService
│   │   ├── uses: RuleEngine (@prompt-guard/rule-engine)
│   │   └── uses: AuditLogService
│   └── AnalyzeController
│
├── RulesModule ───────────────────────── /admin/rules (인증 필요)
│   ├── RulesService
│   │   ├── uses: PrismaService (DB CRUD)
│   │   └── uses: WeightCalculatorService (가중치 계산)
│   └── RulesController (AdminGuard 적용)
│
├── MlClientModule (공유)
│   └── MlClientService → HTTP → Python :8001
│
├── MaskingModule (공유)
│   └── MaskingService (PII 정규식 9가지)
│
├── WeightCalculatorModule
│   └── WeightCalculatorService
│       ├── uses: MlClientService
│       └── uses: owasp-factors.ts (카테고리별 상수)
│
├── AuditLogModule
│   └── AuditLogService (인메모리 로그)
│
├── AdminAuthModule ────────────────── POST /admin/auth/login (5회/분)
│   └── AdminAuthService
│
└── HealthModule ───────────────────── GET /health
```

### 5.2 Python 모듈 관계

```
FastAPI App (src/api/app.py)
│
├── lifespan: 서버 시작 시 PromptScorer.load_models()
│
├── routes.py
│   ├── POST /v1/score → scorer.score(prompt)
│   ├── POST /v1/batch-score → scorer.batch_score(prompts)
│   ├── POST /v1/score/detailed → scorer.score_detailed(prompt)
│   └── GET /v1/health
│
└── PromptScorer (src/inference/scorer.py)
    ├── InjectionKNNModel (src/models/injection/knn.py)
    │   ├── Pipeline: TfidfVectorizer → KNeighborsClassifier
    │   ├── fit(texts, labels) → 학습
    │   ├── predict_proba(texts) → 인젝션 확률 (0~1)
    │   ├── get_neighbors(text) → 가장 비슷한 15개
    │   └── save/load → joblib 파일
    │
    └── AmbiguityKNNModel (src/models/ambiguity/knn.py)
        └── (동일한 구조)
```

---

## 6. DB 스키마

```
┌─────────────────────────────────────────────────────────┐
│                        Rule 테이블                        │
├─────────────────┬───────────────┬────────────────────────┤
│ 컬럼             │ 타입           │ 설명                    │
├─────────────────┼───────────────┼────────────────────────┤
│ id              │ String (CUID) │ 기본키                   │
│ pattern         │ String        │ 정규식 탐지 패턴          │
│ riskLevel       │ Enum          │ NOTE/LOW/MEDIUM/HIGH/   │
│                 │               │ CRITICAL (자동 계산)     │
│ enabled         │ Boolean       │ 활성화 여부              │
│ version         │ String        │ 룰 버전                  │
│ category        │ Enum          │ OWASP 카테고리 (8종)     │
├─────────────────┼───────────────┼────────────────────────┤
│ injectionWeight │ Float         │ 인젝션 가중치 (자동 계산)  │
│ ambiguityWeight │ Float         │ 모호성 가중치 (자동 계산)  │
│ patternWeight   │ Float         │ 패턴 가중치 (자동 계산)   │
├─────────────────┼───────────────┼────────────────────────┤
│ likelihoodScore │ Float (0-9)   │ OWASP 발생 가능성        │
│ impactScore     │ Float (0-9)   │ OWASP 영향도             │
│ owaspRiskScore  │ Float (0-1)   │ OWASP 위험 점수 (정규화)  │
├─────────────────┼───────────────┼────────────────────────┤
│ mlInjectionScore│ Float         │ ML 인젝션 보정값          │
│ mlAmbiguityScore│ Float         │ ML 모호성 보정값          │
├─────────────────┼───────────────┼────────────────────────┤
│ createdAt       │ DateTime      │ 생성일시                  │
│ updatedAt       │ DateTime      │ 수정일시                  │
└─────────────────┴───────────────┴────────────────────────┘

인덱스: enabled, category
```

---

## 7. 보안 아키텍처 (7계층)

```
┌─────────────────────────────────────────────────────────┐
│ [1층] 클라이언트 PII 검사                                 │
│       content.js에서 정규식 9가지로 검사                    │
│       서버에 원본 전송 안 함                                │
├─────────────────────────────────────────────────────────┤
│ [2층] Rate Limiting                                      │
│       ThrottlerGuard: 전체 60회/분, 로그인 5회/분          │
├─────────────────────────────────────────────────────────┤
│ [3층] 입력 검증                                           │
│       ValidationPipe: MaxLength 2000자, Body 1MB 제한     │
├─────────────────────────────────────────────────────────┤
│ [4층] 관리자 인증                                         │
│       AdminGuard: x-admin-key 헤더 검증                   │
│       룰 CRUD 엔드포인트에만 적용                          │
├─────────────────────────────────────────────────────────┤
│ [5층] ML 인젝션 탐지                                      │
│       KNN: 25,000개 학습 데이터 기반 유사도 분석            │
│       TF-IDF 50,000차원 벡터, K=15 이웃                   │
├─────────────────────────────────────────────────────────┤
│ [6층] 패턴 매칭                                           │
│       DB 룰 32개 + OWASP 가중치 조합                      │
│       패턴 미매칭 시 ML 점수 20% 할인 (오탐 방지)          │
├─────────────────────────────────────────────────────────┤
│ [7층] OWASP 등급 판정                                     │
│       NOTE(0~15%) → LOW(15~35%) → MEDIUM(35~55%)        │
│       → HIGH(55~75%, 차단) → CRITICAL(75~100%, 차단+삭제) │
│       overallRisk = max(injection, ambiguity-1단계)       │
└─────────────────────────────────────────────────────────┘
```

---

## 8. OWASP 가중치 계산 설계

### 출처
> OWASP Risk Rating Methodology
> https://owasp.org/www-community/OWASP_Risk_Rating_Methodology

### 공식

```
Risk = Likelihood × Impact

Likelihood = avg(ease_of_exploit, awareness, opportunity, motive)    // 0~9
Impact     = avg(confidentiality, integrity, availability, accountability)  // 0~9
owaspRiskScore = (Likelihood × Impact) / 81    // 0~1 정규화

injectionWeight = owaspRiskScore × (0.5 + 0.5 × ML_injection_score)
ambiguityWeight = owaspRiskScore × (0.5 + 0.5 × ML_ambiguity_score)
patternWeight   = 0.1 + 0.4 × owaspRiskScore
```

### 카테고리별 OWASP 요소

| 카테고리 | Likelihood | Impact | Risk Score |
|---------|-----------|--------|------------|
| PROMPT_INJECTION | 7.75 | 7.25 | 0.693 |
| SYSTEM_PROMPT_EXTRACTION | 6.50 | 6.75 | 0.542 |
| JAILBREAK | 6.75 | 7.50 | 0.625 |
| DATA_EXFILTRATION | 6.00 | 7.50 | 0.556 |
| AMBIGUOUS_REQUEST | 5.75 | 3.25 | 0.231 |
| POLICY_BYPASS | 6.00 | 6.50 | 0.481 |
| SENSITIVE_DATA | 5.00 | 6.50 | 0.401 |
| CUSTOM | 5.00 | 5.00 | 0.309 |

### 사용자 프롬프트 판단 공식

```
매칭된 룰마다:
  injection_contribution = pattern_match(1) × patternWeight + ML_injection × injectionWeight
  ambiguity_contribution = pattern_match(1) × patternWeight × 0.5 + ML_ambiguity × ambiguityWeight

최종:
  injection_final = max(ML_injection, max(모든 룰의 injection_contribution))
  ambiguity_final = max(ML_ambiguity, max(모든 룰의 ambiguity_contribution))

패턴 매칭 없으면: ML 점수 × 0.8 (20% 할인, 오탐 방지)

overallRisk = max(injection등급, ambiguity등급 - 1단계)
```

---

## 9. ML 파이프라인 설계

### 학습 파이프라인

```
[데이터 수집]
  7개 데이터셋 → 25,000+ 샘플
  ├── 인젝션: tensor-trust(2,548) + pint(8) + leakage(1,335) + raccoon(418) + benign(120)
  └── 모호성: ambig-qa(12,038) + ask-cq(5,161) + clamber(3,202)
      ↓
[정규화]
  각 데이터셋의 다른 형식 → 통일: { text, label, source }
      ↓
[분할]
  stratify=True (라벨 비율 유지)
  train(80%) / val(10%) / test(10%) → Parquet 저장
      ↓
[TF-IDF 학습]
  train 텍스트에서 어휘 50,000개 구축
  1~3-gram, sublinear_tf=True
      ↓
[KNN 학습]
  train 벡터를 메모리에 저장 (이것이 "학습")
  K=15, cosine metric, distance-weighted
      ↓
[평가]
  test셋으로 accuracy, F1, AUC-ROC 측정
      ↓
[저장]
  pipeline.joblib (TF-IDF + KNN)
  train_data.joblib (원본 텍스트, 이웃 조회용)
```

### 추론 파이프라인

```
입력: "Ignore all previous instructions"
  ↓
[TF-IDF 벡터화] → 50,000차원 희소 벡터 (0.5ms)
  ↓
[KNN 이웃 탐색] → 25,000개 중 가장 비슷한 15개 찾기 (10ms)
  ↓
[거리 가중 투표] → 인젝션 13/15, 가중치 적용 → 94.2% (1ms)
  ↓
출력: { injection_score: 0.942, ambiguity_score: 0.675 }
```

---

## 10. Chrome 확장 설계

### 3단계 폴백 전략

```
[1차] 서버 API 호출 (정상 경로)
  POST http://localhost:3000/api/v1/score
  → ML + 패턴 매칭 + OWASP 가중치 전부 적용
  → injection %, ambiguity % 반환
  │
  └─ 실패 시 ↓

[2차] WASM 로컬 엔진 (서버 불가 시)
  release.wasm에 내장된 패턴 매칭
  → 패턴 기반 점수만 반환
  → ML 점수 없음
  │
  └─ 실패 시 ↓

[3차] 문자열 매칭 폴백 (WASM 불가 시)
  activeRules의 pattern을 단순 includes()로 비교
  → 가장 기본적인 탐지만 가능
```

### PII 마스킹 흐름 (Enter 키)

```
Enter 누름
  ↓
scanPII(text) → 주민번호 1건 감지
  ↓
입력창 텍스트를 마스킹 버전으로 교체
  "주민번호 901231-1234567" → "주민번호 ******-*******"
  ↓
마스킹된 텍스트로 서버 API 호출 (인젝션 검사)
  ↓
결과에 따라 차단 or 마스킹된 텍스트가 ChatGPT로 전송
```

---

## 11. CI/CD 파이프라인

```
Push / PR
  │
  ├─→ test-typescript (병렬)
  │   ├── npm install (root + rule-engine + api)
  │   ├── rule-engine unit test (4개)
  │   └── API E2E test (3개) + Prisma setup
  │
  ├─→ build-web (병렬)
  │   ├── npm install (web)
  │   └── vite build
  │
  ├─→ test-python (병렬)
  │   ├── pip install requirements.txt
  │   ├── download_data.py (7개 데이터셋)
  │   ├── preprocess.py (정규화 + 분할)
  │   ├── train.py -t all -m knn (학습)
  │   └── test_rule_engine.py (13개 프롬프트 테스트)
  │
  └─→ docker-build (위 3개 통과 후)
      ├── docker build -f Dockerfile.ml
      ├── docker build -f Dockerfile.api
      └── docker build -f Dockerfile.web
```

---

## 12. Docker 배포 구조

```yaml
services:
  ml:   python:3.12-slim  (:8001)  ← 가장 먼저 시작
  api:  node:20-slim      (:3000)  ← ml 헬스체크 통과 후 시작
  web:  nginx:alpine      (:5173)  ← api 시작 후 시작

ml → api: HTTP (내부 네트워크, http://ml:8001)
web → api: 브라우저에서 http://localhost:3000 호출
```

---

## 13. API 엔드포인트 전체 목록

### 공개 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/v1/score | 통합 스코어링 (ML + 패턴 + OWASP) |
| POST | /api/v1/analyze | 패턴 매칭 분석 |
| POST | /api/v1/scan-file | 파일 내용 검사 |
| GET | /admin/rules/active | 활성 룰 조회 (크롬 확장용) |
| GET | /health | 헬스체크 |

### 관리자 전용 (x-admin-key 필요)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /admin/rules | 전체 룰 조회 |
| GET | /admin/rules/:id | 단건 조회 |
| POST | /admin/rules | 룰 생성 (자동 가중치) |
| PATCH | /admin/rules/:id | 룰 수정 |
| DELETE | /admin/rules/:id | 룰 삭제 |
| POST | /admin/rules/:id/recalculate | 가중치 재계산 |
| POST | /admin/auth/login | 로그인 (5회/분) |

### Python ML API (:8001)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /v1/score | 단건 ML 추론 |
| POST | /v1/batch-score | 배치 추론 (최대 100건) |
| POST | /v1/score/detailed | 상세 (KNN 이웃 포함) |
| GET | /v1/health | 헬스체크 |

---

## 14. 기술 스택 요약

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | React 19, Vite, React Router 7, Axios |
| 백엔드 API | NestJS 10, Prisma ORM, SQLite, Swagger |
| ML 서버 | Python 3.10+, FastAPI, scikit-learn (TF-IDF + KNN) |
| ML 학습 | PyTorch, Transformers, 7개 공개 데이터셋 (25K 샘플) |
| 크롬 확장 | Manifest V3, WebAssembly (AssemblyScript) |
| PII 마스킹 | 클라이언트 정규식 (서버 전송 없음) |
| 보안 표준 | OWASP Risk Rating Methodology, OWASP LLM Top 10 2025 |
| CI/CD | GitHub Actions, Docker, Docker Compose |
| 테스트 | Jest, Supertest |
