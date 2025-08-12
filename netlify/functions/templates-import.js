import { readAllTemplates, writeAllTemplates, genId, nowISO } from './_lib/store.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { ok:false, error:'Method not allowed' })
  try {
    const admin = event.headers['x-admin-key'] || event.headers['X-Admin-Key']
    if (!admin || admin !== process.env.ADMIN_KEY) return json(401, { ok:false, error:'Unauthorized' })

    const ct = (event.headers['content-type'] || '').toLowerCase()
    const csv = ct.includes('text/csv') ? (event.body||'') : (JSON.parse(event.body||'{}').csv||'')
    if (!csv) return json(400, { ok:false, error:'Falta CSV' })

    const rows = parseCSV(csv)
    if (!rows.length) return json(400, { ok:false, error:'CSV vacío' })
    const header = rows.shift().map(h=>h.trim().toLowerCase())

    // columnas
    const idx = (name, alts=[]) => {
      const all=[name,...alts].map(s=>s.toLowerCase())
      return header.findIndex(h=>all.includes(h))
    }
    const iId = idx('id')
    const iNombre = idx('nombre',['name'])
    const iClase = idx('clase',['class'])
    const iCategorias = idx('categorias',['categoria','categories'])
    const iEtiquetas = idx('etiquetas',['tags','etiqueta'])
    const iMensaje = idx('mensaje',['message','text'])

    const all = await readAllTemplates()
    let created=0, updated=0

    for (const r of rows) {
      const get = (i)=> (i>=0? (r[i]||'').trim() : '')
      const id = get(iId)
      const nombre = get(iNombre)
      const clase = get(iClase)
      const categorias = (get(iCategorias)).split(';').map(s=>s.trim()).filter(Boolean)
      const etiquetas = (get(iEtiquetas)).split(';').map(s=>s.trim()).filter(Boolean)
      const mensaje = get(iMensaje)
      if (!nombre && !mensaje) continue

      let idxRow = -1
      if (id) idxRow = all.findIndex(x=>x.id===id)
      if (idxRow<0) idxRow = all.findIndex(x=>x.nombre===nombre && x.clase===clase)

      const item = { id: id || genId(), nombre, clase, categorias, etiquetas, mensaje, updatedAt: nowISO() }
      if (idxRow>=0) { all[idxRow]=item; updated++ } else { all.push(item); created++ }
    }

    await writeAllTemplates(all)
    return json(200, { ok:true, created, updated })
  } catch (e) {
    return json(500, { ok:false, error:String(e.message||e) })
  }
}

// CSV simple con comillas
function parseCSV(text){
  const out=[]; let row=[], col='', q=false
  const s = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n')
  for (let i=0;i<s.length;i++){
    const ch=s[i]
    if (ch === '"'){
      if (q && s[i+1] === '"'){ col+='"'; i++ } else { q=!q }
    } else if (ch===',' && !q){ row.push(col); col='' }
    else if (ch==='\n' && !q){ row.push(col); out.push(row); row=[]; col='' }
    else { col+=ch }
  }
  if (col.length || row.length) { row.push(col); out.push(row) }
  return out
}
const json=(s,o)=>({statusCode:s,headers:{'Content-Type':'application/json'},body:JSON.stringify(o)})
