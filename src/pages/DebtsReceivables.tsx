import React, { useState } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { DebtReceivable } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Clock,
  X,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export const DebtsReceivablesPage: React.FC = () => {
  const { db, metrics, addDebt, updateDebt, deleteDebt, payDebt } = useGreenhouse();
  const [activeTab, setActiveTab] = useState<'hutang' | 'piutang'>('hutang');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtReceivable | null>(null);
  const [selectedForPayment, setSelectedForPayment] = useState<DebtReceivable | null>(null);

  // Form states
  const [type, setType] = useState<'hutang' | 'piutang'>('hutang');
  const [counterparty, setCounterparty] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Payment form state
  const [additionalPayment, setAdditionalPayment] = useState('');
  const [payError, setPayError] = useState<string | null>(null);
  const [paymentNature, setPaymentNature] = useState<'balance_only' | 'operasional' | 'investasi' | 'revenue'>(
    'balance_only'
  );
  // Hutang/pinjaman yang uangnya masuk ke kas (mis. pinjaman modal)
  const [receivedToCash, setReceivedToCash] = useState(false);

  const openAddModal = (defaultType: 'hutang' | 'piutang' = activeTab) => {
    setEditingDebt(null);
    setType(defaultType);
    setCounterparty('');
    setDate(new Date().toISOString().slice(0, 10));
    const due = new Date();
    due.setDate(due.getDate() + 30);
    setDueDate(due.toISOString().slice(0, 10));
    setAmount('');
    setPaidAmount('0');
    setDescription('');
    setReceivedToCash(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (d: DebtReceivable) => {
    setEditingDebt(d);
    setType(d.type);
    setCounterparty(d.counterparty);
    setDate(d.date);
    setDueDate(d.dueDate);
    setAmount(String(d.amount));
    setPaidAmount(String(d.paidAmount));
    setDescription(d.description || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openPaymentModal = (d: DebtReceivable) => {
    setSelectedForPayment(d);
    setAdditionalPayment('');
    setPayError(null);
    setPaymentNature(d.type === 'piutang' ? 'balance_only' : 'balance_only');
    setIsPayModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const amt = Number(amount) || 0;
    const paid = Number(paidAmount) || 0;
    if (!counterparty.trim()) {
      setFormError('Nama pihak terkait (Supplier / Pelanggan) wajib diisi');
      return;
    }
    if (amt <= 0) {
      setFormError('Nominal harus lebih besar dari Rp 0');
      return;
    }

    const payload = {
      type,
      counterparty: counterparty.trim(),
      date,
      dueDate,
      amount: amt,
      paidAmount: paid,
      description: description.trim() || undefined,
      receivedToCash: type === 'hutang' ? receivedToCash : false,
    };

    if (editingDebt) {
      await updateDebt(editingDebt.id, payload);
    } else {
      await addDebt(payload);
    }
    setIsModalOpen(false);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(null);
    if (!selectedForPayment) return;
    const addPay = Number(additionalPayment) || 0;
    if (addPay <= 0) {
      setPayError('Nominal pembayaran harus lebih besar dari Rp 0');
      return;
    }
    if (addPay > selectedForPayment.remainingAmount) {
      setPayError(`Nominal melebihi sisa tagihan (${formatCurrency(selectedForPayment.remainingAmount)})`);
      return;
    }

    await payDebt(selectedForPayment.id, addPay, paymentNature);
    setIsPayModalOpen(false);
  };

  const filteredList = db.debts.filter((d) => d.type === activeTab);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Hutang Belum Lunas */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                Total Hutang Belum Lunas
              </span>
            </div>
            <h3 className="text-2xl font-black text-rose-700 mt-1 font-mono">
              {formatCurrency(metrics.totalHutang)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Kewajiban bayar ke supplier pupuk & bibit</p>
          </div>
          <button
            onClick={() => openAddModal('hutang')}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Hutang</span>
          </button>
        </div>

        {/* Piutang Belum Tertagih */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Total Piutang Belum Tertagih
              </span>
            </div>
            <h3 className="text-2xl font-black text-emerald-800 mt-1 font-mono">
              {formatCurrency(metrics.totalPiutang)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Tagihan tempo ke toko buah & pelanggan</p>
          </div>
          <button
            onClick={() => openAddModal('piutang')}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Piutang</span>
          </button>
        </div>
      </div>

      {/* Segmented Control Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('hutang')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'hutang'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Daftar Hutang (Supplier)</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-md font-mono">
            {db.debts.filter((d) => d.type === 'hutang').length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('piutang')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'piutang'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Daftar Piutang (Pelanggan)</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-md font-mono">
            {db.debts.filter((d) => d.type === 'piutang').length}
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Tanggal & Jatuh Tempo</th>
                <th className="py-3.5 px-4">{activeTab === 'hutang' ? 'Supplier' : 'Pelanggan'}</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4 text-right">Total Tagihan</th>
                <th className="py-3.5 px-4 text-right">Sudah Dibayar</th>
                <th className="py-3.5 px-4 text-right">Sisa Nominal</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm">Tidak ada catatan {activeTab}</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">{formatDate(d.date)}</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Tempo: {formatDate(d.dueDate)}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-900">
                      {d.counterparty}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                      {d.description || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap font-mono">
                      {formatCurrency(d.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-700 whitespace-nowrap font-mono">
                      {formatCurrency(d.paidAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-rose-700 whitespace-nowrap font-mono">
                      {formatCurrency(d.remainingAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          d.status === 'Lunas'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : d.status === 'Sebagian'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {d.status !== 'Lunas' && (
                          <button
                            onClick={() => openPaymentModal(d)}
                            className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold cursor-pointer"
                          >
                            + Bayar
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(d)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteDebt(d.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full my-auto text-xs">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                {editingDebt ? 'Ubah Catatan' : `Catat ${type === 'hutang' ? 'Hutang ke Supplier' : 'Piutang Pelanggan'}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {formError}
                </div>
              )}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">
                    Nama {type === 'hutang' ? 'Supplier / Toko' : 'Pelanggan / Karyawan (Kasbon)'}
                  </label>
                  {type === 'piutang' && (db.employees || []).length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setCounterparty(`Kasbon: ${e.target.value}`);
                          setDescription(`Pinjaman / kasbon karyawan ${e.target.value}`);
                        }
                      }}
                      className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 outline-none"
                    >
                      <option value="">+ Pilih Staf (Kasbon)</option>
                      {(db.employees || [])
                        .filter((e) => !e.isDeleted)
                        .map((emp) => (
                          <option key={emp.id} value={emp.name}>
                            {emp.name} ({emp.position})
                          </option>
                        ))}
                    </select>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  placeholder={
                    type === 'hutang'
                      ? 'Contoh: Toko Pupuk Makmur, CV Agroniaga...'
                      : 'Contoh: Toko Buah Segar, atau pilih staf kasbon di atas'
                  }
                  className="w-full p-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Transaksi</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Jatuh Tempo</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total Tagihan (Rp)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sudah Dibayar (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0"
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keterangan Transaksi</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Pengambilan pupuk tempo 30 hari, nota panen..."
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
              {type === 'hutang' && !editingDebt && (
                <label className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receivedToCash}
                    onChange={(e) => setReceivedToCash(e.target.checked)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <span>
                    <b>Uang pinjaman ini masuk ke kas (menambah saldo)</b>
                    <span className="block text-[10px] text-blue-700 mt-0.5">
                      Centang untuk <b>pinjaman modal</b> yang dananya Anda terima — sistem otomatis mencatat pemasukan
                      "Pinjaman" ke kas. Biarkan kosong untuk hutang pembelian barang (tempo).
                    </span>
                  </span>
                </label>
              )}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 cursor-pointer"
                >
                  {editingDebt ? 'Simpan Perubahan' : 'Catat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPayModalOpen && selectedForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full my-auto text-xs">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                Catat Pembayaran ({selectedForPayment.counterparty})
              </h3>
              <button onClick={() => setIsPayModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-4 space-y-3">
              {payError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {payError}
                </div>
              )}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Tagihan:</span>
                  <span className="font-bold font-mono">{formatCurrency(selectedForPayment.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sudah Terbayar:</span>
                  <span className="font-semibold text-emerald-700 font-mono">{formatCurrency(selectedForPayment.paidAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="text-slate-700 font-bold">Sisa Tagihan:</span>
                  <span className="font-black text-rose-700 font-mono">{formatCurrency(selectedForPayment.remainingAmount)}</span>
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nominal Pembayaran Sekarang (Rp)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={additionalPayment}
                  onChange={(e) => setAdditionalPayment(e.target.value)}
                  placeholder={`Maks ${selectedForPayment.remainingAmount}`}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-black text-base font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Perlakuan Pembayaran</label>
                {selectedForPayment.type === 'hutang' ? (
                  <select
                    value={paymentNature}
                    onChange={(e) => setPaymentNature(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  >
                    <option value="balance_only">Cicilan hutang — sudah tercatat (hanya mengurangi kas)</option>
                    <option value="operasional">Pengeluaran baru — biaya operasional (masuk HPP)</option>
                    <option value="investasi">Pengeluaran baru — investasi (capex)</option>
                  </select>
                ) : (
                  <select
                    value={paymentNature}
                    onChange={(e) => setPaymentNature(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  >
                    <option value="balance_only">Penerimaan piutang — sudah tercatat (hanya menambah kas)</option>
                    <option value="revenue">Penjualan baru — hitung sebagai omzet</option>
                  </select>
                )}
                <p className="text-[10px] text-slate-500 mt-1">
                  {selectedForPayment.type === 'hutang'
                    ? 'Pilih "sudah tercatat" bila pembeliannya pernah dicatat (metode Hutang) agar biaya tidak dobel. Pembayaran otomatis membuat transaksi kas keluar.'
                    : 'Pilih "sudah tercatat" bila penjualannya pernah dicatat agar omzet tidak dobel. Penerimaan otomatis membuat transaksi kas masuk.'}
                </p>
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 cursor-pointer"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
