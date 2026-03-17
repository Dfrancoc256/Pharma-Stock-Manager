# Farmacia Web - Sistema de Gestión

## Arquitectura

Sistema web de farmacia para Guatemala. Google Sheets es la base de datos principal. PostgreSQL solo almacena sesiones y usuarios OAuth del sistema Replit.

### Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Base de datos primaria**: Google Sheets (googleapis)
- **Base de datos secundaria**: PostgreSQL (Drizzle ORM) — solo sesiones y tabla `users`
- **Autenticación**: `simpleAuth.ts` — valida contra hoja `Usuarios` de Google Sheets

## Google Sheets

**Spreadsheet ID**: `1MwgmtT8b5jOUzF0rt5E_uRMgjFG1uKcgIB-P3fFQ7p8`

### Pestañas requeridas (nombres exactos):
| Pestaña | Columnas |
|---------|----------|
| `Stock` | ID, Nombre, Detalle, Casa, Categoria, Precio compra, Precio unidad, Precio blister, Precio caja, Posicion, Stock, Drogueria, Unidades blister, Unidades caja |
| `Ventas` | ID_Venta, Fecha, Usuario, Cliente, Tipo, Fiador_ID, Metodo_pago, Total |
| `Detalle_Venta` | ID_Venta, Producto_ID, Nombre, Tipo_precio, Cantidad, Precio_unitario, Subtotal, Costo_unitario, Utilidad |
| `Movimientos` | ID_Mov, Fecha, Tipo, Concepto, Monto, Usuario, Referencia |
| `Fiadores` | Fiador_ID, Nombre, Telefono, Direccion, Limite_credito, Saldo_actual, Activo |
| `Usuarios` | Usuario, Pass, Rol, Activo |

### Usuarios (Login):
- **Rol**: `ADMIN` (acceso total) o `VENDEDOR` (acceso limitado)
- **Activo**: `TRUE` para activo, `FALSE` para bloqueado
- La primera fila de cada pestaña son los encabezados.

## Rutas del servidor

### Autenticación (`server/simpleAuth.ts`)
- `GET /api/auth/user` — usuario actual de sesión
- `POST /api/auth/login` — login contra hoja Usuarios
- `POST /api/auth/logout` — cierra sesión

### Google Sheets API (`/api/sheets/...`)
- `GET /api/sheets/stock` — lista productos
- `POST /api/sheets/stock` — crear producto
- `PUT /api/sheets/stock/:id` — actualizar producto
- `DELETE /api/sheets/stock/:id` — eliminar producto
- `GET /api/sheets/ventas` — lista ventas
- `POST /api/sheets/ventas` — crear venta (stock + movimientos + fiadores)
- `GET /api/sheets/fiadores` — lista fiadores
- `POST /api/sheets/fiadores` — crear fiador
- `PUT /api/sheets/fiadores/:id/pagar` — reducir saldo fiador
- `GET /api/sheets/movimientos` — lista movimientos
- `POST /api/sheets/movimientos` — crear movimiento
- `GET /api/sheets/usuarios` — lista usuarios de Sheets
- `POST /api/sheets/usuarios` — crear usuario en Sheets
- `PUT /api/sheets/usuarios/:email` — actualizar usuario en Sheets
- `GET /api/sheets/dashboard` — estadísticas KPI
- `GET /api/sheets/balances?desde=&hasta=` — balances por fecha

### AI (`/api/ai/...`, `server/aiRoutes.ts`)
- `POST /api/ai/buscar` — búsqueda semántica de productos con Groq
- `POST /api/ai/recomendacion` — dosificación/recomendaciones por producto

### PostgreSQL (`/api/users`)
- `GET /api/users` — lista usuarios OAuth
- `POST /api/users` — crear usuario OAuth

## Módulos del frontend

| Ruta | Página | Fuente de datos |
|------|--------|----------------|
| `/` | Dashboard | Google Sheets |
| `/pos` | Punto de Venta | Google Sheets |
| `/inventory` | Inventario | Google Sheets |
| `/fiadores` | Fiadores | Google Sheets |
| `/balances` | Balances | Google Sheets |
| `/users` | Usuarios del sistema | PostgreSQL `users` |

## Archivos clave

```
server/
  index.ts         — arranque Express
  routes.ts        — registra auth, sheets, ai, users
  sheetsRoutes.ts  — rutas Google Sheets
  aiRoutes.ts      — rutas Groq AI
  simpleAuth.ts    — login/logout con Sheets
  googleSheets.ts  — cliente Sheets, CRUD funciones
  storage.ts       — CRUD PostgreSQL (solo users)
  db.ts            — conexión Drizzle/PostgreSQL

shared/
  schema.ts        — tablas sessions + users (Drizzle)
  routes.ts        — definición de rutas /api/users

client/src/
  App.tsx          — router Wouter + AuthGuard
  pages/           — dashboard, pos, inventory, fiadores, balances, users, login
  hooks/           — use-auth, use-users, use-mobile, use-toast
  components/      — Layout, PageHeader + shadcn/ui
  lib/             — queryClient, auth-utils, utils
```

## Funcionalidades del POS
- Búsqueda texto + búsqueda IA (Groq llama-3.3-70b-versatile)
- Panel de dosificación por producto (IA)
- Carrito con tipos de precio: unidad, blister, caja
- Venta al contado (efectivo, tarjeta, transferencia) o al fiado
- Creación inline de fiador nuevo al momento de venta fiada
- Cálculo de cambio automático
- Modal de compartir recibo: WhatsApp, email, imprimir

## Variables de entorno
- `SESSION_SECRET` — para sesiones Express
- `DATABASE_URL` — PostgreSQL para sessions/users
- `GROQ_API_KEY` — API Groq para funciones IA
- `REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY` — Replit provee para Google Sheets OAuth
