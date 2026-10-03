import { GreenhouseDatabase, Transaction } from '../types';

export interface SyncResponse {
  success: boolean;
  message: string;
  error?: string;
  timestamp?: string;
}

const SHEETS_WEBHOOK_KEY = 'greenhouse_sheets_webhook_url';
const LAST_SYNC_KEY = 'greenhouse_last_sheets_sync';

export function getStoredSheetsWebhook(): string {
  try {
    return localStorage.getItem(SHEETS_WEBHOOK_KEY) || '';
  } catch {
    return '';
  }
}

export function saveStoredSheetsWebhook(url: string): void {
  try {
    localStorage.setItem(SHEETS_WEBHOOK_KEY, url.trim());
  } catch (e) {
    console.error('Failed saving sheets webhook URL to localStorage', e);
  }
}

export function getStoredLastSync(): string {
  try {
    return localStorage.getItem(LAST_SYNC_KEY) || '';
  } catch {
    return '';
  }
}

export function saveStoredLastSync(timeString: string): void {
  try {
    localStorage.setItem(LAST_SYNC_KEY, timeString);
  } catch (e) {
    console.error('Failed saving last sync to localStorage', e);
  }
}

/**
 * Send payload to Google Sheets via backend proxy or direct fetch
 */
export async function sendPayloadToSheets(webhookUrl: string, payload: any): Promise<SyncResponse> {
  if (!webhookUrl || !webhookUrl.trim()) {
    return { success: false, message: 'URL Webhook Google Sheets belum diisi' };
  }

  const cleanUrl = webhookUrl.trim();

  // Try backend proxy first (avoids CORS issues on Google Apps Script)
  try {
    const proxyRes = await fetch('/api/sync/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: cleanUrl, payload }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      saveStoredLastSync(new Date().toISOString());
      return {
        success: true,
        message: data.response?.message || 'Data berhasil dikirim ke Google Sheets',
        timestamp: new Date().toISOString(),
      };
    }
  } catch (proxyErr) {
    console.warn('Backend proxy sync notice, attempting direct request fallback:', proxyErr);
  }

  // Fallback: direct browser fetch with no-cors
  try {
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    saveStoredLastSync(new Date().toISOString());
    return {
      success: true,
      message: 'Permintaan terkirim ke Google Sheets (mode tanpa konfirmasi — silakan cek spreadsheet Anda)',
      timestamp: new Date().toISOString(),
    };
  } catch (directErr: any) {
    return {
      success: false,
      message: 'Gagal terhubung ke Google Sheets',
      error: directErr.message || 'Network error',
    };
  }
}

/**
 * Test connectivity with Google Sheets Apps Script
 */
export async function testSheetsConnection(webhookUrl: string): Promise<SyncResponse> {
  const payload = {
    action: 'test',
    message: 'Ping test dari Greenhouse Finance Pro',
    timestamp: new Date().toISOString(),
  };
  return sendPayloadToSheets(webhookUrl, payload);
}

/**
 * Auto-sync single transaction to Google Sheets
 */
export async function syncTransactionToSheets(
  webhookUrl: string,
  trx: Transaction
): Promise<SyncResponse> {
  const payload = {
    action: 'add_transaction',
    id: trx.id,
    date: trx.date,
    type: trx.type,
    expenseGroup: trx.expenseGroup || '-',
    category: trx.category,
    subcategory: trx.subcategory || '-',
    amount: trx.amount,
    paymentMethod: trx.paymentMethod,
    cycleId: trx.cycleId || '-',
    tunnel: trx.tunnel || 'Kedua Tunnel',
    note: trx.note || '',
    timestamp: trx.createdAt || new Date().toISOString(),
  };
  return sendPayloadToSheets(webhookUrl, payload);
}

/**
 * Re-sync ALL records (Transactions, Cycles, Harvests, Investments, Assets, Inventory)
 * to Google Sheets in bulk
 */
export async function syncAllDataToSheets(
  webhookUrl: string,
  db: GreenhouseDatabase
): Promise<SyncResponse> {
  const payload = {
    action: 'sync_all',
    timestamp: new Date().toISOString(),
    transactions: (db.transactions || []).map((t) => [
      t.id,
      t.date,
      t.type,
      t.expenseGroup || '-',
      t.category,
      t.subcategory || '-',
      t.amount,
      t.paymentMethod || 'Transfer Bank',
      t.cycleId || '-',
      t.tunnel || 'Kedua Tunnel',
      t.note || '',
      t.createdAt || new Date().toISOString(),
    ]),
    cycles: (db.cycles || []).map((c) => [
      c.id,
      c.name,
      c.melonVariety,
      c.tunnel,
      c.startDate,
      c.plantingDate,
      c.harvestTargetDate,
      c.actualHarvestDate || '-',
      c.plantCount,
      c.livePlants,
      c.deadPlants,
      c.status,
      c.notes || '',
    ]),
    harvests: (db.harvests || []).map((h) => [
      h.id,
      h.date,
      h.cycleId,
      h.tunnel,
      h.totalWeightKg,
      h.gradeAKg,
      h.gradeBKg,
      h.gradeCKg,
      h.pricePerKg,
      h.totalRevenue,
      h.buyer || 'Umum',
      h.paymentStatus,
      h.notes || '',
    ]),
    investments: (db.investments || []).map((i) => [
      i.id,
      i.date,
      i.category,
      i.itemName,
      i.quantity,
      i.unit,
      i.unitPrice,
      i.totalAmount,
      i.supplier || '-',
      i.tunnel,
      i.notes || '',
    ]),
    assets: (db.assets || []).map((a) => [
      a.id,
      a.name,
      a.category,
      a.purchaseDate,
      a.purchasePrice,
      a.quantity,
      a.condition,
      a.economicLifeYears,
      a.location,
      a.notes || '',
    ]),
    inventory: (db.inventory || []).map((item) => [
      item.id,
      item.name,
      item.category,
      item.unit,
      item.initialStock,
      item.incomingStock,
      item.outgoingStock,
      item.currentStock,
      item.minStock,
      item.avgPrice,
      item.lastUpdated,
    ]),
  };

  return sendPayloadToSheets(webhookUrl, payload);
}
