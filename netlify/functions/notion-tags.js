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

    const response = await notion.databases.retrieve({ database_id: DB_ID });

    // Extraer propiedades para clases, categorías y etiquetas
    const props = response.properties;
    const clases = props.Clase?.select?.options?.map((o) => o.name) || [];
    const categorias = props.Categoría?.select?.options?.map((o) => o.name) || [];
    const etiquetas = props.Etiquetas?.multi_select?.options?.map((o) => o.name) || [];

    return {
      statusCode: 200,
      body: JSON.stringify({ clases, categorias, etiquetas }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: error.status || 500,
      body: `Error cargando catálogos: ${error.message}`,
    };
  }
};
