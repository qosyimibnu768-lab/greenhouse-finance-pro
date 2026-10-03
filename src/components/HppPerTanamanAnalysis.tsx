import React, { useState, useMemo } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import {
  Sprout,
  Calculator,
  Layers,
  Users,
  Zap,
  Droplets,
  ShieldCheck,
  Package,
  TrendingUp,
  Scale,
  Percent,
  CheckCircle2,
  Info,
  Calendar,
  Sparkles,
  Sliders,
  ArrowRight,
  PieChart as PieChartLucide,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const HppPerTanamanAnalysis: React.FC = () => {
  const { db } = useGreenhouse();
  const [selectedCycleId, setSelectedCycleId] = useState<string>(
    db.cycles[0]?.id || 'ALL'
  );

  // Simulation state
  const [simPopulasi, setSimPopulasi] = useState<number>(1000);
  const [simHargaMelon, setSimHargaMelon] = useState<number>(35000);

  // Engine: Accumulate Input, Operational, and Overhead costs divided by plant population
  const analysisData = useMemo(() => {
    const cycleList = db.cycles.map((c) => {
      let bibit = 0;
      let nutrisi = 0;
      let mediaTanam = 0;
      let tenagaKerja = 0;
      let pestisida = 0;
      let kemasanLogistik = 0;
      let perlengkapanOps = 0;
      let listrik = 0;
      let air = 0;
      let overheadLain = 0;

      const includeLabor = db.payrollSettings?.includeLaborInHpp ?? true;

      // Extract all transactions linked to this cycle
      const linkedTrx = db.transactions.filter((t) => {
        if (t.type !== 'pengeluaran' || t.expenseGroup === 'investasi') return false;
        if (t.cycleId === c.id) return true;
        if (
          includeLabor &&
          (t.category.toLowerCase().includes('gaji') ||
            t.category.toLowerCase().includes('payroll') ||
            t.category.toLowerCase().includes('tenaga')) &&
          (t.tunnel === c.tunnel || t.tunnel === 'Kedua Tunnel' || t.tunnel === 'Umum / Fasilitas')
        ) {
          const trxDate = new Date(t.date).getTime();
          const startDate = new Date(c.startDate).getTime();
          const endDate = c.actualHarvestDate || c.harvestTargetDate
            ? new Date(c.actualHarvestDate || c.harvestTargetDate).getTime()
            : Date.now() + 86400000;
          return trxDate >= startDate && trxDate <= endDate;
        }
        return false;
      });

      linkedTrx.forEach((t) => {
        const amt = Number(t.amount) || 0;
        const cat = (t.category || '').toLowerCase();
        const note = (t.note || '').toLowerCase();

        // 1. Biaya Input Langsung
        if (cat.includes('benih') || cat.includes('bibit') || note.includes('benih') || note.includes('biji')) {
          bibit += amt;
        } else if (cat.includes('media') || cat.includes('rockwool') || note.includes('rockwool') || note.includes('netpot')) {
          mediaTanam += amt;
        } else if (cat.includes('ab mix') || cat.includes('nutrisi') || cat.includes('pupuk') || note.includes('kalsium') || note.includes('cng')) {
          nutrisi += amt;
        } else if (cat.includes('tenaga') || cat.includes('kerja') || cat.includes('gaji') || cat.includes('payroll') || cat.includes('upah') || t.id.startsWith('TRX-PAY-')) {
          tenagaKerja += amt;
        }
        // 2. Biaya Operasional Masa Tanam
        else if (cat.includes('pestisida') || cat.includes('fungisida') || cat.includes('insektisida') || note.includes('hama')) {
          pestisida += amt;
        } else if (cat.includes('kemasan') || cat.includes('box') || cat.includes('transportasi') || cat.includes('pick-up') || cat.includes('logistik')) {
          kemasanLogistik += amt;
        }
        // 3. Biaya Overhead
        else if (cat.includes('listrik') || cat.includes('token') || note.includes('pompa')) {
          listrik += amt;
        } else if (cat.includes('air') || note.includes('tandon') || note.includes('irigasi')) {
          air += amt;
        } else {
          perlengkapanOps += amt;
        }
      });

      // Synchronize with HR Payroll if labor was not recorded in manual transactions
      if (tenagaKerja === 0 && (db.payrolls || []).length > 0) {
        const cycleStart = new Date(c.startDate);
        const cycleEnd = new Date(c.actualHarvestDate || c.harvestTargetDate || Date.now());
        const matchingPayrolls = (db.payrolls || []).filter((p) => {
          const payDate = new Date(p.periodYear, p.periodMonth - 1, 15);
          return payDate >= cycleStart && payDate <= cycleEnd;
        });
        if (matchingPayrolls.length > 0) {
          tenagaKerja = Math.round(
            matchingPayrolls.reduce((s, p) => s + (Number(p.netSalary) || 0), 0) / 2
          );
        }
      }

      // Group totals
      const totalInputLangsung = bibit + nutrisi + mediaTanam + tenagaKerja;
      const totalOperasionalMasaTanam = pestisida + kemasanLogistik + perlengkapanOps;
      const totalOverhead = listrik + air + overheadLain;
      const totalBiayaAkumulasi = totalInputLangsung + totalOperasionalMasaTanam + totalOverhead;

      const plantCount = Number(c.plantCount) || 1000;
      const livePlants = Number(c.livePlants) || plantCount;
      const survivalRate = plantCount > 0 ? (livePlants / plantCount) * 100 : 0;

      // HPP Per Tanaman
      const hppPerTanaman = plantCount > 0 ? Math.round(totalBiayaAkumulasi / plantCount) : 0;
      const hppEfektifPanen = livePlants > 0 ? Math.round(totalBiayaAkumulasi / livePlants) : hppPerTanaman;

      // Harvest data
      const harvests = db.harvests.filter((h) => h.cycleId === c.id);
      const totalKg = harvests.reduce((s, h) => s + (Number(h.totalWeightKg) || 0), 0);
      const totalOmzet = harvests.reduce((s, h) => s + (Number(h.totalRevenue) || 0), 0);
      const hppPerKg = totalKg > 0 ? Math.round(totalBiayaAkumulasi / totalKg) : 0;
      const labaSiklus = totalOmzet - totalBiayaAkumulasi;
      const labaPerTanaman = livePlants > 0 && totalOmzet > 0 ? Math.round(labaSiklus / livePlants) : 0;

      return {
        id: c.id,
        name: c.name,
        tunnel: c.tunnel,
        melonVariety: c.melonVariety,
        status: c.status,
        plantCount,
        livePlants,
        survivalRate,
        bibit,
        nutrisi,
        mediaTanam,
        tenagaKerja,
        pestisida,
        kemasanLogistik,
        perlengkapanOps,
        listrik,
        air,
        overheadLain,
        totalBiayaInputLangsung: totalInputLangsung,
        totalBiayaOperasionalMasaTanam: totalOperasionalMasaTanam,
        totalBiayaOverhead: totalOverhead,
        totalBiayaAkumulasi,
        hppPerTanaman,
        hppEfektifPanen,
        totalKg,
        totalOmzet,
        hppPerKg,
        labaSiklus,
        labaPerTanaman,
      };
    });

    // Aggregate summary for all cycles
    const totalPlants = cycleList.reduce((s, c) => s + c.plantCount, 0);
    const totalLive = cycleList.reduce((s, c) => s + c.livePlants, 0);
    const totalCost = cycleList.reduce((s, c) => s + c.totalBiayaAkumulasi, 0);
    const totalInput = cycleList.reduce((s, c) => s + c.totalBiayaInputLangsung, 0);
    const totalOps = cycleList.reduce((s, c) => s + c.totalBiayaOperasionalMasaTanam, 0);
    const totalOh = cycleList.reduce((s, c) => s + c.totalBiayaOverhead, 0);
    const totalKg = cycleList.reduce((s, c) => s + c.totalKg, 0);
    const totalOmzet = cycleList.reduce((s, c) => s + c.totalOmzet, 0);

    const aggregateAll = {
      id: 'ALL',
      name: 'Konsolidasi Seluruh Siklus Kebun',
      tunnel: 'Semua Greenhouse',
      melonVariety: 'Campuran Varietas Melon DFT',
      status: 'Konsolidasi',
      plantCount: totalPlants,
      livePlants: totalLive,
      survivalRate: totalPlants > 0 ? (totalLive / totalPlants) * 100 : 96,
      bibit: cycleList.reduce((s, c) => s + c.bibit, 0),
      nutrisi: cycleList.reduce((s, c) => s + c.nutrisi, 0),
      mediaTanam: cycleList.reduce((s, c) => s + c.mediaTanam, 0),
      tenagaKerja: cycleList.reduce((s, c) => s + c.tenagaKerja, 0),
      pestisida: cycleList.reduce((s, c) => s + c.pestisida, 0),
      kemasanLogistik: cycleList.reduce((s, c) => s + c.kemasanLogistik, 0),
      perlengkapanOps: cycleList.reduce((s, c) => s + c.perlengkapanOps, 0),
      listrik: cycleList.reduce((s, c) => s + c.listrik, 0),
      air: cycleList.reduce((s, c) => s + c.air, 0),
      overheadLain: 0,
      totalBiayaInputLangsung: totalInput,
      totalBiayaOperasionalMasaTanam: totalOps,
      totalBiayaOverhead: totalOh,
      totalBiayaAkumulasi: totalCost,
      hppPerTanaman: totalPlants > 0 ? Math.round(totalCost / totalPlants) : 0,
      hppEfektifPanen: totalLive > 0 ? Math.round(totalCost / totalLive) : 0,
      totalKg,
      totalOmzet,
      hppPerKg: totalKg > 0 ? Math.round(totalCost / totalKg) : 0,
      labaSiklus: totalOmzet - totalCost,
      labaPerTanaman: totalLive > 0 && totalOmzet > 0 ? Math.round((totalOmzet - totalCost) / totalLive) : 0,
    };

    return { cycleList, aggregateAll };
  }, [db.cycles, db.transactions, db.harvests, db.payrolls, db.payrollSettings]);

  // Selected Active Cycle Data
  const activeCycle = useMemo(() => {
    if (selectedCycleId === 'ALL') return analysisData.aggregateAll;
    return (
      analysisData.cycleList.find((c) => c.id === selectedCycleId) ||
      analysisData.cycleList[0] ||
      analysisData.aggregateAll
    );
  }, [analysisData, selectedCycleId]);

  // Detailed Cost Items for the active cycle
  const costItems = useMemo(() => {
    const pop = activeCycle.plantCount || 1;
    const total = activeCycle.totalBiayaAkumulasi || 1;

    return [
      {
        no: 1,
        group: 'Input Langsung',
        label: 'Bibit & Benih Melon',
        description: 'Benih bersertifikat (Inthanon RZ / Golden Emerald F1)',
        amount: activeCycle.bibit,
        costPerPlant: Math.round(activeCycle.bibit / pop),
        percent: ((activeCycle.bibit / total) * 100).toFixed(1),
        color: '#10b981',
      },
      {
        no: 2,
        group: 'Input Langsung',
        label: 'Nutrisi Pupuk AB Mix',
        description: 'Formula makro & mikro khusus melon hidroponik DFT',
        amount: activeCycle.nutrisi,
        costPerPlant: Math.round(activeCycle.nutrisi / pop),
        percent: ((activeCycle.nutrisi / total) * 100).toFixed(1),
        color: '#059669',
      },
      {
        no: 3,
        group: 'Input Langsung',
        label: 'Media Tanam & Netpot',
        description: 'Rockwool cultilene, netpot lubang tanam & kain flanel',
        amount: activeCycle.mediaTanam,
        costPerPlant: Math.round(activeCycle.mediaTanam / pop),
        percent: ((activeCycle.mediaTanam / total) * 100).toFixed(1),
        color: '#047857',
      },
      {
        no: 4,
        group: 'Input Langsung',
        label: 'Upah & Tenaga Kerja',
        description: 'Upah semai, tanam, pruning, polinasi & pemeliharaan staf',
        amount: activeCycle.tenagaKerja,
        costPerPlant: Math.round(activeCycle.tenagaKerja / pop),
        percent: ((activeCycle.tenagaKerja / total) * 100).toFixed(1),
        color: '#6366f1',
      },
      {
        no: 5,
        group: 'Operasional Masa Tanam',
        label: 'Perlindungan Tanaman',
        description: 'Fungisida & insektisida pencegahan thrips / jamur',
        amount: activeCycle.pestisida,
        costPerPlant: Math.round(activeCycle.pestisida / pop),
        percent: ((activeCycle.pestisida / total) * 100).toFixed(1),
        color: '#3b82f6',
      },
      {
        no: 6,
        group: 'Operasional Masa Tanam',
        label: 'Kemasan & Logistik',
        description: 'Kardus box eksklusif, keranjang sortir & distribusi',
        amount: activeCycle.kemasanLogistik,
        costPerPlant: Math.round(activeCycle.kemasanLogistik / pop),
        percent: ((activeCycle.kemasanLogistik / total) * 100).toFixed(1),
        color: '#ec4899',
      },
      {
        no: 7,
        group: 'Overhead Siklus',
        label: 'Listrik Pompa & Aerasi',
        description: 'Token listrik PLN sirkulasi talang DFT & panel timer',
        amount: activeCycle.listrik,
        costPerPlant: Math.round(activeCycle.listrik / pop),
        percent: ((activeCycle.listrik / total) * 100).toFixed(1),
        color: '#f59e0b',
      },
      {
        no: 8,
        group: 'Overhead Siklus',
        label: 'Pasokan Air & Tandon',
        description: 'Air baku tandon 5000L & sterilisasi pipa',
        amount: activeCycle.air,
        costPerPlant: Math.round(activeCycle.air / pop),
        percent: ((activeCycle.air / total) * 100).toFixed(1),
        color: '#06b6d4',
      },
    ];
  }, [activeCycle]);

  // Donut chart data for HPP per plant
  const chartData = useMemo(() => {
    return [
      { name: 'Nutrisi AB Mix', value: activeCycle.nutrisi, color: '#10b981' },
      { name: 'Tenaga Kerja', value: activeCycle.tenagaKerja, color: '#6366f1' },
      { name: 'Listrik & Utilitas', value: activeCycle.listrik + activeCycle.air, color: '#f59e0b' },
      { name: 'Benih & Media', value: activeCycle.bibit + activeCycle.mediaTanam, color: '#3b82f6' },
      { name: 'Kemasan & Logistik', value: activeCycle.kemasanLogistik, color: '#ec4899' },
      { name: 'Proteksi Tanaman', value: activeCycle.pestisida, color: '#06b6d4' },
    ].filter((item) => item.value > 0);
  }, [activeCycle]);

  // Dynamic simulation result
  const simulationResult = useMemo(() => {
    const pop = Math.max(100, simPopulasi);
    // Direct inputs scale with population, overhead is partially fixed
    const baseDirect = activeCycle.totalBiayaInputLangsung;
    const baseOps = activeCycle.totalBiayaOperasionalMasaTanam;
    const baseOh = activeCycle.totalBiayaOverhead;

    const scaledDirect = (baseDirect / (activeCycle.plantCount || 1)) * pop;
    const scaledOps = (baseOps / (activeCycle.plantCount || 1)) * pop;
    const fixedOh = baseOh * 0.7 + (baseOh * 0.3 * pop) / (activeCycle.plantCount || 1);

    const totalSimCost = scaledDirect + scaledOps + fixedOh;
    const simHppPerPlant = Math.round(totalSimCost / pop);

    // Yield estimation: 1 melon / plant @ 1.65 kg
    const estKg = pop * 1.65;
    const estRevenue = estKg * simHargaMelon;
    const estProfit = estRevenue - totalSimCost;
    const estProfitPerPlant = Math.round(estProfit / pop);
    const estMargin = estRevenue > 0 ? (estProfit / estRevenue) * 100 : 0;

    return {
      pop,
      totalSimCost,
      simHppPerPlant,
      estKg,
      estRevenue,
      estProfit,
      estProfitPerPlant,
      estMargin,
      savingsVsBase: activeCycle.hppPerTanaman - simHppPerPlant,
    };
  }, [activeCycle, simPopulasi, simHargaMelon]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Header & Cycle Selector Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Sprout className="w-4 h-4" />
            <span>Analisis Harga Pokok Produksi (HPP)</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Analisis Komprehensif HPP Per Tanaman Melon DFT
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Akumulasi biaya input (bibit, nutrisi, media, tenaga kerja) + operasional masa tanam + overhead dibagi populasi tanaman aktif
          </p>
        </div>

        {/* Cycle Switcher */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
          <Calendar className="w-4 h-4 text-emerald-600 ml-2 shrink-0" />
          <span className="text-xs font-bold text-slate-700">Pilih Siklus:</span>
          <select
            value={selectedCycleId}
            onChange={(e) => {
              setSelectedCycleId(e.target.value);
              const found = analysisData.cycleList.find((c) => c.id === e.target.value);
              if (found) setSimPopulasi(found.plantCount);
            }}
            className="text-xs font-semibold px-3 py-1.5 border border-slate-300 rounded-xl focus:border-emerald-600 outline-none bg-white text-slate-900 cursor-pointer"
          >
            <option value="ALL">Semua Siklus (Rata-rata Gabungan)</option>
            {analysisData.cycleList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} - {c.name} ({c.tunnel})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Formula Transparency Box */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 rounded-3xl shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-300" />
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
            Formula Perhitungan HPP Per Tanaman
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs font-mono text-xs sm:text-sm text-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="font-bold text-white">HPP Per Tanaman = </span>
            <span>(Biaya Input + Operasional Tanam + Overhead) ÷ Populasi Tanaman</span>
          </div>
          <div className="text-right text-xs bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-400/30 text-emerald-200">
            ({formatCurrency(activeCycle.totalBiayaInputLangsung)} + {formatCurrency(activeCycle.totalBiayaOperasionalMasaTanam)} + {formatCurrency(activeCycle.totalBiayaOverhead)}) ÷ {formatNumber(activeCycle.plantCount)} Pohon
          </div>
        </div>
        <p className="text-[11px] text-emerald-200/80">
          Siklus terpilih: <strong>{activeCycle.name}</strong> • Varietas:{' '}
          <strong>{activeCycle.melonVariety}</strong> • Populasi:{' '}
          <strong>{formatNumber(activeCycle.plantCount)} Tanaman</strong> (Survival Rate:{' '}
          <strong>{formatPercent(activeCycle.survivalRate)}</strong>)
        </p>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Card 1: HPP Per Tanaman (Main Output) */}
        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-500/60 shadow-2xs col-span-2 md:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                HPP Per Tanaman
              </span>
              <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <Sprout className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-emerald-800 font-mono">
              {formatCurrency(activeCycle.hppPerTanaman)}
            </h3>
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block font-sans">
            Biaya modal per lubang tanam
          </span>
        </div>

        {/* Card 2: HPP Efektif Per Tanaman Panen */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">HPP Efektif Panen</span>
              <div className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-xl font-black text-teal-800 font-mono">
              {formatCurrency(activeCycle.hppEfektifPanen)}
            </h3>
          </div>
          <span className="text-[10px] text-teal-700 font-medium mt-2 block">
            Berdasarkan {formatNumber(activeCycle.livePlants)} pohon hidup
          </span>
        </div>

        {/* Card 3: Biaya Input Langsung */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">1. Input Langsung</span>
              <div className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 font-mono">
              {formatCurrency(activeCycle.totalBiayaInputLangsung)}
            </h3>
          </div>
          <span className="text-[10px] text-indigo-700 font-semibold mt-2 block">
            {activeCycle.totalBiayaAkumulasi > 0
              ? `${((activeCycle.totalBiayaInputLangsung / activeCycle.totalBiayaAkumulasi) * 100).toFixed(1)}% dari total HPP`
              : '0%'}
          </span>
        </div>

        {/* Card 4: Operasional Masa Tanam */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">2. Operasional Tanam</span>
              <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 font-mono">
              {formatCurrency(activeCycle.totalBiayaOperasionalMasaTanam)}
            </h3>
          </div>
          <span className="text-[10px] text-blue-700 font-semibold mt-2 block">
            {activeCycle.totalBiayaAkumulasi > 0
              ? `${((activeCycle.totalBiayaOperasionalMasaTanam / activeCycle.totalBiayaAkumulasi) * 100).toFixed(1)}% dari total HPP`
              : '0%'}
          </span>
        </div>

        {/* Card 5: Biaya Overhead Siklus */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">3. Overhead Siklus</span>
              <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 font-mono">
              {formatCurrency(activeCycle.totalBiayaOverhead)}
            </h3>
          </div>
          <span className="text-[10px] text-amber-700 font-semibold mt-2 block">
            Listrik {formatCurrency(activeCycle.listrik)} • Air {formatCurrency(activeCycle.air)}
          </span>
        </div>
      </div>

      {/* Breakdown Matrix Table & Donut Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table: Itemized Breakdown of HPP Per Tanaman */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                <span>Rincian Komponen Biaya Pembentuk HPP Per Tanaman</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dekomposisi biaya per tanaman (Rp/Pohon) pada populasi {formatNumber(activeCycle.plantCount)} tanaman
              </p>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200">
              Total: {formatCurrency(activeCycle.totalBiayaAkumulasi)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="py-3 px-4">Komponen Biaya</th>
                  <th className="py-3 px-4">Kategori Akun</th>
                  <th className="py-3 px-4 text-right">Total Siklus</th>
                  <th className="py-3 px-4 text-right text-emerald-800 font-bold">Biaya / Tanaman</th>
                  <th className="py-3 px-4 text-center">Porsi (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {costItems.map((item) => (
                  <tr key={item.no} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <div>
                          <span className="font-bold text-slate-900 block">{item.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{item.description}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-500 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {item.group}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                      {formatCurrency(item.costPerPlant)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700 font-sans">
                      {item.percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-emerald-50/50 font-mono border-t-2 border-emerald-200 font-bold text-xs text-slate-900">
                <tr>
                  <td colSpan={2} className="py-3.5 px-4 font-sans font-extrabold text-emerald-950">
                    TOTAL HPP PER TANAMAN ({formatNumber(activeCycle.plantCount)} POHON)
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-emerald-950">
                    {formatCurrency(activeCycle.totalBiayaAkumulasi)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-emerald-800 text-base">
                    {formatCurrency(activeCycle.hppPerTanaman)}
                  </td>
                  <td className="py-3.5 px-4 text-center font-sans">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Donut Chart: Cost Proportion per Plant */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <PieChartLucide className="w-4 h-4 text-emerald-600" />
              <span>Komposisi HPP Per Tanaman</span>
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Persentase kontribusi biaya per titik tanaman melon
            </p>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val) || 0)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
            {chartData.map((item) => (
              <div key={item.name} className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="font-mono font-medium text-slate-900 shrink-0">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Population & Cost Simulation Calculator */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-700" />
              <span>SIMULATOR EFISIENSI POPULASI TANAMAN & HPP PROYEKSI</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulasikan penambahan populasi lubang tanam atau perubahan harga jual melon untuk mengukur penurunan HPP per tanaman
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 self-start sm:self-auto">
            Sensitivitas Biaya Skala Tanam
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
                <span>Simulasi Jumlah Populasi Tanaman:</span>
                <span className="font-mono font-black text-emerald-700 text-sm">{formatNumber(simPopulasi)} Tanaman</span>
              </div>
              <input
                type="range"
                min={500}
                max={2500}
                step={50}
                value={simPopulasi}
                onChange={(e) => setSimPopulasi(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>500 Pohon</span>
                <span>1.000 Pohon (Standar)</span>
                <span>2.000 Pohon (2 Tunnel)</span>
                <span>2.500 Pohon</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
                <span>Asumsi Harga Jual Melon per Kg:</span>
                <span className="font-mono font-black text-indigo-700 text-sm">{formatCurrency(simHargaMelon)} / Kg</span>
              </div>
              <input
                type="range"
                min={20000}
                max={50000}
                step={1000}
                value={simHargaMelon}
                onChange={(e) => setSimHargaMelon(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Rp 20.000 (Grosir)</span>
                <span>Rp 35.000 (Grade A)</span>
                <span>Rp 50.000 (Premium Super)</span>
              </div>
            </div>
          </div>

          {/* Simulation Result Output Cards */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Proyeksi HPP / Tanaman</span>
              <span className="text-lg font-black text-emerald-800 font-mono mt-1 block">
                {formatCurrency(simulationResult.simHppPerPlant)}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium block">
                {simulationResult.savingsVsBase > 0
                  ? `Hemat ${formatCurrency(simulationResult.savingsVsBase)} / pohon`
                  : simulationResult.savingsVsBase < 0
                  ? `+${formatCurrency(Math.abs(simulationResult.savingsVsBase))} / pohon`
                  : 'Sesuai aktual'}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Estimasi Panen Buah</span>
              <span className="text-lg font-black text-slate-900 font-mono mt-1 block">
                {formatNumber(Math.round(simulationResult.estKg))} Kg
              </span>
              <span className="text-[10px] text-slate-500 block">
                Asumsi 1.65 kg / pohon
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Proyeksi Laba Bersih</span>
              <span className={`text-lg font-black font-mono mt-1 block ${simulationResult.estProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatCurrency(simulationResult.estProfit)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Margin: {simulationResult.estMargin.toFixed(1)}%
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Laba per Tanaman</span>
              <span className="text-lg font-black text-teal-800 font-mono mt-1 block">
                {formatCurrency(simulationResult.estProfitPerPlant)}
              </span>
              <span className="text-[10px] text-teal-700 font-medium block">
                Keuntungan bersih / pohon
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
