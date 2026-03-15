// Simple session-based auth validated against Google Sheets Usuarios tab
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { getUsuariosSheet } from "./googleSheets";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

export function setupSimpleAuth(app: Express) {
  app.use(getSession());

  // POST /api/auth/login
  app.post("/api/auth/login", async (req: any, res) => {
    const { usuario, password } = req.body;
    if (!usuario || !password) {
      return res.status(400).json({ message: "Usuario y contraseña son requeridos" });
    }

    try {
      const usuarios = await getUsuariosSheet();

      // Find by Email (case-insensitive) or Username column
      const user = usuarios.find((u: any) => {
        const emailMatch = u.Email?.toLowerCase().trim() === usuario.toLowerCase().trim();
        const userMatch = u.Usuario?.toLowerCase().trim() === usuario.toLowerCase().trim();
        return emailMatch || userMatch;
      });

      if (!user) {
        return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
      }

      // Check password
      const pass = user.Password ?? user.Contraseña ?? "";
      if (pass !== password) {
        return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
      }

      // Check active
      const activo = String(user.Activo ?? "").toUpperCase().trim();
      if (activo !== "TRUE" && activo !== "SI" && activo !== "1" && activo !== "ACTIVO") {
        return res.status(403).json({ message: "Tu cuenta está inactiva. Contacta al administrador." });
      }

      const nombre = user.Nombre ?? user.Email ?? user.Usuario ?? usuario;
      const rol = (user.Rol ?? "vendedor").toUpperCase().trim();

      (req.session as any).authUser = {
        email: user.Email ?? usuario,
        nombre,
        rol,
      };

      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Error guardando sesión" });
        }
        res.json({ email: user.Email ?? usuario, nombre, rol });
      });
    } catch (err: any) {
      console.error("Login error:", err.message);
      res.status(500).json({ message: "Error conectando con la base de datos. Intenta de nuevo." });
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) return res.status(500).json({ message: "Error cerrando sesión" });
      res.clearCookie("connect.sid");
      res.json({ message: "Sesión cerrada" });
    });
  });

  // GET /api/auth/logout (redirect-friendly)
  app.get("/api/logout", (req: any, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect("/login");
    });
  });

  // GET /api/auth/user
  app.get("/api/auth/user", (req: any, res) => {
    const authUser = (req.session as any)?.authUser;
    if (!authUser) {
      return res.status(401).json({ message: "No autenticado" });
    }
    res.json(authUser);
  });
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  const authUser = (req.session as any)?.authUser;
  if (!authUser) {
    return res.status(401).json({ message: "No autenticado" });
  }
  next();
};
