import { Express } from "express";
import {
  getStock,
  getVentas,
  getMovimientos,
  getFiadores,
  getDetalleVenta,
  createVentaSheet,
  createMovimientoSheet,
  createProductoSheet,
  updateProductoSheet,
  deleteProductoSheet,
  getPedidos,
  createPedidoSheet,
  updatePedidoSheet,
  deletePedidoSheet,
} from "./googleSheets";

export function registerSheetsRoutes(app: Express) {
  app.get("/api/sheets/dashboard", async (req, res) => {
    try {
      const stock = await getStock();
      const ventas = await getVentas();
      const movimientos = await getMovimientos();

      const toNumber = (value: unknown): number => {
        if (typeof value === "number") return Number.isFinite(value) ? value : 0;
        if (typeof value === "string") {
          const cleaned = value.trim().replace(/\s/g, "").replace(/,/g, "").replace(/Q/gi, "");
          const n = Number(cleaned);
          return Number.isFinite(n) ? n : 0;
        }
        return 0;
      };

      const safeStock = Array.isArray(stock) ? stock : [];
      const safeVentas = Array.isArray(ventas) ? ventas : [];
      const safeMovimientos = Array.isArray(movimientos) ? movimientos : [];

      const totalProductos = safeStock.filter((p) => p?.ID && p?.Nombre).length;
      const totalVentas = safeVentas.length;
      const existenciaTotal = safeStock.reduce((acc, p) => acc + toNumber(p?.Stock), 0);

      const bajosStock = safeStock.filter((p) => {
        const s = toNumber(p?.Stock);
        return s > 0 && s <= 5;
      }).length;

      const ingresos = safeVentas.reduce((acc, v) => acc + toNumber(v?.Total), 0);

      const egresos = safeMovimientos
        .filter((m) => {
          const tipo = String(m?.Tipo ?? "").toLowerCase();
          return tipo.includes("egreso") || tipo.includes("salida") || tipo.includes("gasto");
        })
        .reduce((acc, m) => acc + toNumber(m?.Monto), 0);

      const cajaNeta = ingresos - egresos;

      const normalizeDateKey = (fechaRaw: unknown): string => {
        const fecha = String(fechaRaw ?? "").trim();
        if (!fecha) return "";

        const isoMatch = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

        const latamMatch = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (latamMatch) return `${latamMatch[3]}-${latamMatch[2]}-${latamMatch[1]}`;

        const d = new Date(fecha);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        }

        return "";
      };

      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
        today.getDate()
      ).padStart(2, "0")}`;

      const ventasHoyBase = safeVentas.filter((v) => normalizeDateKey(v?.Fecha) === todayKey);

      const ventasHoy = await Promise.all(
        ventasHoyBase.map(async (v) => {
          const idVenta = String(v?.ID_Venta ?? "");
          const detalle = idVenta ? await getDetalleVenta(idVenta) : [];

          return {
            id: idVenta,
            fecha: String(v?.Fecha ?? ""),
            usuario: String(v?.Usuario ?? ""),
            cliente: String(v?.Cliente ?? ""),
            tipo: String(v?.Tipo ?? ""),
            metodoPago: String(v?.MetodoPago ?? ""),
            total: String(v?.Total ?? "0"),
            items: Array.isArray(detalle)
              ? detalle.map((d) => ({
                  nombre: String(d?.Nombre ?? ""),
                  cantidad: String(d?.Cantidad ?? "0"),
                  subtotal: String(d?.Subtotal ?? "0"),
                }))
              : [],
          };
        })
      );

      const ventasPorDiaMap = new Map<string, { fecha: string; ingresos: number; egresos: number }>();

      safeVentas.forEach((v) => {
        const key = normalizeDateKey(v?.Fecha) || "Sin fecha";

        if (!ventasPorDiaMap.has(key)) {
          ventasPorDiaMap.set(key, { fecha: key, ingresos: 0, egresos: 0 });
        }

        ventasPorDiaMap.get(key)!.ingresos += toNumber(v?.Total);
      });

      safeMovimientos.forEach((m) => {
        const key = normalizeDateKey(m?.Fecha) || "Sin fecha";
        const tipo = String(m?.Tipo ?? "").toLowerCase();

        if (!ventasPorDiaMap.has(key)) {
          ventasPorDiaMap.set(key, { fecha: key, ingresos: 0, egresos: 0 });
        }

        if (tipo.includes("egreso") || tipo.includes("salida") || tipo.includes("gasto")) {
          ventasPorDiaMap.get(key)!.egresos += toNumber(m?.Monto);
        }
      });

      const ventasPorDia = Array.from(ventasPorDiaMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));

      const ventasPorMesMap = new Map<string, { label: string; ingresos: number; order: number }>();

      safeVentas.forEach((v) => {
        const key = normalizeDateKey(v?.Fecha);
        if (!key) return;

        const d = new Date(`${key}T00:00:00`);
        if (isNaN(d.getTime())) return;

        const label = d.toLocaleDateString("es-GT", { month: "short", year: "2-digit" });
        const order = d.getFullYear() * 100 + (d.getMonth() + 1);

        if (!ventasPorMesMap.has(label)) {
          ventasPorMesMap.set(label, { label, ingresos: 0, order });
        }

        ventasPorMesMap.get(label)!.ingresos += toNumber(v?.Total);
      });

      const ventasPorMes = Array.from(ventasPorMesMap.values()).sort((a, b) => a.order - b.order);

      const topCategoriasMap = new Map<string, number>();
      safeStock.forEach((p) => {
        const cat = String(p?.Categoria ?? "Sin categoría").trim() || "Sin categoría";
        topCategoriasMap.set(cat, (topCategoriasMap.get(cat) || 0) + 1);
      });

      const topCategorias = Array.from(topCategoriasMap.entries())
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 8);

      const topProductosMap = new Map<string, { id: string; nombre: string; total: number; cantidad: number }>();

      for (const venta of safeVentas) {
        const idVenta = String(venta?.ID_Venta ?? "");
        if (!idVenta) continue;

        const detalle = await getDetalleVenta(idVenta);
        if (!Array.isArray(detalle)) continue;

        detalle.forEach((d) => {
          const id = String(d?.Producto_ID ?? "");
          const nombre = String(d?.Nombre ?? "Producto");
          const cantidad = toNumber(d?.Cantidad);
          const subtotal = toNumber(d?.Subtotal);

          if (!topProductosMap.has(id)) {
            topProductosMap.set(id, { id, nombre, total: 0, cantidad: 0 });
          }

          const actual = topProductosMap.get(id)!;
          actual.total += subtotal;
          actual.cantidad += cantidad;
        });
      }

      const topProductos = Array.from(topProductosMap.values())
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 8);

      res.json({
        ok: true,
        data: {
          totalProductos,
          totalVentas,
          existenciaTotal,
          bajosStock,
          ingresos: ingresos.toFixed(2),
          egresos: egresos.toFixed(2),
          cajaNeta: cajaNeta.toFixed(2),
          ventasHoy,
          ventasPorDia,
          ventasPorMes,
          topCategorias,
          topProductos,
        },
      });
    } catch (error) {
      console.error("dashboard error:", error);
      res.status(500).json({ ok: false });
    }
  });

  app.get("/api/sheets/stock", async (req, res) => {
    try {
      const data = await getStock();
      res.json({ ok: true, data });
    } catch (error) {
      console.error("stock error:", error);
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/sheets/stock", async (req, res) => {
    try {
      const {
        nombre,
        detalle,
        casa,
        categoria,
        precioCompra,
        precioUnidad,
        precioBlister,
        precioCaja,
        posicion,
        drogueria,
        stock,
        unidadesBlister,
        unidadesCaja,
      } = req.body;

      if (!nombre || precioCompra === undefined || precioUnidad === undefined) {
        return res.status(400).json({
          ok: false,
          message: "Datos incompletos para crear producto",
        });
      }

      const result = await createProductoSheet({
        nombre: String(nombre),
        detalle: String(detalle || ""),
        casa: String(casa || ""),
        categoria: String(categoria || ""),
        precioCompra: Number(precioCompra) || 0,
        precioUnidad: Number(precioUnidad) || 0,
        precioBlister: Number(precioBlister) || 0,
        precioCaja: Number(precioCaja) || 0,
        posicion: String(posicion || ""),
        drogueria: String(drogueria || ""),
        stock: Number(stock) || 0,
        unidadesBlister: Number(unidadesBlister) || 0,
        unidadesCaja: Number(unidadesCaja) || 0,
      });

      res.json({ ok: true, data: result });
    } catch (error) {
      console.error("Error creando producto:", error);
      res.status(500).json({
        ok: false,
        message: "Error al crear producto",
      });
    }
  });

  app.put("/api/sheets/stock/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const {
        nombre,
        detalle,
        casa,
        categoria,
        precioCompra,
        precioUnidad,
        precioBlister,
        precioCaja,
        posicion,
        drogueria,
        stock,
        unidadesBlister,
        unidadesCaja,
      } = req.body;

      if (!id || !nombre || precioCompra === undefined || precioUnidad === undefined) {
        return res.status(400).json({
          ok: false,
          message: "Datos incompletos para actualizar producto",
        });
      }

      const result = await updateProductoSheet(id, {
        nombre: String(nombre),
        detalle: String(detalle || ""),
        casa: String(casa || ""),
        categoria: String(categoria || ""),
        precioCompra: Number(precioCompra) || 0,
        precioUnidad: Number(precioUnidad) || 0,
        precioBlister: Number(precioBlister) || 0,
        precioCaja: Number(precioCaja) || 0,
        posicion: String(posicion || ""),
        drogueria: String(drogueria || ""),
        stock: Number(stock) || 0,
        unidadesBlister: Number(unidadesBlister) || 0,
        unidadesCaja: Number(unidadesCaja) || 0,
      });

      res.json({ ok: true, data: result });
    } catch (error) {
      console.error("Error actualizando producto:", error);
      res.status(500).json({
        ok: false,
        message: "Error al actualizar producto",
      });
    }
  });

  app.delete("/api/sheets/stock/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteProductoSheet(String(id));
      res.json({ ok: true });
    } catch (error) {
      console.error("Error eliminando producto:", error);
      res.status(500).json({
        ok: false,
        message: "Error al eliminar producto",
      });
    }
  });

  app.get("/api/sheets/ventas", async (req, res) => {
    try {
      const data = await getVentas();
      res.json({ ok: true, data });
    } catch (error) {
      console.error("ventas error:", error);
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/sheets/ventas", async (req, res) => {
    try {
      const { fecha, usuario, cliente, tipo, fiadorId, metodoPago, total, items } = req.body;

      if (
        !cliente ||
        !tipo ||
        !metodoPago ||
        total === undefined ||
        total === null ||
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          ok: false,
          message: "Datos incompletos para registrar la venta",
        });
      }

      const fechaFinal = fecha || new Date().toISOString().slice(0, 19).replace("T", " ");
      const usuarioFinal = usuario || "Sistema";

      const result = await createVentaSheet({
        fecha: fechaFinal,
        usuario: usuarioFinal,
        cliente,
        tipo,
        fiadorId: fiadorId || "",
        metodoPago,
        total: Number(total) || 0,
        items: items.map((item: any) => ({
          productoId: String(item.productoId || ""),
          nombre: String(item.nombre || ""),
          tipoPrecio: String(item.tipoPrecio || "unidad"),
          cantidad: Number(item.cantidad) || 0,
          precioUnitario: Number(item.precioUnitario) || 0,
          subtotal: Number(item.subtotal) || 0,
          costoUnitario: Number(item.costoUnitario) || 0,
          utilidad: Number(item.utilidad) || 0,
        })),
      });

      await createMovimientoSheet({
        fecha: fechaFinal,
        tipo: "ingreso",
        concepto: `Venta ${cliente}`,
        monto: Number(total) || 0,
        usuario: usuarioFinal,
        referencia: String(result.id),
      });

      res.json({
        ok: true,
        data: result,
      });
    } catch (error) {
      console.error("Error creando venta:", error);
      res.status(500).json({
        ok: false,
        message: "Error al registrar la venta",
      });
    }
  });

  app.get("/api/sheets/movimientos", async (req, res) => {
    try {
      const data = await getMovimientos();
      res.json({ ok: true, data });
    } catch (error) {
      console.error("movimientos error:", error);
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/sheets/movimientos", async (req, res) => {
    try {
      const { tipo, concepto, monto, fecha, usuario, referencia } = req.body;

      if (!tipo || !concepto || monto === undefined || monto === null || monto === "") {
        return res.status(400).json({
          ok: false,
          message: "Datos incompletos para registrar movimiento",
        });
      }

      const result = await createMovimientoSheet({
        fecha: fecha || new Date().toISOString().slice(0, 19).replace("T", " "),
        tipo: String(tipo),
        concepto: String(concepto),
        monto: Number(monto) || 0,
        usuario: usuario || "Sistema",
        referencia: referencia || "",
      });

      res.json({
        ok: true,
        data: result,
      });
    } catch (error) {
      console.error("Error creando movimiento:", error);
      res.status(500).json({
        ok: false,
        message: "Error al registrar movimiento",
      });
    }
  });

  app.get("/api/sheets/balances", async (req, res) => {
    try {
      const ventas = await getVentas();
      const movimientos = await getMovimientos();

      const safeVentas = Array.isArray(ventas) ? ventas : [];
      const safeMovimientos = Array.isArray(movimientos) ? movimientos : [];

      const desde = String(req.query.desde ?? "").trim();
      const hasta = String(req.query.hasta ?? "").trim();

      const toNumber = (value: unknown): number => {
        if (typeof value === "number") return Number.isFinite(value) ? value : 0;
        if (typeof value === "string") {
          const cleaned = value.trim().replace(/\s/g, "").replace(/,/g, "").replace(/Q/gi, "");
          const n = Number(cleaned);
          return Number.isFinite(n) ? n : 0;
        }
        return 0;
      };

      const normalizeDateKey = (fechaRaw: unknown): string => {
        const fecha = String(fechaRaw ?? "").trim();
        if (!fecha) return "";

        const isoMatch = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

        const latamMatch = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (latamMatch) return `${latamMatch[3]}-${latamMatch[2]}-${latamMatch[1]}`;

        const d = new Date(fecha);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        }

        return "";
      };

      const inRange = (fechaRaw: unknown): boolean => {
        const key = normalizeDateKey(fechaRaw);
        if (!key) return !desde && !hasta;
        if (desde && key < desde) return false;
        if (hasta && key > hasta) return false;
        return true;
      };

      const ventasMap = new Map<
        string,
        {
          cliente: string;
          metodoPago: string;
          tipo: string;
          total: string;
        }
      >();

      safeVentas.forEach((v) => {
        const idVenta = String(v?.ID_Venta ?? "").trim();
        if (!idVenta) return;

        ventasMap.set(idVenta, {
          cliente: String(v?.Cliente ?? ""),
          metodoPago: String(v?.MetodoPago ?? ""),
          tipo: String(v?.Tipo ?? ""),
          total: String(v?.Total ?? "0"),
        });
      });

      const movimientosEnriquecidos = await Promise.all(
        safeMovimientos
          .filter((m) => inRange(m?.Fecha))
          .map(async (m) => {
            const referencia = String(m?.Referencia ?? "").trim();
            const venta = referencia && ventasMap.has(referencia) ? ventasMap.get(referencia)! : null;
            const detalle = venta ? await getDetalleVenta(referencia) : [];

            return {
              id: String(m?.ID_Movimiento ?? ""),
              fecha: String(m?.Fecha ?? ""),
              tipo: String(m?.Tipo ?? "").toLowerCase(),
              concepto: String(m?.Concepto ?? ""),
              monto: String(m?.Monto ?? "0"),
              usuario: String(m?.Usuario ?? ""),
              referencia,
              items: Array.isArray(detalle)
                ? detalle.map((d) => ({
                    nombre: String(d?.Nombre ?? ""),
                    cantidad: String(d?.Cantidad ?? "0"),
                    precioUnitario: String(d?.PrecioUnitario ?? "0"),
                    subtotal: String(d?.Subtotal ?? "0"),
                    tipoPrecio: String(d?.TipoPrecio ?? ""),
                  }))
                : [],
              venta,
            };
          })
      );

      const ingresos = movimientosEnriquecidos
        .filter((m) => {
          const tipo = String(m.tipo).toLowerCase();
          return tipo.includes("ingreso") || tipo.includes("entrada");
        })
        .reduce((acc, m) => acc + toNumber(m.monto), 0);

      const egresos = movimientosEnriquecidos
        .filter((m) => {
          const tipo = String(m.tipo).toLowerCase();
          return tipo.includes("egreso") || tipo.includes("salida") || tipo.includes("gasto");
        })
        .reduce((acc, m) => acc + toNumber(m.monto), 0);

      const cajaNeta = ingresos - egresos;

      const movimientosOrdenados = movimientosEnriquecidos.sort((a, b) => {
        const fa = new Date(a.fecha).getTime();
        const fb = new Date(b.fecha).getTime();

        if (!isNaN(fa) && !isNaN(fb)) return fb - fa;
        return String(b.fecha).localeCompare(String(a.fecha));
      });

      res.json({
        ok: true,
        data: {
          ingresos: ingresos.toFixed(2),
          egresos: egresos.toFixed(2),
          cajaNeta: cajaNeta.toFixed(2),
          movimientos: movimientosOrdenados,
        },
      });
    } catch (error) {
      console.error("balances error:", error);
      res.status(500).json({
        ok: false,
        message: "Error al cargar balances",
      });
    }
  });

  // ==================== PEDIDOS ====================

  app.get("/api/sheets/pedidos", async (req, res) => {
    try {
      const data = await getPedidos();
      res.json({ ok: true, data });
    } catch (error) {
      console.error("pedidos error:", error);
      res.status(500).json({
        ok: false,
        message: "Error al cargar pedidos",
      });
    }
  });

  app.post("/api/sheets/pedidos", async (req, res) => {
    try {
      const {
        fecha,
        productoId,
        nombre,
        proveedor,
        cantidad,
        costoUnitario,
        estado,
        usuario,
        observaciones,
      } = req.body;

      if (!nombre || cantidad === undefined || cantidad === null || cantidad === "") {
        return res.status(400).json({
          ok: false,
          message: "Datos incompletos para registrar pedido",
        });
      }

      const cantidadFinal = Number(cantidad) || 0;
      const costoUnitarioFinal = Number(costoUnitario) || 0;
      const total = cantidadFinal * costoUnitarioFinal;

      const result = await createPedidoSheet({
        fecha: fecha || new Date().toISOString().slice(0, 19).replace("T", " "),
        productoId: String(productoId || ""),
        nombre: String(nombre),
        proveedor: String(proveedor || ""),
        cantidad: cantidadFinal,
        costoUnitario: costoUnitarioFinal,
        total,
        estado: String(estado || "pendiente"),
        usuario: String(usuario || "Sistema"),
        observaciones: String(observaciones || ""),
      });

      res.json({ ok: true, data: result });
    } catch (error) {
      console.error("crear pedido error:", error);
      res.status(500).json({
        ok: false,
        message: "Error al registrar pedido",
      });
    }
  });

  app.put("/api/sheets/pedidos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const {
        fecha,
        productoId,
        nombre,
        proveedor,
        cantidad,
        costoUnitario,
        estado,
        usuario,
        observaciones,
      } = req.body;

      const cantidadFinal = cantidad !== undefined ? Number(cantidad) || 0 : undefined;
      const costoUnitarioFinal = costoUnitario !== undefined ? Number(costoUnitario) || 0 : undefined;

      const total =
        cantidadFinal !== undefined && costoUnitarioFinal !== undefined
          ? cantidadFinal * costoUnitarioFinal
          : undefined;

      const result = await updatePedidoSheet(String(id), {
        fecha,
        productoId,
        nombre,
        proveedor,
        cantidad: cantidadFinal,
        costoUnitario: costoUnitarioFinal,
        total,
        estado,
        usuario,
        observaciones,
      });

      res.json({ ok: true, data: result });
    } catch (error) {
      console.error("update pedido error:", error);
      res.status(500).json({
        ok: false,
        message: "Error al actualizar pedido",
      });
    }
  });

  app.delete("/api/sheets/pedidos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deletePedidoSheet(String(id));
      res.json({ ok: true });
    } catch (error) {
      console.error("delete pedido error:", error);
      res.status(500).json({
        ok: false,
        message: "Error al eliminar pedido",
      });
    }
  });

  app.get("/api/sheets/fiadores", async (req, res) => {
    try {
      const data = await getFiadores();
      res.json({ ok: true, data });
    } catch (error) {
      console.error("fiadores error:", error);
      res.status(500).json({ ok: false });
    }
  });
}