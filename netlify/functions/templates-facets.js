// netlify/functions/templates-facets.js
// Devuelve las opciones (facets) de Clase y Categoría leyendo el esquema de la DB de Notion.

export default async (req, res) => {
  try {
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    const NOTION_DB_ID = process.env.NOTION_DB_ID;
    if (!NOTION_TOKEN || !NOTION_DB_ID) {
      return res.status(500).json({ ok: false, error: 'Faltan NOTION_TOKEN o NOTION_DB_ID' });
    }

    const r = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}`, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(500).json({ ok: false, error: `Notion error: ${t}` });
    }
    const db = await r.json();

    const props = db.properties || {};
    const claseProp = props['Clase'];
    const categoriaProp = props['Categoría'] || props['Categoria'] || props['Categoría '];

    const clases = (claseProp?.select?.options || []).map(o => o.name).sort((a,b)=>a.localeCompare(b));
    const categorias = (categoriaProp?.select?.options || []).map(o => o.name).sort((a,b)=>a.localeCompare(b));

    return res.status(200).json({ ok: true, data: { clases, categorias } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
};
