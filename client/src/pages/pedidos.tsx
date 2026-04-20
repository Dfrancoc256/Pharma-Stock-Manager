import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import {
  Plus,
  X,
  Package,
  Truck,
  Calendar,
  User,
  FileText,
  Edit,
  Trash2,
} from "lucide-react";

interface Pedido {
  ID_Pedido: string;
  Fecha: string;
  Producto_ID: string;
  Nombre: string;
  Proveedor: string;
  Cantidad: number;
  Costo_unitario: number;
  Total: number;
  Estado: string;
  Usuario: string;
  Observaciones: string;
}

function toMoney(value: string | number | null | undefined) {
  const num = Number(value ?? 0);
  return Number.isFinite(num)
    ? num.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";
}

export default function PedidosPage() {
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Pedido | null>(null);
  const [selected, setSelected] = useState<Pedido | null>(null);

  const [productoId, setProductoId] = useState("");
  const [nombre, setNombre] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [costoUnitario, setCostoUnitario] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [usuario, setUsuario] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const { data, isLoading } = useQuery<Pedido[]>({
    queryKey: ["/api/sheets/pedidos"],
    queryFn: async () => {
      const res = await fetch("/api/sheets/pedidos", {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Error cargando pedidos");

      const json = await res.json();

      if (Array.isArray(json)) return json;
      if (Array.isArray(json?.data)) return json.data;

      return [];
    },
  });

  const createPedido = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/sheets/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Error al crear pedido");
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/sheets/pedidos"] });
      cerrarModal();
    },
  });

  const updatePedido = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      const res = await fetch(`/api/sheets/pedidos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Error al actualizar pedido");
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/sheets/pedidos"] });
      cerrarModal();
    },
  });

  const deletePedido = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sheets/pedidos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Error al eliminar pedido");
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/sheets/pedidos"] });
      setSelected(null);
    },
  });

  const pedidosFiltrados = useMemo(() => {
    const base = Array.isArray(data) ? data : [];

    if (!filtroEstado) return base;

    return base.filter(
      (p) => String(p.Estado ?? "").toLowerCase() === filtroEstado.toLowerCase()
    );
  }, [data, filtroEstado]);

  const totalPreview =
    (Number(cantidad) || 0) * (Number(costoUnitario) || 0);

  function limpiarFormulario() {
    setProductoId("");
    setNombre("");
    setProveedor("");
    setCantidad("");
    setCostoUnitario("");
    setEstado("pendiente");
    setUsuario("");
    setObservaciones("");
    setEditing(null);
  }

  function cerrarModal() {
    setIsOpen(false);
    limpiarFormulario();
  }

  function abrirNuevo() {
    limpiarFormulario();
    setIsOpen(true);
  }

  function abrirEditar(p: Pedido) {
    setEditing(p);
    setProductoId(String(p.Producto_ID ?? ""));
    setNombre(String(p.Nombre ?? ""));
    setProveedor(String(p.Proveedor ?? ""));
    setCantidad(String(p.Cantidad ?? ""));
    setCostoUnitario(String(p.Costo_unitario ?? ""));
    setEstado(String(p.Estado ?? "pendiente"));
    setUsuario(String(p.Usuario ?? ""));
    setObservaciones(String(p.Observaciones ?? ""));
    setIsOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const body = {
      productoId,
      nombre,
      proveedor,
      cantidad: Number(cantidad) || 0,
      costoUnitario: Number(costoUnitario) || 0,
      estado,
      usuario,
      observaciones,
    };

    if (editing?.ID_Pedido) {
      updatePedido.mutate({
        id: String(editing.ID_Pedido),
        body,
      });
    } else {
      createPedido.mutate(body);
    }
  }

  return (
    <Layout>
      <PageHeader
        title="Pedidos"
        description="Control y gestión de pedidos a proveedores."
        action={
          <button
            onClick={abrirNuevo}
            className="interactive-btn px-6 py-3 rounded-xl bg-primary text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/25"
          >
            <Plus size={20} /> Nuevo Pedido
          </button>
        }
      />

      <div className="glass-card rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-center">
        <span className="text-sm font-semibold text-muted-foreground">Filtrar por estado:</span>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="input-field py-2"
        >
          <option value="">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="recibido">Recibido</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-sm border-b border-border/50">
              <th className="p-4 font-semibold">Fecha</th>
              <th className="p-4 font-semibold">Producto</th>
              <th className="p-4 font-semibold">Proveedor</th>
              <th className="p-4 font-semibold">Cantidad</th>
              <th className="p-4 font-semibold">Estado</th>
              <th className="p-4 font-semibold text-right">Total</th>
              <th className="p-4 font-semibold text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Cargando...
                </td>
              </tr>
            ) : !pedidosFiltrados.length ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">
                  No hay pedidos registrados
                </td>
              </tr>
            ) : (
              pedidosFiltrados.map((p, i) => (
                <tr
                  key={`${p.ID_Pedido}-${i}`}
                  className="border-b border-border/30 hover:bg-primary/5 transition-colors"
                >
                  <td className="p-4 text-sm text-muted-foreground">{p.Fecha}</td>
                  <td className="p-4 font-medium">{p.Nombre}</td>
                  <td className="p-4 text-sm text-muted-foreground">{p.Proveedor}</td>
                  <td className="p-4">{p.Cantidad}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        p.Estado === "recibido"
                          ? "bg-green-100 text-green-700"
                          : p.Estado === "cancelado"
                          ? "bg-red-100 text-red-600"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {p.Estado}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold">Q {toMoney(p.Total)}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setSelected(p)}
                        className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/70"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => abrirEditar(p)}
                        className="px-3 py-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar el pedido ${p.Nombre}?`)) {
                            deletePedido.mutate(String(p.ID_Pedido));
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="glass-card rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h2 className="text-xl font-black">Detalle del Pedido</h2>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-xl hover:bg-black/5"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <InfoRow icon={<Package size={15} />} label="Producto" value={selected.Nombre} />
              <InfoRow icon={<Calendar size={15} />} label="Fecha" value={selected.Fecha} />
              <InfoRow icon={<Truck size={15} />} label="Proveedor" value={selected.Proveedor || "—"} />
              <InfoRow icon={<User size={15} />} label="Usuario" value={selected.Usuario || "—"} />
              <InfoRow icon={<FileText size={15} />} label="Estado" value={selected.Estado || "—"} />
              <InfoRow icon={<Package size={15} />} label="Cantidad" value={String(selected.Cantidad ?? 0)} />
              <InfoRow
                icon={<Package size={15} />}
                label="Costo unitario"
                value={`Q ${toMoney(selected.Costo_unitario)}`}
              />
              <InfoRow
                icon={<Package size={15} />}
                label="Total"
                value={`Q ${toMoney(selected.Total)}`}
              />
              <InfoRow
                icon={<FileText size={15} />}
                label="Observaciones"
                value={selected.Observaciones || "—"}
              />
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {editing ? "Editar Pedido" : "Nuevo Pedido"}
              </h2>
              <button onClick={cerrarModal} className="p-2 rounded-xl hover:bg-black/5">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Producto ID</label>
                  <input
                    className="input-field"
                    value={productoId}
                    onChange={(e) => setProductoId(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Nombre</label>
                  <input
                    required
                    className="input-field"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre del producto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Proveedor</label>
                  <input
                    className="input-field"
                    value={proveedor}
                    onChange={(e) => setProveedor(e.target.value)}
                    placeholder="Proveedor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Cantidad</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="input-field"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Costo unitario</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-field"
                    value={costoUnitario}
                    onChange={(e) => setCostoUnitario(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Estado</label>
                  <select
                    className="input-field"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="recibido">Recibido</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Usuario</label>
                  <input
                    className="input-field"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Sistema"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Total calculado</label>
                  <div className="input-field bg-muted/40 font-bold">
                    Q {toMoney(totalPreview)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Observaciones</label>
                <textarea
                  className="input-field min-h-[100px]"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas adicionales"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={createPedido.isPending || updatePedido.isPending}
                  className="flex-1 py-3 rounded-xl font-bold bg-primary text-white shadow-lg shadow-primary/20"
                >
                  {createPedido.isPending || updatePedido.isPending
                    ? "Guardando..."
                    : editing
                    ? "Actualizar"
                    : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/20 last:border-0">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-foreground flex-1">{value}</span>
    </div>
  );
}