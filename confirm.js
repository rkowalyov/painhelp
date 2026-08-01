// Скрипт для URL вида /confirm?id=12345
// Он читает параметр id и вызывает внешнюю webhook-ссылку Bitrix24.

function getQueryVariable(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || "";
}

function updateStatus(message, isError = false) {
  const status = document.getElementById('status-message');
  if (status) {
    status.textContent = message;
    status.classList.toggle('error', isError);
  }
}

function updateHeading(message) {
  const heading = document.getElementById('status-heading');
  if (heading) {
    heading.textContent = message;
  }
}

function showSpinner(visible) {
  const spinner = document.getElementById('status-spinner');
  if (spinner) {
    spinner.style.display = visible ? 'block' : 'none';
  }
}

function updateSubtext(message) {
  const subtext = document.getElementById('status-subtext');
  if (subtext) {
    subtext.textContent = message;
    subtext.style.display = message ? 'block' : 'none';
  }
}

function showStatusText() {
  const status = document.getElementById('status-message');
  const subtext = document.getElementById('status-subtext');
  if (status) {
    status.style.display = 'block';
  }
  if (subtext) {
    subtext.style.display = subtext.textContent ? 'block' : 'none';
  }
}

function hideStatusText() {
  const status = document.getElementById('status-message');
  const subtext = document.getElementById('status-subtext');
  if (status) {
    status.style.display = 'none';
  }
  if (subtext) {
    subtext.style.display = 'none';
  }
}

async function sendConfirmWebhook(id) {

  const startTime = Date.now();
  updateHeading('Выполняется подтверждение...');
  showStatusText();
  hideStatusText();
  showSpinner(true);
  updateSubtext('');

  const controller = new AbortController();
  const timeoutMs = 15000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('/api/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ id }),
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const result = await response.json();
    console.log('confirm webhook result', result);

    if (result && result.result !== true) {
      throw new Error(result.error_description || result.error || 'Bitrix update failed');
    }

    const elapsed = Date.now() - startTime;
    const minDuration = 1500;
    const wait = Math.max(0, minDuration - elapsed);

    setTimeout(() => {
      showSpinner(false);
      const alreadyConfirmed = !!(result && result.already_confirmed);
      const noConfirmRequired = !!(result && result.no_confirm_required);
      if (noConfirmRequired) {
        updateHeading('Подтверждение не предусмотрено');
        updateStatus('Для этого лида подтверждение email не требуется.');
      } else if (alreadyConfirmed) {
        updateHeading('Адрес уже был подтвержден / Already confirmed');
        updateStatus('Этот адрес уже подтвержден ранее. Действий больше не требуется.');
      } else {
        updateHeading('Адрес подтвержден / Address confirmed');
        updateStatus('Адрес подтвержден. Address confirmed.');
      }
      showStatusText();

      setTimeout(() => {
        updateSubtext('Если окно не закрылось автоматически, вы можете закрыть его вручную. / If the window did not close automatically, you may close it manually.');
        closeWindowProgrammatically();
      }, 2000);
    }, wait);
  } catch (error) {
    console.error('confirm webhook failed', error);
    showSpinner(false);
    updateHeading('Ошибка при подтверждении');
    const msg = error && error.name === 'AbortError'
      ? 'Истекло время ожидания ответа сервера подтверждения.'
      : `Ошибка webhook: ${error.message}`;
    updateStatus(msg, true);
    showStatusText();
    updateSubtext('Попробуйте обновить страницу или закройте окно вручную.');
  } finally {
    clearTimeout(timeout);
  }
}

function closeWindowProgrammatically() {
  try {
    window.close();
    if (!window.closed) {
      window.open('', '_self');
      window.close();
    }
  } catch (closeError) {
    console.warn('Window close blocked', closeError);
  }
}

function normalizeMaskedString(masked) {
  return masked
    .replace(/%26/g, '&')
    .replace(/%25/g, '%')
    .replace(/%5E/gi, '^');
}

function parseMaskedId(masked) {
  if (!masked || typeof masked !== 'string') return null;
  const normalized = normalizeMaskedString(masked);
  // Pattern A: id:t_<rand1>&/mUm%<rnd2><ID><rnd3>$rkw$^<rand4>mdw
  // Pattern B: the %<rnd2> part can be URL-decoded by browser into one char, e.g. %56 -> V.
  // Pattern C: some clients may strip '%' and keep digits directly: mUm<rnd2><ID><rnd3>.
  const encodedRe = /^id:t_(7\d{3})&\/mUm%(\d{2})(\d+)(\d{2})\$rkw\$\^(\d{4})mdw$/;
  const decodedRe = /^id:t_(7\d{3})&\/mUm([^\d%])(\d+)(\d{2})\$rkw\$\^(\d{4})mdw$/;
  const numericRe = /^id:t_(7\d{3})&\/mUm(\d{2})(\d+)(\d{2})\$rkw\$\^(\d{4})mdw$/;

  let rand1;
  let rnd2;
  let id;
  let rnd3;
  let rand4;

  const mEncoded = normalized.match(encodedRe);
  if (mEncoded) {
    rand1 = Number(mEncoded[1]);
    rnd2 = Number(mEncoded[2]);
    id = mEncoded[3];
    rnd3 = Number(mEncoded[4]);
    rand4 = Number(mEncoded[5]);
  } else {
    const mNumeric = normalized.match(numericRe);
    if (mNumeric) {
      rand1 = Number(mNumeric[1]);
      rnd2 = Number(mNumeric[2]);
      id = mNumeric[3];
      rnd3 = Number(mNumeric[4]);
      rand4 = Number(mNumeric[5]);
    } else {
      const mDecoded = normalized.match(decodedRe);
      if (!mDecoded) return null;

      rand1 = Number(mDecoded[1]);
      // Recover original two digits from decoded byte, e.g. 'V'(0x56) -> 56.
      const hexByte = mDecoded[2].charCodeAt(0).toString(16).slice(-2);
      rnd2 = Number(hexByte);
      id = mDecoded[3];
      rnd3 = Number(mDecoded[4]);
      rand4 = Number(mDecoded[5]);
    }
  }

  if (!(rand1 >= 7001 && rand1 <= 7999)) return null;
  if (!(rnd2 >= 11 && rnd2 <= 99)) return null;
  if (!/^\d+$/.test(id)) return null;
  if (!(rnd3 >= 11 && rnd3 <= 99)) return null;
  if (!(rand4 >= 2001 && rand4 <= 2999)) return null;

  return id;
}

function findMaskedIdInSearch() {
  const search = window.location.search || '';
  const rawMatch = search.match(/[?&]id=(id:t_.*?mdw)(?:&|$)/);
  if (!rawMatch) return null;
  return parseMaskedId(rawMatch[1]);
}

function initConfirmPage() {
  const raw = getQueryVariable('id');

  // Try plain numeric ID first, otherwise parse masked format.
  // If URLSearchParams fails because the masked value contains raw & or other query-reserved characters,
  // try parsing directly from the raw search string.
  let id = null;
  if (/^\d+$/.test(raw)) {
    id = raw;
  } else {
    id = parseMaskedId(raw) || findMaskedIdInSearch();
  }

  if (!id) {
    showSpinner(false);
    showStatusText();
    updateHeading('Неверный параметр id');
    updateStatus('Неверный или отсутствующий параметр id в URL.', true);
    updateSubtext('Используйте URL вида /confirm?id=id:t_7214&/mUm%9015583<id>80$rkw$^2303mdw или plain numeric id.');
    return;
  }

  // put ID into visible info element if present
  const info = document.getElementById('request-info');
  if (info) info.textContent = `ID: ${id}`;

  sendConfirmWebhook(id);
}

window.addEventListener('DOMContentLoaded', initConfirmPage);
