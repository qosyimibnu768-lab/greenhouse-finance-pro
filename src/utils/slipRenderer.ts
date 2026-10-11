import { PayrollRecord } from '../types';
import { formatCurrency, formatDate, formatDays, formatNumber } from './formatters';
import { terbilang } from './terbilang';

// ===== Identitas perusahaan (dipakai di semua nota) =====
export const SLIP_COMPANY = {
  name: 'GREENHOUSE FINANCE PRO',
  farm: 'Tarno Jaya Farm',
  tagline: 'Perkebunan Hidroponik Melon Premium',
  address: 'Sistem Akuntansi, HPP & Manajemen Operasional Greenhouse Melon',
  ownerName: 'Ibnu (Owner)',
};

// ===== Data nota upah konstruksi =====
export interface ConstructionSlipData {
  id: string;
  date: string;
  workerName: string;
  position: string;
  days: number;
  unit: string;
  rate: number;
  total: number;
  overtimeHours?: number;
  overtimeRate?: number;
  overtimeAmount?: number;
  note?: string;
  periodFrom?: string;
  periodTo?: string;
}

// Logo dokumen memakai aset gambar /logo.png (lihat .logo pada BASE_CSS).

const BASE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  :root{--em:#065f46;--em2:#10b981;--ink:#0f172a;--mut:#64748b;--ln:#e2e8f0;--soft:#f8fafc}
  html,body{background:#eef2f7;color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .toolbar{position:sticky;top:0;z-index:50;display:flex;justify-content:center;gap:8px;padding:10px;background:#0f172a}
  .toolbar button{border:0;border-radius:9px;padding:9px 16px;font-weight:700;font-size:12px;cursor:pointer}
  .toolbar .print{background:#10b981;color:#052e22}
  .toolbar .close{background:#1e293b;color:#cbd5e1}
  .stage{padding:18px 10px 40px;display:flex;justify-content:center}
  .sheet{position:relative;width:100%;max-width:200mm;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 18px 45px rgba(2,6,23,.18)}
  .band{background:linear-gradient(120deg,#022c22 0%,#064e3b 45%,#0f766e 100%);color:#fff;padding:20px 24px;display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
  .brand{display:flex;gap:12px;align-items:center}
  .logo{width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.28);display:flex;align-items:center;justify-content:center;flex:0 0 auto;overflow:hidden}
  .logo img{width:100%;height:100%;object-fit:cover;display:block}
  .brand h1{font-size:17px;letter-spacing:.4px;font-weight:900}
  .brand p{font-size:11px;color:#a7f3d0;margin-top:2px;letter-spacing:.2px}
  .doc{text-align:right;flex:0 0 auto}
  .doc .k{font-size:10px;letter-spacing:2.6px;color:#a7f3d0;font-weight:800}
  .doc .no{font-size:11px;font-family:ui-monospace,Consolas,monospace;color:#e2e8f0;margin-top:4px}
  .badge{display:inline-block;margin-top:6px;font-size:10px;font-weight:800;letter-spacing:.5px;border-radius:999px;padding:3px 10px}
  .body{padding:22px 24px 26px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .col{display:flex;flex-direction:column;gap:14px}
  .totbox{margin-top:14px;border-radius:14px;padding:15px 18px;background:linear-gradient(120deg,#065f46,#0d9488);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:14px}
  .totbox .lbl{font-size:10px;letter-spacing:2px;color:#a7f3d0;font-weight:800}
  .totbox .amt{font-size:22px;font-weight:900;font-family:ui-monospace,Consolas,monospace;margin-top:3px;text-align:right}
  .totbox .sub{font-size:10px;color:#d1fae5;text-align:right;margin-top:2px}
  .card{border:1px solid var(--ln);border-radius:12px;padding:13px 15px;background:var(--soft)}
  .card h3{font-size:10px;letter-spacing:1.6px;color:var(--mut);font-weight:800;margin-bottom:8px}
  .kv{display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:3.5px 0}
  .kv .k{color:var(--mut)}
  .kv .v{font-weight:700;text-align:right}
  .chips{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:14px 0 0}
  .chip{border:1px solid var(--ln);border-radius:10px;padding:8px 6px;text-align:center;background:#fff}
  .chip b{display:block;font-size:14px}
  .chip span{font-size:9px;color:var(--mut);text-transform:uppercase;letter-spacing:.6px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{font-size:10px;text-transform:uppercase;letter-spacing:1px;text-align:left;padding:9px 12px;background:#f1f5f9;color:#334155;border-bottom:1px solid var(--ln)}
  td{padding:8.5px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top}
  tr.total td{background:#f8fafc;font-weight:800;border-top:1px solid var(--ln)}
  .money{text-align:right;font-family:ui-monospace,Consolas,monospace;white-space:nowrap}
  .net{margin-top:16px;border-radius:14px;padding:16px 18px;background:linear-gradient(120deg,#065f46,#0d9488);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:14px}
  .net .lbl{font-size:10px;letter-spacing:2px;color:#a7f3d0;font-weight:800}
  .net .amt{font-size:24px;font-weight:900;font-family:ui-monospace,Consolas,monospace;margin-top:4px}
  .net .right{text-align:right;font-size:11px;color:#d1fae5}
  .terbilang{margin-top:10px;border:1px dashed #cbd5e1;border-radius:10px;padding:9px 12px;font-size:11.5px;background:#fcfcfd}
  .terbilang b{color:#065f46}
  .note{margin-top:12px;font-size:11px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:9px 12px}
  .sign{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:30px;text-align:center;font-size:11px}
  .sign.three{grid-template-columns:1fr 1fr 1fr}
  .sign.owner{grid-template-columns:1fr;max-width:250px;margin-left:auto;margin-right:6px}
  .sign .who{margin-top:52px;border-top:1px solid #94a3b8;padding-top:5px;font-weight:700}
  .sign .role{color:var(--mut);font-size:10px}
  .foot{margin-top:22px;border-top:1px solid var(--ln);padding-top:10px;display:flex;justify-content:space-between;gap:10px;font-size:9.5px;color:#94a3b8}
  .wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;overflow:hidden}
  .wm span{transform:rotate(-28deg);font-size:64px;font-weight:900;color:#065f46;opacity:.045;letter-spacing:8px;white-space:nowrap}
  @media print{
    html,body{background:#fff}
    .toolbar{display:none !important}
    .stage{padding:0}
    .sheet{box-shadow:none;border-radius:0;max-width:none}
    @page{size:A4;margin:10mm}
  }
`;

function shell(title: string, body: string): string {
  const baseHref = typeof window !== 'undefined' && window.location ? window.location.origin : '';
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"/>
<base href="${baseHref}/"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>${BASE_CSS}</style></head>
<body>
<div class="toolbar no-print">
  <button class="print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
  <button class="close" onclick="window.close()">Tutup</button>
</div>
<div class="stage">
  <div class="sheet">
    <div class="wm"><span>GREENHOUSE FINANCE PRO</span></div>
    ${body}
  </div>
</div>
</body></html>`;
}

function headerBand(docTitle: string, docNo: string, periodLine: string, badge: { text: string; color: string }): string {
  return `<div class="band">
  <div class="brand">
    <div class="logo"><img src="/logo.png" alt="Tarno Jaya Farm"/></div>
    <div>
      <h1>${SLIP_COMPANY.name}</h1>
      <p>${SLIP_COMPANY.farm}</p>
    </div>
  </div>
  <div class="doc">
    <div class="k">${docTitle}</div>
    <div class="no">No. ${docNo}</div>
    <div class="no">${periodLine}</div>
    <span class="badge" style="background:${badge.color}1f;border:1px solid ${badge.color}66;color:${badge.color}">${badge.text}</span>
  </div>
</div>`;
}

function ownerSignature(): string {
  return `<div class="sign owner">
  <div>
    <div class="role">Pemilik / Owner,</div>
    <div class="who">${SLIP_COMPANY.ownerName}</div>
    <div class="role">${SLIP_COMPANY.farm}</div>
  </div>
</div>`;
}

function footer(docId: string): string {
  return `<div class="foot">
  <span>Dokumen dibuat otomatis oleh ${SLIP_COMPANY.name} · ${new Date().toLocaleString('id-ID')}</span>
  <span>${docId}</span>
</div>`;
}

// ============================================================
// SLIP GAJI KARYAWAN (HR & Payroll reguler)
// ============================================================
export function buildPayrollSlipHtml(record: PayrollRecord): string {
  const statusMap: Record<string, { text: string; color: string }> = {
    Paid: { text: 'LUNAS / DIBAYARKAN', color: '#10b981' },
    Approved: { text: 'DISETUJUI', color: '#3b82f6' },
    Draft: { text: 'DRAFT', color: '#f59e0b' },
  };
  const st = statusMap[record.status] || statusMap.Draft;

  const earningsAll: Array<[string, number]> = [
    ['Gaji Pokok / Upah Pokok', Number(record.baseSalary || record.dailyWages || 0)],
    [`Upah Lembur (${record.totalOvertimeHours || 0} jam)`, Number(record.overtimePay || 0)],
    ['Tunjangan Makan', Number(record.allowanceMeal || 0)],
    ['Tunjangan Transport', Number(record.allowanceTransport || 0)],
    ['Bonus Panen Melon', Number(record.bonusHarvest || 0)],
    ['Bonus Kinerja / Lainnya', Number(record.bonusProduction || 0) + Number(record.otherBonus || 0)],
  ];
  const earnings = earningsAll.filter(([, v]) => v > 0);

  const deductionsAll: Array<[string, number]> = [
    ['Potongan Keterlambatan', Number(record.deductionLate || 0)],
    ['Potongan Alpha / Absen', Number(record.deductionAlpha || 0)],
    ['Cicilan Kasbon / Pinjaman', Number(record.deductionKasbon || 0)],
    ['BPJS / Asuransi', Number(record.deductionBpjs || 0)],
    ['Potongan Lain-lain', Number(record.deductionOther || 0)],
  ];
  const deductions = deductionsAll.filter(([, v]) => v > 0);

  const gross = Number(record.grossSalary || 0);
  const totalDed = Number(record.totalDeductions || 0);

  const rows = Math.max(earnings.length, deductions.length);
  let tableRows = '';
  for (let i = 0; i < rows; i++) {
    const e = earnings[i];
    const d = deductions[i];
    tableRows += `<tr>
      <td>${e ? e[0] : ''}</td>
      <td class="money">${e ? formatCurrency(e[1]) : ''}</td>
      <td>${d ? d[0] : ''}</td>
      <td class="money">${d ? formatCurrency(d[1]) : ''}</td>
    </tr>`;
  }

  const attendance = `<div class="chips">
    <div class="chip"><b>${record.daysPresent || 0}</b><span>Hadir</span></div>
    <div class="chip"><b>${record.daysLate || 0}</b><span>Terlambat</span></div>
    <div class="chip"><b>${(record.daysLeave || 0) + (record.daysSick || 0) + (record.daysCuti || 0)}</b><span>Izin/Sakit/Cuti</span></div>
    <div class="chip"><b>${record.daysAlpha || 0}</b><span>Alpha</span></div>
    <div class="chip"><b>${record.totalWorkHours || 0}</b><span>Jam Kerja</span></div>
    <div class="chip"><b>${record.totalOvertimeHours || 0}</b><span>Jam Lembur</span></div>
  </div>`;

  const paymentInfo =
    record.status === 'Paid' && record.paidAt
      ? `<div class="card" style="margin-top:14px">
          <h3>INFORMASI PEMBAYARAN</h3>
          <div class="grid2">
            <div class="kv"><span class="k">Tanggal Bayar</span><span class="v">${formatDate(record.paidAt)}</span></div>
            <div class="kv"><span class="k">Metode</span><span class="v">${record.paymentMethod || '-'}</span></div>
            <div class="kv"><span class="k">Referensi</span><span class="v">${record.paymentReference || '-'}</span></div>
            <div class="kv"><span class="k">Status</span><span class="v">${st.text}</span></div>
          </div>
        </div>`
      : '';

  const body = `
  ${headerBand('SLIP GAJI KARYAWAN', record.id, `Periode: ${record.periodLabel}`, st)}
  <div class="body">
    <div class="grid2">
      <div class="card">
        <h3>DATA KARYAWAN</h3>
        <div class="kv"><span class="k">Nama Lengkap</span><span class="v">${record.employeeName}</span></div>
        <div class="kv"><span class="k">NIK Internal</span><span class="v">${record.employeeNik || '-'}</span></div>
        <div class="kv"><span class="k">Jabatan</span><span class="v">${record.position || '-'}</span></div>
        <div class="kv"><span class="k">Unit / Lokasi</span><span class="v">${record.greenhouse || '-'}</span></div>
        <div class="kv"><span class="k">Tipe Penggajian</span><span class="v">${record.salaryType || '-'}</span></div>
      </div>
      <div class="card">
        <h3>REKAP PRESENSI KERJA</h3>
        <div class="kv"><span class="k">Hadir</span><span class="v">${record.daysPresent || 0} hari</span></div>
        <div class="kv"><span class="k">Terlambat</span><span class="v">${record.daysLate || 0} hari</span></div>
        <div class="kv"><span class="k">Izin / Sakit / Cuti</span><span class="v">${(record.daysLeave || 0) + (record.daysSick || 0) + (record.daysCuti || 0)} hari</span></div>
        <div class="kv"><span class="k">Alpha</span><span class="v">${record.daysAlpha || 0} hari</span></div>
        <div class="kv"><span class="k">Total Jam Kerja</span><span class="v">${record.totalWorkHours || 0} jam</span></div>
      </div>
    </div>
    ${attendance}
    <table style="margin-top:16px">
      <thead><tr><th style="width:34%">Komponen Pendapatan</th><th class="money" style="width:16%">Nominal</th><th style="width:34%">Komponen Potongan</th><th class="money" style="width:16%">Nominal</th></tr></thead>
      <tbody>
        ${tableRows}
        <tr class="total"><td>TOTAL PENDAPATAN KOTOR</td><td class="money">${formatCurrency(gross)}</td><td>TOTAL POTONGAN</td><td class="money" style="color:#b91c1c">−${formatCurrency(totalDed)}</td></tr>
      </tbody>
    </table>
    <div class="net">
      <div>
        <div class="lbl">GAJI BERSIH DITERIMA (TAKE HOME PAY)</div>
        <div class="amt">${formatCurrency(Number(record.netSalary || 0))}</div>
      </div>
      <div class="right">
        <div>${SLIP_COMPANY.farm}</div>
        <div>${record.periodLabel}</div>
      </div>
    </div>
    <div class="terbilang">Terbilang: <b>${terbilang(Number(record.netSalary || 0))}</b></div>
    ${paymentInfo}
    ${ownerSignature()}
    ${footer(record.id)}
  </div>`;

  return shell(`Slip Gaji - ${record.employeeName} (${record.periodLabel})`, body);
}

// ============================================================
// NOTA UPAH KONSTRUKSI (HR Konstruksi)
// ============================================================
export function buildConstructionSlipHtml(d: ConstructionSlipData): string {
  const baseAmount = Math.round((Number(d.days) || 0) * (Number(d.rate) || 0));
  const overtimeHours = Number(d.overtimeHours) || 0;
  const overtimeAmount = Math.round(
    Number(d.overtimeAmount ?? 0) || overtimeHours * (Number(d.overtimeRate) || 0)
  );
  const overtimeRate =
    Number(d.overtimeRate) || (overtimeHours > 0 && overtimeAmount > 0 ? Math.round(overtimeAmount / overtimeHours) : 0);
  const total = Math.round(Number(d.total) || baseAmount + overtimeAmount);

  const overtimeRow =
    overtimeAmount > 0
      ? `<tr>
          <td>Upah Lembur${
            overtimeRate > 0
              ? `<br/><span style="color:#64748b;font-size:11px">${overtimeHours > 0 ? `${formatNumber(overtimeHours)} jam × ${formatCurrency(overtimeRate)}` : 'perhitungan lembur'}</span>`
              : ''
          }</td>
          <td class="money" style="font-weight:800">${formatCurrency(overtimeAmount)}</td>
        </tr>`
      : '';

  const overtimeInfo =
    overtimeAmount > 0
      ? `${overtimeHours > 0 ? `${formatNumber(overtimeHours)} jam` : 'Ada'}${overtimeRate > 0 ? ` × ${formatCurrency(overtimeRate)}` : ''}`
      : '-';

  const body = `
  ${headerBand('NOTA / SLIP UPAH', d.id, `Tanggal: ${formatDate(d.date)}`, { text: 'KONSTRUKSI', color: '#f59e0b' })}
  <div class="body">
    <div class="grid2">
      <div class="col">
        <div class="card">
          <h3>DATA PEKERJA</h3>
          <div class="kv"><span class="k">Nama</span><span class="v">${d.workerName}</span></div>
          <div class="kv"><span class="k">Jabatan</span><span class="v">${d.position || '-'}</span></div>
          <div class="kv"><span class="k">Area Kerja</span><span class="v">Konstruksi / Pembangunan</span></div>
        </div>
        <div class="card">
          <h3>RINCIAN PEKERJAAN</h3>
          <div class="kv"><span class="k">Tanggal Bayar</span><span class="v">${formatDate(d.date)}</span></div>
          ${
            d.periodFrom
              ? `<div class="kv"><span class="k">Periode Absensi</span><span class="v">${formatDate(d.periodFrom)} – ${formatDate(d.periodTo || d.periodFrom)}</span></div>`
              : ''
          }
          <div class="kv"><span class="k">Jumlah ${d.unit}</span><span class="v">${formatDays(d.days)} ${d.unit}</span></div>
          <div class="kv"><span class="k">Tarif / ${d.unit}</span><span class="v">${formatCurrency(d.rate)}</span></div>
          <div class="kv"><span class="k">Lembur</span><span class="v">${overtimeInfo}</span></div>
          ${d.note ? `<div class="kv"><span class="k">Catatan</span><span class="v">${d.note}</span></div>` : ''}
        </div>
      </div>
      <div class="col">
        <div class="card" style="flex:1">
          <h3>URAIAN UPAH</h3>
          <table>
            <thead><tr><th>Komponen</th><th class="money" style="width:36%">Jumlah</th></tr></thead>
            <tbody>
              <tr>
                <td>Upah ${d.position || 'Tenaga Konstruksi'}<br/><span style="color:#64748b;font-size:11px">${formatDays(d.days)} ${d.unit} × ${formatCurrency(d.rate)}</span></td>
                <td class="money" style="font-weight:800">${formatCurrency(baseAmount)}</td>
              </tr>
              ${overtimeRow}
            </tbody>
          </table>
        </div>
        <div class="totbox">
          <div class="lbl">TOTAL UPAH</div>
          <div>
            <div class="amt">${formatCurrency(total)}</div>
            <div class="sub">${SLIP_COMPANY.farm} · Nota Konstruksi</div>
          </div>
        </div>
      </div>
    </div>
    <div class="terbilang">Terbilang: <b>${terbilang(total)}</b></div>
    ${ownerSignature()}
    ${footer(d.id)}
  </div>`;

  return shell(`Nota Upah - ${d.workerName}`, body);
}

// ===== Data slip kas bon pekerja =====
export interface KasbonSlipData {
  id: string;
  date: string;
  workerName: string;
  position?: string;
  amount: number;
  remaining?: number;
  status?: string;
  note?: string;
}

/** Slip kas bon pekerja (gaji di muka) — hanya pihak pembayar/owner yang menandatangani. */
export function buildKasbonSlipHtml(k: KasbonSlipData): string {
  const amount = Math.round(Number(k.amount) || 0);
  const remaining = Math.round(Number(k.remaining ?? amount) || 0);
  const status = k.status || (remaining === 0 ? 'Lunas' : 'Belum lunas');

  const body = `
  ${headerBand('SLIP KAS BON', k.id, `Tanggal: ${formatDate(k.date)}`, { text: 'KAS BON PEKERJA', color: '#0ea5e9' })}
  <div class="body">
    <div class="grid2">
      <div class="card">
        <h3>DATA PEKERJA</h3>
        <div class="kv"><span class="k">Nama</span><span class="v">${k.workerName}</span></div>
        <div class="kv"><span class="k">Jabatan</span><span class="v">${k.position || '-'}</span></div>
        <div class="kv"><span class="k">Area Kerja</span><span class="v">Konstruksi / Pembangunan</span></div>
      </div>
      <div class="card">
        <h3>RINCIAN KAS BON</h3>
        <div class="kv"><span class="k">Tanggal</span><span class="v">${formatDate(k.date)}</span></div>
        <div class="kv"><span class="k">Jumlah Kas Bon</span><span class="v">${formatCurrency(amount)}</span></div>
        <div class="kv"><span class="k">Sisa Belum Dipotong</span><span class="v">${formatCurrency(remaining)}</span></div>
        <div class="kv"><span class="k">Status</span><span class="v">${status}</span></div>
        ${k.note ? `<div class="kv"><span class="k">Keterangan</span><span class="v">${k.note}</span></div>` : ''}
      </div>
    </div>
    <div class="totbox">
      <div class="lbl">JUMLAH KAS BON</div>
      <div>
        <div class="amt">${formatCurrency(amount)}</div>
        <div class="sub">${SLIP_COMPANY.farm}</div>
      </div>
    </div>
    <div class="terbilang">Terbilang: <b>${terbilang(amount)}</b></div>
    <div class="note" style="color:#0c4a6e;background:#f0f9ff;border-color:#bae6fd">
      <b>Catatan:</b> kas bon ini diperhitungkan (dipotong) pada pembayaran upah pekerja berikutnya.
    </div>
    ${ownerSignature()}
    ${footer(k.id)}
  </div>`;

  return shell(`Slip Kas Bon - ${k.workerName}`, body);
}

/** Buka jendela cetak dengan dokumen nota. Mengembalikan false bila popup diblokir. */
export function openPrintWindow(html: string): boolean {
  const w = window.open('', '_blank', 'width=900,height=940');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
