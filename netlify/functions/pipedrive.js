export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204 };
  try {
    const token = process.env.PIPEDRIVE_API_TOKEN;
    if (!token) return json(500, { ok:false, error:'Missing PIPEDRIVE_API_TOKEN' });

    const qs = event.queryStringParameters || {};
    const entity = (qs.entity || 'person').toLowerCase();
    const id = String(qs.id || '').replace(/\D/g,'');
    if (!id) return json(400, { ok:false, error:'Missing id' });

    const base = 'https://api.pipedrive.com/v1';
    const add = (p) => `${base}${p}${p.includes('?')?'&':'?'}api_token=${encodeURIComponent(token)}`;

    const getJSON = async (u) => {
      const r = await fetch(u); if(!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
      return r.json();
    };

    async function personData(pid){
      const p = await getJSON(add(`/persons/${pid}`));
      const d = p.data || {};
      const raw = (d.phone && d.phone[0] && (d.phone[0].value || d.phone[0])) || '';
      return { name: d.name || '', phone: String(raw||''), personId: d.id || null, organizationName: d.org_name || '' };
    }

    let data;
    if (entity === 'deal') {
      const d = await getJSON(add(`/deals/${id}`));
      const deal = d.data || {};
      data = { name: deal.person_name || deal.title || '', phone:'', personId:null, organizationName: deal.org_name || '' };
      if (deal.person_id && (deal.person_id.value || deal.person_id.id)) {
        data = await personData(deal.person_id.value || deal.person_id.id);
      }
    } else if (entity === 'organization') {
      const o = await getJSON(add(`/organizations/${id}`));
      const org = o.data || {};
      data = { name: org.name || '', phone:'', personId:null, organizationName: org.name || '' };
    } else {
      data = await personData(id);
    }

    return json(200, { ok:true, data });
  } catch (e) {
    return json(500, { ok:false, error: String(e.message || e) });
  }
}
const json=(s,o)=>({statusCode:s,headers:{'Content-Type':'application/json'},body:JSON.stringify(o)});
