import React, { useState, useMemo, useEffect } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import {
  exportFinancialReportToCSV,
  exportFinancialReportToPDF,
  ExportOptions,
} from '../utils/exportReports';
import {
  BarChart3,
  Calculator,
  Percent,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Download,
  Sliders,
  CheckCircle2,
  X,
  Sparkles,
  Users,
  Wallet,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  ShieldCheck,
  HelpCircle,
  Check,
  Info,
  Filter,
  ArrowRight,
  Eye,
  Calendar,
  Layers,
  Sprout,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  PieChart as PieChartLucide,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { HppPerTanamanAnalysis } from '../components/HppPerTanamanAnalysis';
import { getStructureMaterials, getSystemTypes, getTotalCapacity } from '../utils/greenhouseSpec';

export const ReportsPage: React.FC = () => {
  const { db, metrics, addToast } = useGreenhouse();

  // Spesifikasi greenhouse mengikuti data Manajemen GH (kosong = teks ikut hilang)
  const ghTunnels = db.tunnels || [];
  const ghStructureMaterials = getStructureMaterials(ghTunnels);
  const ghSystemTypes = getSystemTypes(ghTunnels);
  const ghTotalCapacity = getTotalCapacity(ghTunnels);
  const [activeReportTab, setActiveReportTab] = useState<
    'labarugi' | 'hpp-tanaman' | 'bulanan' | 'cashflow' | 'siklus' | 'bep-roi'
  >('labarugi');

  // Filter States for Comprehensive Laba Rugi
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');
  const [selectedTunnelFilter, setSelectedTunnelFilter] = useState<string>('ALL');
  const [capexAccountingMethod, setCapexAccountingMethod] = useState<'full_cash' | 'amortized'>('full_cash');

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('Greenhouse Melon Premium Modern');
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'csv'>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  // BEP Interactive Calculator Inputs
  const [bepInvestment, setBepInvestment] = useState<string>(String(metrics.totalInvestasi || 110000000));
  const [bepFixedCostPerCycle, setBepFixedCostPerCycle] = useState<string>('5000000');
  const [bepVariableCostPerKg, setBepVariableCostPerKg] = useState<string>(String(metrics.hppPerKg || 12000));
  const [bepPricePerKg, setBepPricePerKg] = useState<string>('35000');
  const [bepKgPerCycle, setBepKgPerCycle] = useState<string>('2000');
  const [bepManual, setBepManual] = useState({
    investment: false,
    fixed: false,
    variable: false,
    price: false,
    kgCycle: false,
  });

  // Data aktual kebun (jika sudah ada) — dipakai untuk mengisi kalkulator otomatis
  const actualHarvestKg = db.harvests.reduce((s, h) => s + (Number(h.totalWeightKg) || 0), 0);
  const actualHarvestRevenue = db.harvests.reduce((s, h) => s + (Number(h.totalRevenue) || 0), 0);
  const actualAvgPrice = actualHarvestKg > 0 ? Math.round(actualHarvestRevenue / actualHarvestKg) : 0;
  const actualKgPerCycle =
    db.cycles.length > 0
      ? Math.round(
          (db.cycles.reduce((s, c) => s + (Number(c.plantCount) || 0), 0) / db.cycles.length) * 1.65
        )
      : 0;

  // Sinkronisasi otomatis selama input belum diubah manual oleh pengguna
  useEffect(() => {
    if (!bepManual.investment && metrics.totalInvestasi > 0) setBepInvestment(String(metrics.totalInvestasi));
  }, [metrics.totalInvestasi, bepManual.investment]);
  useEffect(() => {
    if (!bepManual.variable && metrics.hppPerKg > 0) setBepVariableCostPerKg(String(metrics.hppPerKg));
  }, [metrics.hppPerKg, bepManual.variable]);
  useEffect(() => {
    if (!bepManual.price && actualAvgPrice > 0) setBepPricePerKg(String(actualAvgPrice));
  }, [actualAvgPrice, bepManual.price]);
  useEffect(() => {
    if (!bepManual.kgCycle && actualKgPerCycle > 0) setBepKgPerCycle(String(actualKgPerCycle));
  }, [actualKgPerCycle, bepManual.kgCycle]);

  // =========================================================================
  // 1. AUTOMATIC COMPREHENSIVE MONTHLY PROFIT & LOSS ENGINE
  // =========================================================================
  const monthlyComprehensivePnL = useMemo(() => {
    // Extract unique year-month keys from transactions, harvests, and payrolls
    const monthsSet = new Set<string>();

    db.transactions.forEach((t) => {
      if (t.date) monthsSet.add(t.date.slice(0, 7));
    });
    db.harvests.forEach((h) => {
      if (h.date) monthsSet.add(h.date.slice(0, 7));
    });
    (db.payrolls || []).forEach((p) => {
      if (p.periodYear && p.periodMonth) {
        const ym = `${p.periodYear}-${String(p.periodMonth).padStart(2, '0')}`;
        monthsSet.add(ym);
      }
    });

    const sortedMonthKeys = Array.from(monthsSet).sort();

    // Total capex across entire project for amortization calculation
    const totalProjectCapex = db.transactions
      .filter((t) => t.type === 'pengeluaran' && t.expenseGroup === 'investasi')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || metrics.totalInvestasi || 110000000;

    // Monthly depreciation estimate (5 years = 60 months)
    const monthlyDepreciation = Math.round(totalProjectCapex / 60);

    let cumulativeRevenue = 0;
    let cumulativeOpex = 0;
    let cumulativeLabor = 0;
    let cumulativeCapex = 0;
    let cumulativeNetProfit = 0;

    return sortedMonthKeys.map((ym) => {
      const [yearStr, monthStr] = ym.split('-');
      const year = Number(yearStr);
      const monthNum = Number(monthStr);
      const dateObj = new Date(year, monthNum - 1, 1);
      const monthLabel = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const shortLabel = dateObj.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });

      // Filter transactions for this month and tunnel
      const monthTrxs = db.transactions.filter((t) => {
        if (!t.date || !t.date.startsWith(ym)) return false;
        if (selectedTunnelFilter !== 'ALL') {
          if (t.tunnel && t.tunnel !== selectedTunnelFilter && t.tunnel !== 'Semua Greenhouse') {
            return false;
          }
        }
        return true;
      });

      // Filter harvests for this month
      const monthHarvests = db.harvests.filter((h) => {
        if (!h.date || !h.date.startsWith(ym)) return false;
        if (selectedTunnelFilter !== 'ALL' && h.tunnel !== selectedTunnelFilter) {
          return false;
        }
        return true;
      });

      // 1. REVENUE (PENDAPATAN DARI PANEN)
      // Hanya transaksi penjualan hasil panen (kategori mengandung "melon"/"penjualan")
      // yang dihitung sebagai pendapatan. Setoran modal / pendanaan (mis. "Modal Masuk")
      // TIDAK dihitung sebagai omzet — konsisten dengan perhitungan Dashboard.
      const harvestRevenueTrx = monthTrxs
        .filter((t) => {
          if (t.type !== 'pemasukan') return false;
          const cat = (t.category || '').toLowerCase();
          return cat.includes('melon') || cat.includes('penjualan');
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const harvestKg = monthHarvests.reduce((sum, h) => sum + (Number(h.totalWeightKg) || 0), 0);
      const harvestRevenueRecords = monthHarvests.reduce((sum, h) => sum + (Number(h.totalRevenue) || 0), 0);

      const pendapatanPanen = Math.max(harvestRevenueTrx, harvestRevenueRecords);

      // Breakdown Revenue
      const gradeAKg = monthHarvests.reduce((sum, h) => sum + (Number(h.gradeAKg) || 0), 0);
      const gradeBKg = monthHarvests.reduce((sum, h) => sum + (Number(h.gradeBKg) || 0), 0);
      const gradeCKg = monthHarvests.reduce((sum, h) => sum + (Number(h.gradeCKg) || 0), 0);

      // 2. OPERATIONAL EXPENSES (BIAYA OPERASIONAL BAHAN & UTILITAS)
      let benihMedia = 0;
      let pupukNutrisi = 0;
      let pestisidaProteksi = 0;
      let utilitasListrikAir = 0;
      let kemasanLogistik = 0;
      let operasionalLainnya = 0;

      // 3. STAFF SALARY & PAYROLL (GAJI STAF & TENAGA KERJA)
      let gajiPokok = 0;
      let upahLembur = 0;
      let tunjanganTransport = 0;
      let bonusPanen = 0;
      let totalGajiStaf = 0;

      // 4. INVESTMENTS (BELANJA MODAL / CAPEX)
      let investasiStrukturBambu = 0;
      let investasiPlastikNet = 0;
      let investasiInstalasiDft = 0;
      let investasiOtomasiSensor = 0;
      let totalInvestasi = 0;

      monthTrxs.forEach((t) => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'pengeluaran') {
          if (t.expenseGroup === 'investasi') {
            totalInvestasi += amt;
            const sub = (t.subcategory || t.category || '').toLowerCase();
            const note = (t.note || '').toLowerCase();
            if (sub.includes('bambu') || sub.includes('pondasi') || sub.includes('tukang') || note.includes('rangka')) {
              investasiStrukturBambu += amt;
            } else if (sub.includes('plastik') || sub.includes('net') || note.includes('uv')) {
              investasiPlastikNet += amt;
            } else if (sub.includes('gully') || sub.includes('tandon') || sub.includes('pipa') || sub.includes('pompa')) {
              investasiInstalasiDft += amt;
            } else {
              investasiOtomasiSensor += amt;
            }
          } else {
            // Check if labor / salary
            const cat = (t.category || '').toLowerCase();
            const note = (t.note || '').toLowerCase();
            const isLabor =
              cat.includes('gaji') ||
              cat.includes('payroll') ||
              cat.includes('tenaga kerja') ||
              cat.includes('karyawan') ||
              t.id.startsWith('TRX-PAY-');

            if (isLabor) {
              totalGajiStaf += amt;
              if (note.includes('lembur')) upahLembur += amt;
              else if (note.includes('bonus')) bonusPanen += amt;
              else if (note.includes('tunjangan') || note.includes('makan')) tunjanganTransport += amt;
              else gajiPokok += amt;
            } else {
              // Materials and utilities
              if (cat.includes('benih') || cat.includes('media') || cat.includes('rockwool')) {
                benihMedia += amt;
              } else if (cat.includes('ab mix') || cat.includes('nutrisi') || cat.includes('pupuk')) {
                pupukNutrisi += amt;
              } else if (cat.includes('pestisida') || cat.includes('fungisida') || cat.includes('insektisida')) {
                pestisidaProteksi += amt;
              } else if (cat.includes('listrik') || cat.includes('air') || cat.includes('pompa') || cat.includes('token')) {
                utilitasListrikAir += amt;
              } else if (cat.includes('kemasan') || cat.includes('box') || cat.includes('transportasi') || cat.includes('pick-up') || cat.includes('logistik')) {
                kemasanLogistik += amt;
              } else {
                operasionalLainnya += amt;
              }
            }
          }
        }
      });

      // Synchronize with HR Payroll records if transactions are not explicitly tagged
      const monthPayrollRecords = (db.payrolls || []).filter(
        (p) => p.periodYear === year && p.periodMonth === monthNum
      );
      if (totalGajiStaf === 0 && monthPayrollRecords.length > 0) {
        totalGajiStaf = monthPayrollRecords.reduce((s, p) => s + (Number(p.netSalary) || 0), 0);
        gajiPokok = monthPayrollRecords.reduce((s, p) => s + (Number(p.baseSalary || p.dailyWages) || 0), 0);
        upahLembur = monthPayrollRecords.reduce((s, p) => s + (Number(p.overtimePay) || 0), 0);
        tunjanganTransport = monthPayrollRecords.reduce((s, p) => s + (Number(p.allowanceMeal + p.allowanceTransport) || 0), 0);
        bonusPanen = monthPayrollRecords.reduce((s, p) => s + (Number(p.bonusHarvest) || 0), 0);
      }

      const totalBiayaOperasionalBahan =
        benihMedia + pupukNutrisi + pestisidaProteksi + utilitasListrikAir + kemasanLogistik + operasionalLainnya;

      const totalBiayaOperasional = totalBiayaOperasionalBahan + totalGajiStaf;

      // Operating Profit (EBITDA) = Harvest Revenue - Total Operational Cost (Materials + Labor)
      const labaOperasional = pendapatanPanen - totalBiayaOperasional;
      const marginOperasional = pendapatanPanen > 0 ? (labaOperasional / pendapatanPanen) * 100 : 0;

      // Capex allocation based on chosen accounting method
      const bebanInvestasiDiperhitungkan =
        capexAccountingMethod === 'full_cash' ? totalInvestasi : monthlyDepreciation;

      // Comprehensive Net Profit = Harvest Revenue - (Operational Cost + Staff Salary + Investment)
      const labaBersihKomprehensif = pendapatanPanen - totalBiayaOperasional - bebanInvestasiDiperhitungkan;
      const marginBersihKomprehensif =
        pendapatanPanen > 0 ? (labaBersihKomprehensif / pendapatanPanen) * 100 : 0;

      // Evaluation Status
      let statusLabel: 'Sangat Menguntungkan' | 'Menguntungkan' | 'Titik Impas' | 'Fase Investasi Awal' | 'Defisit Operasional';
      let statusColor: string;
      let statusBg: string;

      if (labaBersihKomprehensif > 10000000) {
        statusLabel = 'Sangat Menguntungkan';
        statusColor = 'text-emerald-700';
        statusBg = 'bg-emerald-100 border-emerald-200';
      } else if (labaBersihKomprehensif > 0) {
        statusLabel = 'Menguntungkan';
        statusColor = 'text-teal-700';
        statusBg = 'bg-teal-100 border-teal-200';
      } else if (labaBersihKomprehensif === 0) {
        statusLabel = 'Titik Impas';
        statusColor = 'text-amber-700';
        statusBg = 'bg-amber-100 border-amber-200';
      } else if (totalInvestasi > 0 && labaOperasional >= 0) {
        statusLabel = 'Fase Investasi Awal';
        statusColor = 'text-blue-700';
        statusBg = 'bg-blue-100 border-blue-200';
      } else {
        statusLabel = 'Defisit Operasional';
        statusColor = 'text-rose-700';
        statusBg = 'bg-rose-100 border-rose-200';
      }

      cumulativeRevenue += pendapatanPanen;
      cumulativeOpex += totalBiayaOperasionalBahan;
      cumulativeLabor += totalGajiStaf;
      cumulativeCapex += bebanInvestasiDiperhitungkan;
      cumulativeNetProfit += labaBersihKomprehensif;

      return {
        key: ym,
        year,
        monthNum,
        monthLabel,
        shortLabel,
        pendapatanPanen,
        harvestKg,
        gradeAKg,
        gradeBKg,
        gradeCKg,
        // Material & Utility Cost
        benihMedia,
        pupukNutrisi,
        pestisidaProteksi,
        utilitasListrikAir,
        kemasanLogistik,
        operasionalLainnya,
        totalBiayaOperasionalBahan,
        // Staff Salary Cost
        gajiPokok,
        upahLembur,
        tunjanganTransport,
        bonusPanen,
        totalGajiStaf,
        // Combined Opex
        totalBiayaOperasional,
        labaOperasional,
        marginOperasional,
        // Capex
        investasiStrukturBambu,
        investasiPlastikNet,
        investasiInstalasiDft,
        investasiOtomasiSensor,
        totalInvestasi,
        bebanInvestasiDiperhitungkan,
        // Comprehensive Net Profit
        labaBersihKomprehensif,
        marginBersihKomprehensif,
        // Status & Cumulatives
        statusLabel,
        statusColor,
        statusBg,
        cumulativeRevenue,
        cumulativeOpex,
        cumulativeLabor,
        cumulativeCapex,
        cumulativeNetProfit,
      };
    });
  }, [db.transactions, db.harvests, db.payrolls, selectedTunnelFilter, capexAccountingMethod, metrics.totalInvestasi]);

  // Estimasi Biaya Tetap per Siklus dari data aktual:
  // (rata-rata gaji tetap + tunjangan + listrik/air + operasional lainnya per bulan yang ada datanya)
  // dikalikan rata-rata durasi siklus tanam (fallback 70 hari / ~2,33 bulan bila belum ada data siklus).
  const actualFixedCostPerCycle = useMemo(() => {
    const monthsWithFixedCost = monthlyComprehensivePnL.filter(
      (m) => m.gajiPokok + m.tunjanganTransport + m.utilitasListrikAir + m.operasionalLainnya > 0
    );
    if (monthsWithFixedCost.length === 0) return 0;
    const fixedPerMonth =
      monthsWithFixedCost.reduce(
        (s, m) => s + m.gajiPokok + m.tunjanganTransport + m.utilitasListrikAir + m.operasionalLainnya,
        0
      ) / monthsWithFixedCost.length;
    if (fixedPerMonth <= 0) return 0;
    const cycleDays =
      db.cycles.length > 0
        ? db.cycles.reduce((s, c) => {
            const start = new Date(c.plantingDate || c.startDate || '').getTime();
            const end = new Date(c.harvestTargetDate || c.actualHarvestDate || '').getTime();
            const days = end > start ? (end - start) / 86400000 : 0;
            return s + (days > 0 ? days : 70);
          }, 0) / db.cycles.length
        : 70;
    const monthsPerCycle = Math.max(0.5, cycleDays / 30);
    return Math.round(fixedPerMonth * monthsPerCycle);
  }, [monthlyComprehensivePnL, db.cycles]);

  // Sinkronkan biaya tetap per siklus dari data aktual (selama belum diubah manual)
  useEffect(() => {
    if (!bepManual.fixed && actualFixedCostPerCycle > 0) {
      setBepFixedCostPerCycle(String(actualFixedCostPerCycle));
    }
  }, [actualFixedCostPerCycle, bepManual.fixed]);

  // Available Months for Dropdown
  const availableMonthsList = useMemo(() => {
    return monthlyComprehensivePnL.map((m) => ({
      key: m.key,
      label: m.monthLabel,
      revenue: m.pendapatanPanen,
      profit: m.labaBersihKomprehensif,
    }));
  }, [monthlyComprehensivePnL]);

  // Active P&L Summary (Based on selected month or ALL)
  const activePnLSummary = useMemo(() => {
    if (selectedMonthFilter === 'ALL') {
      const totalRev = monthlyComprehensivePnL.reduce((s, m) => s + m.pendapatanPanen, 0);
      const totalMat = monthlyComprehensivePnL.reduce((s, m) => s + m.totalBiayaOperasionalBahan, 0);
      const totalLabor = monthlyComprehensivePnL.reduce((s, m) => s + m.totalGajiStaf, 0);
      const totalOpex = totalMat + totalLabor;
      const totalCapex = monthlyComprehensivePnL.reduce((s, m) => s + m.bebanInvestasiDiperhitungkan, 0);
      const totalActualCapex = monthlyComprehensivePnL.reduce((s, m) => s + m.totalInvestasi, 0);
      const totalOperatingProfit = totalRev - totalOpex;
      const totalNetProfit = totalRev - totalOpex - totalCapex;
      const totalKg = monthlyComprehensivePnL.reduce((s, m) => s + m.harvestKg, 0);

      const operatingMargin = totalRev > 0 ? (totalOperatingProfit / totalRev) * 100 : 0;
      const netMargin = totalRev > 0 ? (totalNetProfit / totalRev) * 100 : 0;
      const laborRatio = totalRev > 0 ? (totalLabor / totalRev) * 100 : 0;
      const opexRatio = totalRev > 0 ? (totalOpex / totalRev) * 100 : 0;

      return {
        isSingleMonth: false,
        periodTitle: 'Semua Periode Kumulatif Usaha',
        periodSubtitle: `Konsolidasi seluruh aktivitas keuangan sejak awal operasional (${monthlyComprehensivePnL.length} Bulan Aktif)`,
        pendapatanPanen: totalRev,
        totalKg,
        rataRataHargaKg: totalKg > 0 ? Math.round(totalRev / totalKg) : 35000,
        totalBiayaOperasionalBahan: totalMat,
        totalGajiStaf: totalLabor,
        totalBiayaOperasional: totalOpex,
        totalInvestasi: totalActualCapex,
        bebanInvestasiDiperhitungkan: totalCapex,
        labaOperasional: totalOperatingProfit,
        labaBersihKomprehensif: totalNetProfit,
        operatingMargin,
        netMargin,
        laborRatio,
        opexRatio,
        // Breakdown Details
        benihMedia: monthlyComprehensivePnL.reduce((s, m) => s + m.benihMedia, 0),
        pupukNutrisi: monthlyComprehensivePnL.reduce((s, m) => s + m.pupukNutrisi, 0),
        pestisidaProteksi: monthlyComprehensivePnL.reduce((s, m) => s + m.pestisidaProteksi, 0),
        utilitasListrikAir: monthlyComprehensivePnL.reduce((s, m) => s + m.utilitasListrikAir, 0),
        kemasanLogistik: monthlyComprehensivePnL.reduce((s, m) => s + m.kemasanLogistik, 0),
        operasionalLainnya: monthlyComprehensivePnL.reduce((s, m) => s + m.operasionalLainnya, 0),
        gajiPokok: monthlyComprehensivePnL.reduce((s, m) => s + m.gajiPokok, 0),
        upahLembur: monthlyComprehensivePnL.reduce((s, m) => s + m.upahLembur, 0),
        tunjanganTransport: monthlyComprehensivePnL.reduce((s, m) => s + m.tunjanganTransport, 0),
        bonusPanen: monthlyComprehensivePnL.reduce((s, m) => s + m.bonusPanen, 0),
        investasiStrukturBambu: monthlyComprehensivePnL.reduce((s, m) => s + m.investasiStrukturBambu, 0),
        investasiPlastikNet: monthlyComprehensivePnL.reduce((s, m) => s + m.investasiPlastikNet, 0),
        investasiInstalasiDft: monthlyComprehensivePnL.reduce((s, m) => s + m.investasiInstalasiDft, 0),
        investasiOtomasiSensor: monthlyComprehensivePnL.reduce((s, m) => s + m.investasiOtomasiSensor, 0),
        gradeAKg: monthlyComprehensivePnL.reduce((s, m) => s + m.gradeAKg, 0),
        gradeBKg: monthlyComprehensivePnL.reduce((s, m) => s + m.gradeBKg, 0),
        gradeCKg: monthlyComprehensivePnL.reduce((s, m) => s + m.gradeCKg, 0),
      };
    } else {
      const targetMonth = monthlyComprehensivePnL.find((m) => m.key === selectedMonthFilter);
      if (!targetMonth) {
        return {
          isSingleMonth: true,
          periodTitle: 'Bulan Tidak Ditemukan',
          periodSubtitle: '',
          pendapatanPanen: 0,
          totalKg: 0,
          rataRataHargaKg: 0,
          totalBiayaOperasionalBahan: 0,
          totalGajiStaf: 0,
          totalBiayaOperasional: 0,
          totalInvestasi: 0,
          bebanInvestasiDiperhitungkan: 0,
          labaOperasional: 0,
          labaBersihKomprehensif: 0,
          operatingMargin: 0,
          netMargin: 0,
          laborRatio: 0,
          opexRatio: 0,
          benihMedia: 0,
          pupukNutrisi: 0,
          pestisidaProteksi: 0,
          utilitasListrikAir: 0,
          kemasanLogistik: 0,
          operasionalLainnya: 0,
          gajiPokok: 0,
          upahLembur: 0,
          tunjanganTransport: 0,
          bonusPanen: 0,
          investasiStrukturBambu: 0,
          investasiPlastikNet: 0,
          investasiInstalasiDft: 0,
          investasiOtomasiSensor: 0,
          gradeAKg: 0,
          gradeBKg: 0,
          gradeCKg: 0,
        };
      }

      const operatingMargin = targetMonth.pendapatanPanen > 0 ? (targetMonth.labaOperasional / targetMonth.pendapatanPanen) * 100 : 0;
      const netMargin = targetMonth.pendapatanPanen > 0 ? (targetMonth.labaBersihKomprehensif / targetMonth.pendapatanPanen) * 100 : 0;
      const laborRatio = targetMonth.pendapatanPanen > 0 ? (targetMonth.totalGajiStaf / targetMonth.pendapatanPanen) * 100 : 0;
      const opexRatio = targetMonth.pendapatanPanen > 0 ? (targetMonth.totalBiayaOperasional / targetMonth.pendapatanPanen) * 100 : 0;

      return {
        isSingleMonth: true,
        periodTitle: `Laporan Periode ${targetMonth.monthLabel}`,
        periodSubtitle: `Rincian pembukuan realisasi pendapatan, operasional bahan, upah staf, dan investasi bulan ${targetMonth.monthLabel}`,
        pendapatanPanen: targetMonth.pendapatanPanen,
        totalKg: targetMonth.harvestKg,
        rataRataHargaKg: targetMonth.harvestKg > 0 ? Math.round(targetMonth.pendapatanPanen / targetMonth.harvestKg) : 35000,
        totalBiayaOperasionalBahan: targetMonth.totalBiayaOperasionalBahan,
        totalGajiStaf: targetMonth.totalGajiStaf,
        totalBiayaOperasional: targetMonth.totalBiayaOperasional,
        totalInvestasi: targetMonth.totalInvestasi,
        bebanInvestasiDiperhitungkan: targetMonth.bebanInvestasiDiperhitungkan,
        labaOperasional: targetMonth.labaOperasional,
        labaBersihKomprehensif: targetMonth.labaBersihKomprehensif,
        operatingMargin,
        netMargin,
        laborRatio,
        opexRatio,
        benihMedia: targetMonth.benihMedia,
        pupukNutrisi: targetMonth.pupukNutrisi,
        pestisidaProteksi: targetMonth.pestisidaProteksi,
        utilitasListrikAir: targetMonth.utilitasListrikAir,
        kemasanLogistik: targetMonth.kemasanLogistik,
        operasionalLainnya: targetMonth.operasionalLainnya,
        gajiPokok: targetMonth.gajiPokok,
        upahLembur: targetMonth.upahLembur,
        tunjanganTransport: targetMonth.tunjanganTransport,
        bonusPanen: targetMonth.bonusPanen,
        investasiStrukturBambu: targetMonth.investasiStrukturBambu,
        investasiPlastikNet: targetMonth.investasiPlastikNet,
        investasiInstalasiDft: targetMonth.investasiInstalasiDft,
        investasiOtomasiSensor: targetMonth.investasiOtomasiSensor,
        gradeAKg: targetMonth.gradeAKg,
        gradeBKg: targetMonth.gradeBKg,
        gradeCKg: targetMonth.gradeCKg,
      };
    }
  }, [monthlyComprehensivePnL, selectedMonthFilter]);

  // Expenses Donut Distribution
  const expensesDistribution = useMemo(() => {
    const data = [
      { name: 'Pupuk & Nutrisi AB Mix', value: activePnLSummary.pupukNutrisi, color: '#10b981' },
      { name: 'Beban Gaji Staf Kebun', value: activePnLSummary.totalGajiStaf, color: '#6366f1' },
      { name: 'Benih & Media Tanam', value: activePnLSummary.benihMedia, color: '#3b82f6' },
      { name: 'Listrik, Pompa & Air', value: activePnLSummary.utilitasListrikAir, color: '#f59e0b' },
      { name: 'Kemasan & Logistik Panen', value: activePnLSummary.kemasanLogistik, color: '#ec4899' },
      { name: 'Investasi Aset & Capex', value: activePnLSummary.bebanInvestasiDiperhitungkan, color: '#8b5cf6' },
    ].filter((item) => item.value > 0);

    return data;
  }, [activePnLSummary]);

  // BEP Calculations
  const bepResults = useMemo(() => {
    const inv = Number(bepInvestment) || 0;
    const fixed = Number(bepFixedCostPerCycle) || 0;
    const varCost = Number(bepVariableCostPerKg) || 0;
    const price = Number(bepPricePerKg) || 0;
    const marginPerKg = price - varCost;

    let bepKg = 0;
    let bepRupiah = 0;
    let bepTotalInvestmentKg = 0;
    let bepTotalInvestmentRupiah = 0;

    if (marginPerKg > 0) {
      bepKg = Math.ceil(fixed / marginPerKg);
      bepRupiah = bepKg * price;
      bepTotalInvestmentKg = Math.ceil((inv + fixed) / marginPerKg);
      bepTotalInvestmentRupiah = bepTotalInvestmentKg * price;
    }

    return {
      marginPerKg,
      bepKg,
      bepRupiah,
      bepTotalInvestmentKg,
      bepTotalInvestmentRupiah,
      inv,
      fixed,
      varCost,
      price,
    };
  }, [bepInvestment, bepFixedCostPerCycle, bepVariableCostPerKg, bepPricePerKg]);

  const bepKgPerCycleNum = Math.max(0, Number(bepKgPerCycle) || 0);
  const bepPaybackCycles =
    bepResults.inv > 0 && bepResults.marginPerKg > 0 && bepKgPerCycleNum > 0
      ? Math.ceil(bepResults.inv / (bepKgPerCycleNum * bepResults.marginPerKg))
      : 0;

  // Analisis skenario ROI berdasarkan harga jual per kg
  const roiScenarios = useMemo(() => {
    const prices = [30000, 35000, 40000, 45000];
    return prices.map((price) => {
      const margin = price - bepResults.varCost;
      const bepKg = margin > 0 ? Math.ceil(bepResults.fixed / margin) : 0;
      const bepTotalKg = margin > 0 ? Math.ceil((bepResults.inv + bepResults.fixed) / margin) : 0;
      const omzetPerCycle = bepKgPerCycleNum * price;
      const labaPerCycle = margin * bepKgPerCycleNum - bepResults.fixed;
      const payback =
        margin > 0 && bepKgPerCycleNum > 0 && bepResults.inv > 0
          ? Math.ceil(bepResults.inv / (bepKgPerCycleNum * margin))
          : 0;
      return {
        price,
        margin,
        bepKg,
        bepTotalKg,
        omzetPerCycle,
        labaPerCycle,
        payback,
        isCurrent: price === bepResults.price,
      };
    });
  }, [bepResults, bepKgPerCycleNum]);

  const handleExportPDF = () => {
    try {
      setIsExporting(true);
      const options: ExportOptions = {
        companyName: customTitle,
        bepData: {
          investment: bepResults.inv,
          fixedCost: bepResults.fixed,
          variableCostPerKg: bepResults.varCost,
          pricePerKg: bepResults.price,
          marginPerKg: bepResults.marginPerKg,
          bepKg: bepResults.bepKg,
          bepRupiah: bepResults.bepRupiah,
          bepTotalInvestmentKg: bepResults.bepTotalInvestmentKg,
          bepTotalInvestmentRupiah: bepResults.bepTotalInvestmentRupiah,
        },
      };
      exportFinancialReportToPDF(db, metrics, options);
      addToast('Laporan PDF Berhasil Diunduh. File siap dicetak atau diarsipkan.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Gagal Membuat PDF: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
      setIsExportModalOpen(false);
    }
  };

  const handleExportCSV = () => {
    try {
      setIsExporting(true);
      const options: ExportOptions = {
        companyName: customTitle,
        bepData: {
          investment: bepResults.inv,
          fixedCost: bepResults.fixed,
          variableCostPerKg: bepResults.varCost,
          pricePerKg: bepResults.price,
          marginPerKg: bepResults.marginPerKg,
          bepKg: bepResults.bepKg,
          bepRupiah: bepResults.bepRupiah,
          bepTotalInvestmentKg: bepResults.bepTotalInvestmentKg,
          bepTotalInvestmentRupiah: bepResults.bepTotalInvestmentRupiah,
        },
      };
      exportFinancialReportToCSV(db, metrics, options);
      addToast('Laporan CSV Berhasil Diunduh untuk analisis spreadsheet.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Gagal Membuat CSV: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
      setIsExportModalOpen(false);
    }
  };

  const cycleReports = useMemo(() => {
    return db.cycles.map((c) => {
      const harvests = db.harvests.filter((h) => h.cycleId === c.id);
      const totalKg = harvests.reduce((s, h) => s + (Number(h.totalWeightKg) || 0), 0);
      const totalOmzet = harvests.reduce((s, h) => s + (Number(h.totalRevenue) || 0), 0);

      const includeLabor = db.payrollSettings?.includeLaborInHpp ?? true;
      const expenses = db.transactions.filter((t) => {
        if (t.type !== 'pengeluaran' || t.expenseGroup === 'investasi') return false;
        if (t.cycleId === c.id) return true;
        if (
          includeLabor &&
          (t.category.toLowerCase().includes('gaji') || t.category.toLowerCase().includes('payroll')) &&
          (t.tunnel === c.tunnel || t.tunnel === 'Semua Greenhouse')
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

      const totalBiaya = expenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const hppPerKg = totalKg > 0 ? Math.round(totalBiaya / totalKg) : 0;
      const biayaPerTanaman = c.plantCount > 0 ? Math.round(totalBiaya / c.plantCount) : 0;
      const labaSiklus = totalOmzet - totalBiaya;
      const roiSiklus = totalBiaya > 0 ? (labaSiklus / totalBiaya) * 100 : 0;

      return {
        id: c.id,
        name: c.name,
        tunnel: c.tunnel,
        plantCount: c.plantCount,
        livePlants: c.livePlants,
        totalKg,
        totalOmzet,
        totalBiaya,
        hppPerKg,
        biayaPerTanaman,
        labaSiklus,
        roiSiklus,
        status: c.status,
      };
    });
  }, [db.cycles, db.harvests, db.transactions, db.payrollSettings]);

  const bepChartData = useMemo(() => {
    const targetMaxKg = Math.max(
      bepResults.bepTotalInvestmentKg > 0 ? bepResults.bepTotalInvestmentKg * 1.35 : 6000,
      5000
    );
    const steps = 10;
    const stepSize = Math.ceil(targetMaxKg / steps);
    const data = [];
    for (let i = 0; i <= steps; i++) {
      const vol = i * stepSize;
      const pendapatan = vol * bepResults.price;
      const biayaOperasional = bepResults.fixed + vol * bepResults.varCost;
      const totalBebanInvestasi = bepResults.inv + bepResults.fixed + vol * bepResults.varCost;
      data.push({
        volumeKg: vol,
        pendapatan,
        biayaOperasional,
        totalBebanInvestasi,
        profitKomersial: pendapatan - biayaOperasional,
        profitInvestasi: pendapatan - totalBebanInvestasi,
      });
    }
    return data;
  }, [bepResults]);

  const roiTrendData = useMemo(() => {
    const inv = Number(bepInvestment) || metrics.totalInvestasi || 110000000;
    let cumLaba = 0;
    return cycleReports.map((c, index) => {
      cumLaba += c.labaSiklus;
      const roiKumulatif = inv > 0 ? (cumLaba / inv) * 100 : 0;
      return {
        period: c.id ? `${c.id}` : `Siklus ${index + 1}`,
        fullName: c.name,
        tunnel: c.tunnel,
        labaSiklus: c.labaSiklus,
        cumLaba,
        totalInvestasi: inv,
        roiKumulatif: Number(roiKumulatif.toFixed(1)),
        targetRoi: 100,
        omzet: c.totalOmzet,
        biaya: c.totalBiaya,
      };
    });
  }, [cycleReports, bepInvestment, metrics.totalInvestasi]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Export Actions Bar */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Laporan Keuangan & Arsip Usaha</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Laporan Keuangan & Analisis ROI</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Laporan laba rugi komprehensif, performa finansial bulanan otomatis (pendapatan panen dikurangi biaya operasional, gaji staf, dan investasi), BEP, dan data kinerja per siklus tanam.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Unduh PDF</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Unduh CSV</span>
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            title="Kustomisasi Laporan"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kustomisasi</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
        <button
          onClick={() => setActiveReportTab('labarugi')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeReportTab === 'labarugi' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          1. Laporan Laba Rugi
        </button>
        <button
          onClick={() => setActiveReportTab('hpp-tanaman')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeReportTab === 'hpp-tanaman' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          2. Analisis HPP Per Tanaman
        </button>
        <button
          onClick={() => setActiveReportTab('bulanan')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeReportTab === 'bulanan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          3. Rekap Bulanan
        </button>
        <button
          onClick={() => setActiveReportTab('cashflow')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeReportTab === 'cashflow' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          4. Cash Flow
        </button>
        <button
          onClick={() => setActiveReportTab('siklus')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeReportTab === 'siklus' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          5. Komparasi Siklus
        </button>
        <button
          onClick={() => setActiveReportTab('bep-roi')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeReportTab === 'bep-roi'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          6. Kalkulator BEP & ROI
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. LAPORAN LABA RUGI KOMPREHENSIF DENGAN PERFORMA BULANAN OTOMATIS */}
      {/* ========================================================================= */}
      {activeReportTab === 'labarugi' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Filter Toolbar Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Period Dropdown */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <label className="text-xs font-bold text-slate-700">Periode:</label>
                <select
                  value={selectedMonthFilter}
                  onChange={(e) => setSelectedMonthFilter(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none bg-slate-50"
                >
                  <option value="ALL">Semua Periode (Akumulasi Sejak Awal)</option>
                  {availableMonthsList.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label} ({m.revenue > 0 ? `Omzet: ${formatCurrency(m.revenue)}` : 'Fase Tanam / Investasi'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tunnel Filter */}
              <div className="flex items-center gap-2">
                <Sprout className="w-4 h-4 text-emerald-600 shrink-0" />
                <label className="text-xs font-bold text-slate-700">Unit:</label>
                <select
                  value={selectedTunnelFilter}
                  onChange={(e) => setSelectedTunnelFilter(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:border-emerald-500 outline-none bg-slate-50"
                >
                  <option value="ALL">Semua Greenhouse</option>
                  {db.tunnels.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} ({t.systemType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Capex Method Selector */}
            <div className="flex items-center gap-2 self-end md:self-auto bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCapexAccountingMethod('full_cash')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  capexAccountingMethod === 'full_cash'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Beban investasi dicatat langsung penuh pada bulan realisasi"
              >
                Arus Kas Penuh
              </button>
              <button
                type="button"
                onClick={() => setCapexAccountingMethod('amortized')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  capexAccountingMethod === 'amortized'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Investasi disusutkan merata selama umur ekonomis 5 tahun (60 bulan)"
              >
                Amortisasi 5 Thn
              </button>
            </div>
          </div>

          {/* 6 Executive KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Card 1: Revenue Panen */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">1. Pendapatan Panen</span>
                  <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                    <Sprout className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 font-mono">
                  {formatCurrency(activePnLSummary.pendapatanPanen)}
                </h4>
              </div>
              <p className="text-[10px] text-emerald-700 font-medium mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {activePnLSummary.totalKg > 0 ? `${formatNumber(activePnLSummary.totalKg)} kg melon dipanen` : 'Belum ada petik'}
              </p>
            </div>

            {/* Card 2: Biaya Bahan & Operasional */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">2. Biaya Operasional</span>
                  <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 font-mono">
                  {formatCurrency(activePnLSummary.totalBiayaOperasionalBahan)}
                </h4>
              </div>
              <p className="text-[10px] text-blue-700 font-semibold mt-2 flex items-center justify-between">
                <span>Nutrisi & utilitas</span>
                <span className="font-mono bg-blue-50 px-1.5 py-0.5 rounded text-blue-800">
                  {formatCurrency(metrics.biayaPerTanaman)}/pohon
                </span>
              </p>
            </div>

            {/* Card 3: Gaji Staf Kebun */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">3. Gaji Staf & HR</span>
                  <div className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 font-mono">
                  {formatCurrency(activePnLSummary.totalGajiStaf)}
                </h4>
              </div>
              <p className="text-[10px] text-indigo-700 font-semibold mt-2">
                Upah, lembur & bonus panen terintegrasi
              </p>
            </div>

            {/* Card 4: Investasi Modal (Capex) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">4. Investasi Aset</span>
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 font-mono">
                  {formatCurrency(activePnLSummary.bebanInvestasiDiperhitungkan)}
                </h4>
              </div>
              <p className="text-[10px] text-amber-800 font-medium mt-2">
                {capexAccountingMethod === 'amortized' ? 'Alokasi amortisasi 5 thn' : 'Belanja modal langsung'}
              </p>
            </div>

            {/* Card 5: Laba Operasional (EBITDA) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">5. Laba Operasional</span>
                  <div className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h4 className={`text-base sm:text-lg font-black font-mono ${activePnLSummary.labaOperasional >= 0 ? 'text-teal-700' : 'text-rose-600'}`}>
                  {formatCurrency(activePnLSummary.labaOperasional)}
                </h4>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Margin: {activePnLSummary.operatingMargin.toFixed(1)}% terhadap omzet
              </p>
            </div>

            {/* Card 6: Laba Bersih Komprehensif */}
            <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-emerald-200 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Laba Bersih Akhir</span>
                  <Scale className="w-3.5 h-3.5 text-emerald-300" />
                </div>
                <h4 className="text-base sm:text-lg font-black font-mono text-white">
                  {formatCurrency(activePnLSummary.labaBersihKomprehensif)}
                </h4>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-emerald-200">Setelah Capex</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activePnLSummary.labaBersihKomprehensif >= 0 ? 'bg-emerald-400/20 text-emerald-200' : 'bg-rose-400/30 text-rose-100'
                }`}>
                  {activePnLSummary.netMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Comprehensive Multi-Level P&L Statement */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold tracking-tight flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>LAPORAN LABA RUGI KOMPREHENSIF PERKEBUNAN MELON PREMIUM</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activePnLSummary.periodTitle} • {activePnLSummary.periodSubtitle}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-slate-800 text-emerald-300 text-[10px] font-bold rounded-lg border border-slate-700">
                  {capexAccountingMethod === 'amortized' ? 'Metode Amortisasi (Depreciation)' : 'Metode Arus Kas Penuh (Full Capex)'}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-700">
              {/* SECTION I: PENDAPATAN DARI PANEN */}
              <div className="border border-emerald-200/80 rounded-2xl bg-emerald-50/20 p-4 space-y-3">
                <div className="flex justify-between items-center text-sm font-black text-emerald-950 pb-2 border-b border-emerald-100">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">I</span>
                    <span>PENDAPATAN DARI HASIL PANEN (REVENUE)</span>
                  </span>
                  <span className="text-base text-emerald-800 font-mono">
                    {formatCurrency(activePnLSummary.pendapatanPanen)}
                  </span>
                </div>

                <div className="space-y-2 pl-7 font-mono">
                  {activePnLSummary.totalKg > 0 ? (
                    <>
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-sans">1. Penjualan Buah Melon Grade A (Kualitas Super Pasar Modern)</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(activePnLSummary.gradeAKg * activePnLSummary.rataRataHargaKg)}
                          <span className="text-[10px] text-slate-400 font-sans ml-2">
                            ({formatNumber(activePnLSummary.gradeAKg)} Kg · {((activePnLSummary.gradeAKg / activePnLSummary.totalKg) * 100).toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-sans">2. Penjualan Buah Melon Grade B (Komersial & Grosir Lokal)</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(activePnLSummary.gradeBKg * activePnLSummary.rataRataHargaKg)}
                          <span className="text-[10px] text-slate-400 font-sans ml-2">
                            ({formatNumber(activePnLSummary.gradeBKg)} Kg · {((activePnLSummary.gradeBKg / activePnLSummary.totalKg) * 100).toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                      <div className="pt-2 border-t border-emerald-100 text-[11px] text-emerald-800 font-sans flex justify-between font-medium">
                        <span>Total Timbangan Panen: <strong>{formatNumber(activePnLSummary.totalKg)} Kg</strong></span>
                        <span>Rata-rata Realisasi Harga: <strong>{formatCurrency(activePnLSummary.rataRataHargaKg)} / Kg</strong></span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center text-slate-500 font-sans">
                      <span>Belum ada panen tercatat pada periode ini — pendapatan dari hasil panen masih Rp 0.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION II: BIAYA OPERASIONAL BAHAN & UTILITAS */}
              <div className="border border-slate-200 rounded-2xl bg-slate-50/60 p-4 space-y-3">
                <div className="flex justify-between items-center text-sm font-black text-slate-900 pb-2 border-b border-slate-200">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">II</span>
                    <span>BIAYA OPERASIONAL KEBUN (MATERIALS & UTILITIES)</span>
                  </span>
                  <span className="text-base text-rose-700 font-mono">
                    {formatCurrency(activePnLSummary.totalBiayaOperasionalBahan)}
                  </span>
                </div>

                <div className="space-y-2 pl-7 font-mono">
                  <div className="flex justify-between items-center">
                    <span className="font-sans">1. Pupuk AB Mix Khusus Melon & Nutrisi Tambahan (Kalsium, Kalium)</span>
                    <span className="font-medium text-slate-900">{formatCurrency(activePnLSummary.pupukNutrisi)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-sans">2. Benih Melon Unggul & Media Tanam (Rockwool, Netpot)</span>
                    <span className="font-medium text-slate-900">{formatCurrency(activePnLSummary.benihMedia)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-sans">3. Perlindungan Tanaman (Fungisida & Insektisida Nabati)</span>
                    <span className="font-medium text-slate-900">{formatCurrency(activePnLSummary.pestisidaProteksi)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-sans">4. Utilitas Listrik PLN Pompa DFT, Aerasi & Pasokan Air</span>
                    <span className="font-medium text-slate-900">{formatCurrency(activePnLSummary.utilitasListrikAir)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-sans">5. Kemasan Box Eksklusif, Keranjang & Logistik Panen</span>
                    <span className="font-medium text-slate-900">{formatCurrency(activePnLSummary.kemasanLogistik)}</span>
                  </div>
                  {activePnLSummary.operasionalLainnya > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="font-sans">6. Biaya Operasional dan Perlengkapan Lainnya</span>
                      <span className="font-medium text-slate-900">{formatCurrency(activePnLSummary.operasionalLainnya)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION III: BEBAN GAJI & UPAH STAF */}
              <div className="border border-indigo-200/80 rounded-2xl bg-indigo-50/20 p-4 space-y-3">
                <div className="flex justify-between items-center text-sm font-black text-indigo-950 pb-2 border-b border-indigo-100">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-700 text-white flex items-center justify-center text-[10px]">III</span>
                    <span>BEBAN GAJI & UPAH TENAGA KERJA (LABOR PAYROLL)</span>
                  </span>
                  <span className="text-base text-indigo-800 font-mono">
                    {formatCurrency(activePnLSummary.totalGajiStaf)}
                  </span>
                </div>

                <div className="space-y-2 pl-7 font-mono">
                  <div className="flex justify-between items-center">
                    <span className="font-sans">1. Gaji Pokok & Upah Harian Teknisi / Operator Kebun</span>
                    <span className="font-medium text-slate-900">{formatCurrency(activePnLSummary.gajiPokok || activePnLSummary.totalGajiStaf * 0.8)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-sans">2. Upah Lembur & Pemangkasan Tunas Air</span>
                    <span className="font-medium text-slate-900">{formatCurrency(activePnLSummary.upahLembur)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-sans">3. Tunjangan Uang Makan & Transportasi Karyawan</span>
                    <span className="font-medium text-slate-900">{formatCurrency(activePnLSummary.tunjanganTransport)}</span>
                  </div>
                  {activePnLSummary.bonusPanen > 0 && (
                    <div className="flex justify-between items-center text-emerald-800">
                      <span className="font-sans font-semibold">4. Bonus Panen Melon Premium Berdasarkan Kuantitas Petik</span>
                      <span className="font-bold">{formatCurrency(activePnLSummary.bonusPanen)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-indigo-100 text-[11px] text-indigo-800 font-sans flex justify-between">
                    <span>Status Integrasi: <strong>Tersinkronisasi Otomatis dari Modul HR & Payroll</strong></span>
                    <span>Porsi Biaya Gaji terhadap Omzet: <strong>{activePnLSummary.laborRatio.toFixed(1)}%</strong></span>
                  </div>
                </div>
              </div>

              {/* SECTION: OPERATING PROFIT SUB-TOTAL */}
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-teal-900">
                    LABA OPERASIONAL USAHA (EBITDA / OPERATING PROFIT)
                  </h4>
                  <p className="text-[11px] text-teal-700 mt-0.5">
                    Pendapatan Panen dikurangi (Biaya Operasional Bahan + Gaji Staf Kebun)
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-black font-mono ${activePnLSummary.labaOperasional >= 0 ? 'text-teal-800' : 'text-rose-600'}`}>
                    {formatCurrency(activePnLSummary.labaOperasional)}
                  </span>
                  <span className="block text-[11px] font-bold text-teal-700">
                    Margin Operasional: {activePnLSummary.operatingMargin.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* SECTION IV: INVESTASI MODAL & CAPEX */}
              <div className="border border-amber-200/80 rounded-2xl bg-amber-50/20 p-4 space-y-3">
                <div className="flex justify-between items-center text-sm font-black text-amber-950 pb-2 border-b border-amber-100">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">IV</span>
                    <span>BELANJA MODAL & INVESTASI GREENHOUSE (CAPEX)</span>
                  </span>
                  <span className="text-base text-amber-800 font-mono">
                    {formatCurrency(activePnLSummary.bebanInvestasiDiperhitungkan)}
                  </span>
                </div>

                <div className="space-y-2 pl-7 font-mono">
                  <div className="flex justify-between items-center">
                    <span className="font-sans">1. Struktur Rangka {ghStructureMaterials ? `${ghStructureMaterials}, Tiang Cor & Reng` : 'Greenhouse'}</span>
                    <span className="font-medium text-slate-900">{formatCurrency(activePnLSummary.investasiStrukturBambu)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-sans">2. Plastik UV 14% 200 Micron & Insect Net 50 Mesh</span>
                    <span className="font-medium text-slate-900">{formatCurrency(activePnLSummary.investasiPlastikNet)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-sans">3. Talang Gully {ghSystemTypes || 'Hidroponik'} Foodgrade, Pipa PVC & Tandon Air PE 5000L</span>
                    <span className="font-medium text-slate-900">{formatCurrency(activePnLSummary.investasiInstalasiDft)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-sans">4. Panel Otomatisasi Timer, EC Meter, pH Meter & Timbangan Panen</span>
                    <span className="font-medium text-slate-900">{formatCurrency(activePnLSummary.investasiOtomasiSensor)}</span>
                  </div>
                  <div className="pt-2 border-t border-amber-100 text-[11px] text-amber-800 font-sans flex justify-between">
                    <span>
                      Metode Pencatatan: <strong>{capexAccountingMethod === 'amortized' ? 'Amortisasi Garis Lurus (5 Tahun / 60 Bulan)' : 'Pengeluaran Tunai Penuh (Full Realized Capex)'}</strong>
                    </span>
                    <span>Total Capex Fisik Terpasang: <strong>{formatCurrency(activePnLSummary.totalInvestasi)}</strong></span>
                  </div>
                </div>
              </div>

              {/* FINAL NET PROFIT COMPREHENSIVE */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-emerald-400/20 text-emerald-300 font-bold text-[10px] rounded-full border border-emerald-400/30">
                      HASIL AKHIR KOMPREHENSIF
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black mt-1">
                    LABA BERSIH KOMPREHENSIF SETELAH INVESTASI
                  </h3>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    = Pendapatan Panen - (Biaya Bahan + Gaji Staf + Beban Investasi)
                  </p>
                </div>

                <div className="text-right">
                  <span className={`text-2xl sm:text-3xl font-black font-mono block ${activePnLSummary.labaBersihKomprehensif >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {formatCurrency(activePnLSummary.labaBersihKomprehensif)}
                  </span>
                  <span className="text-xs text-emerald-100 font-medium">
                    Net Margin: <strong>{activePnLSummary.netMargin.toFixed(1)}%</strong> terhadap seluruh omzet panen
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Month Visual Chart (Recharts) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-700" />
                  <span>GRAFIK PERBANDINGAN KOMPONEN LABA RUGI BULANAN</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Visualisasi otomatis pendapatan panen, operasional bahan, upah staf, investasi, dan tren laba bersih
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Omzet</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Operasional</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Gaji Staf</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Investasi</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-800 inline-block" /> Laba Bersih</span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyComprehensivePnL} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="shortLabel" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${(val / 1000000).toFixed(0)}Jt`}
                  />
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val) || 0)}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="pendapatanPanen" name="Pendapatan Panen" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="totalBiayaOperasionalBahan" name="Biaya Bahan & Utilitas" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="totalGajiStaf" name="Beban Gaji Staf" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="bebanInvestasiDiperhitungkan" name="Belanja Investasi" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Line type="monotone" dataKey="labaBersihKomprehensif" name="Laba Bersih Komprehensif" stroke="#064e3b" strokeWidth={3} dot={{ r: 4, fill: '#064e3b' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Automatic Monthly Financial Summary Matrix (Table) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span>TABEL RINGKASAN PERFORMA FINANSIAL BULANAN OTOMATIS</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik pada baris bulan untuk melihat rincian laporan secara instan
                </p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {monthlyComprehensivePnL.length} Periode Tercatat
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="py-3 px-4">Periode Bulan</th>
                    <th className="py-3 px-4 text-right text-emerald-800">Pendapatan Panen</th>
                    <th className="py-3 px-4 text-right text-blue-700">Biaya Bahan</th>
                    <th className="py-3 px-4 text-right text-indigo-700">Gaji Staf (HR)</th>
                    <th className="py-3 px-4 text-right text-slate-800 font-bold">Total Opex</th>
                    <th className="py-3 px-4 text-right text-teal-800 font-bold">Laba Operasional</th>
                    <th className="py-3 px-4 text-right text-amber-800">Investasi (Capex)</th>
                    <th className="py-3 px-4 text-right text-emerald-950 font-black">Laba Bersih Akhir</th>
                    <th className="py-3 px-4 text-center">Net Margin</th>
                    <th className="py-3 px-4 text-center">Status Performa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {monthlyComprehensivePnL.map((m) => {
                    const isSelected = selectedMonthFilter === m.key;
                    return (
                      <tr
                        key={m.key}
                        onClick={() => setSelectedMonthFilter(isSelected ? 'ALL' : m.key)}
                        className={`hover:bg-slate-50 transition cursor-pointer ${
                          isSelected ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 font-sans whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{m.monthLabel}</span>
                            {isSelected && (
                              <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-bold rounded">
                                Dipilih
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                          {formatCurrency(m.pendapatanPanen)}
                          {m.harvestKg > 0 && (
                            <span className="block text-[10px] text-slate-400 font-sans font-normal">
                              {formatNumber(m.harvestKg)} kg
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right text-blue-800 whitespace-nowrap">
                          {formatCurrency(m.totalBiayaOperasionalBahan)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-indigo-800 whitespace-nowrap">
                          {formatCurrency(m.totalGajiStaf)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(m.totalBiayaOperasional)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black whitespace-nowrap">
                          <span className={m.labaOperasional >= 0 ? 'text-teal-700' : 'text-rose-600'}>
                            {formatCurrency(m.labaOperasional)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-amber-800 whitespace-nowrap">
                          {formatCurrency(m.bebanInvestasiDiperhitungkan)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black whitespace-nowrap text-sm">
                          <span className={m.labaBersihKomprehensif >= 0 ? 'text-emerald-800' : 'text-rose-600'}>
                            {formatCurrency(m.labaBersihKomprehensif)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold font-sans whitespace-nowrap">
                          <span className={m.marginBersihKomprehensif >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            {m.marginBersihKomprehensif.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-sans whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${m.statusBg} ${m.statusColor}`}>
                            {m.statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {selectedMonthFilter !== 'ALL' && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>Sedang menampilkan filter periode <strong>{activePnLSummary.periodTitle}</strong>.</span>
                <button
                  type="button"
                  onClick={() => setSelectedMonthFilter('ALL')}
                  className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Tampilkan Semua Periode
                </button>
              </div>
            )}
          </div>

          {/* Ratio Analysis & Financial Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Donut Chart: Expense Breakdown */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <PieChartLucide className="w-4 h-4 text-emerald-600" />
                  <span>Distribusi Biaya & Beban</span>
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Proporsi alokasi pengeluaran operasional, gaji staf, dan investasi
                </p>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expensesDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => formatCurrency(Number(val) || 0)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                {expensesDistribution.map((item) => (
                  <div key={item.name} className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-mono font-medium text-slate-900 shrink-0">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Efficiency Ratios */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-teal-600" />
                  <span>Rasio Efisiensi Finansial</span>
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Indikator produktivitas biaya terhadap perolehan omzet melon
                </p>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">Rasio Beban Operasional (Opex)</span>
                      <span className="font-mono text-xs font-black text-blue-700">{activePnLSummary.opexRatio.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, activePnLSummary.opexRatio)}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Ideal di bawah 40% dari total omzet panen</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">Rasio Biaya Tenaga Kerja (Labor)</span>
                      <span className="font-mono text-xs font-black text-indigo-700">{activePnLSummary.laborRatio.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, activePnLSummary.laborRatio)}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Tersinkron payroll per jam, hari, dan lembur</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-800">Rasio Margin Bersih (Net Margin)</span>
                      <span className="font-mono text-xs font-black text-emerald-700">{activePnLSummary.netMargin.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.max(0, Math.min(100, activePnLSummary.netMargin))}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Keuntungan bersih setelah seluruh beban investasi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Automated Recommendations */}
            <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-5 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    Insight & Evaluasi Keuangan
                  </h4>
                </div>
                <h3 className="text-sm font-bold text-white mb-2 leading-snug">
                  {activePnLSummary.labaBersihKomprehensif >= 0
                    ? 'Kondisi Finansial Kebun Sangat Sehat'
                    : 'Fase Pertumbuhan & Pengembalian Modal Investasi'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed space-y-2">
                  Hasil penjualan melon Premium telah berhasil menghasilkan omzet sebesar{' '}
                  <strong className="text-white">{formatCurrency(activePnLSummary.pendapatanPanen)}</strong>,
                  dengan laba operasional sebesar{' '}
                  <strong className="text-emerald-300">{formatCurrency(activePnLSummary.labaOperasional)}</strong>.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Sistem pencatatan otomatis memisahkan HPP siklus dan aset modal secara akurat.</span>
                </div>
                <div className="flex items-start gap-2 text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Data gaji staf dan bonus panen terhubung langsung dengan modul HR & Payroll.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ANALISIS HPP PER TANAMAN KOMPREHENSIF */}
      {/* ========================================================================= */}
      {activeReportTab === 'hpp-tanaman' && (
        <HppPerTanamanAnalysis />
      )}

      {/* ========================================================================= */}
      {/* 3. REKAPITULASI KEUANGAN BULANAN */}
      {/* ========================================================================= */}
      {activeReportTab === 'bulanan' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6 animate-in fade-in">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">REKAPITULASI PERFORMA FINANSIAL BULANAN OTOMATIS</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rincian pendapatan panen dikurangi biaya operasional bahan, upah staf, dan investasi per bulan
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 self-start sm:self-auto">
              {monthlyComprehensivePnL.length} Bulan Aktif
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="p-3">Periode</th>
                  <th className="p-3 text-right text-emerald-700">Pendapatan Panen</th>
                  <th className="p-3 text-right text-blue-700">Biaya Bahan</th>
                  <th className="p-3 text-right text-indigo-700">Gaji Staf (HR)</th>
                  <th className="p-3 text-right text-amber-700">Investasi (Capex)</th>
                  <th className="p-3 text-right text-rose-700 font-bold">Total Pengeluaran</th>
                  <th className="p-3 text-right text-teal-800 font-black">Laba Bersih</th>
                  <th className="p-3 text-center">Net Margin</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {monthlyComprehensivePnL.map((m) => (
                  <tr key={m.key} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap font-sans">{m.monthLabel}</td>
                    <td className="p-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                      {formatCurrency(m.pendapatanPanen)}
                    </td>
                    <td className="p-3 text-right text-blue-800 whitespace-nowrap">
                      {formatCurrency(m.totalBiayaOperasionalBahan)}
                    </td>
                    <td className="p-3 text-right text-indigo-800 whitespace-nowrap">
                      {formatCurrency(m.totalGajiStaf)}
                    </td>
                    <td className="p-3 text-right text-amber-800 whitespace-nowrap">
                      {formatCurrency(m.bebanInvestasiDiperhitungkan)}
                    </td>
                    <td className="p-3 text-right font-semibold text-rose-700 whitespace-nowrap">
                      {formatCurrency(m.totalBiayaOperasional + m.bebanInvestasiDiperhitungkan)}
                    </td>
                    <td className="p-3 text-right font-black whitespace-nowrap">
                      <span className={m.labaBersihKomprehensif >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        {formatCurrency(m.labaBersihKomprehensif)}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold font-sans whitespace-nowrap">
                      <span className={m.marginBersihKomprehensif >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        {m.marginBersihKomprehensif.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-center font-sans whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${m.statusBg} ${m.statusColor}`}>
                        {m.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CASH FLOW */}
      {/* ========================================================================= */}
      {activeReportTab === 'cashflow' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6 animate-in fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-extrabold text-slate-900">LAPORAN ARUS KAS (CASH FLOW)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Semua uang masuk dan uang keluar yang telah terealisasi</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Total Pemasukan Kas</span>
              <span className="text-xl font-black text-emerald-600 mt-1 block font-mono">
                {formatCurrency(metrics.totalPemasukan)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Total Pengeluaran Kas</span>
              <span className="text-xl font-black text-rose-600 mt-1 block font-mono">
                {formatCurrency(metrics.totalPengeluaran)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Saldo Akhir di Kas</span>
              <span
                className={`text-xl font-black mt-1 block font-mono ${
                  metrics.saldoKas >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {formatCurrency(metrics.saldoKas)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. KOMPARASI SIKLUS */}
      {/* ========================================================================= */}
      {activeReportTab === 'siklus' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6 animate-in fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-extrabold text-slate-900">
              KOMPARASI KINERJA KEUANGAN PER SIKLUS TANAM
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Membandingkan modal, panen kg, omzet, HPP dan laba antar siklus</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="p-3">Siklus</th>
                  <th className="p-3">Greenhouse</th>
                  <th className="p-3 text-center">Populasi</th>
                  <th className="p-3 text-right">Biaya Produksi</th>
                  <th className="p-3 text-right">Biaya/Pohon</th>
                  <th className="p-3 text-right">Panen (Kg)</th>
                  <th className="p-3 text-right">HPP / Kg</th>
                  <th className="p-3 text-right">Omzet</th>
                  <th className="p-3 text-right">Laba Bersih</th>
                  <th className="p-3 text-center">ROI Siklus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cycleReports.map((cr) => (
                  <tr key={cr.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                      {cr.id} - {cr.name}
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-600">{cr.tunnel}</td>
                    <td className="p-3 text-center whitespace-nowrap font-mono">{cr.plantCount}</td>
                    <td className="p-3 text-right font-medium text-slate-900 whitespace-nowrap font-mono">
                      {formatCurrency(cr.totalBiaya)}
                    </td>
                    <td className="p-3 text-right text-slate-600 whitespace-nowrap font-mono">
                      {formatCurrency(cr.biayaPerTanaman)}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 whitespace-nowrap font-mono">
                      {formatNumber(cr.totalKg)} kg
                    </td>
                    <td className="p-3 text-right font-black text-indigo-700 whitespace-nowrap font-mono">
                      {formatCurrency(cr.hppPerKg)}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-700 whitespace-nowrap font-mono">
                      {formatCurrency(cr.totalOmzet)}
                    </td>
                    <td className="p-3 text-right font-black whitespace-nowrap font-mono">
                      <span className={cr.labaSiklus >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        {formatCurrency(cr.labaSiklus)}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-teal-700 whitespace-nowrap font-mono">
                      {formatPercent(cr.roiSiklus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. KALKULATOR BEP & ROI */}
      {/* ========================================================================= */}
      {activeReportTab === 'bep-roi' && (
        <div className="space-y-6 animate-in fade-in">
          {/* BEP Calculator Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-700" />
                  <span>KALKULATOR BEP (BREAK EVEN POINT) MELON GREENHOUSE</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menghitung titik impas produksi dalam satuan Kilogram Melon dan Rupiah Omzet secara interaktif
                </p>
              </div>
              {(ghSystemTypes || ghTotalCapacity > 0) && (
                <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 self-start sm:self-auto">
                  Model {ghSystemTypes || 'Greenhouse'}{ghTotalCapacity > 0 ? ` ${ghTotalCapacity.toLocaleString('id-ID')} Pohon` : ''}
                </span>
              )}
            </div>

            {/* Input Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Total Modal Investasi (Rp)</label>
                <input
                  type="number"
                  value={bepInvestment}
                  onChange={(e) => {
                    setBepManual((m) => ({ ...m, investment: true }));
                    setBepInvestment(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Biaya Tetap per Siklus (Rp)</label>
                <input
                  type="number"
                  value={bepFixedCostPerCycle}
                  onChange={(e) => {
                    setBepManual((m) => ({ ...m, fixed: true }));
                    setBepFixedCostPerCycle(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none font-mono"
                />
                {bepManual.fixed ? null : actualFixedCostPerCycle > 0 ? (
                  <span className="text-[10px] text-emerald-700 mt-1 block">
                    Otomatis dari data operasional (gaji tetap + listrik/air + lainnya × durasi siklus)
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Estimasi default — terisi otomatis setelah ada biaya operasional tercatat
                  </span>
                )}
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Biaya Variabel / Kg (Rp)</label>
                <input
                  type="number"
                  value={bepVariableCostPerKg}
                  onChange={(e) => {
                    setBepManual((m) => ({ ...m, variable: true }));
                    setBepVariableCostPerKg(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Harga Jual / Kg (Rp)</label>
                <input
                  type="number"
                  value={bepPricePerKg}
                  onChange={(e) => {
                    setBepManual((m) => ({ ...m, price: true }));
                    setBepPricePerKg(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Panen / Siklus (Kg)</label>
                <input
                  type="number"
                  value={bepKgPerCycle}
                  onChange={(e) => {
                    setBepManual((m) => ({ ...m, kgCycle: true }));
                    setBepKgPerCycle(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none font-mono"
                />
                {actualKgPerCycle > 0 && (
                  <span className="text-[10px] text-emerald-700 mt-1 block">Otomatis dari data siklus (asumsi 1,65 kg/pohon)</span>
                )}
              </div>
            </div>

            {/* Result Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-bold block uppercase">BEP Operasional (Kg)</span>
                <span className="text-xl font-black text-emerald-700 mt-1 block font-mono">
                  {formatNumber(bepResults.bepKg)} Kg
                </span>
                <span className="text-[11px] text-emerald-700 block mt-1 font-mono">
                  {formatCurrency(bepResults.bepRupiah)}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200">
                <span className="text-[10px] text-teal-800 font-bold block uppercase">BEP Total Modal + Aset</span>
                <span className="text-xl font-black text-teal-800 mt-1 block font-mono">
                  {formatNumber(bepResults.bepTotalInvestmentKg)} Kg
                </span>
                <span className="text-[11px] text-teal-700 block mt-1 font-mono">
                  {formatCurrency(bepResults.bepTotalInvestmentRupiah)}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Margin Kontribusi / Kg</span>
                <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                  {formatCurrency(bepResults.marginPerKg)}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  {bepResults.price > 0 ? ((bepResults.marginPerKg / bepResults.price) * 100).toFixed(1) : 0}% dari harga jual
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Estimasi Siklus Balik Modal</span>
                <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                  {bepPaybackCycles > 0 ? `~${bepPaybackCycles} Siklus` : '—'}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1 font-mono">
                  {bepKgPerCycleNum > 0 ? `Dengan panen ${formatNumber(bepKgPerCycleNum)} kg / siklus` : 'Isi target panen per siklus'}
                </span>
              </div>
            </div>

            {/* BEP Chart */}
            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bepChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="volumeKg" type="number" domain={[0, 'dataMax']} allowDecimals={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `${val}kg`} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}Jt`} />
                  <Tooltip formatter={(val: any) => formatCurrency(Number(val) || 0)} />
                  <Line type="monotone" dataKey="pendapatan" name="Total Pendapatan" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="biayaOperasional" name="Beban Opex" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="totalBebanInvestasi" name="Total Capex + Opex" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  {bepResults.bepKg > 0 && bepResults.marginPerKg > 0 && (
                    <>
                      <ReferenceLine
                        x={bepResults.bepKg}
                        stroke="#059669"
                        strokeDasharray="4 4"
                        label={{ value: `BEP Ops ${formatNumber(bepResults.bepKg)} Kg`, position: 'insideTopLeft', fontSize: 10, fill: '#047857' }}
                      />
                      <ReferenceDot x={bepResults.bepKg} y={bepResults.bepRupiah} r={5} fill="#059669" stroke="#ffffff" strokeWidth={2} />
                    </>
                  )}
                  {bepResults.bepTotalInvestmentKg > 0 && bepResults.marginPerKg > 0 && (
                    <>
                      <ReferenceLine
                        x={bepResults.bepTotalInvestmentKg}
                        stroke="#d97706"
                        strokeDasharray="4 4"
                        label={{ value: `BEP Total ${formatNumber(bepResults.bepTotalInvestmentKg)} Kg`, position: 'insideTopRight', fontSize: 10, fill: '#b45309' }}
                      />
                      <ReferenceDot x={bepResults.bepTotalInvestmentKg} y={bepResults.bepTotalInvestmentRupiah} r={5} fill="#d97706" stroke="#ffffff" strokeWidth={2} />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Analisis Skenario ROI Berdasarkan Harga Jual */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-700" />
                <span>Analisis Skenario ROI Berdasarkan Harga Jual</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="text-left p-2 font-bold">Harga Jual / Kg</th>
                      <th className="text-right p-2 font-bold">Margin / Kg</th>
                      <th className="text-right p-2 font-bold">BEP Ops</th>
                      <th className="text-right p-2 font-bold">BEP Total Modal</th>
                      <th className="text-right p-2 font-bold">Omzet / Siklus</th>
                      <th className="text-right p-2 font-bold">Laba / Siklus</th>
                      <th className="text-center p-2 font-bold">Balik Modal</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {roiScenarios.map((s) => (
                      <tr key={s.price} className={`border-b border-slate-100 ${s.isCurrent ? 'bg-emerald-50/60' : ''}`}>
                        <td className="text-left p-2 font-sans font-semibold text-slate-800">
                          {formatCurrency(s.price)}
                          {s.isCurrent && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
                              aktif
                            </span>
                          )}
                        </td>
                        <td className="text-right p-2">{formatCurrency(s.margin)}</td>
                        <td className="text-right p-2">{s.margin > 0 ? `${formatNumber(s.bepKg)} Kg` : '—'}</td>
                        <td className="text-right p-2">{s.margin > 0 ? `${formatNumber(s.bepTotalKg)} Kg` : '—'}</td>
                        <td className="text-right p-2">{formatCurrency(s.omzetPerCycle)}</td>
                        <td className={`text-right p-2 font-bold ${s.labaPerCycle >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {formatCurrency(s.labaPerCycle)}
                        </td>
                        <td className="text-center p-2">{s.payback > 0 ? `~${s.payback} Siklus` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400">
                *Omzet & laba per siklus memakai target panen {formatNumber(bepKgPerCycleNum)} kg/siklus. Baris hijau = harga jual yang sedang dipakai kalkulator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Export Customize Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-sm text-slate-900">Kustomisasi Ekspor Laporan</h3>
              <button onClick={() => setIsExportModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nama Perkebunan / Kop Surat</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Format Dokumen</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('pdf')}
                    className={`p-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition ${
                      selectedFormat === 'pdf' ? 'border-rose-500 bg-rose-50 text-rose-800' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <FileText className="w-5 h-5 text-rose-600" />
                    <span>Dokumen PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('csv')}
                    className={`p-3 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition ${
                      selectedFormat === 'csv' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <span>File CSV (Excel)</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-medium"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={selectedFormat === 'pdf' ? handleExportPDF : handleExportCSV}
                  disabled={isExporting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-md shadow-emerald-950/20"
                >
                  {isExporting ? 'Memproses...' : 'Unduh Sekarang'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
