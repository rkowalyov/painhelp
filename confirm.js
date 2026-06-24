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

function initConfirmPage() {
  const id = getQueryVariable('id');

  if (!id) {
    showSpinner(false);
    showStatusText();
    updateHeading('Параметр id не задан');
    updateStatus('Параметр id не задан в URL.', true);
    updateSubtext('Используйте URL вида /confirm?id=12345.');
    return;
  }

  sendConfirmWebhook(id);
}

window.addEventListener('DOMContentLoaded', initConfirmPage);
