import React, { useMemo } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import { NavItemKey } from '../components/Navigation';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Landmark,
  Sprout,
  Scale,
  Calculator,
  AlertTriangle,
  ArrowRight,
  Building2,
  Warehouse,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

interface DashboardProps {
  onNavigate: (tab: NavItemKey) => void;
  onOpenAddTransaction: () => void;
}

const PIE_COLORS = ['#10b981', '#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { metrics, db, lowStockItems } = useGreenhouse();

  // Cash Flow per Month
  const cashFlowMonthly = useMemo(() => {
    const monthlyMap: Record<string, { month: string; pemasukan: number; pengeluaran: number }> = {};
    db.transactions.forEach((t) => {
      const ym = t.date ? t.date.slice(0, 7) : '2026-01';
      if (!monthlyMap[ym]) {
        const [year, month] = ym.split('-');
        const dateObj = new Date(Number(year), Number(month) - 1, 1);
        const monthName = dateObj.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        monthlyMap[ym] = { month: monthName, pemasukan: 0, pengeluaran: 0 };
      }
      const amt = Number(t.amount) || 0;
      if (t.type === 'pemasukan') {
        monthlyMap[ym].pemasukan += amt;
      } else {
        monthlyMap[ym].pengeluaran += amt;
      }
    });
    return Object.keys(monthlyMap)
      .sort()
      .map((k) => monthlyMap[k]);
  }, [db.transactions]);

  // Expenses by Category
  const expenseByCategory = useMemo(() => {
    const catMap: Record<string, number> = {};
    db.transactions
      .filter((t) => t.type === 'pengeluaran')
      .forEach((t) => {
        const cat = t.category || 'Lainnya';
        catMap[cat] = (catMap[cat] || 0) + (Number(t.amount) || 0);
      });
    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [db.transactions]);

  // Omzet & Laba per Siklus
  const cycleFinancials = useMemo(() => {
    return db.cycles.map((c) => {
      let omzet = 0;
      db.harvests
        .filter((h) => h.cycleId === c.id)
        .forEach((h) => {
          omzet += Number(h.totalRevenue) || 0;
        });

      let biayaProduksi = 0;
      db.transactions
        .filter((t) => t.cycleId === c.id && t.type === 'pengeluaran' && t.expenseGroup !== 'investasi')
        .forEach((t) => {
          biayaProduksi += Number(t.amount) || 0;
        });

      const laba = omzet - biayaProduksi;
      return {
        id: c.id,
        name: c.id,
        fullName: c.name,
        omzet,
        biayaProduksi,
        laba,
      };
    });
  }, [db.cycles, db.harvests, db.transactions]);

  // HR & Payroll Integration Summary
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const currentPayrolls = useMemo(() => {
    // Karyawan konstruksi dikecualikan: upahnya tercatat sebagai Investasi (capex), bukan beban payroll operasional
    const constructionEmployeeIds = new Set(
      (db.employees || []).filter((e) => e.workArea === 'Konstruksi').map((e) => e.id)
    );
    return (db.payrolls || []).filter(
      (p) =>
        p.periodMonth === currentMonth &&
        p.periodYear === currentYear &&
        !constructionEmployeeIds.has(p.employeeId)
    );
  }, [db.payrolls, db.employees, currentMonth, currentYear]);

  const totalBebanPayrollBulanIni = useMemo(() => {
    return currentPayrolls.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
  }, [currentPayrolls]);

  const totalGajiTerbayarBulanIni = useMemo(() => {
    return currentPayrolls
      .filter((p) => p.status === 'Paid')
      .reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
  }, [currentPayrolls]);

  const totalGajiPendingBulanIni = useMemo(() => {
    return currentPayrolls
      .filter((p) => p.status !== 'Paid')
      .reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
  }, [currentPayrolls]);

  const activeStaffCount = useMemo(() => {
    // Staf operasional saja — pekerja konstruksi dikelola di modul HR Konstruksi
    return (db.employees || []).filter((e) => !e.isDeleted && e.isActive && e.workArea !== 'Konstruksi')
      .length;
  }, [db.employees]);

  return (
    <div className="space-y-6 pb-20">
      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-200/80 flex items-center justify-center text-amber-800 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Peringatan: {lowStockItems.length} Bahan Tanam Menipis</h3>
              <p className="text-xs text-amber-700">
                Segera restock: {lowStockItems.map((i) => `${i.name} (sisa ${i.currentStock} ${i.unit})`).join(', ')}.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('stok')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 transition cursor-pointer"
          >
            <span>Buka Stok</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main 8 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. SALDO KAS */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Kas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-lg sm:text-2xl font-black font-mono ${metrics.saldoKas >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            {formatCurrency(metrics.saldoKas)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Pemasukan dikurangi pengeluaran</p>
        </div>

        {/* 2. TOTAL OMZET */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Omzet</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-emerald-700">
            {formatCurrency(metrics.totalOmzet)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Seluruh penjualan melon</p>
        </div>

        {/* 3. TOTAL PENGELUARAN */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-rose-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pengeluaran</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-rose-700">
            {formatCurrency(metrics.totalPengeluaran)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Operasional + Investasi aset</p>
        </div>

        {/* 4. LABA BERSIH */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Laba Bersih</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-lg sm:text-2xl font-black font-mono ${metrics.labaBersih >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
            {formatCurrency(metrics.labaBersih)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Omzet - Biaya Operasional</p>
        </div>

        {/* 5. TOTAL INVESTASI */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Investasi</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-amber-800">
            {formatCurrency(metrics.totalInvestasi)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Bambu, UV, DFT & Peralatan</p>
        </div>

        {/* 6. MODAL PRODUKSI */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Modal Produksi</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
              <Sprout className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-blue-800">
            {formatCurrency(metrics.totalBiayaOperasional)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total biaya siklus operasional</p>
        </div>

        {/* 7. TOTAL PANEN */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Panen</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-slate-900">
            {formatNumber(metrics.totalPanenKg)} <span className="text-xs font-bold text-slate-500">KG</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Hasil panen kumulatif</p>
        </div>

        {/* 8. HPP / KG */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-indigo-300 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">HPP / KG</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-indigo-700">
            {formatCurrency(metrics.hppPerKg)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Biaya produksi / Kg panen</p>
        </div>
      </div>

      {/* Payback & ROI Highlights */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-base tracking-tight text-white">Status Pengembalian Modal & ROI</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Greenhouse {(db.tunnels || []).length} Unit · Total Kapasitas {((db.tunnels || []).reduce((a, b) => a + (Number(b.capacityPlants) || 0), 0)).toLocaleString('id-ID')} Tanaman DFT
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-slate-400 block font-medium">Modal Sudah Kembali</span>
              <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono">
                {formatCurrency(metrics.modalKembali)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-slate-400 block font-medium">Sisa Modal Belum Kembali</span>
              <span className="text-sm sm:text-base font-bold text-amber-400 font-mono">
                {formatCurrency(metrics.modalBelumKembali)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-slate-400 block font-medium">ROI Usaha (Kumulatif)</span>
              <span className="text-sm sm:text-base font-bold text-teal-400 font-mono">
                {formatPercent(metrics.roiPercent)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-slate-400 block font-medium">Biaya per Tanaman</span>
              <span className="text-sm sm:text-base font-bold text-white font-mono">
                {formatCurrency(metrics.biayaPerTanaman)}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar of Capital Payback */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-300 font-medium">
              Progress Pemulihan Investasi ({metrics.totalInvestasi > 0 ? ((metrics.modalKembali / metrics.totalInvestasi) * 100).toFixed(1) : 0}%)
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              {formatCurrency(metrics.modalKembali)} / {formatCurrency(metrics.totalInvestasi)}
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-700/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, metrics.totalInvestasi > 0 ? (metrics.modalKembali / metrics.totalInvestasi) * 100 : 0)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Integrasi Keuangan: Beban Gaji & Payroll Kebun */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900">Beban Payroll & Tenaga Kerja Kebun</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Tersinkronisasi Kas
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Penggajian {activeStaffCount} staf aktif terintegrasi langsung dengan arus kas operasional dan HPP panen melon
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('hr-payroll')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0 transition cursor-pointer"
          >
            <span>Buka Modul HR & Payroll</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-500 text-[11px] block mb-0.5">Estimasi Beban Bulan Ini</span>
            <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
              {formatCurrency(totalBebanPayrollBulanIni)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{currentPayrolls.length} catatan staf</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <span className="text-emerald-700 text-[11px] font-medium block mb-0.5">Gaji Sudah Terbayar (Kas Keluar)</span>
            <span className="text-base sm:text-lg font-black text-emerald-700 font-mono">
              {formatCurrency(totalGajiTerbayarBulanIni)}
            </span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">
              {currentPayrolls.filter((p) => p.status === 'Paid').length} staf lunas
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
            <span className="text-amber-700 text-[11px] font-medium block mb-0.5">Menunggu Pembayaran</span>
            <span className="text-base sm:text-lg font-black text-amber-700 font-mono">
              {formatCurrency(totalGajiPendingBulanIni)}
            </span>
            <span className="text-[10px] text-amber-600 block mt-0.5">
              {currentPayrolls.filter((p) => p.status !== 'Paid').length} staf draft / approved
            </span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80">
            <span className="text-blue-700 text-[11px] font-medium block mb-0.5">Status HPP Melon Premium</span>
            <span className="text-xs sm:text-sm font-bold text-blue-900 block mt-1">
              {db.payrollSettings?.includeLaborInHpp ? '· Masuk ke HPP Panen' : '· HPP Non-Tenaga Kerja'}
            </span>
            <span className="text-[10px] text-blue-600 block mt-0.5">
              {db.payrollSettings?.includeLaborInHpp ? 'Mempengaruhi HPP / Kg' : 'Biaya umum terpisah'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Required Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Cash Flow Bulanan */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Grafik Cash Flow Bulanan</h3>
              <p className="text-xs text-slate-500">Pemasukan vs Pengeluaran per bulan</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">Bulanan</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `Rp${val / 1000000}jt`} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(val), '']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="pemasukan" name="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Pengeluaran per Kategori */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Grafik Pengeluaran per Kategori</h3>
              <p className="text-xs text-slate-500">Kategori alokasi biaya terbesar</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">Top Alokasi</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(val), 'Biaya']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">Belum ada data pengeluaran</p>
            )}
          </div>
        </div>

        {/* Chart 3: Omzet per Siklus Tanam */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Grafik Omzet per Siklus Tanam</h3>
              <p className="text-xs text-slate-500">Pendapatan penjualan melon setiap siklus</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800">Siklus</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cycleFinancials} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `Rp${val / 1000000}jt`} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(val), 'Omzet']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="omzet" name="Omzet Penjualan (Rp)" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Laba per Siklus Tanam */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Grafik Laba per Siklus Tanam</h3>
              <p className="text-xs text-slate-500">Omzet dikurangi biaya produksi tiap siklus</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800">Profit</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cycleFinancials} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `Rp${val / 1000000}jt`} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(val), 'Laba']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="laba" name="Laba Bersih (Rp)" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Unit Tunnel Greenhouse Quick Overview */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Warehouse className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Unit Greenhouse</h3>
              <p className="text-xs text-slate-500">
                {(db.tunnels || []).length} Unit Terdaftar · Total Luas {(db.tunnels || []).reduce((acc, t) => acc + (t.lengthM * t.widthM), 0)} m² · {(db.tunnels || []).reduce((acc, t) => acc + (t.capacityPlants || 0), 0).toLocaleString('id-ID')} Tanaman
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('tunnels')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200/80 transition cursor-pointer"
          >
            <span>Kelola / Tambah Greenhouse</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {(db.tunnels || []).map((t) => {
            const activeCycle = db.cycles.find((c) => c.status !== 'Selesai' && (c.tunnel === t.name || c.tunnel === 'Semua Greenhouse'));
            return (
              <div
                key={t.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{t.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t.widthM}m × {t.lengthM}m ({t.widthM * t.lengthM} m²) · {t.systemType || 'DFT'}
                    </p>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      t.status === 'Aktif'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">
                    Kapasitas: <strong className="text-slate-800">{formatNumber(t.capacityPlants)}</strong>
                  </span>
                  <span className="text-emerald-700 font-semibold truncate max-w-[120px]">
                    {activeCycle ? `${activeCycle.id} (${activeCycle.melonVariety})` : 'Siap Tanam'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Crop Cycles Quick Cards */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Siklus Tanam Aktif di Greenhouse</h3>
            <p className="text-xs text-slate-500">
              {(db.tunnels || []).map((t) => `${t.name} (${t.widthM}x${t.lengthM}m)`).join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('kalender-panen')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Kalender Panen</span>
            </button>
            <button
              onClick={() => onNavigate('siklus')}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <span>Kelola Siklus</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {db.cycles.map((c) => {
            const isCompleted = c.status === 'Selesai';
            return (
              <div
                key={c.id}
                className={`p-4 rounded-xl border transition ${
                  isCompleted ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50/40 border-emerald-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      {c.tunnel} · {c.id}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 mt-0.5">{c.name}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">Varietas: {c.melonVariety}</p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      isCompleted
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-emerald-600 text-white shadow-xs'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Populasi</span>
                    <span className="font-bold text-slate-900 font-mono">{formatNumber(c.plantCount)} pohon</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Tanaman Hidup</span>
                    <span className="font-bold text-emerald-700 font-mono">{formatNumber(c.livePlants)} pohon</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Target Panen</span>
                    <span className="font-bold text-slate-800 font-mono">{c.harvestTargetDate}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
