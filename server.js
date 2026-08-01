const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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
  const url = new URL(webhook);
  url.searchParams.set('id', id);
  url.searchParams.set('fields[UF_CRM_LEAD_1775569282052]', '1507');

  try {
    const resp = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: `Bitrix HTTP ${resp.status}`, details: text });
    }

    const data = await resp.json();
    return res.json(data);
  } catch (e) {
    console.error('[PROXY] Error forwarding confirm to Bitrix:', e);
    return res.status(502).json({ error: e.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err && err.message);
  res.status(500).json({ error: err && err.message });
});

app.listen(PORT, () => console.log(`Proxy server listening on ${PORT}`));
