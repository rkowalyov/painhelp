const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const CONFIRM_FIELD_CODE = 'UF_CRM_LEAD_1775569282052';
const CONFIRM_OPTION_CONTINUE_NO_REG = '1411';
const CONFIRM_OPTION_NEEDS_CONFIRM = '1413';
const CONFIRM_OPTION_CONFIRMED = '1507';
const BITRIX_TIMEOUT_MS = 12000;

const app = express();
app.use(helmet());
app.use(express.json({ limit: '64kb' }));

const PORT = process.env.PORT || 3000;

const allowedEnv = process.env.ALLOWED_ORIGINS || '';
const allowed = allowedEnv.split(',').map(s => s.trim()).filter(Boolean);
console.log('[PROXY] Allowed origins:', allowed.length ? allowed : ['*']);
if (!process.env.BITRIX_WEBHOOK) {
  console.warn('[PROXY] WARNING: BITRIX_WEBHOOK is not set. /api/lead and /api/confirm will fail.');
}
app.use(cors({
  origin: function(origin, cb) {
    if (!origin) return cb(null, true); // allow non-browser tools and same-origin file access
    if (allowed.length === 0) return cb(null, true);
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  optionsSuccessStatus: 200
}));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use(limiter);

app.use(express.static(path.join(__dirname)));

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/api/lead', async (req, res) => {
  const webhook = process.env.BITRIX_WEBHOOK;
  if (!webhook) return res.status(500).json({ error: 'webhook missing' });

  const fields = req.body && req.body.fields;
  if (!fields) return res.status(400).json({ error: 'missing fields' });

  const url = webhook.replace(/\/+$/, '').replace(/\.json$/, '') + '.json';

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    const data = await resp.json();
    return res.json(data);
  } catch (e) {
    console.error('[PROXY] Error forwarding to Bitrix:', e);
    return res.status(502).json({ error: e.message });
  }
});

app.post('/api/confirm', async (req, res) => {
  const rawId = req.body && req.body.id;
  const id = String(rawId || '').trim();
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'invalid id' });

  const sourceWebhook = process.env.BITRIX_CONFIRM_WEBHOOK || process.env.BITRIX_WEBHOOK;
  if (!sourceWebhook) return res.status(500).json({ error: 'webhook missing' });

  const normalized = sourceWebhook.replace(/\/+$/, '').replace(/\.json$/, '') + '.json';
  const webhook = normalized.replace(/crm\.lead\.add(?:\.json)?$/i, 'crm.lead.update.json');
  const getWebhook = normalized.replace(/crm\.lead\.add(?:\.json)?$/i, 'crm.lead.get.json');
  const url = new URL(webhook);
  url.searchParams.set('id', id);
  url.searchParams.set(`fields[${CONFIRM_FIELD_CODE}]`, CONFIRM_OPTION_CONFIRMED);

  async function bitrixGet(requestUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BITRIX_TIMEOUT_MS);
    try {
      const resp = await fetch(requestUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      const text = await resp.text();
      if (!resp.ok) return { ok: false, status: resp.status, text };
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

  async function getConfirmState() {
    const getUrl = new URL(getWebhook);
    getUrl.searchParams.set('id', id);
    const response = await bitrixGet(getUrl.toString());
    if (!response.ok) return { ok: false, state: 'unknown', value: '' };
    const lead = response.data && response.data.result;
    const value = String((lead && lead[CONFIRM_FIELD_CODE]) || '');

    if (value === CONFIRM_OPTION_CONFIRMED) {
      return { ok: true, state: 'confirmed', value };
    }
    if (value === CONFIRM_OPTION_NEEDS_CONFIRM) {
      return { ok: true, state: 'needs_confirm', value };
    }
    if (value === CONFIRM_OPTION_CONTINUE_NO_REG) {
      return { ok: true, state: 'no_confirm_required', value };
    }
    return { ok: true, state: 'unknown', value };
  }

  try {
    const preState = await getConfirmState();
    if (preState.ok && preState.state === 'confirmed') {
      return res.status(200).json({ result: true, already_confirmed: true, current_value: preState.value });
    }
    if (preState.ok && preState.state === 'no_confirm_required') {
      return res.status(200).json({ result: true, no_confirm_required: true, current_value: preState.value });
    }

    const response = await bitrixGet(url.toString());

    if (!response.ok) {
      const postState = await getConfirmState();
      if (postState.ok && postState.state === 'confirmed') {
        return res.status(200).json({ result: true, already_confirmed: true, current_value: postState.value });
      }
      if (postState.ok && postState.state === 'no_confirm_required') {
        return res.status(200).json({ result: true, no_confirm_required: true, current_value: postState.value });
      }
      return res.status(response.status || 502).json({ error: `Bitrix HTTP ${response.status || 502}`, details: response.text });
    }

    const data = response.data;
    if (data && data.result !== true) {
      const postState = await getConfirmState();
      if (postState.ok && postState.state === 'confirmed') {
        return res.status(200).json({ result: true, already_confirmed: true, current_value: postState.value });
      }
      if (postState.ok && postState.state === 'no_confirm_required') {
        return res.status(200).json({ result: true, no_confirm_required: true, current_value: postState.value });
      }
    }

    return res.json(data);
  } catch (e) {
    const postState = await getConfirmState().catch(() => ({ ok: false, state: 'unknown' }));
    if (postState.ok && postState.state === 'confirmed') {
      return res.status(200).json({ result: true, already_confirmed: true, current_value: postState.value });
    }
    if (postState.ok && postState.state === 'no_confirm_required') {
      return res.status(200).json({ result: true, no_confirm_required: true, current_value: postState.value });
    }
    console.error('[PROXY] Error forwarding confirm to Bitrix:', e);
    return res.status(502).json({ error: e.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err && err.message);
  res.status(500).json({ error: err && err.message });
});

app.listen(PORT, () => console.log(`Proxy server listening on ${PORT}`));
