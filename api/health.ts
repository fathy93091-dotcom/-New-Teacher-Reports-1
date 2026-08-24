import type { IncomingMessage } from "http";

export default function handler(_req: IncomingMessage, res: any) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.statusCode = 200;
  res.end(
    JSON.stringify({
      status: "ok",
      appName: "GoStars – Teacher Management System",
      platform: "Vercel / Cloud Run",
      timestamp: new Date().toISOString()
    })
  );
}
