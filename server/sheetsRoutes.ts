// Google Sheets API Routes - All data flows through Sheets as primary DB
import type { Express } from "express";
import {
  getStock, createProductoSheet, deleteProductoSheet,
  getVentas, getDetalleVenta,
  getMovimientos, createMovimientoSheet,
  getFiadores, createFiadorSheet, updateFiadorSaldoSheet,
  getUsuariosSheet, createUsuarioSheet, updateUsuarioSheet,
  leerHoja, appendFila, updateRango
} from "./googleSheets";
import { format } from "date-fns";

// Guatemala is UTC-6, no daylight saving time
function nowGuatemala(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function fechaGuatemala(): string {
  return format(nowGuatemala(), 'dd/MM/yyyy HH:mm');
}

/**
 * Extrae la parte de fecha (sin hora) de un valor de celda de Google Sheets.
 * Devuelve siempre "DD/MM/YYYY" o null.
 *
 * Casos que maneja:
 *  - Número serial de Sheets  (e.g. "45738.04375" o 45738.04375)
 *  - Texto DD/MM/YYYY [HH:MM] (formato Guatemala — escrito por fechaGuatemala())
 *  - Texto M/D/YYYY  [HH:MM]  (FORMATTED_VALUE en locale EE.UU.)
 *  - Texto YYYY-MM-DD          (ISO)
 */
function parsearFechaSheets(valor: string | number | undefined): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  const v = String(valor).trim();

  // ── Número serial de Google Sheets ──────────────────────────────────────
  if (/^\d+(\.\d+)?$/.test(v)) {
    const serial = parseFloat(v);
    if (serial < 1000) return null; // valor demasiado pequeño para ser fecha real
    const ms = (serial - 25569) * 86400000; // 25569 = días entre 30/12/1899 y Unix epoch
    const d = new Date(ms);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getUTCFullYear()}`;
  }

  // ── D/M/YYYY o DD/MM/YYYY (con o sin hora) ──────────────────────────────
  const match = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const a = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    let dd: string, mm: string;
    if (a > 12) {
      // El primer número es > 12 → solo puede ser el día → DD/MM/YYYY
      dd = String(a).padStart(2, '0');
      mm = String(b).padStart(2, '0');
    } else if (b > 12) {
      // El segundo número es > 12 → solo puede ser el día → M/D/YYYY (locale EE.UU.)
      dd = String(b).padStart(2, '0');
      mm = String(a).padStart(2, '0');
    } else {
      // Ambos ≤ 12: asumimos DD/MM/YYYY (nuestro código siempre escribe así)
      dd = String(a).padStart(2, '0');
      mm = String(b).padStart(2, '0');
    }
    return `${dd}/${mm}/${match[3]}`;
  }

  // ── YYYY-MM-DD (ISO) ─────────────────────────────────────────────────────
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  return null;
}

export function registerSheetsRoutes(app: Express) {

  // ==================== STOCK ====================
  app.get('/api/sheets/stock', async (req, res) => {
    try {
      const data = await getStock();
      res.json(data);
    } catch (err: any) {
      console.error('Error getting stock:', err.message);
      res.status(500).json({ message: err.message });
    }
  });

  app.post('/api/sheets/stock', async (req, res) => {
    try {
      const { nombre, detalle, casa, categoria, precioCompra, precioUnidad,
        precioBlister, precioCaja, posicion, drogueria, stock,
        unidadesBlister, unidadesCaja } = req.body;
      const result = await createProductoSheet({
        nombre, detalle, casa, categoria, precioCompra, precioUnidad,
        precioBlister, precioCaja, posicion, drogueria, stock: parseInt(stock) || 0,
        unidadesBlister: parseInt(unidadesBlister) || 0,
        unidadesCaja: parseInt(unidadesCaja) || 0
      });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put('/api/sheets/stock/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const rows = await leerHoja('Stock');
      const headers = rows[0] || [];
      const colIdx = (name: string) => headers.findIndex((h: string) => h.trim().toLowerCase() === name.toLowerCase());

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === id) {
          const row = [...rows[i]];
          const body = req.body;
          const set = (name: string, val: any) => { const idx = colIdx(name); if (idx >= 0 && val !== undefined) row[idx] = val; };
          set('Nombre', body.nombre); set('Detalle', body.detalle); set('Casa', body.casa);
          set('Categoria', body.categoria); set('Precio compra', body.precioCompra);
          set('Precio unidad', body.precioUnidad); set('Precio blister', body.precioBlister);
          set('precio caja', body.precioCaja); set('posicion', body.posicion);
          set('stock', body.stock); set('drogueria', body.drogueria);
          set('Unidades blister', body.unidadesBlister); set('Unidades caja', body.unidadesCaja);
          await updateRango(`Stock!A${i + 1}`, [row]);
          return res.json({ message: 'Updated', id });
        }
      }
      res.status(404).json({ message: 'Producto no encontrado' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete('/api/sheets/stock/:id', async (req, res) => {
    try {
      await deleteProductoSheet(req.params.id);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== VENTAS ====================
  app.get('/api/sheets/ventas', async (req, res) => {
    try {
      const data = await getVentas();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get('/api/sheets/ventas/:id', async (req, res) => {
    try {
      const [ventas, detalles] = await Promise.all([
        getVentas(),
        getDetalleVenta(req.params.id)
      ]);
      const venta = ventas.find(v => v['ID_Venta'] === req.params.id);
      if (!venta) return res.status(404).json({ message: 'Venta no encontrada' });
      res.json({ ...venta, items: detalles });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post('/api/sheets/ventas', async (req, res) => {
    try {
      const { cliente, tipo, fiadorId, metodoPago, total, items } = req.body;
      const user = (req as any).user;
      const usuario = user?.email || user?.firstName || 'Sistema';
      const fecha = fechaGuatemala();

      // Create the sale
      const ventaRows = await leerHoja('Ventas');
      const lastId = ventaRows.length > 1 ? parseInt(ventaRows[ventaRows.length - 1][0]) || 0 : 0;
      const newId = (lastId + 1).toString();

      await appendFila('Ventas', [newId, fecha, usuario, cliente || '', tipo || 'contado', fiadorId || '', metodoPago || 'efectivo', parseFloat(total)]);

      // Add detail rows and update stock
      const stockRows = await leerHoja('Stock');
      const stockHeaders = stockRows[0] || [];
      const stockColIdx = stockHeaders.findIndex((h: string) => h.trim().toLowerCase() === 'stock');
      const stockColLetter = stockColIdx >= 0 ? String.fromCharCode(65 + stockColIdx) : null;

      for (const item of items) {
        const subtotal = (parseFloat(item.precioUnitario) * parseInt(item.cantidad)).toFixed(2);
        const utilidad = (parseFloat(item.precioUnitario) - parseFloat(item.costoUnitario || '0')).toFixed(2);
        await appendFila('Detalle_Venta', [
          newId, item.productoId, item.nombre, item.tipoPrecio || 'unidad',
          item.cantidad, item.precioUnitario, subtotal,
          item.costoUnitario || '0', utilidad
        ]);

        // Update stock in Sheets (only if stock column exists)
        if (stockColLetter) {
          const idBuscado = String(item.productoId).trim();
          for (let i = 1; i < stockRows.length; i++) {
            const idFila = String(stockRows[i][0] ?? '').trim();
            // Comparar como texto y también como número (por si Google Sheets devuelve "1.00" en vez de "1")
            const coincide = idFila === idBuscado ||
              (!isNaN(Number(idFila)) && !isNaN(Number(idBuscado)) && Math.round(Number(idFila)) === Math.round(Number(idBuscado)));
            if (coincide) {
              const currentStock = parseInt(stockRows[i][stockColIdx]) || 0;
              const newStock = Math.max(0, currentStock - parseInt(item.cantidad));
              await updateRango(`Stock!${stockColLetter}${i + 1}`, [[newStock]]);
              stockRows[i][stockColIdx] = newStock.toString();
              break;
            }
          }
        }
      }

      // Register ingreso movement
      const movRows = await leerHoja('Movimientos');
      const lastMovId = movRows.length > 1 ? parseInt(movRows[movRows.length - 1][0]) || 0 : 0;
      await appendFila('Movimientos', [lastMovId + 1, fecha, 'ingreso', `Venta #${newId}`, parseFloat(total), usuario, newId]);

      // Update fiador saldo if fiado — add sale total to existing balance
      if (tipo === 'fiado' && fiadorId) {
        const fiadores = await getFiadores();
        const fiador = fiadores.find((f: any) => String(f['Fiador_ID']) === String(fiadorId));
        const saldoActual = parseFloat(fiador?.['Saldo_actual'] || '0');
        const nuevoSaldo = (saldoActual + parseFloat(total)).toFixed(2);
        await updateFiadorSaldoSheet(String(fiadorId), nuevoSaldo);
      }

      res.status(201).json({ id: newId, total, fecha });
    } catch (err: any) {
      console.error('Error creating venta:', err);
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== IMPORTAR VENTAS HISTÓRICAS ====================
  app.post('/api/sheets/import-ventas', async (req, res) => {
    try {
      const { rows } = req.body as { rows: Array<{ cantidad: string; producto: string; total: string; vendedor: string; fecha: string }> };
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: 'No hay filas para importar' });
      }

      const ventaRows = await leerHoja('Ventas');
      const movRows = await leerHoja('Movimientos');
      let lastVentaId = ventaRows.length > 1 ? parseInt(ventaRows[ventaRows.length - 1][0]) || 0 : 0;
      let lastMovId = movRows.length > 1 ? parseInt(movRows[movRows.length - 1][0]) || 0 : 0;

      let importadas = 0;
      const errores: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const producto = (row.producto || '').trim();
        const rawTotal = (row.total || '').replace(/,/g, '').replace(/Q/gi, '').trim();
        const total = parseFloat(rawTotal);
        if (!producto || isNaN(total) || total <= 0) {
          errores.push(`Fila ${i + 1}: datos insuficientes (producto="${producto}", total="${row.total}")`);
          continue;
        }

        const cantidad = parseInt(row.cantidad) || 1;
        const vendedor = (row.vendedor || 'Importado').trim();
        // Normalize fecha: accept d/m/y or m/d/y, store as dd/MM/yyyy HH:mm
        let fecha = (row.fecha || '').trim();
        if (!fecha) fecha = fechaGuatemala();
        else {
          const parts = fecha.split(/[\/\-]/);
          if (parts.length >= 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
            fecha = `${day}/${month}/${year} 00:00`;
          }
        }

        lastVentaId++;
        const ventaId = lastVentaId.toString();
        const precioUnit = (total / cantidad).toFixed(2);

        await appendFila('Ventas', [ventaId, fecha, vendedor, 'Importado', 'contado', '', 'efectivo', total.toFixed(2)]);
        await appendFila('Detalle_Venta', [ventaId, `IMP-${ventaId}`, producto, 'unidad', cantidad, precioUnit, total.toFixed(2), '0', '0']);

        lastMovId++;
        await appendFila('Movimientos', [lastMovId, fecha, 'ingreso', `Venta importada #${ventaId} - ${producto}`, total.toFixed(2), vendedor, ventaId]);

        importadas++;
      }

      res.json({ importadas, errores, total: rows.length });
    } catch (err: any) {
      console.error('Error importando ventas:', err);
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== MOVIMIENTOS ====================
  app.get('/api/sheets/movimientos', async (req, res) => {
    try {
      const data = await getMovimientos();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post('/api/sheets/movimientos', async (req, res) => {
    try {
      const { tipo, concepto, monto, referencia } = req.body;
      const user = (req as any).user;
      const usuario = user?.email || user?.firstName || 'Sistema';
      const fecha = fechaGuatemala();
      const result = await createMovimientoSheet({ fecha, tipo, concepto, monto, usuario, referencia: referencia || '' });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== FIADORES ====================
  app.get('/api/sheets/fiadores', async (req, res) => {
    try {
      const data = await getFiadores();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post('/api/sheets/fiadores', async (req, res) => {
    try {
      const { nombre, telefono, direccion, limiteCredito, saldoInicial } = req.body;
      const result = await createFiadorSheet({
        nombre,
        telefono: telefono || '',
        direccion: direccion || '',
        limiteCredito: parseFloat(limiteCredito) || 0,
        saldoInicial: parseFloat(saldoInicial) || 0,
      });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get('/api/sheets/fiadores/:id/ventas', async (req, res) => {
    try {
      const ventas = await getVentas();
      const fiadorVentas = ventas.filter((v: any) => v['Fiador_ID'] === req.params.id && v['Tipo'] === 'fiado');
      res.json(fiadorVentas);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put('/api/sheets/fiadores/:id/pagar', async (req, res) => {
    try {
      const { monto } = req.body;
      const fiadores = await getFiadores();
      const fiador = fiadores.find((f: any) => f['Fiador_ID'] === req.params.id);
      if (!fiador) return res.status(404).json({ message: 'Fiador no encontrado' });
      const saldoActual = parseFloat(fiador['Saldo_actual'] || '0');
      const nuevoSaldo = Math.max(0, saldoActual - parseFloat(monto)).toFixed(2);
      await updateFiadorSaldoSheet(req.params.id, nuevoSaldo);
      res.json({ id: req.params.id, nuevoSaldo });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put('/api/sheets/fiadores/:id/cancelar', async (req, res) => {
    try {
      await updateFiadorSaldoSheet(req.params.id, '0');
      res.json({ id: req.params.id, nuevoSaldo: '0' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== USUARIOS ====================
  app.get('/api/sheets/usuarios', async (req, res) => {
    try {
      const data = await getUsuariosSheet();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Columns: Usuario, Pass, Rol, Activo
  app.post('/api/sheets/usuarios', async (req, res) => {
    try {
      const { usuario, pass, rol } = req.body;
      if (!usuario || !pass) return res.status(400).json({ message: 'Usuario y Pass son requeridos' });
      const result = await createUsuarioSheet({ usuario, pass, rol: rol || 'VENDEDOR', activo: 'TRUE' });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put('/api/sheets/usuarios/:usuario', async (req, res) => {
    try {
      const { pass, rol, activo } = req.body;
      await updateUsuarioSheet(decodeURIComponent(req.params.usuario), { pass, rol, activo });
      res.json({ message: 'Actualizado' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== DASHBOARD ====================
  app.get('/api/sheets/dashboard', async (req, res) => {
    try {
      const [stockRows, movimientosRows, detalleVentaRows, ventasRows, fiadoresRows] = await Promise.all([
        leerHoja('Stock'),
        leerHoja('Movimientos'),
        leerHoja('Detalle_Venta'),
        leerHoja('Ventas'),
        leerHoja('Fiadores'),
      ]);

      // Stock stats - find stock column by header
      const stockHeaders = stockRows[0] || [];
      const stockColIdx = stockHeaders.findIndex((h: string) => h.trim().toLowerCase() === 'stock');
      const stockData = stockRows.slice(1).filter(r => r[0] && r[0] !== '');
      const totalProductos = stockData.length;
      const existenciaTotal = stockColIdx >= 0
        ? stockData.reduce((acc, r) => acc + (parseInt(r[stockColIdx]) || 0), 0)
        : 0;
      const bajosStock = stockColIdx >= 0
        ? stockData.filter(r => (parseInt(r[stockColIdx]) || 0) < 5).length
        : 0;

      // Movimientos stats totales
      const movs = movimientosRows.slice(1).filter(r => r[0]);
      const ingresos = movs.filter(r => r[2] === 'ingreso').reduce((acc, r) => acc + parseFloat(r[4] || '0'), 0);
      const egresos = movs.filter(r => r[2] === 'egreso').reduce((acc, r) => acc + parseFloat(r[4] || '0'), 0);
      const cajaNeta = ingresos - egresos;

      // Movimientos por día — últimos 14 días
      const hoy = nowGuatemala();
      const diasMap: Record<string, { fecha: string; ingresos: number; egresos: number }> = {};
      for (let d = 13; d >= 0; d--) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() - d);
        const key = `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        const label = `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        diasMap[key] = { fecha: label, ingresos: 0, egresos: 0 };
      }
      for (const m of movs) {
        if (!m[1]) continue;
        const fechaStr = parsearFechaSheets(m[1]);
        if (!fechaStr) continue;
        const [d, mo] = fechaStr.split('/');
        const key = `${d.padStart(2, '0')}/${mo.padStart(2, '0')}`;
        if (diasMap[key]) {
          if (m[2] === 'ingreso') diasMap[key].ingresos += parseFloat(m[4] || '0');
          else if (m[2] === 'egreso') diasMap[key].egresos += parseFloat(m[4] || '0');
        }
      }
      const ventasPorDia = Object.values(diasMap);

      // Ventas por hora del día (para ver horario pico)
      const ventasRows2 = ventasRows.slice(1).filter(r => r[0]);
      const horaCount: Record<number, number> = {};
      for (const v of ventasRows2) {
        if (!v[1]) continue;
        const timePart = v[1].split(' ')[1];
        if (!timePart) continue;
        const hora = parseInt(timePart.split(':')[0]);
        if (!isNaN(hora)) horaCount[hora] = (horaCount[hora] || 0) + 1;
      }
      const ventasPorHora = Array.from({ length: 24 }, (_, h) => ({
        hora: `${String(h).padStart(2, '0')}:00`,
        ventas: horaCount[h] || 0,
      })).filter(h => h.ventas > 0 || (h.hora >= '07:00' && h.hora <= '21:00'));

      // Total ventas
      const totalVentas = ventasRows2.length;

      // Top productos (top 8)
      const productCount: Record<string, { nombre: string; total: number; cantidad: number }> = {};
      const detalles = detalleVentaRows.slice(1).filter(r => r[0]);
      for (const d of detalles) {
        const id = d[1];
        const nombre = d[2];
        const cantidad = parseInt(d[4]) || 0;
        const subtotal = parseFloat(d[6]) || 0;
        if (!productCount[id]) productCount[id] = { nombre, total: 0, cantidad: 0 };
        productCount[id].total += subtotal;
        productCount[id].cantidad += cantidad;
      }
      const topProductos = Object.entries(productCount)
        .sort((a, b) => b[1].cantidad - a[1].cantidad)
        .slice(0, 8)
        .map(([id, data]) => ({ id, ...data }));

      // Categorias de stock
      const categoriaIdx = stockHeaders.findIndex((h: string) => h.trim().toLowerCase() === 'categoria');
      const catMap: Record<string, number> = {};
      if (categoriaIdx >= 0) {
        for (const r of stockData) {
          const cat = r[categoriaIdx] || 'Sin categoría';
          catMap[cat] = (catMap[cat] || 0) + 1;
        }
      }
      const topCategorias = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }));

      // Ventas por mes — últimos 12 meses
      const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const mesMap: Record<string, { label: string; ingresos: number; order: number }> = {};
      const ahora = nowGuatemala();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        mesMap[key] = { label: `${MESES[d.getMonth()]} ${d.getFullYear()}`, ingresos: 0, order: 12 - i };
      }
      for (const m of movs) {
        if (!m[1] || m[2] !== 'ingreso') continue;
        const fechaStr = parsearFechaSheets(m[1]);
        if (!fechaStr) continue;
        const parts = fechaStr.split('/');
        if (parts.length < 3) continue;
        const [dd, mm, yyyy] = parts;
        const key = `${yyyy}-${mm.padStart(2, '0')}`;
        if (mesMap[key]) mesMap[key].ingresos += parseFloat(m[4] || '0');
      }
      const ventasPorMes = Object.values(mesMap).sort((a, b) => a.order - b.order);

      // Fiado pendiente — suma de saldo_actual de todos los fiadores
      const fiadoresData = fiadoresRows.slice(1).filter((r: string[]) => r[0]);
      const fiadoreHeaders = fiadoresRows[0] || [];
      const saldoColIdx = fiadoreHeaders.findIndex((h: string) => h.trim().toLowerCase() === 'saldo_actual');
      const fiadoPendiente = fiadoresData.reduce((acc: number, r: string[]) => {
        const val = saldoColIdx >= 0 ? parseFloat(r[saldoColIdx] || '0') : parseFloat(r[5] || '0');
        return acc + (isNaN(val) ? 0 : val);
      }, 0);

      // Ventas fiado cobradas hoy (contado ventas hoy = caja real hoy)
      const hoyStr = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
      const ventasHoyRows = ventasRows2.filter((v: string[]) => parsearFechaSheets(v[1]) === hoyStr);
      const ventasContadoHoy = ventasHoyRows.filter((v: string[]) => v[4] === 'contado').reduce((acc: number, v: string[]) => acc + parseFloat(v[7] || '0'), 0);
      const ventasFiadoHoy = ventasHoyRows.filter((v: string[]) => v[4] === 'fiado').reduce((acc: number, v: string[]) => acc + parseFloat(v[7] || '0'), 0);

      // Join ventasHoy con Detalle_Venta para el panel clickable
      const detallesPorVentaHoy: Record<string, { nombre: string; cantidad: string; subtotal: string }[]> = {};
      detalleVentaRows.slice(1).forEach((r: string[]) => {
        if (!r[0]) return;
        const vid = String(r[0]).trim();
        if (!detallesPorVentaHoy[vid]) detallesPorVentaHoy[vid] = [];
        detallesPorVentaHoy[vid].push({ nombre: r[2] || '', cantidad: r[4] || '', subtotal: r[6] || '' });
      });
      const ventasHoy = ventasHoyRows.map((v: string[]) => ({
        id: v[0], fecha: v[1], usuario: v[2], cliente: v[3],
        tipo: v[4], metodoPago: v[6], total: v[7],
        items: detallesPorVentaHoy[String(v[0]).trim()] || [],
      }));

      res.json({
        totalProductos, existenciaTotal, bajosStock, totalVentas,
        ingresos: ingresos.toFixed(2),
        egresos: egresos.toFixed(2),
        cajaNeta: cajaNeta.toFixed(2),
        fiadoPendiente: fiadoPendiente.toFixed(2),
        ventasContadoHoy: ventasContadoHoy.toFixed(2),
        ventasFiadoHoy: ventasFiadoHoy.toFixed(2),
        ventasHoy,
        topProductos,
        ventasPorDia,
        ventasPorHora,
        topCategorias,
        ventasPorMes,
      });
    } catch (err: any) {
      console.error('Dashboard error:', err);
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== BALANCES ====================
  app.get('/api/sheets/balances', async (req, res) => {
    try {
      const { desde, hasta } = req.query;

      // JOIN: fetch all three sheets in parallel
      const [movRows, detalleRows, ventasRows] = await Promise.all([
        leerHoja('Movimientos'),
        leerHoja('Detalle_Venta'),
        leerHoja('Ventas'),
      ]);

      const movs = movRows.slice(1).filter(r => r[0] && r[0] !== '');

      // Build lookup maps for the join
      // Detalle_Venta cols: ID_Venta(0), Producto_ID(1), Nombre(2), TipoPrecio(3), Cantidad(4), PrecioUnitario(5), Subtotal(6)
      const detallesPorVenta: Record<string, { nombre: string; cantidad: string; precioUnitario: string; subtotal: string; tipoPrecio: string }[]> = {};
      detalleRows.slice(1).forEach(r => {
        if (!r[0]) return;
        const vid = String(r[0]).trim();
        if (!detallesPorVenta[vid]) detallesPorVenta[vid] = [];
        detallesPorVenta[vid].push({
          nombre: r[2] || '', cantidad: r[4] || '', precioUnitario: r[5] || '',
          subtotal: r[6] || '', tipoPrecio: r[3] || '',
        });
      });

      // Ventas cols: ID_Venta(0), Fecha(1), Usuario(2), Cliente(3), Tipo(4), Fiador_ID(5), MetodoPago(6), Total(7)
      const ventasPorId: Record<string, { cliente: string; metodoPago: string; tipo: string; total: string }> = {};
      ventasRows.slice(1).forEach(r => {
        if (!r[0]) return;
        ventasPorId[String(r[0]).trim()] = {
          cliente: r[3] || '', metodoPago: r[6] || '', tipo: r[4] || '', total: r[7] || '',
        };
      });

      let filtered = movs;
      if (desde || hasta) {
        filtered = movs.filter(r => {
          if (!r[1]) return false;
          const fechaStr = parsearFechaSheets(r[1]);
          if (!fechaStr) return false;
          const [d, m, y] = fechaStr.split('/');
          const fecha = new Date(`${y}-${m}-${d}`);
          if (desde && fecha < new Date(desde as string)) return false;
          if (hasta && fecha > new Date(hasta as string)) return false;
          return true;
        });
      }

      const ingresos = filtered.filter(r => r[2] === 'ingreso').reduce((acc, r) => acc + parseFloat(r[4] || '0'), 0);
      const egresos = filtered.filter(r => r[2] === 'egreso').reduce((acc, r) => acc + parseFloat(r[4] || '0'), 0);
      const cajaNeta = ingresos - egresos;

      res.json({
        ingresos: ingresos.toFixed(2),
        egresos: egresos.toFixed(2),
        cajaNeta: cajaNeta.toFixed(2),
        movimientos: filtered.map(r => {
          const ref = r[6] ? String(r[6]).trim() : '';
          const esVenta = /^\d+$/.test(ref);
          const venta = esVenta ? ventasPorId[ref] : null;
          const items = esVenta ? (detallesPorVenta[ref] || []) : [];
          return {
            id: r[0], fecha: r[1], tipo: r[2], concepto: r[3],
            monto: r[4], usuario: r[5], referencia: ref,
            // JOIN fields
            items,
            venta: venta || null,
          };
        }),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
