import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerSheetsRoutes } from "./sheetsRoutes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Replit Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // Google Sheets Routes
  registerSheetsRoutes(app);

  // Users
  app.get(api.users.list.path, async (req, res) => {
    const items = await storage.getUsers();
    res.json(items);
  });
  
  app.post(api.users.create.path, async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      const item = await storage.createUser(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  // Products
  app.get(api.products.list.path, async (req, res) => {
    const items = await storage.getProducts();
    res.json(items);
  });

  app.post(api.products.create.path, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const item = await storage.createProduct(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.put(api.products.update.path, async (req, res) => {
    try {
      const input = api.products.update.input.parse(req.body);
      const item = await storage.updateProduct(Number(req.params.id), input);
      if (!item) return res.status(404).json({ message: 'Product not found' });
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    await storage.deleteProduct(Number(req.params.id));
    res.status(204).end();
  });

  // Clients
  app.get(api.clients.list.path, async (req, res) => {
    const items = await storage.getClients();
    res.json(items);
  });

  app.post(api.clients.create.path, async (req, res) => {
    try {
      const input = api.clients.create.input.parse(req.body);
      const item = await storage.createClient(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.put(api.clients.update.path, async (req, res) => {
    try {
      const input = api.clients.update.input.parse(req.body);
      const item = await storage.updateClient(Number(req.params.id), input);
      if (!item) return res.status(404).json({ message: 'Client not found' });
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.post(api.clients.payDebt.path, async (req, res) => {
    try {
      const { amount } = api.clients.payDebt.input.parse(req.body);
      const item = await storage.payDebt(Number(req.params.id), amount.toString());
      if (!item) return res.status(404).json({ message: 'Client not found' });
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  // Sales
  app.get(api.sales.list.path, async (req, res) => {
    const items = await storage.getSales();
    res.json(items);
  });

  app.post(api.sales.create.path, async (req, res) => {
    try {
      const input = api.sales.create.input.parse(req.body);
      const item = await storage.createSale(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      console.error(err);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  app.get(api.sales.get.path, async (req, res) => {
    const item = await storage.getSale(Number(req.params.id));
    if (!item) return res.status(404).json({ message: 'Sale not found' });
    res.json(item);
  });

  // Purchases
  app.get(api.purchases.list.path, async (req, res) => {
    const items = await storage.getPurchases();
    res.json(items);
  });

  app.post(api.purchases.create.path, async (req, res) => {
    try {
      const input = api.purchases.create.input.parse(req.body);
      const item = await storage.createPurchase(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  // Movements
  app.get(api.movements.list.path, async (req, res) => {
    const items = await storage.getMovements();
    res.json(items);
  });

  app.post(api.movements.create.path, async (req, res) => {
    try {
      const input = api.movements.create.input.parse(req.body);
      const item = await storage.createMovement(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  // Cash Registers
  app.get(api.cashRegisters.current.path, async (req, res) => {
    const item = await storage.getCurrentCashRegister();
    res.json(item || null);
  });

  app.post(api.cashRegisters.open.path, async (req, res) => {
    try {
      const input = api.cashRegisters.open.input.parse(req.body);
      const item = await storage.openCashRegister(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(400).json({ message: err instanceof Error ? err.message : "Error" });
    }
  });

  app.post(api.cashRegisters.close.path, async (req, res) => {
    try {
      const { closingBalance } = api.cashRegisters.close.input.parse(req.body);
      const item = await storage.closeCashRegister(closingBalance.toString());
      if (!item) return res.status(404).json({ message: 'Register not found' });
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(400).json({ message: err instanceof Error ? err.message : "Error" });
    }
  });

  // Seed db initially if empty
  setTimeout(async () => {
    try {
        const productsList = await storage.getProducts();
        if (productsList.length === 0) {
            await storage.createProduct({
                name: "Paracetamol 500mg",
                description: "Analgésico y antipirético",
                casa: "Genfar",
                categoria: "Analgésicos",
                precioCompra: "10.00",
                precioUnidad: "15.50",
                precioBlister: "140.00",
                precioCaja: "250.00",
                posicion: "A1",
                drogueria: "Droguería Inti",
                unidadesBlister: 10,
                unidadesCaja: 20,
                stock: 100,
                barcode: "1234567890"
            });
            console.log("Database seeded successfully");
        }
    } catch (e) {
        console.log("Seed ignored or failed, schema might not be pushed yet.");
    }
  }, 3000);

  return httpServer;
}
