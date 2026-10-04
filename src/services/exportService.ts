import { GreenhouseDatabase, Transaction, HarvestRecord, InventoryItem } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportTransactionsCSV(transactions: Transaction[]) {
  const headers = ['ID', 'Tanggal', 'Jenis', 'Kelompok', 'Kategori', 'Subkategori', 'Nominal (Rp)', 'Metode Pembayaran', 'Siklus', 'Greenhouse', 'Keterangan'];
  const rows = transactions.map((t) => [
    `"${t.id}"`,
    `"${t.date}"`,
    `"${t.type}"`,
    `"${t.expenseGroup || '-'}"`,
    `"${t.category}"`,
    `"${t.subcategory || '-'}"`,
    t.amount,
    `"${t.paymentMethod}"`,
    `"${t.cycleId || '-'}"`,
    `"${t.tunnel}"`,
    `"${(t.note || '').replace(/"/g, '""')}"`,
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csvContent, `Transaksi_Greenhouse_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}

export function exportHarvestCSV(harvests: HarvestRecord[]) {
  const headers = ['ID', 'Tanggal', 'Siklus', 'Greenhouse', 'Total Kg', 'Grade A (Kg)', 'Grade B (Kg)', 'Grade C (Kg)', 'Harga/Kg (Rp)', 'Total Omzet (Rp)', 'Pembeli', 'Status Pembayaran', 'Catatan'];
  const rows = harvests.map((h) => [
    `"${h.id}"`,
    `"${h.date}"`,
    `"${h.cycleId}"`,
    `"${h.tunnel}"`,
    h.totalWeightKg,
    h.gradeAKg,
    h.gradeBKg,
    h.gradeCKg,
    h.pricePerKg,
    h.totalRevenue,
    `"${h.buyer}"`,
    `"${h.paymentStatus}"`,
    `"${(h.notes || '').replace(/"/g, '""')}"`,
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csvContent, `Panen_Penjualan_Greenhouse_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}

export function exportInventoryCSV(items: InventoryItem[]) {
  const headers = ['ID', 'Nama Barang', 'Kategori', 'Satuan', 'Stok Awal', 'Barang Masuk', 'Barang Keluar', 'Stok Akhir', 'Minimum Stok', 'Harga Rata-rata (Rp)', 'Terakhir Update'];
  const rows = items.map((i) => [
    `"${i.id}"`,
    `"${i.name}"`,
    `"${i.category}"`,
    `"${i.unit}"`,
    i.initialStock,
    i.incomingStock,
    i.outgoingStock,
    i.currentStock,
    i.minStock,
    i.avgPrice,
    `"${i.lastUpdated}"`,
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csvContent, `Stok_Bahan_Greenhouse_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}

export function exportFullBackupJSON(db: GreenhouseDatabase) {
  const jsonContent = JSON.stringify(db, null, 2);
  downloadFile(jsonContent, `Greenhouse_Finance_Backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
}
