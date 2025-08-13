import { Client } from "@notionhq/client";
const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function handler(event) {
  if (event.httpMethod !== "POST") return resp(405, { ok: false, error: "Use POST" });
  try {
    const { pageId, favorita } = JSON.parse(event.body || "{}");
    if (!pageId || typeof favorita !== "boolean") {
      return resp(400, { ok: false, error: "pageId y favorita(boolean) son requeridos" });
    }

    await notion.pages.update({
      page_id: pageId,
      properties: { Favorita: { checkbox: favorita } }
    });

    return resp(200, { ok: true });
  } catch (e) {
    return resp(500, { ok: false, error: String(e.message || e) });
  }
}
const resp = (s, b) => ({ statusCode: s, headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
