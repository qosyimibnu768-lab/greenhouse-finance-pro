import React, { useState, useMemo } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { CropCycle, CycleStatus, TunnelType } from '../types';
import { formatCurrency, formatNumber, formatDate, formatPercent } from '../utils/formatters';
import {
  Sprout,
  Plus,
  ChevronRight,
  Calculator,
  Scale,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';

const STATUS_COLORS: Record<CycleStatus, { bg: string; text: string; border: string }> = {
  Persiapan: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  Tanam: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Vegetatif: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Generatif: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'Menjelang panen': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Panen: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  Selesai: { bg: 'bg-slate-200', text: 'text-slate-800', border: 'border-slate-300' },
};

export const CropCyclesPage: React.FC = () => {
  const { db, addCycle, updateCycle, deleteCycle } = useGreenhouse();
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(db.cycles[0]?.id || null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<CropCycle | null>(null);

  // Form State
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formVariety, setFormVariety] = useState('');
  const [formTunnel, setFormTunnel] = useState<TunnelType>('Greenhouse 1');
  const [formStartDate, setFormStartDate] = useState('');
  const [formPlantingDate, setFormPlantingDate] = useState('');
  const [formHarvestTargetDate, setFormHarvestTargetDate] = useState('');
  const [formActualHarvestDate, setFormActualHarvestDate] = useState('');
  const [formPlantCount, setFormPlantCount] = useState('1000');
  const [formLivePlants, setFormLivePlants] = useState('980');
  const [formDeadPlants, setFormDeadPlants] = useState('20');
  const [formStatus, setFormStatus] = useState<CycleStatus>('Vegetatif');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingCycle(null);
    const nextNum = db.cycles.length + 1;
    const nextId = `S${String(nextNum).padStart(3, '0')}`;
    setFormId(nextId);
    setFormName(`Siklus ${nextNum} - Melon Premium`);
    setFormVariety('Inthanon RZ');
    setFormTunnel('Greenhouse 1');
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormPlantingDate(new Date().toISOString().slice(0, 10));
    const target = new Date();
    target.setDate(target.getDate() + 75);
    setFormHarvestTargetDate(target.toISOString().slice(0, 10));
    setFormActualHarvestDate('');
    setFormPlantCount('1000');
    setFormLivePlants('1000');
    setFormDeadPlants('0');
    setFormStatus('Tanam');
    setFormNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: CropCycle) => {
    setEditingCycle(c);
    setFormId(c.id);
    setFormName(c.name);
    setFormVariety(c.melonVariety);
    setFormTunnel(c.tunnel);
    setFormStartDate(c.startDate);
    setFormPlantingDate(c.plantingDate);
    setFormHarvestTargetDate(c.harvestTargetDate);
    setFormActualHarvestDate(c.actualHarvestDate || '');
    setFormPlantCount(String(c.plantCount));
    setFormLivePlants(String(c.livePlants));
    setFormDeadPlants(String(c.deadPlants));
    setFormStatus(c.status);
    setFormNotes(c.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formId.trim() || !formName.trim()) {
      setFormError('ID Siklus dan Nama Siklus wajib diisi.');
      return;
    }
    const plantCount = Number(formPlantCount) || 0;
    const livePlants = Number(formLivePlants) || 0;
    const deadPlants = Number(formDeadPlants) || 0;
    if (plantCount < 0 || livePlants < 0 || deadPlants < 0) {
      setFormError('Jumlah tanaman tidak boleh negatif.');
      return;
    }

    const payload: CropCycle = {
      id: formId.trim().toUpperCase(),
      name: formName.trim(),
      melonVariety: formVariety.trim() || 'Golden Emerald',
      tunnel: formTunnel,
      startDate: formStartDate,
      plantingDate: formPlantingDate,
      harvestTargetDate: formHarvestTargetDate,
      actualHarvestDate: formActualHarvestDate || undefined,
      plantCount,
      livePlants,
      deadPlants,
      status: formStatus,
      notes: formNotes.trim() || undefined,
    };

    if (editingCycle) {
      await updateCycle(editingCycle.id, payload);
    } else {
      const ok = await addCycle(payload);
      if (!ok) return;
    }
    setIsModalOpen(false);
  };

  const selectedCycle = useMemo(() => {
    return db.cycles.find((c) => c.id === selectedCycleId) || db.cycles[0] || null;
  }, [db.cycles, selectedCycleId]);

  const cycleDetails = useMemo(() => {
    if (!selectedCycle) return null;

    let benih = 0;
    let nutrisi = 0;
    let pestisida = 0;
    let listrik = 0;
    let air = 0;
    let tenagaKerja = 0;
    let perlengkapan = 0;
    let lainnya = 0;

    const includeLabor = db.payrollSettings?.includeLaborInHpp ?? true;

    const linkedTrx = db.transactions.filter((t) => {
      if (t.type !== 'pengeluaran' || t.expenseGroup === 'investasi') return false;
      if (t.cycleId === selectedCycle.id) return true;
      if (
        includeLabor &&
        (t.category.toLowerCase().includes('gaji') || t.category.toLowerCase().includes('payroll')) &&
        (t.tunnel === selectedCycle.tunnel || t.tunnel === 'Semua Greenhouse')
      ) {
        const trxDate = new Date(t.date).getTime();
        const startDate = new Date(selectedCycle.startDate).getTime();
        const endDate = (selectedCycle.actualHarvestDate || selectedCycle.harvestTargetDate)
          ? new Date(selectedCycle.actualHarvestDate || selectedCycle.harvestTargetDate).getTime()
          : Date.now() + 86400000;
        return trxDate >= startDate && trxDate <= endDate;
      }
      return false;
    });

    linkedTrx.forEach((t) => {
      const amt = Number(t.amount) || 0;
      const cat = t.category.toLowerCase();
      if (cat.includes('benih')) benih += amt;
      else if (cat.includes('ab mix') || cat.includes('nutrisi')) nutrisi += amt;
      else if (cat.includes('pestisida') || cat.includes('fungisida') || cat.includes('insektisida')) pestisida += amt;
      else if (cat.includes('listrik')) listrik += amt;
      else if (cat.includes('air')) air += amt;
      else if (cat.includes('tenaga') || cat.includes('kerja') || cat.includes('upah') || cat.includes('gaji') || cat.includes('payroll') || cat.includes('karyawan')) tenagaKerja += amt;
      else if (cat.includes('perlengkapan') || cat.includes('kemasan') || cat.includes('media')) perlengkapan += amt;
      else lainnya += amt;
    });

    const totalBiayaProduksi = benih + nutrisi + pestisida + listrik + air + tenagaKerja + perlengkapan + lainnya;
    const linkedHarvests = db.harvests.filter((h) => h.cycleId === selectedCycle.id);
    const totalKgPanen = linkedHarvests.reduce((sum, h) => sum + (Number(h.totalWeightKg) || 0), 0);
    const totalOmzet = linkedHarvests.reduce((sum, h) => sum + (Number(h.totalRevenue) || 0), 0);
    const biayaPerTanaman = selectedCycle.plantCount > 0 ? Math.round(totalBiayaProduksi / selectedCycle.plantCount) : 0;
    const hppPerKg = totalKgPanen > 0 ? Math.round(totalBiayaProduksi / totalKgPanen) : 0;
    const labaBersih = totalOmzet - totalBiayaProduksi;
    const roiSiklus = totalBiayaProduksi > 0 ? (labaBersih / totalBiayaProduksi) * 100 : 0;
    const survivalRate = selectedCycle.plantCount > 0 ? (selectedCycle.livePlants / selectedCycle.plantCount) * 100 : 0;

    return {
      benih,
      nutrisi,
      pestisida,
      listrik,
      air,
      tenagaKerja,
      perlengkapan,
      lainnya,
      totalBiayaProduksi,
      totalKgPanen,
      totalOmzet,
      biayaPerTanaman,
      hppPerKg,
      labaBersih,
      roiSiklus,
      survivalRate,
      linkedTrx,
      linkedHarvests,
    };
  }, [selectedCycle, db.transactions, db.harvests, db.payrollSettings]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & New Cycle Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">Manajemen Siklus Tanam Melon Premium</h2>
          <p className="text-xs text-slate-500">
            Penghitungan akurat biaya benih, nutrisi AB Mix, biaya per tanaman, dan HPP per kg
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Buat Siklus Tanam Baru</span>
        </button>
      </div>

      {/* Cycle List Horizontal / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {db.cycles.map((c) => {
          const isSelected = selectedCycle?.id === c.id;
          const statusStyle = STATUS_COLORS[c.status] || STATUS_COLORS.Persiapan;
          return (
            <div
              key={c.id}
              onClick={() => setSelectedCycleId(c.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 text-left relative ${
                isSelected
                  ? 'bg-emerald-50/70 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    {c.id} · {c.tunnel}
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900 mt-0.5">{c.name}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Varietas: {c.melonVariety}</p>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                >
                  {c.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Populasi</span>
                  <span className="font-bold text-slate-900 font-mono">{formatNumber(c.plantCount)} pohon</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Tgl Tanam</span>
                  <span className="font-bold text-slate-800 font-mono">{c.plantingDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Target Panen</span>
                  <span className="font-bold text-emerald-700 font-mono">{c.harvestTargetDate}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[11px]">
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span>Lihat Rincian Biaya & HPP</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white cursor-pointer"
                    title="Ubah"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteCycle(c.id)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Cycle Comprehensive Financial & Agronomy Dashboard */}
      {selectedCycle && cycleDetails && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-6 animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  {selectedCycle.id}
                </span>
                <h3 className="font-black text-lg text-slate-900">{selectedCycle.name}</h3>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${STATUS_COLORS[selectedCycle.status].bg} ${
                    STATUS_COLORS[selectedCycle.status].text
                  }`}
                >
                  {selectedCycle.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Lokasi: <strong className="text-slate-700">{selectedCycle.tunnel}</strong> · Varietas:{' '}
                <strong className="text-slate-700">{selectedCycle.melonVariety}</strong> · Tanam:{' '}
                {selectedCycle.plantingDate} · Target Panen: {selectedCycle.harvestTargetDate}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Tingkat Kelangsungan Hidup</span>
                <span className="text-sm font-black text-emerald-700 font-mono">{formatPercent(cycleDetails.survivalRate)}</span>
                <span className="text-[10px] text-slate-500 block">
                  ({selectedCycle.livePlants} hidup / {selectedCycle.deadPlants} mati)
                </span>
              </div>
            </div>
          </div>

          {/* Key Calculation Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Biaya Produksi
              </span>
              <span className="text-lg font-black text-slate-900 block mt-1 font-mono">
                {formatCurrency(cycleDetails.totalBiayaProduksi)}
              </span>
              <span className="text-[11px] text-slate-400">Total modal operasional siklus</span>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200">
              <span className="text-[10px] font-semibold text-blue-900 uppercase tracking-wider block">
                Biaya Per Tanaman
              </span>
              <span className="text-lg font-black text-blue-800 block mt-1 font-mono">
                {formatCurrency(cycleDetails.biayaPerTanaman)}
              </span>
              <span className="text-[11px] text-blue-700/80">Biaya / {selectedCycle.plantCount} tanaman</span>
            </div>
            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200">
              <span className="text-[10px] font-semibold text-indigo-900 uppercase tracking-wider block">
                HPP Per KG
              </span>
              <span className="text-lg font-black text-indigo-800 block mt-1 font-mono">
                {formatCurrency(cycleDetails.hppPerKg)}
              </span>
              <span className="text-[11px] text-indigo-700/80">
                {cycleDetails.totalKgPanen > 0 ? `Berdasarkan ${cycleDetails.totalKgPanen} kg panen` : 'Menunggu panen'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <span className="text-[10px] font-semibold text-emerald-900 uppercase tracking-wider block">
                Laba Bersih Siklus
              </span>
              <span
                className={`text-lg font-black block mt-1 font-mono ${
                  cycleDetails.labaBersih >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {formatCurrency(cycleDetails.labaBersih)}
              </span>
              <span className="text-[11px] text-emerald-800/80 font-mono">
                Omzet: {formatCurrency(cycleDetails.totalOmzet)}
              </span>
            </div>
          </div>

          {/* Detailed Cost Table */}
          <div>
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-emerald-700" />
              <span>Rincian Komponen Biaya Operasional ({selectedCycle.id})</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-slate-500 block text-[11px]">1. Biaya Benih</span>
                <span className="font-bold text-slate-900 text-sm font-mono">{formatCurrency(cycleDetails.benih)}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-slate-500 block text-[11px]">2. AB Mix & Nutrisi</span>
                <span className="font-bold text-slate-900 text-sm font-mono">{formatCurrency(cycleDetails.nutrisi)}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-slate-500 block text-[11px]">3. Pestisida / Obat</span>
                <span className="font-bold text-slate-900 text-sm font-mono">{formatCurrency(cycleDetails.pestisida)}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-slate-500 block text-[11px]">4. Listrik Pompa DFT</span>
                <span className="font-bold text-slate-900 text-sm font-mono">{formatCurrency(cycleDetails.listrik)}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-slate-500 block text-[11px]">5. Air & Tandon</span>
                <span className="font-bold text-slate-900 text-sm font-mono">{formatCurrency(cycleDetails.air)}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-slate-500 block text-[11px]">6. Tenaga Kerja / Gaji</span>
                <span className="font-bold text-slate-900 text-sm font-mono">{formatCurrency(cycleDetails.tenagaKerja)}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-slate-500 block text-[11px]">7. Kemasan & Perlengkapan</span>
                <span className="font-bold text-slate-900 text-sm font-mono">{formatCurrency(cycleDetails.perlengkapan)}</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-slate-500 block text-[11px]">8. Biaya Operasional Lain</span>
                <span className="font-bold text-slate-900 text-sm font-mono">{formatCurrency(cycleDetails.lainnya)}</span>
              </div>
            </div>
          </div>

          {/* Linked Harvest Records */}
          {cycleDetails.linkedHarvests.length > 0 && (
            <div>
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-700" />
                <span>Hasil Panen & Penjualan Siklus ({selectedCycle.id})</span>
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Tanggal</th>
                      <th className="p-2.5">Total Kg</th>
                      <th className="p-2.5">Grade A / B / C</th>
                      <th className="p-2.5">Harga / Kg</th>
                      <th className="p-2.5 text-right">Omzet</th>
                      <th className="p-2.5">Pembeli</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cycleDetails.linkedHarvests.map((h) => (
                      <tr key={h.id}>
                        <td className="p-2.5 font-medium">{formatDate(h.date)}</td>
                        <td className="p-2.5 font-bold text-slate-900 font-mono">{formatNumber(h.totalWeightKg)} kg</td>
                        <td className="p-2.5 text-slate-600 font-mono">
                          {h.gradeAKg}kg (A) · {h.gradeBKg}kg (B) · {h.gradeCKg}kg (C)
                        </td>
                        <td className="p-2.5 font-mono">{formatCurrency(h.pricePerKg)}</td>
                        <td className="p-2.5 text-right font-black text-emerald-700 font-mono">
                          {formatCurrency(h.totalRevenue)}
                        </td>
                        <td className="p-2.5 text-slate-700">{h.buyer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {selectedCycle.notes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <span className="font-bold text-slate-900 block mb-0.5">Catatan Siklus:</span>
              <p>{selectedCycle.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Cycle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col my-auto text-xs">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                {editingCycle ? 'Ubah Siklus Tanam' : 'Tambah Siklus Tanam Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ID Siklus (contoh: S001)</label>
                  <input
                    type="text"
                    required
                    value={formId}
                    disabled={!!editingCycle}
                    onChange={(e) => setFormId(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lokasi Greenhouse</label>
                  <select
                    value={formTunnel}
                    onChange={(e) => setFormTunnel(e.target.value as TunnelType)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  >
                    {(db.tunnels || []).map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.widthM} x {t.lengthM} m)
                      </option>
                    ))}
                    <option value="Semua Greenhouse">Semua / Gabungan Greenhouse</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Siklus</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Siklus 2 - Inthanon RZ Eksklusif"
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Varietas Melon</label>
                  <input
                    type="text"
                    required
                    value={formVariety}
                    onChange={(e) => setFormVariety(e.target.value)}
                    placeholder="Inthanon, Golden Emerald, Fujisawa"
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Siklus</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as CycleStatus)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  >
                    <option value="Persiapan">Persiapan</option>
                    <option value="Tanam">Tanam</option>
                    <option value="Vegetatif">Vegetatif</option>
                    <option value="Generatif">Generatif</option>
                    <option value="Menjelang panen">Menjelang panen</option>
                    <option value="Panen">Panen</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tgl Mulai</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tgl Tanam</label>
                  <input
                    type="date"
                    value={formPlantingDate}
                    onChange={(e) => setFormPlantingDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Panen</label>
                  <input
                    type="date"
                    value={formHarvestTargetDate}
                    onChange={(e) => setFormHarvestTargetDate(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jumlah Tanaman</label>
                  <input
                    type="number"
                    min="1"
                    value={formPlantCount}
                    onChange={(e) => setFormPlantCount(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanaman Hidup</label>
                  <input
                    type="number"
                    min="0"
                    value={formLivePlants}
                    onChange={(e) => setFormLivePlants(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 text-emerald-700 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanaman Mati</label>
                  <input
                    type="number"
                    min="0"
                    value={formDeadPlants}
                    onChange={(e) => setFormDeadPlants(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 text-rose-600 font-bold font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Agronomi / Keterangan</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Catatan ppm nutrisi, brix target, kondisi cuaca..."
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
                  {editingCycle ? 'Simpan Perubahan' : 'Buat Siklus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
