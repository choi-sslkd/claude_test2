// extension/content.js

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
  max-width: 420px;
  line-height: 1.5;
  white-space: pre-wrap;
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

  if (type === 'danger') {
    alertBox.style.backgroundColor = '#ff4d4f';
  } else if (type === 'warning') {
    alertBox.style.backgroundColor = '#faad14';
  } else {
    alertBox.style.backgroundColor = '#1677ff';
  }

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
      showAlert('🔄 익스텐션 코드가 업데이트되었습니다. F5로 새로고침 해주세요.', 'warning');
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

function normalizeAnalysisResponse(response) {
  if (!response) return null;

  const riskLevel = typeof response.riskLevel === 'string'
    ? response.riskLevel.toLowerCase()
    : 'low';

  const score = Number.isFinite(response.score) ? response.score : 0;

  const blocked = Boolean(response.blocked);

  const message =
    typeof response.message === 'string' && response.message.trim()
      ? response.message.trim()
      : '';

  return {
    riskLevel,
    score,
    blocked,
    message,
  };
}

function buildAlertMessage(result, isSubmitPhase = false) {
  const { riskLevel, score, blocked, message } = result;

  if (blocked || riskLevel === 'critical') {
    return {
      type: 'danger',
      text:
        `⛔ [차단됨 / ${riskLevel.toUpperCase()}]\n` +
        `위험 점수: ${score}\n` +
        `${message || '보안 정책 위반 가능성이 높아 전송이 차단되었습니다.'}`,
    };
  }

  if (riskLevel === 'high') {
    return {
      type: isSubmitPhase ? 'danger' : 'warning',
      text:
        `🚨 [고위험]\n` +
        `위험 점수: ${score}\n` +
        `${message || '위험한 프롬프트 패턴이 감지되었습니다.'}`,
    };
  }

  if (riskLevel === 'medium') {
    return {
      type: 'warning',
      text:
        `⚠️ [주의]\n` +
        `위험 점수: ${score}\n` +
        `${message || '의심스러운 프롬프트 패턴이 감지되었습니다.'}`,
    };
  }

  return null;
}

let debounceTimer = null;

document.body.addEventListener('keyup', (e) => {
  const promptBox = findPromptBox();
  if (!promptBox) return;

  if (!(promptBox.contains(e.target) || e.target === promptBox)) return;

  const text = getPromptText(promptBox);

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (!text.trim()) {
      hideAlert();
      return;
    }

    safeSendMessage(text, (response) => {
      if (!response || response.status !== 'success') {
        return;
      }

      const result = normalizeAnalysisResponse(response);
      if (!result) return;

      const alertInfo = buildAlertMessage(result, false);

      if (!alertInfo) {
        hideAlert();
        return;
      }

      showAlert(alertInfo.text, alertInfo.type);
    });
  }, 400);
});

document.body.addEventListener(
  'keydown',
  (e) => {
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
      if (!response || response.status !== 'success') {
        showAlert('⚠️ 분석 응답을 받지 못했습니다.', 'warning');
        return;
      }

      const result = normalizeAnalysisResponse(response);
      if (!result) {
        showAlert('⚠️ 분석 결과 형식이 올바르지 않습니다.', 'warning');
        return;
      }

      if (result.blocked || result.riskLevel === 'critical') {
        const alertInfo = buildAlertMessage(result, true);
        showAlert(alertInfo.text, alertInfo.type);
        clearPromptBox(promptBox);
        return;
      }

      if (result.riskLevel === 'high') {
        const alertInfo = buildAlertMessage(result, true);
        showAlert(alertInfo.text, alertInfo.type);
        clearPromptBox(promptBox);
        return;
      }

      hideAlert();

      const sendBtn = document.querySelector('button[data-testid="send-button"]');
      if (sendBtn) {
        sendBtn.click();
      }
    });
  },
  true,
);