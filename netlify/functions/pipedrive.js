// Proxy seguro para Pipedrive (usa env PIPEDRIVE_API_TOKEN)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS };

  try {
    const token = process.env.PIPEDRIVE_API_TOKEN;
    if (!token) return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok:false, error: "Missing PIPEDRIVE_API_TOKEN" }) };

    const qs = event.queryStringParameters || {};
    const entity = (qs.entity || 'person').toLowerCase();
    const id = (qs.id || '').replace(/\D/g, '');
    if (!id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok:false, error:"Missing id" }) };

    const base = 'https://api.pipedrive.com/v1';
    const urlFor = (path) => `${base}${path}${path.includes('?')?'&':'?'}api_token=${encodeURIComponent(token)}`;

    async function getJSON(u){
      const res = await fetch(u);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
      return res.json();
    }

    async function consolidate(entity, id){
      if (entity === 'person') {
        const p = await getJSON(urlFor(`/persons/${id}`));
        const person = p.data || {};
        const rawPhone = (person.phone && person.phone[0] && (person.phone[0].value || person.phone[0])) || '';
        return { name: person.name || '', phone: String(rawPhone||''), personId: person.id || null, organizationName: person.org_name || '' };
      }
      if (entity === 'deal') {
        const d = await getJSON(urlFor(`/deals/${id}`));
        const deal = d.data || {};
        let name = deal.person_name || deal.title || '';
        let phone = '';
        let personId = null;
        if (deal.person_id && (deal.person_id.value || deal.person_id.id)) {
          personId = deal.person_id.value || deal.person_id.id;
          const p = await getJSON(urlFor(`/persons/${personId}`));
          const person = p.data || {};
          name = person.name || name;
          phone = (person.phone && person.phone[0] && (person.phone[0].value || person.phone[0])) || '';
          return { name, phone: String(phone||''), personId: person.id || personId, organizationName: person.org_name || deal.org_name || '' };
        }
        return { name, phone:'', personId, organizationName: deal.org_name || '' };
      }
      if (entity === 'organization') {
        const o = await getJSON(urlFor(`/organizations/${id}`));
        const org = o.data || {};
        return { name: org.name || '', phone:'', personId:null, organizationName: org.name || '' };
      }
      return consolidate('person', id);
    }

    const data = await consolidate(entity, id);
    return { statusCode: 200, headers: { "Content-Type":"application/json", ...CORS }, body: JSON.stringify({ ok:true, data }) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok:false, error: String(err && err.message || err) }) };
  }
};
