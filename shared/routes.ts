import { z } from 'zod';
import { 
  insertProductSchema, products, 
  insertClientSchema, clients, 
  insertExpenseSchema, expenses, 
  insertCashRegisterSchema, cashRegisters,
  createSalePayloadSchema,
  users,
  insertUserSchema
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  users: {
    list: { method: 'GET' as const, path: '/api/users' as const, responses: { 200: z.array(z.custom<typeof users.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/users' as const, input: insertUserSchema, responses: { 201: z.custom<typeof users.$inferSelect>(), 400: errorSchemas.validation } },
  },
  products: {
    list: { method: 'GET' as const, path: '/api/products' as const, responses: { 200: z.array(z.custom<typeof products.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/products' as const, input: insertProductSchema, responses: { 201: z.custom<typeof products.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: 'PUT' as const, path: '/api/products/:id' as const, input: insertProductSchema.partial(), responses: { 200: z.custom<typeof products.$inferSelect>(), 404: errorSchemas.notFound } },
    delete: { method: 'DELETE' as const, path: '/api/products/:id' as const, responses: { 204: z.void(), 404: errorSchemas.notFound } },
  },
  clients: {
    list: { method: 'GET' as const, path: '/api/clients' as const, responses: { 200: z.array(z.custom<typeof clients.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/clients' as const, input: insertClientSchema, responses: { 201: z.custom<typeof clients.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: 'PUT' as const, path: '/api/clients/:id' as const, input: insertClientSchema.partial(), responses: { 200: z.custom<typeof clients.$inferSelect>(), 404: errorSchemas.notFound } },
    payDebt: { method: 'POST' as const, path: '/api/clients/:id/pay' as const, input: z.object({ amount: z.coerce.number() }), responses: { 200: z.custom<typeof clients.$inferSelect>(), 404: errorSchemas.notFound } },
  },
  sales: {
    list: { method: 'GET' as const, path: '/api/sales' as const, responses: { 200: z.array(z.any()) } }, 
    create: { method: 'POST' as const, path: '/api/sales' as const, input: createSalePayloadSchema, responses: { 201: z.any() } },
    get: { method: 'GET' as const, path: '/api/sales/:id' as const, responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },
  expenses: {
    list: { method: 'GET' as const, path: '/api/expenses' as const, responses: { 200: z.array(z.custom<typeof expenses.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/expenses' as const, input: insertExpenseSchema, responses: { 201: z.custom<typeof expenses.$inferSelect>(), 400: errorSchemas.validation } },
  },
  cashRegisters: {
    current: { method: 'GET' as const, path: '/api/cash-registers/current' as const, responses: { 200: z.any() } },
    open: { method: 'POST' as const, path: '/api/cash-registers/open' as const, input: insertCashRegisterSchema, responses: { 201: z.custom<typeof cashRegisters.$inferSelect>() } },
    close: { method: 'POST' as const, path: '/api/cash-registers/close' as const, input: z.object({ closingBalance: z.coerce.number() }), responses: { 200: z.custom<typeof cashRegisters.$inferSelect>() } },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
