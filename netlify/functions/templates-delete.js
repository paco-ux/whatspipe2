import { readAllTemplates, writeAllTemplates } from './_lib/store.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { ok:false, error:'Method not allowed' })
  try {
    const admin = event.headers['x-admin-key'] || event.headers['X-Admin-Key']
    if (!admin || admin !== process.env.ADMIN_KEY) return json(401, { ok:false, error:'Unauthorized' })

    const { id } = JSON.parse(event.body || '{}')
    if (!id) return json(400, { ok:false, error:'Falta id' })

    const all = await readAllTemplates()
    const newAll = all.filter(x => x.id !== id)
    if (newAll.length === all.length) return json(404, { ok:false, error:'No existe id' })

    await writeAllTemplates(newAll)
    return json(200, { ok:true, deleted:true })
  } catch (e) {
    return json(500, { ok:false, error:String(e.message||e) })
  }
}
const json=(s,o)=>({statusCode:s,headers:{'Content-Type':'application/json'},body:JSON.stringify(o)})
