import { db } from "./db";
import { eq, sql, desc, and, isNull } from "drizzle-orm";
import {
  users, User, InsertUser,
  products, Product, InsertProduct,
  clients, Client, InsertClient,
  sales, Sale, InsertSale,
  saleItems, SaleItem, InsertSaleItem,
  movements, Movement, InsertMovement,
  purchases, Purchase, InsertPurchase,
  purchaseItems, PurchaseItem, InsertPurchaseItem,
  cashRegisters, CashRegister, InsertCashRegister,
  CreateSalePayload, CreatePurchasePayload
} from "@shared/schema";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  payDebt(id: number, amount: string): Promise<Client | undefined>;

  // Sales
  getSales(): Promise<any[]>;
  getSale(id: number): Promise<any | undefined>;
  createSale(payload: CreateSalePayload): Promise<any>;

  // Purchases
  getPurchases(): Promise<any[]>;
  createPurchase(payload: CreatePurchasePayload): Promise<any>;

  // Movements
  getMovements(): Promise<Movement[]>;
  createMovement(movement: InsertMovement): Promise<Movement>;

  // Cash Register
  getCurrentCashRegister(): Promise<CashRegister | undefined>;
  openCashRegister(register: InsertCashRegister): Promise<CashRegister>;
  closeCashRegister(closingBalance: string): Promise<CashRegister | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }
  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }
  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated;
  }
  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }
  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }
  async createClient(client: InsertClient): Promise<Client> {
    const [created] = await db.insert(clients).values(client).returning();
    return created;
  }
  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    const [updated] = await db.update(clients).set(client).where(eq(clients.id, id)).returning();
    return updated;
  }
  async payDebt(id: number, amount: string): Promise<Client | undefined> {
    const client = await this.getClient(id);
    if (!client) return undefined;
    const newDebt = (parseFloat(client.debt) - parseFloat(amount)).toString();
    const [updated] = await db.update(clients).set({ debt: newDebt }).where(eq(clients.id, id)).returning();
    return updated;
  }

  async getSales(): Promise<any[]> {
    const allSales = await db.select().from(sales).orderBy(desc(sales.createdAt));
    const result = [];
    for (const s of allSales) {
      const items = await db.select({
        id: saleItems.id,
        saleId: saleItems.saleId,
        productId: saleItems.productId,
        quantity: saleItems.quantity,
        price: saleItems.price,
        product: products
      })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .where(eq(saleItems.saleId, s.id));
      
      let client = null;
      if (s.clientId) {
        client = await this.getClient(s.clientId);
      }
      
      result.push({ ...s, items, client });
    }
    return result;
  }

  async getSale(id: number): Promise<any | undefined> {
    const [s] = await db.select().from(sales).where(eq(sales.id, id));
    if (!s) return undefined;
    
    const items = await db.select({
        id: saleItems.id,
        saleId: saleItems.saleId,
        productId: saleItems.productId,
        quantity: saleItems.quantity,
        price: saleItems.price,
        product: products
      })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .where(eq(saleItems.saleId, s.id));
      
    let client = null;
    if (s.clientId) {
      client = await this.getClient(s.clientId);
    }
    
    return { ...s, items, client };
  }

  async createSale(payload: CreateSalePayload): Promise<any> {
    const [sale] = await db.insert(sales).values(payload.sale).returning();
    
    const itemsWithSaleId = payload.items.map(item => ({
      ...item,
      saleId: sale.id
    }));
    
    await db.insert(saleItems).values(itemsWithSaleId);
    
    // Update stock
    for (const item of payload.items) {
      const [product] = await db.select().from(products).where(eq(products.id, item.productId));
      if (product) {
        await db.update(products).set({ stock: product.stock - item.quantity }).where(eq(products.id, item.productId));
      }
    }
    
    // Update client debt if credit
    if (sale.status === 'credit' && sale.clientId) {
      const [client] = await db.select().from(clients).where(eq(clients.id, sale.clientId));
      if (client) {
        const newDebt = (parseFloat(client.debt) + parseFloat(sale.total)).toString();
        await db.update(clients).set({ debt: newDebt }).where(eq(clients.id, sale.clientId));
      }
    }
    
    return this.getSale(sale.id);
  }

  async getPurchases(): Promise<any[]> {
    const allPurchases = await db.select().from(purchases).orderBy(desc(purchases.createdAt));
    const result = [];
    for (const p of allPurchases) {
      const items = await db.select({
        id: purchaseItems.id,
        purchaseId: purchaseItems.purchaseId,
        productId: purchaseItems.productId,
        quantity: purchaseItems.quantity,
        price: purchaseItems.price,
        product: products
      })
      .from(purchaseItems)
      .leftJoin(products, eq(purchaseItems.productId, products.id))
      .where(eq(purchaseItems.purchaseId, p.id));
      
      result.push({ ...p, items });
    }
    return result;
  }

  async createPurchase(payload: CreatePurchasePayload): Promise<any> {
    const [purchase] = await db.insert(purchases).values(payload.purchase).returning();
    
    const itemsWithPurchaseId = payload.items.map(item => ({
      ...item,
      purchaseId: purchase.id
    }));
    
    await db.insert(purchaseItems).values(itemsWithPurchaseId);
    
    // Update stock
    for (const item of payload.items) {
      const [product] = await db.select().from(products).where(eq(products.id, item.productId));
      if (product) {
        await db.update(products).set({ stock: product.stock + item.quantity }).where(eq(products.id, item.productId));
      }
    }
    
    return purchase;
  }

  async getMovements(): Promise<Movement[]> {
    return await db.select().from(movements).orderBy(desc(movements.createdAt));
  }
  
  async createMovement(movement: InsertMovement): Promise<Movement> {
    const [created] = await db.insert(movements).values(movement).returning();
    return created;
  }

  async getCurrentCashRegister(): Promise<CashRegister | undefined> {
    const [register] = await db.select().from(cashRegisters).where(eq(cashRegisters.status, "open")).orderBy(desc(cashRegisters.date)).limit(1);
    return register;
  }

  async openCashRegister(register: InsertCashRegister): Promise<CashRegister> {
    const current = await this.getCurrentCashRegister();
    if (current) {
      throw new Error("Register is already open");
    }
    const [created] = await db.insert(cashRegisters).values(register).returning();
    return created;
  }

  async closeCashRegister(closingBalance: string): Promise<CashRegister | undefined> {
    const current = await this.getCurrentCashRegister();
    if (!current) {
      throw new Error("No open register to close");
    }
    
    const [updated] = await db.update(cashRegisters)
      .set({ 
        status: "closed", 
        closingBalance: closingBalance,
      })
      .where(eq(cashRegisters.id, current.id))
      .returning();
      
    return updated;
  }
}

export const storage = new DatabaseStorage();
