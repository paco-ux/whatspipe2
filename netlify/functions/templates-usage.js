import { Client } from "@notionhq/client";
const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function handler(event) {
  if (event.httpMethod !== "POST") return resp(405, { ok: false, error: "Use POST" });
  try {
    const { pageId } = JSON.parse(event.body || "{}");
    if (!pageId) return resp(400, { ok: false, error: "pageId requerido" });

    const page = await notion.pages.retrieve({ page_id: pageId });
    const usosActual = page.properties?.Usos?.number || 0;

    await notion.pages.update({
      page_id: pageId,
      properties: {
        Usos: { number: usosActual + 1 },
        "Último uso": { date: { start: new Date().toISOString() } }
      }
    });

    return resp(200, { ok: true, usos: usosActual + 1 });
  } catch (e) {
    return resp(500, { ok: false, error: String(e.message || e) });
  }
}
const resp = (s, b) => ({ statusCode: s, headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
