import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Users, CheckCircle2, Loader2, X } from "lucide-react";

interface Fiador {
  Fiador_ID: string; Nombre: string; Telefono: string;
  Direccion: string; Saldo_actual: string; Limite_credito: string; Activo: string;
}

export default function FiadoresPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [monto, setMonto] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data: fiadores = [], isLoading } = useQuery<Fiador[]>({
    queryKey: ['/api/sheets/fiadores'],
    queryFn: async () => {
      const res = await fetch('/api/sheets/fiadores', { credentials: 'include' });
      if (!res.ok) throw new Error('Error cargando fiadores');
      return res.json();
    },
  });

  const createFiador = useMutation({
    mutationFn: async (body: { nombre: string; telefono: string; saldoInicial: number }) => {
      const res = await fetch('/api/sheets/fiadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, direccion: '', limiteCredito: 0 }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error creando fiador');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sheets/fiadores'] });
      setIsAddOpen(false);
      setNombre(''); setTelefono(''); setMonto('');
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
      if (!res.ok) throw new Error('Error al marcar como pagado');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sheets/fiadores'] });
      setConfirmId(null);
    }
  });

  const activos = fiadores.filter(f => f.Fiador_ID);
  const conDeuda = activos.filter(f => parseFloat(f.Saldo_actual || '0') > 0);
  const sinDeuda = activos.filter(f => parseFloat(f.Saldo_actual || '0') <= 0);
  const totalPendiente = conDeuda.reduce((acc, f) => acc + parseFloat(f.Saldo_actual || '0'), 0);

  const fiadorConfirm = confirmId ? activos.find(f => f.Fiador_ID === confirmId) : null;

  return (
    <Layout>
      <PageHeader
        title="Fiadores"
        description="Clientes al fiado y sus saldos pendientes."
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

      {/* Resumen rápido */}
      {totalPendiente > 0 && (
        <div className="glass-card rounded-2xl p-4 mb-5 flex items-center justify-between border-l-4 border-red-400">
          <div>
            <p className="text-xs text-muted-foreground">{conDeuda.length} cliente{conDeuda.length !== 1 ? 's' : ''} con deuda pendiente</p>
            <p className="text-2xl font-black text-red-500">Q {totalPendiente.toFixed(2)}</p>
          </div>
          <p className="text-xs text-muted-foreground text-right">Por cobrar</p>
        </div>
      )}

      {/* Tabla de fiadores con deuda */}
      <div className="glass-card rounded-3xl overflow-hidden mb-4">
        <div className="px-5 py-3 bg-muted/40 border-b border-border/40">
          <p className="text-sm font-bold text-muted-foreground">CON DEUDA</p>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin" /> Cargando...
          </div>
        ) : conDeuda.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-2 text-green-500 opacity-60" size={36} />
            <p className="font-semibold text-sm">Sin deudas pendientes</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {conDeuda.map(f => (
              <div key={f.Fiador_ID} className="flex items-center justify-between px-5 py-4 hover:bg-black/[0.02]" data-testid={`row-fiador-${f.Fiador_ID}`}>
                <div>
                  <p className="font-bold text-foreground" data-testid={`text-nombre-${f.Fiador_ID}`}>{f.Nombre}</p>
                  {f.Telefono && <p className="text-xs text-muted-foreground">{f.Telefono}</p>}
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xl font-black text-red-500" data-testid={`text-saldo-${f.Fiador_ID}`}>
                    Q {parseFloat(f.Saldo_actual || '0').toFixed(2)}
                  </p>
                  <button
                    onClick={() => setConfirmId(f.Fiador_ID)}
                    className="px-4 py-2 rounded-xl bg-green-500 text-white font-bold text-sm interactive-btn flex items-center gap-1.5"
                    data-testid={`button-aldia-${f.Fiador_ID}`}
                  >
                    <CheckCircle2 size={14} /> Al día
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabla de fiadores al día */}
      {sinDeuda.length > 0 && (
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="px-5 py-3 bg-muted/40 border-b border-border/40">
            <p className="text-sm font-bold text-muted-foreground">AL DÍA ({sinDeuda.length})</p>
          </div>
          <div className="divide-y divide-border/30">
            {sinDeuda.map(f => (
              <div key={f.Fiador_ID} className="flex items-center justify-between px-5 py-3 opacity-60" data-testid={`row-fiador-aldía-${f.Fiador_ID}`}>
                <p className="font-semibold text-foreground text-sm">{f.Nombre}</p>
                <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Al día
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Nuevo Fiador */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black">Nuevo Fiador</h2>
              <button onClick={() => setIsAddOpen(false)} className="p-2 rounded-xl hover:bg-black/5"><X size={18} /></button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                createFiador.mutate({ nombre, telefono, saldoInicial: parseFloat(monto) || 0 });
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
                <label className="block text-sm font-semibold mb-1">Monto que debe (Q)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">Q</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="input-field pl-8"
                    value={monto}
                    onChange={e => setMonto(e.target.value)}
                    data-testid="input-monto-fiador"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Deja en 0 si aún no debe nada</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground interactive-btn">Cancelar</button>
                <button type="submit" disabled={createFiador.isPending} className="flex-1 py-3 rounded-xl font-bold bg-primary text-white interactive-btn" data-testid="button-guardar-fiador">
                  {createFiador.isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmación "Al día" */}
      {fiadorConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200 text-center">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-black mb-1">¿Marcar como pagado?</h2>
            <p className="text-muted-foreground mb-1">{fiadorConfirm.Nombre}</p>
            <p className="text-2xl font-black text-red-500 mb-6">
              Q {parseFloat(fiadorConfirm.Saldo_actual || '0').toFixed(2)}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmId(null)} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground interactive-btn">Cancelar</button>
              <button
                onClick={() => cancelarMutation.mutate(fiadorConfirm.Fiador_ID)}
                disabled={cancelarMutation.isPending}
                className="flex-1 py-3 rounded-xl font-bold bg-green-500 text-white interactive-btn"
                data-testid="button-confirmar-aldia"
              >
                {cancelarMutation.isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activos.length === 0 && !isLoading && (
        <div className="glass-card rounded-3xl p-12 text-center text-muted-foreground mt-4">
          <Users className="mx-auto mb-3 opacity-20" size={48} />
          <p className="font-semibold">Sin fiadores registrados</p>
        </div>
      )}
    </Layout>
  );
}
