import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Proxy për portalet IPTV
app.get("/mag-proxy", async (req, res) => {
  const target = req.query.target;
  if (!target) return res.status(400).json({ error: "Missing target URL" });

  try {
    const response = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0 STBEmu/1.2" },
    });
    const text = await response.text();
    res.send(text);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy request failed" });
  }
});

// Serve React frontend build
const clientPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientPath));
app.get("*", (_, res) => res.sendFile(path.join(clientPath, "index.html")));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
