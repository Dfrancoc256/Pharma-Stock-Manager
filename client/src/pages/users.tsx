import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useUsers, useCreateUser, useUpdateUser } from "@/hooks/use-users";
import { Plus, UserCircle, ShieldCheck, Shield, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UsersPage() {
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<string | null>(null);
  const [form, setForm] = useState({ usuario: "", pass: "", rol: "VENDEDOR" });
  const [editForm, setEditForm] = useState({ pass: "", rol: "VENDEDOR" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate(form, {
      onSuccess: () => {
        setIsAddOpen(false);
        setForm({ usuario: "", pass: "", rol: "VENDEDOR" });
        toast({ title: "Usuario creado correctamente" });
      },
      onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    updateUser.mutate({ usuario: editUser, ...editForm }, {
      onSuccess: () => {
        setEditUser(null);
        toast({ title: "Usuario actualizado" });
      },
      onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
    });
  };

  const toggleActivo = (u: { Usuario: string; Activo: string }) => {
    const nuevoActivo = u.Activo?.toUpperCase() === "TRUE" ? "FALSE" : "TRUE";
    updateUser.mutate({ usuario: u.Usuario, activo: nuevoActivo }, {
      onSuccess: () => toast({ title: `Usuario ${nuevoActivo === "TRUE" ? "activado" : "desactivado"}` }),
      onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
    });
  };

  return (
    <Layout>
      <PageHeader
        title="Usuarios del Sistema"
        description="Administra el acceso y roles de la plataforma."
        action={
          <button
            data-testid="button-nuevo-usuario"
            onClick={() => setIsAddOpen(true)}
            className="interactive-btn px-6 py-3 rounded-xl bg-foreground text-background font-bold flex items-center gap-2 shadow-lg shadow-black/20"
          >
            <Plus size={20} /> Nuevo Usuario
          </button>
        }
      />

      <div className="glass-card rounded-3xl overflow-hidden max-w-4xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-sm border-b border-border/50">
              <th className="p-4 font-semibold">Usuario</th>
              <th className="p-4 font-semibold">Rol</th>
              <th className="p-4 font-semibold">Estado</th>
              <th className="p-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No hay usuarios registrados</td></tr>
            ) : (
              users.map((u, i) => {
                const activo = u.Activo?.toUpperCase() === "TRUE";
                return (
                  <tr key={i} data-testid={`row-user-${i}`} className="border-b border-border/30 hover:bg-black/[0.02] transition-colors">
                    <td className="p-4 font-bold text-foreground">
                      <div className="flex items-center gap-3">
                        <UserCircle className="text-primary/60 shrink-0" size={24} />
                        <span data-testid={`text-username-${i}`}>{u.Usuario}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${u.Rol?.toUpperCase() === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                        {u.Rol?.toUpperCase() === "ADMIN" ? <ShieldCheck size={12} /> : <Shield size={12} />}
                        {u.Rol ?? "VENDEDOR"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          data-testid={`button-edit-${i}`}
                          onClick={() => { setEditUser(u.Usuario); setEditForm({ pass: "", rol: u.Rol ?? "VENDEDOR" }); }}
                          className="p-2 rounded-lg hover:bg-muted interactive-btn text-muted-foreground"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          data-testid={`button-toggle-${i}`}
                          onClick={() => toggleActivo(u)}
                          className="p-2 rounded-lg hover:bg-muted interactive-btn text-muted-foreground"
                          title={activo ? "Desactivar" : "Activar"}
                        >
                          {activo ? <ToggleRight size={20} className="text-green-600" /> : <ToggleLeft size={20} className="text-muted-foreground" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-6">Nuevo Usuario</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Usuario</label>
                <input data-testid="input-usuario" required className="input-field" value={form.usuario} onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Contraseña</label>
                <input data-testid="input-pass" required type="password" className="input-field" value={form.pass} onChange={e => setForm(f => ({ ...f, pass: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Rol</label>
                <select data-testid="select-rol" className="input-field" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground hover:bg-muted/80 interactive-btn">Cancelar</button>
                <button data-testid="button-crear" type="submit" disabled={createUser.isPending} className="flex-1 py-3 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90 interactive-btn shadow-lg">
                  {createUser.isPending ? "Creando..." : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-1">Editar Usuario</h2>
            <p className="text-muted-foreground text-sm mb-6">{editUser}</p>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nueva Contraseña <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <input type="password" className="input-field" value={editForm.pass} onChange={e => setEditForm(f => ({ ...f, pass: e.target.value }))} placeholder="Dejar en blanco para no cambiar" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Rol</label>
                <select className="input-field" value={editForm.rol} onChange={e => setEditForm(f => ({ ...f, rol: e.target.value }))}>
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditUser(null)} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground hover:bg-muted/80 interactive-btn">Cancelar</button>
                <button type="submit" disabled={updateUser.isPending} className="flex-1 py-3 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90 interactive-btn shadow-lg">
                  {updateUser.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
