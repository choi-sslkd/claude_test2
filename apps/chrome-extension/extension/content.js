// extension/content.js
// PII 검사: 브라우저에서 직접 수행 (서버 전송 없음)
// 인젝션 검사: 마스킹된 텍스트만 서버로 전송

// ─── Alert UI ───────────────────────────────────────────────

const alertBox = document.createElement('div');
alertBox.style.cssText = `
  position: fixed; top: 20px; right: 20px;
  padding: 15px 25px; background-color: #ff4d4f; color: white;
  font-weight: bold; border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  z-index: 2147483647; display: none; pointer-events: none;
  max-width: 480px; line-height: 1.6; white-space: pre-wrap; font-size: 13px;
`;
document.body.appendChild(alertBox);

function showAlert(message, type = 'danger') {
  alertBox.innerText = message;
  if (type === 'danger') alertBox.style.backgroundColor = '#ff4d4f';
  else if (type === 'warning') alertBox.style.backgroundColor = '#faad14';
  else alertBox.style.backgroundColor = '#1677ff';
  alertBox.style.display = 'block';
}

function hideAlert() { alertBox.style.display = 'none'; }

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

function analyzePrompt(text, isSubmit, callback) {
  // 1. Client-side PII scan (개인정보는 브라우저에서만 처리)
  const pii = scanPII(text);

  // 2. 서버에는 마스킹된 텍스트만 전송 (인젝션 검사용)
  const textForServer = pii.hasPII ? pii.maskedText : text;

  safeSendMessage({ type: 'ANALYZE_PROMPT', text: textForServer }, (response) => {
    if (!response || response.status !== 'success') {
      // 서버 연결 실패 → PII 결과만으로 판단
      if (pii.hasPII) {
        callback({
          blocked: pii.count >= 5,
          alertType: pii.count >= 5 ? 'danger' : 'warning',
          text: pii.count >= 5
            ? `[PII BLOCKED]\n${pii.summary}\nToo many PII items detected`
            : `[PII WARNING]\n${pii.summary}`,
        });
      } else {
        callback(null);
      }
      return;
    }

    const r = normalizeServerResponse(response);

    // PII 정보를 클라이언트 결과로 합침
    r.pii = pii;

    const alert = buildAlert(r, isSubmit);
    callback(alert ? { blocked: r.blocked, ...alert } : null);
  });
}

function normalizeServerResponse(response) {
  return {
    overallRisk: (response.overallRisk || 'note').toLowerCase(),
    blocked: Boolean(response.blocked),
    injPct: response.injectionPct || 'N/A',
    ambPct: response.ambiguityPct || 'N/A',
    injSev: (response.injectionSeverity || 'note').toUpperCase(),
    ambSev: (response.ambiguitySeverity || 'note').toUpperCase(),
    matches: response.matches || [],
    pii: { hasPII: false, count: 0, summary: '' },
  };
}

function buildAlert(r, isSubmit) {
  const matchText = r.matches.length > 0
    ? r.matches.map((m) => `"${m.pattern || m.id}"`).join(', ') : '';
  const piiLine = r.pii?.hasPII ? `\nPII: ${r.pii.summary} (client-side, not sent to server)` : '';

  if (r.blocked || r.overallRisk === 'critical') {
    let t = `[BLOCKED / ${r.overallRisk.toUpperCase()}]\n`;
    t += `Injection: ${r.injPct} (${r.injSev}) | Ambiguity: ${r.ambPct} (${r.ambSev})`;
    if (matchText) t += `\nMatched: ${matchText}`;
    t += piiLine;
    return { alertType: 'danger', text: t };
  }
  if (r.overallRisk === 'high') {
    let t = `[HIGH RISK]\nInjection: ${r.injPct} (${r.injSev}) | Ambiguity: ${r.ambPct} (${r.ambSev})`;
    if (matchText) t += `\nMatched: ${matchText}`;
    t += piiLine;
    return { alertType: isSubmit ? 'danger' : 'warning', text: t };
  }
  if (r.overallRisk === 'medium') {
    let t = `[MEDIUM]\nInjection: ${r.injPct} (${r.injSev}) | Ambiguity: ${r.ambPct} (${r.ambSev})`;
    t += piiLine;
    return { alertType: 'warning', text: t };
  }
  if (r.overallRisk === 'low') {
    let t = `[LOW]\nInjection: ${r.injPct} | Ambiguity: ${r.ambPct}`;
    t += piiLine;
    return piiLine ? { alertType: 'info', text: t } : { alertType: 'info', text: t };
  }
  // note level
  if (r.pii?.hasPII) {
    return { alertType: 'warning', text: `[PII DETECTED]\n${r.pii.summary}\n(client-side, not sent to server)` };
  }
  return null;
}

// ─── File Attachment Scan (PII: local only) ─────────────────

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

function scanFileLocally(fileName, content) {
  const lines = content.split('\n').slice(0, 500);
  const allPII = [];

  for (let i = 0; i < lines.length; i++) {
    const pii = scanPII(lines[i]);
    if (pii.hasPII) {
      for (const m of pii.matches) {
        allPII.push({ ...m, line: i + 1 });
      }
    }
  }

  const piiTypes = [...new Set(allPII.map((m) => m.label))];
  const blocked = allPII.length >= 5;

  return {
    fileName,
    pii: {
      found: allPII.length > 0,
      count: allPII.length,
      types: piiTypes,
      details: allPII.slice(0, 20),
    },
    blocked,
    summary: allPII.length > 0
      ? `${piiTypes.join(', ')} ${allPII.length}건 감지`
      : 'No PII detected',
  };
}

function interceptFileInputs() {
  const observer = new MutationObserver((mutations) => {
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
  observer.observe(document.body, { childList: true, subtree: true });

  document.querySelectorAll('input[type="file"]').forEach((input) => {
    if (!input.dataset.pgIntercepted) {
      input.dataset.pgIntercepted = 'true';
      input.addEventListener('change', handleFileAttach, true);
    }
  });
}

async function handleFileAttach(event) {
  const input = event.target;
  if (!input.files || input.files.length === 0) return;

  for (const file of input.files) {
    if (!isScannableFile(file)) {
      showAlert(`[FILE] ${file.name}\nBinary file - cannot scan`, 'info');
      continue;
    }
    if (file.size > 500000) {
      showAlert(`[FILE] ${file.name}\nToo large (${(file.size / 1024).toFixed(0)}KB > 500KB)`, 'warning');
      continue;
    }

    try {
      showAlert(`[FILE] ${file.name}\nScanning locally...`, 'info');
      const content = await readFileAsText(file);

      // PII 검사는 브라우저에서 직접 수행 (서버 전송 없음)
      const result = scanFileLocally(file.name, content);

      if (result.blocked) {
        showAlert(
          `[FILE BLOCKED] ${file.name}\nPII: ${result.summary}\nToo many PII items - file attachment blocked\n(Scanned locally, nothing sent to server)`,
          'danger',
        );
        input.value = '';
      } else if (result.pii.found) {
        showAlert(
          `[FILE WARNING] ${file.name}\nPII: ${result.summary}\n(Scanned locally, nothing sent to server)`,
          'warning',
        );
      } else {
        showAlert(`[FILE OK] ${file.name}\nNo PII detected (scanned locally)`, 'info');
        setTimeout(hideAlert, 3000);
      }
    } catch (err) {
      showAlert(`[FILE] ${file.name}\nRead error: ${err.message}`, 'warning');
    }
  }
}

interceptFileInputs();

// ─── Prompt Input Listeners ─────────────────────────────────

let debounceTimer = null;

document.body.addEventListener('keyup', (e) => {
  const promptBox = findPromptBox();
  if (!promptBox || !(promptBox.contains(e.target) || e.target === promptBox)) return;

  const text = getPromptText(promptBox);
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    if (!text.trim()) { hideAlert(); return; }
    analyzePrompt(text, false, (result) => {
      if (!result) { hideAlert(); return; }
      showAlert(result.text, result.alertType);
    });
  }, 400);
});

document.body.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.shiftKey) return;
  const promptBox = findPromptBox();
  if (!promptBox || !(promptBox.contains(e.target) || e.target === promptBox)) return;

  const text = getPromptText(promptBox);
  if (!text.trim()) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  // 먼저 PII 검사 (로컬)
  const pii = scanPII(text);

  analyzePrompt(text, true, (result) => {
    if (!result && !pii.hasPII) {
      hideAlert();
      const sendBtn = document.querySelector('button[data-testid="send-button"]');
      if (sendBtn) sendBtn.click();
      return;
    }

    // 인젝션으로 차단된 경우
    if (result && result.blocked) {
      showAlert(result.text, result.alertType);
      clearPromptBox(promptBox);
      return;
    }

    // PII 감지 시: 입력창을 마스킹된 텍스트로 교체 후 전송
    if (pii.hasPII) {
      replacePromptText(promptBox, pii.maskedText);
      showAlert(
        `[PII MASKED]\n${pii.summary}\n원본 개인정보가 마스킹 처리되어 전송됩니다.\n(client-side, 원본은 서버에 전송되지 않음)`,
        'warning',
      );
      // 마스킹된 텍스트로 교체 후 약간 딜레이 주고 전송
      setTimeout(() => {
        const sendBtn = document.querySelector('button[data-testid="send-button"]');
        if (sendBtn) sendBtn.click();
      }, 100);
      return;
    }

    // 경고만 (MEDIUM 이하)
    if (result) showAlert(result.text, result.alertType);
    const sendBtn = document.querySelector('button[data-testid="send-button"]');
    if (sendBtn) sendBtn.click();
  });
}, true);
