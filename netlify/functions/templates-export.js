import { readAllTemplates } from './_lib/store.js'

export async function handler() {
  const all = await readAllTemplates()
  const esc = (v)=> {
    const s = String(v??'')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s
  }
  const header = ['id','nombre','clase','categorias','etiquetas','mensaje','updatedAt']
  const rows = [header.join(',')]
  for (const t of all) {
    rows.push([
      esc(t.id),
      esc(t.nombre),
      esc(t.clase||''),
      esc((t.categorias||[]).join(';')),
      esc((t.etiquetas||[]).join(';')),
      esc(t.mensaje||''),
      esc(t.updatedAt||'')
    ].join(','))
  }
  const body = rows.join('\n')
  return {
    statusCode: 200,
    headers: {
      'Content-Type':'text/csv; charset=utf-8',
      'Content-Disposition':'attachment; filename="plantillas.csv"'
    },
    body
  }
}
