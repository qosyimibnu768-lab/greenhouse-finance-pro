import React from 'react';
import { PayrollRecord } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { X, Printer, Download, CheckCircle, Clock, ShieldCheck, Building, Sprout } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PayrollSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PayrollRecord | null;
}

export const PayrollSlipModal: React.FC<PayrollSlipModalProps> = ({ isOpen, onClose, record }) => {
  if (!isOpen || !record) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Header Green Banner
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(0, 0, 210, 32, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('GREENHOUSE FINANCE PRO', 14, 15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('SLIP GAJI KARYAWAN PERKEBUNAN MELON PREMIUM', 14, 22);

      // Period & Slip ID
      doc.setFontSize(9);
      doc.text(`Periode: ${record.periodLabel}`, 150, 15);
      doc.text(`No. Dokumen: ${record.id}`, 150, 22);

      // Employee Information Box
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('DATA KARYAWAN', 14, 42);

      autoTable(doc, {
        startY: 45,
        theme: 'plain',
        body: [
          ['Nama Lengkap', `: ${record.employeeName}`, 'NIK Internal', `: ${record.employeeNik}`],
          ['Jabatan', `: ${record.position}`, 'Unit Greenhouse', `: ${record.greenhouse}`],
          ['Tipe Penggajian', `: ${record.salaryType}`, 'Status Pembayaran', `: ${record.status}`],
        ],
        styles: { fontSize: 9, cellPadding: 2 },
      });

      // Summary Attendance
      const currentY = (doc as any).lastAutoTable.finalY + 6;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('REKAP PRESENSI KERJA', 14, currentY);

      autoTable(doc, {
        startY: currentY + 3,
        head: [['Hadir', 'Terlambat', 'Izin/Sakit/Cuti', 'Alpha', 'Total Jam Kerja', 'Jam Lembur']],
        body: [[
          `${record.daysPresent} Hari`,
          `${record.daysLate} Hari`,
          `${(record.daysLeave || 0) + (record.daysSick || 0) + (record.daysCuti || 0)} Hari`,
          `${record.daysAlpha || 0} Hari`,
          `${record.totalWorkHours} Jam`,
          `${record.totalOvertimeHours} Jam`,
        ]],
        styles: { fontSize: 8.5, halign: 'center' },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      });

      // Income vs Deductions Table
      const earningsY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('RINCIAN PENDAPATAN & POTONGAN', 14, earningsY);

      const earningsRows = [
        ['Gaji Pokok / Upah Harian', formatCurrency(record.baseSalary || record.dailyWages || 0), 'Potongan Keterlambatan', formatCurrency(record.deductionLate || 0)],
        ['Upah Lembur', formatCurrency(record.overtimePay || 0), 'Potongan Alpha / Absen', formatCurrency(record.deductionAlpha || 0)],
        ['Uang Makan & Transport', formatCurrency((record.allowanceMeal || 0) + (record.allowanceTransport || 0)), 'Potongan Kasbon / Pinjaman', formatCurrency(record.deductionKasbon || 0)],
        ['Bonus Panen Melon Premium', formatCurrency(record.bonusHarvest || 0), 'Potongan BPJS / Lain-lain', formatCurrency((record.deductionBpjs || 0) + (record.deductionOther || 0))],
        ['Bonus Kinerja / Lainnya', formatCurrency((record.bonusProduction || 0) + (record.otherBonus || 0)), '', ''],
      ];

      autoTable(doc, {
        startY: earningsY + 3,
        head: [['Komponen Pendapatan', 'Nominal', 'Komponen Potongan', 'Nominal']],
        body: earningsRows,
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [220, 252, 231], textColor: [22, 101, 52], fontStyle: 'bold' },
      });

      // Net Salary Total Box
      const finalY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(14, finalY, 182, 24, 3, 3, 'FD');

      doc.setFontSize(10);
      doc.setTextColor(21, 128, 61);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL GAJI BERSIH DITERIMA (TAKE HOME PAY):', 20, finalY + 10);

      doc.setFontSize(16);
      doc.setTextColor(15, 118, 110);
      doc.text(formatCurrency(record.netSalary), 20, finalY + 18);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Dicetak secara otomatis oleh Greenhouse Finance Pro pada ${new Date().toLocaleString('id-ID')}`, 14, 280);

      doc.save(`Slip_Gaji_${record.employeeName.replace(/\s+/g, '_')}_${record.periodLabel.replace(/\s+/g, '_')}.pdf`);
    } catch (e: any) {
      console.error('Error generating PDF slip', e);
      alert('Gagal mengekspor PDF: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden border border-emerald-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <Sprout className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">Slip Gaji Resmi Karyawan</h2>
              <p className="text-xs text-emerald-200">
                Greenhouse Melon Premium • {record.periodLabel}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/80 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Area */}
        <div id="payroll-slip-content" className="p-6 overflow-y-auto space-y-6 flex-1 text-sm bg-white">
          {/* Slip Header Banner */}
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-emerald-900">
                  GREENHOUSE FINANCE PRO
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                  VERIFIED
                </span>
              </div>
              <p className="text-xs text-gray-500">Perkebunan Melon Hidroponik DFT Modern</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-semibold text-gray-400 block">{record.id}</span>
              <span
                className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  record.status === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : record.status === 'Approved'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {record.status === 'Paid' ? 'LUNAS / DIBAYARKAN' : record.status}
              </span>
            </div>
          </div>

          {/* Employee & Attendance Grid */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
            <div>
              <p className="text-gray-500">Nama Karyawan:</p>
              <p className="font-bold text-gray-900 text-sm">{record.employeeName}</p>
              <p className="text-gray-500 mt-2">NIK Internal:</p>
              <p className="font-semibold text-gray-800">{record.employeeNik}</p>
              <p className="text-gray-500 mt-2">Jabatan & Unit:</p>
              <p className="font-semibold text-gray-800">{record.position} ({record.greenhouse})</p>
            </div>
            <div>
              <p className="text-gray-500">Periode Gaji:</p>
              <p className="font-bold text-gray-900 text-sm">{record.periodLabel}</p>
              <p className="text-gray-500 mt-2">Rekap Kehadiran:</p>
              <p className="font-semibold text-gray-800">
                {record.daysPresent} Hari Hadir | {record.daysLate} Terlambat | {record.daysAlpha || 0} Alpha
              </p>
              <p className="text-gray-500 mt-2">Total Jam Lembur:</p>
              <p className="font-semibold text-gray-800">{record.totalOvertimeHours} Jam</p>
            </div>
          </div>

          {/* Earnings & Deductions Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Earnings */}
            <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/30">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Pendapatan</span>
                <span className="text-emerald-700 font-semibold">{formatCurrency(record.grossSalary)}</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Gaji Pokok / Pokok Harian</span>
                  <span className="font-medium text-gray-900">{formatCurrency(record.baseSalary || record.dailyWages || 0)}</span>
                </div>
                {record.overtimePay > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Upah Lembur ({record.totalOvertimeHours} Jam)</span>
                    <span className="font-medium text-gray-900">{formatCurrency(record.overtimePay)}</span>
                  </div>
                )}
                {record.allowanceMeal > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Uang Makan</span>
                    <span className="font-medium text-gray-900">{formatCurrency(record.allowanceMeal)}</span>
                  </div>
                )}
                {record.allowanceTransport > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tunjangan Transportasi</span>
                    <span className="font-medium text-gray-900">{formatCurrency(record.allowanceTransport)}</span>
                  </div>
                )}
                {record.bonusHarvest > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Bonus Panen Melon Premium</span>
                    <span className="font-bold">{formatCurrency(record.bonusHarvest)}</span>
                  </div>
                )}
                {record.otherBonus > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Bonus Kinerja / Lainnya</span>
                    <span className="font-medium text-gray-900">{formatCurrency(record.otherBonus)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Deductions */}
            <div className="border border-red-100 rounded-xl p-4 bg-red-50/30">
              <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Potongan</span>
                <span className="text-red-700 font-semibold">{formatCurrency(record.totalDeductions)}</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Potongan Keterlambatan</span>
                  <span className="font-medium text-gray-900">{formatCurrency(record.deductionLate || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Potongan Alpha / Absen</span>
                  <span className="font-medium text-gray-900">{formatCurrency(record.deductionAlpha || 0)}</span>
                </div>
                {record.deductionKasbon > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Cicilan Kasbon Karyawan</span>
                    <span className="font-medium text-red-600">-{formatCurrency(record.deductionKasbon)}</span>
                  </div>
                )}
                {record.deductionBpjs > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>BPJS / Asuransi</span>
                    <span className="font-medium text-gray-900">{formatCurrency(record.deductionBpjs)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Net Salary Highlight */}
          <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl flex items-center justify-between shadow-md">
            <div>
              <p className="text-xs text-emerald-100 font-medium">TOTAL GAJI BERSIH (TAKE HOME PAY)</p>
              <h3 className="text-2xl font-black mt-0.5">{formatCurrency(record.netSalary)}</h3>
            </div>
            {record.paidAt && (
              <div className="text-right text-xs text-emerald-100">
                <p>Dibayarkan pada:</p>
                <p className="font-bold text-white">{formatDate(record.paidAt)}</p>
                <p className="text-[11px] opacity-90">{record.paymentMethod}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 text-xs font-semibold"
          >
            Tutup
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Langsung
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Unduh Dokumen PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
