import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import {
  TrendingUp, TrendingDown, DollarSign, Plus, Filter,
  X, ShoppingBag, Receipt, User, Calendar, Hash,
} from "lucide-react";

interface Movimiento {
  id: string; fecha: string; tipo: string; concepto: string;
  monto: string; usuario: string; referencia: string;
}

interface VentaDetalle {
  ID_Venta: string; Fecha: string; Usuario: string; Cliente: string;
  Tipo: string; MetodoPago: string; Total: string;
  items: { Nombre: string; Cantidad: string; PrecioUnitario: string; Subtotal: string; TipoPrecio: string }[];
}

interface BalancesData {
  ingresos: string; egresos: string; cajaNeta: string; movimientos: Movimiento[];
}

export default function BalancesPage() {
  const queryClient = useQueryClient();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('egreso');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [selectedMov, setSelectedMov] = useState<Movimiento | null>(null);

  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);

  const { data, isLoading } = useQuery<BalancesData>({
    queryKey: ['/api/sheets/balances', desde, hasta],
    queryFn: async () => {
      const res = await fetch(`/api/sheets/balances?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error cargando balances');
      return res.json();
    },
  });

  // Fetch venta detail only when selected movement has a numeric referencia
  const ventaId = selectedMov?.referencia && /^\d+$/.test(selectedMov.referencia.trim())
    ? selectedMov.referencia.trim()
    : null;

  const { data: ventaDetalle, isLoading: loadingVenta } = useQuery<VentaDetalle>({
    queryKey: ['/api/sheets/ventas', ventaId],
    queryFn: async () => {
      const res = await fetch(`/api/sheets/ventas/${ventaId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('No se encontró la venta');
      return res.json();
    },
    enabled: !!ventaId,
  });

  const createMov = useMutation({
    mutationFn: async (body: { tipo: string; concepto: string; monto: string }) => {
      const res = await fetch('/api/sheets/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al registrar movimiento');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sheets/balances'] });
      setIsAddOpen(false);
      setConcepto(''); setMonto('');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMov.mutate({ tipo, concepto, monto });
  };

  return (
    <Layout>
      <PageHeader
        title="Balances"
        description="Ingresos, egresos y caja neta desde Google Sheets."
        action={
          <button onClick={() => setIsAddOpen(true)} className="interactive-btn px-6 py-3 rounded-xl bg-primary text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/25" data-testid="button-nuevo-movimiento">
            <Plus size={20} /> Registrar Movimiento
          </button>
        }
      />

      {/* Filtros */}
      <div className="flex gap-4 mb-6 glass-card rounded-2xl p-4">
        <Filter size={18} className="text-muted-foreground self-center" />
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input-field py-2 text-sm" data-testid="input-desde" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input-field py-2 text-sm" data-testid="input-hasta" />
        </div>
        {(desde || hasta) && (
          <button onClick={() => { setDesde(''); setHasta(''); }} className="text-sm text-destructive underline">Limpiar</button>
        )}
      </div>

      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-2"><TrendingUp size={18} className="text-green-600" /><span className="text-sm text-muted-foreground font-medium">Ingresos</span></div>
            <div className="text-3xl font-black text-green-600">Q {parseFloat(data.ingresos).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-2"><TrendingDown size={18} className="text-red-500" /><span className="text-sm text-muted-foreground font-medium">Egresos</span></div>
            <div className="text-3xl font-black text-red-500">Q {parseFloat(data.egresos).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-2"><DollarSign size={18} className={parseFloat(data.cajaNeta) >= 0 ? 'text-primary' : 'text-red-500'} /><span className="text-sm text-muted-foreground font-medium">Caja Neta</span></div>
            <div className={`text-3xl font-black ${parseFloat(data.cajaNeta) >= 0 ? 'text-primary' : 'text-red-500'}`}>Q {parseFloat(data.cajaNeta).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      )}

      {/* Tabla Movimientos */}
      <div className="glass-card rounded-3xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-sm border-b border-border/50">
              <th className="p-4 font-semibold">Fecha</th>
              <th className="p-4 font-semibold">Tipo</th>
              <th className="p-4 font-semibold">Concepto</th>
              <th className="p-4 font-semibold">Usuario</th>
              <th className="p-4 font-semibold text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
            ) : !data?.movimientos?.length ? (
              <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">No hay movimientos registrados</td></tr>
            ) : (
              data.movimientos.slice().reverse().map((m, i) => (
                <tr
                  key={i}
                  className="border-b border-border/30 hover:bg-primary/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedMov(m)}
                  data-testid={`row-movimiento-${i}`}
                >
                  <td className="p-4 text-sm text-muted-foreground">{m.fecha}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${m.tipo === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="p-4 font-medium">{m.concepto}</td>
                  <td className="p-4 text-sm text-muted-foreground">{m.usuario}</td>
                  <td className={`p-4 font-extrabold text-right ${m.tipo === 'ingreso' ? 'text-green-600' : 'text-red-500'}`}>
                    {m.tipo === 'egreso' ? '-' : '+'}Q {parseFloat(m.monto).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Detalle Movimiento */}
      {selectedMov && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelectedMov(null); }}
        >
          <div className="glass-card rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${selectedMov.tipo === 'ingreso' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {selectedMov.tipo === 'ingreso' ? <TrendingUp size={20} className="text-green-600" /> : <TrendingDown size={20} className="text-red-500" />}
                </div>
                <div>
                  <h2 className="text-lg font-black">Detalle del Movimiento</h2>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedMov.tipo === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {selectedMov.tipo}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedMov(null)} className="p-2 rounded-xl hover:bg-black/5" data-testid="button-close-detalle">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Monto destacado */}
              <div className="text-center py-4 bg-muted/30 rounded-2xl">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className={`text-4xl font-black ${selectedMov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-500'}`}>
                  {selectedMov.tipo === 'egreso' ? '-' : '+'}Q {parseFloat(selectedMov.monto).toFixed(2)}
                </p>
              </div>

              {/* Info general */}
              <div className="space-y-3">
                <InfoRow icon={<Receipt size={15} />} label="Concepto" value={selectedMov.concepto} />
                <InfoRow icon={<Calendar size={15} />} label="Fecha" value={selectedMov.fecha} />
                <InfoRow icon={<User size={15} />} label="Usuario" value={selectedMov.usuario || '—'} />
                {selectedMov.referencia && (
                  <InfoRow icon={<Hash size={15} />} label="Referencia" value={
                    /^\d+$/.test(selectedMov.referencia.trim())
                      ? `Venta #${selectedMov.referencia}`
                      : selectedMov.referencia
                  } />
                )}
              </div>

              {/* Detalle de productos si es una venta */}
              {ventaId && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag size={15} className="text-primary" />
                    <p className="text-sm font-bold text-foreground">Productos vendidos</p>
                  </div>
                  {loadingVenta ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">Cargando productos...</div>
                  ) : ventaDetalle?.items?.length ? (
                    <div className="rounded-2xl border border-border/40 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Producto</th>
                            <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Cant.</th>
                            <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ventaDetalle.items.map((item, idx) => (
                            <tr key={idx} className="border-t border-border/20">
                              <td className="px-3 py-2 font-medium">{item.Nombre}</td>
                              <td className="px-3 py-2 text-center text-muted-foreground">{item.Cantidad}</td>
                              <td className="px-3 py-2 text-right font-bold">Q {parseFloat(item.Subtotal || '0').toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/30 border-t border-border/40">
                          <tr>
                            <td colSpan={2} className="px-3 py-2 font-bold text-sm">Total</td>
                            <td className="px-3 py-2 text-right font-black text-primary">Q {parseFloat(ventaDetalle.Total || selectedMov.monto).toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-3">Sin productos registrados</p>
                  )}

                  {ventaDetalle && (
                    <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                      {ventaDetalle.Cliente && <span>Cliente: <strong>{ventaDetalle.Cliente}</strong></span>}
                      {ventaDetalle.MetodoPago && <span>Pago: <strong>{ventaDetalle.MetodoPago}</strong></span>}
                      {ventaDetalle.Tipo && <span>Tipo: <strong>{ventaDetalle.Tipo}</strong></span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Movimiento */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-6">Nuevo Movimiento</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Tipo</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setTipo('ingreso')} className={`flex-1 py-2 rounded-xl font-bold border-2 interactive-btn ${tipo === 'ingreso' ? 'border-green-500 bg-green-50 text-green-700' : 'border-border text-muted-foreground'}`} data-testid="button-tipo-ingreso">Ingreso</button>
                  <button type="button" onClick={() => setTipo('egreso')} className={`flex-1 py-2 rounded-xl font-bold border-2 interactive-btn ${tipo === 'egreso' ? 'border-red-500 bg-red-50 text-red-600' : 'border-border text-muted-foreground'}`} data-testid="button-tipo-egreso">Egreso</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Concepto</label>
                <input required className="input-field" value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Ej: Pago proveedor" data-testid="input-concepto" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Monto (Q)</label>
                <input required type="number" step="0.01" min="0" className="input-field text-xl font-bold" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00" data-testid="input-monto-movimiento" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground interactive-btn">Cancelar</button>
                <button type="submit" disabled={createMov.isPending} className="flex-1 py-3 rounded-xl font-bold bg-primary text-white interactive-btn shadow-lg shadow-primary/20" data-testid="button-guardar-movimiento">
                  {createMov.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/20 last:border-0">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-foreground flex-1">{value}</span>
    </div>
  );
}
