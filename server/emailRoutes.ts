// Envío de correos con nodemailer
// Requiere en el servidor: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
import type { Express } from "express";
import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    throw new Error("Faltan variables SMTP_HOST, SMTP_USER o SMTP_PASS en el servidor");
  }

  return { transporter: nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } }), from };
}

export function registerEmailRoutes(app: Express) {
  app.post("/api/email/send", async (req, res) => {
    const { to, subject, text } = req.body;
    if (!to || !subject || !text) {
      return res.status(400).json({ message: "Faltan campos: to, subject, text" });
    }

    // Si SMTP no está configurado, devolver 424 para que el frontend use mailto fallback
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(424).json({ noSmtp: true, message: "Faltan variables SMTP_HOST, SMTP_USER o SMTP_PASS en el servidor" });
    }

    try {
      const { transporter, from } = getTransporter();
      await transporter.sendMail({ from, to, subject, text });
      res.json({ ok: true, message: `Correo enviado a ${to}` });
    } catch (err: any) {
      console.error("Email error:", err.message);
      res.status(500).json({ message: "Error enviando correo: " + err.message });
    }
  });

  // Verifica configuración SMTP
  app.get("/api/email/config", async (_req, res) => {
    const configured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    res.json({ configured, host: process.env.SMTP_HOST || null });
  });
}
