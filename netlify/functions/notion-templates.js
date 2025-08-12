// Lectura de plantillas Notion con filtros (clase, categoria, tag, q)
const NOTION_VERSION = process.env.NOTION_VERSION || "2022-06-28";

const env = (k, d) => process.env[k] ?? d;
const DB_ID = env("NOTION_TEMPLATES_DB_ID");
const TOKEN = env("NOTION_TOKEN");
const TITLE_PROP = env("NOTION_TITLE_PROP", "Nombre");
const CLASS_PROP = env("NOTION_CLASS_PROP", "Clase");
const CAT_PROP = env("NOTION_CATEGORY_PROP", "Categoria");
const TAGS_PROP = env("NOTION_TAGS_PROP", "Etiquetas");
const MSG_PROP = env("NOTION_MESSAGE_PROP", "Mensaje");

const headers = { "Authorization": `Bearer ${TOKEN}`, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json" };
const plainText = (rich) => (rich || []).map(b => b.plain_text || "").join("");
const getProp = (page, key) => page.properties?.[key];
const asTitle = (p,k)=> plainText(getProp(p,k)?.title || []);
const asSelect = (p,k)=> getProp(p,k)?.select?.name || "";
const asMulti  = (p,k)=> (getProp(p,k)?.multi_select || []).map(o=>o.name);
const asRich   = (p,k)=> plainText(getProp(p,k)?.rich_text || []);

function buildFilter(qs) {
  const and = [];
  if (qs.clase) and.push({ property: CLASS_PROP, select: { equals: String(qs.clase) } });
  if (qs.categoria) and.push({ property: CAT_PROP, multi_select: { contains: String(qs.categoria) } });
  const tags = [].concat(qs.tag || []).filter(Boolean);
  tags.forEach(t => and.push({ property: TAGS_PROP, multi_select: { contains: String(t) } }));
  if (qs.q) and.push({ property: TITLE_PROP, title: { contains: String(qs.q) } });
  return and.length ? { and } : undefined;
}

async function notionQueryAll(body) {
  const url = `https://api.notion.com/v1/databases/${DB_ID}/query`;
  const pageSize = Math.min(Number(body.page_size || 100), 100);
  let cursor = body.start_cursor, out = [];
  do {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ ...body, start_cursor: cursor, page_size: pageSize }) });
    if (!res.ok) throw new Error(`Notion query failed: ${res.status} ${res.statusText} – ${await res.text()}`);
    const json = await res.json();
    out = out.concat(json.results || []);
    cursor = json.has_more ? json.next_cursor : null;
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
    mensaje: asRich(p, MSG_PROP),
    last_edited_time: p.last_edited_time
  };
}

exports.handler = async (event) => {
  try {
    if (!TOKEN || !DB_ID) return { statusCode: 500, body: JSON.stringify({ ok:false, error:"Missing NOTION_TOKEN or NOTION_TEMPLATES_DB_ID" }) };
    const qs = event.queryStringParameters || {};
    const filter = buildFilter(qs);
    const limit = Math.min(Number(qs.limit || 300), 1000);

    const pages = await notionQueryAll({ filter, sorts: [{ timestamp: "last_edited_time", direction: "descending" }], hard_limit: limit });
    const data = pages.map(mapPage);

    return { statusCode: 200, headers: { "Content-Type":"application/json", "Cache-Control":"public, max-age=60" }, body: JSON.stringify({ ok:true, count: data.length, data }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: String(err && err.message || err) }) };
  }
};
