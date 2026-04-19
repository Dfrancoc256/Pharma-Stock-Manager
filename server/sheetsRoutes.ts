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