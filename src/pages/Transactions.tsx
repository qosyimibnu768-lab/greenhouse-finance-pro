import React, { useState, useMemo } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportTransactionsCSV } from '../services/exportService';
import {
  Search,
  Plus,
  Download,
  Trash2,
  Edit2,
  Receipt,
  FileImage,
  ArrowUpRight,
  ArrowDownLeft,
  X,
} from 'lucide-react';

interface TransactionsPageProps {
  onOpenAddTransaction: () => void;
  onEditTransaction: (trx: Transaction) => void;
  onNavigate?: (tab: string, subtab?: string) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  onOpenAddTransaction,
  onEditTransaction,
  onNavigate,
}) => {
  const { db, deleteTransaction } = useGreenhouse();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pemasukan' | 'pengeluaran' | 'operasional' | 'investasi' | 'payroll'>('all');
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [tunnelFilter, setTunnelFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Deletion confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return db.transactions.filter((t) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          t.category.toLowerCase().includes(q) ||
          (t.subcategory && t.subcategory.toLowerCase().includes(q)) ||
          (t.note && t.note.toLowerCase().includes(q)) ||
          t.paymentMethod.toLowerCase().includes(q) ||
          (t.cycleId && t.cycleId.toLowerCase().includes(q));
        if (!match) return false;
      }
      // Type filter
      if (typeFilter === 'pemasukan' && t.type !== 'pemasukan') return false;
      if (typeFilter === 'pengeluaran' && t.type !== 'pengeluaran') return false;
      if (typeFilter === 'operasional' && (t.type !== 'pengeluaran' || t.expenseGroup === 'investasi')) return false;
      if (typeFilter === 'investasi' && t.expenseGroup !== 'investasi') return false;
      if (typeFilter === 'payroll' && t.category !== 'Gaji Karyawan / Payroll' && !t.id.startsWith('TRX-PAY-')) return false;

      // Cycle filter
      if (cycleFilter !== 'all') {
        if (cycleFilter === 'none') {
          if (t.cycleId) return false;
        } else if (t.cycleId !== cycleFilter) {
          return false;
        }
      }

      // Tunnel filter
      if (tunnelFilter !== 'all' && t.tunnel !== tunnelFilter) return false;

      // Date range
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;

      return true;
    });
  }, [db.transactions, searchTerm, typeFilter, cycleFilter, tunnelFilter, startDate, endDate]);

  // Aggregate sums for filtered results
  const summary = useMemo(() => {
    let pemasukan = 0;
    let pengeluaran = 0;
    filteredTransactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'pemasukan') {
        pemasukan += amt;
      } else {
        pengeluaran += amt;
      }
    });
    return {
      pemasukan,
      pengeluaran,
      net: pemasukan - pengeluaran,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Top Action & Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Pemasukan (Filter)</span>
          <span className="text-xl font-black text-emerald-600 block mt-1 font-mono">{formatCurrency(summary.pemasukan)}</span>
          <span className="text-xs text-slate-400">{summary.count} data transaksi</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Pengeluaran (Filter)</span>
          <span className="text-xl font-black text-rose-600 block mt-1 font-mono">{formatCurrency(summary.pengeluaran)}</span>
          <span className="text-xs text-slate-400">Operasional + Investasi</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Arus Bersih (Net)</span>
            <span className={`text-xl font-black block mt-1 font-mono ${summary.net >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {formatCurrency(summary.net)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={onOpenAddTransaction}
              className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Transaksi</span>
            </button>
            <button
              onClick={() => exportTransactionsCSV(filteredTransactions)}
              title="Export CSV / Excel"
              className="py-1.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Card */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari transaksi, pupuk, vendor, nota..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Quick Type Segmented Buttons */}
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setTypeFilter('pemasukan')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                typeFilter === 'pemasukan' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pemasukan
            </button>
            <button
              onClick={() => setTypeFilter('operasional')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                typeFilter === 'operasional' ? 'bg-rose-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Operasional
            </button>
            <button
              onClick={() => setTypeFilter('investasi')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                typeFilter === 'investasi' ? 'bg-amber-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Investasi
            </button>
            <button
              onClick={() => setTypeFilter('payroll')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                typeFilter === 'payroll' ? 'bg-indigo-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gaji / Payroll
            </button>
          </div>
        </div>

        {/* Additional Filters: Cycle, Tunnel, Dates */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 block mb-1">Siklus</label>
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800"
            >
              <option value="all">Semua Siklus</option>
              <option value="none">Tanpa Siklus</option>
              {db.cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} - {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 block mb-1">Tunnel</label>
            <select
              value={tunnelFilter}
              onChange={(e) => setTunnelFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800"
            >
              <option value="all">Semua Lokasi / Tunnel</option>
              {(db.tunnels || []).map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name} ({t.widthM} x {t.lengthM} m)
                </option>
              ))}
              <option value="Kedua Tunnel">Semua / Gabungan Tunnel</option>
              <option value="Umum / Fasilitas">Umum / Fasilitas</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 block mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 block mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Kategori & Keterangan</th>
                <th className="py-3.5 px-4">Siklus & Tunnel</th>
                <th className="py-3.5 px-4">Metode</th>
                <th className="py-3.5 px-4 text-right">Nominal</th>
                <th className="py-3.5 px-4 text-center">Bukti</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm">Tidak ada transaksi ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((trx) => {
                  const isIncome = trx.type === 'pemasukan';
                  const isInvestment = trx.expenseGroup === 'investasi';
                  return (
                    <tr key={trx.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block">{formatDate(trx.date)}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{trx.id}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{trx.category}</span>
                          {trx.subcategory && (
                            <span className="text-slate-500 font-normal"> · {trx.subcategory}</span>
                          )}
                          {isInvestment && (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Investasi
                            </span>
                          )}
                          {(trx.category === 'Gaji Karyawan / Payroll' || trx.id.startsWith('TRX-PAY-')) && (
                            <button
                              type="button"
                              onClick={() => onNavigate?.('hr-payroll', 'payroll')}
                              className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                              title="Buka Data Payroll di Modul HR"
                            >
                              <span>Payroll Staf</span>
                            </button>
                          )}
                        </div>
                        {trx.note && <p className="text-slate-500 text-[11px] mt-0.5 max-w-xs">{trx.note}</p>}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 block">
                          {trx.cycleId ? trx.cycleId : <span className="text-slate-400 italic">Umum</span>}
                        </span>
                        <span className="text-[11px] text-slate-500">{trx.tunnel}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-slate-600 font-medium">{trx.paymentMethod}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-black text-sm font-mono ${
                            isIncome ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isIncome ? '+ ' : '- '}
                          {formatCurrency(trx.amount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {trx.receiptUrl ? (
                          <button
                            onClick={() => setPreviewImage(trx.receiptUrl || null)}
                            className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                            title="Lihat foto nota"
                          >
                            <FileImage className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditTransaction(trx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition cursor-pointer"
                            title="Edit Transaksi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(trx.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-slate-100 transition cursor-pointer"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Transaction Cards (Phones) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 p-4">
              <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-xs">Tidak ada transaksi ditemukan</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Sesuaikan filter atau kata kunci</p>
            </div>
          ) : (
            filteredTransactions.map((trx) => {
              const isIncome = trx.type === 'pemasukan';
              const isInvestment = trx.expenseGroup === 'investasi';
              const isPayroll = trx.category === 'Gaji Karyawan / Payroll' || trx.id.startsWith('TRX-PAY-');
              return (
                <div key={trx.id} className="p-3.5 space-y-2 hover:bg-slate-50/70 transition">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isIncome
                            ? 'bg-emerald-100 text-emerald-700'
                            : isPayroll
                            ? 'bg-indigo-100 text-indigo-700'
                            : isInvestment
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isIncome ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900 truncate">{trx.category}</span>
                          {isPayroll && (
                            <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              Payroll
                            </span>
                          )}
                          {isInvestment && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Investasi
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {formatDate(trx.date)} · {trx.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`font-black text-sm block font-mono ${
                          isIncome ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isIncome ? '+ ' : '- '}
                        {formatCurrency(trx.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium mt-0.5">
                        {trx.tunnel} {trx.cycleId ? ` · ${trx.cycleId}` : ''}
                      </span>
                    </div>
                  </div>
                  {trx.note && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {trx.note}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      {trx.receiptUrl && (
                        <button
                          onClick={() => setPreviewImage(trx.receiptUrl || null)}
                          className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
                        >
                          <FileImage className="w-3.5 h-3.5" />
                          <span>Nota</span>
                        </button>
                      )}
                      {isPayroll && (
                        <button
                          onClick={() => onNavigate?.('hr-payroll', 'payroll')}
                          className="flex items-center gap-1 text-[11px] text-indigo-700 font-semibold px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 cursor-pointer"
                        >
                          <span>Slip Gaji</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditTransaction(trx)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                        title="Edit Transaksi"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(trx.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95 cursor-pointer"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-slate-900">Hapus Transaksi Ini?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Data transaksi akan dihapus dari sistem dan saldo kas akan otomatis disesuaikan kembali.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <span className="font-bold text-xs text-slate-900">Foto Bukti Nota</span>
              <button onClick={() => setPreviewImage(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-slate-100 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img src={previewImage} alt="Bukti nota" className="max-w-full h-auto rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
