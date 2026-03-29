import { Express } from "express";
import {
  getStock,
  getVentas,
  getMovimientos,
  getFiadores
} from "./googleSheets";

export function registerSheetsRoutes(app: Express) {

  app.get("/api/sheets/dashboard", async (req, res) => {
    try {
      const stock = await getStock();
      const ventas = await getVentas();

      res.json({
        ok: true,
        data: {
          totalProductos: stock.length,
          totalVentas: ventas.length,
          stock
        }
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

  app.get("/api/sheets/movimientos", async (req, res) => {
    try {
      const data = await getMovimientos();
      res.json({ ok: true, data });
    } catch (error) {
      res.status(500).json({ ok: false });
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
