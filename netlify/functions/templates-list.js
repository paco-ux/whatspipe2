// /netlify/functions/templates-list.js
// Lista plantillas de Notion filtradas por clase y categoría.
// Corrige el mapeo de propiedades (title, rich_text, select, multi_select, checkbox, number).

export default async (req, res) => {
  try {
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    const NOTION_DB_ID = process.env.NOTION_DB_ID;
    if (!NOTION_TOKEN || !NOTION_DB_ID) {
      return res.status(500).json({ ok: false, error: 'Faltan NOTION_TOKEN o NOTION_DB_ID' });
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const cls = (url.searchParams.get('class') || '').trim();
    const cat = (url.searchParams.get('category') || '').trim();
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();

    if (!cls || !cat) {
      return res.status(400).json({ ok: false, error: 'Se requiere class y category' });
    }

    // Filtro compuesto (Select = nombre exacto)
    const body = {
      page_size: 100,
      filter: {
        and: [
          { property: 'Clase', select: { equals: cls } },
          { property: 'Categoría', select: { equals: cat } }
        ]
      },
      sorts: [{ property: 'Usos', direction: 'descending' }]
    };

    const r = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(500).json({ ok: false, error: `Notion error: ${t}` });
    }
    const data = await r.json();
    const results = (data.results || []).map(pg => {
      const p = pg.properties || {};

      // Nombre (Title)
      let nombre = '';
      const titleArr = p['Nombre']?.title || p['Nombre de la plantilla']?.title || [];
      if (Array.isArray(titleArr) && titleArr.length) {
        nombre = titleArr.map(t => t.plain_text || '').join('').trim();
      }

      // Mensaje (Rich text)
      let mensaje = '';
      const rt = p['Mensaje']?.rich_text || [];
      if (Array.isArray(rt) && rt.length) {
        mensaje = rt.map(t => t.plain_text || '').join('').trim();
      }

      // Clase / Categoría
      const clase = p['Clase']?.select?.name || '';
      const categoria = p['Categoría']?.select?.name || p['Categoria']?.select?.name || '';

      // Etiquetas (multi_select)
      const etiquetas = (p['Etiquetas']?.multi_select || []).map(e => e.name);

      // Favorita / Usos
      const favorita = !!p['Favorita']?.checkbox;
      const usos = (typeof p['Usos']?.number === 'number') ? p['Usos'].number : 0;

      return {
        id: pg.id,
        nombre: nombre || '(Sin nombre)',
        mensaje,
        clase,
        categoria,
        etiquetas,
        favorita,
        usos
      };
    });

    // Filtro por búsqueda (en backend para evitar traer demasiados)
    const filtered = q
      ? results.filter(r => r.nombre.toLowerCase().includes(q))
      : results;

    return res.status(200).json({ ok: true, data: filtered });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
};
