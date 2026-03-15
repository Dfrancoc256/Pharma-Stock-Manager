import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import {
  Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign,
  ShoppingCart, BarChart2, ArrowUpRight, ArrowDownRight, CalendarDays
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

interface DashboardData {
  totalProductos: number;
  existenciaTotal: number;
  bajosStock: number;
  totalVentas?: number;
  ingresos: string;
  egresos: string;
  cajaNeta: string;
  topProductos: { id: string; nombre: string; total: number; cantidad: number }[];
  ventasPorDia?: { fecha: string; ingresos: number; egresos: number }[];
  ventasPorHora?: { hora: string; ventas: number }[];
  topCategorias?: { nombre: string; cantidad: number }[];
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

  const diasData = data?.ventasPorDia ?? [];
  const hoy = diasData[diasData.length - 1];
  const ingresosHoy = hoy?.ingresos ?? 0;
  const egresosHoy = hoy?.egresos ?? 0;
  const cajaHoy = ingresosHoy - egresosHoy;

  const fechaHoy = new Date().toLocaleDateString('es-GT', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

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

          {/* ── KPI Row 1 ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={Package} label="Productos" color="border-blue-500"
              value={data.totalProductos.toLocaleString()}
              sub="en inventario"
            />
            <KpiCard
              icon={ShoppingCart} label="Ventas totales" color="border-violet-500"
              value={(data.totalVentas ?? 0).toLocaleString()}
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
              trend={caja >= 0 ? 'up' : 'down'}
            />
          </div>

          {/* ── KPI Row 2 ── */}
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
              icon={CalendarDays} label="Ventas de hoy" color="border-indigo-500"
              value={`Q ${ingresosHoy.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`}
              sub={`Caja hoy: Q ${cajaHoy.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`}
              trend={ingresosHoy > 0 ? 'up' : 'neutral'}
            />
          </div>

          {/* ── Lo que va del día ── */}
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <CalendarDays size={18} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Lo que va del día</h3>
                <p className="text-xs text-muted-foreground capitalize">{fechaHoy}</p>
              </div>
            </div>

            {ingresosHoy === 0 && egresosHoy === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-muted-foreground">
                <ShoppingCart size={36} className="opacity-20 mb-2" />
                <p className="text-sm">Aún no hay ventas registradas hoy</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-2xl p-5 flex flex-col gap-1">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Ingresos hoy</p>
                  <p className="text-3xl font-black text-green-700">
                    Q {ingresosHoy.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-red-50 rounded-2xl p-5 flex flex-col gap-1">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Egresos hoy</p>
                  <p className="text-3xl font-black text-red-700">
                    Q {egresosHoy.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={`rounded-2xl p-5 flex flex-col gap-1 ${cajaHoy >= 0 ? 'bg-emerald-50' : 'bg-orange-50'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${cajaHoy >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>Caja del día</p>
                  <p className={`text-3xl font-black ${cajaHoy >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                    Q {cajaHoy.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Ingresos vs Egresos por día ── */}
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-2xl bg-green-100 flex items-center justify-center">
                <TrendingUp size={18} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Ingresos vs Egresos</h3>
                <p className="text-xs text-muted-foreground">Últimos 14 días · en Q</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={diasData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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

          {/* ── Top Categorías + Ranking de ventas ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {(data.topCategorias?.length ?? 0) > 0 && (
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
                  {data.topCategorias!.map((cat, i) => {
                    const max = data.topCategorias![0].cantidad;
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

            {data.topProductos.length > 0 && (
              <div className="glass-card rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-2xl bg-green-100 flex items-center justify-center">
                    <TrendingUp size={18} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Ranking de ventas</h3>
                    <p className="text-xs text-muted-foreground">Productos más vendidos · en Q</p>
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
