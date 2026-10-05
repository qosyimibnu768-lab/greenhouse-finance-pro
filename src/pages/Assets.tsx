import React, { useMemo, useState } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { Asset } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { calcAssetDepreciation, formatMonths } from '../utils/depreciation';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  X,
  TrendingDown,
  Wallet,
  CalendarClock,
} from 'lucide-react';

// Kategori aset disamakan dengan fitur Investasi Greenhouse
const ASSET_CATEGORIES = [
  'Pembangunan',
  'Instalasi',
  'Listrik & Air',
  'Peralatan',
  'Lainnya',
];

// Pemetaan kategori lama (data yang sudah tersimpan) ke kategori baru
const LEGACY_ASSET_CATEGORY_MAP: Record<string, string> = {
  Greenhouse: 'Pembangunan',
  'Instalasi DFT': 'Instalasi',
  'Pompa & Kelistrikan': 'Listrik & Air',
  'Alat Ukur & Sensor': 'Peralatan',
  'Peralatan Kebun': 'Peralatan',
};

const normalizeAssetCategory = (value: string): string => LEGACY_ASSET_CATEGORY_MAP[value] || value;

export const AssetsPage: React.FC = () => {
  const { db, metrics, addAsset, updateAsset, deleteAsset } = useGreenhouse();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<any>('Pembangunan');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [condition, setCondition] = useState<'Sangat Baik' | 'Baik' | 'Perlu Perbaikan' | 'Rusak'>('Baik');
  const [economicLifeYears, setEconomicLifeYears] = useState('5');
  const [location, setLocation] = useState('Greenhouse 1 & 2');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ===== Penyusutan otomatis (garis lurus) =====
  const depreciationList = useMemo(
    () => (db.assets || []).map((a) => ({ asset: a, dep: calcAssetDepreciation(a) })),
    [db.assets]
  );

  const depTotals = useMemo(() => {
    return depreciationList.reduce(
      (acc, { dep }) => ({
        acquisition: acc.acquisition + dep.acquisitionValue,
        accumulated: acc.accumulated + dep.accumulatedDepreciation,
        bookValue: acc.bookValue + dep.bookValue,
        monthly: acc.monthly + (dep.isFullyDepreciated ? 0 : dep.monthlyDepreciation),
      }),
      { acquisition: 0, accumulated: 0, bookValue: 0, monthly: 0 }
    );
  }, [depreciationList]);

  const openAddModal = () => {
    setEditingAsset(null);
    setName('');
    setCategory('Pembangunan');
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setPurchasePrice('');
    setQuantity('1');
    setCondition('Baik');
    setEconomicLifeYears('5');
    setLocation('Greenhouse 1 & 2');
    setNotes('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (a: Asset) => {
    setEditingAsset(a);
    setName(a.name);
    setCategory(normalizeAssetCategory(a.category));
    setPurchaseDate(a.purchaseDate);
    setPurchasePrice(String(a.purchasePrice));
    setQuantity(String(a.quantity));
    setCondition(a.condition);
    setEconomicLifeYears(String(a.economicLifeYears));
    setLocation(a.location);
    setNotes(a.notes || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const price = Number(purchasePrice) || 0;
    const qty = Number(quantity) || 1;
    const lifeYears = Number(economicLifeYears) || 1;

    if (!name.trim()) {
      setError('Nama aset wajib diisi');
      return;
    }
    if (price <= 0) {
      setError('Harga perolehan harus lebih dari Rp 0');
      return;
    }

    const payload = {
      name: name.trim(),
      category,
      purchaseDate,
      purchasePrice: price,
      quantity: qty,
      condition,
      economicLifeYears: lifeYears,
      location: location.trim() || 'Greenhouse Utama',
      notes: notes.trim() || undefined,
    };

    if (editingAsset) {
      await updateAsset(editingAsset.id, payload);
    } else {
      await addAsset(payload);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <span className="text-[10px] font-semibold text-purple-800 uppercase tracking-wider block">
            Inventarisasi Aset Tetap Greenhouse
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
            {formatCurrency(metrics.nilaiAset)}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Total nilai perolehan seluruh aset: pembangunan, instalasi, listrik & air, dan peralatan
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Tambah Aset Baru</span>
        </button>
      </div>

      {/* Ringkasan Penyusutan Otomatis */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nilai Perolehan</span>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-slate-900">
            {formatCurrency(depTotals.acquisition)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Harga beli seluruh aset</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Akumulasi Penyusutan</span>
            <TrendingDown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-amber-700">
            {formatCurrency(depTotals.accumulated)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Penyusutan berjalan (garis lurus)</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nilai Buku Sekarang</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-emerald-700">
            {formatCurrency(depTotals.bookValue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Nilai perolehan − akumulasi</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Beban Penyusutan / Bulan</span>
            <CalendarClock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-slate-900">
            {formatCurrency(depTotals.monthly)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Aset yang masih aktif disusutkan</p>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nama Aset</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Tgl Beli</th>
                <th className="py-3.5 px-4 text-center">Jumlah</th>
                <th className="py-3.5 px-4 text-right">Harga Perolehan</th>
                <th className="py-3.5 px-4 text-right">Total Nilai</th>
                <th className="py-3.5 px-4">Umur / Masa Manfaat</th>
                <th className="py-3.5 px-4 text-right">Penyusutan/Bln</th>
                <th className="py-3.5 px-4 text-right">Akumulasi</th>
                <th className="py-3.5 px-4 text-right">Nilai Buku</th>
                <th className="py-3.5 px-4 text-center">Kondisi</th>
                <th className="py-3.5 px-4">Lokasi</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.assets.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-slate-400">
                    <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm">Belum ada data aset tercatat</p>
                  </td>
                </tr>
              ) : (
                depreciationList.map(({ asset: a, dep }) => {
                  const totalVal = dep.acquisitionValue;
                  let condStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (a.condition === 'Perlu Perbaikan') {
                    condStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                  } else if (a.condition === 'Rusak') {
                    condStyle = 'bg-rose-50 text-rose-700 border-rose-200';
                  }
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{a.name}</span>
                        {a.notes && <span className="text-[11px] text-slate-500">{a.notes}</span>}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {normalizeAssetCategory(a.category)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {formatDate(a.purchaseDate)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 whitespace-nowrap font-mono">
                        {a.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                        {formatCurrency(a.purchasePrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap font-mono">
                        {formatCurrency(totalVal)}
                      </td>
                      <td className="py-3.5 px-4 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                dep.isFullyDepreciated
                                  ? 'bg-slate-400'
                                  : dep.percentDepreciated >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, dep.percentDepreciated).toFixed(1)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                            {formatMonths(dep.ageMonths)} / {formatMonths(dep.lifeMonths)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-slate-600">
                        {dep.isFullyDepreciated ? '—' : formatCurrency(dep.monthlyDepreciation)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono text-amber-700">
                        {formatCurrency(dep.accumulatedDepreciation)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-emerald-700">
                        {formatCurrency(dep.bookValue)}
                        {dep.isFullyDepreciated && (
                          <span className="block text-[9px] text-slate-400 font-sans">selesai disusutkan</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${condStyle}`}>
                          {a.condition}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {a.location}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(a)}
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteAsset(a.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
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
      </div>

      {/* Add / Edit Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col my-auto text-xs">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                {editingAsset ? 'Ubah Data Aset' : 'Tambah Aset Greenhouse'}
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
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Aset</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Pompa Submersible Resun King 6, Tandon PE 5000L..."
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Aset</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  >
                    {ASSET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kondisi Aset</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-semibold"
                  >
                    <option value="Sangat Baik">Sangat Baik</option>
                    <option value="Baik">Baik (Berfungsi Normal)</option>
                    <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                    <option value="Rusak">Rusak / Tidak Beroperasi</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tgl Perolehan</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jumlah Unit</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Umur Ekonomis</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      value={economicLifeYears}
                      onChange={(e) => setEconomicLifeYears(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                    />
                    <span className="text-[10px] text-slate-500">Thn</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="3800000"
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lokasi Penempatan</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ruang Tandon, Greenhouse 1, Gudang..."
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Merk, serial number, jadwal servis..."
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
                  {editingAsset ? 'Simpan Perubahan' : 'Tambah Aset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
