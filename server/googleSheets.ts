// Google Sheets integration - googleapis@148.0.0
import { google } from 'googleapis';

const SPREADSHEET_ID = '1MwgmtT8b5jOUzF0rt5E_uRMgjFG1uKcgIB-P3fFQ7p8';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) throw new Error('X-Replit-Token not found for repl/depl');

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;
  if (!connectionSettings || !accessToken) throw new Error('Google Sheet not connected');
  return accessToken;
}

// WARNING: Never cache this client. Always call fresh.
async function getUncachableGoogleSheetClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

// ---- READ ----
export async function leerHoja(nombreHoja: string): Promise<string[][]> {
  const sheets = await getUncachableGoogleSheetClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: nombreHoja,
  });
  return (response.data.values as string[][]) || [];
}

// ---- APPEND ----
export async function appendFila(nombreHoja: string, datos: any[]): Promise<void> {
  const sheets = await getUncachableGoogleSheetClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: nombreHoja,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [datos] },
  });
}

// ---- UPDATE RANGE ----
export async function updateRango(rango: string, datos: any[][]): Promise<void> {
  const sheets = await getUncachableGoogleSheetClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: rango,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: datos },
  });
}

// ---- FIND ROW INDEX BY VALUE ----
export async function findRowIndex(hoja: string, colIndex: number, value: string): Promise<number> {
  const data = await leerHoja(hoja);
  for (let i = 1; i < data.length; i++) {
    if (data[i][colIndex] === value) return i + 1; // 1-indexed sheet row
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
  if (stockColIdx < 0) return; // No stock column found, skip
  const colLetter = String.fromCharCode(65 + stockColIdx);
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      await updateRango(`Stock!${colLetter}${i + 1}`, [[newStock]]);
      return;
    }
  }
}

export async function deleteProductoSheet(id: string) {
  // Mark as deleted by clearing the row — in Sheets we just zero the stock
  const rows = await leerHoja('Stock');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      // Clear all fields in the row
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
    // Descontar stock
    await updateStockSheet(item.productoId, -1); // will be updated properly below
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
  nombre: string; telefono: string; direccion: string; limiteCredito?: number;
}) {
  const rows = await leerHoja('Fiadores');
  const lastId = rows.length > 1 ? parseInt(rows[rows.length - 1][0]) || 0 : 0;
  const newId = lastId + 1;
  await appendFila('Fiadores', [newId, params.nombre, params.telefono, params.direccion, params.limiteCredito ?? 500, 0, 'TRUE']);
  return { id: newId, ...params };
}

export async function updateFiadorSaldoSheet(id: string, nuevoSaldo: string) {
  const rows = await leerHoja('Fiadores');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      await updateRango(`Fiadores!E${i + 1}`, [[nuevoSaldo]]);
      return;
    }
  }
}

// --- USUARIOS ---
export async function getUsuariosSheet() {
  const rows = await leerHoja('Usuarios');
  return rowsToObjects(rows);
}

// Usuarios sheet columns: Usuario, Pass, Rol, Activo
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
      if (updates.pass !== undefined && passCol >= 0) await updateRango(`Usuarios!${colLetter(passCol)}${i + 1}`, [[updates.pass]]);
      if (updates.rol !== undefined && rolCol >= 0) await updateRango(`Usuarios!${colLetter(rolCol)}${i + 1}`, [[updates.rol]]);
      if (updates.activo !== undefined && activoCol >= 0) await updateRango(`Usuarios!${colLetter(activoCol)}${i + 1}`, [[updates.activo]]);
      return;
    }
  }
}

export { SPREADSHEET_ID };
