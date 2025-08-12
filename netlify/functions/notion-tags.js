// Catálogos de Clase, Categoria, Etiquetas desde Notion
const NOTION_VERSION = process.env.NOTION_VERSION || "2022-06-28";

const env = (k, d) => process.env[k] ?? d;
const DB_ID = env("NOTION_TEMPLATES_DB_ID");
const TOKEN = env("NOTION_TOKEN");
const TITLE_PROP = env("NOTION_TITLE_PROP", "Nombre");
const CLASS_PROP = env("NOTION_CLASS_PROP", "Clase");
const CAT_PROP = env("NOTION_CATEGORY_PROP", "Categoria");
const TAGS_PROP = env("NOTION_TAGS_PROP", "Etiquetas");

const headers = { "Authorization": `Bearer ${TOKEN}`, "Notion-Version": NOTION_VERSION };

function readOptions(prop) {
  if (!prop) return [];
  if (prop.type === "select") return (prop.select?.options || []).map(o => o.name);
  if (prop.type === "multi_select") return (prop.multi_select?.options || []).map(o => o.name);
  return [];
}

exports.handler = async () => {
  try {
    if (!TOKEN || !DB_ID) return { statusCode: 500, body: JSON.stringify({ ok:false, error:"Missing NOTION_TOKEN or NOTION_TEMPLATES_DB_ID" }) };

    const res = await fetch(`https://api.notion.com/v1/databases/${DB_ID}`, { headers });
    if (!res.ok) throw new Error(`Notion get database failed: ${res.status} ${res.statusText}: ${await res.text()}`);
    const db = await res.json();
    const props = db.properties || {};

    const clases = readOptions(props[CLASS_PROP]).sort((a,b)=>a.localeCompare(b));
    const categorias = readOptions(props[CAT_PROP]).sort((a,b)=>a.localeCompare(b));
    const etiquetas = readOptions(props[TAGS_PROP]).sort((a,b)=>a.localeCompare(b));

    return {
      statusCode: 200,
      headers: { "Content-Type":"application/json", "Cache-Control":"public, max-age=60" },
      body: JSON.stringify({ ok:true, properties: { title: TITLE_PROP, clase: CLASS_PROP, categoria: CAT_PROP, etiquetas: TAGS_PROP }, clases, categorias, etiquetas })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: String(err && err.message || err) }) };
  }
};
