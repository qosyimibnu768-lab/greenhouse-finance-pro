import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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
const WORD_NUMBERS: Record<string, number> = {
  nol: 0,
  satu: 1,
  se: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
  sebelas: 11,
  belas: 10,
  puluh: 10,
  ratus: 100,
  seratus: 100,
  ribu: 1000,
  seribu: 1000,
  juta: 1000000,
  sejuta: 1000000,
  setengah: 0.5,
};

function parseIndonesianWordNumber(text: string): number {
  const words = text.toLowerCase().split(/[\s,]+/);
  let total = 0;
  let current = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];

    if (w === 'setengah' && words[i + 1] === 'juta') {
      current += 500000;
      i++;
      continue;
    }
    if (w === 'seratus') {
      current += 100;
      continue;
    }
    if (w === 'seribu') {
      current = (current === 0 ? 1 : current) * 1000;
      total += current;
      current = 0;
      continue;
    }
    if (w === 'sejuta' || (w === 'satu' && words[i + 1] === 'juta')) {
      current = (current === 0 ? 1 : current) * 1000000;
      total += current;
      current = 0;
      if (words[i + 1] === 'juta') i++;
      continue;
    }

    const n = WORD_NUMBERS[w];
    if (n !== undefined) {
      if (w === 'juta') {
        current = (current === 0 ? 1 : current) * 1000000;
        total += current;
        current = 0;
      } else if (w === 'ribu') {
        current = (current === 0 ? 1 : current) * 1000;
        total += current;
        current = 0;
      } else if (w === 'ratus') {
        current = (current === 0 ? 1 : current) * 100;
      } else if (w === 'puluh') {
        current = (current === 0 ? 1 : current) * 10;
      } else if (w === 'belas') {
        current = (current === 0 ? 1 : current) + 10;
      } else {
        current += n;
      }
    }
  }

  return total + current;
}

function extractAmountFromIndonesian(text: string): number {
  const normalized = text.toLowerCase().replace(/rp\.?/g, '').trim();

  const jtRegex = /(?:(\d+(?:[.,]\d+)?)|setengah)\s*(?:juta|jt)/i;
  const jtMatch = normalized.match(jtRegex);
  if (jtMatch) {
    if (jtMatch[0].includes('setengah')) return 500000;
    const val = parseFloat(jtMatch[1].replace(',', '.'));
    if (!isNaN(val)) return Math.round(val * 1000000);
  }

  const rbRegex = /(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k\b)/i;
  const rbMatch = normalized.match(rbRegex);
  if (rbMatch) {
    const val = parseFloat(rbMatch[1].replace(',', '.'));
    if (!isNaN(val)) return Math.round(val * 1000);
  }

  const digitsRegex = /\b(\d{1,3}(?:\.\d{3})+|\d{4,9})\b/;
  const digitsMatch = normalized.match(digitsRegex);
  if (digitsMatch) {
    const cleaned = digitsMatch[1].replace(/\./g, '');
    const val = parseInt(cleaned, 10);
    if (!isNaN(val) && val > 0) return val;
  }

  const wordsAmount = parseIndonesianWordNumber(normalized);
  if (wordsAmount > 0) return wordsAmount;

  const anyNum = normalized.match(/\b\d+\b/);
  if (anyNum) {
    const num = parseInt(anyNum[0], 10);
    if (num > 0) return num;
  }

  return 0;
}

function parseVoiceTransaction(rawText: string, currentBalance: number = 0) {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();

  const isIncome =
    lower.includes('masuk') ||
    lower.includes('pemasukan') ||
    lower.includes('penjualan') ||
    lower.includes('jual') ||
    lower.includes('laku') ||
    lower.includes('panen') ||
    lower.includes('terima') ||
    lower.includes('omzet') ||
    lower.includes('pelunasan') ||
    lower.includes('dapat duit') ||
    lower.includes('dapat uang');

  const type: 'pemasukan' | 'pengeluaran' = isIncome ? 'pemasukan' : 'pengeluaran';
  const amount = extractAmountFromIndonesian(lower);

  let category = 'Operasional Lainnya';
  let expenseGroup: 'operasional' | 'investasi' | undefined = undefined;

  if (type === 'pemasukan') {
    if (lower.includes('investasi') || lower.includes('modal')) {
      category = 'Modal Masuk';
    } else {
      category = 'Penjualan melon';
    }
  } else if (
    lower.includes('ab mix') || lower.includes('nutrisi') || lower.includes('pupuk') ||
    lower.includes('kalsium') || lower.includes('kalium') || lower.includes('npk') || lower.includes('magnesium')
  ) {
    category = 'AB Mix';
    expenseGroup = 'operasional';
  } else if (
    lower.includes('benih') || lower.includes('bibit') || lower.includes('biji') ||
    lower.includes('semai') || lower.includes('fujisawa') || lower.includes('inthanon') || lower.includes('golden emerald')
  ) {
    category = 'Benih';
    expenseGroup = 'operasional';
  } else if (
    lower.includes('pestisida') || lower.includes('fungisida') || lower.includes('insektisida') ||
    lower.includes('bakterisida') || lower.includes('obat')
  ) {
    category = 'Pestisida';
    expenseGroup = 'operasional';
  } else if (
    lower.includes('rockwool') || lower.includes('cocopeat') || lower.includes('sekam') || lower.includes('media tanam')
  ) {
    category = 'Media tanam';
    expenseGroup = 'operasional';
  } else if (lower.includes('listrik') || lower.includes('pln') || lower.includes('token')) {
    category = 'Listrik';
    expenseGroup = 'operasional';
  } else if (
    lower.includes('gaji') || lower.includes('upah') || lower.includes('harian') || lower.includes('tukang') ||
    lower.includes('karyawan') || lower.includes('tenaga') || lower.includes('payroll')
  ) {
    category = 'Tenaga kerja';
    expenseGroup = 'operasional';
  } else if (
    lower.includes('kemasan') || lower.includes('kardus') || lower.includes('box') ||
    lower.includes('netpot') || lower.includes('tali')
  ) {
    category = 'Kemasan';
    expenseGroup = 'operasional';
  } else if (
    lower.includes('bensin') || lower.includes('solar') || lower.includes('pickup') ||
    lower.includes('ongkir') || lower.includes('transport')
  ) {
    category = 'Transportasi';
    expenseGroup = 'operasional';
  } else if (
    lower.includes('bambu') || lower.includes('petung') || lower.includes('paranet') || lower.includes('uv') ||
    lower.includes('plastik') || lower.includes('tandon') || lower.includes('pompa') || lower.includes('pipa') ||
    lower.includes('gully') || lower.includes('instalasi') || lower.includes('aset') ||
    lower.includes('investasi') || lower.includes('pembangunan')
  ) {
    category = 'Pembangunan';
    expenseGroup = 'investasi';
  } else {
    category = 'Lainnya';
    expenseGroup = 'operasional';
  }

  let cycleId: string | undefined = undefined;
  const cycleMatch = lower.match(/(?:siklus|cycle|s)\s*(\d+)/i);
  if (cycleMatch) {
    const num = parseInt(cycleMatch[1], 10);
    cycleId = `S${String(num).padStart(3, '0')}`;
  } else if (lower.includes('siklus satu') || lower.includes('siklus pertama')) {
    cycleId = 'S001';
  } else if (lower.includes('siklus dua') || lower.includes('siklus kedua')) {
    cycleId = 'S002';
  } else if (lower.includes('siklus tiga') || lower.includes('siklus ketiga')) {
    cycleId = 'S003';
  }

  let tunnel = 'Kedua Tunnel';
  if (lower.includes('tunnel 1') || lower.includes('t1') || lower.includes('tunnel satu')) {
    tunnel = 'Tunnel 1';
  } else if (lower.includes('tunnel 2') || lower.includes('t2') || lower.includes('tunnel dua')) {
    tunnel = 'Tunnel 2';
  }

  let paymentMethod = 'Transfer Bank';
  if (lower.includes('cash') || lower.includes('tunai')) {
    paymentMethod = 'Tunai / Cash';
  } else if (lower.includes('qris')) {
    paymentMethod = 'QRIS';
  }

  const note = text;

  const formattedNominal = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);

  const newEstBalance = type === 'pemasukan' ? currentBalance + amount : currentBalance - amount;
  const formattedBalance = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(newEstBalance);

  let siriReply = '';
  if (amount > 0) {
    const cycleInfo = cycleId ? ` untuk ${cycleId}` : '';
    const tunnelInfo = tunnel !== 'Kedua Tunnel' ? ` di ${tunnel}` : '';
    siriReply = `Tercatat! ${type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'} ${formattedNominal} kategori ${category}${cycleInfo}${tunnelInfo}. Perkiraan saldo kas: ${formattedBalance}.`;
  } else {
    siriReply = `Saya mendengar "${text}", namun nominal rupiah belum terdeteksi. Silakan coba sebutkan nominalnya, contoh: "Pengeluaran 150 ribu beli AB Mix".`;
  }

  return {
    type,
    expenseGroup,
    amount,
    category,
    cycleId,
    tunnel,
    paymentMethod,
    note,
    rawText: text,
    confidence: amount > 0 ? 0.95 : 0.4,
    siriReply,
  };
}

function computeBalance(db: any): number {
  if (!db || !Array.isArray(db.transactions)) return 0;
  return db.transactions.reduce(
    (sum: number, t: any) => sum + (t.type === 'pemasukan' ? (t.amount || 0) : -(t.amount || 0)),
    0
  );
}

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

  const balance = computeBalance(db);
  const parsed = parseVoiceTransaction(text, balance);

  if (!parsed.amount || parsed.amount <= 0) {
    return res.status(400).json({
      success: false,
      reply: parsed.siriReply,
      error: 'Nominal rupiah tidak terdeteksi pada teks.',
      parsed,
    });
  }

  const now = new Date();
  const transaction = {
    id: `TRX-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`,
    date: now.toISOString().slice(0, 10),
    type: parsed.type,
    expenseGroup: parsed.type === 'pengeluaran' ? parsed.expenseGroup || 'operasional' : undefined,
    category: parsed.category,
    subcategory: parsed.note.slice(0, 80),
    amount: parsed.amount,
    paymentMethod: parsed.paymentMethod,
    cycleId: parsed.cycleId,
    tunnel: parsed.tunnel,
    note: parsed.note,
    createdAt: now.toISOString(),
    source: 'voice-shortcut',
  };

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
