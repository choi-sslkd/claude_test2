// extension/background.js

// --- Inlined from build/release.js (import not allowed in service worker) ---
async function instantiateWasm(module, imports = {}) {
  const adaptedImports = {
    env: Object.assign(Object.create(globalThis), imports.env || {}, {
      abort(message, fileName, lineNumber, columnNumber) {
        message = __liftString(message >>> 0);
        fileName = __liftString(fileName >>> 0);
        lineNumber = lineNumber >>> 0;
        columnNumber = columnNumber >>> 0;
        throw Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`);
      },
    }),
  };
  const { exports } = await WebAssembly.instantiate(module, adaptedImports);
  const memory = exports.memory || imports.env.memory;
  const adaptedExports = Object.setPrototypeOf({
    analyzePrompt(prompt) {
      prompt = __lowerString(prompt) || __notnull();
      return exports.analyzePrompt(prompt);
    },
  }, exports);
  function __liftString(pointer) {
    if (!pointer) return null;
    const end = pointer + new Uint32Array(memory.buffer)[pointer - 4 >>> 2] >>> 1;
    const memoryU16 = new Uint16Array(memory.buffer);
    let start = pointer >>> 1, string = "";
    while (end - start > 1024) string += String.fromCharCode(...memoryU16.subarray(start, start += 1024));
    return string + String.fromCharCode(...memoryU16.subarray(start, end));
  }
  function __lowerString(value) {
    if (value == null) return 0;
    const length = value.length;
    const pointer = exports.__new(length << 1, 2) >>> 0;
    const memoryU16 = new Uint16Array(memory.buffer);
    for (let i = 0; i < length; ++i) memoryU16[(pointer >>> 1) + i] = value.charCodeAt(i);
    return pointer;
  }
  function __notnull() { throw TypeError("value must not be null"); }
  return adaptedExports;
}
// --- End inlined WASM loader ---

let wasmModule = null;
let analyzePrompt = null;

const RULES_API_URL = 'http://localhost:3000/admin/rules/active';
const SCORE_API_URL = 'http://localhost:3000/api/v1/score';
const FILE_SCAN_API_URL = 'http://localhost:3000/api/v1/scan-file';
const RULES_REFRESH_MS = 60 * 1000;

let activeRules = [];
let rulesVersion = '0.0.0';
let lastFetchedAt = 0;

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim();
}

function sanitizeRulesForWasm(rules) {
  if (!Array.isArray(rules)) return [];

  return rules
    .filter((rule) => rule && typeof rule.pattern === 'string' && rule.pattern.trim())
    .map((rule, index) => ({
      id: typeof rule.id === 'string' && rule.id.trim() ? rule.id : `rule_${index + 1}`,
      category:
        typeof rule.category === 'string' && rule.category.trim()
          ? rule.category
          : 'CUSTOM',
      weight: normalizeRuleWeight(rule),
      pattern: rule.pattern.trim(),
    }));
}

function normalizeRuleWeight(rule) {
  if (typeof rule.weight === 'number' && Number.isFinite(rule.weight)) {
    return Math.max(1, Math.floor(rule.weight));
  }

  const riskLevel = String(rule.riskLevel || '').toUpperCase();

  if (riskLevel === 'CRITICAL') return 10;
  if (riskLevel === 'HIGH') return 5;
  if (riskLevel === 'MEDIUM') return 3;
  return 1;
}

function buildDynamicRulesJson(rules) {
  const sanitizedRules = sanitizeRulesForWasm(rules);
  return JSON.stringify(sanitizedRules);
}

function buildFallbackAnalysis(text) {
  const normalizedText = normalizeText(text);

  const matches = sanitizeRulesForWasm(activeRules).filter((rule) => {
    const normalizedPattern = normalizeText(rule.pattern);
    if (!normalizedPattern) return false;
    return normalizedText.includes(normalizedPattern);
  });

  let score = 0;
  for (const rule of matches) {
    score += normalizeRuleWeight(rule);
  }

  let riskLevel = 'low';
  if (score >= 10) {
    riskLevel = 'critical';
  } else if (score >= 5) {
    riskLevel = 'high';
  } else if (score >= 3) {
    riskLevel = 'medium';
  }

  const blocked = riskLevel === 'high' || riskLevel === 'critical';

  return {
    score,
    riskLevel,
    blocked,
    matches,
    message:
      matches.length > 0
        ? `감지된 패턴: ${matches.map((m) => `"${m.pattern}"`).join(', ')}`
        : '위험 패턴이 감지되지 않았습니다.',
    source: 'fallback-rules',
  };
}

function parseWasmResult(rawResult) {
  if (typeof rawResult !== 'string' || !rawResult.trim()) {
    throw new Error('Wasm 분석 결과가 비어 있습니다.');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawResult);
  } catch (error) {
    throw new Error(`Wasm 분석 결과 JSON 파싱 실패: ${error.message}`);
  }

  const score = Number.isFinite(parsed.score) ? parsed.score : 0;
  const riskLevel =
    typeof parsed.riskLevel === 'string' ? parsed.riskLevel.toLowerCase() : 'low';
  const blocked = Boolean(parsed.blocked);

  return {
    score,
    riskLevel,
    blocked,
  };
}

function buildMatchedRules(text) {
  const normalizedText = normalizeText(text);

  return sanitizeRulesForWasm(activeRules).filter((rule) => {
    const normalizedPattern = normalizeText(rule.pattern);
    if (!normalizedPattern) return false;
    return normalizedText.includes(normalizedPattern);
  });
}

function buildResponseMessage(result, matches) {
  if (matches.length > 0) {
    return `감지된 패턴: ${matches.map((m) => `"${m.pattern}"`).join(', ')}`;
  }

  if (result.blocked) {
    return '보안 정책 위반 가능성이 높은 프롬프트입니다.';
  }

  if (result.riskLevel === 'medium') {
    return '의심스러운 패턴이 감지되었습니다.';
  }

  return '위험 패턴이 감지되지 않았습니다.';
}

async function fetchAsArrayBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  return response.arrayBuffer();
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms)),
  ]);
}

let wasmRetryCount = 0;
const WASM_MAX_RETRIES = 3;

async function loadWasmEngine() {
  try {
    const wasmUrl = chrome.runtime.getURL('build/release.wasm');

    // 5초 타임아웃으로 WASM 로딩
    const buffer = await withTimeout(fetchAsArrayBuffer(wasmUrl), 5000);

    // WASM 바이너리 크기 검증 (비정상적으로 크면 차단)
    if (buffer.byteLength > 1024 * 1024) {
      throw new Error(`WASM 파일이 너무 큼: ${buffer.byteLength} bytes`);
    }
    if (buffer.byteLength < 100) {
      throw new Error(`WASM 파일이 너무 작음: ${buffer.byteLength} bytes`);
    }

    // 5초 타임아웃으로 컴파일 + 인스턴스화
    const compiledModule = await withTimeout(WebAssembly.compile(buffer), 5000);

    wasmModule = await withTimeout(
      instantiateWasm(compiledModule, {
        env: { abort: () => console.error('Wasm aborted') },
      }),
      5000,
    );

    analyzePrompt =
      wasmModule.analyzePrompt ||
      wasmModule.exports?.analyzePrompt ||
      null;

    if (typeof analyzePrompt !== 'function') {
      throw new Error('analyzePrompt export를 찾을 수 없습니다.');
    }

    wasmRetryCount = 0;
    console.log('✅ [Wasm Engine] 로드 완료');
  } catch (error) {
    analyzePrompt = null;
    wasmRetryCount++;
    console.error(`❌ [Wasm Engine] 로드 실패 (${wasmRetryCount}/${WASM_MAX_RETRIES}):`, error.message);

    // 재시도 (최대 3회, 2초 간격)
    if (wasmRetryCount < WASM_MAX_RETRIES) {
      console.log(`[Wasm Engine] ${2}초 후 재시도...`);
      setTimeout(loadWasmEngine, 2000);
    } else {
      console.error('[Wasm Engine] 최대 재시도 초과. 패턴 매칭 폴백으로 운영.');
    }
  }
}

async function fetchActiveRules() {
  try {
    const response = await fetch(RULES_API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`룰 조회 실패: ${response.status}`);
    }

    const data = await response.json();

    activeRules = Array.isArray(data.rules) ? data.rules : [];
    rulesVersion = data.version || '0.0.0';
    lastFetchedAt = Date.now();

    console.log(`✅ [Rules] 활성 룰 ${activeRules.length}개 로드 완료 (version: ${rulesVersion})`);
  } catch (error) {
    console.error('❌ [Rules] 활성 룰 로드 실패:', error);
  }
}

async function ensureRulesLoaded() {
  const now = Date.now();
  const expired = now - lastFetchedAt > RULES_REFRESH_MS;

  if (activeRules.length === 0 || expired) {
    await fetchActiveRules();
  }
}

async function ensureWasmLoaded() {
  if (typeof analyzePrompt !== 'function') {
    await loadWasmEngine();
  }
}

function analyzePromptWithWasm(text) {
  if (typeof analyzePrompt !== 'function') {
    throw new Error('Wasm analyzePrompt 함수가 준비되지 않았습니다.');
  }

  const dynamicRulesJson = buildDynamicRulesJson(activeRules);
  const rawResult = analyzePrompt(text, dynamicRulesJson);
  const wasmResult = parseWasmResult(rawResult);
  const matches = buildMatchedRules(text);

  return {
    ...wasmResult,
    matches,
    message: buildResponseMessage(wasmResult, matches),
    source: 'wasm-engine',
  };
}

chrome.runtime.onInstalled.addListener(async () => {
  await loadWasmEngine();
  await fetchActiveRules();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadWasmEngine();
  await fetchActiveRules();
});

setInterval(() => {
  fetchActiveRules();
}, RULES_REFRESH_MS);

// Server API scoring (primary path)
// File scan via server API
async function scanFileViaServer(fileName, content) {
  const response = await fetch(FILE_SCAN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, content }),
  });

  if (!response.ok) throw new Error(`File scan failed: ${response.status}`);
  return response.json();
}

async function scoreViaServer(text) {
  const response = await fetch(SCORE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: text }),
  });

  if (!response.ok) throw new Error(`Server scoring failed: ${response.status}`);
  return response.json();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // ─── 타이핑 중: WASM 로컬 패턴 매칭 (서버 호출 없음) ───
  if (request.type === 'ANALYZE_WASM') {
    (async () => {
      try {
        const text = typeof request.text === 'string' ? request.text : '';
        await ensureWasmLoaded();
        await ensureRulesLoaded();

        let result;
        try {
          const wasmResult = analyzePromptWithWasm(text);
          result = {
            status: 'success',
            source: 'wasm-local',
            score: wasmResult.score,
            riskLevel: wasmResult.riskLevel,
            blocked: wasmResult.blocked,
            matches: wasmResult.matches,
            message: wasmResult.message,
          };
        } catch {
          const fallback = buildFallbackAnalysis(text);
          result = {
            status: 'success',
            source: 'pattern-local',
            score: fallback.score,
            riskLevel: fallback.riskLevel,
            blocked: fallback.blocked,
            matches: fallback.matches,
            message: fallback.message,
          };
        }

        sendResponse(result);
      } catch (error) {
        sendResponse({ status: 'error', message: error?.message || String(error) });
      }
    })();
    return true;
  }

  // ─── Enter 시: 서버 API (ML + 패턴 + OWASP) → 실패 시 WASM 폴백 ───
  if (request.type === 'ANALYZE_SERVER') {
    (async () => {
      try {
        const text = typeof request.text === 'string' ? request.text : '';

        let result;
        try {
          const serverResult = await scoreViaServer(text);
          const blocked = serverResult.overallRisk === 'HIGH' || serverResult.overallRisk === 'CRITICAL';

          result = {
            status: 'success',
            source: 'server-api',
            injectionScore: serverResult.injectionScore,
            injectionPct: serverResult.injectionPct,
            injectionSeverity: serverResult.injectionSeverity,
            ambiguityScore: serverResult.ambiguityScore,
            ambiguityPct: serverResult.ambiguityPct,
            ambiguitySeverity: serverResult.ambiguitySeverity,
            overallRisk: serverResult.overallRisk,
            blocked,
            matches: serverResult.matchedRules || [],
            masking: serverResult.masking || { hasPII: false, maskedCount: 0, summary: '' },
            mlStatus: serverResult.mlStatus || { available: true, degraded: false, message: '' },
            message: `Injection: ${serverResult.injectionPct} | Ambiguity: ${serverResult.ambiguityPct}`,
          };
        } catch (serverError) {
          // 서버 실패 → WASM 폴백
          console.warn('[Prompt Guard] Server unavailable, WASM fallback:', serverError.message);
          await ensureWasmLoaded();
          await ensureRulesLoaded();

          try {
            const wasmResult = analyzePromptWithWasm(text);
            result = {
              status: 'success',
              source: 'wasm-fallback',
              injectionPct: 'N/A',
              ambiguityPct: 'N/A',
              injectionSeverity: wasmResult.riskLevel,
              ambiguitySeverity: 'note',
              overallRisk: wasmResult.riskLevel,
              blocked: wasmResult.blocked,
              matches: wasmResult.matches,
              mlStatus: { available: false, degraded: true, message: 'ML 서버 장애. WASM 패턴 매칭으로 판정.' },
              message: wasmResult.message,
            };
          } catch {
            const fallback = buildFallbackAnalysis(text);
            result = {
              status: 'success',
              source: 'pattern-fallback',
              injectionPct: 'N/A',
              ambiguityPct: 'N/A',
              injectionSeverity: fallback.riskLevel,
              ambiguitySeverity: 'note',
              overallRisk: fallback.riskLevel,
              blocked: fallback.blocked,
              matches: fallback.matches,
              mlStatus: { available: false, degraded: true, message: 'ML 서버 + WASM 장애. 패턴 매칭만 동작.' },
              message: fallback.message,
            };
          }
        }

        sendResponse(result);
      } catch (error) {
        sendResponse({ status: 'error', message: error?.message || String(error) });
      }
    })();
    return true;
  }

  return true;
});