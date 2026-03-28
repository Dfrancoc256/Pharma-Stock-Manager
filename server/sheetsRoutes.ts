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
  hojas.forEach((h) => sheetCache.delete(h));
}

// ---- HELPERS ----
function toNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const clean = String(value).replace(/,/g, '').replace(/Q/gi, '').trim();
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function toInt(value: any): number {
  return Math.trunc(toNumber(value));
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
    insertDataOption: 'INSERT_ROWS',
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

  const hoja = rango.split('!')[0];
  invalidarCache(hoja);
}

// ---- FIND ROW INDEX BY VALUE ----
export async function findRowIndex(hoja: string, colIndex: number, value: string): Promise<number> {
  const data = await leerHoja(hoja);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex] ?? '').trim() === String(value).trim()) return i + 1;
  }
  return -1;
}

// ---- HELPERS: Map rows to objects ----
function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    return obj;
  });
}

// ==================== SHEET SERVICES ====================

// --- STOCK / PRODUCTOS ---
export async function getStock() {
  const rows = await leerHoja('Stock');
  const all = rowsToObjects(rows);

  return all.map((p) => ({
    ...p,
    StockNum: toInt(p['Stock']),
    PrecioCompraNum: toNumber(p['Precio compra']),
    PrecioUnidadNum: toNumber(p['Precio unidad']),
    PrecioBlisterNum: toNumber(p['Precio blister']),
    PrecioCajaNum: toNumber(p['precio caja']),
    UnidadesBlisterNum: toInt(p['Unidades blister']),
    UnidadesCajaNum: toInt(p['Unidades caja']),
  }));
}

export async function createProductoSheet(prod: {
  nombre: string;
  detalle?: string;
  casa?: string;
  categoria?: string;
  precioCompra: string | number;
  precioUnidad: string | number;
  precioBlister?: string | number;
  precioCaja?: string | number;
  posicion?: string;
  drogueria?: string;
  stock: number;
  unidadesBlister?: number;
  unidadesCaja?: number;
  barcode?: string;
}) {
  const rows = await leerHoja('Stock');
  const lastId = rows.length > 1 ? parseInt(rows[rows.length - 1][0]) || 0 : 0;
  const newId = lastId + 1;

  await appendFila('Stock', [
    newId,
    prod.nombre,
    prod.detalle ?? '',
    prod.casa ?? '',
    prod.categoria ?? '',
    toNumber(prod.precioCompra),
    toNumber(prod.precioUnidad),
    toNumber(prod.precioBlister ?? 0),
    toNumber(prod.precioCaja ?? 0),
    prod.posicion ?? '',
    toInt(prod.stock),
    prod.drogueria ?? '',
    toInt(prod.unidadesBlister ?? 0),
    toInt(prod.unidadesCaja ?? 0),
  ]);

  return { id: newId, nombre: prod.nombre, stock: toInt(prod.stock) };
}

export async function updateStockSheet(id: string, newStock: number) {
  const rows = await leerHoja('Stock');
  if (!rows || rows.length < 2) return;

  const headers = rows[0];
  const stockColIdx = headers.findIndex((h: string) => h.trim().toLowerCase() === 'stock');
  if (stockColIdx < 0) return;

  const colLetter = String.fromCharCode(65 + stockColIdx);

  for (let i = 1; i < rows.length; i++) {
    const idFila = String(rows[i][0] ?? '').trim();
    const coincide =
      idFila === String(id).trim() ||
      (!isNaN(Number(idFila)) &&
        !isNaN(Number(id)) &&
        Math.round(Number(idFila)) === Math.round(Number(id)));

    if (coincide) {
      await updateRango(`Stock!${colLetter}${i + 1}`, [[Math.max(0, toInt(newStock))]]);
      return;
    }
  }
}

export async function deleteProductoSheet(id: string) {
  const rows = await leerHoja('Stock');
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] ?? '').trim() === String(id).trim()) {
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
  const all = rowsToObjects(rows);

  return all.map((v) => ({
    ...v,
    TotalNum: toNumber(v['Total']),
  }));
}

export async function getDetalleVenta(idVenta: string) {
  const rows = await leerHoja('Detalle_Venta');
  const all = rowsToObjects(rows).map((r) => ({
    ...r,
    CantidadNum: toInt(r['Cantidad']),
    PrecioUnitarioNum: toNumber(r['PrecioUnitario']),
    SubtotalNum: toNumber(r['Subtotal']),
    CostoUnitarioNum: toNumber(r['CostoUnitario']),
    UtilidadNum: toNumber(r['Utilidad']),
  }));

  return all.filter((r) => r['ID_Venta'] === idVenta);
}

export async function createVentaSheet(params: {
  fecha: string;
  usuario: string;
  cliente: string;
  tipo: string;
  fiadorId: string;
  metodoPago: string;
  total: string | number;
  items: {
    productoId: string;
    nombre: string;
    tipoPrecio: string;
    cantidad: number;
    precioUnitario: string | number;
    subtotal: string | number;
    costoUnitario: string | number;
    utilidad: string | number;
  }[];
}) {
  const rows = await leerHoja('Ventas');
  const lastId = rows.length > 1 ? parseInt(rows[rows.length - 1][0]) || 0 : 0;
  const newId = (lastId + 1).toString();

  await appendFila('Ventas', [
    newId,
    params.fecha,
    params.usuario,
    params.cliente,
    params.tipo,
    params.fiadorId,
    params.metodoPago,
    toNumber(params.total),
  ]);

  const stockRows = await leerHoja('Stock');
  const stockHeaders = stockRows[0] || [];
  const stockColIdx = stockHeaders.findIndex((h: string) => h.trim().toLowerCase() === 'stock');
  const stockColLetter = stockColIdx >= 0 ? String.fromCharCode(65 + stockColIdx) : null;

  for (const item of params.items) {
    const cantidad = toInt(item.cantidad);
    const precioUnitario = toNumber(item.precioUnitario);
    const subtotal = toNumber(item.subtotal);
    const costoUnitario = toNumber(item.costoUnitario);
    const utilidad = toNumber(item.utilidad);

    await appendFila('Detalle_Venta', [
      newId,
      item.productoId,
      item.nombre,
      item.tipoPrecio,
      cantidad,
      precioUnitario,
      subtotal,
      costoUnitario,
      utilidad,
    ]);

    if (stockColLetter) {
      for (let i = 1; i < stockRows.length; i++) {
        const idFila = String(stockRows[i][0] ?? '').trim();
        const idBuscado = String(item.productoId).trim();
        const coincide =
          idFila === idBuscado ||
          (!isNaN(Number(idFila)) &&
            !isNaN(Number(idBuscado)) &&
            Math.round(Number(idFila)) === Math.round(Number(idBuscado)));

        if (coincide) {
          const stockActual = toInt(stockRows[i][stockColIdx]);
          const nuevoStock = Math.max(0, stockActual - cantidad);
          await updateRango(`Stock!${stockColLetter}${i + 1}`, [[nuevoStock]]);
          stockRows[i][stockColIdx] = String(nuevoStock);
          break;
        }
      }
    }
  }

  return { id: newId, total: toNumber(params.total) };
}

// --- MOVIMIENTOS ---
export async function getMovimientos() {
  const rows = await leerHoja('Movimientos');
  const all = rowsToObjects(rows);

  return all.map((m) => ({
    ...m,
    MontoNum: toNumber(m['Monto']),
  }));
}

export async function createMovimientoSheet(params: {
  fecha: string;
  tipo: string;
  concepto: string;
  monto: string | number;
  usuario: string;
  referencia: string;
}) {
  const rows = await leerHoja('Movimientos');
  const lastId = rows.length > 1 ? parseInt(rows[rows.length - 1][0]) || 0 : 0;
  const newId = lastId + 1;

  await appendFila('Movimientos', [
    newId,
    params.fecha,
    params.tipo,
    params.concepto,
    toNumber(params.monto),
    params.usuario,
    params.referencia,
  ]);

  return { id: newId, ...params, monto: toNumber(params.monto) };
}

// --- FIADORES ---
export async function getFiadores() {
  const rows = await leerHoja('Fiadores');
  const all = rowsToObjects(rows);

  return all.map((f) => ({
    ...f,
    LimiteCreditoNum: toNumber(f['Limite_credito'] ?? (f as any)['LimiteCredito']),
    SaldoActualNum: toNumber(f['Saldo_actual']),
  }));
}

export async function createFiadorSheet(params: {
  nombre: string;
  telefono: string;
  direccion: string;
  limiteCredito?: number;
  saldoInicial?: number;
}) {
  const rows = await leerHoja('Fiadores');
  const lastId = rows.length > 1 ? parseInt(rows[rows.length - 1][0]) || 0 : 0;
  const newId = lastId + 1;
  await appendFila('Fiadores', [
    newId,
    params.nombre,
    params.telefono,
    params.direccion,
    toNumber(params.limiteCredito ?? 0),
    toNumber(params.saldoInicial ?? 0),
    'TRUE',
  ]);
  return { id: newId, ...params };
}

export async function updateFiadorSaldoSheet(id: string, nuevoSaldo: string | number) {
  const rows = await leerHoja('Fiadores');
  if (!rows || rows.length < 2) return;

  const headers = rows[0];
  const saldoColIdx = headers.findIndex((h: string) => h.trim().toLowerCase() === 'saldo_actual');
  const colLetter = saldoColIdx >= 0 ? String.fromCharCode(65 + saldoColIdx) : 'F';

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] ?? '').trim() === String(id).trim()) {
      await updateRango(`Fiadores!${colLetter}${i + 1}`, [[toNumber(nuevoSaldo)]]);
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

      if (updates.pass !== undefined && updates.pass !== '' && passCol >= 0) {
        await updateRango(`Usuarios!${colLetter(passCol)}${i + 1}`, [[updates.pass]]);
      }

      if (updates.rol !== undefined && rolCol >= 0) {
        await updateRango(`Usuarios!${colLetter(rolCol)}${i + 1}`, [[updates.rol]]);
      }

      if (updates.activo !== undefined && activoCol >= 0) {
        await updateRango(`Usuarios!${colLetter(activoCol)}${i + 1}`, [[updates.activo]]);
      }

      return;
    }
  }
}
