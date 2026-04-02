// extension/content.js
// PII 검사: 브라우저에서 직접 수행 (서버 전송 없음)
// 인젝션 검사: 마스킹된 텍스트만 서버로 전송

// ─── Alert UI (1개 박스에 WASM + ML 통합 표시) ─────────────────

const alertBox = document.createElement('div');
alertBox.style.cssText = `
  position: fixed; top: 20px; right: 20px;
  padding: 15px 25px; color: white; font-weight: bold;
  border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  z-index: 2147483647; display: none; pointer-events: none;
  max-width: 520px; line-height: 1.7; white-space: pre-wrap; font-size: 13px;
`;
document.body.appendChild(alertBox);

// WASM + ML 결과를 저장해두고 합쳐서 표시
let currentWasm = '';
let currentMl = '';

function getHighestType(wasmType, mlType) {
  const order = { danger: 3, warning: 2, info: 1 };
  return (order[wasmType] || 0) >= (order[mlType] || 0) ? wasmType : mlType;
}

function updateCombinedAlert() {
  if (!currentWasm && !currentMl) { alertBox.style.display = 'none'; return; }

  let combined = '';
  let highestType = 'info';

  if (currentWasm) {
    combined += `━ WASM 패턴 매칭 ━\n${currentWasm.text}`;
    highestType = currentWasm.type || 'info';
  }

  if (currentMl) {
    if (combined) combined += '\n\n';
    combined += `━ ML 서버 분석 ━\n${currentMl.text}`;
    highestType = getHighestType(highestType, currentMl.type || 'info');
  }

  alertBox.innerText = combined;
  if (highestType === 'danger') alertBox.style.backgroundColor = '#ff4d4f';
  else if (highestType === 'warning') alertBox.style.backgroundColor = '#faad14';
  else alertBox.style.backgroundColor = '#1677ff';
  alertBox.style.display = 'block';
}

function showWasmResult(message, type = 'info') {
  currentWasm = { text: message, type };
  updateCombinedAlert();
}

function showMlResult(message, type = 'info') {
  currentMl = { text: message, type };
  updateCombinedAlert();
}

function showAlert(message, type = 'danger') {
  currentWasm = '';
  currentMl = '';
  alertBox.innerText = message;
  if (type === 'danger') alertBox.style.backgroundColor = '#ff4d4f';
  else if (type === 'warning') alertBox.style.backgroundColor = '#faad14';
  else alertBox.style.backgroundColor = '#1677ff';
  alertBox.style.display = 'block';
}

function hideAlert() {
  alertBox.style.display = 'none';
  currentWasm = '';
  currentMl = '';
}

function hideWasm() { currentWasm = ''; updateCombinedAlert(); }
function hideMl() { currentMl = ''; updateCombinedAlert(); }

// ─── Client-Side PII Detection (서버 전송 없음) ─────────────

const PII_PATTERNS = [
  { type: 'KR_SSN', label: '주민등록번호',
    regex: /(\d{6})\s*[-–]\s*(\d{6,8})/g,
    mask: () => '******-*******' },
  { type: 'CREDIT_CARD', label: '카드번호',
    regex: /(\d{4})\s*[-–]?\s*(\d{4})\s*[-–]?\s*(\d{4})\s*[-–]?\s*(\d{4})/g,
    mask: (m) => '****-****-****-' + m.slice(-4) },
  { type: 'PHONE_KR', label: '전화번호',
    regex: /(01[016789])\s*[-–.]?\s*(\d{3,4})\s*[-–.]?\s*(\d{4})/g,
    mask: (m) => m.slice(0, 3) + '-****-****' },
  { type: 'EMAIL', label: '이메일',
    regex: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    mask: (m) => m[0] + '***@' + m.split('@')[1] },
  { type: 'IP_ADDRESS', label: 'IP주소',
    regex: /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g,
    mask: (m) => m.split('.')[0] + '.***.***.' + m.split('.')[3] },
  { type: 'API_KEY', label: 'API키',
    regex: /\b(sk[-_]|pk[-_]|api[-_]|key[-_]|token[-_]|secret[-_])([a-zA-Z0-9_-]{8,})\b/gi,
    mask: (m) => m.slice(0, m.indexOf('-') + 1 || 3) + '****************' },
  { type: 'AWS_KEY', label: 'AWS키',
    regex: /\b(AKIA[A-Z0-9]{16})\b/g,
    mask: () => 'AKIA****************' },
  { type: 'PASSWORD', label: '비밀번호',
    regex: /((?:password|passwd|pwd|비밀번호|패스워드)\s*[=:]\s*)(\S+)/gi,
    mask: (m) => m.replace(/(\S*[=:]\s*)(\S+)/, '$1********') },
  { type: 'BANK_ACCOUNT', label: '계좌번호',
    regex: /\b(\d{3,4})\s*[-–]\s*(\d{2,6})\s*[-–]\s*(\d{4,6})\b/g,
    mask: () => '***-******-****' },
];

function scanPII(text) {
  const matches = [];
  let maskedText = text;

  for (const p of PII_PATTERNS) {
    p.regex.lastIndex = 0;
    let m;
    while ((m = p.regex.exec(text)) !== null) {
      matches.push({ type: p.type, label: p.label, original: m[0], index: m.index });
    }
  }

  // 뒤에서부터 마스킹 (인덱스 보존)
  const sorted = [...matches].sort((a, b) => b.index - a.index);
  for (const m of sorted) {
    const pattern = PII_PATTERNS.find((p) => p.type === m.type);
    const masked = pattern ? pattern.mask(m.original) : '****';
    maskedText = maskedText.slice(0, m.index) + masked + maskedText.slice(m.index + m.original.length);
    m.masked = masked;
  }

  const types = [...new Set(matches.map((m) => m.label))];
  return {
    hasPII: matches.length > 0,
    count: matches.length,
    types,
    matches,
    maskedText,
    summary: matches.length > 0 ? `${types.join(', ')} ${matches.length}건 감지` : '',
  };
}

// ─── Messaging ──────────────────────────────────────────────

function safeSendMessage(msg, callback) {
  try {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[PG] background error:', chrome.runtime.lastError.message);
        return;
      }
      callback(response);
    });
  } catch (error) {
    if (error?.message?.includes('Extension context invalidated')) {
      showAlert('Extension updated. Please refresh (F5).', 'warning');
    }
  }
}

// ─── Prompt Analysis (PII local + injection server) ─────────

function findPromptBox() {
  return document.querySelector('#prompt-textarea');
}

function getPromptText(target) {
  if (!target) return '';
  return target.value ?? target.textContent ?? '';
}

function clearPromptBox(box) {
  if (!box) return;
  if ('value' in box) { box.value = ''; box.dispatchEvent(new Event('input', { bubbles: true })); return; }
  box.innerHTML = '<p><br></p>'; box.dispatchEvent(new Event('input', { bubbles: true }));
}

function replacePromptText(box, newText) {
  if (!box) return;
  if ('value' in box) {
    box.value = newText;
    box.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    // contenteditable (ChatGPT uses this)
    box.innerHTML = `<p>${newText}</p>`;
    box.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// ─── 타이핑 중: WASM 로컬 분석 (서버 호출 없음) ───
function analyzeWithWasm(text, callback) {
  const pii = scanPII(text);

  safeSendMessage({ type: 'ANALYZE_WASM', text }, (response) => {
    if (!response || response.status !== 'success') {
      // WASM도 안 되면 PII만
      if (pii.hasPII) {
        callback({ blocked: false, alertType: 'warning', text: `[PII]\n${pii.summary}` });
      } else {
        callback(null);
      }
      return;
    }

    const risk = (response.riskLevel || 'low').toLowerCase();
    const blocked = response.blocked;
    const matches = response.matches || [];
    const matchText = matches.length > 0
      ? matches.map((m) => `"${m.pattern || m.id}"`).join(', ') : '';
    const piiLine = pii.hasPII ? `\nPII: ${pii.summary} (client-side)` : '';

    if (blocked || risk === 'critical' || risk === 'high') {
      callback({
        blocked: true,
        alertType: 'danger',
        text: `[WASM: ${risk.toUpperCase()}]\nPattern score: ${response.score}${matchText ? '\nMatched: ' + matchText : ''}${piiLine}`,
      });
    } else if (risk === 'medium' || matches.length > 0) {
      callback({
        blocked: false,
        alertType: 'warning',
        text: `[WASM: ${risk.toUpperCase()}]\nPattern score: ${response.score}${matchText ? '\nMatched: ' + matchText : ''}${piiLine}`,
      });
    } else if (pii.hasPII) {
      callback({ blocked: false, alertType: 'warning', text: `[PII]\n${pii.summary} (client-side)` });
    } else {
      callback(null);
    }
  });
}

// ─── Enter 시: 서버 API (ML + 패턴 + OWASP) ───
function analyzeWithServer(text, callback) {
  const pii = scanPII(text);
  const textForServer = pii.hasPII ? pii.maskedText : text;

  safeSendMessage({ type: 'ANALYZE_SERVER', text: textForServer }, (response) => {
    if (!response || response.status !== 'success') {
      // 서버 실패 → PII만
      if (pii.hasPII) {
        callback({ blocked: pii.count >= 5, alertType: pii.count >= 5 ? 'danger' : 'warning', text: `[PII]\n${pii.summary}` });
      } else {
        callback(null);
      }
      return;
    }

    const r = normalizeServerResponse(response);
    r.pii = pii;

    const alert = buildAlert(r, true);
    callback(alert ? { blocked: r.blocked, ...alert } : null);
  });
}

function normalizeServerResponse(response) {
  const mlStatus = response.mlStatus || { available: true, degraded: false, message: '' };
  return {
    overallRisk: (response.overallRisk || 'note').toLowerCase(),
    blocked: Boolean(response.blocked),
    injPct: response.injectionPct || 'N/A',
    ambPct: response.ambiguityPct || 'N/A',
    injSev: (response.injectionSeverity || 'note').toUpperCase(),
    ambSev: (response.ambiguitySeverity || 'note').toUpperCase(),
    matches: response.matches || [],
    pii: { hasPII: false, count: 0, summary: '' },
    mlStatus,
  };
}

function buildAlert(r, isSubmit) {
  const matchText = r.matches.length > 0
    ? r.matches.map((m) => `"${m.pattern || m.id}"`).join(', ') : '';
  const piiLine = r.pii?.hasPII ? `\nPII: ${r.pii.summary} (client-side, not sent to server)` : '';
  const mlLine = (r.mlStatus && !r.mlStatus.available)
    ? `\n⚠ ${r.mlStatus.message || 'ML 서버 장애. 패턴 매칭만 동작 중.'}`
    : '';

  if (r.blocked || r.overallRisk === 'critical') {
    let t = `[BLOCKED / ${r.overallRisk.toUpperCase()}]\n`;
    t += `Injection: ${r.injPct} (${r.injSev}) | Ambiguity: ${r.ambPct} (${r.ambSev})`;
    if (matchText) t += `\nMatched: ${matchText}`;
    t += piiLine + mlLine;
    return { alertType: 'danger', text: t };
  }
  if (r.overallRisk === 'high') {
    let t = `[HIGH RISK]\nInjection: ${r.injPct} (${r.injSev}) | Ambiguity: ${r.ambPct} (${r.ambSev})`;
    if (matchText) t += `\nMatched: ${matchText}`;
    t += piiLine + mlLine;
    return { alertType: isSubmit ? 'danger' : 'warning', text: t };
  }
  if (r.overallRisk === 'medium') {
    let t = `[MEDIUM]\nInjection: ${r.injPct} (${r.injSev}) | Ambiguity: ${r.ambPct} (${r.ambSev})`;
    t += piiLine + mlLine;
    return { alertType: 'warning', text: t };
  }
  if (r.overallRisk === 'low') {
    let t = `[LOW]\nInjection: ${r.injPct} | Ambiguity: ${r.ambPct}`;
    t += piiLine + mlLine;
    return { alertType: 'info', text: t };
  }
  // note level
  if (mlLine) {
    return { alertType: 'warning', text: `[DEGRADED MODE]${mlLine}` };
  }
  if (r.pii?.hasPII) {
    return { alertType: 'warning', text: `[PII DETECTED]\n${r.pii.summary}\n(client-side, not sent to server)` };
  }
  return null;
}

// ─── File Attachment Scan (PII + WASM 인젝션, 전부 로컬) ─────

const SCANNABLE_EXTENSIONS = [
  '.txt', '.csv', '.tsv', '.json', '.jsonl', '.md', '.html',
  '.xml', '.yaml', '.yml', '.log', '.env', '.py', '.js', '.ts',
];

function isScannableFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return SCANNABLE_EXTENSIONS.includes(ext) || file.type.startsWith('text/');
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsText(file);
  });
}

function scanFileLocally(fileName, content, wasmCallback) {
  const lines = content.split('\n').slice(0, 500);
  const allPII = [];
  const injectionLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // PII 검사
    const pii = scanPII(line);
    if (pii.hasPII) {
      for (const m of pii.matches) {
        allPII.push({ ...m, line: i + 1 });
      }
    }
  }

  // WASM으로 인젝션 검사 (줄 단위, 10자 이상만)
  const textLines = lines
    .map((t, i) => ({ text: t.trim(), line: i + 1 }))
    .filter((l) => l.text.length > 10);

  let wasmChecked = 0;
  let wasmDone = false;

  if (textLines.length === 0) {
    finalize();
    return;
  }

  // 각 줄을 WASM으로 검사 (비동기)
  for (const tl of textLines.slice(0, 30)) {
    safeSendMessage({ type: 'ANALYZE_WASM', text: tl.text }, (response) => {
      wasmChecked++;
      if (response && response.status === 'success') {
        const risk = (response.riskLevel || 'low').toLowerCase();
        if (risk === 'high' || risk === 'critical' || response.blocked) {
          injectionLines.push({ line: tl.line, text: tl.text.slice(0, 60), risk });
        }
      }
      if (wasmChecked >= Math.min(textLines.length, 30) && !wasmDone) {
        wasmDone = true;
        finalize();
      }
    });
  }

  // 1초 타임아웃 (WASM 응답 느릴 때)
  setTimeout(() => {
    if (!wasmDone) {
      wasmDone = true;
      finalize();
    }
  }, 1000);

  function finalize() {
    const piiTypes = [...new Set(allPII.map((m) => m.label))];
    // PII 1건 이상이면 차단
    const piiBlocked = allPII.length >= 1;
    const injBlocked = injectionLines.length > 0;
    const blocked = piiBlocked || injBlocked;

    const parts = [];
    if (allPII.length > 0) parts.push(`PII: ${piiTypes.join(', ')} ${allPII.length}건`);
    if (injectionLines.length > 0) parts.push(`Injection: ${injectionLines.length}줄 의심`);

    wasmCallback({
      fileName,
      blocked,
      piiCount: allPII.length,
      injCount: injectionLines.length,
      summary: parts.length > 0 ? parts.join(', ') : 'No threats',
      injectionLines: injectionLines.slice(0, 5),
    });
  }
}

function interceptFileInputs() {
  // 1. 표준 <input type="file"> 감지
  const fileInputObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        const inputs = node.tagName === 'INPUT'
          ? [node]
          : [...(node.querySelectorAll?.('input[type="file"]') || [])];
        for (const input of inputs) {
          if (input.type === 'file' && !input.dataset.pgIntercepted) {
            input.dataset.pgIntercepted = 'true';
            input.addEventListener('change', handleFileAttach, true);
          }
        }
      }
    }
  });
  fileInputObserver.observe(document.body, { childList: true, subtree: true });

  // 기존 file input도 감지
  document.querySelectorAll('input[type="file"]').forEach((input) => {
    if (!input.dataset.pgIntercepted) {
      input.dataset.pgIntercepted = 'true';
      input.addEventListener('change', handleFileAttach, true);
    }
  });

  // 2. ChatGPT 드래그앤드롭 감지
  document.body.addEventListener('drop', handleFileDrop, true);

  // 3. ChatGPT 클립보드 붙여넣기 감지
  document.body.addEventListener('paste', handleFilePaste, true);
}

async function scanAndAlert(file, clearFn) {
  if (!isScannableFile(file)) {
    showAlert(`[FILE] ${file.name}\nBinary file - cannot scan`, 'info');
    return;
  }
  if (file.size > 500000) {
    showAlert(`[FILE] ${file.name}\nToo large (${(file.size / 1024).toFixed(0)}KB)`, 'warning');
    return;
  }

  try {
    showAlert(`[FILE] ${file.name}\nScanning...`, 'info');
    const content = await readFileAsText(file);

    scanFileLocally(file.name, content, (result) => {
      if (result.blocked) {
        const lines = result.injectionLines.length > 0
          ? '\nInjection lines: ' + result.injectionLines.map(l => `L${l.line}: "${l.text}"`).join(', ')
          : '';
        showAlert(
          `[FILE BLOCKED] ${file.name}\n${result.summary}${lines}\n(Scanned locally, nothing sent to server)`,
          'danger',
        );
        if (clearFn) clearFn();
      } else {
        showAlert(`[FILE OK] ${file.name}\nNo threats (scanned locally)`, 'info');
        setTimeout(hideAlert, 3000);
      }
    });
  } catch (err) {
    showAlert(`[FILE] ${file.name}\nRead error: ${err.message}`, 'warning');
  }
}

let isFileScanning = false;  // 파일 스캔 중복 방지

async function handleFileAttach(event) {
  if (isFileScanning) return;
  const input = event.target;
  if (!input.files || input.files.length === 0) return;

  isFileScanning = true;
  for (const file of input.files) {
    await scanAndAlert(file, () => { input.value = ''; });
  }
  isFileScanning = false;
}

async function handleFileDrop(event) {
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;

  // 스캔 가능한 텍스트 파일이 있으면 먼저 차단
  const hasScannableFile = Array.from(files).some(f => isScannableFile(f));
  if (hasScannableFile) {
    event.preventDefault();  // ChatGPT로 전달 차단
    event.stopPropagation();

    if (isFileScanning) return;
    isFileScanning = true;

    let allSafe = true;
    for (const file of files) {
      await new Promise((resolve) => {
        scanAndAlert(file, null);
        // scanFileLocally가 비동기이므로 결과 대기
        const checkInterval = setInterval(() => {
          if (!isFileScanning) { clearInterval(checkInterval); resolve(); }
        }, 100);
        // 3초 타임아웃
        setTimeout(() => { clearInterval(checkInterval); resolve(); }, 3000);
      });
    }
    isFileScanning = false;
  }
}

async function handleFilePaste(event) {
  const items = event.clipboardData?.items;
  if (!items) return;

  const files = [];
  for (const item of items) {
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file && isScannableFile(file)) files.push(file);
    }
  }

  if (files.length > 0) {
    event.preventDefault();  // ChatGPT로 전달 차단
    event.stopPropagation();

    if (isFileScanning) return;
    isFileScanning = true;

    for (const file of files) {
      await scanAndAlert(file, null);
    }
    isFileScanning = false;
  }
}

interceptFileInputs();

// ─── Prompt Input Listeners ─────────────────────────────────
// 타이핑: WASM(즉시) + ML(비동기) 동시 표시
// Enter: 최종 판정 (차단/통과)

let debounceTimer = null;
let mlDebounceTimer = null;
let isAnalyzing = false;
let lastWasmBlocked = false;  // WASM이 차단 판정했는지

// ─── 타이핑 중: WASM(즉시) + ML(비동기) 둘 다 표시 ───
document.body.addEventListener('keyup', (e) => {
  const promptBox = findPromptBox();
  if (!promptBox || !(promptBox.contains(e.target) || e.target === promptBox)) return;

  const text = getPromptText(promptBox);
  clearTimeout(debounceTimer);
  clearTimeout(mlDebounceTimer);

  debounceTimer = setTimeout(() => {
    if (!text.trim()) { hideAlert(); lastWasmBlocked = false; return; }

    const pii = scanPII(text);

    // [1] WASM 즉시 결과 (상단 박스)
    analyzeWithWasm(text, (result) => {
      if (!result) {
        hideWasm();
        lastWasmBlocked = false;
      } else {
        showWasmResult(result.text, result.alertType);
        lastWasmBlocked = result.blocked || false;
      }
    });

    // [2] 서버 ML 결과 (하단 박스, 800ms 디바운스)
    const textForServer = pii.hasPII ? pii.maskedText : text;
    showMlResult('ML 분석 중...', 'info');

    mlDebounceTimer = setTimeout(() => {
      analyzeWithServer(textForServer, (result) => {
        if (!result) {
          showMlResult('ML: 위험 없음', 'info');
          setTimeout(hideMl, 2000);
        } else {
          const piiLine = pii.hasPII ? `\nPII: ${pii.summary}` : '';
          showMlResult(`${result.text}${piiLine}`, result.alertType);
        }
      });
    }, 800);
  }, 400);
});

// ─── Enter: 최종 판정 (차단/마스킹/통과) ───
document.body.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.shiftKey) return;
  const promptBox = findPromptBox();
  if (!promptBox || !(promptBox.contains(e.target) || e.target === promptBox)) return;

  const text = getPromptText(promptBox);
  if (!text.trim()) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  if (isAnalyzing) return;
  isAnalyzing = true;

  const pii = scanPII(text);
  const textForServer = pii.hasPII ? pii.maskedText : text;

  // WASM이 이미 차단 판정이면 서버 안 기다리고 즉시 차단
  if (lastWasmBlocked) {
    isAnalyzing = false;
    showAlert('[BLOCKED / WASM]\n패턴 매칭으로 즉시 차단됨', 'danger');
    clearPromptBox(promptBox);
    setTimeout(hideAlert, 5000);
    return;
  }

  showAlert('[ENTER] 최종 판정 중...', 'info');

  // 서버 ML로 최종 판정
  analyzeWithServer(textForServer, (result) => {
    isAnalyzing = false;

    // 차단
    if (result && result.blocked) {
      showAlert(result.text, result.alertType);
      clearPromptBox(promptBox);
      setTimeout(hideAlert, 5000);
      return;
    }

    // PII 마스킹 후 전송
    if (pii.hasPII) {
      replacePromptText(promptBox, pii.maskedText);
      showAlert(`[PII MASKED]\n${pii.summary}`, 'warning');
      setTimeout(() => {
        const sendBtn = document.querySelector('button[data-testid="send-button"]');
        if (sendBtn) sendBtn.click();
        setTimeout(hideAlert, 3000);
      }, 500);
      return;
    }

    // 통과 → 전송
    hideAlert();
    const sendBtn = document.querySelector('button[data-testid="send-button"]');
    if (sendBtn) sendBtn.click();
  });

  // 서버 3초 타임아웃
  setTimeout(() => {
    if (isAnalyzing) {
      isAnalyzing = false;
      hideAlert();
      const sendBtn = document.querySelector('button[data-testid="send-button"]');
      if (sendBtn) sendBtn.click();
    }
  }, 3000);

}, true);
