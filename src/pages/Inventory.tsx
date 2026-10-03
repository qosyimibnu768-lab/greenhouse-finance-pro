import React, { useState } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { InventoryItem } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportInventoryCSV } from '../services/exportService';
import {
  Package,
  Plus,
  AlertTriangle,
  Download,
  Trash2,
  Edit2,
  X,
  History,
} from 'lucide-react';

const ITEM_CATEGORIES = [
  'Benih',
  'AB Mix',
  'Nutrisi Tambahan',
  'Pestisida',
  'Fungisida',
  'Insektisida',
  'Media Tanam',
  'Plastik & Net',
  'Kemasan & Packing',
  'Perlengkapan Lain',
];

export const InventoryPage: React.FC = () => {
  const {
    db,
    lowStockItems,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    recordStockMutation,
  } = useGreenhouse();

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedMutationItem, setSelectedMutationItem] = useState<InventoryItem | null>(null);

  // Item Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<any>('AB Mix');
  const [unit, setUnit] = useState('set');
  const [initialStock, setInitialStock] = useState('0');
  const [minStock, setMinStock] = useState('2');
  const [avgPrice, setAvgPrice] = useState('');
  const [itemError, setItemError] = useState<string | null>(null);

  // Mutation Form states
  const [mutationType, setMutationType] = useState<'Masuk' | 'Keluar'>('Keluar');
  const [mutationQty, setMutationQty] = useState('');
  const [mutationCycle, setMutationCycle] = useState(db.cycles[0]?.id || '');
  const [mutationDate, setMutationDate] = useState(new Date().toISOString().slice(0, 10));
  const [mutationNote, setMutationNote] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const openAddItemModal = () => {
    setEditingItem(null);
    setName('');
    setCategory('AB Mix');
    setUnit('set');
    setInitialStock('10');
    setMinStock('4');
    setAvgPrice('450000');
    setItemError(null);
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setInitialStock(String(item.initialStock));
    setMinStock(String(item.minStock));
    setAvgPrice(String(item.avgPrice));
    setItemError(null);
    setIsItemModalOpen(true);
  };

  const openMutationModal = (item: InventoryItem, defaultType: 'Masuk' | 'Keluar' = 'Keluar') => {
    setSelectedMutationItem(item);
    setMutationType(defaultType);
    setMutationQty('1');
    setMutationCycle(db.cycles.find((c) => c.status !== 'Selesai')?.id || '');
    setMutationDate(new Date().toISOString().slice(0, 10));
    setMutationNote('');
    setMutationError(null);
    setIsMutationModalOpen(true);
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemError(null);
    if (!name.trim()) {
      setItemError('Nama barang wajib diisi');
      return;
    }
    const init = Number(initialStock) || 0;
    const min = Number(minStock) || 0;
    const price = Number(avgPrice) || 0;
    if (init < 0 || min < 0) {
      setItemError('Nilai stok tidak boleh negatif');
      return;
    }

    const payload = {
      name: name.trim(),
      category,
      unit: unit.trim() || 'unit',
      initialStock: init,
      incomingStock: editingItem ? editingItem.incomingStock : 0,
      outgoingStock: editingItem ? editingItem.outgoingStock : 0,
      minStock: min,
      avgPrice: price,
    };

    if (editingItem) {
      await updateInventoryItem(editingItem.id, payload);
    } else {
      await addInventoryItem(payload);
    }
    setIsItemModalOpen(false);
  };

  const handleMutationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMutationError(null);
    if (!selectedMutationItem) return;

    const qty = Number(mutationQty) || 0;
    if (qty <= 0) {
      setMutationError('Jumlah mutasi harus lebih besar dari 0');
      return;
    }
    if (mutationType === 'Keluar' && qty > selectedMutationItem.currentStock) {
      setMutationError(`Stok tidak mencukupi! Sisa stok saat ini hanya ${selectedMutationItem.currentStock} ${selectedMutationItem.unit}.`);
      return;
    }

    const totalCost = qty * (selectedMutationItem.avgPrice || 0);
    await recordStockMutation({
      date: mutationDate,
      itemId: selectedMutationItem.id,
      itemName: selectedMutationItem.name,
      type: mutationType,
      quantity: qty,
      unit: selectedMutationItem.unit,
      unitPrice: selectedMutationItem.avgPrice,
      totalCost,
      cycleId: mutationCycle || undefined,
      note: mutationNote.trim() || undefined,
    });
    setIsMutationModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-sm">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight text-amber-950 flex items-center gap-2">
                <span>PERINGATAN STOK MENIPIS!</span>
                <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold">
                  {lowStockItems.length} BARANG DI BAWAH MINIMUM
                </span>
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Segera lakukan pemesanan ulang (restock) nutrisi dan benih agar tidak mengganggu nutrisi DFT melon.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lowStockItems.map((item) => (
              <button
                key={item.id}
                onClick={() => openMutationModal(item, 'Masuk')}
                className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Restock {item.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Inventori Stok Bahan & Nutrisi Melon</h3>
          <p className="text-xs text-slate-500">
            Monitoring stok pupuk AB Mix, benih melon, pestisida, dan media tanam
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportInventoryCSV(db.inventory)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={openAddItemModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Tambah Barang Baru</span>
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nama Barang</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4 text-center">Satuan</th>
                <th className="py-3.5 px-4 text-center">Stok Awal</th>
                <th className="py-3.5 px-4 text-center text-emerald-700">Masuk</th>
                <th className="py-3.5 px-4 text-center text-rose-700">Keluar</th>
                <th className="py-3.5 px-4 text-center">Stok Akhir</th>
                <th className="py-3.5 px-4 text-center">Min. Stok</th>
                <th className="py-3.5 px-4 text-right">Harga Rata-rata</th>
                <th className="py-3.5 px-4 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.inventory.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm">Belum ada barang di inventori</p>
                  </td>
                </tr>
              ) : (
                db.inventory.map((item) => {
                  const isLow = (Number(item.currentStock) || 0) <= (Number(item.minStock) || 0);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition ${
                        isLow ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{item.name}</span>
                          {isLow && (
                            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                              MENIPIS
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">Diperbarui: {item.lastUpdated}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600 font-medium whitespace-nowrap">
                        {item.unit}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-500 whitespace-nowrap font-mono">
                        {item.initialStock}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700 whitespace-nowrap font-mono">
                        +{item.incomingStock}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-rose-700 whitespace-nowrap font-mono">
                        -{item.outgoingStock}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono">
                        <span
                          className={`font-black text-sm px-2.5 py-1 rounded-lg ${
                            isLow
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {item.currentStock}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-400 whitespace-nowrap font-mono">
                        {item.minStock}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-900 whitespace-nowrap font-mono">
                        {formatCurrency(item.avgPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openMutationModal(item, 'Masuk')}
                            className="p-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold transition cursor-pointer"
                            title="Catat Barang Masuk"
                          >
                            + Masuk
                          </button>
                          <button
                            onClick={() => openMutationModal(item, 'Keluar')}
                            className="p-1.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold transition cursor-pointer"
                            title="Catat Pemakaian Keluar"
                          >
                            - Pakai
                          </button>
                          <button
                            onClick={() => openEditItemModal(item)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title="Ubah"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteInventoryItem(item.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
                            title="Hapus"
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

      {/* Riwayat Mutasi Stok Terakhir */}
      {db.stockMutations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Riwayat Mutasi Stok Terakhir
            </h4>
          </div>
          <div className="border border-slate-100 rounded-xl overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Tanggal</th>
                  <th className="p-2.5">Nama Barang</th>
                  <th className="p-2.5 text-center">Tipe</th>
                  <th className="p-2.5 text-center">Jumlah</th>
                  <th className="p-2.5">Siklus</th>
                  <th className="p-2.5">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.stockMutations.slice(0, 8).map((m) => (
                  <tr key={m.id}>
                    <td className="p-2.5 text-slate-600">{formatDate(m.date)}</td>
                    <td className="p-2.5 font-bold text-slate-900">{m.itemName}</td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          m.type === 'Masuk' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-bold text-slate-900 font-mono">
                      {m.quantity} {m.unit}
                    </td>
                    <td className="p-2.5 text-slate-600 font-semibold">{m.cycleId || '-'}</td>
                    <td className="p-2.5 text-slate-500">{m.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Inventory Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full my-auto text-xs">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                {editingItem ? 'Ubah Barang Stok' : 'Tambah Barang Baru'}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleItemSubmit} className="p-4 space-y-3">
              {itemError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {itemError}
                </div>
              )}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Barang / Bahan</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Pupuk AB Mix Pekatan 500L, Benih Inthanon..."
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  >
                    {ITEM_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="set, kg, pack, botol, slab..."
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Stok Awal</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Min. Stok (Alert)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 text-rose-600 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={avgPrice}
                    onChange={(e) => setAvgPrice(e.target.value)}
                    placeholder="0"
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold font-mono"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 cursor-pointer"
                >
                  {editingItem ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Mutation Modal (Masuk / Keluar) */}
      {isMutationModalOpen && selectedMutationItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full my-auto text-xs">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Catat Mutasi Stok</h3>
                <p className="text-slate-500 text-[11px]">{selectedMutationItem.name}</p>
              </div>
              <button onClick={() => setIsMutationModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleMutationSubmit} className="p-4 space-y-3">
              {mutationError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {mutationError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMutationType('Keluar')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition cursor-pointer ${
                    mutationType === 'Keluar' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  - Pemakaian (Keluar)
                </button>
                <button
                  type="button"
                  onClick={() => setMutationType('Masuk')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition cursor-pointer ${
                    mutationType === 'Masuk' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  + Tambah Stok (Masuk)
                </button>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-600">Sisa Stok Saat Ini:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {selectedMutationItem.currentStock} {selectedMutationItem.unit}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Jumlah {mutationType} ({selectedMutationItem.unit})
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={mutationQty}
                    onChange={(e) => setMutationQty(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-black text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={mutationDate}
                    onChange={(e) => setMutationDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kaitkan Siklus Tanam</label>
                <select
                  value={mutationCycle}
                  onChange={(e) => setMutationCycle(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300"
                >
                  <option value="">-- Umum / Tanpa Siklus --</option>
                  {db.cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan</label>
                <input
                  type="text"
                  value={mutationNote}
                  onChange={(e) => setMutationNote(e.target.value)}
                  placeholder="Contoh: Pengisian tandon A, semprot pencegahan thrips..."
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMutationModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 cursor-pointer"
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
