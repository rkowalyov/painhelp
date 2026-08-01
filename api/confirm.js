const CONFIRM_FIELD_CODE = 'UF_CRM_LEAD_1775569282052';
const CONFIRM_OPTION_CONTINUE_NO_REG = '1411';
const CONFIRM_OPTION_NEEDS_CONFIRM = '1413';
const CONFIRM_OPTION_CONFIRMED = '1507';
const BITRIX_TIMEOUT_MS = 12000;

function normalizeWebhook(url) {
  return url.replace(/\/+$/, '').replace(/\.json$/, '') + '.json';
}

function deriveUpdateWebhook(baseWebhook) {
  const normalized = normalizeWebhook(baseWebhook);
  return normalized.replace(/crm\.lead\.add(?:\.json)?$/i, 'crm.lead.update.json');
}

function deriveGetWebhook(baseWebhook) {
  const normalized = normalizeWebhook(baseWebhook);
  return normalized.replace(/crm\.lead\.add(?:\.json)?$/i, 'crm.lead.get.json');
}

async function bitrixGet(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BITRIX_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) {
      return { ok: false, status: response.status, text };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, status: 502, text: 'Invalid JSON from Bitrix' };
    }

    return { ok: true, data };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkAlreadyConfirmed(getWebhook, id) {
  const getUrl = new URL(getWebhook);
  getUrl.searchParams.set('id', id);
  const response = await bitrixGet(getUrl.toString());
  if (!response.ok) {
    return { ok: false, alreadyConfirmed: false, response };
  }

  const lead = response.data && response.data.result;
  const value = String((lead && lead[CONFIRM_FIELD_CODE]) || '');
  const status = value === CONFIRM_OPTION_CONFIRMED
    ? 'confirmed'
    : value === CONFIRM_OPTION_NEEDS_CONFIRM
      ? 'needs_confirm'
      : value === CONFIRM_OPTION_CONTINUE_NO_REG
        ? 'no_confirm_required'
        : 'unknown';

  return { ok: true, status, currentValue: value, response };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawId = req.body && req.body.id;
  const id = String(rawId || '').trim();
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const sourceWebhook = process.env.BITRIX_CONFIRM_WEBHOOK || process.env.BITRIX_WEBHOOK;
  if (!sourceWebhook) {
    return res.status(500).json({ error: 'BITRIX_WEBHOOK is not configured' });
  }

  const webhook = deriveUpdateWebhook(sourceWebhook);
  const getWebhook = deriveGetWebhook(sourceWebhook);

  const preCheck = await checkAlreadyConfirmed(getWebhook, id);
  if (preCheck.ok) {
    if (preCheck.status === 'confirmed') {
      return res.status(200).json({ result: true, already_confirmed: true, current_value: preCheck.currentValue });
    }
    if (preCheck.status === 'no_confirm_required') {
      return res.status(200).json({ result: true, no_confirm_required: true, current_value: preCheck.currentValue });
    }
  }

  const url = new URL(webhook);
  url.searchParams.set('id', id);
  url.searchParams.set(`fields[${CONFIRM_FIELD_CODE}]`, CONFIRM_OPTION_CONFIRMED);

  try {
    const response = await bitrixGet(url.toString());
    if (!response.ok) {
      const postCheck = await checkAlreadyConfirmed(getWebhook, id);
      if (postCheck.ok && postCheck.status === 'confirmed') {
        return res.status(200).json({ result: true, already_confirmed: true, current_value: postCheck.currentValue });
      }
      if (postCheck.ok && postCheck.status === 'no_confirm_required') {
        return res.status(200).json({ result: true, no_confirm_required: true, current_value: postCheck.currentValue });
      }
      return res.status(response.status || 502).json({ error: `Bitrix HTTP ${response.status || 502}`, details: response.text });
    }

    const data = response.data;
    if (data && data.result !== true) {
      const postCheck = await checkAlreadyConfirmed(getWebhook, id);
      if (postCheck.ok && postCheck.status === 'confirmed') {
        return res.status(200).json({ result: true, already_confirmed: true, current_value: postCheck.currentValue });
      }
      if (postCheck.ok && postCheck.status === 'no_confirm_required') {
        return res.status(200).json({ result: true, no_confirm_required: true, current_value: postCheck.currentValue });
      }
    }

    return res.status(200).json(data);
  } catch (error) {
    const postCheck = await checkAlreadyConfirmed(getWebhook, id).catch(() => ({ ok: false, status: 'unknown' }));
    if (postCheck.ok && postCheck.status === 'confirmed') {
      return res.status(200).json({ result: true, already_confirmed: true, current_value: postCheck.currentValue });
    }
    if (postCheck.ok && postCheck.status === 'no_confirm_required') {
      return res.status(200).json({ result: true, no_confirm_required: true, current_value: postCheck.currentValue });
    }
    console.error('[Vercel API] Confirm forwarding failed:', error);
    return res.status(502).json({ error: error.message || 'Confirm forwarding failed' });
  }
}
