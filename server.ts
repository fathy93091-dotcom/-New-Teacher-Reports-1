import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const appDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();

async function startServer() {
  const PORT = 3000;

  const { app } = await import("./server/app");

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const candidates = [
      path.join(process.cwd(), "dist"),
      path.join(process.cwd(), "build"),
      typeof appDir === "string" ? appDir : "",
      path.resolve(process.cwd(), "dist"),
      path.resolve(process.cwd(), "build"),
      typeof appDir === "string" ? path.resolve(appDir, "..") : ""
    ].filter(Boolean);

    let distPath = path.join(process.cwd(), "dist");
    for (const candidate of candidates) {
      if (candidate && typeof candidate === "string") {
        const indexCandidate = path.join(candidate, "index.html");
        if (fs.existsSync(indexCandidate)) {
          distPath = candidate;
          break;
        }
      }
    }

    console.log(`[GoStars Server] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API route not found" });
      }
      const indexPath = distPath ? path.join(distPath, "index.html") : path.join(process.cwd(), "dist", "index.html");
      if (typeof indexPath === "string" && indexPath.length > 0 && fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send("GoStars Assistant - Application is running.");
      }
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`GoStars Server running on http://0.0.0.0:${PORT}`);
  });

  // Handle graceful shutdown
  const handleShutdown = (signal: string) => {
    console.log(`[GoStars Server] Received ${signal}, closing server...`);
    server.close(() => {
      console.log("[GoStars Server] Closed all connections.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}

startServer().catch(err => {
  console.error("[GoStars Server] Fatal startup error:", err);
  process.exit(1);
});
