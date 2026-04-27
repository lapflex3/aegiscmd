import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";

const db = new Database("telemetry.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    drone_id TEXT,
    type TEXT,
    status TEXT,
    batt INTEGER,
    signal INTEGER,
    lat REAL,
    lon REAL,
    alt TEXT,
    spd TEXT,
    mission TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/telemetry", (req, res) => {
    const { drone_id, type, status, batt, signal, lat, lon, alt, spd, mission } = req.body;
    
    try {
      const stmt = db.prepare(`
        INSERT INTO telemetry (drone_id, type, status, batt, signal, lat, lon, alt, spd, mission)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(drone_id, type, status, batt, signal, lat, lon, alt, spd, mission);
      res.json({ success: true });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to log telemetry" });
    }
  });

  app.get("/api/telemetry/export", (req, res) => {
    try {
      const rows = db.prepare("SELECT * FROM telemetry ORDER BY timestamp DESC").all();
      
      if (req.query.format === "csv") {
        const headers = ["id", "drone_id", "type", "status", "batt", "signal", "lat", "lon", "alt", "spd", "mission", "timestamp"];
        const csvRows = rows.map((row: any) => 
          headers.map(header => JSON.stringify(row[header] ?? "")).join(",")
        );
        const csvContent = [headers.join(","), ...csvRows].join("\n");
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=telemetry_export.csv");
        return res.send(csvContent);
      }
      
      res.json(rows);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Failed to export telemetry" });
    }
  });

  app.delete("/api/telemetry", (req, res) => {
    try {
      db.prepare("DELETE FROM telemetry").run();
      res.json({ success: true });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Failed to purge telemetry" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
