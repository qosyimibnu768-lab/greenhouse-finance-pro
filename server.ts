import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_FILE_PATH = path.join(__dirname, 'data', 'greenhouse_db.json');

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    name: 'Greenhouse Finance Pro API',
  });
});

// GET Database
app.get(['/api/db', '/api/database'], (req, res) => {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      return res.send(data);
    }
    // Return empty fallback if not yet created
    return res.status(404).json({ error: 'Database file not found' });
  } catch (error: any) {
    console.error('Error reading database file:', error);
    return res.status(500).json({ error: 'Internal server error reading database', details: error.message });
  }
});

// POST Database (Save State)
app.post(['/api/db', '/api/database'], (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload: JSON object expected' });
    }

    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    return res.json({
      success: true,
      message: 'Database saved successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error saving database file:', error);
    return res.status(500).json({ error: 'Internal server error saving database', details: error.message });
  }
});

// POST Google Sheets Proxy
app.post(['/api/sync-sheets', '/api/sheets-sync'], async (req, res) => {
  try {
    const { webhookUrl, payload } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    return res.json({
      success: response.ok,
      status: response.status,
      response: text,
    });
  } catch (error: any) {
    console.error('Error proxying to Google Sheets:', error);
    return res.status(500).json({ error: error.message || 'Failed to sync with Google Sheets' });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Greenhouse Finance Pro server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
