import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import {
  Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign,
  ShoppingCart, BarChart2, ArrowUpRight, ArrowDownRight, CalendarDays,
  X, ChevronDown, ChevronUp, Receipt
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";

interface DashboardData {
  totalProductos: number;
  existenciaTotal: number;
  bajosStock: number;
  totalVentas?: number;
  ingresos: string;
  egresos: string;
  cajaNeta: string;
  fiadoPendiente?: string;
  ventasContadoHoy?: string;
  ventasFiadoHoy?: string;
  ventasHoy?: { id: string; fecha: string; usuario: string; cliente: string; tipo: string; metodoPago: string; total: string; items: { nombre: string; cantidad: string; subtotal: string }[] }[];
  topProductos: { id: string; nombre: string; total: number; cantidad: number }[];
  ventasPorDia?: { fecha: string; ingresos: number; egresos: number }[];
  ventasPorHora?: { hora: string; ventas: number }[];
  topCategorias?: { nombre: string; cantidad: number }[];
  ventasPorMes?: { label: string; ingresos: number; order: number }[];
}

const BAR_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#ef4444", "#06b6d4", "#84cc16", "#f97316",
];

const CustomTooltipMes = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-2xl shadow-xl p-3 text-sm min-w-[160px]">
      <p className="font-bold text-muted-foreground mb-1">{label}</p>
      <p className="font-extrabold text-primary">
        Q {payload[0].value.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
      </p>
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

  const mesData = (data?.ventasPorMes ?? []).map(m => ({
    label: m.label,
    ingresos: m.ingresos,
  }));

  const maxIngreso = mesData.length > 0 ? Math.max(...mesData.map(m => m.ingresos)) : 0;

  const [showVentasHoy, setShowVentasHoy] = useState(false);
  const [ventaExpandida, setVentaExpandida] = useState<string | null>(null);

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
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 flex items-center justify-center">
                  <CalendarDays size={18} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Lo que va del día</h3>
                  <p className="text-xs text-muted-foreground capitalize">{fechaHoy}</p>
                </div>
              </div>
              {(data.ventasHoy?.length ?? 0) > 0 && (
                <button
                  data-testid="btn-ver-ventas-hoy"
                  onClick={() => setShowVentasHoy(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Receipt size={13} />
                  {data.ventasHoy!.length} ventas
                  {showVentasHoy ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              )}
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

            {/* Panel desplegable de ventas de hoy */}
            {showVentasHoy && (data.ventasHoy?.length ?? 0) > 0 && (
              <div className="mt-5 border-t border-border pt-4 space-y-2" data-testid="panel-ventas-hoy">
                {data.ventasHoy!.map((v) => (
                  <div key={v.id} className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
                    <button
                      data-testid={`venta-hoy-${v.id}`}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                      onClick={() => setVentaExpandida(ventaExpandida === v.id ? null : v.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-muted-foreground flex-shrink-0 font-mono">{v.fecha?.split(' ')[1] ?? ''}</span>
                        <p className="text-sm font-semibold truncate">{v.cliente && v.cliente !== 'Contado' ? v.cliente : 'Cliente general'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-extrabold text-primary text-sm">Q {parseFloat(v.total || '0').toFixed(2)}</span>
                        {ventaExpandida === v.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                      </div>
                    </button>
                    {ventaExpandida === v.id && v.items.length > 0 && (
                      <div className="px-4 pb-3 border-t border-border/50">
                        <table className="w-full text-xs mt-2">
                          <thead>
                            <tr className="text-muted-foreground">
                              <th className="text-left py-1 font-medium">Producto</th>
                              <th className="text-center py-1 font-medium">Cant.</th>
                              <th className="text-right py-1 font-medium">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {v.items.map((item, ii) => (
                              <tr key={ii} className="border-t border-border/30">
                                <td className="py-1 text-foreground">{item.nombre}</td>
                                <td className="py-1 text-center text-muted-foreground">{item.cantidad}</td>
                                <td className="py-1 text-right font-semibold text-primary">Q {parseFloat(item.subtotal || '0').toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Gráfica de Ventas por Mes ── */}
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center">
                <BarChart2 size={18} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Ventas por Mes</h3>
                <p className="text-xs text-muted-foreground">Ingresos mensuales · últimos 12 meses · en Q</p>
              </div>
            </div>
            {mesData.every(m => m.ingresos === 0) ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <BarChart2 size={40} className="opacity-20 mb-2" />
                <p className="text-sm">No hay datos de ventas por mes aún</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={mesData} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `Q${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip content={<CustomTooltipMes />} cursor={{ fill: 'rgba(16,185,129,0.06)', radius: 8 }} />
                  <Bar dataKey="ingresos" name="Ingresos" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {mesData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.ingresos === maxIngreso ? '#10b981' : '#10b98166'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Top Categorías + Top Productos ── */}
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
                    <h3 className="font-bold text-foreground">Top Productos Más Vendidos</h3>
                    <p className="text-xs text-muted-foreground">Ordenado por unidades vendidas</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {data.topProductos.slice(0, 8).map((p, i) => {
                    const maxQty = data.topProductos[0].cantidad;
                    const pct = Math.round((p.cantidad / maxQty) * 100);
                    return (
                      <div key={p.id} className="flex items-center gap-3 py-2">
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-white font-black text-xs flex-shrink-0"
                          style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="font-semibold text-sm truncate max-w-[55%]">{p.nombre}</p>
                            <p className="font-extrabold text-sm text-primary">Q {p.total.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{p.cantidad} uds</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </Layout>
  );
}
