import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupSimpleAuth } from "./simpleAuth";
import { registerSheetsRoutes } from "./sheetsRoutes";
import { registerAIRoutes } from "./aiRoutes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  setupSimpleAuth(app);
  registerSheetsRoutes(app);
  registerAIRoutes(app);

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

  return httpServer;
}
