// Google Sheets integration - Service Account authentication
// Required env vars: GOOGLE_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

// ---- AUTH CLIENT CACHE (avoid re-authenticating on every request) ----
let _sheetClient: any = null;
let _clientTs = 0;
const CLIENT_TTL_MS = 60 * 60 * 1000; // reuse for 1 hour

async function getSheetClient() {
  if (_sheetClient && Date.now() - _clientTs < CLIENT_TTL_MS) {
    return _sheetClient;
  }
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _sheetClient = google.sheets({ version: 'v4', auth });
  _clientTs = Date.now();
  return _sheetClient;
}

// ---- IN-MEMORY SHEET CACHE (30 second TTL per sheet) ----
const sheetCache = new Map<string, { data: string[][]; ts: number }>();
const CACHE_TTL_MS = 30_000;

function invalidarCache(...hojas: string[]) {
  hojas.forEach(h => sheetCache.delete(h));
}

// ---- READ (with cache) ----
export async function leerHoja(nombreHoja: string): Promise<string[][]> {
  const cached = sheetCache.get(nombreHoja);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }
  const sheets = await getSheetClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: nombreHoja,
  });
  const data = (response.data.values as string[][]) || [];
  sheetCache.set(nombreHoja, { data, ts: Date.now() });
  return data;
}

// ---- APPEND (invalidates cache for that sheet) ----
export async function appendFila(nombreHoja: string, datos: any[]): Promise<void> {
  const sheets = await getSheetClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: nombreHoja,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS', // always inserts a new row, never overwrites
    requestBody: { values: [datos] },
  });
  invalidarCache(nombreHoja);
}

// ---- UPDATE RANGE (invalidates cache for that sheet) ----
export async function updateRango(rango: string, datos: any[][]): Promise<void> {
  const sheets = await getSheetClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: rango,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: datos },
  });
  // Extract sheet name from range (e.g. "Stock!K5" → "Stock")
  const hoja = rango.split('!')[0];
  invalidarCache(hoja);
}

// ---- FIND ROW INDEX BY VALUE ----
export async function findRowIndex(hoja: string, colIndex: number, value: string): Promise<number> {
  const data = await leerHoja(hoja);
  for (let i = 1; i < data.length; i++) {
    if (data[i][colIndex] === value) return i + 1;
  }
  return -1;
}

// ---- HELPERS: Map rows to objects ----
function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
}

// ==================== SHEET SERVICES ====================

// --- STOCK / PRODUCTOS ---
export async function getStock() {
  const rows = await leerHoja('Stock');
  return rowsToObjects(rows);
}

export async function createProductoSheet(prod: {
  nombre: string; detalle?: string; casa?: string; categoria?: string;
  precioCompra: string; precioUnidad: string; precioBlister?: string;
  precioCaja?: string; posicion?: string; drogueria?: string;
  stock: number; unidadesBlister?: number; unidadesCaja?: number; barcode?: string;
}) {
  const rows = await leerHoja('Stock');
  const lastId = rows.length > 1 ? parseInt(rows[rows.length - 1][0]) || 0 : 0;
  const newId = lastId + 1;
  await appendFila('Stock', [
    newId, prod.nombre, prod.detalle ?? '', prod.casa ?? '', prod.categoria ?? '',
    prod.precioCompra, prod.precioUnidad, prod.precioBlister ?? '', prod.precioCaja ?? '',
    prod.posicion ?? '', prod.stock, prod.drogueria ?? '',
    prod.unidadesBlister ?? '', prod.unidadesCaja ?? ''
  ]);
  return { id: newId, nombre: prod.nombre, stock: prod.stock };
}

export async function updateStockSheet(id: string, newStock: number) {
  const rows = await leerHoja('Stock');
  if (!rows || rows.length < 2) return;
  const headers = rows[0];
  const stockColIdx = headers.findIndex((h: string) => h.trim().toLowerCase() === 'stock');
  if (stockColIdx < 0) return;
  const colLetter = String.fromCharCode(65 + stockColIdx);
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      await updateRango(`Stock!${colLetter}${i + 1}`, [[newStock]]);
      return;
    }
  }
}

export async function deleteProductoSheet(id: string) {
  const rows = await leerHoja('Stock');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      const cols = rows[i].length;
      const emptyCols = Array(cols).fill('');
      await updateRango(`Stock!A${i + 1}`, [emptyCols]);
      return;
    }
  }
}

// --- VENTAS ---
export async function getVentas() {
  const rows = await leerHoja('Ventas');
  return rowsToObjects(rows);
}

export async function getDetalleVenta(idVenta: string) {
  const rows = await leerHoja('Detalle_Venta');
  const all = rowsToObjects(rows);
  return all.filter(r => r['ID_Venta'] === idVenta);
}

export async function createVentaSheet(params: {
  fecha: string; usuario: string; cliente: string; tipo: string;
  fiadorId: string; metodoPago: string; total: string;
  items: { productoId: string; nombre: string; tipoPrecio: string; cantidad: number; precioUnitario: string; subtotal: string; costoUnitario: string; utilidad: string; }[];
}) {
  const rows = await leerHoja('Ventas');
  const lastId = rows.length > 1 ? parseInt(rows[rows.length - 1][0]) || 0 : 0;
  const newId = (lastId + 1).toString();

  await appendFila('Ventas', [newId, params.fecha, params.usuario, params.cliente, params.tipo, params.fiadorId, params.metodoPago, params.total]);

  for (const item of params.items) {
    await appendFila('Detalle_Venta', [
      newId, item.productoId, item.nombre, item.tipoPrecio,
      item.cantidad, item.precioUnitario, item.subtotal,
      item.costoUnitario, item.utilidad
    ]);
    await updateStockSheet(item.productoId, -1);
  }

  return { id: newId, total: params.total };
}

// --- MOVIMIENTOS ---
export async function getMovimientos() {
  const rows = await leerHoja('Movimientos');
  return rowsToObjects(rows);
}

export async function createMovimientoSheet(params: {
  fecha: string; tipo: string; concepto: string; monto: string; usuario: string; referencia: string;
}) {
  const rows = await leerHoja('Movimientos');
  const lastId = rows.length > 1 ? parseInt(rows[rows.length - 1][0]) || 0 : 0;
  const newId = lastId + 1;
  await appendFila('Movimientos', [newId, params.fecha, params.tipo, params.concepto, params.monto, params.usuario, params.referencia]);
  return { id: newId, ...params };
}

// --- FIADORES ---
export async function getFiadores() {
  const rows = await leerHoja('Fiadores');
  return rowsToObjects(rows);
}

export async function createFiadorSheet(params: {
  nombre: string; telefono: string; direccion: string; limiteCredito?: number; saldoInicial?: number;
}) {
  const rows = await leerHoja('Fiadores');
  const lastId = rows.length > 1 ? parseInt(rows[rows.length - 1][0]) || 0 : 0;
  const newId = lastId + 1;
  await appendFila('Fiadores', [newId, params.nombre, params.telefono, params.direccion, params.limiteCredito ?? 0, params.saldoInicial ?? 0, 'TRUE']);
  return { id: newId, ...params };
}

export async function updateFiadorSaldoSheet(id: string, nuevoSaldo: string) {
  const rows = await leerHoja('Fiadores');
  if (!rows || rows.length < 2) return;
  const headers = rows[0];
  const saldoColIdx = headers.findIndex((h: string) => h.trim().toLowerCase() === 'saldo_actual');
  const colLetter = saldoColIdx >= 0 ? String.fromCharCode(65 + saldoColIdx) : 'F';
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      await updateRango(`Fiadores!${colLetter}${i + 1}`, [[nuevoSaldo]]);
      return;
    }
  }
}

// --- USUARIOS ---
export async function getUsuariosSheet() {
  const rows = await leerHoja('Usuarios');
  return rowsToObjects(rows);
}

export async function createUsuarioSheet(params: { usuario: string; pass: string; rol: string; activo: string }) {
  await appendFila('Usuarios', [params.usuario, params.pass, params.rol, params.activo]);
  return params;
}

export async function updateUsuarioSheet(usuario: string, updates: { pass?: string; rol?: string; activo?: string }) {
  const rows = await leerHoja('Usuarios');
  if (!rows || rows.length < 2) return;
  const headers = rows[0];
  const colIndex = (name: string) => headers.findIndex((h: string) => h.trim() === name);
  const userCol = colIndex('Usuario');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][userCol] === usuario) {
      const passCol = colIndex('Pass');
      const rolCol = colIndex('Rol');
      const activoCol = colIndex('Activo');
      const colLetter = (n: number) => String.fromCharCode(65 + n);
      if (updates.pass !== undefined && updates.pass !== '' && passCol >= 0)
        await updateRango(`Usuarios!${colLetter(passCol)}${i + 1}`, [[updates.pass]]);
      if (updates.rol !== undefined && rolCol >= 0)
        await updateRango(`Usuarios!${colLetter(rolCol)}${i + 1}`, [[updates.rol]]);
      if (updates.activo !== undefined && activoCol >= 0)
        await updateRango(`Usuarios!${colLetter(activoCol)}${i + 1}`, [[updates.activo]]);
      return;
    }
  }
}
