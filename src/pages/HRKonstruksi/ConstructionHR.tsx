import React, { useMemo, useState } from 'react';
import { useGreenhouse } from '../../context/GreenhouseContext';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import { RegisterStaffModal } from '../HRPayroll/RegisterStaffModal';
import { Employee } from '../../types';
import {
  HardHat,
  Users,
  Wallet,
  CalendarDays,
  Plus,
  Pencil,
  X,
  CheckCircle2,
  Info,
} from 'lucide-react';

export const ConstructionHRPage: React.FC = () => {
  const { db, addInvestment, addToast } = useGreenhouse();

  // ===== Pekerja konstruksi (Area Kerja = Konstruksi) =====
  const workers = useMemo(
    () => (db.employees || []).filter((e) => e.workArea === 'Konstruksi' && !e.isDeleted),
    [db.employees]
  );

  // ===== Catatan upah: histori Investasi + pembayaran dari modul ini =====
  const wageItems = useMemo(() => {
    return (db.investments || [])
      .filter((i) => /gaji|upah/i.test(`${i.itemName || ''} ${i.notes || ''}`))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [db.investments]);

  // Nama pekerja yang cocok pada sebuah catatan upah
  const matchedWorkerNames = (item: { itemName?: string; notes?: string }) => {
    const text = `${item.itemName || ''} ${item.notes || ''}`.toLowerCase();
    return workers.filter((w) => text.includes((w.name || '').toLowerCase())).map((w) => w.name);
  };

  // ===== Rekap per pekerja (pembayaran gabungan dibagi rata) =====
  const recap = useMemo(() => {
    return workers
      .map((w) => {
        const wName = (w.name || '').toLowerCase();
        let total = 0;
        let entries = 0;
        let lastDate = '';
        wageItems.forEach((inv) => {
          const text = `${inv.itemName || ''} ${inv.notes || ''}`.toLowerCase();
          if (!text.includes(wName)) return;
          const matched = workers.filter((x) => text.includes((x.name || '').toLowerCase())).length || 1;
          total += (Number(inv.totalAmount) || 0) / matched;
          entries += 1;
          if ((inv.date || '') > lastDate) lastDate = inv.date || '';
        });
        return { worker: w, total: Math.round(total), entries, lastDate };
      })
      .sort((a, b) => b.total - a.total);
  }, [workers, wageItems]);

  const totalPaid = Math.round(wageItems.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0));
  const totalDays = wageItems
    .filter((i) => i.unit === 'Hari')
    .reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const lastPaymentDate = wageItems[0]?.date || '';
  const lastPaymentAmount = Number(wageItems[0]?.totalAmount) || 0;

  // ===== Modal tambah/edit pekerja =====
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Employee | null>(null);

  // ===== Form pembayaran upah =====
  const [payWorkerId, setPayWorkerId] = useState<string | null>(null);
  const [payDays, setPayDays] = useState('1');
  const [payRate, setPayRate] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const payWorker = workers.find((w) => w.id === payWorkerId) || null;

  const openPayModal = (w: Employee) => {
    setPayWorkerId(w.id);
    setPayDays('1');
    setPayRate(String(w.dailyRate || w.baseSalary || 0));
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayNote('');
  };

  const submitPayment = async () => {
    if (!payWorker) return;
    const days = Number(payDays) || 0;
    const rate = Number(payRate) || 0;
    if (days <= 0 || rate <= 0) {
      addToast('Jumlah hari dan tarif harus lebih dari 0', 'error');
      return;
    }
    setIsPaying(true);
    const isTukang = /tukang/i.test(payWorker.position || '');
    const ok = await addInvestment({
      date: payDate,
      category: 'Pembangunan',
      itemName: isTukang ? 'Gaji tukang' : 'Gaji kuli',
      quantity: days,
      unit: 'Hari',
      unitPrice: rate,
      supplier: payWorker.name,
      tunnel: 'Semua Greenhouse',
      notes: payNote.trim() ? `${payWorker.name} - ${payNote.trim()}` : `Upah ${payWorker.name} ${days} hari`,
    });
    setIsPaying(false);
    if (ok) {
      addToast(`Upah ${payWorker.name} (${days} hari) tercatat sebagai Investasi Pembangunan`, 'success');
      setPayWorkerId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-900 via-emerald-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <HardHat className="w-4 h-4" />
            <span>Fase Konstruksi Pembangunan Greenhouse</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">HR &amp; Payroll Konstruksi</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Kelola tukang &amp; kuli pembangunan: upah harian, rekap per pekerja, dan riwayat pembayaran. Semua
            pembayaran otomatis tercatat sebagai{' '}
            <strong className="text-amber-300">Investasi (Pembangunan/capex)</strong> — tidak masuk biaya operasional
            &amp; HPP panen.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingWorker(null);
            setIsRegisterOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-lg transition active:scale-95 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Tambah Pekerja</span>
        </button>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pekerja Konstruksi</span>
            <HardHat className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-slate-900">{workers.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Tukang &amp; kuli terdaftar</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Upah Dibayar</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-emerald-700">{formatCurrency(totalPaid)}</div>
          <p className="text-[11px] text-slate-500 mt-1">{wageItems.length} catatan pembayaran</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Akumulasi Hari Kerja</span>
            <CalendarDays className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-slate-900">{formatNumber(totalDays)} Hari</div>
          <p className="text-[11px] text-slate-500 mt-1">Dari catatan upah harian</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pembayaran Terakhir</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-sm sm:text-base font-black font-mono text-slate-900">
            {lastPaymentDate ? formatDate(lastPaymentDate) : '—'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {lastPaymentAmount > 0 ? formatCurrency(lastPaymentAmount) : 'Belum ada pembayaran'}
          </p>
        </div>
      </div>

      {/* Daftar Pekerja */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-600" />
            <span>Daftar Pekerja Konstruksi</span>
          </h3>
          <span className="text-[11px] text-slate-500">{workers.length} pekerja terdaftar</span>
        </div>

        {recap.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            Belum ada pekerja konstruksi. Klik <strong>Tambah Pekerja</strong> untuk mendaftarkan tukang/kuli.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {recap.map(({ worker: w, total, entries, lastDate }) => (
              <div key={w.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {w.avatarUrl ? (
                      <img src={w.avatarUrl} alt={w.name} className="w-9 h-9 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <HardHat className="w-4 h-4 text-amber-700" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{w.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{w.position} · Staf {w.employmentStatus}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 font-bold shrink-0">
                    Konstruksi
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Tarif Harian</span>
                    <span className="font-bold text-slate-900 font-mono">{formatCurrency(w.dailyRate || 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total Dibayar</span>
                    <span className="font-black text-emerald-700 font-mono">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>{entries} catatan</span>
                    <span>{lastDate ? `Terakhir: ${formatDate(lastDate)}` : 'Belum dibayar'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openPayModal(w)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition active:scale-95 cursor-pointer"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Bayar Upah</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingWorker(w);
                      setIsRegisterOpen(true);
                    }}
                    title="Edit data pekerja"
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-white transition cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Riwayat Pembayaran */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>Riwayat Pembayaran Upah</span>
          </h3>
          <span className="text-[11px] text-slate-500">{wageItems.length} catatan · total {formatCurrency(totalPaid)}</span>
        </div>

        {wageItems.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Belum ada catatan pembayaran upah.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="text-left p-2 font-bold">Tanggal</th>
                  <th className="text-left p-2 font-bold">Keterangan</th>
                  <th className="text-right p-2 font-bold">Volume</th>
                  <th className="text-right p-2 font-bold">Tarif</th>
                  <th className="text-right p-2 font-bold">Total</th>
                  <th className="text-left p-2 font-bold">Pekerja</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {wageItems.map((inv) => {
                  const names = matchedWorkerNames(inv);
                  return (
                    <tr key={inv.id} className="border-b border-slate-100">
                      <td className="p-2 whitespace-nowrap">{formatDate(inv.date)}</td>
                      <td className="p-2 font-sans text-slate-700">{inv.itemName}</td>
                      <td className="p-2 text-right whitespace-nowrap">
                        {formatNumber(Number(inv.quantity) || 0)} {inv.unit}
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">{formatCurrency(inv.unitPrice)}</td>
                      <td className="p-2 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="p-2 font-sans text-slate-600">
                        {names.length > 0 ? names.join(', ') : <span className="text-slate-400">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info akuntansi */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-bold">Pembayaran upah di modul ini otomatis menjadi Investasi</p>
          <p className="mt-0.5 text-amber-800">
            Setiap pembayaran membuat catatan di <strong>Investasi → Pembangunan</strong> dan mengurangi saldo kas,
            serta <strong>tidak</strong> dihitung sebagai biaya operasional/HPP panen. Rekap pekerja mencocokkan nama
            pada catatan investasi; pembayaran gabungan (mis. 2 tukang sekaligus) dibagi rata.
          </p>
        </div>
      </div>

      {/* Modal Bayar Upah */}
      {payWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-100">
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5 h-5" />
                <div>
                  <h3 className="text-sm font-extrabold">Bayar Upah Konstruksi</h3>
                  <p className="text-[11px] text-emerald-100">
                    {payWorker.name} · {payWorker.position}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPayWorkerId(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Bayar</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jumlah Hari</label>
                  <input
                    type="number"
                    min="1"
                    value={payDays}
                    onChange={(e) => setPayDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tarif / Hari (Rp)</label>
                  <input
                    type="number"
                    value={payRate}
                    onChange={(e) => setPayRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total Upah</label>
                  <div className="w-full px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 font-black text-emerald-800 font-mono">
                    {formatCurrency((Number(payDays) || 0) * (Number(payRate) || 0))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan (opsional)</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="mis. pasang gully, cor pondasi, angkat bambu..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Otomatis dicatat sebagai <strong>Investasi (Pembangunan)</strong> — bukan biaya operasional/HPP.
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setPayWorkerId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={submitPayment}
                  disabled={isPaying}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm transition disabled:opacity-60 cursor-pointer"
                >
                  {isPaying ? 'Menyimpan...' : 'Bayar & Catat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal tambah/edit pekerja */}
      <RegisterStaffModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        employeeToEdit={editingWorker}
        defaultWorkArea="Konstruksi"
      />
    </div>
  );
};
