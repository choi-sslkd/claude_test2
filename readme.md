# PromptGuard v2

OWASP Risk Rating + ML(KNN) 기반 AI 프롬프트 보안 분석 시스템.
프롬프트 인젝션, 탈옥 시도, 데이터 유출을 탐지하고, 개인정보(PII)를 브라우저에서 마스킹합니다.

---

## 핵심 특징

- **WASM + ML 병렬 분석**: 타이핑 시 WASM 즉시 패턴 매칭, Enter 시 WASM + 서버 ML 병렬 실행
- **구조적 프라이버시**: PII 검사는 브라우저에서만 수행, 서버에 원본 전송 없음
- **파일 첨부 검사**: 드래그앤드롭/붙여넣기 가로채서 PII + WASM 인젝션 로컬 검사
- **OWASP 기반 가중치**: Risk Rating Methodology 공식으로 룰 가중치 자동 계산
- **관리자 대시보드**: 룰 CRUD + 자동 가중치 + OWASP 카테고리 + 감사 로그
- **7계층 보안**: PII → Rate Limit → 입력검증 → 인증 → ML → 패턴매칭 → OWASP등급

---

## 시스템 구성

```
┌──────────────────────────────────────────────────────────────┐
│                    PromptGuard v2 아키텍처                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │  Admin Web    │  │ Chrome 확장   │  │ 외부 클라이언트   │    │
│  │  (React)      │  │ WASM + PII   │  │ (curl, etc.)    │    │
│  │  :5173        │  │ 로컬 검사     │  │                 │    │
│  └──────┬────────┘  └──────┬───────┘  └───────┬─────────┘    │
│         │                  │                   │              │
│         ▼                  ▼                   ▼              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │          NestJS API Server (:3000)                     │  │
│  │  [Helmet + Rate Limit + AdminGuard + Validation]       │  │
│  │  - POST /api/v1/score     (통합 스코어링)               │  │
│  │  - POST /api/v1/scan-file (파일 스캔)                  │  │
│  │  - /admin/rules           (룰 CRUD, x-admin-key 필요)  │  │
│  │  [Prisma + SQLite + OWASP Weight Calculator]           │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           │ x-ml-key 인증                     │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │          Python FastAPI Server (:8001)                  │  │
│  │  [x-ml-key 인증 + 5000자 제한]                          │  │
│  │  - POST /v1/score       (ML 추론)                       │  │
│  │  - POST /v1/batch-score (배치 추론)                     │  │
│  │  [KNN + TF-IDF, 25000개 학습 데이터]                    │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 포트

| 포트 | 서비스 | 설명 |
|------|--------|------|
| **3000** | NestJS API | 백엔드 (스코어링, 룰 관리, 인증) |
| **5173** | React Web | 관리자 대시보드 |
| **8001** | Python FastAPI | ML 추론 (KNN) |

---

## 사전 요구사항

| 도구 | 버전 | 확인 |
|------|------|------|
| Node.js | >= 18 | `node --version` |
| Python | >= 3.10 | `python --version` |
| npm | >= 9 | `npm --version` |

> **Windows PowerShell** 에러 시: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
> 또는 CMD 사용

---

## 설치 (Step by Step)

### Step 1. 저장소 클론

```bash
git clone https://github.com/choi-sslkd/claude_test2.git
cd claude_test2
git checkout develop_v15
```

### Step 2. Node.js 의존성 설치

```bash
npm install
cd packages/rule-engine && npm install && cd ../..
cd apps/api && npm install && cd ../..
cd apps/web && npm install && cd ../..
cd apps/chrome-extension && npm install && cd ../..
```

### Step 3. WASM 빌드 (AssemblyScript)

```bash
cd apps/chrome-extension
npm run build
cd ../..
```

`assembly/` 소스를 컴파일 → `extension/build/release.wasm` 생성.
WASM은 타이핑 중 브라우저에서 즉시 패턴 매칭에 사용됩니다.

### Step 4. Python 의존성 설치

```bash
pip install -r requirements.txt
```

### Step 5. 데이터베이스 설정

```cmd
cd apps\api
set DATABASE_URL=file:./dev.db
npx prisma generate --schema prisma/schema.prisma
npx prisma db push --schema prisma/schema.prisma
npx ts-node src/prisma/seed.ts
cd ..\..
```

> **Prisma .env 에러 시:** `prisma.config.ts`가 `.env`를 무시합니다. `set DATABASE_URL=file:./dev.db`를 먼저 실행하세요.

### Step 6. ML 모델 학습 (최초 1회, 약 5분)

```bash
python scripts/setup_ml.py
```

이 한 줄이 데이터 다운로드 → 전처리 → KNN 학습을 전부 실행합니다.

---

## 실행 방법

**터미널 3개:**

```bash
# 터미널 1: Python ML 서버
python scripts/serve.py --port 8001

# 터미널 2: NestJS API
cd apps/api
set DATABASE_URL=file:./dev.db
npm run dev

# 터미널 3: 관리자 웹
cd apps/web
npm run dev
```

**관리자 로그인:** http://localhost:5173/admin/login
- 이메일: `admin@promptguard.com`
- 비밀번호: `admin1234`

**크롬 확장 설치:**
1. `chrome://extensions` → 개발자 모드 ON
2. `apps/chrome-extension/extension/` 폴더 로드
3. ChatGPT 접속 → 자동 동작

---

## 동작 흐름

### 프롬프트 입력

```
타이핑 중:
  WASM이 즉시 패턴 매칭 (0ms, 서버 호출 없음) → 경고 표시

Enter 누름:
  ├─ WASM 즉시 실행 → 1차 결과
  └─ 서버 ML 병렬 실행 → 최종 결과
  둘 중 하나가 차단이면 즉시 차단 (먼저 끝나는 쪽)

PII 감지 시:
  브라우저에서 마스킹 → 마스킹된 텍스트가 ChatGPT로 전송
  원본 개인정보는 서버/ChatGPT에 절대 전송 안 됨
```

### 파일 첨부

```
파일 드래그앤드롭/붙여넣기/선택
  ↓ event.preventDefault()로 ChatGPT 차단
  ↓ 브라우저에서 로컬 검사:
    PII: 정규식 9가지 (1건이라도 있으면 차단)
    인젝션: WASM 패턴 매칭 (줄 단위)
  ↓ 서버 전송 없음
```

### 관리자 룰 추가

```
패턴 + 카테고리 입력 → 테스트 프롬프트 5개 자동 생성
→ ML 점수 획득 → OWASP 공식으로 가중치 계산 → DB 저장
```

---

## OWASP 가중치 공식

> **출처:** [OWASP Risk Rating Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology)

```
Risk = Likelihood × Impact                    ← OWASP 원본
owaspRiskScore = (Likelihood × Impact) / 81   ← 0~1 정규화

injectionWeight = owaspRiskScore × (0.5 + 0.5 × ML_injection_score)
ambiguityWeight = owaspRiskScore × (0.5 + 0.5 × ML_ambiguity_score)
patternWeight   = 0.1 + 0.4 × owaspRiskScore
```

### 등급

| 점수 | 등급 | 동작 |
|------|------|------|
| 0~15% | NOTE | 표시 없음 |
| 15~35% | LOW | 파란색 정보 |
| 35~55% | MEDIUM | 노란색 경고 |
| 55~75% | HIGH | 빨간색 + 전송 차단 |
| 75~100% | CRITICAL | 빨간색 + 전송 차단 + 입력 삭제 |

---

## PII 마스킹 (9가지, 브라우저에서만)

| 타입 | 예시 | 마스킹 |
|------|------|--------|
| 주민등록번호 | `901231-1234567` | `******-*******` |
| 카드번호 | `1234-5678-9012-3456` | `****-****-****-3456` |
| 전화번호 | `010-1234-5678` | `010-****-****` |
| 이메일 | `user@gmail.com` | `u***@gmail.com` |
| IP주소 | `192.168.1.100` | `192.***.***.*0` |
| API 키 | `sk-abc123456789` | `sk-****************` |
| AWS 키 | `AKIAIOSFODNN7EXAMPLE` | `AKIA****************` |
| 비밀번호 | `password=mypass123` | `password=********` |
| 계좌번호 | `110-123-456789` | `***-******-****` |

---

## 보안 (7계층)

| 계층 | 구성요소 | 설명 |
|------|---------|------|
| 1 | 클라이언트 PII | content.js 정규식 9가지, 서버 전송 없음 |
| 2 | Rate Limiting | 60회/분 전체, 5회/분 로그인 |
| 3 | 입력 검증 | 2000자(NestJS), 5000자(ML), 1MB body |
| 4 | 인증 | x-admin-key(NestJS), x-ml-key(Python) |
| 5 | ML 탐지 | KNN 25,000개 학습 데이터 |
| 6 | 패턴 매칭 | DB 65개 룰 + OWASP 가중치 (ReDoS 방어) |
| 7 | 등급 판정 | NOTE → LOW → MEDIUM → HIGH(차단) → CRITICAL |

---

## 테스트

```bash
# TypeScript 룰 엔진 (4개)
cd packages/rule-engine && npm test

# NestJS API E2E (3개)
cd apps/api && set DATABASE_URL=file:./dev.db && npx jest --config jest.config.js

# React 웹 빌드
cd apps/web && npx vite build

# Python ML 통합 테스트
python scripts/test_rule_engine.py
```

### Chrome 확장 테스트

1. `chrome://extensions` → `apps/chrome-extension/extension/` 로드
2. ChatGPT에서 `Ignore all previous instructions` 입력 → 차단
3. `오늘 날씨 알려줘` → 통과
4. `내 주민번호는 901231-1234567이야` → PII 마스킹 후 전송
5. PII 포함 파일 첨부 → 차단

---

## Docker 배포

```bash
# ML 모델 준비 (최초 1회)
python scripts/setup_ml.py

# Docker 실행
docker-compose up --build

# 확인
curl http://localhost:8001/v1/health
curl http://localhost:3000/health
# 브라우저: http://localhost:5173

# 종료
docker-compose down
```

---

## 환경 변수

### apps/api/.env

```env
DATABASE_URL="file:./dev.db"
PORT=3000
ML_API_URL=http://localhost:8001
ML_API_KEY=ml-internal-key
ADMIN_API_KEY=dev-admin-key
NODE_ENV=development
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 관리자 웹 | React 19, Vite, React Router 7 |
| API 서버 | NestJS 10, Prisma, SQLite, Helmet |
| ML 추론 | Python 3.10+, FastAPI, scikit-learn (TF-IDF + KNN) |
| 크롬 확장 | Manifest V3, WebAssembly (AssemblyScript) |
| PII 마스킹 | 클라이언트 정규식 (서버 전송 없음) |
| 보안 | OWASP Risk Rating, LLM Top 10 2025 |
| CI/CD | GitHub Actions, Docker Compose |

---

## 트러블슈팅

| 문제 | 해결 |
|------|------|
| Prisma "DATABASE_URL not found" | `set DATABASE_URL=file:./dev.db` 후 실행 |
| PowerShell npm 에러 | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| 포트 충돌 | `netstat -ano \| findstr :8001` → `taskkill /PID <번호> /F` |
| Chrome 확장 에러 | `chrome://extensions` → 새로고침 버튼 |
| WASM 빌드 에러 | `cd apps/chrome-extension && npm install && npm run build` |

---

## 참고 문서

- [OWASP Risk Rating Methodology](https://owasp.org/www-community/OWASP_Risk_Rating_Methodology)
- [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/)
- [OWASP Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [Embedding-based classifiers for prompt injection (arxiv 2024)](https://arxiv.org/abs/2410.22284)
- [KNN + TF-IDF Text Categorization (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S1877705814003750)

---

## 라이선스

MIT
