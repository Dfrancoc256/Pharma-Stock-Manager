import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useUsers, useCreateUser } from "@/hooks/use-users";
import { Plus, UserCircle } from "lucide-react";

export default function UsersPage() {
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate({ username, password }, {
      onSuccess: () => {
        setIsAddOpen(false);
        setUsername(""); setPassword("");
      }
    });
  };

  return (
    <Layout>
      <PageHeader 
        title="Usuarios del Sistema" 
        description="Administra el acceso a la plataforma web."
        action={
          <button 
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
              <th className="p-4 font-semibold w-16">ID</th>
              <th className="p-4 font-semibold">Usuario</th>
              <th className="p-4 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className="border-b border-border/30 hover:bg-black/[0.02] transition-colors">
                  <td className="p-4 text-sm font-mono text-muted-foreground">{u.id}</td>
                  <td className="p-4 font-bold text-foreground flex items-center gap-3">
                    <UserCircle className="text-primary/60" size={24} /> {u.username}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700">Activo</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-6">Añadir Usuario</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nombre de Usuario</label>
                <input required className="input-field" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Contraseña</label>
                <input required type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground hover:bg-muted/80 interactive-btn">Cancelar</button>
                <button type="submit" disabled={createUser.isPending} className="flex-1 py-3 rounded-xl font-bold bg-foreground text-background hover:bg-foreground/90 interactive-btn shadow-lg">
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
