// extension/content.js — Dual score display (Injection + Ambiguity)

const alertBox = document.createElement('div');
alertBox.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 25px;
  background-color: #ff4d4f;
  color: white;
  font-weight: bold;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  z-index: 2147483647;
  display: none;
  pointer-events: none;
  max-width: 480px;
  line-height: 1.6;
  white-space: pre-wrap;
  font-size: 13px;
`;
document.body.appendChild(alertBox);

function getPromptText(target) {
  if (!target) return '';
  if (typeof target.value === 'string') return target.value;
  if (typeof target.textContent === 'string') return target.textContent;
  return '';
}

function showAlert(message, type = 'danger') {
  alertBox.innerText = message;
  if (type === 'danger') alertBox.style.backgroundColor = '#ff4d4f';
  else if (type === 'warning') alertBox.style.backgroundColor = '#faad14';
  else alertBox.style.backgroundColor = '#1677ff';
  alertBox.style.display = 'block';
}

function hideAlert() {
  alertBox.style.display = 'none';
}

function safeSendMessage(text, callback) {
  try {
    chrome.runtime.sendMessage({ type: 'ANALYZE_PROMPT', text }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[Prompt Guard] background 연결 대기 중:', chrome.runtime.lastError.message);
        return;
      }
      callback(response);
    });
  } catch (error) {
    if (error?.message?.includes('Extension context invalidated')) {
      showAlert('Extension updated. Please refresh the page (F5).', 'warning');
      return;
    }
    console.error('[Prompt Guard] 메시지 전송 실패:', error);
  }
}

function findPromptBox() {
  return document.querySelector('#prompt-textarea');
}

function clearPromptBox(promptBox) {
  if (!promptBox) return;
  if ('value' in promptBox) {
    promptBox.value = '';
    promptBox.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  promptBox.innerHTML = '<p><br></p>';
  promptBox.dispatchEvent(new Event('input', { bubbles: true }));
}

function normalizeResponse(response) {
  if (!response || response.status !== 'success') return null;

  const overallRisk = (response.overallRisk || 'note').toLowerCase();
  const blocked = Boolean(response.blocked);
  const injPct = response.injectionPct || 'N/A';
  const ambPct = response.ambiguityPct || 'N/A';
  const injSev = (response.injectionSeverity || 'note').toUpperCase();
  const ambSev = (response.ambiguitySeverity || 'note').toUpperCase();
  const matches = response.matches || [];
  const masking = response.masking || { hasPII: false, maskedCount: 0, summary: '' };

  return { overallRisk, blocked, injPct, ambPct, injSev, ambSev, matches, masking };
}

function buildMaskingLine(masking) {
  if (!masking || !masking.hasPII) return '';
  return `\nPII Masked: ${masking.summary}`;
}

function buildAlertMessage(r, isSubmit = false) {
  const matchText = r.matches.length > 0
    ? r.matches.map((m) => `"${m.pattern || m.id}"`).join(', ')
    : '';
  const maskLine = buildMaskingLine(r.masking);

  if (r.blocked || r.overallRisk === 'critical') {
    let text = `[BLOCKED / ${r.overallRisk.toUpperCase()}]\n`;
    text += `Injection: ${r.injPct} (${r.injSev}) | Ambiguity: ${r.ambPct} (${r.ambSev})`;
    if (matchText) text += `\nMatched: ${matchText}`;
    text += maskLine;
    return { type: 'danger', text };
  }

  if (r.overallRisk === 'high') {
    let text = `[HIGH RISK]\n`;
    text += `Injection: ${r.injPct} (${r.injSev}) | Ambiguity: ${r.ambPct} (${r.ambSev})`;
    if (matchText) text += `\nMatched: ${matchText}`;
    text += maskLine;
    return { type: isSubmit ? 'danger' : 'warning', text };
  }

  if (r.overallRisk === 'medium') {
    let text = `[MEDIUM]\n`;
    text += `Injection: ${r.injPct} (${r.injSev}) | Ambiguity: ${r.ambPct} (${r.ambSev})`;
    if (matchText) text += `\nMatched: ${matchText}`;
    text += maskLine;
    return { type: 'warning', text };
  }

  if (r.overallRisk === 'low') {
    let text = `[LOW]\nInjection: ${r.injPct} | Ambiguity: ${r.ambPct}`;
    text += maskLine;
    return { type: 'info', text };
  }

  // note level - only show if PII detected
  if (r.masking && r.masking.hasPII) {
    return { type: 'warning', text: `[PII DETECTED]${maskLine}` };
  }

  return null;
}

// ─── File attachment interception ────────────────────────────

const SCANNABLE_TYPES = [
  'text/plain', 'text/csv', 'text/tab-separated-values',
  'application/json', 'text/markdown', 'text/html',
  'application/xml', 'text/xml', 'text/yaml',
];
const SCANNABLE_EXTENSIONS = [
  '.txt', '.csv', '.tsv', '.json', '.jsonl', '.md',
  '.html', '.xml', '.yaml', '.yml', '.log', '.env', '.py', '.js', '.ts',
];

function isScannableFile(file) {
  if (SCANNABLE_TYPES.includes(file.type)) return true;
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return SCANNABLE_EXTENSIONS.includes(ext);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsText(file);
  });
}

function interceptFileInputs() {
  // MutationObserver로 동적으로 생성되는 file input도 감지
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;

        const inputs = node.tagName === 'INPUT'
          ? [node]
          : node.querySelectorAll ? [...node.querySelectorAll('input[type="file"]')] : [];

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

  // 이미 있는 file input도 잡기
  document.querySelectorAll('input[type="file"]').forEach((input) => {
    if (!input.dataset.pgIntercepted) {
      input.dataset.pgIntercepted = 'true';
      input.addEventListener('change', handleFileAttach, true);
    }
  });
}

async function handleFileAttach(event) {
  const input = event.target;
  const files = input.files;
  if (!files || files.length === 0) return;

  for (const file of files) {
    if (!isScannableFile(file)) {
      // 바이너리 파일은 스캔 불가 → 경고만 표시
      showAlert(`[FILE] ${file.name}\nBinary file - cannot scan for PII/injection`, 'info');
      continue;
    }

    if (file.size > 500000) {
      showAlert(`[FILE] ${file.name}\nFile too large (${(file.size / 1024).toFixed(0)}KB > 500KB limit)`, 'warning');
      continue;
    }

    try {
      showAlert(`[FILE] ${file.name}\nScanning...`, 'info');

      const content = await readFileAsText(file);

      chrome.runtime.sendMessage(
        { type: 'SCAN_FILE', fileName: file.name, content },
        (response) => {
          if (chrome.runtime.lastError) {
            showAlert(`[FILE] ${file.name}\nScan failed: extension error`, 'warning');
            return;
          }

          if (!response || response.status !== 'success') {
            showAlert(`[FILE] ${file.name}\nScan failed: ${response?.message || 'unknown'}`, 'warning');
            return;
          }

          if (response.blocked) {
            // 차단: file input 초기화
            showAlert(buildFileScanAlert(file.name, response), 'danger');
            input.value = '';
          } else if (response.pii?.found || response.injection?.found) {
            // 경고만 (차단은 안 함)
            showAlert(buildFileScanAlert(file.name, response), 'warning');
          } else {
            showAlert(`[FILE OK] ${file.name}\nNo threats detected`, 'info');
            setTimeout(hideAlert, 3000);
          }
        },
      );
    } catch (err) {
      showAlert(`[FILE] ${file.name}\nRead error: ${err.message}`, 'warning');
    }
  }
}

function buildFileScanAlert(fileName, r) {
  let text = r.blocked
    ? `[FILE BLOCKED] ${fileName}\n`
    : `[FILE WARNING] ${fileName}\n`;

  if (r.injection?.found) {
    text += `Injection: ${r.injection.pct} (${r.injection.severity})`;
    if (r.injection.suspiciousLines?.length > 0) {
      text += ` - ${r.injection.suspiciousLines.length} suspicious lines`;
    }
    text += '\n';
  }

  if (r.pii?.found) {
    text += `PII: ${r.pii.totalCount} items (${r.pii.types.join(', ')})`;
  }

  return text.trim();
}

// Start file interception
interceptFileInputs();

// ─── Prompt analysis (existing) ─────────────────────────────

let debounceTimer = null;

document.body.addEventListener('keyup', (e) => {
  const promptBox = findPromptBox();
  if (!promptBox) return;
  if (!(promptBox.contains(e.target) || e.target === promptBox)) return;

  const text = getPromptText(promptBox);
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    if (!text.trim()) { hideAlert(); return; }

    safeSendMessage(text, (response) => {
      const r = normalizeResponse(response);
      if (!r) return;
      const alert = buildAlertMessage(r, false);
      if (!alert) { hideAlert(); return; }
      showAlert(alert.text, alert.type);
    });
  }, 400);
});

document.body.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.shiftKey) return;

  const promptBox = findPromptBox();
  if (!promptBox) return;
  if (!(promptBox.contains(e.target) || e.target === promptBox)) return;

  const text = getPromptText(promptBox);
  if (!text.trim()) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  safeSendMessage(text, (response) => {
    const r = normalizeResponse(response);
    if (!r) {
      showAlert('Analysis response unavailable', 'warning');
      return;
    }

    if (r.blocked || r.overallRisk === 'critical' || r.overallRisk === 'high') {
      const alert = buildAlertMessage(r, true);
      showAlert(alert.text, alert.type);
      clearPromptBox(promptBox);
      return;
    }

    hideAlert();
    const sendBtn = document.querySelector('button[data-testid="send-button"]');
    if (sendBtn) sendBtn.click();
  });
}, true);
