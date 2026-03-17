import type { Express } from "express";
import type { Server } from "http";
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
  return httpServer;
}
