// IA Farmacia - Búsqueda inteligente, recomendaciones y análisis de stock
// Requiere: GROQ_API_KEY en variables de entorno
import type { Express } from "express";
import OpenAI from "openai";
import { getStock, getMovimientos } from "./googleSheets";

let _groqClient: OpenAI | null = null;
function getGroq(): OpenAI {
  if (!_groqClient) {
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Falta GROQ_API_KEY en las variables de entorno");
    _groqClient = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
  }
  return _groqClient;
}

// Extrae JSON de una respuesta que puede venir con markdown ```json ... ```
function extractJson(raw: string): any {
  if (!raw) return {};
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Busca el primer bloque { ... } o [ ... ]
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try { return JSON.parse(match[1]); } catch { return {}; }
    }
    return {};
  }
}

function parseNum(val: string): number {
  return parseFloat(String(val).replace(",", ".")) || 0;
}

export function registerAIRoutes(app: Express) {

  // POST /api/ai/info-producto - Dosificación y recomendaciones de un producto específico
  app.post("/api/ai/info-producto", async (req, res) => {
    const { id, nombre, detalle, categoria } = req.body;
    if (!nombre) return res.status(400).json({ message: "nombre requerido" });

    try {
      const completion = await getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Eres el asistente farmacéutico de una farmacia en Guatemala. 
Un cliente pregunta sobre un medicamento o producto.
Responde SOLO con JSON válido en este formato (sin markdown, sin explicación):
{
  "dosificacion": "Instrucción clara de cuánto tomar y cada cuánto (ej: 1 tableta cada 8 horas, máximo 3 al día)",
  "duracionTratamiento": "cuántos días se toma normalmente (ej: 5 a 7 días, o 'según indicación médica')",
  "indicaciones": ["para qué sirve punto 1", "para qué sirve punto 2"],
  "contraindicaciones": ["no tomar si... punto 1"],
  "recomendaciones": ["recomendación práctica 1", "recomendación práctica 2"],
  "consejo": "Consejo breve y práctico para el paciente",
  "requierReceta": true
}
Sé preciso, práctico y usa lenguaje sencillo para Guatemala.
Si es un producto general (jabón, hisopos, etc.) adapta la respuesta para instrucciones de uso.`
          },
          {
            role: "user",
            content: `Producto: ${nombre}${detalle ? ` ${detalle}` : ""}${categoria ? ` (Categoría: ${categoria})` : ""}`
          }
        ],
        max_tokens: 600,
      });

      const content = completion.choices[0]?.message?.content || "{}";
      const parsed = extractJson(content);
      res.json({ ...parsed, producto: { id, nombre, detalle, categoria } });
    } catch (err: any) {
      console.error("AI info-producto error:", err.message);
      res.status(500).json({ message: "Error IA: " + err.message });
    }
  });

  // POST /api/ai/buscar - Búsqueda inteligente por síntoma o nombre
  app.post("/api/ai/buscar", async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ message: "query requerido" });

    try {
      const stock = await getStock();
      const todos = stock
        .filter((p: any) => p.ID && p.Nombre)
        .map((p: any) => ({
          id: p.ID,
          nombre: p.Nombre,
          detalle: p.Detalle || "",
          categoria: p.Categoria || "",
          precioUnidad: parseNum(p["Precio unidad"]),
        }));

      const q = query.toLowerCase();
      const palabras = q.split(/\s+/).filter(Boolean);
      const preFiltered = todos.filter((p: any) => {
        const haystack = `${p.nombre} ${p.detalle} ${p.categoria}`.toLowerCase();
        return palabras.some((w: string) => haystack.includes(w));
      });

      const candidatos = preFiltered.length > 0
        ? preFiltered.slice(0, 60)
        : todos.slice(0, 40);

      const catalogoTexto = candidatos
        .map((p: any) => `ID:${p.id} | ${p.nombre} ${p.detalle} | Cat: ${p.categoria} | Precio: Q${p.precioUnidad}`)
        .join("\n");

      const completion = await getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Eres el asistente de una farmacia en Guatemala. El usuario busca un medicamento o producto.
Tu tarea: analizar el catálogo y devolver los productos más relevantes para la búsqueda.
Responde SOLO con JSON válido en este formato exacto, sin markdown:
{
  "resultados": [
    { "id": "P-000001", "nombre": "Nombre", "detalle": "detalle", "categoria": "cat", "precioUnidad": 10, "relevancia": "Por qué este producto es relevante" }
  ],
  "sugerencia": "Texto breve con consejo o aclaración si aplica"
}
Máximo 6 resultados. Si no hay coincidencias claras, devuelve los más cercanos.`
          },
          {
            role: "user",
            content: `Catálogo disponible:\n${catalogoTexto}\n\nBúsqueda del cliente: "${query}"`
          }
        ],
        max_tokens: 1000,
      });

      const content = completion.choices[0]?.message?.content || "{}";
      const parsed = extractJson(content);
      res.json(parsed);
    } catch (err: any) {
      console.error("AI buscar error:", err.message, err.status, err.error);
      res.status(500).json({ message: "Error en búsqueda IA: " + err.message });
    }
  });

  // POST /api/ai/recomendar - Recomendaciones complementarias o alternativas
  app.post("/api/ai/recomendar", async (req, res) => {
    const { productoId, nombre } = req.body;
    if (!productoId && !nombre) return res.status(400).json({ message: "productoId o nombre requerido" });

    try {
      const stock = await getStock();
      const productos = stock
        .filter((p: any) => p.ID && p.Nombre)
        .map((p: any) => ({
          id: p.ID,
          nombre: p.Nombre,
          detalle: p.Detalle || "",
          categoria: p.Categoria || "",
          precioUnidad: parseNum(p["Precio unidad"]),
        }));

      const productoBase = productos.find((p: any) => p.id === productoId || p.nombre.toLowerCase() === (nombre || "").toLowerCase());
      const catalogoTexto = productos
        .map((p: any) => `ID:${p.id} | ${p.nombre} ${p.detalle} | Cat: ${p.categoria} | Q${p.precioUnidad}`)
        .join("\n");

      const completion = await getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Eres el asistente de una farmacia en Guatemala. 
Tu tarea: dado un producto, recomendar otros productos complementarios o alternativos del catálogo.
Considera combinaciones médicas comunes (ej: antibiótico + probiótico, analgésico + antiinflamatorio).
Responde SOLO con JSON válido sin markdown:
{
  "complementarios": [
    { "id": "P-000001", "nombre": "Nombre", "detalle": "detalle", "precioUnidad": 10, "razon": "Por qué se recomienda junto" }
  ],
  "alternativos": [
    { "id": "P-000002", "nombre": "Nombre", "detalle": "detalle", "precioUnidad": 8, "razon": "Es alternativa por..." }
  ],
  "nota": "Nota médica breve si aplica"
}
Máximo 3 de cada tipo.`
          },
          {
            role: "user",
            content: `Producto seleccionado: ${productoBase ? `${productoBase.nombre} ${productoBase.detalle} (Cat: ${productoBase.categoria})` : nombre || productoId}\n\nCatálogo disponible:\n${catalogoTexto}`
          }
        ],
        max_tokens: 800,
      });

      const content = completion.choices[0]?.message?.content || "{}";
      const parsed = extractJson(content);
      res.json(parsed);
    } catch (err: any) {
      console.error("AI recomendar error:", err.message);
      res.status(500).json({ message: "Error en recomendaciones IA: " + err.message });
    }
  });

  // POST /api/ai/duracion - Estima cuánto durará el stock actual
  app.post("/api/ai/duracion", async (req, res) => {
    const { productoId } = req.body;
    if (!productoId) return res.status(400).json({ message: "productoId requerido" });

    try {
      const [stock, movimientos] = await Promise.all([getStock(), getMovimientos()]);

      const producto = stock.find((p: any) => p.ID === productoId);
      if (!producto) return res.status(404).json({ message: "Producto no encontrado" });

      const stockActual = parseInt(producto.Stock) || 0;
      const nombre = producto.Nombre;
      const precioUnidad = parseNum(producto["Precio unidad"]);
      const precioCompra = parseNum(producto["Precio compra"]);

      const ventasRelacionadas = movimientos.filter((m: any) =>
        m.Concepto && m.Concepto.toLowerCase().includes(nombre.toLowerCase().split(" ")[0])
      );

      const completion = await getGroq().chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Eres un analista de inventario para una farmacia en Guatemala.
Tu tarea: estimar cuánto durará el stock actual de un medicamento y dar recomendaciones.
Considera que es una farmacia pequeña de barrio en Guatemala.
Responde SOLO con JSON válido sin markdown:
{
  "diasEstimados": 30,
  "semanas": 4,
  "nivel": "ok",
  "mensaje": "Con el stock actual se estima una duración de X días",
  "recomendacion": "Sugerencia de reorden o acción",
  "alertas": ["alerta si stock bajo"],
  "margenUtilidad": "15%",
  "puntoPedido": 20
}
Niveles posibles: "critico" (< 7 días), "bajo" (7-14 días), "ok" (15-30 días), "alto" (> 30 días)`
          },
          {
            role: "user",
            content: `Producto: ${nombre} ${producto.Detalle || ""}
Categoría: ${producto.Categoria || "N/A"}
Stock actual: ${stockActual} unidades
Precio de compra: Q${precioCompra}
Precio de venta unidad: Q${precioUnidad}
Droguería: ${producto.Drogueria || "N/A"}
Historial de movimientos relacionados: ${ventasRelacionadas.length} registros encontrados
${ventasRelacionadas.length > 0 ? ventasRelacionadas.slice(0, 5).map((m: any) => `- ${m.Fecha}: ${m.Concepto} Q${m.Monto}`).join("\n") : "Sin historial de ventas registrado"}`
          }
        ],
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content || "{}";
      const parsed = extractJson(content);
      res.json({
        ...parsed,
        producto: { id: productoId, nombre, stockActual, precioUnidad, precioCompra },
      });
    } catch (err: any) {
      console.error("AI duracion error:", err.message);
      res.status(500).json({ message: "Error en análisis IA: " + err.message });
    }
  });
}
