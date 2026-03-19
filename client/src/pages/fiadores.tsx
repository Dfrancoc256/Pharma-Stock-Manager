import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import {
  Plus, Users, CreditCard, ChevronDown, ChevronUp,
  Phone, MapPin, CheckCircle2, Clock, AlertCircle, Loader2, X
} from "lucide-react";

interface Fiador {
  Fiador_ID: string; Nombre: string; Telefono: string;
  Direccion: string; Saldo_actual: string; Limite_credito: string; Activo: string;
}

interface Venta {
  ID_Venta: string; Fecha: string; Cliente: string;
  Tipo: string; Fiador_ID: string; MetodoPago: string; Total: string;
}

function FiadorCard({ fiador }: { fiador: Fiador }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [monto, setMonto] = useState('');

  const saldo = parseFloat(fiador.Saldo_actual || '0');
  const limite = parseFloat(fiador.Limite_credito || '500');
  const alDia = saldo <= 0;

  const { data: ventas = [], isLoading: loadingVentas } = useQuery<Venta[]>({
    queryKey: ['/api/sheets/fiadores', fiador.Fiador_ID, 'ventas'],
    queryFn: async () => {
      const res = await fetch(`/api/sheets/fiadores/${fiador.Fiador_ID}/ventas`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: expanded,
  });

  const pagarMutation = useMutation({
    mutationFn: async ({ id, monto }: { id: string; monto: string }) => {
      const res = await fetch(`/api/sheets/fiadores/${id}/pagar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al registrar pago');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sheets/fiadores'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sheets/dashboard'] });
      setIsPayOpen(false);
      setMonto('');
    }
  });

  const cancelarMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sheets/fiadores/${id}/cancelar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al cancelar');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sheets/fiadores'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sheets/dashboard'] });
      setIsPayOpen(false);
    }
  });

  const isPending = pagarMutation.isPending || cancelarMutation.isPending;

  return (
    <div className={`glass-card rounded-3xl overflow-hidden transition-all ${alDia ? 'opacity-75' : ''}`} data-testid={`card-fiador-${fiador.Fiador_ID}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${alDia ? 'bg-green-100' : 'bg-red-100'}`}>
              {alDia
                ? <CheckCircle2 size={22} className="text-green-600" />
                : <Clock size={22} className="text-red-500" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-foreground text-base" data-testid={`text-nombre-${fiador.Fiador_ID}`}>{fiador.Nombre}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${alDia ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {alDia ? 'Al día' : 'Pendiente'}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 mt-1">
                {fiador.Telefono && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone size={11} /> {fiador.Telefono}
                  </span>
                )}
                {fiador.Direccion && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin size={11} /> {fiador.Direccion}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground mb-0.5">Saldo</p>
            <p className={`text-2xl font-black leading-none ${alDia ? 'text-green-600' : 'text-red-500'}`} data-testid={`text-saldo-${fiador.Fiador_ID}`}>
              Q {saldo.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Límite: Q {limite.toFixed(2)}</p>
          </div>
        </div>

        {!alDia && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Crédito usado</span>
              <span>{Math.min(100, Math.round((saldo / limite) * 100))}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (saldo / limite) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {!alDia && (
            <button
              onClick={() => { setIsPayOpen(true); setMonto(''); }}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 interactive-btn shadow-sm"
              data-testid={`button-pagar-${fiador.Fiador_ID}`}
            >
              <CreditCard size={15} /> Registrar Pago
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm flex items-center justify-center gap-2 interactive-btn"
            data-testid={`button-historial-${fiador.Fiador_ID}`}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            Historial
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/40 bg-muted/30 px-5 py-4">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Transacciones al fiado</p>
          {loadingVentas ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
              <Loader2 size={14} className="animate-spin" /> Cargando...
            </div>
          ) : ventas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Sin transacciones registradas.</p>
          ) : (
            <div className="space-y-2">
              {ventas.slice().reverse().map((v) => (
                <div key={v.ID_Venta} className="flex items-center justify-between py-2 px-3 bg-background/60 rounded-xl border border-border/30" data-testid={`row-venta-${v.ID_Venta}`}>
                  <div>
                    <p className="text-xs font-bold text-foreground">{v.Fecha}</p>
                    <p className="text-xs text-muted-foreground">Venta #{v.ID_Venta}</p>
                  </div>
                  <span className="font-extrabold text-sm text-red-500">Q {parseFloat(v.Total || '0').toFixed(2)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-xs font-bold text-muted-foreground">Total comprado al fiado:</span>
                <span className="font-extrabold text-sm text-foreground">
                  Q {ventas.reduce((acc, v) => acc + parseFloat(v.Total || '0'), 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {isPayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-sm p-7 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black">Registrar Pago</h2>
              <button onClick={() => setIsPayOpen(false)} className="p-2 rounded-xl hover:bg-black/5"><X size={18} /></button>
            </div>
            <p className="text-muted-foreground text-sm mb-1">{fiador.Nombre}</p>
            <p className="text-red-500 font-black text-2xl mb-5">Debe: Q {saldo.toFixed(2)}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Monto a pagar (Q)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={saldo}
                  className="input-field text-xl font-bold text-primary"
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-monto-pago"
                />
              </div>

              <button
                onClick={() => setMonto(saldo.toFixed(2))}
                className="w-full py-2.5 rounded-xl border-2 border-primary text-primary font-bold text-sm interactive-btn"
                data-testid="button-pagar-todo"
              >
                Pagar todo (Q {saldo.toFixed(2)}) — Cancelar deuda
              </button>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground interactive-btn"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const m = parseFloat(monto);
                    if (!monto || isNaN(m) || m <= 0) return;
                    if (m >= saldo) {
                      cancelarMutation.mutate(fiador.Fiador_ID);
                    } else {
                      pagarMutation.mutate({ id: fiador.Fiador_ID, monto });
                    }
                  }}
                  disabled={isPending || !monto || parseFloat(monto) <= 0}
                  className="flex-1 py-3 rounded-xl font-bold bg-primary text-white interactive-btn shadow-lg shadow-primary/20 disabled:opacity-50"
                  data-testid="button-confirmar-pago"
                >
                  {isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FiadoresPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'deuda' | 'aldía'>('deuda');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [limite, setLimite] = useState('500');

  const { data: fiadores = [], isLoading } = useQuery<Fiador[]>({
    queryKey: ['/api/sheets/fiadores'],
    queryFn: async () => {
      const res = await fetch('/api/sheets/fiadores', { credentials: 'include' });
      if (!res.ok) throw new Error('Error cargando fiadores');
      return res.json();
    },
  });

  const createFiador = useMutation({
    mutationFn: async (body: { nombre: string; telefono: string; direccion: string; limiteCredito: number }) => {
      const res = await fetch('/api/sheets/fiadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error creando fiador');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sheets/fiadores'] });
      setIsAddOpen(false);
      setNombre(''); setTelefono(''); setDireccion(''); setLimite('500');
    }
  });

  const activos = fiadores.filter(f => f.Fiador_ID);
  const conDeuda = activos.filter(f => parseFloat(f.Saldo_actual || '0') > 0);
  const sinDeuda = activos.filter(f => parseFloat(f.Saldo_actual || '0') <= 0);
  const totalPendiente = conDeuda.reduce((acc, f) => acc + parseFloat(f.Saldo_actual || '0'), 0);

  const displayed = filtro === 'deuda' ? conDeuda : filtro === 'aldía' ? sinDeuda : activos;

  return (
    <Layout>
      <PageHeader
        title="Fiadores"
        description="Clientes al fiado, saldos pendientes y registro de pagos."
        action={
          <button
            onClick={() => setIsAddOpen(true)}
            className="interactive-btn px-5 py-3 rounded-xl bg-primary text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/25"
            data-testid="button-nuevo-fiador"
          >
            <Plus size={18} /> Nuevo Fiador
          </button>
        }
      />

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card rounded-2xl p-4 border-l-4 border-primary">
          <p className="text-xs text-muted-foreground">Total clientes</p>
          <p className="text-2xl font-black">{activos.length}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 border-l-4 border-red-500">
          <p className="text-xs text-muted-foreground">Con deuda</p>
          <p className="text-2xl font-black text-red-500">{conDeuda.length}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 border-l-4 border-red-500">
          <p className="text-xs text-muted-foreground">Total por cobrar</p>
          <p className="text-2xl font-black text-red-500">Q {totalPendiente.toFixed(2)}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 border-l-4 border-green-500">
          <p className="text-xs text-muted-foreground">Al día</p>
          <p className="text-2xl font-black text-green-600">{sinDeuda.length}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5">
        {(['deuda', 'aldía', 'todos'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-xl font-bold text-sm interactive-btn ${filtro === f ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
            data-testid={`button-filtro-${f}`}
          >
            {f === 'deuda' ? `Con deuda (${conDeuda.length})` : f === 'aldía' ? `Al día (${sinDeuda.length})` : `Todos (${activos.length})`}
          </button>
        ))}
      </div>

      {/* Lista de fiadores */}
      {isLoading ? (
        <div className="glass-card rounded-3xl p-12 text-center text-muted-foreground">
          <Loader2 className="mx-auto mb-3 animate-spin" size={32} />Cargando desde Google Sheets...
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 opacity-20" size={48} />
          <p className="font-semibold">
            {filtro === 'deuda' ? 'Sin clientes con deuda pendiente' : filtro === 'aldía' ? 'Sin clientes al día' : 'Sin fiadores registrados'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayed.map(f => <FiadorCard key={f.Fiador_ID} fiador={f} />)}
        </div>
      )}

      {/* Modal Nuevo Fiador */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Nuevo Fiador</h2>
              <button onClick={() => setIsAddOpen(false)} className="p-2 rounded-xl hover:bg-black/5"><X size={18} /></button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                createFiador.mutate({ nombre, telefono, direccion, limiteCredito: parseFloat(limite) || 500 });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold mb-1">Nombre *</label>
                <input required className="input-field" value={nombre} onChange={e => setNombre(e.target.value)} data-testid="input-nombre-fiador" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Teléfono</label>
                <input className="input-field" value={telefono} onChange={e => setTelefono(e.target.value)} data-testid="input-telefono-fiador" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Dirección</label>
                <input className="input-field" value={direccion} onChange={e => setDireccion(e.target.value)} data-testid="input-direccion-fiador" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Límite de crédito (Q)</label>
                <input type="number" step="1" min="0" className="input-field" value={limite} onChange={e => setLimite(e.target.value)} data-testid="input-limite-fiador" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground interactive-btn">Cancelar</button>
                <button type="submit" disabled={createFiador.isPending} className="flex-1 py-3 rounded-xl font-bold bg-primary text-white interactive-btn shadow-lg shadow-primary/20" data-testid="button-guardar-fiador">
                  {createFiador.isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {conDeuda.length > 0 && (
        <div className="mt-6 glass-card rounded-2xl p-4 flex items-center gap-3 border border-amber-200 bg-amber-50/50">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-bold">Q {totalPendiente.toFixed(2)}</span> pendientes por cobrar. Este dinero ya contó como venta pero aún no está en caja.
          </p>
        </div>
      )}
    </Layout>
  );
}
