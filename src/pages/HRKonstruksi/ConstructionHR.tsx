import React, { useEffect, useMemo, useState } from 'react';
import { useGreenhouse } from '../../context/GreenhouseContext';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import { buildConstructionSlipHtml, buildKasbonSlipHtml, ConstructionSlipData, openPrintWindow } from '../../utils/slipRenderer';
import { RegisterStaffModal } from '../HRPayroll/RegisterStaffModal';
import { AttendanceRecord, DebtReceivable, Employee, Investment } from '../../types';
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
  Printer,
  UserCheck,
  UserX,
  Check,
  ClipboardList,
  Receipt,
  Eye,
  Search,
  Download,
} from 'lucide-react';

/** Kata "gaji"/"upah" sebagai KATA UTUH — "Kikir gergaji" tidak ikut tertangkap. */
const WAGE_KEYWORD_REGEX = /(^|[^a-zA-Z])(gaji|upah)/i;

export const ConstructionHRPage: React.FC = () => {
  const { db, addInvestment, addDebt, payDebt, bulkUpsertAttendance, updateEmployee, addToast } = useGreenhouse();

  // ===== Data pekerja konstruksi =====
  const workers = useMemo(
    () => (db.employees || []).filter((e) => e.workArea === 'Konstruksi' && !e.isDeleted),
    [db.employees]
  );
  const activeWorkers = workers.filter((w) => w.isActive);

  // ===== Catatan upah (histori Investasi) =====
  const wageItems = useMemo(() => {
    return (db.investments || [])
      .filter((i) => WAGE_KEYWORD_REGEX.test(`${i.itemName || ''} ${i.notes || ''}`))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [db.investments]);

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
  const lastPaymentDate = wageItems[0]?.date || '';
  const lastPaymentAmount = Number(wageItems[0]?.totalAmount) || 0;

  // ===== Absensi =====
  const today = new Date().toISOString().slice(0, 10);
  const [attDate, setAttDate] = useState(today);

  const attendanceFor = (workerId: string, date: string) =>
    (db.attendances || []).find((a) => a.employeeId === workerId && a.date === date);

  const dayValue = (status?: string) => (status === 'Setengah Hari' ? 0.5 : status === 'Hadir' ? 1 : 0);

  const unpaidDaysFor = (workerId: string, uptoDate: string) =>
    (db.attendances || [])
      .filter(
        (a) =>
          a.employeeId === workerId &&
          !a.wagePaid &&
          (a.date || '') <= uptoDate &&
          (a.status === 'Hadir' || a.status === 'Setengah Hari')
      )
      .reduce((s, a) => s + dayValue(a.status), 0);

  const monthDaysFor = (workerId: string) => {
    const ym = today.slice(0, 7);
    return (db.attendances || [])
      .filter(
        (a) =>
          a.employeeId === workerId &&
          (a.date || '').startsWith(ym) &&
          (a.status === 'Hadir' || a.status === 'Setengah Hari')
      )
      .reduce((s, a) => s + dayValue(a.status), 0);
  };

  const buildAttendancePayload = (
    worker: Employee,
    choice: 'Hadir' | 'Setengah Hari' | 'Alpa'
  ): Partial<AttendanceRecord> => {
    const status = choice === 'Alpa' ? 'Alpha' : choice;
    return {
      employeeId: worker.id,
      employeeName: worker.name,
      date: attDate,
      greenhouse: worker.greenhouse || 'Semua Greenhouse',
      shiftName: 'Konstruksi',
      status,
      lateMinutes: 0,
      workHours: choice === 'Hadir' ? 8 : choice === 'Setengah Hari' ? 4 : 0,
      overtimeHours: 0,
      note: 'Absensi konstruksi',
      method: 'manual_admin' as const,
    };
  };

  const saveAttendance = async (worker: Employee, choice: 'Hadir' | 'Setengah Hari' | 'Alpa') => {
    const existing = attendanceFor(worker.id, attDate);
    const ok = await bulkUpsertAttendance([{ id: existing?.id, data: buildAttendancePayload(worker, choice) }]);
    if (ok) {
      addToast(`${worker.name}: ${choice === 'Alpa' ? 'Tidak Hadir' : choice} (${formatDate(attDate)})`, 'success');
    }
  };

  const markAllPresent = async () => {
    const items = activeWorkers
      .filter((w) => {
        const a = attendanceFor(w.id, attDate);
        return !(a && a.status === 'Hadir' && (a.workHours || 0) >= 8);
      })
      .map((w) => ({ id: attendanceFor(w.id, attDate)?.id, data: buildAttendancePayload(w, 'Hadir') }));
    if (items.length === 0) {
      addToast('Semua pekerja sudah ditandai Hadir pada tanggal ini', 'info');
      return;
    }
    const ok = await bulkUpsertAttendance(items);
    if (ok) addToast(`${items.length} pekerja ditandai Hadir (${formatDate(attDate)})`, 'success');
  };

  // ===== Status pekerja =====
  const toggleWorkerStatus = async (worker: Employee) => {
    const next = !worker.isActive;
    const ok = await updateEmployee(worker.id, { isActive: next });
    if (ok) {
      addToast(
        next ? `${worker.name} ditandai AKTIF bekerja` : `${worker.name} ditandai SELESAI / tidak aktif`,
        next ? 'success' : 'info'
      );
    }
  };

  // ===== Modal tambah/edit =====
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Employee | null>(null);
  const [staffFilter, setStaffFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const visibleRecap = recap.filter(({ worker: w }) =>
    staffFilter === 'all' ? true : staffFilter === 'active' ? w.isActive : !w.isActive
  );

  // ===== Form pembayaran =====
  const [payWorkerId, setPayWorkerId] = useState<string | null>(null);
  const [payDays, setPayDays] = useState('1');
  const [payRate, setPayRate] = useState('');
  const [payDate, setPayDate] = useState(today);
  const [payNote, setPayNote] = useState('');
  const [payOvertimeHours, setPayOvertimeHours] = useState('0');
  const [payOvertimeRate, setPayOvertimeRate] = useState('');
  const [markAttendance, setMarkAttendance] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [paidResult, setPaidResult] = useState<ConstructionSlipData | null>(null);
  const [pendingWagePaid, setPendingWagePaid] = useState<{ ids: string[]; beforeCount: number } | null>(null);

  // ===== Kas bon pekerja (gaji di muka) =====
  const [isKasbonOpen, setIsKasbonOpen] = useState(false);
  const [kasbonWorkerId, setKasbonWorkerId] = useState('');
  const [kasbonDate, setKasbonDate] = useState(today);
  const [kasbonAmount, setKasbonAmount] = useState('');
  const [kasbonNote, setKasbonNote] = useState('');
  const [kasbonResult, setKasbonResult] = useState<{
    id: string;
    workerName: string;
    position: string;
    amount: number;
    remaining: number;
    status: string;
    note?: string;
  } | null>(null);
  const [deductKasbon, setDeductKasbon] = useState(false);
  const [detailWorkerId, setDetailWorkerId] = useState<string | null>(null);
  const [wageMonthFilter, setWageMonthFilter] = useState<string>('all');
  const [workerQuery, setWorkerQuery] = useState('');

  const kasbonDebts = (db.debts || []).filter((d) => d.isKasbon);
  const kasbonOutstandingFor = (name: string) =>
    kasbonDebts
      .filter(
        (d) =>
          d.type === 'piutang' &&
          d.status !== 'Lunas' &&
          (d.counterparty || '').toLowerCase() === (name || '').toLowerCase()
      )
      .reduce((s, d) => s + (Number(d.remainingAmount) || 0), 0);
  const totalKasbonOutstanding = kasbonDebts
    .filter((d) => d.type === 'piutang' && d.status !== 'Lunas')
    .reduce((s, d) => s + (Number(d.remainingAmount) || 0), 0);

  const detailWorker = workers.find((w) => w.id === detailWorkerId) || null;

  const monthLabel = (key: string) => {
    if (!key) return '-';
    try {
      return new Date(`${key}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } catch {
      return key;
    }
  };

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    wageItems.forEach((i) => {
      const m = (i.date || '').slice(0, 7);
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [wageItems]);

  const filteredWageItems = useMemo(
    () => (wageMonthFilter === 'all' ? wageItems : wageItems.filter((i) => (i.date || '').startsWith(wageMonthFilter))),
    [wageItems, wageMonthFilter]
  );
  const filteredWageTotal = filteredWageItems.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);

  const filteredRecap = visibleRecap.filter(({ worker: w }) => {
    const q = workerQuery.trim().toLowerCase();
    if (!q) return true;
    return (w.name || '').toLowerCase().includes(q) || (w.position || '').toLowerCase().includes(q);
  });

  const detailStats = useMemo(() => {
    if (!detailWorker) return null;
    const name = (detailWorker.name || '').toLowerCase();
    const payments = wageItems.filter((i) => `${i.itemName || ''} ${i.notes || ''}`.toLowerCase().includes(name));
    const monthKey = (attDate || today).slice(0, 7);
    const atts = (db.attendances || []).filter(
      (a) => a.employeeId === detailWorker.id && (a.date || '').startsWith(monthKey)
    );
    const kasbons = kasbonDebts.filter(
      (d) => d.type === 'piutang' && (d.counterparty || '').toLowerCase() === name && d.status !== 'Lunas'
    );
    return {
      payments,
      totalEarned: payments.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0),
      monthKey,
      hadir: atts.filter((a) => a.status === 'Hadir').length,
      half: atts.filter((a) => a.status === 'Setengah Hari').length,
      alpa: atts.filter((a) => (a.status as string) === 'Alpa' || a.status === 'Alpha').length,
      kasbons,
      kasbonTotal: kasbons.reduce((s, d) => s + (Number(d.remainingAmount) || 0), 0),
      unpaidDays: unpaidDaysFor(detailWorker.id, today),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailWorker, wageItems, db.attendances, kasbonDebts, attDate, today]);

  // Setelah investasi pembayaran benar-benar tersimpan ke state, tandai absensi sekaligus
  // (satu penyimpanan batch agar perubahan tidak saling menimpa / lost update).
  useEffect(() => {
    if (!pendingWagePaid) return;
    if ((db.investments || []).length > pendingWagePaid.beforeCount) {
      const ids = pendingWagePaid.ids;
      setPendingWagePaid(null);
      bulkUpsertAttendance(ids.map((id) => ({ id, data: { wagePaid: true } })));
    }
  }, [pendingWagePaid, db.investments, bulkUpsertAttendance]);

  const payWorker = workers.find((w) => w.id === payWorkerId) || null;
  const payUnpaidDays = payWorker ? unpaidDaysFor(payWorker.id, payDate) : 0;
  const payKasbonOutstanding = payWorker ? kasbonOutstandingFor(payWorker.name) : 0;
  const kasbonWorker = workers.find((w) => w.id === kasbonWorkerId) || null;

  const openPayModal = (w: Employee) => {
    const unpaid = unpaidDaysFor(w.id, today);
    setPayWorkerId(w.id);
    setPayDays(unpaid > 0 ? String(unpaid) : '1');
    setPayRate(String(w.dailyRate || w.baseSalary || 0));
    setPayDate(today);
    setPayNote('');
    setPayOvertimeHours('0');
    setPayOvertimeRate('');
    setDeductKasbon(false);
    setMarkAttendance(true);
    setPaidResult(null);
  };

  const closePayModal = () => {
    setPayWorkerId(null);
    setPaidResult(null);
    setPayOvertimeHours('0');
    setPayOvertimeRate('');
    setDeductKasbon(false);
  };

  const openPrint = (html: string) => {
    if (!openPrintWindow(html)) {
      addToast('Popup diblokir browser — izinkan popup untuk mencetak nota', 'warning');
    }
  };

  const submitPayment = async () => {
    if (!payWorker) return;
    const days = Number(payDays) || 0;
    const rate = Number(payRate) || 0;
    const overtimeHours = Number(payOvertimeHours) || 0;
    const overtimeRate = Number(payOvertimeRate) || 0;
    if (days <= 0 || rate <= 0) {
      addToast('Jumlah hari dan tarif harus lebih dari 0', 'error');
      return;
    }
    if (overtimeHours > 0 && overtimeRate <= 0) {
      addToast('Isi tarif lembur per jam (atau kosongkan jam lembur)', 'error');
      return;
    }
    setIsPaying(true);
    const isTukang = /tukang/i.test(payWorker.position || '');
    const baseAmount = Math.round(days * rate);
    const overtimeAmount = Math.round(overtimeHours * overtimeRate);
    const total = baseAmount + overtimeAmount;
    const baseNote = payNote.trim()
      ? `${payWorker.name} - ${payNote.trim()}`
      : `Upah ${payWorker.name} ${days} hari`;
    const ok = await addInvestment({
      date: payDate,
      category: 'Pembangunan',
      itemName: isTukang ? 'Gaji tukang' : 'Gaji kuli',
      quantity: days,
      unit: 'Hari',
      unitPrice: rate,
      supplier: payWorker.name,
      tunnel: 'Semua Greenhouse',
      notes: overtimeAmount > 0 ? `${baseNote} | Lembur ${overtimeHours} jam` : baseNote,
      totalAmountOverride: total,
    });
    setIsPaying(false);
    if (!ok) return;

    // Potong kas bon pekerja (jika dicentang). Pelunasan piutang ini otomatis
    // membuat kas masuk penyeimbang sehingga kas keluar = upah − kas bon.
    if (deductKasbon && payKasbonOutstanding > 0) {
      let toDeduct = Math.min(payKasbonOutstanding, total);
      const targets = kasbonDebts
        .filter(
          (d) =>
            d.type === 'piutang' &&
            d.status !== 'Lunas' &&
            (d.counterparty || '').toLowerCase() === payWorker.name.toLowerCase()
        )
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      for (const target of targets) {
        if (toDeduct <= 0) break;
        const amt = Math.min(Number(target.remainingAmount) || 0, toDeduct);
        if (amt > 0) {
          await payDebt(target.id, amt, 'balance_only');
          toDeduct -= amt;
        }
      }
    }

    // Tandai absensi yang tercakup pembayaran ini sebagai sudah dibayar.
    // Dilakukan lewat efek setelah state investasi tersimpan (menghindari lost-update).
    if (markAttendance) {
      const unpaidRecords = (db.attendances || [])
        .filter(
          (a) =>
            a.employeeId === payWorker.id &&
            !a.wagePaid &&
            (a.date || '') <= payDate &&
            (a.status === 'Hadir' || a.status === 'Setengah Hari')
        )
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      let remaining = days;
      const ids: string[] = [];
      for (const rec of unpaidRecords) {
        const val = dayValue(rec.status);
        if (remaining >= val) {
          ids.push(rec.id);
          remaining -= val;
        } else {
          break;
        }
      }
      if (ids.length > 0) {
        setPendingWagePaid({ ids, beforeCount: (db.investments || []).length });
      }
    }

    addToast(`Upah ${payWorker.name} (${days} hari) tercatat sebagai Investasi Pembangunan`, 'success');
    setPaidResult({
      id: `NOTA-${Date.now().toString().slice(-6)}`,
      date: payDate,
      workerName: payWorker.name,
      position: payWorker.position || '',
      days,
      unit: 'Hari',
      rate,
      total,
      overtimeHours,
      overtimeRate,
      overtimeAmount,
      note: payNote.trim() || undefined,
    });
  };

  const printHistoryItem = (inv: Investment) => {
    const names = matchedWorkerNames(inv);
    openPrint(
      buildConstructionSlipHtml({
        id: String(inv.id || '').slice(0, 22),
        date: inv.date,
        workerName: names.length > 0 ? names.join(', ') : inv.supplier || '-',
        position: '-',
        days: Number(inv.quantity) || 0,
        unit: inv.unit || 'Hari',
        rate: Number(inv.unitPrice) || 0,
        total: Number(inv.totalAmount) || 0,
        overtimeAmount: Math.max(
          0,
          Math.round((Number(inv.totalAmount) || 0) - (Number(inv.quantity) || 0) * (Number(inv.unitPrice) || 0))
        ),
        note: inv.notes,
      })
    );
  };

  // ===== Kas bon pekerja =====
  const openKasbonModal = (workerId?: string) => {
    setKasbonWorkerId(workerId || workers[0]?.id || '');
    setKasbonDate(today);
    setKasbonAmount('');
    setKasbonNote('');
    setKasbonResult(null);
    setIsKasbonOpen(true);
  };

  const submitKasbon = async () => {
    if (!kasbonWorker) {
      addToast('Pilih pekerja terlebih dahulu', 'error');
      return;
    }
    const amount = Math.round(Number(kasbonAmount) || 0);
    if (amount <= 0) {
      addToast('Jumlah kas bon harus lebih dari 0', 'error');
      return;
    }
    const ok = await addDebt({
      type: 'piutang',
      counterparty: kasbonWorker.name,
      date: kasbonDate,
      dueDate: kasbonDate,
      amount,
      paidAmount: 0,
      description: `Kas bon upah${kasbonNote.trim() ? ` — ${kasbonNote.trim()}` : ''}`,
      givenToCash: true,
      isKasbon: true,
    });
    if (!ok) return;
    setKasbonResult({
      id: `KASBON-${Date.now().toString().slice(-6)}`,
      workerName: kasbonWorker.name,
      position: kasbonWorker.position || '',
      amount,
      remaining: amount,
      status: 'Belum lunas',
      note: kasbonNote.trim() || undefined,
    });
  };

  const printKasbonDebt = (d: DebtReceivable) => {
    const w = workers.find((x) => (x.name || '').toLowerCase() === (d.counterparty || '').toLowerCase());
    openPrint(
      buildKasbonSlipHtml({
        id: String(d.id || '').slice(0, 24),
        date: d.date,
        workerName: d.counterparty,
        position: w?.position || '',
        amount: Number(d.amount) || 0,
        remaining: Number(d.remainingAmount) || 0,
        status: d.status,
        note: d.description,
      })
    );
  };

  // ===== Ekspor CSV =====
  const downloadCsv = (filename: string, rows: (string | number)[][]) => {
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportWageHistoryCsv = () => {
    const rows: (string | number)[][] = [
      ['GREENHOUSE FINANCE PRO — TARNO JAYA FARM'],
      ['RIWAYAT PEMBAYARAN UPAH KONSTRUKSI'],
      ['Diekspor', new Date().toLocaleString('id-ID')],
      ['Periode', wageMonthFilter === 'all' ? 'Semua Bulan' : monthLabel(wageMonthFilter)],
      [],
      ['Tanggal', 'Pekerja', 'Jenis Upah', 'Volume', 'Tarif', 'Total', 'Catatan'],
    ];
    filteredWageItems.forEach((i) => {
      rows.push([
        i.date,
        matchedWorkerNames(i).join(', ') || i.supplier || '-',
        i.itemName || '',
        `${formatNumber(Number(i.quantity) || 0)} ${i.unit || ''}`,
        Number(i.unitPrice) || 0,
        Number(i.totalAmount) || 0,
        i.notes || '',
      ]);
    });
    rows.push([], ['TOTAL', '', '', '', '', filteredWageTotal, '']);
    downloadCsv(`riwayat-upah-konstruksi-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportWageRecapCsv = () => {
    const rows: (string | number)[][] = [
      ['GREENHOUSE FINANCE PRO — TARNO JAYA FARM'],
      ['REKAP UPAH PER PEKERJA KONSTRUKSI'],
      ['Diekspor', new Date().toLocaleString('id-ID')],
      [],
      ['Pekerja', 'Jabatan', 'Jumlah Pembayaran', 'Total Upah Diterima', 'Pembayaran Terakhir', 'Kas Bon Belum Dipotong'],
    ];
    recap.forEach(({ worker: w, total, entries, lastDate }) => {
      rows.push([w.name, w.position || '', entries, total, lastDate || '-', kasbonOutstandingFor(w.name)]);
    });
    downloadCsv(`rekap-upah-konstruksi-${new Date().toISOString().slice(0, 10)}.csv`, rows);
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
            Absensi harian, upah harian, rekap per pekerja, dan nota upah yang bisa dicetak. Semua pembayaran otomatis
            tercatat sebagai <strong className="text-amber-300">Investasi (Pembangunan/capex)</strong> — tidak masuk
            biaya operasional &amp; HPP panen.
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
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pekerja Aktif</span>
            <HardHat className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-slate-900">
            {activeWorkers.length}
            <span className="text-sm text-slate-400 font-sans"> / {workers.length}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Aktif / total terdaftar</p>
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
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Absensi Hari Ini</span>
            <CalendarDays className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg sm:text-2xl font-black font-mono text-slate-900">
            {activeWorkers.filter((w) => {
              const a = attendanceFor(w.id, today);
              return a && (a.status === 'Hadir' || a.status === 'Setengah Hari');
            }).length}
            <span className="text-sm text-slate-400 font-sans"> hadir</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{formatDate(today)}</p>
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

      {/* ===== Absensi Harian ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <span>Absensi Harian Pekerja Konstruksi</span>
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={attDate}
              onChange={(e) => setAttDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:border-emerald-600 outline-none"
            />
            <button
              onClick={markAllPresent}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Semua Hadir</span>
            </button>
          </div>
        </div>

        {activeWorkers.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            Belum ada pekerja aktif. Tambahkan pekerja atau aktifkan kembali pekerja yang selesai.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeWorkers.map((w) => {
              const rec = attendanceFor(w.id, attDate);
              const isHadir = rec?.status === 'Hadir' && (rec?.workHours || 0) >= 8;
              const isHalf = rec?.status === 'Setengah Hari';
              const isAlpa = rec?.status === 'Alpha';
              const unpaid = unpaidDaysFor(w.id, today);
              return (
                <div key={w.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {w.avatarUrl ? (
                      <img src={w.avatarUrl} alt={w.name} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <HardHat className="w-4 h-4 text-amber-700" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-900">{w.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {w.position} · Rp {formatNumber(w.dailyRate || 0)}/hari
                        {unpaid > 0 && <span className="text-amber-700 font-semibold"> · {formatNumber(unpaid)} hari belum dibayar</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => saveAttendance(w, 'Hadir')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        isHadir
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
                      }`}
                    >
                      Hadir
                    </button>
                    <button
                      onClick={() => saveAttendance(w, 'Setengah Hari')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        isHalf
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                      }`}
                    >
                      ½ Hari
                    </button>
                    <button
                      onClick={() => saveAttendance(w, 'Alpa')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        isAlpa
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-rose-400'
                      }`}
                    >
                      Alpa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-slate-400">
          Absensi otomatis mengurangi "hari belum dibayar" pada tombol Bayar Upah. Hari yang sudah dibayar ditandai
          lunas.
        </p>
      </div>

      {/* ===== Daftar Pekerja ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-600" />
            <span>Daftar Pekerja Konstruksi</span>
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={workerQuery}
                onChange={(e) => setWorkerQuery(e.target.value)}
                placeholder="Cari nama / jabatan..."
                className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-amber-500 outline-none w-full sm:w-44"
              />
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            {([
              { key: 'all', label: `Semua (${workers.length})` },
              { key: 'active', label: `Aktif (${activeWorkers.length})` },
              { key: 'inactive', label: `Selesai (${workers.length - activeWorkers.length})` },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setStaffFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  staffFilter === f.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
            </div>
          </div>
        </div>

        {filteredRecap.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            Tidak ada pekerja yang cocok. Klik <strong>Tambah Pekerja</strong> untuk mendaftarkan tukang/kuli.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredRecap.map(({ worker: w, total, entries, lastDate }) => (
              <div
                key={w.id}
                className={`p-4 rounded-2xl border shadow-xs space-y-3 ${
                  w.isActive ? 'border-slate-200 bg-slate-50/60' : 'border-slate-200 bg-slate-100/70 opacity-80'
                }`}
              >
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
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md border font-bold shrink-0 ${
                      w.isActive
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}
                  >
                    {w.isActive ? 'Aktif' : 'Selesai'}
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
                    <span>
                      Hadir bulan ini: <b className="text-slate-700">{formatNumber(monthDaysFor(w.id))} hari</b>
                    </span>
                    <span>{lastDate ? `Terakhir: ${formatDate(lastDate)}` : 'Belum dibayar'}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>{entries} catatan pembayaran</span>
                    <span className={unpaidDaysFor(w.id, today) > 0 ? 'text-amber-700 font-semibold' : ''}>
                      {formatNumber(unpaidDaysFor(w.id, today))} hari belum dibayar
                    </span>
                  </div>
                  {kasbonOutstandingFor(w.name) > 0 && (
                    <div className="flex justify-between text-sky-700 font-semibold">
                      <span>Kas bon belum dipotong</span>
                      <span className="font-mono">{formatCurrency(kasbonOutstandingFor(w.name))}</span>
                    </div>
                  )}
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
                    onClick={() => setDetailWorkerId(w.id)}
                    title="Detail pekerja"
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-sky-700 hover:bg-white transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleWorkerStatus(w)}
                    title={w.isActive ? 'Tandai selesai / tidak aktif' : 'Aktifkan kembali pekerja'}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      w.isActive
                        ? 'border-rose-200 text-rose-500 hover:bg-rose-50'
                        : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {w.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
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

      {/* ===== Riwayat Pembayaran ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>Riwayat Pembayaran Upah</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              {filteredWageItems.length} catatan · total <b>{formatCurrency(filteredWageTotal)}</b>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={wageMonthFilter}
              onChange={(e) => setWageMonthFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:border-emerald-500 outline-none"
            >
              <option value="all">Semua Bulan</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <button
              onClick={exportWageHistoryCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 transition cursor-pointer"
              title="Unduh riwayat upah (CSV)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Riwayat</span>
            </button>
            <button
              onClick={exportWageRecapCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 transition cursor-pointer"
              title="Unduh rekap per pekerja (CSV)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Rekap</span>
            </button>
          </div>
        </div>

        {filteredWageItems.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            {wageMonthFilter === 'all' ? 'Belum ada catatan pembayaran upah.' : 'Tidak ada pembayaran pada bulan ini.'}
          </p>
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
                  <th className="text-center p-2 font-bold">Nota</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {filteredWageItems.map((inv) => {
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
                      <td className="p-2 text-center">
                        <button
                          onClick={() => printHistoryItem(inv)}
                          title="Cetak nota upah"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-700 hover:border-emerald-300 transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== Kas Bon Pekerja ===== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-sky-600" />
              <span>Kas Bon Pekerja (Gaji di Muka)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pekerja minta gaji dulu / hutang dulu — kas keluar sekarang, dipotong otomatis saat pembayaran upah
              berikutnya. Total belum dipotong: <b>{formatCurrency(totalKasbonOutstanding)}</b>
            </p>
          </div>
          <button
            onClick={() => openKasbonModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Beri Kas Bon</span>
          </button>
        </div>

        {kasbonDebts.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">Belum ada kas bon pekerja.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="text-left p-2 font-bold">Tanggal</th>
                  <th className="text-left p-2 font-bold">Pekerja</th>
                  <th className="text-right p-2 font-bold">Kas Bon</th>
                  <th className="text-right p-2 font-bold">Sisa</th>
                  <th className="text-left p-2 font-bold">Status</th>
                  <th className="text-center p-2 font-bold">Slip</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {kasbonDebts
                  .slice()
                  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                  .map((d) => (
                    <tr key={d.id} className="border-b border-slate-100">
                      <td className="p-2 whitespace-nowrap">{formatDate(d.date)}</td>
                      <td className="p-2 font-sans font-semibold text-slate-800">{d.counterparty}</td>
                      <td className="p-2 text-right whitespace-nowrap">{formatCurrency(d.amount)}</td>
                      <td className="p-2 text-right whitespace-nowrap font-bold text-slate-900">
                        {formatCurrency(d.remainingAmount)}
                      </td>
                      <td className="p-2 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.status === 'Lunas'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.status === 'Sebagian'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => printKasbonDebt(d)}
                          title="Cetak slip kas bon"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-sky-700 hover:border-sky-300 transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
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

      {/* ===== Modal Bayar Upah ===== */}
      {payWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-100">
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5 h-5" />
                <div>
                  <h3 className="text-sm font-extrabold">
                    {paidResult ? 'Pembayaran Berhasil' : 'Bayar Upah Konstruksi'}
                  </h3>
                  <p className="text-[11px] text-emerald-100">
                    {payWorker.name} · {payWorker.position}
                  </p>
                </div>
              </div>
              <button
                onClick={closePayModal}
                className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {paidResult ? (
              <div className="p-5 space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Upah tercatat sebagai Investasi (Pembangunan)</p>
                    <p className="mt-0.5">
                      {paidResult.workerName} · {formatNumber(paidResult.days)} hari ×{' '}
                      {formatCurrency(paidResult.rate)}
                      {(paidResult.overtimeAmount || 0) > 0
                        ? ` + lembur ${formatNumber(paidResult.overtimeHours || 0)} jam × ${formatCurrency(paidResult.overtimeRate || 0)}`
                        : ''}{' '}
                      = <b>{formatCurrency(paidResult.total)}</b>
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => openPrint(buildConstructionSlipHtml(paidResult))}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Nota Upah</span>
                  </button>
                  <button
                    onClick={closePayModal}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4 text-xs">
                {payUnpaidDays > 0 && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-2">
                    <CalendarDays className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      Dari absensi: <b>{formatNumber(payUnpaidDays)} hari</b> belum dibayar (otomatis diisikan ke
                      Jumlah Hari, bisa diubah).
                    </span>
                  </div>
                )}
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
                      min="0.5"
                      step="0.5"
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
                    <label className="font-semibold text-slate-700 block mb-1">Lembur (jam)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={payOvertimeHours}
                      onChange={(e) => setPayOvertimeHours(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tarif Lembur / Jam (Rp)</label>
                    <input
                      type="number"
                      value={payOvertimeRate}
                      onChange={(e) => setPayOvertimeRate(e.target.value)}
                      placeholder="mis. 20000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Total Upah</label>
                    <div className="w-full px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 font-black text-emerald-800 font-mono">
                      {formatCurrency(
                        (Number(payDays) || 0) * (Number(payRate) || 0) +
                          (Number(payOvertimeHours) || 0) * (Number(payOvertimeRate) || 0)
                      )}
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

                <label className="flex items-center gap-2 text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markAttendance}
                    onChange={(e) => setMarkAttendance(e.target.checked)}
                    className="accent-emerald-600"
                  />
                  <span>
                    Tandai absensi yang tercakup ({formatNumber(Math.min(payUnpaidDays, Number(payDays) || 0))} hari)
                    sebagai <b>sudah dibayar</b>
                  </span>
                </label>

                {payKasbonOutstanding > 0 && (
                  <label className="flex items-center gap-2 text-[11px] text-sky-900 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deductKasbon}
                      onChange={(e) => setDeductKasbon(e.target.checked)}
                      className="accent-sky-600"
                    />
                    <span>
                      Potong kas bon pekerja <b>{formatCurrency(payKasbonOutstanding)}</b> dari upah ini (sisa kas bon
                      otomatis berkurang).
                    </span>
                  </label>
                )}

                <label className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Otomatis dicatat sebagai <strong>Investasi (Pembangunan)</strong> — bukan biaya operasional/HPP.
                  </span>
                </label>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={closePayModal}
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
            )}
          </div>
        </div>
      )}

      {/* ===== Modal Kas Bon ===== */}
      {isKasbonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-sky-100">
            <div className="px-5 py-4 bg-gradient-to-r from-sky-600 to-cyan-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5" />
                <div>
                  <h3 className="text-sm font-extrabold">
                    {kasbonResult ? 'Kas Bon Tercatat' : 'Beri Kas Bon Pekerja'}
                  </h3>
                  <p className="text-[11px] text-sky-100">
                    {kasbonResult
                      ? kasbonResult.workerName
                      : kasbonWorker
                        ? `${kasbonWorker.name} · ${kasbonWorker.position}`
                        : 'Gaji di muka (hutang pekerja)'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsKasbonOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {kasbonResult ? (
              <div className="p-5 space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Kas bon tercatat (kas keluar)</p>
                    <p className="mt-0.5">
                      {kasbonResult.workerName} · <b>{formatCurrency(kasbonResult.amount)}</b> — otomatis dipotong saat
                      pembayaran upah berikutnya.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => openPrint(buildKasbonSlipHtml({ ...kasbonResult, date: kasbonDate }))}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Slip Kas Bon</span>
                  </button>
                  <button
                    onClick={() => setIsKasbonOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Pekerja</label>
                  <select
                    value={kasbonWorkerId}
                    onChange={(e) => setKasbonWorkerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-sky-500 outline-none bg-white"
                  >
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} — {w.position}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tanggal</label>
                    <input
                      type="date"
                      value={kasbonDate}
                      onChange={(e) => setKasbonDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-sky-500 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Jumlah Kas Bon (Rp)</label>
                    <input
                      type="number"
                      value={kasbonAmount}
                      onChange={(e) => setKasbonAmount(e.target.value)}
                      placeholder="mis. 200000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-sky-500 outline-none font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Keterangan (opsional)</label>
                  <input
                    type="text"
                    value={kasbonNote}
                    onChange={(e) => setKasbonNote(e.target.value)}
                    placeholder="mis. minta gaji dulu untuk kebutuhan mendesak"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-sky-500 outline-none"
                  />
                </div>
                {kasbonWorker && kasbonOutstandingFor(kasbonWorker.name) > 0 && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    Kas bon {kasbonWorker.name} yang belum dipotong:{' '}
                    <b>{formatCurrency(kasbonOutstandingFor(kasbonWorker.name))}</b>
                  </p>
                )}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setIsKasbonOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={submitKasbon}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-sm transition cursor-pointer"
                  >
                    Catat Kas Bon
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Modal Detail Pekerja ===== */}
      {detailWorker && detailStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-6">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {detailWorker.avatarUrl ? (
                  <img
                    src={detailWorker.avatarUrl}
                    alt={detailWorker.name}
                    className="w-10 h-10 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                    <HardHat className="w-5 h-5 text-amber-300" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold truncate">{detailWorker.name}</h3>
                  <p className="text-[11px] text-slate-300 truncate">
                    {detailWorker.position} · {detailWorker.isActive ? 'Aktif' : 'Selesai'} · Area{' '}
                    {detailWorker.workArea || 'Konstruksi'} · Bayar:{' '}
                    {detailWorker.bankName === 'Tunai / Cash'
                      ? 'Tunai / Cash'
                      : detailWorker.bankName
                        ? 'Transfer'
                        : 'Tunai / Cash'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailWorkerId(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-500 block">Tarif Harian</span>
                  <span className="font-black text-slate-900 font-mono">{formatCurrency(detailWorker.dailyRate || 0)}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-500 block">Total Upah Diterima</span>
                  <span className="font-black text-emerald-700 font-mono">{formatCurrency(detailStats.totalEarned)}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-500 block">Hari Belum Dibayar</span>
                  <span
                    className={`font-black font-mono ${detailStats.unpaidDays > 0 ? 'text-amber-700' : 'text-slate-900'}`}
                  >
                    {formatNumber(detailStats.unpaidDays)} hari
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-500 block">Kas Bon Aktif</span>
                  <span
                    className={`font-black font-mono ${detailStats.kasbonTotal > 0 ? 'text-sky-700' : 'text-slate-900'}`}
                  >
                    {formatCurrency(detailStats.kasbonTotal)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                <p className="font-bold text-slate-800 mb-2">Rekap Absensi {monthLabel(detailStats.monthKey)}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                    <span className="block text-base font-black text-emerald-700">{detailStats.hadir}</span>
                    <span className="text-[10px] text-emerald-800">Hadir</span>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                    <span className="block text-base font-black text-blue-700">{detailStats.half}</span>
                    <span className="text-[10px] text-blue-800">½ Hari</span>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-100">
                    <span className="block text-base font-black text-rose-700">{detailStats.alpa}</span>
                    <span className="text-[10px] text-rose-800">Alpa</span>
                  </div>
                </div>
              </div>

              {detailStats.kasbons.length > 0 && (
                <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/60">
                  <p className="font-bold text-sky-900 mb-2">Kas Bon Belum Dipotong</p>
                  <div className="space-y-1.5">
                    {detailStats.kasbons.map((k) => (
                      <div key={k.id} className="flex items-center justify-between text-[11px]">
                        <span className="text-sky-800">
                          {formatDate(k.date)} · {k.description || 'Kas bon'}
                        </span>
                        <span className="font-mono font-bold text-sky-900">{formatCurrency(k.remainingAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                <p className="font-bold text-slate-800 mb-2">Riwayat Pembayaran ({detailStats.payments.length})</p>
                {detailStats.payments.length === 0 ? (
                  <p className="text-[11px] text-slate-400">Belum ada pembayaran.</p>
                ) : (
                  <div className="space-y-1.5">
                    {detailStats.payments.slice(0, 6).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600">
                          {formatDate(p.date)} · {p.itemName}
                        </span>
                        <span className="font-mono font-bold text-slate-900">{formatCurrency(p.totalAmount)}</span>
                      </div>
                    ))}
                    {detailStats.payments.length > 6 && (
                      <p className="text-[10px] text-slate-400">
                        +{detailStats.payments.length - 6} pembayaran lainnya…
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  const id = detailWorker.id;
                  setDetailWorkerId(null);
                  openKasbonModal(id);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-sky-200 bg-sky-50 text-sky-800 font-bold transition hover:bg-sky-100 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Beri Kas Bon</span>
              </button>
              <button
                onClick={() => {
                  const w = detailWorker;
                  setDetailWorkerId(null);
                  openPayModal(w);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Bayar Upah</span>
              </button>
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
