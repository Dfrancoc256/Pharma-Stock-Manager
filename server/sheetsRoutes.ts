// Google Sheets API Routes - All data flows through Sheets as primary DB
import type { Express } from "express";
import {
  getStock, createProductoSheet, updateStockSheet, deleteProductoSheet,
  getVentas, getDetalleVenta, createVentaSheet,
  getMovimientos, createMovimientoSheet,
  getFiadores, createFiadorSheet, updateFiadorSaldoSheet,
  getUsuariosSheet, createUsuarioSheet, updateUsuarioSheet,
  leerHoja, appendFila
} from "./googleSheets";
import { format } from "date-fns";

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
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === id) {
          const body = req.body;
          const updated = [
            id,
            body.nombre ?? rows[i][1],
            body.detalle ?? rows[i][2],
            body.casa ?? rows[i][3],
            body.categoria ?? rows[i][4],
            body.precioCompra ?? rows[i][5],
            body.precioUnidad ?? rows[i][6],
            body.precioBlister ?? rows[i][7],
            body.precioCaja ?? rows[i][8],
            body.posicion ?? rows[i][9],
            body.stock ?? rows[i][10],
            body.drogueria ?? rows[i][11],
            body.unidadesBlister ?? rows[i][12],
            body.unidadesCaja ?? rows[i][13],
          ];
          const { updateRango } = await import('./googleSheets');
          await updateRango(`Stock!A${i + 1}`, [updated]);
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
      const fecha = format(new Date(), 'dd/MM/yyyy HH:mm');

      // Create the sale
      const ventaRows = await leerHoja('Ventas');
      const lastId = ventaRows.length > 1 ? parseInt(ventaRows[ventaRows.length - 1][0]) || 0 : 0;
      const newId = (lastId + 1).toString();

      await appendFila('Ventas', [newId, fecha, usuario, cliente || '', tipo || 'contado', fiadorId || '', metodoPago || 'efectivo', total]);

      // Add detail rows and update stock
      const stockRows = await leerHoja('Stock');
      for (const item of items) {
        const subtotal = (parseFloat(item.precioUnitario) * parseInt(item.cantidad)).toFixed(2);
        const utilidad = (parseFloat(item.precioUnitario) - parseFloat(item.costoUnitario || '0')).toFixed(2);
        await appendFila('Detalle_Venta', [
          newId, item.productoId, item.nombre, item.tipoPrecio || 'unidad',
          item.cantidad, item.precioUnitario, subtotal,
          item.costoUnitario || '0', utilidad
        ]);

        // Update stock in Sheets
        for (let i = 1; i < stockRows.length; i++) {
          if (stockRows[i][0] === item.productoId.toString()) {
            const currentStock = parseInt(stockRows[i][10]) || 0;
            const newStock = Math.max(0, currentStock - parseInt(item.cantidad));
            const { updateRango } = await import('./googleSheets');
            await updateRango(`Stock!K${i + 1}`, [[newStock]]);
            stockRows[i][10] = newStock.toString();
            break;
          }
        }
      }

      // Register ingreso movement
      const movRows = await leerHoja('Movimientos');
      const lastMovId = movRows.length > 1 ? parseInt(movRows[movRows.length - 1][0]) || 0 : 0;
      await appendFila('Movimientos', [lastMovId + 1, fecha, 'ingreso', `Venta #${newId}`, total, usuario, newId]);

      // Update fiador saldo if fiado
      if (tipo === 'fiado' && fiadorId) {
        await updateFiadorSaldoSheet(fiadorId, total);
      }

      res.status(201).json({ id: newId, total, fecha });
    } catch (err: any) {
      console.error('Error creating venta:', err);
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
      const fecha = format(new Date(), 'dd/MM/yyyy HH:mm');
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
      const { nombre, telefono, direccion } = req.body;
      const result = await createFiadorSheet({ nombre, telefono: telefono || '', direccion: direccion || '', saldo: '0' });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put('/api/sheets/fiadores/:id/pagar', async (req, res) => {
    try {
      const { monto } = req.body;
      const fiadores = await getFiadores();
      const fiador = fiadores.find(f => f['Fiador_ID'] === req.params.id);
      if (!fiador) return res.status(404).json({ message: 'Fiador no encontrado' });
      const saldoActual = parseFloat(fiador['Saldo_actual'] || '0');
      const nuevoSaldo = Math.max(0, saldoActual - parseFloat(monto)).toFixed(2);
      await updateFiadorSaldoSheet(req.params.id, nuevoSaldo);
      res.json({ id: req.params.id, nuevoSaldo });
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
      const { email, rol } = req.body;
      const result = await createUsuarioSheet({ email, rol: rol || 'vendedor', activo: 'true' });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put('/api/sheets/usuarios/:email', async (req, res) => {
    try {
      const { rol, activo } = req.body;
      await updateUsuarioSheet(decodeURIComponent(req.params.email), { rol, activo });
      res.json({ message: 'Actualizado' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== DASHBOARD ====================
  app.get('/api/sheets/dashboard', async (req, res) => {
    try {
      const [stockRows, movimientosRows, detalleVentaRows] = await Promise.all([
        leerHoja('Stock'),
        leerHoja('Movimientos'),
        leerHoja('Detalle_Venta'),
      ]);

      // Stock stats
      const productos = stockRows.slice(1).filter(r => r[0] && r[0] !== '');
      const totalProductos = productos.length;
      const existenciaTotal = productos.reduce((acc, r) => acc + (parseInt(r[10]) || 0), 0);
      const bajosStock = productos.filter(r => (parseInt(r[10]) || 0) < 5).length;

      // Movimientos stats
      const movs = movimientosRows.slice(1).filter(r => r[0]);
      const ingresos = movs.filter(r => r[2] === 'ingreso').reduce((acc, r) => acc + parseFloat(r[4] || '0'), 0);
      const egresos = movs.filter(r => r[2] === 'egreso').reduce((acc, r) => acc + parseFloat(r[4] || '0'), 0);
      const cajaNeta = ingresos - egresos;

      // Top productos
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
        .slice(0, 5)
        .map(([id, data]) => ({ id, ...data }));

      res.json({
        totalProductos, existenciaTotal, bajosStock,
        ingresos: ingresos.toFixed(2),
        egresos: egresos.toFixed(2),
        cajaNeta: cajaNeta.toFixed(2),
        topProductos
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
      const movRows = await leerHoja('Movimientos');
      const movs = movRows.slice(1).filter(r => r[0] && r[0] !== '');

      let filtered = movs;
      if (desde || hasta) {
        filtered = movs.filter(r => {
          if (!r[1]) return false;
          const [datePart] = r[1].split(' ');
          const [d, m, y] = datePart.split('/');
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
        movimientos: filtered.map(r => ({
          id: r[0], fecha: r[1], tipo: r[2], concepto: r[3],
          monto: r[4], usuario: r[5], referencia: r[6]
        }))
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
