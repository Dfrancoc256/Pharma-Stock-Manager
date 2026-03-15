import { Link, useLocation } from "wouter";
import { 
  ShoppingCart, 
  PackageSearch, 
  Users, 
  TrendingUp,
  LayoutDashboard,
  ShieldCheck,
  Stethoscope,
  LogOut
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "Punto de Venta", icon: ShoppingCart },
  { href: "/inventory", label: "Inventario", icon: PackageSearch },
  { href: "/fiadores", label: "Fiadores", icon: Users },
  { href: "/balances", label: "Balances", icon: TrendingUp },
  { href: "/users", label: "Usuarios", icon: ShieldCheck },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
      
      {/* Sidebar */}
      <aside className="w-64 glass-panel flex flex-col z-20 hidden md:flex relative">
        <div className="p-6 flex items-center gap-3 border-b border-border/30">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <Stethoscope size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Farmacia Web</h1>
            <p className="text-xs text-muted-foreground font-medium">Google Sheets DB</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl interactive-btn cursor-pointer ${
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
        
        <div className="p-4 border-t border-border/30">
          <a href="/api/logout" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-muted-foreground hover:bg-red-50 hover:text-red-600 font-medium interactive-btn cursor-pointer w-full">
            <LogOut size={20} className="opacity-70" />
            Cerrar Sesión
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
