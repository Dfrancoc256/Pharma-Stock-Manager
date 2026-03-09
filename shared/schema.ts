import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price").notNull(), 
  cost: numeric("cost").notNull(), 
  stock: integer("stock").notNull().default(0),
  barcode: text("barcode"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  debt: numeric("debt").notNull().default("0"), 
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  total: numeric("total").notNull(),
  status: text("status").notNull().default("paid"), // "paid" or "credit"
  clientId: integer("client_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: numeric("price").notNull(), 
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  amount: numeric("amount").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cashRegisters = pgTable("cash_registers", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow(),
  openingBalance: numeric("opening_balance").notNull().default("0"),
  closingBalance: numeric("closing_balance"),
  expectedBalance: numeric("expected_balance"),
  status: text("status").notNull().default("open"), // "open" or "closed"
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export const insertCashRegisterSchema = createInsertSchema(cashRegisters).omit({ id: true, date: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;

export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type CashRegister = typeof cashRegisters.$inferSelect;
export type InsertCashRegister = z.infer<typeof insertCashRegisterSchema>;

export const createSalePayloadSchema = z.object({
  sale: insertSaleSchema,
  items: z.array(insertSaleItemSchema),
});
export type CreateSalePayload = z.infer<typeof createSalePayloadSchema>;

export type SaleWithItems = Sale & { items: (SaleItem & { product: Product })[] };
