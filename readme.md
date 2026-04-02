# PromptGuard v2

AI 프롬프트 보안 분석 시스템. OWASP Risk Rating + ML(KNN) 기반으로 프롬프트 인젝션, 탈옥 시도, 데이터 유출, 모호한 요청을 탐지하고, 개인정보(PII)를 클라이언트에서 마스킹합니다.

---

## 핵심 특징

- **프롬프트 인젝션 탐지**: ML(KNN) + 패턴 매칭 + OWASP 가중치 조합
- **개인정보 보호**: PII 검사는 **브라우저에서만** 수행 (서버 전송 없음)
- **파일 첨부 검사**: ChatGPT 파일 첨부 시 자동으로 PII 스캔 (로컬)
- **OWASP 기반**: Risk Rating Methodology 공식으로 가중치 자동 계산
- **관리자 대시보드**: 룰 CRUD + 자동 가중치 + 감사 로그

---

## 프라이버시 아키텍처

```
┌─ 브라우저 (content.js) ──────────────────────────────────────┐
│                                                              │
│  사용자 입력: "내 주민번호는 901231-1234567이야"               │
│                     │                                        │
│                     ▼                                        │
│  [1] PII 검사 (브라우저 내부, 정규식)                          │
│      → 주민등록번호 1건 감지                                   │
│      → 마스킹: "내 주민번호는 ******-*******이야"              │
│                     │                                        │
│                     ▼                                        │
│  [2] 마스킹된 텍스트만 서버로 전송                             │
│      "내 주민번호는 ******-*******이야"                        │
│                                                              │
│  원본 개인정보는 브라우저 밖으로 절대 나가지 않음               │
└──────────────┬───────────────────────────────────────────────┘
               │ 마스킹된 텍스트만 전송
               ▼
┌─ NestJS API (:3000) → Python ML (:8001) ─────────────────────┐
│  마스킹된 텍스트로 인젝션 ML 검사                              │
│  → injection: 0.0%, ambiguity: 35%                           │
│  → overallRisk: LOW → 통과                                   │
└──────────────────────────────────────────────────────────────┘
```

### 클라이언트에서 감지하는 PII (9가지)

| 타입 | 예시 | 마스킹 결과 |
|------|------|-----------|
| 주민등록번호 | `901231-1234567` | `******-*******` |
| 여권번호 | `M12345678` | `M********` |
| 카드번호 | `1234-5678-9012-3456` | `****-****-****-3456` |
| 전화번호 | `010-1234-5678` | `010-****-****` |
| 이메일 | `user@gmail.com` | `u***@gmail.com` |
| IP주소 | `192.168.1.100` | `192.***.***.*0` |
| API 키 | `sk-abc123456789` | `sk-****************` |
| AWS 키 | `AKIAIOSFODNN7EXAMPLE` | `AKIA****************` |
| 비밀번호 | `password=mypass123` | `password=********` |

---

## 시스템 구성

```
┌──────────────────────────────────────────────────────────────┐
│                    PromptGuard v2 아키텍처                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │  Admin Web    │  │ Chrome 확장   │  │ 외부 클라이언트   │    │
│  │  (React)      │  │ PII: 로컬검사 │  │ (curl, etc.)    │    │
│  │  :5173        │  │ Inj: 서버API │  │                 │    │
│  └──────┬────────┘  └──────┬───────┘  └───────┬─────────┘    │
│         │                  │                   │              │
│         ▼                  ▼                   ▼              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │          NestJS API Server (:3000)                     │  │
│  │  - POST /api/v1/score        (통합 스코어링)            │  │
│  │  - POST /api/v1/scan-file    (파일 스캔)               │  │
│  │  - POST /api/v1/analyze      (패턴 매칭 분석)           │  │
│  │  - GET/POST /admin/rules     (룰 CRUD + 자동 가중치)    │  │
│  │  - POST /admin/auth/login    (관리자 인증)              │  │
│  │  [Prisma + SQLite + OWASP Weight Calculator]           │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           │                                   │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │          Python FastAPI Server (:8001)                  │  │
│  │  - POST /v1/score          (ML 추론)                    │  │
│  │  - POST /v1/batch-score    (배치 추론)                  │  │
│  │  - POST /v1/score/detailed (상세 + KNN 이웃)            │  │
│  │  [KNN + TF-IDF ML Models]                              │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 포트 정리

| 포트 | 서비스 | 설명 |
|------|--------|------|
| **3000** | NestJS API | 백엔드 (룰 CRUD, 통합 스코어링, 인증) |
| **5173** | Vite (React) | 관리자 웹 UI |
| **8001** | Python FastAPI | ML 추론 (KNN 인젝션/모호성 점수) |

---

## 폴더 구조

```
promptguard-v2/
├── apps/
│   ├── web/                          # 관리자 웹 대시보드 (React + Vite)
│   │   └── src/pages/                # 로그인, 대시보드, 룰관리, 로그, 설정
│   ├── api/                          # NestJS 백엔드 API
│   │   ├── src/modules/
│   │   │   ├── scoring/              # POST /api/v1/score (통합 스코어링)
│   │   │   ├── file-scan/            # POST /api/v1/scan-file (파일 스캔)
│   │   │   ├── masking/              # PII 마스킹 서비스
│   │   │   ├── ml-client/            # Python ML API 호출 클라이언트
│   │   │   ├── weight-calculator/    # OWASP 가중치 자동 계산
│   │   │   ├── rules/                # 룰 CRUD + 자동 가중치 연동
│   │   │   ├── analyze/              # 패턴 매칭 분석
│   │   │   ├── admin-auth/           # 관리자 인증
│   │   │   ├── audit-log/            # 감사 로그
│   │   │   └── health/               # 헬스체크
│   │   └── prisma/schema.prisma      # DB 스키마 (OWASP 가중치 컬럼 포함)
│   └── chrome-extension/             # Chrome 확장 프로그램
│       └── extension/
│           ├── content.js            # PII 로컬 검사 + 파일 스캔 + 프롬프트 분석
│           ├── background.js         # 서버 API 호출 + WASM 폴백
│           └── manifest.json
├── packages/
│   └── rule-engine/                  # TypeScript 룰 엔진 (공유 라이브러리)
├── src/                              # Python ML 백엔드
│   ├── models/                       # KNN 모델 구현
│   ├── inference/scorer.py           # PromptScorer (ML 추론)
│   ├── rule_engine/rules.py          # Python 룰 엔진
│   └── api/                          # FastAPI 서버
├── scripts/                          # CLI 도구
├── config/settings.py                # Python 설정
├── requirements.txt                  # Python 의존성
└── package.json
```

---

## 사전 요구사항

| 도구 | 버전 | 확인 명령어 |
|------|------|-----------|
| **Node.js** | >= 18 | `node --version` |
| **npm** | >= 9 | `npm --version` |
| **Python** | >= 3.10 | `python --version` |
| **pip** | 최신 | `pip --version` |

> **Windows PowerShell 사용자:** npm 실행 시 스크립트 정책 에러가 발생하면:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
> ```
> 또는 **CMD (명령 프롬프트)**를 사용하세요.

---

## 설치 (Step by Step)

### Step 1. 저장소 클론

```bash
git clone https://github.com/choi-sslkd/claude_test2.git
cd claude_test2
git checkout develop_v14
```

### Step 2. Node.js 의존성 설치

```bash
npm install
cd packages/rule-engine && npm install && cd ../..
cd apps/api && npm install && cd ../..
cd apps/web && npm install && cd ../..
cd apps/chrome-extension && npm install && cd ../..
```

### Step 2.5. WASM 빌드 (AssemblyScript)

```bash
cd apps/chrome-extension
npm run build
cd ../..
```

이 명령은 `assembly/` 폴더의 AssemblyScript 소스를 컴파일해서 `extension/build/release.wasm`을 생성합니다.

**빌드 결과:**
```
apps/chrome-extension/extension/build/
├── release.wasm    ← WASM 바이너리 (패턴 매칭 엔진)
├── release.js      ← JS 바인딩 (WASM 호출용)
└── release.d.ts    ← TypeScript 타입 정의
```

**WASM 소스 구조:**
```
apps/chrome-extension/assembly/
├── index.ts              ← 진입점 (analyzePrompt 함수 export)
├── rule-engine.ts        ← WASM 룰 엔진 (패턴 매칭 + 점수 계산)
├── text.normalizer.ts    ← 텍스트 정규화
├── risk.scorer.ts        ← 위험도 계산
├── tsconfig.json         ← AssemblyScript 설정
└── rules/
    ├── base.rule.ts      ← 기본 룰 클래스
    ├── prompt-injection.rule.ts
    └── puzzle-attack.rule.ts
```

> **참고:** WASM은 타이핑 중 로컬 패턴 매칭에 사용됩니다. 서버 없이 브라우저에서 즉시 동작합니다.

### Step 3. Python 의존성 설치

```bash
pip install -r requirements.txt
```

### Step 4. 데이터베이스 설정 (Prisma + SQLite)

```bash
cd apps/api
```

**.env 파일 생성:**
```bash
echo DATABASE_URL="file:./dev.db" > .env
```

**Prisma 클라이언트 생성 + DB 초기화:**
```bash
npx prisma generate
npx prisma db push --schema prisma/schema.prisma
```

#### Prisma .env 인식 못하는 문제 해결

`prisma.config.ts` 파일이 있으면 Prisma가 `.env`를 무시합니다.

**CMD:**
```cmd
set DATABASE_URL=file:./dev.db
npx prisma generate
npx prisma db push --schema prisma/schema.prisma
```

**PowerShell:**
```powershell
$env:DATABASE_URL="file:./dev.db"
npx prisma generate
npx prisma db push --schema prisma/schema.prisma
```

**그래도 안 되면:**
```bash
del prisma.config.ts
npx prisma generate
npx prisma db push --schema prisma/schema.prisma
```

```bash
cd ../..
```

### Step 5. ML 모델 학습 (최초 1회, 약 2~5분)

```bash
python scripts/download_data.py
python scripts/preprocess.py
python scripts/train.py -t all -m knn
```

---

## 실행 방법

**터미널 3개:**

```bash
# 터미널 1: Python ML 서버
python scripts/serve.py --port 8001

# 터미널 2: NestJS API
cd apps/api && npm run dev

# 터미널 3: 관리자 웹
cd apps/web && npm run dev
```

**관리자 로그인:** http://localhost:5173/admin/login
- 이메일: `admin@promptguard.com`
- 비밀번호: `admin1234`

---

## 데이터 흐름 상세

### 프롬프트 입력 시

```
1. 사용자가 ChatGPT에 타이핑
2. content.js가 keyup 이벤트 감지 (400ms 디바운스)
3. [브라우저] PII 정규식 검사 → 개인정보 감지 시 마스킹
4. [서버전송] 마스킹된 텍스트만 → NestJS → Python ML
5. [서버응답] injection %, ambiguity %, overallRisk
6. [브라우저] PII 결과 + 서버 결과 합쳐서 알림 표시
7. Enter 시: HIGH/CRITICAL → 차단, 그 외 → 통과
```

### 파일 첨부 시

```
1. 사용자가 ChatGPT에 파일 첨부
2. content.js가 file input change 이벤트 감지
3. [브라우저] FileReader로 텍스트 읽기
4. [브라우저] 줄 단위 PII 검사 (최대 500줄)
5. PII 5건 이상 → 첨부 차단 + file input 초기화
6. PII 1~4건 → 경고만 표시
7. PII 0건 → "No PII detected" 3초 표시 후 사라짐
8. 서버에 파일 내용 전송 없음 (전부 로컬)
```

### 관리자 룰 추가 시

```
1. 관리자가 패턴 + 카테고리 입력
2. NestJS가 테스트 프롬프트 5개 자동 생성
3. Python ML에 5개 보내서 injection/ambiguity 점수 획득
4. OWASP 공식으로 가중치 자동 계산
5. DB에 룰 + 가중치 저장
6. 이후 사용자 프롬프트 분석 시 이 가중치 적용
```

---

## OWASP 가중치 계산 공식

> **출처:** [OWASP Risk Rating Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology)

```
Risk = Likelihood × Impact

Likelihood = avg(Ease of Exploit, Awareness, Opportunity, Motive)     // 0~9
Impact     = avg(Confidentiality, Integrity, Availability, Accountability)  // 0~9

owaspRiskScore = (Likelihood × Impact) / 81    // 0~1 정규화

injectionWeight = owaspRiskScore × (0.5 + 0.5 × ML_injection_score)
ambiguityWeight = owaspRiskScore × (0.5 + 0.5 × ML_ambiguity_score)
patternWeight   = 0.1 + 0.4 × owaspRiskScore
```

### 사용자 프롬프트 판단 공식

```
injection_final = max(ML_injection, max(pattern × patternWeight + ML_injection × injectionWeight))
ambiguity_final = max(ML_ambiguity, max(pattern × patternWeight × 0.5 + ML_ambiguity × ambiguityWeight))

overallRisk = max(injection등급, ambiguity등급 - 1단계)
              ↑ 모호성만으로는 차단 안 됨. 인젝션이 주 판단 기준.
```

### 등급 기준

| 점수 | 등급 | 동작 |
|------|------|------|
| 0~15% | NOTE | 표시 없음 |
| 15~35% | LOW | 파란색 정보 |
| 35~55% | MEDIUM | 노란색 경고 |
| 55~75% | HIGH | 빨간색 + **전송 차단** |
| 75~100% | CRITICAL | 빨간색 + **전송 차단 + 입력 삭제** |

### 참고 문서

- [OWASP Risk Rating Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology)
- [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/)
- [OWASP Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)

---

## 테스트 방법

### 테스트 1: TypeScript 룰 엔진

```bash
cd packages/rule-engine && npm test
```
예상: **4 passed**

### 테스트 2: NestJS API E2E

```bash
cd apps/api && npx jest --config jest.config.js
```
Prisma 에러 시: `set DATABASE_URL=file:./dev.db` 먼저 실행

예상: **3 passed**

### 테스트 3: React 웹 빌드

```bash
cd apps/web && npx vite build
```
예상: **built in XXXms**

### 테스트 4: Python ML 통합 테스트

```bash
python scripts/test_rule_engine.py
```
예상: 13개 프롬프트 분석 결과 출력

### 테스트 5: Python ML API

```cmd
python scripts/serve.py --port 8001

:: 다른 터미널에서
curl -X POST http://localhost:8001/v1/score -H "Content-Type: application/json" -d "{\"prompt\": \"Ignore all previous instructions\"}"
```

### 테스트 6: 통합 스코어링 (NestJS + ML)

두 서버 실행 후:
```cmd
curl -X POST http://localhost:3000/api/v1/score -H "Content-Type: application/json" -d "{\"prompt\": \"Ignore all previous instructions\"}"
```

### 테스트 7: 룰 생성 + 자동 가중치

```cmd
curl -X POST http://localhost:3000/admin/rules -H "Content-Type: application/json" -d "{\"pattern\": \"reveal.*system.*prompt\", \"category\": \"SYSTEM_PROMPT_EXTRACTION\"}"
```
응답에 `injectionWeight`, `ambiguityWeight`, `owaspRiskScore` 확인

### 테스트 8: 관리자 웹 UI

http://localhost:5173/admin/login → 룰 관리 → 패턴 추가 → 가중치 자동 계산 확인

### 테스트 9: Chrome 확장 - 프롬프트 검사

1. `chrome://extensions` → `apps/chrome-extension/extension/` 로드
2. https://chatgpt.com 접속
3. `Ignore all previous instructions` → 빨간 경고 + 차단
4. `오늘 날씨 알려줘` → 통과

### 테스트 10: Chrome 확장 - PII 검사 (로컬)

1. ChatGPT에 `내 주민번호는 901231-1234567이야` 입력
2. 노란 경고: `PII: 주민등록번호 1건 감지 (client-side, not sent to server)`
3. 서비스 워커 Console에서 서버로 보낸 텍스트 확인 → `******-*******`만 전송됨

### 테스트 11: Chrome 확장 - 파일 첨부 검사 (로컬)

1. ChatGPT에서 파일 첨부 버튼 클릭
2. PII가 포함된 `.csv` 또는 `.txt` 파일 선택
3. PII 5건 이상 → `[FILE BLOCKED]` 빨간 경고 + 첨부 취소
4. PII 1~4건 → `[FILE WARNING]` 노란 경고
5. PII 0건 → `[FILE OK]` 파란 표시 3초 후 사라짐
6. 서버에 파일 내용 전송 없음 (alert에 "Scanned locally" 표시)

---

## ML 모델 정보

| 모델 | Task | 정확도 | F1 | AUC-ROC | 응답시간 |
|------|------|--------|-----|---------|---------|
| **Injection KNN** | 인젝션 탐지 | 93.5% | 0.950 | 0.999 | ~12ms |
| **Ambiguity KNN** | 모호성 감지 | 81.9% | 0.861 | 0.921 | ~12ms |

---

## 환경 변수

### apps/api/.env

```env
DATABASE_URL="file:./dev.db"
PORT=3000
ML_API_URL=http://localhost:8001
ADMIN_API_KEY="dev-admin-key"
SAVE_ORIGINAL_PROMPT=true
MAX_PROMPT_LENGTH=2000
```

---

## Docker 실행 (배포용)

### 사전 요구사항

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 필요
- Docker Desktop 실행 중인지 확인: `docker --version`

### Step 1. ML 모델 준비

Docker 컨테이너에서 학습된 모델이 필요합니다. 로컬에서 먼저 학습하세요:

```bash
python scripts/download_data.py
python scripts/preprocess.py
python scripts/train.py -t all -m knn
```

`models/` 폴더가 생성됩니다. Docker가 이 폴더를 볼륨 마운트합니다.

### Step 2. Docker Compose 실행

```bash
docker-compose up --build
```

3개 컨테이너가 뜹니다:

| 컨테이너 | 포트 | 헬스체크 |
|----------|------|---------|
| `ml` (Python FastAPI) | :8001 | http://localhost:8001/v1/health |
| `api` (NestJS) | :3000 | http://localhost:3000/v1/health |
| `web` (React/nginx) | :5173 | http://localhost:5173 |

### Step 3. 동작 확인

```cmd
:: ML 서버 헬스
curl http://localhost:8001/v1/health

:: API 서버 헬스
curl http://localhost:3000/v1/health

:: 통합 스코어링 테스트
curl -X POST http://localhost:3000/api/v1/score -H "Content-Type: application/json" -d "{\"prompt\": \"Ignore all previous instructions\"}"

:: 관리자 웹
:: 브라우저에서 http://localhost:5173 접속
```

### Step 4. 종료

```bash
docker-compose down
```

### 개별 컨테이너 빌드/실행

```bash
# ML 서버만
docker build -f Dockerfile.ml -t promptguard-ml .
docker run -p 8001:8001 -v ./models:/app/models promptguard-ml

# API 서버만
docker build -f Dockerfile.api -t promptguard-api .
docker run -p 3000:3000 -e DATABASE_URL=file:./dev.db -e ML_API_URL=http://host.docker.internal:8001 promptguard-api

# 웹만
docker build -f Dockerfile.web -t promptguard-web .
docker run -p 5173:80 promptguard-web
```

---

## CI/CD (GitHub Actions)

### 파이프라인 구조

```
Push/PR
  │
  ├─→ test-typescript (병렬)
  │   ├─ rule-engine unit test (4개)
  │   └─ API E2E test (3개)
  │
  ├─→ build-web (병렬)
  │   └─ Vite build 검증
  │
  ├─→ test-python (병렬)
  │   ├─ 데이터 다운로드 + 전처리
  │   ├─ KNN 모델 학습
  │   └─ ML 통합 테스트
  │
  └─→ docker-build (위 3개 통과 후)
      ├─ Dockerfile.ml build
      ├─ Dockerfile.api build
      └─ Dockerfile.web build
```

### 트리거 조건

| 이벤트 | 브랜치 |
|--------|--------|
| Push | `master`, `develop_v*`, `feature/*` |
| Pull Request | `master` |

### GitHub에서 CI 결과 확인

1. GitHub 레포 → **Actions** 탭
2. 최신 워크플로우 실행 클릭
3. 4개 Job이 보임:
   - `test-typescript` → rule-engine 4/4 + API E2E 3/3
   - `build-web` → Vite build 성공
   - `test-python` → ML 통합 테스트 통과
   - `docker-build` → Docker 이미지 빌드 성공

실패 시 해당 Job 클릭 → 로그에서 에러 확인

### 로컬에서 CI와 동일하게 테스트

```bash
# 1. TypeScript 테스트
cd packages/rule-engine && npm test
cd apps/api && npx jest --config jest.config.js

# 2. 웹 빌드
cd apps/web && npx vite build

# 3. Python ML 테스트
python scripts/test_rule_engine.py

# 4. Docker 빌드 테스트
docker build -f Dockerfile.ml -t promptguard-ml .
docker build -f Dockerfile.api -t promptguard-api .
docker build -f Dockerfile.web -t promptguard-web .
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **관리자 웹** | React 19, Vite, React Router 7, Axios |
| **API 서버** | NestJS 10, Prisma ORM, SQLite, Swagger |
| **ML 추론** | Python 3.10+, FastAPI, scikit-learn, TF-IDF + KNN |
| **ML 학습** | PyTorch, Transformers, 7개 공개 데이터셋 |
| **크롬 확장** | Manifest V3, WebAssembly (AssemblyScript) |
| **PII 마스킹** | 클라이언트 정규식 (서버 전송 없음) |
| **보안 프레임워크** | OWASP Risk Rating, OWASP LLM Top 10 2025 |
| **CI/CD** | GitHub Actions, Docker, Docker Compose |
| **테스트** | Jest, Supertest |

---

## 트러블슈팅

### Prisma "DATABASE_URL not found"

`prisma.config.ts`가 `.env`를 건너뜀. 환경변수 직접 설정:
```cmd
set DATABASE_URL=file:./dev.db
npx prisma db push --schema prisma/schema.prisma
```

### PowerShell npm 보안 에러

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 포트 충돌

```cmd
netstat -ano | findstr :8001
taskkill /PID <번호> /F
```

### Chrome 확장 Service Worker 에러

`chrome://extensions` → 확장 새로고침 버튼 클릭

---

## 라이선스

MIT.
