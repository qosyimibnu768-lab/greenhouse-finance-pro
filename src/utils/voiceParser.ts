/**
 * Natural Language Voice & Text Parser for Greenhouse Melon Finance
 * Optimized for Siri / iPhone Shortcuts & Web Speech Recognition (Indonesian)
 */

import { PaymentMethod } from '../types';

export interface ParsedVoiceTransaction {
  type: 'pemasukan' | 'pengeluaran';
  expenseGroup?: 'operasional' | 'investasi';
  amount: number;
  category: string;
  cycleId?: string;
  tunnel: string;
  paymentMethod: PaymentMethod;
  note: string;
  rawText: string;
  confidence: number;
  siriReply: string;
}

// Word map for Indonesian number words
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

/**
 * Extracts a numeric rupiah amount from natural language Indonesian string
 */
export function extractAmountFromIndonesian(text: string): number {
  const normalized = text
    .toLowerCase()
    .replace(/rp\.?/g, '')
    .trim();

  // Pattern 1: Standalone Indonesian Million expressions, e.g. "1,5 juta", "1.5 juta", "2 juta", "1,5jt", "2jt", "setengah juta"
  const jtRegex = /(?:(\d+(?:[.,]\d+)?)|setengah)\s*(?:juta|jt)/i;
  const jtMatch = normalized.match(jtRegex);
  if (jtMatch) {
    if (jtMatch[0].includes('setengah')) {
      return 500000;
    }
    const val = parseFloat(jtMatch[1].replace(',', '.'));
    if (!isNaN(val)) return Math.round(val * 1000000);
  }

  // Pattern 2: Thousand expressions, e.g. "250 ribu", "250rb", "250k", "50 ribu"
  const rbRegex = /(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k\b)/i;
  const rbMatch = normalized.match(rbRegex);
  if (rbMatch) {
    const val = parseFloat(rbMatch[1].replace(',', '.'));
    if (!isNaN(val)) return Math.round(val * 1000);
  }

  // Pattern 3: Standard numeric dots, e.g. "250.000", "1.500.000", or pure digits "250000"
  const digitsRegex = /\b(\d{1,3}(?:\.\d{3})+|\d{4,9})\b/;
  const digitsMatch = normalized.match(digitsRegex);
  if (digitsMatch) {
    const cleaned = digitsMatch[1].replace(/\./g, '');
    const val = parseInt(cleaned, 10);
    if (!isNaN(val) && val > 0) return val;
  }

  // Pattern 4: Spoken words, e.g. "dua ratus lima puluh ribu", "seratus ribu", "tiga puluh lima ribu"
  const wordsAmount = parseIndonesianWordNumber(normalized);
  if (wordsAmount > 0) {
    return wordsAmount;
  }

  // Fallback: any remaining standalone number
  const anyNum = normalized.match(/\b\d+\b/);
  if (anyNum) {
    const num = parseInt(anyNum[0], 10);
    if (num > 0) return num;
  }

  return 0;
}

/**
 * Parses written Indonesian numbers into integer
 */
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

/**
 * Parses Indonesian voice command / dictated text into full structured transaction
 */
export function parseVoiceTransaction(rawText: string, currentBalance: number = 0): ParsedVoiceTransaction {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();

  // 1. DETERMINE TYPE
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

  // 2. EXTRACT AMOUNT
  const amount = extractAmountFromIndonesian(lower);

  // 3. DETERMINE CATEGORY & EXPENSE GROUP
  let category = 'Operasional Lainnya';
  let expenseGroup: 'operasional' | 'investasi' | undefined = undefined;

  if (type === 'pemasukan') {
    if (lower.includes('grade a') || lower.includes('super')) {
      category = 'Penjualan melon';
    } else if (lower.includes('grade b') || lower.includes('grade c') || lower.includes('afkir')) {
      category = 'Penjualan melon';
    } else if (lower.includes('investasi') || lower.includes('modal')) {
      category = 'Modal Masuk';
    } else {
      category = 'Penjualan melon';
    }
  } else {
    // Pengeluaran Categories
    if (
      lower.includes('ab mix') ||
      lower.includes('nutrisi') ||
      lower.includes('pupuk') ||
      lower.includes('kalsium') ||
      lower.includes('kalium') ||
      lower.includes('npk') ||
      lower.includes('magnesium')
    ) {
      category = 'AB Mix';
      expenseGroup = 'operasional';
    } else if (
      lower.includes('benih') ||
      lower.includes('bibit') ||
      lower.includes('biji') ||
      lower.includes('semai') ||
      lower.includes('fujisawa') ||
      lower.includes('inthanon') ||
      lower.includes('golden emerald')
    ) {
      category = 'Benih';
      expenseGroup = 'operasional';
    } else if (
      lower.includes('pestisida') ||
      lower.includes('fungisida') ||
      lower.includes('insektisida') ||
      lower.includes('bakterisida') ||
      lower.includes('obat')
    ) {
      category = 'Pestisida';
      expenseGroup = 'operasional';
    } else if (
      lower.includes('rockwool') ||
      lower.includes('cocopeat') ||
      lower.includes('sekam') ||
      lower.includes('media tanam')
    ) {
      category = 'Media tanam';
      expenseGroup = 'operasional';
    } else if (
      lower.includes('listrik') ||
      lower.includes('pln') ||
      lower.includes('token')
    ) {
      category = 'Listrik';
      expenseGroup = 'operasional';
    } else if (
      lower.includes('gaji') ||
      lower.includes('upah') ||
      lower.includes('harian') ||
      lower.includes('tukang') ||
      lower.includes('karyawan') ||
      lower.includes('tenaga') ||
      lower.includes('payroll')
    ) {
      category = 'Tenaga kerja';
      expenseGroup = 'operasional';
    } else if (
      lower.includes('kemasan') ||
      lower.includes('kardus') ||
      lower.includes('box') ||
      lower.includes('netpot') ||
      lower.includes('tali')
    ) {
      category = 'Kemasan';
      expenseGroup = 'operasional';
    } else if (
      lower.includes('bensin') ||
      lower.includes('solar') ||
      lower.includes('pickup') ||
      lower.includes('ongkir') ||
      lower.includes('transport')
    ) {
      category = 'Transportasi';
      expenseGroup = 'operasional';
    } else if (
      lower.includes('bambu') ||
      lower.includes('petung') ||
      lower.includes('paranet') ||
      lower.includes('uv') ||
      lower.includes('plastik') ||
      lower.includes('tandon') ||
      lower.includes('pompa') ||
      lower.includes('pipa') ||
      lower.includes('gully') ||
      lower.includes('instalasi') ||
      lower.includes('aset') ||
      lower.includes('investasi') ||
      lower.includes('pembangunan')
    ) {
      category = 'Pembangunan';
      expenseGroup = 'investasi';
    } else {
      category = 'Lainnya';
      expenseGroup = 'operasional';
    }
  }

  // 4. DETECT CYCLE
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

  // 5. DETECT UNIT GREENHOUSE
  let tunnel = 'Semua Greenhouse';
  if (lower.includes('greenhouse 1') || lower.includes('tunnel 1') || lower.includes('t1') || lower.includes('tunnel satu') || lower.includes('greenhouse satu')) {
    tunnel = 'Greenhouse 1';
  } else if (lower.includes('greenhouse 2') || lower.includes('tunnel 2') || lower.includes('t2') || lower.includes('tunnel dua') || lower.includes('greenhouse dua')) {
    tunnel = 'Greenhouse 2';
  } else if (lower.includes('greenhouse 3') || lower.includes('tunnel 3') || lower.includes('t3')) {
    tunnel = 'Greenhouse 3';
  }

  // 6. DETECT PAYMENT METHOD
  let paymentMethod: PaymentMethod = 'Transfer Bank';
  if (lower.includes('cash') || lower.includes('tunai')) {
    paymentMethod = 'Tunai / Cash';
  } else if (lower.includes('qris')) {
    paymentMethod = 'QRIS';
  }

  // 7. CLEAN NOTE
  const note = text;

  // 8. GENERATE SIRI SPOKEN CONFIRMATION
  const formattedNominal = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);

  const newEstBalance =
    type === 'pemasukan' ? currentBalance + amount : currentBalance - amount;
  const formattedBalance = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(newEstBalance);

  let siriReply = '';
  if (amount > 0) {
    const cycleInfo = cycleId ? ` untuk ${cycleId}` : '';
    const tunnelInfo = tunnel !== 'Semua Greenhouse' ? ` di ${tunnel}` : '';
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
