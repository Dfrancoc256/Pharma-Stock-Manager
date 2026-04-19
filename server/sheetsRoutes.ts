import { Express } from "express";
import {
  getStock,
  getVentas,
  getMovimientos,
  getFiadores,
  createVentaSheet,
  createMovimientoSheet,
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
          const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
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

      const existenciaTotal = safeStock.reduce((acc, p) => {
        return acc + toNumber(p?.Stock);
      }, 0);

      const bajosStock = safeStock.filter((p) => {
        const s = toNumber(p?.Stock);
        return s > 0 && s <= 5;
      }).length;

      const ingresos = safeVentas.reduce((acc, v) => {
        return acc + toNumber(v?.Total);
      }, 0);

      const egresos = safeMovimientos
        .filter((m) => {
          const tipo = String(m?.Tipo ?? "").toLowerCase();
          return tipo.includes("egreso") || tipo.includes("salida") || tipo.includes("gasto");
        })
        .reduce((acc, m) => {
          return acc + toNumber(m?.Monto);
        }, 0);

      const cajaNeta = ingresos - egresos;

      const ventasHoy = safeVentas.filter((v) => {
        const fecha = String(v?.Fecha ?? "");
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, "0");
        const dd = String(hoy.getDate()).padStart(2, "0");
        return fecha.includes(`${yyyy}-${mm}-${dd}`) || fecha.includes(`${dd}/${mm}/${yyyy}`);
      });

      const ventasPorDiaMap = new Map<string, { fecha: string; ingresos: number; egresos: number }>();

      safeVentas.forEach((v) => {
        const fechaRaw = String(v?.Fecha ?? "");
        const key = fechaRaw.slice(0, 10) || "Sin fecha";

        if (!ventasPorDiaMap.has(key)) {
          ventasPorDiaMap.set(key, { fecha: key, ingresos: 0, egresos: 0 });
        }

        ventasPorDiaMap.get(key)!.ingresos += toNumber(v?.Total);
      });

      safeMovimientos.forEach((m) => {
        const fechaRaw = String(m?.Fecha ?? "");
        const key = fechaRaw.slice(0, 10) || "Sin fecha";
        const tipo = String(m?.Tipo ?? "").toLowerCase();

        if (!ventasPorDiaMap.has(key)) {
          ventasPorDiaMap.set(key, { fecha: key, ingresos: 0, egresos: 0 });
        }

        if (tipo.includes("egreso") || tipo.includes("salida") || tipo.includes("gasto")) {
          ventasPorDiaMap.get(key)!.egresos += toNumber(m?.Monto);
        }
      });

      const ventasPorDia = Array.from(ventasPorDiaMap.values()).sort((a, b) =>
        a.fecha.localeCompare(b.fecha)
      );

      const ventasPorMesMap = new Map<string, { label: string; ingresos: number; order: number }>();

      safeVentas.forEach((v) => {
        const fechaRaw = String(v?.Fecha ?? "");
        const d = new Date(fechaRaw);
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

      const topProductos: { id: string; nombre: string; total: number; cantidad: number }[] = [];

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
      res.status(500).json({ ok: false });
    }
  });

  app.get("/api/sheets/ventas", async (req, res) => {
    try {
      const data = await getVentas();
      res.json({ ok: true, data });
    } catch (error) {
      res.status(500).json({ ok: false });
    }
  });

  app.post("/api/sheets/ventas", async (req, res) => {
    try {
      const {
        fecha,
        usuario,
        cliente,
        tipo,
        fiadorId,
        metodoPago,
        total,
        items,
      } = req.body;

      if (!cliente || !tipo || !metodoPago || !total || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          ok: false,
          message: "Datos incompletos para registrar la venta",
        });
      }

      const fechaFinal =
        fecha ||
        new Date().toISOString().slice(0, 19).replace("T", " ");

      const usuarioFinal = usuario || "admin";

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
        usuario: usuario || "admin",
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
      res.status(500).json({ ok: false });
    }
  });
}