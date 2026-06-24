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
    status.style.color = isError ? '#b00020' : '#5d5d5d';
  }
}

async function sendConfirmWebhook(id) {
  const url = new URL('https://interpain.bitrix24.ru/rest/1/aigq909p2tgc5twx/crm.lead.update.json');
  url.searchParams.set('id', id);
  url.searchParams.set('fields[UF_CRM_LEAD_1775569282052]', '1507');

  updateStatus('Выполняется вызов webhook...');

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
    updateStatus('Webhook вызван успешно. Страница закроется через 2 секунды.');
    closeWindowAfterDelay(2000);
  } catch (error) {
    console.error('confirm webhook failed', error);
    updateStatus(`Ошибка webhook: ${error.message}`, true);
  }
}

function closeWindowAfterDelay(delayMs) {
  setTimeout(() => {
    try {
      window.close();
    } catch (closeError) {
      console.warn('Window close blocked', closeError);
    }
  }, delayMs);
}

function initConfirmPage() {
  const id = getQueryVariable('id');
  const info = document.getElementById('request-info');

  if (info) {
    info.textContent = `ID: ${id || 'не задан'}`;
  }

  if (!id) {
    updateStatus('Параметр id не задан в URL.', true);
    return;
  }

  sendConfirmWebhook(id);
}

window.addEventListener('DOMContentLoaded', initConfirmPage);
