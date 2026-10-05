import React, { useState, useMemo } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { Investment, InvestmentCategory, TunnelType, Asset } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { buildGreenhouseSpecLine } from '../utils/greenhouseSpec';
import {
  Landmark,
  Plus,
  Trash2,
  Edit2,
  Building,
  Pipette,
  Zap,
  Wrench,
  X,
  PackagePlus,
  CheckCircle2,
} from 'lucide-react';

const CATEGORIES: { key: InvestmentCategory; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'Pembangunan', label: '1. Pembangunan', icon: <Building className="w-4 h-4 text-emerald-600" />, desc: 'Bambu petung, UV plastic, insect net, pondasi cor, upah tukang' },
  { key: 'Instalasi', label: '2. Instalasi', icon: <Pipette className="w-4 h-4 text-blue-600" />, desc: 'Gully talang foodgrade, pipa PVC, tandon air, pompa sirkulasi' },
  { key: 'Listrik & Air', label: '3. Listrik & Air', icon: <Zap className="w-4 h-4 text-amber-600" />, desc: 'Panel otomatisasi timer, MCB, instalasi kelistrikan & transmisi air' },
  { key: 'Peralatan', label: '4. Peralatan', icon: <Wrench className="w-4 h-4 text-purple-600" />, desc: 'EC/TDS meter, Milwaukee pH meter, refraktometer brix, timbangan digital' },
];

const normalizeInvestmentCategory = (value: string): string =>
  value === 'Instalasi DFT' ? 'Instalasi' : value;

export const InvestmentsPage: React.FC = () => {
  const { db, metrics, addInvestment, updateInvestment, deleteInvestment, addAsset } = useGreenhouse();
  const [selectedCategory, setSelectedCategory] = useState<InvestmentCategory | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Investment | null>(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<InvestmentCategory>('Pembangunan');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('unit');
  const [unitPrice, setUnitPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [tunnel, setTunnel] = useState<TunnelType>('Semua Greenhouse');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ===== "Jadikan Aset" (buat aset fisik dari baris investasi) =====
  const [assetSource, setAssetSource] = useState<Investment | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState<Asset['category']>('Pembangunan');
  const [assetDate, setAssetDate] = useState(new Date().toISOString().slice(0, 10));
  const [assetPrice, setAssetPrice] = useState('');
  const [assetQty, setAssetQty] = useState('1');
  const [assetCondition, setAssetCondition] = useState<Asset['condition']>('Baik');
  const [assetLife, setAssetLife] = useState('5');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetNotes, setAssetNotes] = useState('');
  const [isAssetSaving, setIsAssetSaving] = useState(false);

  const convertedInvestmentIds = useMemo(
    () => new Set((db.assets || []).map((a) => a.investmentId).filter(Boolean) as string[]),
    [db.assets]
  );

  const openAssetModal = (inv: Investment) => {
    const normalized = normalizeInvestmentCategory(inv.category);
    const validCategories: Asset['category'][] = ['Pembangunan', 'Instalasi', 'Listrik & Air', 'Peralatan'];
    setAssetSource(inv);
    setAssetName(inv.itemName);
    setAssetCategory(validCategories.includes(normalized as Asset['category']) ? (normalized as Asset['category']) : 'Lainnya');
    setAssetDate(inv.date);
    setAssetPrice(String(inv.unitPrice || 0));
    setAssetQty(String(inv.quantity || 1));
    setAssetCondition('Baik');
    setAssetLife('5');
    setAssetLocation(inv.tunnel && inv.tunnel !== 'Semua Greenhouse' ? inv.tunnel : 'Greenhouse');
    setAssetNotes(inv.notes || '');
  };

  const submitAsset = async () => {
    if (!assetSource) return;
    if (!assetName.trim()) return;
    setIsAssetSaving(true);
    const ok = await addAsset({
      name: assetName.trim(),
      category: assetCategory,
      purchaseDate: assetDate,
      purchasePrice: Number(assetPrice) || 0,
      quantity: Number(assetQty) || 1,
      condition: assetCondition,
      economicLifeYears: Number(assetLife) || 1,
      location: assetLocation,
      notes: assetNotes || undefined,
      investmentId: assetSource.id,
    });
    setIsAssetSaving(false);
    if (ok) setAssetSource(null);
  };

  const calculatedTotal = (Number(quantity) || 1) * (Number(unitPrice) || 0);

  const openAddModal = () => {
    setEditingItem(null);
    setDate(new Date().toISOString().slice(0, 10));
    setCategory('Pembangunan');
    setItemName('');
    setQuantity('1');
    setUnit('unit');
    setUnitPrice('');
    setSupplier('');
    setTunnel('Semua Greenhouse');
    setNotes('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Investment) => {
    setEditingItem(item);
    setDate(item.date);
    setCategory(item.category);
    setItemName(item.itemName);
    setQuantity(String(item.quantity));
    setUnit(item.unit);
    setUnitPrice(String(item.unitPrice));
    setSupplier(item.supplier || '');
    setTunnel(item.tunnel);
    setNotes(item.notes || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const qty = Number(quantity) || 1;
    const price = Number(unitPrice) || 0;
    if (!itemName.trim()) {
      setError('Nama barang / pekerjaan wajib diisi');
      return;
    }
    if (price <= 0) {
      setError('Harga satuan harus lebih besar dari Rp 0');
      return;
    }

    const payload = {
      date,
      category,
      itemName: itemName.trim(),
      quantity: qty,
      unit: unit.trim() || 'unit',
      unitPrice: price,
      supplier: supplier.trim() || undefined,
      tunnel,
      notes: notes.trim() || undefined,
    };

    if (editingItem) {
      await updateInvestment(editingItem.id, payload);
    } else {
      await addInvestment(payload);
    }
    setIsModalOpen(false);
  };

  // Category totals
  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {
      Pembangunan: 0,
      Instalasi: 0,
      'Listrik & Air': 0,
      Peralatan: 0,
    };
    db.investments.forEach((inv) => {
      const catKey = inv.category === 'Instalasi DFT' ? 'Instalasi' : inv.category;
      if (map[catKey] !== undefined) {
        map[catKey] += Number(inv.totalAmount) || 0;
      }
    });
    return map as Record<InvestmentCategory, number>;
  }, [db.investments]);

  const filteredInvestments = useMemo(() => {
    if (selectedCategory === 'all') return db.investments;
    return db.investments.filter((i) => {
      if (selectedCategory === 'Instalasi') {
        return i.category === 'Instalasi' || i.category === 'Instalasi DFT';
      }
      return i.category === selectedCategory;
    });
  }, [db.investments, selectedCategory]);

  // Spesifikasi greenhouse mengikuti data pada menu Manajemen GH.
  // Jika seluruh data dikosongkan, teks ini otomatis hilang.
  const greenhouseSpec = useMemo(() => buildGreenhouseSpecLine(db.tunnels || []), [db.tunnels]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider block">
            Modal Awal Belanja Aset & Konstruksi
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
            {formatCurrency(metrics.totalInvestasi)}
          </h2>
          {greenhouseSpec && (
            <p className="text-xs text-slate-500 mt-1">
              {greenhouseSpec}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Catat Belanja Investasi</span>
          </button>
        </div>
      </div>

      {/* 4 Investment Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {CATEGORIES.map((cat) => {
          const total = categoryTotals[cat.key];
          const isSelected = selectedCategory === cat.key;
          const percent = metrics.totalInvestasi > 0 ? (total / metrics.totalInvestasi) * 100 : 0;
          return (
            <div
              key={cat.key}
              onClick={() => setSelectedCategory(isSelected ? 'all' : cat.key)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-amber-50/70 border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  {cat.icon}
                </div>
                <span className="text-[11px] font-bold text-slate-500">{percent.toFixed(0)}%</span>
              </div>
              <h3 className="font-bold text-xs text-slate-900 leading-snug">{cat.label}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{cat.desc}</p>
              <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-baseline">
                <span className="text-sm font-black text-slate-900 font-mono">{formatCurrency(total)}</span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  {db.investments.filter((i) => i.category === cat.key).length} item
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shrink-0 cursor-pointer ${
            selectedCategory === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Semua Kategori ({db.investments.length})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shrink-0 cursor-pointer ${
              selectedCategory === cat.key ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Investments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Nama Barang / Pekerjaan</th>
                <th className="py-3.5 px-4 text-center">Volume</th>
                <th className="py-3.5 px-4 text-right">Harga Satuan</th>
                <th className="py-3.5 px-4 text-right">Total Nominal</th>
                <th className="py-3.5 px-4">Supplier & Greenhouse</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvestments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Landmark className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm">Tidak ada data investasi ditemukan</p>
                  </td>
                </tr>
              ) : (
                filteredInvestments.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-900">
                      {formatDate(inv.date)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {normalizeInvestmentCategory(inv.category)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{inv.itemName}</span>
                      {inv.notes && <span className="text-[11px] text-slate-500">{inv.notes}</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-800 whitespace-nowrap font-mono">
                      {inv.quantity} {inv.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono">
                      {formatCurrency(inv.unitPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap font-mono">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800 block">{inv.supplier || '-'}</span>
                      <span className="text-[10px] text-slate-400">{inv.tunnel}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {convertedInvestmentIds.has(inv.id) ? (
                          <span title="Sudah tercatat sebagai aset" className="p-1 text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <button
                            onClick={() => openAssetModal(inv)}
                            title="Jadikan Aset Fisik Kebun"
                            className="p-1 rounded-md text-slate-400 hover:text-blue-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(inv)}
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteInvestment(inv.id)}
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

      {/* Add / Edit Investment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col my-auto text-xs">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                {editingItem ? 'Ubah Data Investasi' : 'Catat Belanja Investasi Greenhouse'}
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
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Investasi</label>
                  <select
                    value={category === 'Instalasi DFT' ? 'Instalasi' : category}
                    onChange={(e) => setCategory(e.target.value as InvestmentCategory)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-semibold"
                  >
                    <option value="Pembangunan">1. Pembangunan</option>
                    <option value="Instalasi">2. Instalasi</option>
                    <option value="Listrik & Air">3. Listrik & Air</option>
                    <option value="Peralatan">4. Peralatan</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Barang / Pekerjaan</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Contoh: Bambu Petung Super, Talang Gully DFT, Tandon 5000L..."
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jumlah</label>
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
                  <label className="font-semibold text-slate-700 block mb-1">Satuan</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="batang, roll, set, unit..."
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="65000"
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold font-mono"
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center">
                <span className="text-amber-900 font-semibold">Total Nilai Investasi:</span>
                <span className="text-base font-black text-amber-900 font-mono">{formatCurrency(calculatedTotal)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Vendor / Toko / Supplier</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Contoh: TB Sumber Makmur"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lokasi Greenhouse</label>
                  <select
                    value={tunnel}
                    onChange={(e) => setTunnel(e.target.value as TunnelType)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  >
                    <option value="Semua Greenhouse">Semua / Gabungan Greenhouse</option>
                    {(db.tunnels || []).map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.widthM} x {t.lengthM} m)
                      </option>
                    ))}
                    <option value="Umum / Fasilitas">Umum / Fasilitas (Ruang Pompa, Tandon)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Spesifikasi</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan spesifikasi teknis, garansi..."
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
                  {editingItem ? 'Simpan Perubahan' : 'Catat Investasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Jadikan Aset */}
      {assetSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-8 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PackagePlus className="w-5 h-5" />
                <div>
                  <h3 className="font-extrabold text-sm">Jadikan Aset Fisik Kebun</h3>
                  <p className="text-[11px] text-emerald-100 truncate max-w-[320px]">
                    Dari investasi: {assetSource.itemName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssetSource(null)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                Mencatat aset <b>tidak menambah pengeluaran</b> — kas &amp; laporan keuangan tetap dari Investasi.
                Aset hanya untuk inventaris fisik.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Nama Aset</label>
                  <input
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Aset</label>
                  <select
                    value={assetCategory}
                    onChange={(e) => setAssetCategory(e.target.value as Asset['category'])}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  >
                    <option value="Pembangunan">Pembangunan</option>
                    <option value="Instalasi">Instalasi</option>
                    <option value="Listrik & Air">Listrik &amp; Air</option>
                    <option value="Peralatan">Peralatan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Perolehan</label>
                  <input
                    type="date"
                    value={assetDate}
                    onChange={(e) => setAssetDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    value={assetPrice}
                    onChange={(e) => setAssetPrice(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jumlah</label>
                  <input
                    type="number"
                    value={assetQty}
                    onChange={(e) => setAssetQty(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kondisi</label>
                  <select
                    value={assetCondition}
                    onChange={(e) => setAssetCondition(e.target.value as Asset['condition'])}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  >
                    <option value="Sangat Baik">Sangat Baik</option>
                    <option value="Baik">Baik (Berfungsi Normal)</option>
                    <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                    <option value="Rusak">Rusak / Tidak Beroperasi</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Masa Manfaat (tahun)</label>
                  <input
                    type="number"
                    value={assetLife}
                    onChange={(e) => setAssetLife(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Lokasi</label>
                  <input
                    value={assetLocation}
                    onChange={(e) => setAssetLocation(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Catatan (opsional)</label>
                  <input
                    value={assetNotes}
                    onChange={(e) => setAssetNotes(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssetSource(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={submitAsset}
                  disabled={isAssetSaving}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
                >
                  {isAssetSaving ? 'Menyimpan...' : 'Simpan Aset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
