import React from 'react';
import { PayrollRecord } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { buildPayrollSlipHtml, openPrintWindow, SLIP_COMPANY } from '../../utils/slipRenderer';
import { terbilang } from '../../utils/terbilang';
import { X, Printer, Download, Building2, Sprout, CheckCircle2, PenLine } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PayrollSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PayrollRecord | null;
}

export const PayrollSlipModal: React.FC<PayrollSlipModalProps> = ({ isOpen, onClose, record }) => {
  if (!isOpen || !record) return null;

  // ===== Cetak: buka dokumen nota profesional di jendela baru (hanya nota yang tercetak) =====
  const handlePrint = () => {
    const ok = openPrintWindow(buildPayrollSlipHtml(record));
    if (!ok) alert('Popup diblokir browser — izinkan popup untuk mencetak slip.');
  };

  // ===== Unduh PDF profesional =====
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;

      // Header band
      doc.setFillColor(4, 47, 46);
      doc.rect(0, 0, pageW, 34, 'F');
      doc.setFillColor(13, 148, 136);
      doc.rect(0, 34, pageW, 1.6, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(SLIP_COMPANY.name, 14, 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(167, 243, 208);
      doc.text(`${SLIP_COMPANY.farm.toUpperCase()}. ${SLIP_COMPANY.tagline}`, 14, 20);

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SLIP GAJI KARYAWAN', pageW - 14, 13, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(209, 250, 229);
      doc.text(`No. ${record.id}`, pageW - 14, 19, { align: 'right' });
      doc.text(`Periode: ${record.periodLabel}`, pageW - 14, 24, { align: 'right' });
      const stText = record.status === 'Paid' ? 'LUNAS / DIBAYARKAN' : String(record.status).toUpperCase();
      doc.text(`Status: ${stText}`, pageW - 14, 29, { align: 'right' });

      // Data karyawan & presensi
      autoTable(doc, {
        startY: 42,
        theme: 'plain',
        body: [
          ['DATA KARYAWAN', '', 'REKAP PRESENSI', ''],
          ['Nama Lengkap', `: ${record.employeeName}`, 'Hadir', `: ${record.daysPresent || 0} hari`],
          ['NIK Internal', `: ${record.employeeNik || '-'}`, 'Terlambat', `: ${record.daysLate || 0} hari`],
          ['Jabatan', `: ${record.position || '-'}`, 'Izin/Sakit/Cuti', `: ${(record.daysLeave || 0) + (record.daysSick || 0) + (record.daysCuti || 0)} hari`],
          ['Unit / Lokasi', `: ${record.greenhouse || '-'}`, 'Alpha', `: ${record.daysAlpha || 0} hari`],
          ['Tipe Penggajian', `: ${record.salaryType || '-'}`, 'Jam Kerja / Lembur', `: ${record.totalWorkHours || 0} / ${record.totalOvertimeHours || 0} jam`],
        ],
        styles: { fontSize: 8.6, cellPadding: 1.7, textColor: [30, 41, 59] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 30 },
          1: { cellWidth: 60 },
          2: { fontStyle: 'bold', cellWidth: 32 },
        },
        didParseCell: (data) => {
          if (data.row.index === 0) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [100, 116, 139];
            data.cell.styles.fontSize = 8;
          }
        },
      });

      // Rincian pendapatan & potongan
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

      const rows = Math.max(earnings.length, deductions.length);
      const body: any[] = [];
      for (let i = 0; i < rows; i++) {
        body.push([
          earnings[i] ? earnings[i][0] : '',
          earnings[i] ? formatCurrency(earnings[i][1]) : '',
          deductions[i] ? deductions[i][0] : '',
          deductions[i] ? `-${formatCurrency(deductions[i][1])}` : '',
        ]);
      }
      body.push([
        { content: 'TOTAL PENDAPATAN KOTOR', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: formatCurrency(Number(record.grossSalary || 0)), styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: 'TOTAL POTONGAN', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: `-${formatCurrency(Number(record.totalDeductions || 0))}`, styles: { fontStyle: 'bold', textColor: [185, 28, 28], fillColor: [248, 250, 252] } },
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 6,
        head: [['Komponen Pendapatan', 'Nominal', 'Komponen Potongan', 'Nominal']],
        body,
        styles: { fontSize: 8.4, cellPadding: 2 },
        headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold', fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 68 },
          1: { cellWidth: 24, halign: 'right', font: 'courier' },
          2: { cellWidth: 68 },
          3: { cellWidth: 24, halign: 'right', font: 'courier' },
        },
      });

      // Band gaji bersih
      const netY = (doc as any).lastAutoTable.finalY + 6;
      doc.setFillColor(6, 95, 70);
      doc.roundedRect(14, netY, 182, 20, 3, 3, 'F');
      doc.setTextColor(167, 243, 208);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('GAJI BERSIH DITERIMA (TAKE HOME PAY)', 20, netY + 7);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.text(formatCurrency(Number(record.netSalary || 0)), 20, netY + 15.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(SLIP_COMPANY.farm, 190, netY + 9, { align: 'right' });
      doc.text(record.periodLabel, 190, netY + 14, { align: 'right' });

      // Terbilang
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.text(`Terbilang: ${terbilang(Number(record.netSalary || 0))}`, 16, netY + 27);

      // Informasi pembayaran
      let signY = netY + 36;
      if (record.status === 'Paid' && record.paidAt) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.3);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Dibayarkan ${formatDate(record.paidAt)} via ${record.paymentMethod || '-'}${record.paymentReference ? ` (Ref: ${record.paymentReference})` : ''}`,
          16,
          netY + 34
        );
        signY = netY + 44;
      }

      // Tanda tangan — hanya Owner
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8.3);
      doc.text('Pemilik / Owner,', 160, signY, { align: 'center' });
      doc.setDrawColor(148, 163, 184);
      doc.line(126, signY + 22, 194, signY + 22);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(SLIP_COMPANY.ownerName, 160, signY + 26.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(SLIP_COMPANY.farm, 160, signY + 31, { align: 'center' });

      // Footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Dokumen dibuat otomatis oleh ${SLIP_COMPANY.name} · ${new Date().toLocaleString('id-ID')}`,
        14,
        289
      );
      doc.text(record.id, 196, 289, { align: 'right' });

      doc.save(`Slip_Gaji_${record.employeeName.replace(/\s+/g, '_')}_${record.periodLabel.replace(/\s+/g, '_')}.pdf`);
    } catch (e: any) {
      console.error('Error generating PDF slip', e);
      alert('Gagal mengekspor PDF: ' + e.message);
    }
  };

  const statusBadge =
    record.status === 'Paid'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : record.status === 'Approved'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-amber-100 text-amber-800 border-amber-200';
  const statusText = record.status === 'Paid' ? 'LUNAS / DIBAYARKAN' : String(record.status).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden border border-emerald-100 flex flex-col max-h-[92vh]">
        {/* Header modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl border border-white/15">
              <Sprout className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Slip Gaji Resmi Karyawan</h2>
              <p className="text-xs text-emerald-200">
                {SLIP_COMPANY.farm} · {record.periodLabel}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/80 hover:text-white rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pratinjau slip */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm bg-slate-50/50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header nota */}
            <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-900 text-white px-5 py-4 flex justify-between items-start gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <p className="font-black tracking-wide text-sm">{SLIP_COMPANY.name}</p>
                  <p className="text-[11px] text-emerald-200">
                    {SLIP_COMPANY.farm.toUpperCase()}. {SLIP_COMPANY.tagline}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black tracking-[3px] text-emerald-300">SLIP GAJI</p>
                <p className="text-[11px] font-mono text-slate-200 mt-0.5">{record.id}</p>
                <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                  {statusText}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Karyawan & presensi */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 mb-2">DATA KARYAWAN</p>
                  <p className="text-slate-500">Nama Lengkap</p>
                  <p className="font-bold text-slate-900">{record.employeeName}</p>
                  <p className="text-slate-500 mt-2">NIK / Jabatan</p>
                  <p className="font-semibold text-slate-800">
                    {record.employeeNik || '-'} · {record.position || '-'}
                  </p>
                  <p className="text-slate-500 mt-2">Unit / Lokasi</p>
                  <p className="font-semibold text-slate-800">{record.greenhouse || '-'}</p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 mb-2">REKAP PRESENSI</p>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {[
                      { v: record.daysPresent || 0, l: 'Hadir' },
                      { v: record.daysLate || 0, l: 'Telat' },
                      { v: (record.daysLeave || 0) + (record.daysSick || 0) + (record.daysCuti || 0), l: 'Izin' },
                      { v: record.daysAlpha || 0, l: 'Alpha' },
                      { v: record.totalWorkHours || 0, l: 'Jam Kerja' },
                      { v: record.totalOvertimeHours || 0, l: 'Lembur' },
                    ].map((c) => (
                      <div key={c.l} className="rounded-lg border border-slate-200 bg-white py-1.5">
                        <p className="font-black text-slate-900 text-sm">{c.v}</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider">{c.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pendapatan & potongan */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/40">
                  <h4 className="text-[10px] font-bold text-emerald-900 uppercase tracking-widest mb-2 flex justify-between">
                    <span>Pendapatan</span>
                    <span>{formatCurrency(Number(record.grossSalary || 0))}</span>
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Gaji Pokok / Upah</span>
                      <span className="font-medium text-slate-900">
                        {formatCurrency(Number(record.baseSalary || record.dailyWages || 0))}
                      </span>
                    </div>
                    {Number(record.overtimePay || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Upah Lembur</span>
                        <span className="font-medium text-slate-900">{formatCurrency(Number(record.overtimePay))}</span>
                      </div>
                    )}
                    {Number(record.allowanceMeal || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Uang Makan</span>
                        <span className="font-medium text-slate-900">{formatCurrency(Number(record.allowanceMeal))}</span>
                      </div>
                    )}
                    {Number(record.allowanceTransport || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Tunjangan Transport</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(Number(record.allowanceTransport))}
                        </span>
                      </div>
                    )}
                    {Number(record.bonusHarvest || 0) > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Bonus Panen Melon</span>
                        <span className="font-bold">{formatCurrency(Number(record.bonusHarvest))}</span>
                      </div>
                    )}
                    {Number(record.bonusProduction || 0) + Number(record.otherBonus || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Bonus Kinerja / Lainnya</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(Number(record.bonusProduction || 0) + Number(record.otherBonus || 0))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="border border-red-100 rounded-xl p-4 bg-red-50/40">
                  <h4 className="text-[10px] font-bold text-red-900 uppercase tracking-widest mb-2 flex justify-between">
                    <span>Potongan</span>
                    <span>{formatCurrency(Number(record.totalDeductions || 0))}</span>
                  </h4>
                  <div className="space-y-1.5">
                    {Number(record.deductionLate || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Keterlambatan</span>
                        <span className="font-medium text-red-600">−{formatCurrency(Number(record.deductionLate))}</span>
                      </div>
                    )}
                    {Number(record.deductionAlpha || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Alpha / Absen</span>
                        <span className="font-medium text-red-600">−{formatCurrency(Number(record.deductionAlpha))}</span>
                      </div>
                    )}
                    {Number(record.deductionKasbon || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Cicilan Kasbon</span>
                        <span className="font-medium text-red-600">−{formatCurrency(Number(record.deductionKasbon))}</span>
                      </div>
                    )}
                    {Number(record.deductionBpjs || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>BPJS / Asuransi</span>
                        <span className="font-medium text-red-600">−{formatCurrency(Number(record.deductionBpjs))}</span>
                      </div>
                    )}
                    {Number(record.deductionOther || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Lain-lain</span>
                        <span className="font-medium text-red-600">−{formatCurrency(Number(record.deductionOther))}</span>
                      </div>
                    )}
                    {Number(record.totalDeductions || 0) === 0 && (
                      <p className="text-slate-400 italic">Tidak ada potongan</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Gaji bersih */}
              <div className="rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 text-white p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] tracking-[2px] font-bold text-emerald-100">
                    GAJI BERSIH DITERIMA (TAKE HOME PAY)
                  </p>
                  <p className="text-2xl font-black font-mono mt-1">{formatCurrency(Number(record.netSalary || 0))}</p>
                </div>
                {record.paidAt && (
                  <div className="text-right text-[11px] text-emerald-100">
                    <p>Dibayarkan:</p>
                    <p className="font-bold text-white">{formatDate(record.paidAt)}</p>
                    <p className="opacity-90">{record.paymentMethod}</p>
                  </div>
                )}
              </div>

              {/* Terbilang */}
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-[11.5px] text-slate-600">
                Terbilang: <b className="text-emerald-800">{terbilang(Number(record.netSalary || 0))}</b>
              </div>

              {/* Tanda tangan — hanya Owner */}
              <div className="flex justify-end pt-4 text-center text-[11px]">
                <div className="w-56">
                  <p className="text-slate-500">Pemilik / Owner,</p>
                  <div className="mt-10 border-t border-slate-300 pt-1.5">
                    <p className="font-bold text-slate-900">{SLIP_COMPANY.ownerName}</p>
                    <p className="text-slate-500">{SLIP_COMPANY.farm}</p>
                  </div>
                </div>
              </div>

              <p className="text-[9.5px] text-slate-400 text-center pt-1 border-t border-slate-100">
                Dokumen dibuat otomatis oleh {SLIP_COMPANY.name} · {new Date().toLocaleString('id-ID')} · {record.id}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <PenLine className="w-3.5 h-3.5 text-emerald-600" />
            Tombol <b>Cetak</b> membuka dokumen nota profesional (hanya nota yang tercetak, ukuran A4).{' '}
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PDF juga tersedia.
          </p>
        </div>

        {/* Aksi */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Nota
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Unduh PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
