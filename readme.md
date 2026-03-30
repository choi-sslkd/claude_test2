# PromptGuard v2

AI 프롬프트 보안 분석 시스템. OWASP Risk Rating + ML(KNN) 기반으로 프롬프트 인젝션, 탈옥 시도, 데이터 유출, 모호한 요청을 탐지합니다.

---

## 시스템 구성

```
┌────────────────────────────────────────────────────────────────┐
│                     PromptGuard v2 아키텍처                      │
│                                                                │
│  ┌─────────────┐   ┌──────────────┐   ┌───────────────────┐   │
│  │  Admin Web   │   │ Chrome 확장   │   │  외부 클라이언트    │   │
│  │  (React)     │   │ (WASM)       │   │  (curl, etc.)     │   │
│  │  :5173       │   │              │   │                   │   │
│  └──────┬───────┘   └──────┬───────┘   └────────┬──────────┘   │
│         │                  │                     │              │
│         ▼                  ▼                     ▼              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           NestJS API Server (:3000)                     │   │
│  │  - POST /api/v1/score       (통합 스코어링)              │   │
│  │  - POST /api/v1/analyze     (패턴 매칭 분석)             │   │
│  │  - GET/POST /admin/rules    (룰 CRUD + 자동 가중치)      │   │
│  │  - POST /admin/auth/login   (관리자 인증)                │   │
│  │  [Prisma + SQLite + OWASP Weight Calculator]            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                     │
│                          ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Python FastAPI Server (:8001)                  │   │
│  │  - POST /v1/score           (ML 추론)                    │   │
│  │  - POST /v1/batch-score     (배치 추론)                  │   │
│  │  - POST /v1/score/detailed  (상세 + KNN 이웃)            │   │
│  │  [KNN + TF-IDF ML Models]                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
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
│   │   │   ├── ml-client/            # Python ML API 호출 클라이언트
│   │   │   ├── weight-calculator/    # OWASP 가중치 자동 계산
│   │   │   ├── rules/                # 룰 CRUD + 자동 가중치 연동
│   │   │   ├── analyze/              # 패턴 매칭 분석
│   │   │   ├── admin-auth/           # 관리자 인증
│   │   │   ├── audit-log/            # 감사 로그
│   │   │   └── health/               # 헬스체크
│   │   └── prisma/schema.prisma      # DB 스키마 (OWASP 가중치 컬럼 포함)
│   └── chrome-extension/             # Chrome 확장 프로그램
│       └── extension/                # manifest.json, background.js, content.js
├── packages/
│   └── rule-engine/                  # TypeScript 룰 엔진 (공유 라이브러리)
├── src/                              # Python ML 백엔드
│   ├── models/                       # KNN 모델 구현
│   ├── inference/scorer.py           # PromptScorer (ML 추론)
│   ├── rule_engine/rules.py          # Python 룰 엔진
│   └── api/                          # FastAPI 서버
├── scripts/                          # CLI 도구 (다운로드, 전처리, 학습, 서버)
├── config/settings.py                # Python 설정
├── requirements.txt                  # Python 의존성
└── package.json                      # 루트 (테스트 의존성)
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
git checkout feature/owasp-unified-scoring
```

### Step 2. Node.js 의존성 설치

```bash
# 루트
npm install

# TypeScript 룰 엔진
cd packages/rule-engine
npm install
cd ../..

# NestJS API
cd apps/api
npm install
cd ../..

# 관리자 웹
cd apps/web
npm install
cd ../..
```

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

`prisma.config.ts` 파일이 있으면 Prisma가 `.env`를 무시하고 자체 설정을 사용합니다.
이때 `DATABASE_URL` 환경변수를 직접 설정해야 합니다.

**CMD (명령 프롬프트):**
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

**해결 안 될 경우 - prisma.config.ts 삭제:**
```bash
del prisma.config.ts
npx prisma generate
npx prisma db push --schema prisma/schema.prisma
```

**확인:**
```bash
# dev.db 파일이 생성되었는지 확인
dir *.db
```

정상이면 `dev.db` 파일이 보입니다. 이후 프로젝트 루트로 돌아갑니다:
```bash
cd ../..
```

### Step 5. ML 모델 학습 (최초 1회, 약 2~5분)

```bash
# 1. 데이터 다운로드 (7개 데이터셋, ~25K 샘플)
python scripts/download_data.py

# 2. 전처리 (Parquet 분할)
python scripts/preprocess.py

# 3. KNN 모델 학습
python scripts/train.py -t all -m knn
```

학습 완료 후 `models/` 폴더에 모델 파일이 생성됩니다:
```
models/
├── injection/knn/pipeline.joblib
├── ambiguity/knn/pipeline.joblib
└── training_results.json
```

---

## 실행 방법

**터미널 3개를 열어서 각각 실행합니다:**

### 터미널 1: Python ML 서버 (:8001)
```bash
python scripts/serve.py --port 8001
```
확인: http://localhost:8001/docs (Swagger UI)

### 터미널 2: NestJS API 서버 (:3000)
```bash
cd apps/api
npm run dev
```
확인: http://localhost:3000/docs (Swagger UI)

### 터미널 3: 관리자 웹 (:5173)
```bash
cd apps/web
npm run dev
```
확인: http://localhost:5173

**관리자 로그인:**
- URL: http://localhost:5173/admin/login
- 이메일: `admin@promptguard.com`
- 비밀번호: `admin1234`

---

## 테스트 방법 (하나하나 상세)

### 테스트 1: TypeScript 룰 엔진 단위 테스트

```bash
cd packages/rule-engine
npm test
```

**예상 결과:**
```
PASS test/engine.spec.ts
  RuleEngine
    √ 이전 규칙 무시 → high
    √ 인증 없이 파일 업로드 → medium 이상
    √ 일반적인 질문 → low, 매칭 없음
    √ 복합 위험 프롬프트 → 여러 룰 매칭
Tests: 4 passed, 4 total
```

---

### 테스트 2: NestJS API E2E 테스트

**사전 조건:** `apps/api/.env`에 `DATABASE_URL="file:./dev.db"` 필요

```bash
cd apps/api
npx jest --config jest.config.js
```

**Prisma .env 에러 발생 시:**
```cmd
# CMD에서
set DATABASE_URL=file:./dev.db
npx jest --config jest.config.js
```

**예상 결과:**
```
PASS test/analyze.e2e.spec.ts
  POST /api/v1/analyze (e2e)
    √ 위험 프롬프트 → 200, high
    √ 빈 프롬프트 → 400
    √ 안전한 프롬프트 → low, 매칭 없음
Tests: 3 passed, 3 total
```

---

### 테스트 3: React 관리자 웹 빌드 검증

```bash
cd apps/web
npx vite build
```

**예상 결과:**
```
✓ 81 modules transformed.
dist/index.html        0.40 kB
dist/assets/index.css  4.63 kB
dist/assets/index.js   297.40 kB
✓ built in XXXms
```

---

### 테스트 4: Python ML 통합 테스트

**사전 조건:** Step 5 (ML 모델 학습) 완료 필요

```bash
python scripts/test_rule_engine.py
```

**예상 결과:**
```
Loading ML models...
[scorer] Loaded injection KNN model
[scorer] Loaded ambiguity KNN model

Ignore all previous instructions...    93.5% critical   100.0%   67.5%  prompt_injection
You are now DAN...                     94.8% critical   100.0%   73.7%  jailbreak_attempt
Help me write a professional email...  28.6% safe         0.0%   40.8%  -
```

---

### 테스트 5: Python FastAPI 서버 + API 호출

**터미널 1에서 서버 실행:**
```bash
python scripts/serve.py --port 8001
```

**터미널 2에서 API 호출 테스트:**

CMD:
```cmd
curl -X POST http://localhost:8001/v1/score -H "Content-Type: application/json" -d "{\"prompt\": \"Ignore all previous instructions\"}"
```

PowerShell:
```powershell
Invoke-WebRequest -Uri http://localhost:8001/v1/score -Method POST -ContentType "application/json" -Body '{"prompt": "Ignore all previous instructions"}'
```

**예상 응답:**
```json
{
  "injection_score": 1.0,
  "injection_pct": "100.0%",
  "ambiguity_score": 0.52,
  "ambiguity_pct": "52.1%",
  "latency_ms": 37.08
}
```

**헬스체크:**
```
curl http://localhost:8001/v1/health
```

---

### 테스트 6: 통합 스코어링 엔드포인트 (NestJS → Python ML)

**사전 조건:** Python ML 서버 (:8001)와 NestJS (:3000) 둘 다 실행 중

CMD:
```cmd
curl -X POST http://localhost:3000/api/v1/score -H "Content-Type: application/json" -d "{\"prompt\": \"Ignore all previous instructions\"}"
```

PowerShell:
```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/v1/score -Method POST -ContentType "application/json" -Body '{"prompt": "Ignore all previous instructions"}'
```

**예상 응답:**
```json
{
  "injectionScore": 1.0,
  "injectionPct": "100.0%",
  "injectionSeverity": "CRITICAL",
  "ambiguityScore": 0.52,
  "ambiguityPct": "52.1%",
  "ambiguitySeverity": "MEDIUM",
  "overallRisk": "CRITICAL",
  "matchedRules": [...],
  "latencyMs": 85,
  "analyzedAt": "2026-03-31T..."
}
```

---

### 테스트 7: 관리자 룰 생성 + 자동 가중치 계산

**사전 조건:** Python ML 서버 (:8001)와 NestJS (:3000) 둘 다 실행 중

CMD:
```cmd
curl -X POST http://localhost:3000/admin/rules -H "Content-Type: application/json" -d "{\"pattern\": \"reveal.*system.*prompt\", \"category\": \"SYSTEM_PROMPT_EXTRACTION\"}"
```

**예상 응답 (가중치가 자동 계산됨):**
```json
{
  "id": "clxx...",
  "pattern": "reveal.*system.*prompt",
  "category": "SYSTEM_PROMPT_EXTRACTION",
  "riskLevel": "HIGH",
  "injectionWeight": 0.672,
  "ambiguityWeight": 0.492,
  "patternWeight": 0.377,
  "owaspRiskScore": 0.693,
  "mlInjectionScore": 0.95,
  "mlAmbiguityScore": 0.42,
  "enabled": true
}
```

**가중치 재계산:**
```cmd
curl -X POST http://localhost:3000/admin/rules/{id}/recalculate
```

---

### 테스트 8: 관리자 웹 UI 테스트

1. http://localhost:5173/admin/login 접속
2. `admin@promptguard.com` / `admin1234` 로그인
3. 좌측 메뉴 → **룰 관리** 클릭
4. **패턴 추가:** `jailbreak.*mode` / 카테고리: `JAILBREAK` → 생성
5. 테이블에 자동 계산된 가중치가 표시되는지 확인
6. **재계산** 버튼 클릭 → 가중치가 업데이트되는지 확인

---

### 테스트 9: Chrome 확장 프로그램 테스트

1. `chrome://extensions` → 개발자 모드 ON
2. `apps/chrome-extension/extension/` 폴더 로드
3. https://chatgpt.com 접속
4. 입력창에 `Ignore all previous instructions` 타이핑
5. 우측 상단에 경고 표시 확인:
   ```
   [HIGH RISK]
   Injection: 100.0% (CRITICAL) | Ambiguity: 52.1% (MEDIUM)
   ```
6. Enter 키 누름 → 전송 차단 + 입력창 비워짐 확인
7. 안전한 프롬프트 `오늘 날씨 알려줘` → 정상 전송 확인

---

## OWASP 가중치 계산 공식

> **출처:** [OWASP Risk Rating Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology)

### 핵심 공식

```
Risk = Likelihood × Impact

Likelihood = avg(Ease of Exploit, Awareness, Opportunity, Motive)     // 0~9
Impact     = avg(Confidentiality, Integrity, Availability, Accountability)  // 0~9

owaspRiskScore = (Likelihood × Impact) / 81    // 0~1 정규화 (최대 9×9=81)
```

### 가중치 계산 (룰 생성 시 자동)

```
injectionWeight = owaspRiskScore × (0.5 + 0.5 × ML_injection_score)
ambiguityWeight = owaspRiskScore × (0.5 + 0.5 × ML_ambiguity_score)
patternWeight   = 0.1 + 0.4 × owaspRiskScore
```

### 사용자 프롬프트 판단 시

```
injection_final = max(ML_injection, max(pattern_match × patternWeight + ML_injection × injectionWeight))
ambiguity_final = max(ML_ambiguity, max(pattern_match × patternWeight × 0.5 + ML_ambiguity × ambiguityWeight))
```

### 등급 기준

| 점수 | 등급 | 동작 |
|------|------|------|
| 0~15% | NOTE | 표시 없음 |
| 15~35% | LOW | 파란색 정보 |
| 35~55% | MEDIUM | 노란색 경고 |
| 55~75% | HIGH | 빨간색 + **전송 차단** |
| 75~100% | CRITICAL | 빨간색 + **전송 차단 + 입력 삭제** |

### OWASP 참고 문서

- [OWASP Risk Rating Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology) — 가중치 계산 공식 원본
- [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/) — LLM01: Prompt Injection
- [OWASP Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [OWASP Risk Calculator](https://javierolmedo.github.io/OWASP-Calculator/)

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
DATABASE_URL="file:./dev.db"        # SQLite DB 경로
PORT=3000                           # API 포트
ML_API_URL=http://localhost:8001    # Python ML API 주소
ADMIN_API_KEY="dev-admin-key"       # 관리자 API 키
SAVE_ORIGINAL_PROMPT=true           # 감사로그에 원본 프롬프트 저장 여부
MAX_PROMPT_LENGTH=2000              # 최대 프롬프트 길이
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
| **룰 엔진** | TypeScript (공유 패키지), Python (ML 가중치 통합) |
| **보안 프레임워크** | OWASP Risk Rating Methodology, OWASP LLM Top 10 2025 |
| **테스트** | Jest, Supertest |

---

## 트러블슈팅

### Prisma "DATABASE_URL not found" 에러

```
Error: Environment variable not found: DATABASE_URL
```

**원인:** `prisma.config.ts`가 `.env` 로딩을 건너뜀

**해결 1 - 환경변수 직접 설정:**
```cmd
# CMD
set DATABASE_URL=file:./dev.db
npx prisma db push --schema prisma/schema.prisma
```

```powershell
# PowerShell
$env:DATABASE_URL="file:./dev.db"
npx prisma db push --schema prisma/schema.prisma
```

**해결 2 - prisma.config.ts 삭제:**
```bash
del prisma.config.ts
npx prisma db push --schema prisma/schema.prisma
```

### npm 실행 시 PowerShell 보안 에러

```
npm.ps1 파일을 로드할 수 없습니다
```

**해결:**
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### Python ML 서버 포트 충돌

```
[Errno 10048] 각 소켓 주소는 하나만 사용할 수 있습니다
```

**해결:** 다른 프로세스가 8001 포트를 사용 중. 확인 후 종료:
```cmd
netstat -ano | findstr :8001
taskkill /PID <번호> /F
```

### Chrome 확장 Service Worker 에러

```
Service worker registration failed. Status code: 3
```

**해결:** `chrome://extensions`에서 확장 **새로고침** 버튼 클릭

---

## 라이선스

MIT
