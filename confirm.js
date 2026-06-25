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
  const url = new URL('https://interpain.bitrix24.ru/rest/1/aigq909p2tgc5twx/crm.lead.update.json');
  url.searchParams.set('id', id);
  url.searchParams.set('fields[UF_CRM_LEAD_1775569282052]', '1507');

  const startTime = Date.now();
  updateHeading('Выполняется подтверждение...');
  showStatusText();
  hideStatusText();
  showSpinner(true);
  updateSubtext('');

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const result = await response.json();
    console.log('confirm webhook result', result);
    const elapsed = Date.now() - startTime;
    const minDuration = 1500;
    const wait = Math.max(0, minDuration - elapsed);

    setTimeout(() => {
      showSpinner(false);
      updateHeading('Адрес подтвержден / Address confirmed');
      updateStatus('Адрес подтвержден. Address confirmed.');
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
    updateStatus(`Ошибка webhook: ${error.message}`, true);
    updateSubtext('Попробуйте обновить страницу или закройте окно вручную.');
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
  // Pattern: id:t_<rand1>&/mUm%<rnd2><ID><rnd3>$rkw$^<rand4>mdw
  const re = /^id:t_(7\d{3})&\/mUm%(\d{2})(\d+)(\d{2})\$rkw\$\^(\d{4})mdw$/;
  const m = normalized.match(re);
  if (!m) return null;
  const rand1 = Number(m[1]);
  const rnd2 = Number(m[2]);
  const id = m[3];
  const rnd3 = Number(m[4]);
  const rand4 = Number(m[5]);

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
