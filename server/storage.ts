import { db } from "./db";
import { eq, sql, desc, and, isNull } from "drizzle-orm";
import {
  users, User, InsertUser,
  products, Product, InsertProduct,
  clients, Client, InsertClient,
  sales, Sale, InsertSale,
  saleItems, SaleItem, InsertSaleItem,
  expenses, Expense, InsertExpense,
  cashRegisters, CashRegister, InsertCashRegister,
  CreateSalePayload
} from "@shared/schema";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
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

  // Expenses
  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;

  // Cash Register
  getCurrentCashRegister(): Promise<CashRegister | undefined>;
  openCashRegister(register: InsertCashRegister): Promise<CashRegister>;
  closeCashRegister(closingBalance: string): Promise<CashRegister | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
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
    // Basic implementation (in a real scenario we use a transaction, but using separate queries here for Drizzle simplicity unless tx is perfectly configured)
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

  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }
  
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(expense).returning();
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
