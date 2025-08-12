import { readAllTemplates } from './_lib/store.js'

export async function handler(event) {
  try {
    const qs = event.queryStringParameters || {}
    const q = (qs.q || '').toLowerCase().trim()
    const clase = (qs.clase || '').toLowerCase().trim()
    const categoria = (qs.categoria || '').toLowerCase().trim()
    const tags = []
      .concat(qs.tag || [])
      .flatMap(t => String(t||'').split(','))
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)

    const all = await readAllTemplates()

    const meta = {
      clases: [...new Set(all.map(x => (x.clase||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b)),
      categorias: [...new Set(all.flatMap(x => x.categorias||[]).map(s=>s.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b)),
      etiquetas: [...new Set(all.flatMap(x => x.etiquetas||[]).map(s=>s.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b))
    }

    let data = all.filter(t => {
      if (clase && String(t.clase||'').toLowerCase() !== clase) return false
      if (categoria && !(t.categorias||[]).map(s=>s.toLowerCase()).includes(categoria)) return false
      if (tags.length && !tags.every(tg => (t.etiquetas||[]).map(s=>s.toLowerCase()).includes(tg))) return false
      if (q && !String(t.nombre||'').toLowerCase().includes(q)) return false
      return true
    })

    return json(200, { ok:true, count:data.length, data, meta })
  } catch (e) {
    return json(500, { ok:false, error:String(e.message||e) })
  }
}

const json = (s,o)=>({statusCode:s,headers:{'Content-Type':'application/json'},body:JSON.stringify(o)})
