# Farmacia Web - Sistema de Gestión

## Arquitectura

Sistema web de farmacia con Google Sheets como base de datos principal, autenticación via Replit Auth.

### Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Base de datos primaria**: Google Sheets (googleapis v148)
- **Base de datos secundaria**: PostgreSQL (Drizzle ORM) - solo para auth/sessions
- **Autenticación**: Replit Auth (OpenID Connect)

## Google Sheets

**Spreadsheet ID**: `1MwgmtT8b5jOUzF0rt5E_uRMgjFG1uKcgIB-P3fFQ7p8`

### Pestañas requeridas (nombres exactos):
| Pestaña | Columnas |
|---------|----------|
| `Stock` | ID, Nombre, Detalle, Casa, Categoria, Precio compra, Precio unidad, Precio blister, Precio caja, Posicion, Stock, Drogueria, Unidades blister, Unidades caja |
| `Ventas` | ID_Venta, Fecha, Usuario, Cliente, Tipo, Fiador_ID, Metodo_pago, Total |
| `Detalle_Venta` | ID_Venta, Producto_ID, Nombre, Tipo_precio, Cantidad, Precio_unitario, Subtotal, Costo_unitario, Utilidad |
| `Movimientos` | ID_Mov, Fecha, Tipo, Concepto, Monto, Usuario, Referencia |
| `Fiadores` | Fiador_ID, Nombre, Telefono, Direccion, Saldo_actual |
| `Usuarios` | Email, Rol, Activo |

### IMPORTANTE: La primera fila de cada pestaña debe ser los encabezados.

## Rutas del servidor

### Google Sheets API (`/api/sheets/...`)
- `GET /api/sheets/stock` - Lista todos los productos
- `POST /api/sheets/stock` - Crear producto
- `PUT /api/sheets/stock/:id` - Actualizar producto
- `DELETE /api/sheets/stock/:id` - Eliminar producto (limpia la fila)
- `GET /api/sheets/ventas` - Lista ventas
- `POST /api/sheets/ventas` - Crear venta (actualiza stock, movimientos, fiadores)
- `GET /api/sheets/fiadores` - Lista fiadores
- `POST /api/sheets/fiadores` - Crear fiador
- `PUT /api/sheets/fiadores/:id/pagar` - Reducir saldo de fiador
- `GET /api/sheets/movimientos` - Lista movimientos
- `POST /api/sheets/movimientos` - Crear movimiento
- `GET /api/sheets/usuarios` - Lista usuarios de Sheets
- `POST /api/sheets/usuarios` - Crear usuario
- `PUT /api/sheets/usuarios/:email` - Actualizar usuario
- `GET /api/sheets/dashboard` - Estadísticas del dashboard
- `GET /api/sheets/balances?desde=&hasta=` - Balances filtrados por fecha

## Módulos del frontend

| Ruta | Página | Fuente de datos |
|------|--------|----------------|
| `/` | Dashboard | Google Sheets |
| `/pos` | Punto de Venta | Google Sheets |
| `/inventory` | Inventario | Google Sheets |
| `/fiadores` | Fiadores | Google Sheets |
| `/balances` | Balances | Google Sheets |
| `/users` | Usuarios | Replit Auth (PostgreSQL) |

## Archivos clave

- `server/googleSheets.ts` - Cliente Google Sheets, funciones CRUD
- `server/sheetsRoutes.ts` - Rutas Express para Sheets
- `server/routes.ts` - Rutas principales + llama sheetsRoutes
- `client/src/pages/dashboard.tsx` - Dashboard con KPIs desde Sheets
- `client/src/pages/pos.tsx` - POS con carrito y tipos de precio
- `client/src/pages/inventory.tsx` - Inventario completo
- `client/src/pages/fiadores.tsx` - Fiadores y pagos
- `client/src/pages/balances.tsx` - Balances con filtro de fechas

## Funcionalidades del POS
- Búsqueda por nombre, detalle, casa, categoría
- Carrito con tipos de precio: unidad, blister, caja
- Venta al contado (efectivo, tarjeta, transferencia) o al fiado
- Cálculo de cambio automático
- Descuento de stock en Sheets
- Registro de ingreso en Movimientos
- Actualización de saldo de fiadores
- Impresión de recibo (sin NIT - Consumidor Final)

## Configuración de env vars
- `SESSION_SECRET` - Replit provee automáticamente
- `DATABASE_URL` - PostgreSQL para sessions
- `REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY` - Replit provee para OAuth Google Sheets
