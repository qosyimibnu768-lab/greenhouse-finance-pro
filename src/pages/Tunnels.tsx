import React, { useState, useMemo } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { Tunnel } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import {
  Warehouse,
  Plus,
  Edit2,
  Trash2,
  Sprout,
  Search,
  Layers,
  Droplets,
  X,
} from 'lucide-react';

interface TunnelsPageProps {
  onNavigateToCycles?: () => void;
  onNavigateToInvestments?: () => void;
}

export const TunnelsPage: React.FC<TunnelsPageProps> = ({ onNavigateToCycles }) => {
  const { db, addTunnel, updateTunnel, deleteTunnel } = useGreenhouse();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Aktif' | 'Perawatan' | 'Nonaktif'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTunnel, setEditingTunnel] = useState<Tunnel | null>(null);
  const [tunnelToDelete, setTunnelToDelete] = useState<Tunnel | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    lengthM: 48,
    widthM: 8,
    capacityPlants: 1000,
    systemType: 'DFT Hydroponic',
    structureMaterial: 'Bambu Petung Super',
    status: 'Aktif' as 'Aktif' | 'Perawatan' | 'Nonaktif',
    notes: '',
  });

  const tunnels = db.tunnels || [];

  // Summary Metrics
  const summary = useMemo(() => {
    const totalTunnels = tunnels.length;
    const activeTunnels = tunnels.filter((t) => t.status === 'Aktif').length;
    const totalAreaM2 = tunnels.reduce((acc, t) => acc + (Number(t.lengthM) || 0) * (Number(t.widthM) || 0), 0);
    const totalCapacity = tunnels.reduce((acc, t) => acc + (Number(t.capacityPlants) || 0), 0);
    const activeCycles = db.cycles.filter((c) => c.status !== 'Selesai');
    return {
      totalTunnels,
      activeTunnels,
      totalAreaM2,
      totalCapacity,
      activeCyclesCount: activeCycles.length,
    };
  }, [tunnels, db.cycles]);

  // Filtered Tunnels
  const filteredTunnels = useMemo(() => {
    return tunnels.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.systemType || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.structureMaterial || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tunnels, searchQuery, statusFilter]);

  const handleOpenAdd = () => {
    setEditingTunnel(null);
    const nextNumber = tunnels.length + 1;
    setFormData({
      name: `Greenhouse ${nextNumber}`,
      lengthM: 48,
      widthM: 8,
      capacityPlants: 1000,
      systemType: 'DFT Hydroponic',
      structureMaterial: 'Bambu Petung Super',
      status: 'Aktif',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tunnel: Tunnel) => {
    setEditingTunnel(tunnel);
    setFormData({
      name: tunnel.name,
      lengthM: tunnel.lengthM,
      widthM: tunnel.widthM,
      capacityPlants: tunnel.capacityPlants,
      systemType: tunnel.systemType || 'DFT Hydroponic',
      structureMaterial: tunnel.structureMaterial || 'Bambu Petung Super',
      status: tunnel.status || 'Aktif',
      notes: tunnel.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (editingTunnel) {
      await updateTunnel(editingTunnel.id, {
        name: formData.name.trim(),
        lengthM: Number(formData.lengthM) || 48,
        widthM: Number(formData.widthM) || 8,
        capacityPlants: Number(formData.capacityPlants) || 1000,
        systemType: formData.systemType,
        structureMaterial: formData.structureMaterial,
        status: formData.status,
        notes: formData.notes.trim(),
      });
    } else {
      await addTunnel({
        name: formData.name.trim(),
        lengthM: Number(formData.lengthM) || 48,
        widthM: Number(formData.widthM) || 8,
        capacityPlants: Number(formData.capacityPlants) || 1000,
        systemType: formData.systemType,
        structureMaterial: formData.structureMaterial,
        status: formData.status,
        notes: formData.notes.trim(),
      });
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!tunnelToDelete) return;
    await deleteTunnel(tunnelToDelete.id);
    setTunnelToDelete(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Warehouse className="w-4 h-4" />
              <span>Infrastruktur & Unit Greenhouse</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Manajemen Greenhouse</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Tambah, sesuaikan ukuran dimensi (P × L), kapasitas tanam, sistem DFT/NFT, serta kontrol status operasional seluruh unit greenhouse perkebunan melon Anda.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 transition active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah Greenhouse Baru</span>
          </button>
        </div>

        {/* Quick Stat Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-700/60">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 block">Total Unit Greenhouse</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-white">{summary.totalTunnels}</span>
              <span className="text-xs text-emerald-400 font-medium">({summary.activeTunnels} Aktif)</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 block">Total Luas Area</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-emerald-300 font-mono">{formatNumber(summary.totalAreaM2)}</span>
              <span className="text-xs text-slate-400">m²</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 block">Total Kapasitas Tanam</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-white font-mono">{formatNumber(summary.totalCapacity)}</span>
              <span className="text-xs text-slate-400">tanaman</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <span className="text-[11px] text-slate-400 block">Siklus Tanam Aktif</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">{summary.activeCyclesCount}</span>
              <span className="text-xs text-slate-400">siklus berjalan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari greenhouse, sistem DFT, material bambu..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'Aktif', 'Perawatan', 'Nonaktif'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'Semua Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Tunnel Cards Grid */}
      {filteredTunnels.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <Warehouse className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">Tidak ada greenhouse ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {searchQuery
              ? 'Tidak ada greenhouse yang cocok dengan kata kunci pencarian Anda.'
              : 'Belum ada data greenhouse. Silakan klik tombol "Tambah Greenhouse Baru" untuk mulai menambahkan unit greenhouse.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Greenhouse Baru</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTunnels.map((tunnel) => {
            const areaM2 = (Number(tunnel.lengthM) || 0) * (Number(tunnel.widthM) || 0);
            const activeCycle = db.cycles.find(
              (c) => c.status !== 'Selesai' && (c.tunnel === tunnel.name || c.tunnel === 'Kedua Tunnel')
            );
            const tunnelInvestments = db.investments.filter(
              (inv) => inv.tunnel === tunnel.name || inv.tunnel === 'Kedua Tunnel'
            );
            const totalInvAmount = tunnelInvestments.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
            const tunnelHarvests = db.harvests.filter(
              (h) => h.tunnel === tunnel.name || h.tunnel === 'Kedua Tunnel'
            );
            const totalHarvestKg = tunnelHarvests.reduce((acc, h) => acc + (h.totalWeightKg || 0), 0);
            const totalRevenue = tunnelHarvests.reduce((acc, h) => acc + (h.totalRevenue || 0), 0);

            return (
              <div
                key={tunnel.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0 shadow-xs">
                        <Warehouse className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-slate-900 group-hover:text-emerald-700 transition">
                            {tunnel.name}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              tunnel.status === 'Aktif'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : tunnel.status === 'Perawatan'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {tunnel.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Dimensi: <span className="font-semibold text-slate-800">{tunnel.widthM}m × {tunnel.lengthM}m</span> ({areaM2} m²)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(tunnel)}
                        title="Edit Greenhouse"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTunnelToDelete(tunnel)}
                        title="Hapus Greenhouse"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-4">
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/70 flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-cyan-600" />
                      <span>{tunnel.systemType || 'DFT Hydroponic'}</span>
                    </span>
                    {tunnel.structureMaterial && (
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-amber-700" />
                        <span>{tunnel.structureMaterial}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-1">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Kapasitas Tanam</span>
                      <span className="font-bold text-slate-900 font-mono">{formatNumber(tunnel.capacityPlants)} Tanaman</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          activeCycle ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(15, (tunnel.capacityPlants / 2000) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border transition bg-white">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Siklus Tanam</span>
                      </span>
                      {activeCycle ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {activeCycle.status}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400">Siap Ditanami</span>
                      )}
                    </div>
                    {activeCycle ? (
                      <div className="mt-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{activeCycle.name}</p>
                        <p className="text-[11px] text-slate-500">
                          Varietas: <span className="font-medium text-slate-700">{activeCycle.melonVariety}</span> ({formatNumber(activeCycle.plantCount)} pohon)
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic mt-0.5">Tidak ada siklus aktif saat ini</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                      <span className="text-[10px] text-slate-400 block">Total Panen</span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5 block font-mono">
                        {formatNumber(totalHarvestKg)} kg
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium block font-mono">
                        {formatCurrency(totalRevenue)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                      <span className="text-[10px] text-slate-400 block">Investasi Terpasang</span>
                      <span className="font-bold text-slate-800 text-xs mt-0.5 block font-mono">
                        {tunnelInvestments.length} item
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block font-mono">
                        {formatCurrency(totalInvAmount)}
                      </span>
                    </div>
                  </div>

                  {tunnel.notes && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                      <span className="font-semibold text-slate-700">Catatan:</span> {tunnel.notes}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenEdit(tunnel)}
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition text-center cursor-pointer"
                  >
                    Edit Spesifikasi
                  </button>
                  {onNavigateToCycles && (
                    <button
                      onClick={onNavigateToCycles}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition text-center cursor-pointer"
                    >
                      Buka Siklus
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {editingTunnel ? 'Edit Spesifikasi Greenhouse' : 'Tambah Greenhouse Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingTunnel ? `Mengubah data unit ${editingTunnel.name}` : 'Masukkan data unit greenhouse baru'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Unit Greenhouse <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Greenhouse 1, Greenhouse 2, Greenhouse Nursery"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lebar (Meter) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={formData.widthM}
                    onChange={(e) => setFormData({ ...formData, widthM: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Panjang (Meter) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={formData.lengthM}
                    onChange={(e) => setFormData({ ...formData, lengthM: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between">
                <span className="text-emerald-900 font-medium">Kalkulasi Luas Area:</span>
                <span className="font-extrabold text-emerald-800 text-sm font-mono">
                  {formData.widthM || 0}m × {formData.lengthM || 0}m = {(formData.widthM || 0) * (formData.lengthM || 0)} m²
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kapasitas Tanaman (Pohon) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.capacityPlants}
                    onChange={(e) => setFormData({ ...formData, capacityPlants: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Greenhouse <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                  >
                    <option value="Aktif">Aktif (Operasional)</option>
                    <option value="Perawatan">Perawatan (Maintenance)</option>
                    <option value="Nonaktif">Nonaktif (Off)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sistem Budidaya
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: DFT Hydroponic"
                    value={formData.systemType}
                    onChange={(e) => setFormData({ ...formData, systemType: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Material Struktur
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bambu Petung Super"
                    value={formData.structureMaterial}
                    onChange={(e) => setFormData({ ...formData, structureMaterial: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Tambahan / Lokasi
                </label>
                <textarea
                  rows={3}
                  placeholder="Keterangan jalur pipa nutrisi, tipe plastik UV, talang DFT, dll."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-900/20 transition active:scale-95 cursor-pointer"
                >
                  {editingTunnel ? 'Simpan Perubahan' : 'Tambah Greenhouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {tunnelToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-black text-lg text-slate-900">Hapus Unit {tunnelToDelete.name}?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus <span className="font-bold text-slate-800">{tunnelToDelete.name}</span> ({tunnelToDelete.widthM} × {tunnelToDelete.lengthM} m)? Tindakan ini akan menghapus data unit dari daftar greenhouse.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setTunnelToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-900/20 transition active:scale-95 cursor-pointer"
              >
                Ya, Hapus Tunnel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
