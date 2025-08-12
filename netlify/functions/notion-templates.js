const { Client } = require("@notionhq/client");

exports.handler = async (event) => {
  try {
    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
    });

    // Permite pasar el ID por query (?db=) o usar env var
    const DB_ID =
      event?.queryStringParameters?.db ||
      process.env.NOTION_TEMPLATES_DB_ID;

    if (!DB_ID) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Falta NOTION_TEMPLATES_DB_ID o parámetro ?db=" }),
      };
    }

    const query = await notion.databases.query({ database_id: DB_ID });

    // Mapear las filas a un formato más simple
    const templates = query.results.map((page) => {
      const props = page.properties;
      return {
        id: page.id,
        nombre: props.Nombre?.title?.[0]?.plain_text || "Sin nombre",
        clase: props.Clase?.select?.name || null,
        categoria: props.Categoría?.select?.name || null,
        etiquetas: props.Etiquetas?.multi_select?.map((t) => t.name) || [],
        mensaje: props.Mensaje?.rich_text?.[0]?.plain_text || "",
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ total: templates.length, templates }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: error.status || 500,
      body: `Error cargando plantillas: ${error.message}`,
    };
  }
};
