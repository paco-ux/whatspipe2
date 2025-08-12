// netlify/functions/notion-templates.js
// Lee plantillas desde Notion con filtros y devuelve JSON plano.
// Requiere env: NOTION_TOKEN, NOTION_TEMPLATES_DB_ID
// Opcionales: NOTION_*_PROP para renombrar propiedades.

const NOTION_VERSION = process.env.NOTION_VERSION || "2022-06-28";

const env = (k, d) => process.env[k] ?? d;
const DB_ID = env("NOTION_TEMPLATES_DB_ID");
const TOKEN = env("NOTION_TOKEN");
const TITLE_PROP = env("NOTION_TITLE_PROP", "Nombre");
const CLASS_PROP = env("NOTION_CLASS_PROP", "Clase");
const CAT_PROP = env("NOTION_CATEGORY_PROP", "Categoria");
const TAGS_PROP = env("NOTION_TAGS_PROP", "Etiquetas");
const MSG_PROP = env("NOTION_MESSAGE_PROP", "Mensaje");

// Helpers
const headers = {
  "Authorization": `Bearer ${TOKEN}`,
  "Notion-Version": NOTION_VERSION,
  "Content-Type": "application/json"
};

const plainText = (rich) => (rich || []).map(b => b.plain_text || "").join("");

const getProp = (page, key) => page.properties?.[key];

const asTitle = (page, key) => plainText(getProp(page, key)?.title || []);
const asSelect = (page, key) => getProp(page, key)?.select?.name || "";
const asMulti = (page, key) => (getProp(page, key)?.multi_select || []).map(o => o.name);
const asRichText = (page, key) => plainText(getProp(page, key)?.rich_text || []);

function buildFilter(qs) {
  const and = [];
  if (qs.clase) {
    and.push({ property: CLASS_PROP, select: { equals: String(qs.clase) } });
  }
  if (qs.categoria) {
    and.push({ property: CAT_PROP, multi_select: { contains: String(qs.categoria) } });
  }
  // ?tag puede venir múltiple: ?tag=A&tag=B
  const tags = [].concat(qs.tag || []);
  tags.filter(Boolean).forEach(t => {
    and.push({ property: TAGS_PROP, multi_select: { contains: String(t) } });
  });
  if (qs.q) {
    and.push({ property: TITLE_PROP, title: { contains: String(qs.q) } });
  }
  if (and.length === 0) return undefined;
  return { and };
}

async function notionQueryAll(body) {
  const url = `https://api.notion.com/v1/databases/${DB_ID}/query`;
  const pageSize = Math.min(Number(body.page_size || 100), 100);
  let cursor = body.start_cursor;
  let out = [];
  do {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, start_cursor: cursor, page_size: pageSize })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Notion query failed: ${res.status} ${res.statusText} – ${text}`);
    }
    const json = await res.json();
    out = out.concat(json.results || []);
    cursor = json.has_more ? json.next_cursor : null;
    // Protección suave para evitar funciones muy largas
    if (out.length >= (Number(body.hard_limit || 500))) break;
  } while (cursor);
  return out;
}

function mapPage(p) {
  return {
    id: p.id,
    nombre: asTitle(p, TITLE_PROP),
    clase: asSelect(p, CLASS_PROP),
    categorias: asMulti(p, CAT_PROP),
    etiquetas: asMulti(p, TAGS_PROP),
    mensaje: asRichText(p, MSG_PROP),
    last_edited_time: p.last_edited_time
  };
}

exports.handler = async (event) => {
  try {
    if (!TOKEN || !DB_ID) {
      return { statusCode: 500, body: JSON.stringify({ ok:false, error:"Missing NOTION_TOKEN or NOTION_TEMPLATES_DB_ID" }) };
    }
    const qs = event.queryStringParameters || {};
    const filter = buildFilter(qs);
    const limit = Math.min(Number(qs.limit || 300), 1000);

    const pages = await notionQueryAll({
      filter,
      sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
      hard_limit: limit
    });

    const data = pages.map(mapPage);
    return {
      statusCode: 200,
      headers: { "Content-Type":"application/json", "Cache-Control":"public, max-age=60" },
      body: JSON.stringify({ ok:true, count: data.length, data })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: String(err && err.message || err) }) };
  }
};
