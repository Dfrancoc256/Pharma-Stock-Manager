import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Try __dirname first (dist/), then fallback to cwd-relative path
  const candidates = [
    path.resolve(__dirname, "public"),
    path.resolve(process.cwd(), "dist", "public"),
  ];

  const distPath = candidates.find((p) => fs.existsSync(p));

  if (!distPath) {
    throw new Error(
      `Could not find the build directory. Tried: ${candidates.join(", ")}. Run 'npm run build' first.`,
    );
  }

  const indexHtml = path.resolve(distPath, "index.html");
  if (!fs.existsSync(indexHtml)) {
    throw new Error(
      `index.html not found at ${indexHtml}. Run 'npm run build' first.`,
    );
  }

  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(distPath));

  // SPA fallback: ALL unmatched routes return index.html so React Router handles them
  app.use((_req, res) => {
    res.sendFile(indexHtml);
  });
}
