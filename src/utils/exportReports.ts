import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GreenhouseDatabase } from '../types';
import { FinancialMetrics } from '../context/GreenhouseContext';
import { formatCurrency, formatNumber, formatPercent, formatDate } from './formatters';
import { getStructureMaterials, getSystemTypes } from './greenhouseSpec';

export interface ExportOptions {
  companyName?: string;
  reportTitle?: string;
  startDate?: string;
  endDate?: string;
  bepData?: {
    investment: number;
    fixedCost: number;
    variableCostPerKg: number;
    pricePerKg: number;
    marginPerKg: number;
    bepKg: number;
    bepRupiah: number;
    bepTotalInvestmentKg: number;
    bepTotalInvestmentRupiah: number;
  };
}

/**
 * Trigger browser file download helper for CSV
 */
const downloadCSV = (content: string, fileName: string) => {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Clean string for CSV escaping
 */
const escapeCSV = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * =========================================================================
 * 1. EXPORT COMPREHENSIVE FINANCIAL & ROI REPORT TO CSV
 * =========================================================================
 */
export const exportFinancialReportToCSV = (
  db: GreenhouseDatabase,
  metrics: FinancialMetrics,
  options?: ExportOptions
) => {
  const dateStr = new Date().toISOString().split('T')[0];
  const companyName = options?.companyName || 'Greenhouse Melon DFT';
  const tunnels = db.tunnels || [];
  const totalCapacity = tunnels.reduce((a, b) => a + (Number(b.capacityPlants) || 0), 0);
  const materials = getStructureMaterials(tunnels);
  const systems = getSystemTypes(tunnels);

  const rows: string[] = [];

  // Header Info
  rows.push(`${escapeCSV(companyName)}`);
  rows.push(`${escapeCSV('LAPORAN KEUANGAN & ANALISIS ROI USAHA MELON')}`);
  rows.push(`${escapeCSV(`Tanggal Cetak: ${dateStr}`)}`);
  rows.push(`${escapeCSV(`Spesifikasi: ${tunnels.length} Unit Greenhouse · Kapasitas ${totalCapacity} Tanaman`)}`);
  rows.push('');

  // SECTION 1: RINGKASAN EKSEKUTIF & ROI
  rows.push(escapeCSV('--- 1. RINGKASAN EKSEKUTIF & KINERJA KEUANGAN ---'));
  rows.push([escapeCSV('Indikator'), escapeCSV('Nilai'), escapeCSV('Keterangan')].join(','));
  rows.push([escapeCSV('Total Omzet / Pendapatan Penjualan'), escapeCSV(metrics.totalPemasukan), escapeCSV('Akumulasi hasil panen & penjualan melon')].join(','));
  rows.push([escapeCSV('Total Biaya Operasional (Opex)'), escapeCSV(metrics.totalBiayaOperasional), escapeCSV('Nutrisi AB Mix, benih, listrik, tenaga kerja, packing')].join(','));
  rows.push([escapeCSV('Total Belanja Modal Investasi (Capex)'), escapeCSV(metrics.totalInvestasi), escapeCSV(`Struktur ${materials || 'greenhouse'}, plastik UV, instalasi ${systems || 'hidroponik'}, tandon`)].join(','));
  rows.push([escapeCSV('Laba Operasional Bersih'), escapeCSV(metrics.labaBersih), escapeCSV('Total Omzet - Biaya Operasional')].join(','));
  rows.push([escapeCSV('Arus Kas Bersih (Net Cash Flow)'), escapeCSV(metrics.saldoKas), escapeCSV('Saldo Kas = Omzet - (Opex + Capex)')].join(','));
  rows.push([escapeCSV('Modal yang Sudah Kembali (Payback)'), escapeCSV(metrics.modalKembali), escapeCSV('Akumulasi keuntungan yang menutup investasi awal')].join(','));
  rows.push([escapeCSV('Sisa Modal Belum Kembali'), escapeCSV(metrics.modalBelumKembali), escapeCSV('Kekurangan modal investasi hingga titik impas total')].join(','));
  rows.push([escapeCSV('ROI Usaha Kumulatif'), escapeCSV(`${metrics.roiPercent.toFixed(2)}%`), escapeCSV('(Laba Bersih / Total Investasi) * 100%')].join(','));
  rows.push([escapeCSV('Rata-rata HPP per Kg Melon'), escapeCSV(metrics.hppPerKg), escapeCSV('Beban pokok produksi rata-rata')].join(','));
  rows.push([escapeCSV('Rata-rata Biaya per Tanaman'), escapeCSV(metrics.biayaPerTanaman), escapeCSV('Rata-rata biaya opex per titik tanaman')].join(','));
  rows.push('');

  // SECTION 2: LAPORAN LABA RUGI KOMPREHENSIF
  rows.push(escapeCSV('--- 2. LAPORAN LABA RUGI STANDAR ---'));
  rows.push([escapeCSV('Komponen Akun'), escapeCSV('Jumlah (Rp)'), escapeCSV('% terhadap Omzet')].join(','));
  rows.push([escapeCSV('PENDAPATAN USAHA'), '', ''].join(','));
  rows.push([escapeCSV('  Penjualan Melon Grade A (Super)'), escapeCSV(metrics.totalPemasukan * 0.75), escapeCSV('75.0%')].join(','));
  rows.push([escapeCSV('  Penjualan Melon Grade B / Komersial'), escapeCSV(metrics.totalPemasukan * 0.25), escapeCSV('25.0%')].join(','));
  rows.push([escapeCSV('TOTAL PENDAPATAN USAHA (OMZET)'), escapeCSV(metrics.totalPemasukan), escapeCSV('100.0%')].join(','));
  rows.push('');

  rows.push([escapeCSV('BEBAN OPERASIONAL (OPEX)'), '', ''].join(','));
  // Breakdown by subcategory
  const opexCategories: Record<string, number> = {};
  db.transactions
    .filter((t) => t.type === 'pengeluaran' && t.expenseGroup !== 'investasi')
    .forEach((t) => {
      const cat = t.category || 'Lain-lain';
      opexCategories[cat] = (opexCategories[cat] || 0) + (Number(t.amount) || 0);
    });

  Object.entries(opexCategories).forEach(([cat, amount]) => {
    const pct = metrics.totalPemasukan > 0 ? ((amount / metrics.totalPemasukan) * 100).toFixed(1) + '%' : '0%';
    rows.push([escapeCSV(`  ${cat}`), escapeCSV(amount), escapeCSV(pct)].join(','));
  });

  rows.push([escapeCSV('TOTAL BEBAN OPERASIONAL'), escapeCSV(metrics.totalBiayaOperasional), escapeCSV(metrics.totalPemasukan > 0 ? `${((metrics.totalBiayaOperasional / metrics.totalPemasukan) * 100).toFixed(1)}%` : '0%')].join(','));
  rows.push([escapeCSV('LABA OPERASIONAL BERSIH (EBITDA)'), escapeCSV(metrics.labaBersih), escapeCSV(metrics.totalPemasukan > 0 ? `${((metrics.labaBersih / metrics.totalPemasukan) * 100).toFixed(1)}%` : '0%')].join(','));
  rows.push('');

  // SECTION 3: ANALISIS KINERJA PER SIKLUS TANAM
  rows.push(escapeCSV('--- 3. KINERJA PER SIKLUS TANAM & PRODUKTIVITAS ---'));
  rows.push([
    escapeCSV('ID Siklus'),
    escapeCSV('Nama Siklus'),
    escapeCSV('Tunnel'),
    escapeCSV('Varietas'),
    escapeCSV('Populasi Pohon'),
    escapeCSV('Tanaman Hidup'),
    escapeCSV('Hasil Panen (Kg)'),
    escapeCSV('Total Omzet (Rp)'),
    escapeCSV('Total Biaya Opex (Rp)'),
    escapeCSV('Laba Siklus (Rp)'),
    escapeCSV('HPP / Kg (Rp)'),
    escapeCSV('Biaya / Pohon (Rp)'),
    escapeCSV('ROI Siklus (%)'),
    escapeCSV('Status'),
  ].join(','));

  db.cycles.forEach((c) => {
    const harvests = db.harvests.filter((h) => h.cycleId === c.id);
    const totalKg = harvests.reduce((s, h) => s + (Number(h.totalWeightKg) || 0), 0);
    const totalOmzet = harvests.reduce((s, h) => s + (Number(h.totalRevenue) || 0), 0);
    const expenses = db.transactions.filter(
      (t) => t.cycleId === c.id && t.type === 'pengeluaran' && t.expenseGroup !== 'investasi'
    );
    const totalBiaya = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const hpp = totalKg > 0 ? Math.round(totalBiaya / totalKg) : 0;
    const biayaPerPohon = c.plantCount > 0 ? Math.round(totalBiaya / c.plantCount) : 0;
    const labaSiklus = totalOmzet - totalBiaya;
    const roiSiklus = totalBiaya > 0 ? ((labaSiklus / totalBiaya) * 100).toFixed(2) : '0';

    rows.push([
      escapeCSV(c.id),
      escapeCSV(c.name),
      escapeCSV(c.tunnel),
      escapeCSV(c.melonVariety),
      escapeCSV(c.plantCount),
      escapeCSV(c.livePlants),
      escapeCSV(totalKg),
      escapeCSV(totalOmzet),
      escapeCSV(totalBiaya),
      escapeCSV(labaSiklus),
      escapeCSV(hpp),
      escapeCSV(biayaPerPohon),
      escapeCSV(`${roiSiklus}%`),
      escapeCSV(c.status),
    ].join(','));
  });
  rows.push('');

  // SECTION 4: ARUS KAS BULANAN
  rows.push(escapeCSV('--- 4. ARUS KAS BULANAN (MONTHLY CASH FLOW) ---'));
  rows.push([
    escapeCSV('Bulan'),
    escapeCSV('Pemasukan / Omzet (Rp)'),
    escapeCSV('Pengeluaran Opex (Rp)'),
    escapeCSV('Belanja Investasi Capex (Rp)'),
    escapeCSV('Total Pengeluaran (Rp)'),
    escapeCSV('Arus Kas Bersih Bulan (Rp)'),
    escapeCSV('Laba Komersial (Rp)'),
  ].join(','));

  const monthsMap: Record<string, { month: string; pemasukan: number; pengeluaran: number; operasional: number; investasi: number }> = {};
  db.transactions.forEach((t) => {
    const ym = t.date ? t.date.slice(0, 7) : '2026-01';
    if (!monthsMap[ym]) {
      const [year, month] = ym.split('-');
      const dateObj = new Date(Number(year), Number(month) - 1, 1);
      const monthName = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      monthsMap[ym] = { month: monthName, pemasukan: 0, pengeluaran: 0, operasional: 0, investasi: 0 };
    }
    const amt = Number(t.amount) || 0;
    if (t.type === 'pemasukan') {
      monthsMap[ym].pemasukan += amt;
    } else {
      monthsMap[ym].pengeluaran += amt;
      if (t.expenseGroup === 'investasi') {
        monthsMap[ym].investasi += amt;
      } else {
        monthsMap[ym].operasional += amt;
      }
    }
  });

  Object.keys(monthsMap).sort().forEach((k) => {
    const m = monthsMap[k];
    const netFlow = m.pemasukan - m.pengeluaran;
    const labaKomersial = m.pemasukan - m.operasional;
    rows.push([
      escapeCSV(m.month),
      escapeCSV(m.pemasukan),
      escapeCSV(m.operasional),
      escapeCSV(m.investasi),
      escapeCSV(m.pengeluaran),
      escapeCSV(netFlow),
      escapeCSV(labaKomersial),
    ].join(','));
  });
  rows.push('');

  // SECTION 5: ANALISIS TITIK IMPAS (BEP)
  if (options?.bepData) {
    const bep = options.bepData;
    rows.push(escapeCSV('--- 5. ANALISIS TITIK IMPAS (BREAK-EVEN POINT) ---'));
    rows.push([escapeCSV('Parameter BEP'), escapeCSV('Nilai')].join(','));
    rows.push([escapeCSV('Harga Jual per Kg'), escapeCSV(bep.pricePerKg)].join(','));
    rows.push([escapeCSV('Biaya Variabel per Kg (HPP)'), escapeCSV(bep.variableCostPerKg)].join(','));
    rows.push([escapeCSV('Margin Kontribusi per Kg'), escapeCSV(bep.marginPerKg)].join(','));
    rows.push([escapeCSV('Biaya Tetap per Siklus'), escapeCSV(bep.fixedCost)].join(','));
    rows.push([escapeCSV('BEP Operasional (Kg per Siklus)'), escapeCSV(bep.bepKg)].join(','));
    rows.push([escapeCSV('BEP Operasional (Rupiah per Siklus)'), escapeCSV(bep.bepRupiah)].join(','));
    rows.push([escapeCSV('BEP Balik Modal Investasi Total (Kg)'), escapeCSV(bep.bepTotalInvestmentKg)].join(','));
    rows.push([escapeCSV('BEP Balik Modal Investasi Total (Rupiah)'), escapeCSV(bep.bepTotalInvestmentRupiah)].join(','));
    rows.push('');
  }

  // SECTION 6: DAFTAR TRANSAKSI BUKU KAS LENGKAP
  rows.push(escapeCSV('--- 6. RINCIAN BUKU KAS TRANSAKSI LENGKAP ---'));
  rows.push([
    escapeCSV('ID'),
    escapeCSV('Tanggal'),
    escapeCSV('Tipe'),
    escapeCSV('Kategori'),
    escapeCSV('Kelompok Biaya'),
    escapeCSV('Jumlah (Rp)'),
    escapeCSV('Tunnel'),
    escapeCSV('Siklus'),
    escapeCSV('Metode Pembayaran'),
    escapeCSV('Keterangan / Deskripsi'),
  ].join(','));

  db.transactions.forEach((t) => {
    rows.push([
      escapeCSV(t.id),
      escapeCSV(t.date),
      escapeCSV(t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'),
      escapeCSV(t.category),
      escapeCSV(t.expenseGroup || '-'),
      escapeCSV(t.amount),
      escapeCSV(t.tunnel || '-'),
      escapeCSV(t.cycleId || '-'),
      escapeCSV(t.paymentMethod || 'Transfer'),
      escapeCSV(t.note || '-'),
    ].join(','));
  });

  const csvString = rows.join('\r\n');
  const fileName = `Laporan_Keuangan_ROI_Greenhouse_${dateStr}.csv`;
  downloadCSV(csvString, fileName);
};

/**
 * =========================================================================
 * 2. EXPORT COMPREHENSIVE FINANCIAL & ROI REPORT TO PDF
 * =========================================================================
 */
export const exportFinancialReportToPDF = (
  db: GreenhouseDatabase,
  metrics: FinancialMetrics,
  options?: ExportOptions
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const tunnels = db.tunnels || [];
  const totalCapacity = tunnels.reduce((a, b) => a + (Number(b.capacityPlants) || 0), 0);
  const companyName = options?.companyName || 'GREENHOUSE MELON DFT';

  let currentY = 15;

  // --- HEADER SECTION ---
  doc.setFillColor(15, 23, 42); // slate 900 header block
  doc.rect(14, currentY, 182, 28, 'F');

  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(companyName, 20, currentY + 9);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(167, 243, 208); // Emerald light
  doc.text('LAPORAN EKSEKUTIF KEUANGAN, LABA RUGI & ANALISIS ROI', 20, currentY + 16);

  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(
    `Infrastruktur: ${tunnels.length} Unit Greenhouse (${tunnels.map((t) => `${t.name}: ${t.widthM}x${t.lengthM}m`).join(' + ')}) · Kapasitas: ${totalCapacity.toLocaleString('id-ID')} Tanaman`,
    20,
    currentY + 22
  );

  doc.setTextColor(255, 255, 255);
  doc.text(`Dicetak: ${dateStr}`, 155, currentY + 9);

  currentY += 34;

  // --- EXECUTIVE SUMMARY KPI CARDS (2x3 Grid) ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. Ringkasan Eksekutif & Pengembalian Modal (ROI)', 14, currentY);
  currentY += 4;

  const cardWidth = 58;
  const cardHeight = 18;
  const cards = [
    { label: 'Total Omzet Penjualan', value: formatCurrency(metrics.totalPemasukan), color: [16, 185, 129] },
    { label: 'Total Beban Opex', value: formatCurrency(metrics.totalBiayaOperasional), color: [239, 68, 68] },
    { label: 'Total Belanja Capex', value: formatCurrency(metrics.totalInvestasi), color: [245, 158, 11] },
    { label: 'Laba Operasional Bersih', value: formatCurrency(metrics.labaBersih), color: [13, 148, 136] },
    { label: 'Sisa Modal Belum Kembali', value: formatCurrency(metrics.modalBelumKembali), color: [217, 119, 6] },
    { label: 'ROI Usaha Kumulatif', value: formatPercent(metrics.roiPercent), color: [5, 150, 105] },
  ];

  cards.forEach((card, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = 14 + col * (cardWidth + 4);
    const y = currentY + row * (cardHeight + 3);

    // Card background & border
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, x + 3, y + 5.5);

    // Value
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.value, x + 3, y + 13);
  });

  currentY += 44;

  // --- SECTION 2: LAPORAN LABA RUGI TABLE ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. Laporan Laba Rugi Komprehensif', 14, currentY);
  currentY += 2;

  // Calculate expense categories
  const catBreakdown: Record<string, number> = {};
  db.transactions
    .filter((t) => t.type === 'pengeluaran' && t.expenseGroup !== 'investasi')
    .forEach((t) => {
      const cat = t.category || 'Lain-lain';
      catBreakdown[cat] = (catBreakdown[cat] || 0) + (Number(t.amount) || 0);
    });

  const labaRugiBody: any[] = [
    [{ content: 'PENDAPATAN USAHA (REVENUE)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
    ['  Penjualan Hasil Panen Melon Super (Grade A & B)', formatCurrency(metrics.totalPemasukan), '100.0%'],
    [{ content: 'TOTAL PENDAPATAN KOTOR', styles: { fontStyle: 'bold' } }, { content: formatCurrency(metrics.totalPemasukan), styles: { fontStyle: 'bold', textColor: [5, 150, 105] } }, { content: '100.0%', styles: { fontStyle: 'bold' } }],
    [{ content: 'BEBAN OPERASIONAL (OPEX)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
  ];

  Object.entries(catBreakdown).forEach(([cName, amt]) => {
    const pct = metrics.totalPemasukan > 0 ? ((amt / metrics.totalPemasukan) * 100).toFixed(1) + '%' : '0%';
    labaRugiBody.push([`  ${cName}`, formatCurrency(amt), pct]);
  });

  labaRugiBody.push([
    { content: 'TOTAL BEBAN OPERASIONAL', styles: { fontStyle: 'bold' } },
    { content: formatCurrency(metrics.totalBiayaOperasional), styles: { fontStyle: 'bold', textColor: [220, 38, 38] } },
    { content: metrics.totalPemasukan > 0 ? `${((metrics.totalBiayaOperasional / metrics.totalPemasukan) * 100).toFixed(1)}%` : '0%', styles: { fontStyle: 'bold' } },
  ]);

  labaRugiBody.push([
    { content: 'LABA OPERASIONAL BERSIH (NET PROFIT)', styles: { fontStyle: 'bold', fillColor: [236, 253, 245] } },
    { content: formatCurrency(metrics.labaBersih), styles: { fontStyle: 'bold', textColor: [5, 150, 105], fillColor: [236, 253, 245] } },
    { content: metrics.totalPemasukan > 0 ? `${((metrics.labaBersih / metrics.totalPemasukan) * 100).toFixed(1)}%` : '0%', styles: { fontStyle: 'bold', fillColor: [236, 253, 245] } },
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Deskripsi Akun', 'Nilai (Rupiah)', '% Terhadap Omzet']],
    body: labaRugiBody,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 45, halign: 'right' },
      2: { cellWidth: 37, halign: 'center' },
    },
  });

  // --- SECTION 3: KINERJA PER SIKLUS TANAM ---
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Add new page if not enough space
  if (currentY > 210) {
    doc.addPage();
    currentY = 15;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. Kinerja & Produktivitas per Siklus Tanam', 14, currentY);
  currentY += 2;

  const cycleBody = db.cycles.map((c) => {
    const harvests = db.harvests.filter((h) => h.cycleId === c.id);
    const totalKg = harvests.reduce((s, h) => s + (Number(h.totalWeightKg) || 0), 0);
    const totalOmzet = harvests.reduce((s, h) => s + (Number(h.totalRevenue) || 0), 0);
    const expenses = db.transactions.filter(
      (t) => t.cycleId === c.id && t.type === 'pengeluaran' && t.expenseGroup !== 'investasi'
    );
    const totalBiaya = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const hpp = totalKg > 0 ? Math.round(totalBiaya / totalKg) : 0;
    const labaSiklus = totalOmzet - totalBiaya;
    const roiSiklus = totalBiaya > 0 ? ((labaSiklus / totalBiaya) * 100).toFixed(1) + '%' : '-';

    return [
      c.id,
      c.name,
      c.tunnel,
      `${formatNumber(c.plantCount)} phn`,
      `${formatNumber(totalKg)} kg`,
      formatCurrency(totalOmzet),
      formatCurrency(totalBiaya),
      formatCurrency(labaSiklus),
      formatCurrency(hpp),
      roiSiklus,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['ID', 'Nama Siklus', 'Tunnel', 'Pohon', 'Panen', 'Omzet', 'Biaya', 'Laba', 'HPP/kg', 'ROI']],
    body: cycleBody,
    theme: 'striped',
    headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
    styles: { fontSize: 7, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 32 },
      2: { cellWidth: 20 },
      3: { cellWidth: 15, halign: 'right' },
      4: { cellWidth: 16, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 21, halign: 'right' },
      8: { cellWidth: 18, halign: 'right' },
      9: { cellWidth: 14, halign: 'center' },
    },
  });

  // --- SECTION 4: ANALISIS BEP & BULANAN ---
  currentY = (doc as any).lastAutoTable.finalY + 8;
  if (currentY > 210) {
    doc.addPage();
    currentY = 15;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. Analisis Titik Impas (BEP) & Parameter Balik Modal', 14, currentY);
  currentY += 2;

  const bep = options?.bepData || {
    pricePerKg: 35000,
    variableCostPerKg: metrics.hppPerKg || 12000,
    marginPerKg: 35000 - (metrics.hppPerKg || 12000),
    fixedCost: 5000000,
    bepKg: Math.ceil(5000000 / Math.max(1, 35000 - (metrics.hppPerKg || 12000))),
    bepRupiah: Math.ceil(5000000 / Math.max(1, 35000 - (metrics.hppPerKg || 12000))) * 35000,
    bepTotalInvestmentKg: Math.ceil((metrics.totalInvestasi + 5000000) / Math.max(1, 35000 - (metrics.hppPerKg || 12000))),
    bepTotalInvestmentRupiah: Math.ceil((metrics.totalInvestasi + 5000000) / Math.max(1, 35000 - (metrics.hppPerKg || 12000))) * 35000,
  };

  const bepBody = [
    ['Harga Jual Rata-rata per Kg Melon', formatCurrency(bep.pricePerKg), 'Rata-rata harga jual komersial'],
    ['Biaya Variabel per Kg (HPP Produksi)', formatCurrency(bep.variableCostPerKg), 'Pupuk AB Mix, benih, listrik, panen'],
    ['Margin Kontribusi Bersih per Kg', formatCurrency(bep.marginPerKg), 'Harga jual dikurangi biaya variabel/kg'],
    ['Biaya Operasional Tetap (Fixed Cost/Siklus)', formatCurrency(bep.fixedCost), 'Gaji tetap, sewa, listrik dasar'],
    ['BEP Operasional per Siklus (Volume)', `${formatNumber(bep.bepKg)} Kg`, 'Target panen minimum per siklus'],
    ['BEP Operasional per Siklus (Nominal)', formatCurrency(bep.bepRupiah), 'Target omzet minimum per siklus'],
    ['BEP Total Balik Modal Investasi (Volume)', `${formatNumber(bep.bepTotalInvestmentKg)} Kg`, 'Total akumulasi panen penutup modal'],
    ['BEP Total Balik Modal Investasi (Nominal)', formatCurrency(bep.bepTotalInvestmentRupiah), 'Total akumulasi omzet penutup modal'],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Parameter Break-Even Point (BEP)', 'Nilai Kalkulasi', 'Keterangan Metrik']],
    body: bepBody,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 45, halign: 'right' },
      2: { cellWidth: 47 },
    },
  });

  // Footer for each page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      `Greenhouse Finance Pro · Dokumen Laporan Resmi · Halaman ${i} dari ${pageCount}`,
      14,
      288
    );
    doc.text(`Waktu Unduh: ${new Date().toLocaleString('id-ID')}`, 145, 288);
  }

  const pdfFileName = `Laporan_Keuangan_ROI_Greenhouse_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(pdfFileName);
};
