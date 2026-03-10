import { z } from 'zod';
import { 
  insertProductSchema, products, 
  insertClientSchema, clients, 
  insertMovementSchema, movements, 
  insertCashRegisterSchema, cashRegisters,
  createSalePayloadSchema,
  createPurchasePayloadSchema,
  users,
  insertUserSchema
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    me: { method: 'GET' as const, path: '/api/me' as const, responses: { 200: z.any().nullable() } },
    login: { method: 'POST' as const, path: '/api/login' as const, input: z.object({ username: z.string(), password: z.string() }), responses: { 200: z.any(), 401: errorSchemas.validation } },
    logout: { method: 'POST' as const, path: '/api/logout' as const, responses: { 200: z.object({ success: z.boolean() }) } },
  },
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
  purchases: {
    list: { method: 'GET' as const, path: '/api/purchases' as const, responses: { 200: z.array(z.any()) } },
    create: { method: 'POST' as const, path: '/api/purchases' as const, input: createPurchasePayloadSchema, responses: { 201: z.any() } },
  },
  movements: {
    list: { method: 'GET' as const, path: '/api/movements' as const, responses: { 200: z.array(z.custom<typeof movements.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/movements' as const, input: insertMovementSchema, responses: { 201: z.custom<typeof movements.$inferSelect>(), 400: errorSchemas.validation } },
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
