import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { buildVoiceTransaction, computeBalanceFromTransactions, parseVoiceTransaction } from './server-lib/voiceParser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'greenhouse_db.json');
const SEED_FILE_PATH = path.join(DATA_DIR, 'greenhouse_db.seed.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure a pristine demo seed exists for "reset to demo" (self-healing)
if (!fs.existsSync(SEED_FILE_PATH) && fs.existsSync(DB_FILE_PATH)) {
  fs.copyFileSync(DB_FILE_PATH, SEED_FILE_PATH);
}

// ======================== SYNC VERSION & SSE ========================
let dbVersion = 1;
const sseClients = new Set<any>();

function broadcastVersion() {
  const message = `data: ${JSON.stringify({ version: dbVersion, timestamp: new Date().toISOString() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      // client already gone; cleaned up on close
    }
  }
}

function readDatabase(): any | null {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) return null;
    return JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf-8'));
  } catch (error: any) {
    console.error('Error reading database file:', error);
    return null;
  }
}

function writeDatabase(data: any): boolean {
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  dbVersion += 1;
  broadcastVersion();
  return true;
}

function buildEmptyDatabase(): any {
  let payrollSettings: any = undefined;
  const seed = readDatabaseFrom(SEED_FILE_PATH);
  if (seed?.payrollSettings) payrollSettings = seed.payrollSettings;

  return {
    tunnels: [],
    transactions: [],
    cycles: [],
    harvests: [],
    investments: [],
    assets: [],
    inventory: [],
    stockMutations: [],
    debts: [],
    employees: [],
    workShifts: [],
    attendances: [],
    leaveRequests: [],
    overtimeRequests: [],
    payrolls: [],
    employeeAuditLogs: [],
    payrollSettings,
    lastSynced: new Date().toISOString(),
  };
}

function readDatabaseFrom(filePath: string): any | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

// ======================== MIDDLEWARE ========================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ======================== HEALTH ========================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    name: 'Greenhouse Finance Pro API',
    version: dbVersion,
  });
});

// ======================== DATABASE GET / POST ========================
app.get(['/api/db', '/api/database'], (req, res) => {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      return res.send(data);
    }
    return res.status(404).json({ error: 'Database file not found' });
  } catch (error: any) {
    console.error('Error reading database file:', error);
    return res.status(500).json({ error: 'Internal server error reading database', details: error.message });
  }
});

app.post(['/api/db', '/api/database'], (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload: JSON object expected' });
    }

    writeDatabase(payload);
    return res.json({
      success: true,
      message: 'Database saved successfully',
      version: dbVersion,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error saving database file:', error);
    return res.status(500).json({ error: 'Internal server error saving database', details: error.message });
  }
});

// ======================== RESET & CLEAR ========================
app.post(['/api/database/reset', '/api/db/reset'], (req, res) => {
  try {
    const seed = readDatabaseFrom(SEED_FILE_PATH);
    if (!seed) {
      return res.status(500).json({ error: 'Data demo (seed) tidak ditemukan di server.' });
    }
    writeDatabase(seed);
    return res.json({
      success: true,
      message: 'Database reset to demo data',
      data: seed,
      version: dbVersion,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Gagal reset data demo', details: error.message });
  }
});

app.post(['/api/database/clear', '/api/db/clear'], (req, res) => {
  try {
    const empty = buildEmptyDatabase();
    writeDatabase(empty);
    return res.json({
      success: true,
      message: 'Database cleared',
      data: empty,
      version: dbVersion,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Gagal mengosongkan data', details: error.message });
  }
});

// ======================== SYNC VERSION & SSE ========================
app.get(['/api/sync/version', '/api/version'], (req, res) => {
  res.json({ version: dbVersion, timestamp: new Date().toISOString() });
});

app.get('/api/sync/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`data: ${JSON.stringify({ version: dbVersion, timestamp: new Date().toISOString() })}\n\n`);

  sseClients.add(res);
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      // ignore
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// ======================== GOOGLE SHEETS PROXY ========================
app.post(['/api/sync-sheets', '/api/sheets-sync', '/api/sync/sheets'], async (req, res) => {
  try {
    const { webhookUrl, payload } = req.body || {};
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

// ======================== VOICE PARSER (Indonesian NLP) ========================
// Implementasi parser dipindahkan ke server-lib/voiceParser.ts agar dipakai bersama
// server Express (lokal) dan Vercel Serverless Functions (fungsi diimpor di atas).

function handleVoiceRequest(text: string, res: any) {
  if (!text || !text.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Parameter "text" wajib diisi.',
      usage: 'POST /api/shortcuts/voice  body: {"text":"Pengeluaran 150 ribu beli nutrisi AB Mix siklus 1"}',
    });
  }

  const db = readDatabase();
  if (!db) {
    return res.status(500).json({ success: false, error: 'Database belum tersedia di server.' });
  }

  const balance = computeBalanceFromTransactions(db.transactions);
  const parsed = parseVoiceTransaction(text, balance);

  if (!parsed.amount || parsed.amount <= 0) {
    return res.status(400).json({
      success: false,
      reply: parsed.siriReply,
      error: 'Nominal rupiah tidak terdeteksi pada teks.',
      parsed,
    });
  }

  const transaction = buildVoiceTransaction(parsed);

  if (!Array.isArray(db.transactions)) db.transactions = [];
  db.transactions.unshift(transaction);
  writeDatabase(db);

  return res.json({
    success: true,
    reply: parsed.siriReply,
    source: 'voice-shortcut',
    parsed,
    transaction,
    version: dbVersion,
  });
}

app.post('/api/shortcuts/voice', (req, res) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    return handleVoiceRequest(text, res);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/shortcuts/voice', (req, res) => {
  try {
    const text = typeof req.query.text === 'string' ? req.query.text : '';
    return handleVoiceRequest(text, res);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ======================== API 404 CATCH-ALL ========================
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Endpoint API tidak ditemukan: ${req.method} ${req.originalUrl}` });
});

// ======================== API ERROR HANDLER (selalu JSON) ========================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith('/api/')) {
    const status = err?.status || err?.statusCode || 500;
    return res.status(status).json({
      error: err?.type === 'entity.parse.failed' ? 'Body request bukan JSON yang valid.' : err?.message || 'Terjadi kesalahan pada server',
    });
  }
  return next(err);
});

// ======================== FRONTEND SERVING ========================
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
