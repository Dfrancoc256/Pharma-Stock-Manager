import { pgTable, text, serial, integer, timestamp, numeric, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// --- REPLIT AUTH TABLES ---
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: text("username").unique(),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- PHARMACY TABLES ---
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  casa: text("casa"),
  categoria: text("categoria"),
  precioCompra: numeric("precio_compra").notNull(),
  precioUnidad: numeric("precio_unidad").notNull(),
  precioBlister: numeric("precio_blister"),
  precioCaja: numeric("precio_caja"),
  posicion: text("posicion"),
  drogueria: text("drogueria"),
  unidadesBlister: integer("unidades_blister"),
  unidadesCaja: integer("unidades_caja"),
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

export const movements = pgTable("movements", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "in" or "out"
  amount: numeric("amount").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  total: numeric("total").notNull(),
  supplier: text("supplier"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: numeric("price").notNull(),
});

export const cashRegisters = pgTable("cash_registers", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow(),
  openingBalance: numeric("opening_balance").notNull().default("0"),
  closingBalance: numeric("closing_balance"),
  expectedBalance: numeric("expected_balance"),
  status: text("status").notNull().default("open"), // "open" or "closed"
});

// --- SCHEMAS ---
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true });
export const insertMovementSchema = createInsertSchema(movements).omit({ id: true, createdAt: true });
export const insertPurchaseSchema = createInsertSchema(purchases).omit({ id: true, createdAt: true });
export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({ id: true });
export const insertCashRegisterSchema = createInsertSchema(cashRegisters).omit({ id: true, date: true });

// --- TYPES ---
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;

export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;

export type Movement = typeof movements.$inferSelect;
export type InsertMovement = z.infer<typeof insertMovementSchema>;

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;

export type CashRegister = typeof cashRegisters.$inferSelect;
export type InsertCashRegister = z.infer<typeof insertCashRegisterSchema>;

export const createSalePayloadSchema = z.object({
  sale: insertSaleSchema,
  items: z.array(insertSaleItemSchema),
});
export type CreateSalePayload = z.infer<typeof createSalePayloadSchema>;

export const createPurchasePayloadSchema = z.object({
  purchase: insertPurchaseSchema,
  items: z.array(insertPurchaseItemSchema),
});
export type CreatePurchasePayload = z.infer<typeof createPurchasePayloadSchema>;

export type SaleWithItems = Sale & { items: (SaleItem & { product: Product })[] };
