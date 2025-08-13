// netlify/functions/pipedrive.js
// Devuelve nombre y teléfono principal de un deal en Pipedrive.
// Env vars: PIPEDRIVE_DOMAIN, PIPEDRIVE_API_TOKEN
// Uso: /api/pipedrive?deal=12345  o  /api/pipedrive?deal=https://empresa.pipedrive.com/deal/12345

const pickDigits = (s = '') => (s || '').replace(/[^\d]/g, '');

const getDealId = (raw = '') => {
  // soporta URL o id
  const m = String(raw).match(/deal\/(\d+)/);
  if (m) return m[1];
  const onlyDigits = String(raw).match(/(\d{2,})/);
  return onlyDigits ? onlyDigits[1] : null;
};

export default async (req, res) => {
  try {
    const { deal } = req.query || {};
    const PIPEDRIVE_DOMAIN = process.env.PIPEDRIVE_DOMAIN;
    const PIPEDRIVE_API_TOKEN = process.env.PIPEDRIVE_API_TOKEN;

    if (!PIPEDRIVE_DOMAIN || !PIPEDRIVE_API_TOKEN) {
      return res.status(500).json({ ok: false, error: 'Faltan PIPEDRIVE_DOMAIN o PIPEDRIVE_API_TOKEN' });
    }
    const dealId = getDealId(deal);
    if (!dealId) return res.status(400).json({ ok: false, error: 'Parámetro "deal" inválido' });

    const base = `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1`;

    // 1) Deal
    const dResp = await fetch(`${base}/deals/${dealId}?api_token=${PIPEDRIVE_API_TOKEN}`);
    const dJson = await dResp.json();
    if (!dResp.ok || !dJson?.data) {
      return res.status(404).json({ ok: false, error: 'Deal no encontrado' });
    }
    const dealData = dJson.data;

    // 2) Persona principal
    let personName = '';
    let phone = '';

    const personId = dealData.person_id?.value || dealData.person_id || null;
    if (personId) {
      const pResp = await fetch(`${base}/persons/${personId}?api_token=${PIPEDRIVE_API_TOKEN}`);
      const pJson = await pResp.json();
      if (pResp.ok && pJson?.data) {
        personName = pJson.data.name || '';
        // Phone puede venir como array
        const phoneField = Array.isArray(pJson.data.phone) ? pJson.data.phone[0] : pJson.data.phone;
        phone = (typeof phoneField === 'object' ? phoneField?.value : phoneField) || '';
      }
    }

    // Fallback: intenta por participante si no hubo phone
    if (!phone && dealData.participants_count > 0) {
      const partsResp = await fetch(`${base}/deals/${dealId}/participants?api_token=${PIPEDRIVE_API_TOKEN}`);
      const partsJson = await partsResp.json();
      const first = partsJson?.data?.[0];
      if (first?.person?.name) personName = personName || first.person.name;
      if (first?.person?.phone) phone = phone || first.person.phone;
    }

    // Saneado simple del teléfono, no agregamos país aquí; lo hará el front si se marca la casilla.
    const cleanPhone = pickDigits(phone);

    return res.status(200).json({
      ok: true,
      data: {
        name: personName || '',
        phone: cleanPhone || '',
        dealTitle: dealData.title || '',
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
};
