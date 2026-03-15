import { Link, useLocation } from "wouter";
import { 
  ShoppingCart, 
  PackageSearch, 
  Users, 
  TrendingUp,
  LayoutDashboard,
  ShieldCheck,
  Stethoscope,
  LogOut,
  UserCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "Punto de Venta", icon: ShoppingCart },
  { href: "/inventory", label: "Inventario", icon: PackageSearch },
  { href: "/fiadores", label: "Fiadores", icon: Users },
  { href: "/balances", label: "Balances", icon: TrendingUp },
  { href: "/users", label: "Usuarios", icon: ShieldCheck, adminOnly: true },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isAdmin, rol, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);
  const rolLabel = rol ? rol.charAt(0).toUpperCase() + rol.slice(1).toLowerCase() : "Usuario";
  const displayName = user?.nombre || user?.email || "Usuario";

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
      
      {/* Sidebar */}
      <aside className="w-64 glass-panel flex flex-col z-20 hidden md:flex relative">
        
        {/* Logo */}
        <div className="p-5 flex items-center gap-3 border-b border-border/30">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <Stethoscope size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">Farmacia Web</h1>
            <p className="text-xs text-muted-foreground">Sistema de Gestión</p>
          </div>
        </div>

        {/* User info */}
        {user && (
          <div className="px-4 py-3 border-b border-border/20 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <UserCircle2 size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate" data-testid="text-username">
                  {displayName}
                </p>
                <Badge
                  variant={isAdmin ? "default" : "secondary"}
                  className="text-xs px-1.5 py-0 h-4 mt-0.5"
                  data-testid="badge-rol"
                >
                  {rolLabel}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl interactive-btn cursor-pointer transition-colors ${
                    isActive 
                      ? "bg-primary/10 text-primary font-semibold shadow-inner" 
                      : "text-muted-foreground hover:bg-black/5 hover:text-foreground font-medium"
                  }`}
                >
                  <item.icon size={20} className={isActive ? "text-primary" : "opacity-70"} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        
        {/* Logout */}
        <div className="p-4 border-t border-border/30">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-muted-foreground hover:bg-red-50 hover:text-red-600 font-medium interactive-btn cursor-pointer w-full transition-colors"
            data-testid="button-logout"
          >
            <LogOut size={20} className="opacity-70" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
