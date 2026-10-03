import React, { useState, useMemo } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { HarvestRecord, TunnelType } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters';
import { exportHarvestCSV } from '../services/exportService';
import {
  Plus,
  Download,
  Trash2,
  Edit2,
  Scale,
  X,
  Award,
} from 'lucide-react';

interface HarvestSalesPageProps {
  onNavigate?: (tab: string, subtab?: string) => void;
}

export const HarvestSalesPage: React.FC<HarvestSalesPageProps> = ({ onNavigate }) => {
  const { db, addHarvest, updateHarvest, deleteHarvest } = useGreenhouse();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<HarvestRecord | null>(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cycleId, setCycleId] = useState(db.cycles[0]?.id || 'S001');
  const [tunnel, setTunnel] = useState<TunnelType>('Tunnel 1');
  const [totalWeightKg, setTotalWeightKg] = useState('');
  const [gradeAKg, setGradeAKg] = useState('');
  const [gradeBKg, setGradeBKg] = useState('');
  const [gradeCKg, setGradeCKg] = useState('');
  const [pricePerKg, setPricePerKg] = useState('35000');
  const [buyer, setBuyer] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'Lunas' | 'Belum lunas' | 'Sebagian'>('Lunas');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const calculatedRevenue = (Number(totalWeightKg) || 0) * (Number(pricePerKg) || 0);

  const openAddModal = () => {
    setEditingHarvest(null);
    setDate(new Date().toISOString().slice(0, 10));
    setCycleId(db.cycles[0]?.id || 'S001');
    setTunnel('Tunnel 1');
    setTotalWeightKg('');
    setGradeAKg('');
    setGradeBKg('');
    setGradeCKg('');
    setPricePerKg('35000');
    setBuyer('');
    setPaymentStatus('Lunas');
    setNotes('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (h: HarvestRecord) => {
    setEditingHarvest(h);
    setDate(h.date);
    setCycleId(h.cycleId);
    setTunnel(h.tunnel);
    setTotalWeightKg(String(h.totalWeightKg));
    setGradeAKg(String(h.gradeAKg));
    setGradeBKg(String(h.gradeBKg));
    setGradeCKg(String(h.gradeCKg));
    setPricePerKg(String(h.pricePerKg));
    setBuyer(h.buyer);
    setPaymentStatus(h.paymentStatus);
    setNotes(h.notes || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleGradeChange = (grade: 'A' | 'B' | 'C', valStr: string) => {
    const val = Number(valStr) || 0;
    const a = grade === 'A' ? val : Number(gradeAKg) || 0;
    const b = grade === 'B' ? val : Number(gradeBKg) || 0;
    const c = grade === 'C' ? val : Number(gradeCKg) || 0;
    if (grade === 'A') setGradeAKg(valStr);
    if (grade === 'B') setGradeBKg(valStr);
    if (grade === 'C') setGradeCKg(valStr);
    const sum = a + b + c;
    if (sum > 0) {
      setTotalWeightKg(String(sum));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const weight = Number(totalWeightKg) || 0;
    const price = Number(pricePerKg) || 0;
    if (weight <= 0) {
      setError('Total berat panen harus lebih besar dari 0 kg');
      return;
    }
    if (price <= 0) {
      setError('Harga per kg harus lebih besar dari Rp 0');
      return;
    }

    const payload = {
      date,
      cycleId,
      tunnel,
      totalWeightKg: weight,
      gradeAKg: Number(gradeAKg) || 0,
      gradeBKg: Number(gradeBKg) || 0,
      gradeCKg: Number(gradeCKg) || 0,
      pricePerKg: price,
      buyer: buyer.trim() || 'Pembeli Umum',
      paymentStatus,
      notes: notes.trim() || undefined,
    };

    if (editingHarvest) {
      await updateHarvest(editingHarvest.id, payload);
    } else {
      await addHarvest(payload);
    }
    setIsModalOpen(false);
  };

  const summary = useMemo(() => {
    let totalKg = 0;
    let totalRev = 0;
    let totalA = 0;
    let totalB = 0;
    let totalC = 0;
    db.harvests.forEach((h) => {
      totalKg += Number(h.totalWeightKg) || 0;
      totalRev += Number(h.totalRevenue) || 0;
      totalA += Number(h.gradeAKg) || 0;
      totalB += Number(h.gradeBKg) || 0;
      totalC += Number(h.gradeCKg) || 0;
    });
    const avgPrice = totalKg > 0 ? Math.round(totalRev / totalKg) : 0;
    const gradeAPercent = totalKg > 0 ? (totalA / totalKg) * 100 : 0;
    return { totalKg, totalRev, totalA, totalB, totalC, avgPrice, gradeAPercent };
  }, [db.harvests]);

  return (
    <div className="space-y-6 pb-20">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Panen Melon
          </span>
          <span className="text-xl font-black text-slate-900 block mt-1 font-mono">
            {formatNumber(summary.totalKg)} <span className="text-xs font-bold text-slate-500">KG</span>
          </span>
          <span className="text-[11px] text-slate-400">Akumulasi seluruh siklus</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Omzet Penjualan
          </span>
          <span className="text-xl font-black text-emerald-700 block mt-1 font-mono">
            {formatCurrency(summary.totalRev)}
          </span>
          <span className="text-[11px] text-emerald-700/80">Hasil riil timbangan</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Harga Rata-rata
          </span>
          <span className="text-xl font-black text-blue-700 block mt-1 font-mono">
            {formatCurrency(summary.avgPrice)} <span className="text-xs font-normal text-slate-500">/ kg</span>
          </span>
          <span className="text-[11px] text-slate-400">Rerata seluruh grade</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Persentase Grade A
          </span>
          <span className="text-xl font-black text-emerald-800 block mt-1 font-mono">
            {summary.gradeAPercent.toFixed(1)}%
          </span>
          <span className="text-[11px] text-slate-400">
            {formatNumber(summary.totalA)} kg grade super
          </span>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Catatan Panen & Penjualan Melon</h3>
          <p className="text-xs text-slate-500">Tiap panen otomatis masuk ke siklus dan menambah omzet kas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportHarvestCSV(db.harvests)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Catat Panen Baru</span>
          </button>
        </div>
      </div>

      {/* Harvest Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Tanggal & ID</th>
                <th className="py-3.5 px-4">Siklus & Tunnel</th>
                <th className="py-3.5 px-4 text-center">Grade A</th>
                <th className="py-3.5 px-4 text-center">Grade B</th>
                <th className="py-3.5 px-4 text-center">Grade C</th>
                <th className="py-3.5 px-4 text-right">Total Kg</th>
                <th className="py-3.5 px-4 text-right">Harga / Kg</th>
                <th className="py-3.5 px-4 text-right">Total Omzet</th>
                <th className="py-3.5 px-4">Pembeli & Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.harvests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <Scale className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm">Belum ada data panen yang dicatat</p>
                    <p className="text-xs text-slate-400 mt-1">Klik tombol "+ Catat Panen Baru" untuk mencatat hasil panen melon.</p>
                  </td>
                </tr>
              ) : (
                db.harvests.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">{formatDate(h.date)}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{h.id}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {h.cycleId}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-1">{h.tunnel}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700 whitespace-nowrap font-mono">
                      {formatNumber(h.gradeAKg)} kg
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600 whitespace-nowrap font-mono">
                      {formatNumber(h.gradeBKg)} kg
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400 whitespace-nowrap font-mono">
                      {formatNumber(h.gradeCKg)} kg
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap font-mono">
                      {formatNumber(h.totalWeightKg)} kg
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                      {formatCurrency(h.pricePerKg)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-700 whitespace-nowrap font-mono">
                      {formatCurrency(h.totalRevenue)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 block">{h.buyer}</span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          h.paymentStatus === 'Lunas'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {h.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onNavigate?.('hr-payroll', 'payroll')}
                          className="p-1 rounded-md text-amber-600 hover:text-amber-800 hover:bg-amber-50 cursor-pointer"
                          title="Beri Bonus Panen Staf di Payroll"
                        >
                          <Award className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(h)}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteHarvest(h.id)}
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

      {/* Add / Edit Harvest Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col my-auto text-xs">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                {editingHarvest ? 'Ubah Catatan Panen' : 'Catat Panen & Penjualan Melon'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto">
              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Panen</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Siklus Tanam Terkait</label>
                  <select
                    value={cycleId}
                    onChange={(e) => setCycleId(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  >
                    {db.cycles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tunnel</label>
                <select
                  value={tunnel}
                  onChange={(e) => setTunnel(e.target.value as TunnelType)}
                  className="w-full p-2 rounded-lg border border-slate-300"
                >
                  {(db.tunnels || []).map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} ({t.widthM} x {t.lengthM} m)
                    </option>
                  ))}
                  <option value="Kedua Tunnel">Semua / Gabungan Tunnel</option>
                </select>
              </div>

              {/* Grade Breakdown Input */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block mb-2">Rincian Timbangan per Grade</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-emerald-800 block mb-1">Grade A (Super)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={gradeAKg}
                      onChange={(e) => handleGradeChange('A', e.target.value)}
                      placeholder="0 kg"
                      className="w-full p-2 rounded-lg border border-slate-300 font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">Grade B</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={gradeBKg}
                      onChange={(e) => handleGradeChange('B', e.target.value)}
                      placeholder="0 kg"
                      className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">Grade C</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={gradeCKg}
                      onChange={(e) => handleGradeChange('C', e.target.value)}
                      placeholder="0 kg"
                      className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Total Berat Timbangan:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      required
                      value={totalWeightKg}
                      onChange={(e) => setTotalWeightKg(e.target.value)}
                      className="w-24 p-1.5 rounded-lg border border-slate-300 text-right font-black text-sm font-mono"
                    />
                    <span className="font-bold">KG</span>
                  </div>
                </div>
              </div>

              {/* Harga & Omzet */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Harga Jual per KG (Rp)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={pricePerKg}
                    onChange={(e) => setPricePerKg(e.target.value)}
                    placeholder="35000"
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total Omzet Penjualan</label>
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-sm text-right font-mono">
                    {formatCurrency(calculatedRevenue)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Pembeli / Pasar</label>
                  <input
                    type="text"
                    required
                    value={buyer}
                    onChange={(e) => setBuyer(e.target.value)}
                    placeholder="Supermarket, Toko Buah, Pengepul..."
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Pembayaran</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  >
                    <option value="Lunas">Lunas (Cash / Transfer)</option>
                    <option value="Belum lunas">Belum Lunas (Tempo)</option>
                    <option value="Sebagian">Sebagian (DP Masuk)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Kadar brix rata-rata, nomor faktur pengiriman, dsb."
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

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
                  {editingHarvest ? 'Simpan Perubahan' : 'Catat Panen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
