import { readAllTemplates, writeAllTemplates, genId, nowISO } from './_lib/store.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { ok:false, error:'Method not allowed' })
  try {
    const admin = event.headers['x-admin-key'] || event.headers['X-Admin-Key']
    if (!admin || admin !== process.env.ADMIN_KEY) return json(401, { ok:false, error:'Unauthorized' })

    const body = JSON.parse(event.body || '{}')
    if (!body.nombre || !body.mensaje) return json(400, { ok:false, error:'nombre y mensaje son requeridos' })

    const all = await readAllTemplates()
    let created = false
    let t = null

    if (body.id) {
      const idx = all.findIndex(x => x.id === body.id)
      if (idx === -1) return json(404, { ok:false, error:'No existe id' })
      t = { ...all[idx], ...normalize(body), updatedAt: nowISO() }
      all[idx] = t
    } else {
      t = { id: genId(), ...normalize(body), updatedAt: nowISO() }
      all.push(t); created = true
    }

    await writeAllTemplates(all)
    return json(200, { ok:true, created, data:t })
  } catch (e) {
    return json(500, { ok:false, error:String(e.message||e) })
  }
}

function normalize(b){
  return {
    nombre: String(b.nombre||'').trim(),
    clase: String(b.clase||'').trim(),
    categorias: (b.categorias||[]).map(s=>String(s).trim()).filter(Boolean),
    etiquetas: (b.etiquetas||[]).map(s=>String(s).trim()).filter(Boolean),
    mensaje: String(b.mensaje||'')
  }
}
const json=(s,o)=>({statusCode:s,headers:{'Content-Type':'application/json'},body:JSON.stringify(o)})
