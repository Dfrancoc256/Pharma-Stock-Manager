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

function nowGuatemala(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Guatemala" })
  );
}

function fechaGuatemala(): string {
  return format(nowGuatemala(), "dd/MM/yyyy HH:mm");
}

function fechaSoloGuatemala(): string {
  return format(nowGuatemala(), "dd/MM/yyyy");
}

function toNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const clean = String(value).replace(/,/g, '').replace(/Q/gi, '').trim();
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

function toInt(value: any): number {
  return Math.trunc(toNumber(value));
}

/**
 * Devuelve "DD/MM/YYYY" o null.
 */
function parsearFechaSheets(valor: string | number | undefined): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  const v = String(valor).trim();

  if (/^\d+(\.\d+)?$/.test(v)) {
    const serial = parseFloat(v);
    if (serial < 1000) return null;
    const ms = (serial - 25569) * 86400000;
    const d = new Date(ms);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getUTCFullYear()}`;
  }

  const match = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const a = parseInt(match[1], 10);
    const b = parseInt(match[2], 10);
    let dd: string;
    let mm: string;

    if (a > 12) {
      dd = String(a).padStart(2, '0');
      mm = String(b).padStart(2, '0');
    } else if (b > 12) {
      dd = String(b).padStart(2, '0');
      mm = String(a).padStart(2, '0');
    } else {
      dd = String(a).padStart(2, '0');
      mm = String(b).padStart(2, '0');
    }

    return `${dd}/${mm}/${match[3]}`;
  }

  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  return null;
}

function normalizarFechaImportacion(fechaRaw?: string): string {
  const fecha = String(fechaRaw || '').trim();
  if (!fecha) return fechaGuatemala();

  const soloFecha = parsearFechaSheets(fecha);
  if (!soloFecha) return fechaGuatemala();

  return `${soloFecha} 00:00`;
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
      const {
        nombre, detalle, casa, categoria, precioCompra, precioUnidad,
        precioBlister, precioCaja, posicion, drogueria, stock,
        unidadesBlister, unidadesCaja
      } = req.body;

      const result = await createProductoSheet({
        nombre,
        detalle,
        casa,
        categoria,
        precioCompra: toNumber(precioCompra),
        precioUnidad: toNumber(precioUnidad),
        precioBlister: toNumber(precioBlister),
        precioCaja: toNumber(precioCaja),
        posicion,
        drogueria,
        stock: toInt(stock),
        unidadesBlister: toInt(unidadesBlister),
        unidadesCaja: toInt(unidadesCaja),
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
      const colIdx = (name: string) =>
        headers.findIndex((h: string) => h.trim().toLowerCase() === name.toLowerCase());

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0] ?? '').trim() === String(id).trim()) {
          const row = [...rows[i]];
          const body = req.body;

          const set = (name: string, val: any, numeric = false) => {
            const idx = colIdx(name);
            if (idx >= 0 && val !== undefined) {
              row[idx] = numeric ? toNumber(val) : val;
            }
          };

          set('Nombre', body.nombre);
          set('Detalle', body.detalle);
          set('Casa', body.casa);
          set('Categoria', body.categoria);
          set('Precio compra', body.precioCompra, true);
          set('Precio unidad', body.precioUnidad, true);
          set('Precio blister', body.precioBlister, true);
          set('precio caja', body.precioCaja, true);
          set('posicion', body.posicion);
          set('stock', body.stock, true);
          set('drogueria', body.drogueria);
          set('Unidades blister', body.unidadesBlister, true);
          set('Unidades caja', body.unidadesCaja, true);

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

      const venta = ventas.find((v: any) => String(v['ID_Venta']) === String(req.params.id));
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
      const totalVenta = toNumber(total);

      const ventaRows = await leerHoja('Ventas');
      const lastId = ventaRows.length > 1 ? parseInt(ventaRows[ventaRows.length - 1][0]) || 0 : 0;
      const newId = (lastId + 1).toString();

      await appendFila('Ventas', [
        newId,
        fecha,
        usuario,
        cliente || '',
        tipo || 'contado',
        fiadorId || '',
        metodoPago || 'efectivo',
        totalVenta
      ]);

      const stockRows = await leerHoja('Stock');
      const stockHeaders = stockRows[0] || [];
      const stockColIdx = stockHeaders.findIndex((h: string) => h.trim().toLowerCase() === 'stock');
      const stockColLetter = stockColIdx >= 0 ? String.fromCharCode(65 + stockColIdx) : null;

      for (const item of items || []) {
        const cantidad = toInt(item.cantidad);
        const precioUnitario = toNumber(item.precioUnitario);
        const costoUnitario = toNumber(item.costoUnitario || 0);
        const subtotal = Number((precioUnitario * cantidad).toFixed(2));
        const utilidad = Number(((precioUnitario - costoUnitario) * cantidad).toFixed(2));

        await appendFila('Detalle_Venta', [
          newId,
          String(item.productoId || ''),
          item.nombre || '',
          item.tipoPrecio || 'unidad',
          cantidad,
          precioUnitario,
          subtotal,
          costoUnitario,
          utilidad
        ]);

        if (stockColLetter) {
          const idBuscado = String(item.productoId || '').trim();

          for (let i = 1; i < stockRows.length; i++) {
            const idFila = String(stockRows[i][0] ?? '').trim();
            const coincide =
              idFila === idBuscado ||
              (!isNaN(Number(idFila)) &&
                !isNaN(Number(idBuscado)) &&
                Math.round(Number(idFila)) === Math.round(Number(idBuscado)));

            if (coincide) {
              const currentStock = toInt(stockRows[i][stockColIdx]);
              const newStock = Math.max(0, currentStock - cantidad);

              await updateRango(`Stock!${stockColLetter}${i + 1}`, [[newStock]]);
              stockRows[i][stockColIdx] = String(newStock);
              break;
            }
          }
        }
      }

      const movRows = await leerHoja('Movimientos');
      const lastMovId = movRows.length > 1 ? parseInt(movRows[movRows.length - 1][0]) || 0 : 0;

      await appendFila('Movimientos', [
        lastMovId + 1,
        fecha,
        'ingreso',
        `Venta #${newId}`,
        totalVenta,
        usuario,
        newId
      ]);

      if (tipo === 'fiado' && fiadorId) {
        const fiadores = await getFiadores();
        const fiador = fiadores.find((f: any) => String(f['Fiador_ID']) === String(fiadorId));
        const saldoActual = toNumber(fiador?.['Saldo_actual']);
        const nuevoSaldo = Number((saldoActual + totalVenta).toFixed(2));
        await updateFiadorSaldoSheet(String(fiadorId), nuevoSaldo);
      }

      res.status(201).json({ id: newId, total: totalVenta, fecha });
    } catch (err: any) {
      console.error('Error creating venta:', err);
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== VENTAS HOY DETALLE ====================

  app.get('/api/sheets/ventas-hoy-detalle', async (req, res) => {
    try {
      const [ventasRows, detalleRows] = await Promise.all([
        leerHoja('Ventas'),
        leerHoja('Detalle_Venta'),
      ]);

      const hoyStr = fechaSoloGuatemala();

      const ventasHoyIds = new Set(
        ventasRows
          .slice(1)
          .filter((r: string[]) => r[0] && parsearFechaSheets(r[1]) === hoyStr)
          .map((r: string[]) => String(r[0]).trim())
      );

      const detalle = detalleRows
        .slice(1)
        .filter((r: string[]) => r[0] && ventasHoyIds.has(String(r[0]).trim()))
        .map((r: string[]) => ({
          ventaId: String(r[0]).trim(),
          producto: r[2] || '',
          cantidad: r[4] || '0',
          precioVendido: r[5] || '0',
          subtotal: r[6] || '0',

          cantidadNum: toInt(r[4]),
          precioVendidoNum: toNumber(r[5]),
          subtotalNum: toNumber(r[6]),
        }));

      res.json(detalle);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== IMPORTAR VENTAS HISTÓRICAS ====================

  app.post('/api/sheets/import-ventas', async (req, res) => {
    try {
      const { rows } = req.body as {
        rows: Array<{ cantidad: string; producto: string; total: string; vendedor: string; fecha: string }>
      };

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
        const total = toNumber(row.total);

        if (!producto || total <= 0) {
          errores.push(`Fila ${i + 1}: datos insuficientes (producto="${producto}", total="${row.total}")`);
          continue;
        }

        const cantidad = toInt(row.cantidad) || 1;
        const vendedor = (row.vendedor || 'Importado').trim();
        const fecha = normalizarFechaImportacion(row.fecha);

        lastVentaId++;
        const ventaId = lastVentaId.toString();
        const precioUnit = Number((total / cantidad).toFixed(2));

        await appendFila('Ventas', [
          ventaId,
          fecha,
          vendedor,
          'Importado',
          'contado',
          '',
          'efectivo',
          total
        ]);

        await appendFila('Detalle_Venta', [
          ventaId,
          `IMP-${ventaId}`,
          producto,
          'unidad',
          cantidad,
          precioUnit,
          total,
          0,
          0
        ]);

        lastMovId++;
        await appendFila('Movimientos', [
          lastMovId,
          fecha,
          'ingreso',
          `Venta importada #${ventaId} - ${producto}`,
          total,
          vendedor,
          ventaId
        ]);

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

      const result = await createMovimientoSheet({
        fecha,
        tipo,
        concepto,
        monto: toNumber(monto),
        usuario,
        referencia: referencia || ''
      });

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
        limiteCredito: toNumber(limiteCredito),
        saldoInicial: toNumber(saldoInicial),
      });

      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get('/api/sheets/fiadores/:id/ventas', async (req, res) => {
    try {
      const ventas = await getVentas();
      const fiadorVentas = ventas.filter(
        (v: any) => String(v['Fiador_ID']) === String(req.params.id) && v['Tipo'] === 'fiado'
      );
      res.json(fiadorVentas);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put('/api/sheets/fiadores/:id/pagar', async (req, res) => {
    try {
      const { monto } = req.body;
      const fiadores = await getFiadores();
      const fiador = fiadores.find((f: any) => String(f['Fiador_ID']) === req.params.id);

      if (!fiador) return res.status(404).json({ message: 'Fiador no encontrado' });

      const saldoActual = toNumber(fiador['Saldo_actual']);
      const nuevoSaldo = Math.max(0, Number((saldoActual - toNumber(monto)).toFixed(2)));

      await updateFiadorSaldoSheet(req.params.id, nuevoSaldo);
      res.json({ id: req.params.id, nuevoSaldo });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put('/api/sheets/fiadores/:id/cancelar', async (req, res) => {
    try {
      await updateFiadorSaldoSheet(req.params.id, 0);
      res.json({ id: req.params.id, nuevoSaldo: 0 });
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

  app.post('/api/sheets/usuarios', async (req, res) => {
    try {
      const { usuario, pass, rol } = req.body;
      if (!usuario || !pass) return res.status(400).json({ message: 'Usuario y Pass son requeridos' });

      const result = await createUsuarioSheet({
        usuario,
        pass,
        rol: rol || 'VENDEDOR',
        activo: 'TRUE'
      });

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

      const stockHeaders = stockRows[0] || [];
      const stockColIdx = stockHeaders.findIndex((h: string) => h.trim().toLowerCase() === 'stock');
      const stockData = stockRows.slice(1).filter(r => r[0] && r[0] !== '');
      const totalProductos = stockData.length;
      const existenciaTotal = stockColIdx >= 0
        ? stockData.reduce((acc, r) => acc + toInt(r[stockColIdx]), 0)
        : 0;
      const bajosStock = stockColIdx >= 0
        ? stockData.filter(r => toInt(r[stockColIdx]) < 5).length
        : 0;

      const movs = movimientosRows.slice(1).filter(r => r[0]);
      const ingresos = movs
        .filter(r => String(r[2]).toLowerCase() === 'ingreso')
        .reduce((acc, r) => acc + toNumber(r[4]), 0);

      const egresos = movs
        .filter(r => String(r[2]).toLowerCase() === 'egreso')
        .reduce((acc, r) => acc + toNumber(r[4]), 0);

      const cajaNeta = ingresos - egresos;

      const hoy = nowGuatemala();
      const diasMap: Record<string, { fecha: string; ingresos: number; egresos: number }> = {};
      for (let d = 13; d >= 0; d--) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() - d);
        const key = `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        diasMap[key] = { fecha: key, ingresos: 0, egresos: 0 };
      }

      for (const m of movs) {
        if (!m[1]) continue;
        const fechaStr = parsearFechaSheets(m[1]);
        if (!fechaStr) continue;

        const [d, mo] = fechaStr.split('/');
        const key = `${d.padStart(2, '0')}/${mo.padStart(2, '0')}`;

        if (diasMap[key]) {
          if (String(m[2]).toLowerCase() === 'ingreso') diasMap[key].ingresos += toNumber(m[4]);
          else if (String(m[2]).toLowerCase() === 'egreso') diasMap[key].egresos += toNumber(m[4]);
        }
      }

      const ventasPorDia = Object.values(diasMap);

      const ventasRows2 = ventasRows.slice(1).filter(r => r[0]);

      const hoyStr = fechaSoloGuatemala();
      const ventasHoyRows = ventasRows2.filter(
        (v: string[]) => parsearFechaSheets(v[1]) === hoyStr
      );

      const totalVentasHoy = ventasHoyRows.length;

      const montoVentasHoy = ventasHoyRows.reduce(
        (acc: number, v: string[]) => acc + toNumber(v[7]),
        0
      );

      const ventasContadoHoy = ventasHoyRows
        .filter((v: string[]) => String(v[4]).toLowerCase() === 'contado')
        .reduce((acc: number, v: string[]) => acc + toNumber(v[7]), 0);

      const ventasFiadoHoy = ventasHoyRows
        .filter((v: string[]) => String(v[4]).toLowerCase() === 'fiado')
        .reduce((acc: number, v: string[]) => acc + toNumber(v[7]), 0);

      const horaCount: Record<number, number> = {};
      for (const v of ventasRows2) {
        if (!v[1]) continue;
        const timePart = String(v[1]).split(' ')[1];
        if (!timePart) continue;
        const hora = parseInt(timePart.split(':')[0]);
        if (!isNaN(hora)) horaCount[hora] = (horaCount[hora] || 0) + 1;
      }

      const ventasPorHora = Array.from({ length: 24 }, (_, h) => ({
        hora: `${String(h).padStart(2, '0')}:00`,
        ventas: horaCount[h] || 0,
      })).filter(h => h.ventas > 0 || (h.hora >= '07:00' && h.hora <= '21:00'));

      const totalVentas = ventasRows2.length;

      const productCount: Record<string, { nombre: string; total: number; cantidad: number }> = {};
      const detalles = detalleVentaRows.slice(1).filter(r => r[0]);

      for (const d of detalles) {
        const id = d[1];
        const nombre = d[2];
        const cantidad = toInt(d[4]);
        const subtotal = toNumber(d[6]);

        if (!productCount[id]) productCount[id] = { nombre, total: 0, cantidad: 0 };
        productCount[id].total += subtotal;
        productCount[id].cantidad += cantidad;
      }

      const topProductos = Object.entries(productCount)
        .sort((a, b) => b[1].cantidad - a[1].cantidad)
        .slice(0, 8)
        .map(([id, data]) => ({ id, ...data }));

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

      const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const mesMap: Record<string, { label: string; ingresos: number; order: number }> = {};
      const ahora = nowGuatemala();

      for (let i = 11; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        mesMap[key] = { label: `${MESES[d.getMonth()]} ${d.getFullYear()}`, ingresos: 0, order: 12 - i };
      }

      for (const m of movs) {
        if (!m[1] || String(m[2]).toLowerCase() !== 'ingreso') continue;
        const fechaStr = parsearFechaSheets(m[1]);
        if (!fechaStr) continue;

        const parts = fechaStr.split('/');
        if (parts.length < 3) continue;

        const [, mm, yyyy] = parts;
        const key = `${yyyy}-${mm.padStart(2, '0')}`;
        if (mesMap[key]) mesMap[key].ingresos += toNumber(m[4]);
      }

      const ventasPorMes = Object.values(mesMap).sort((a, b) => a.order - b.order);

      const fiadoresData = fiadoresRows.slice(1).filter((r: string[]) => r[0]);
      const fiadoreHeaders = fiadoresRows[0] || [];
      const saldoColIdx = fiadoreHeaders.findIndex((h: string) => h.trim().toLowerCase() === 'saldo_actual');

      const fiadoPendiente = fiadoresData.reduce((acc: number, r: string[]) => {
        const val = saldoColIdx >= 0 ? toNumber(r[saldoColIdx]) : toNumber(r[5]);
        return acc + val;
      }, 0);

      const detallesPorVentaHoy: Record<string, {
        nombre: string;
        cantidad: string;
        subtotal: string;
        cantidadNum: number;
        subtotalNum: number;
        precioUnitario: string;
        precioUnitarioNum: number;
      }[]> = {};

      detalleVentaRows.slice(1).forEach((r: string[]) => {
        if (!r[0]) return;
        const vid = String(r[0]).trim();
        if (!detallesPorVentaHoy[vid]) detallesPorVentaHoy[vid] = [];
        detallesPorVentaHoy[vid].push({
          nombre: r[2] || '',
          cantidad: r[4] || '',
          subtotal: r[6] || '',
          cantidadNum: toInt(r[4]),
          subtotalNum: toNumber(r[6]),
          precioUnitario: r[5] || '',
          precioUnitarioNum: toNumber(r[5]),
        });
      });

      const ventasHoy = ventasHoyRows.map((v: string[]) => ({
        id: v[0],
        fecha: v[1],
        usuario: v[2],
        cliente: v[3],
        tipo: v[4],
        metodoPago: v[6],
        total: v[7],
        totalNum: toNumber(v[7]),
        items: detallesPorVentaHoy[String(v[0]).trim()] || [],
      }));

      res.json({
        totalProductos,
        existenciaTotal,
        bajosStock,
        totalVentas,
        totalVentasHoy,
        montoVentasHoy,
        montoVentasHoyNum: montoVentasHoy,

        ingresos: ingresos.toFixed(2),
        egresos: egresos.toFixed(2),
        cajaNeta: cajaNeta.toFixed(2),
        fiadoPendiente: fiadoPendiente.toFixed(2),
        ventasContadoHoy: ventasContadoHoy.toFixed(2),
        ventasFiadoHoy: ventasFiadoHoy.toFixed(2),

        ingresosNum: ingresos,
        egresosNum: egresos,
        cajaNetaNum: cajaNeta,
        fiadoPendienteNum: fiadoPendiente,
        ventasContadoHoyNum: ventasContadoHoy,
        ventasFiadoHoyNum: ventasFiadoHoy,

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

      const [movRows, detalleRows, ventasRows] = await Promise.all([
        leerHoja('Movimientos'),
        leerHoja('Detalle_Venta'),
        leerHoja('Ventas'),
      ]);

      const movs = movRows.slice(1).filter(r => r[0] && r[0] !== '');

      const detallesPorVenta: Record<string, {
        nombre: string;
        cantidad: string;
        precioUnitario: string;
        subtotal: string;
        tipoPrecio: string;
        cantidadNum: number;
        precioUnitarioNum: number;
        subtotalNum: number;
      }[]> = {};

      detalleRows.slice(1).forEach(r => {
        if (!r[0]) return;
        const vid = String(r[0]).trim();

        if (!detallesPorVenta[vid]) detallesPorVenta[vid] = [];
        detallesPorVenta[vid].push({
          nombre: r[2] || '',
          cantidad: r[4] || '',
          precioUnitario: r[5] || '',
          subtotal: r[6] || '',
          tipoPrecio: r[3] || '',
          cantidadNum: toInt(r[4]),
          precioUnitarioNum: toNumber(r[5]),
          subtotalNum: toNumber(r[6]),
        });
      });

      const ventasPorId: Record<string, {
        cliente: string;
        metodoPago: string;
        tipo: string;
        total: string;
        totalNum: number;
      }> = {};

      ventasRows.slice(1).forEach(r => {
        if (!r[0]) return;
        ventasPorId[String(r[0]).trim()] = {
          cliente: r[3] || '',
          metodoPago: r[6] || '',
          tipo: r[4] || '',
          total: r[7] || '',
          totalNum: toNumber(r[7]),
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

      const ingresos = filtered
        .filter(r => String(r[2]).toLowerCase() === 'ingreso')
        .reduce((acc, r) => acc + toNumber(r[4]), 0);

      const egresos = filtered
        .filter(r => String(r[2]).toLowerCase() === 'egreso')
        .reduce((acc, r) => acc + toNumber(r[4]), 0);

      const cajaNeta = ingresos - egresos;

      res.json({
        ingresos: ingresos.toFixed(2),
        egresos: egresos.toFixed(2),
        cajaNeta: cajaNeta.toFixed(2),
        ingresosNum: ingresos,
        egresosNum: egresos,
        cajaNetaNum: cajaNeta,
        movimientos: filtered.map(r => {
          const ref = r[6] ? String(r[6]).trim() : '';
          const esVenta = /^\d+$/.test(ref);
          const venta = esVenta ? ventasPorId[ref] : null;
          const items = esVenta ? (detallesPorVenta[ref] || []) : [];

          return {
            id: r[0],
            fecha: r[1],
            tipo: r[2],
            concepto: r[3],
            monto: r[4],
            montoNum: toNumber(r[4]),
            usuario: r[5],
            referencia: ref,
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
