const DEFAULT_CONFIRM_WEBHOOK = 'https://interpain.bitrix24.ru/rest/1/aigq909p2tgc5twx/crm.lead.update.json';
const CONFIRM_FIELD_CODE = 'UF_CRM_LEAD_1775569282052';
const CONFIRM_FIELD_VALUE = '1507';

function normalizeWebhook(url) {
  return url.replace(/\/+$/, '').replace(/\.json$/, '') + '.json';
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

  const webhook = normalizeWebhook(process.env.BITRIX_CONFIRM_WEBHOOK || DEFAULT_CONFIRM_WEBHOOK);
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
