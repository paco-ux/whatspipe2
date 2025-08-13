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
      const r = await fetch(u);
      if(!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
      return r.json();
    };

    const fetchPerson = async (pid)=> (await getJSON(add(`/persons/${pid}`))).data || {};
    const fetchDeal   = async (did)=> (await getJSON(add(`/deals/${did}`))).data || {};
    const fetchOrg    = async (oid)=> (await getJSON(add(`/organizations/${oid}`))).data || {};

    let person = {}, deal = {}, organization = {};
    if (entity === 'deal') {
      deal = await fetchDeal(id);
      if (deal?.person_id?.value || deal?.person_id?.id) person = await fetchPerson(deal.person_id.value || deal.person_id.id);
      if (deal?.org_id?.value || deal?.org_id?.id) organization = await fetchOrg(deal.org_id.value || deal.org_id.id);
    } else if (entity === 'organization') {
      organization = await fetchOrg(id);
    } else {
      person = await fetchPerson(id);
      if (person?.org_id?.value || person?.org_id?.id) organization = await fetchOrg(person.org_id.value || person.org_id.id);
    }

    const name = person?.name || deal?.person_name || deal?.title || organization?.name || '';
    const phone =
      (Array.isArray(person?.phone) && (person.phone[0]?.value || person.phone[0])) ||
      person?.phone || '';

    const flat = {
      person: {
        id: person?.id,
        name: person?.name,
        email: Array.isArray(person?.email) ? (person.email[0]?.value || person.email[0]) : person?.email,
        phone: Array.isArray(person?.phone) ? (person.phone[0]?.value || person.phone[0]) : person?.phone
      },
      deal: {
        id: deal?.id,
        title: deal?.title,
        value: deal?.value,
        currency: deal?.currency,
        stage_id: deal?.stage_id,
        stage_name: deal?.stage_name
      },
      organization: {
        id: organization?.id,
        name: organization?.name
      }
    };

    return json(200, {
      ok:true,
      data: { name: name || '', phone: String(phone||''), person, deal, organization, flat }
    });
  } catch (e) {
    return json(500, { ok:false, error: String(e.message || e) });
  }
}
const json=(s,o)=>({statusCode:s,headers:{'Content-Type':'application/json'},body:JSON.stringify(o)});
