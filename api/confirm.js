const CONFIRM_FIELD_CODE = 'UF_CRM_LEAD_1775569282052';
const CONFIRM_FIELD_VALUE = '1507';

function normalizeWebhook(url) {
  return url.replace(/\/+$/, '').replace(/\.json$/, '') + '.json';
}

function deriveUpdateWebhook(baseWebhook) {
  const normalized = normalizeWebhook(baseWebhook);
  return normalized.replace(/crm\.lead\.add(?:\.json)?$/i, 'crm.lead.update.json');
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
  const url = new URL(webhook);
  url.searchParams.set('id', id);
  url.searchParams.set(`fields[${CONFIRM_FIELD_CODE}]`, CONFIRM_FIELD_VALUE);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Bitrix HTTP ${response.status}`, details: text });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[Vercel API] Confirm forwarding failed:', error);
    return res.status(502).json({ error: error.message || 'Confirm forwarding failed' });
  }
}
