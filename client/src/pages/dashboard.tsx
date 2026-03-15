import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import {
  Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign,
  ShoppingCart, BarChart2, Activity, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from "recharts";

interface DashboardData {
  totalProductos: number;
  existenciaTotal: number;
  bajosStock: number;
  totalVentas: number;
  ingresos: string;
  egresos: string;
  cajaNeta: string;
  topProductos: { id: string; nombre: string; total: number; cantidad: number }[];
  ventasPorDia: { fecha: string; ingresos: number; egresos: number }[];
  ventasPorHora: { hora: string; ventas: number }[];
  topCategorias: { nombre: string; cantidad: number }[];
}

const BAR_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316",
];

const CustomTooltipPesos = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-2xl shadow-xl p-3 text-sm min-w-[140px]">
      <p className="font-bold text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="font-bold">Q {p.value.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
        </div>
      ))}
    </div>
  );
};

const CustomTooltipCount = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-2xl shadow-xl p-3 text-sm">
      <p className="font-bold text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

function KpiCard({
  icon: Icon, label, value, sub, color, trend
}: {
  icon: any; label: string; value: string; sub?: string;
  color: string; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className={`glass-card rounded-3xl p-5 flex flex-col gap-3 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${color.replace('border-', 'bg-').replace('-500', '-100').replace('-600', '-100')}`}>
          <Icon size={20} className={`${color.replace('border-', 'text-')}`} />
        </div>
        {trend === 'up' && <ArrowUpRight size={18} className="text-green-500" />}
        {trend === 'down' && <ArrowDownRight size={18} className="text-red-500" />}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
        <p className="text-2xl font-black text-foreground leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['/api/sheets/dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/sheets/dashboard', { credentials: 'include' });
      if (!res.ok) throw new Error('Error cargando dashboard');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const caja = parseFloat(data?.cajaNeta || '0');
  const ingresos = parseFloat(data?.ingresos || '0');
  const egresos = parseFloat(data?.egresos || '0');
  const margen = ingresos > 0 ? ((caja / ingresos) * 100).toFixed(1) : '0';

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Resumen en tiempo real · Farmacia Web</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-card rounded-3xl p-5 animate-pulse h-28 bg-muted/30" />
          ))}
        </div>
      )}

      {error && (
        <div className="glass-card rounded-3xl p-8 text-center text-destructive">
          <AlertTriangle className="mx-auto mb-3" size={40} />
          <p className="font-semibold">No se pudo conectar con Google Sheets.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Verifica que la hoja tenga las pestañas: Stock, Ventas, Detalle_Venta, Movimientos
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-6">

          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={Package} label="Productos" color="border-blue-500"
              value={data.totalProductos.toLocaleString()}
              sub="en inventario"
            />
            <KpiCard
              icon={ShoppingCart} label="Ventas totales" color="border-violet-500"
              value={data.totalVentas.toLocaleString()}
              sub="transacciones"
            />
            <KpiCard
              icon={TrendingUp} label="Ingresos totales" color="border-green-500"
              value={`Q ${ingresos.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`}
              trend="up"
            />
            <KpiCard
              icon={DollarSign}
              label="Caja neta"
              color={caja >= 0 ? "border-emerald-500" : "border-red-500"}
              value={`Q ${caja.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`}
              sub={`Margen ${margen}%`}
              trend={caja >= 0 ? 'up' : 'down'}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={TrendingDown} label="Egresos totales" color="border-red-500"
              value={`Q ${egresos.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`}
              trend="down"
            />
            <KpiCard
              icon={AlertTriangle} label="Bajo stock" color="border-orange-500"
              value={data.bajosStock.toString()}
              sub={data.bajosStock > 0 ? "productos críticos" : "todo normal"}
            />
            <KpiCard
              icon={BarChart2} label="Existencia total" color="border-cyan-500"
              value={data.existenciaTotal.toLocaleString()}
              sub="unidades"
            />
            <KpiCard
              icon={Activity} label="Promedio x venta" color="border-pink-500"
              value={data.totalVentas > 0
                ? `Q ${(ingresos / data.totalVentas).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`
                : 'Q 0.00'}
              sub="ticket promedio"
            />
          </div>

          {/* ── Ingresos vs Egresos por día ── */}
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-2xl bg-green-100 flex items-center justify-center">
                <TrendingUp size={18} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Ingresos vs Egresos</h3>
                <p className="text-xs text-muted-foreground">Últimos 14 días</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.ventasPorDia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradEgresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `Q${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} />
                <Tooltip content={<CustomTooltipPesos />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={2.5}
                  fill="url(#gradIngresos)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="egresos" name="Egresos" stroke="#ef4444" strokeWidth={2}
                  fill="url(#gradEgresos)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Top Productos + Horario pico ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Top Productos Bar Chart */}
            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-2xl bg-violet-100 flex items-center justify-center">
                  <BarChart2 size={18} className="text-violet-600" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Top Productos</h3>
                  <p className="text-xs text-muted-foreground">Por unidades vendidas</p>
                </div>
              </div>
              {data.topProductos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <ShoppingCart size={36} className="opacity-20 mb-2" />
                  <p className="text-sm">Aún no hay ventas registradas</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    layout="vertical"
                    data={data.topProductos.slice(0, 6).map(p => ({
                      nombre: p.nombre.length > 18 ? p.nombre.slice(0, 18) + '…' : p.nombre,
                      cantidad: p.cantidad,
                      total: p.total,
                    }))}
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={110} />
                    <Tooltip content={<CustomTooltipCount />} />
                    <Bar dataKey="cantidad" name="Unidades" radius={[0, 6, 6, 0]}>
                      {data.topProductos.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Ventas por hora */}
            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <Activity size={18} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Horario pico</h3>
                  <p className="text-xs text-muted-foreground">Ventas por hora del día</p>
                </div>
              </div>
              {data.ventasPorHora.every(h => h.ventas === 0) ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Activity size={36} className="opacity-20 mb-2" />
                  <p className="text-sm">Sin datos de horario aún</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.ventasPorHora} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltipCount />} />
                    <Bar dataKey="ventas" name="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {data.ventasPorHora.map((h, i) => {
                        const maxV = Math.max(...data.ventasPorHora.map(x => x.ventas));
                        return <Cell key={i} fill={h.ventas === maxV && maxV > 0 ? '#6366f1' : '#93c5fd'} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Top Categorías + Tabla top productos ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Top Categorías */}
            {data.topCategorias.length > 0 && (
              <div className="glass-card rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center">
                    <Package size={18} className="text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Categorías en inventario</h3>
                    <p className="text-xs text-muted-foreground">Distribución de productos</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {data.topCategorias.map((cat, i) => {
                    const max = data.topCategorias[0].cantidad;
                    const pct = Math.round((cat.cantidad / max) * 100);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-foreground truncate max-w-[60%]">{cat.nombre}</span>
                          <span className="text-xs font-bold text-muted-foreground">{cat.cantidad} productos</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tabla detallada top productos */}
            {data.topProductos.length > 0 && (
              <div className="glass-card rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-2xl bg-green-100 flex items-center justify-center">
                    <TrendingUp size={18} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Ranking de ventas</h3>
                    <p className="text-xs text-muted-foreground">Productos más vendidos</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {data.topProductos.slice(0, 6).map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-white font-black text-xs flex-shrink-0"
                        style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{p.nombre}</p>
                        <p className="text-xs text-muted-foreground">{p.cantidad} uds vendidas</p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-sm text-primary">Q {p.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </Layout>
  );
}
