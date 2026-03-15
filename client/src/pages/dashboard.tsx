import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign, BarChart2 } from "lucide-react";

interface DashboardData {
  totalProductos: number;
  existenciaTotal: number;
  bajosStock: number;
  ingresos: string;
  egresos: string;
  cajaNeta: string;
  topProductos: { id: string; nombre: string; total: number; cantidad: number }[];
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

  return (
    <Layout>
      <PageHeader title="Dashboard" description="Resumen general de tu farmacia en tiempo real desde Google Sheets." />

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-3xl p-6 animate-pulse h-28 bg-muted/30" />
          ))}
        </div>
      )}

      {error && (
        <div className="glass-card rounded-3xl p-8 text-center text-destructive">
          <AlertTriangle className="mx-auto mb-3" size={40} />
          <p className="font-semibold">No se pudo conectar con Google Sheets.</p>
          <p className="text-sm text-muted-foreground mt-1">Verifica que la hoja tenga las pestañas: Stock, Ventas, Detalle_Venta, Movimientos</p>
        </div>
      )}

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Package size={20} className="text-primary" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Total Productos</span>
              </div>
              <div className="text-4xl font-black text-foreground">{data.totalProductos}</div>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <BarChart2 size={20} className="text-blue-600" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Existencia Total</span>
              </div>
              <div className="text-4xl font-black text-foreground">{data.existenciaTotal.toLocaleString()}</div>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-500" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Bajo Stock</span>
              </div>
              <div className="text-4xl font-black text-red-500">{data.bajosStock}</div>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center">
                  <TrendingUp size={20} className="text-green-600" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Ingresos</span>
              </div>
              <div className="text-3xl font-black text-green-600">Q {parseFloat(data.ingresos).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center">
                  <TrendingDown size={20} className="text-red-500" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Egresos</span>
              </div>
              <div className="text-3xl font-black text-red-500">Q {parseFloat(data.egresos).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${parseFloat(data.cajaNeta) >= 0 ? 'bg-primary/10' : 'bg-red-100'}`}>
                  <DollarSign size={20} className={parseFloat(data.cajaNeta) >= 0 ? 'text-primary' : 'text-red-500'} />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Caja Neta</span>
              </div>
              <div className={`text-3xl font-black ${parseFloat(data.cajaNeta) >= 0 ? 'text-primary' : 'text-red-500'}`}>
                Q {parseFloat(data.cajaNeta).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Top Productos */}
          {data.topProductos.length > 0 && (
            <div className="glass-card rounded-3xl p-6">
              <h3 className="text-lg font-bold mb-4">Top Productos Vendidos</h3>
              <div className="space-y-3">
                {data.topProductos.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">{i + 1}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{p.nombre}</div>
                      <div className="text-xs text-muted-foreground">{p.cantidad} unidades vendidas</div>
                    </div>
                    <div className="font-extrabold text-primary">Q {p.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
