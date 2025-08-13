import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB = process.env.NOTION_DATABASE_ID;

function pageToTemplate(page) {
  const p = page.properties || {};
  return {
    id: page.id,
    nombre: p.Nombre?.title?.[0]?.plain_text || "",
    clase: p.Clase?.select?.name || "",
    categoria: p.Categoria?.select?.name || "",
    etiquetas: (p.Etiquetas?.multi_select || []).map(t => t.name),
    favorita: !!p.Favorita?.checkbox,
    usos: p.Usos?.number || 0,
    ultimoUso: p["Último uso"]?.date?.start || null,
    mensaje: (p.Mensaje?.rich_text || []).map(t => t.plain_text).join("") || ""
  };
}

export async function handler() {
  try {
    let results = [];
    let cursor;
    do {
      const res = await notion.databases.query({ database_id: DB, start_cursor: cursor });
      results = results.concat(res.results);
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);

    const data = results.map(pageToTemplate);
    return { statusCode: 200, body: JSON.stringify({ ok: true, data }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
}
