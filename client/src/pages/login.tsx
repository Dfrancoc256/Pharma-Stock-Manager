import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Stethoscope, User, Lock, LogIn, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) setLocation("/");
  }, [user, setLocation]);

  if (isLoading) return null;
  if (user) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ usuario: usuario.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al iniciar sesión");
        return;
      }

      // Refresh auth state
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    } catch {
      setError("No se pudo conectar al servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-4">
      
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-sm shadow-2xl border-0 ring-1 ring-border/40 relative">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-gradient-to-r from-primary via-emerald-400 to-primary" />

        <CardHeader className="text-center pt-8 pb-4 space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-primary/30">
            <Stethoscope size={28} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">Farmacia Web</CardTitle>
            <CardDescription className="text-sm mt-1">Sistema de Gestión</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-8 px-6">
          <form onSubmit={handleLogin} className="space-y-4">

            <div className="space-y-1.5">
              <Label htmlFor="usuario" className="text-sm font-semibold text-foreground">
                Usuario
              </Label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="usuario"
                  type="text"
                  placeholder="Nombre de usuario"
                  value={usuario}
                  onChange={e => setUsuario(e.target.value)}
                  className="pl-9 h-11 border-border/60 focus:border-primary"
                  autoComplete="username"
                  required
                  data-testid="input-usuario"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                Contraseña
              </Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-9 h-11 border-border/60 focus:border-primary"
                  autoComplete="current-password"
                  required
                  data-testid="input-password"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm ml-1">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full h-11 font-bold shadow-lg shadow-primary/20 mt-2"
              disabled={loading || !usuario || !password}
              data-testid="button-login"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Iniciar Sesión
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Acceso solo para personal autorizado
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
