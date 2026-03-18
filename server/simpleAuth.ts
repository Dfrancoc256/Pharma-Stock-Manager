import session from "express-session";
import MemoryStore from "memorystore";
import type { Express, RequestHandler } from "express";
import { getUsuariosSheet } from "./googleSheets";

const SessionStore = MemoryStore(session);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  return session({
    secret: process.env.SESSION_SECRET!,
    store: new SessionStore({ checkPeriod: sessionTtl }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

export function setupSimpleAuth(app: Express) {
  app.use(getSession());

  app.post("/api/auth/login", async (req: any, res) => {
    const { usuario, password } = req.body;
    if (!usuario || !password) {
      return res.status(400).json({ message: "Usuario y contraseña son requeridos" });
    }

    try {
      const usuarios = await getUsuariosSheet();

      const user = usuarios.find((u: any) =>
        u.Usuario?.toLowerCase().trim() === usuario.toLowerCase().trim()
      );

      if (!user) {
        return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
      }

      const pass = String(user.Pass ?? "");
      if (pass !== password) {
        return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
      }

      const activo = String(user.Activo ?? "").toUpperCase().trim();
      if (activo !== "TRUE" && activo !== "SI" && activo !== "1" && activo !== "ACTIVO") {
        return res.status(403).json({ message: "Tu cuenta está inactiva. Contacta al administrador." });
      }

      const nombre = user.Usuario ?? usuario;
      const rol = (user.Rol ?? "VENDEDOR").toUpperCase().trim();

      (req.session as any).authUser = { email: usuario, nombre, rol };

      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Error guardando sesión" });
        }
        res.json({ email: usuario, nombre, rol });
      });
    } catch (err: any) {
      console.error("Login error:", err.message);
      res.status(500).json({ message: "Error conectando con Google Sheets. Intenta de nuevo." });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) return res.status(500).json({ message: "Error cerrando sesión" });
      res.clearCookie("connect.sid");
      res.json({ message: "Sesión cerrada" });
    });
  });

  app.get("/api/logout", (req: any, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.redirect("/login");
    });
  });

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
