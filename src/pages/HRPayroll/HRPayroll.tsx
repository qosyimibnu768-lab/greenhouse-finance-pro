import React, { useState, useMemo } from 'react';
import { useGreenhouse } from '../../context/GreenhouseContext';
import {
  Employee,
  AttendanceRecord,
  PayrollRecord,
  WorkShift,
  LeaveRequest,
  OvertimeRequest,
  AttendanceStatus,
} from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { RegisterStaffModal } from './RegisterStaffModal';
import { LiveFaceCheckInModal } from './LiveFaceCheckInModal';
import { PayrollSlipModal } from './PayrollSlipModal';
import {
  Users,
  CalendarCheck,
  Clock,
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Camera,
  FileText,
  Printer,
  TrendingUp,
  Download,
  ShieldCheck,
  ChevronRight,
  Briefcase,
  AlertTriangle,
  Send,
  Sliders,
  Sparkles,
  QrCode,
  MapPin,
  Coffee,
  Check,
  X,
  CreditCard,
  Edit2,
  Trash2,
} from 'lucide-react';

interface HRPayrollProps {
  currentSubtab?: string;
  onSelectSubtab?: (subtab: string) => void;
}

export const HRPayrollPage: React.FC<HRPayrollProps> = ({
  currentSubtab = 'dashboard',
  onSelectSubtab,
}) => {
  const {
    db,
    addAttendanceRecord,
    updateAttendanceRecord,
    recordClockIn,
    recordClockOut,
    requestLeave,
    approveLeave,
    rejectLeave,
    requestOvertime,
    approveOvertime,
    rejectOvertime,
    calculateMonthlyPayroll,
    payPayroll,
    updatePayrollSettings,
    deleteEmployee,
    addToast,
  } = useGreenhouse();

  const [activeTab, setActiveTab] = useState<string>(currentSubtab);

  // Sync prop changes if changed externally from navigation
  React.useEffect(() => {
    if (currentSubtab) {
      setActiveTab(currentSubtab);
    }
  }, [currentSubtab]);

  const setTab = (tabKey: string) => {
    setActiveTab(tabKey);
    if (onSelectSubtab) onSelectSubtab(tabKey);
  };

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [isFaceCheckInOpen, setIsFaceCheckInOpen] = useState(false);
  const [selectedSlipRecord, setSelectedSlipRecord] = useState<PayrollRecord | null>(null);

  // Attendance Filters
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffFilterGreenhouse, setStaffFilterGreenhouse] = useState('ALL');

  // Payroll Period Selection
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [isCalculatingPayroll, setIsCalculatingPayroll] = useState(false);

  // Manual Attendance Modal State
  const [isManualAttendanceOpen, setIsManualAttendanceOpen] = useState(false);
  const [manualAttData, setManualAttData] = useState<{
    employeeId: string;
    date: string;
    clockIn: string;
    clockOut: string;
    status: AttendanceStatus;
    note: string;
  }>({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    clockIn: '07:00',
    clockOut: '15:00',
    status: 'Hadir',
    note: '',
  });

  // Leave Form State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveFormData, setLeaveFormData] = useState({
    employeeId: '',
    type: 'Izin' as 'Izin' | 'Sakit' | 'Cuti',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    durationDays: 1,
    reason: '',
  });

  // Overtime Form State
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const [overtimeFormData, setOvertimeFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '16:00',
    endTime: '19:00',
    taskDescription: 'Pemangkasan tunas air & kontrol nutrisi melon Premium malam hari',
    greenhouse: 'Greenhouse 1',
  });

  // Filtered staff
  const filteredEmployees = useMemo(() => {
    return (db.employees || []).filter((emp) => {
      if (emp.isDeleted) return false;
      const matchSearch =
        emp.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
        emp.position.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
        emp.nikInternal.toLowerCase().includes(staffSearchQuery.toLowerCase());
      const matchTunnel =
        staffFilterGreenhouse === 'ALL' || emp.greenhouse === staffFilterGreenhouse;
      return matchSearch && matchTunnel;
    });
  }, [db.employees, staffSearchQuery, staffFilterGreenhouse]);

  // Attendance for selected date
  const selectedDateAttendances = useMemo(() => {
    return (db.attendances || []).filter((att) => att.date === attendanceDate);
  }, [db.attendances, attendanceDate]);

  // HR Dashboard Stats
  const hrMetrics = useMemo(() => {
    const activeStaff = (db.employees || []).filter((e) => e.isActive && !e.isDeleted);
    const today = new Date().toISOString().split('T')[0];
    const todayAttendances = (db.attendances || []).filter((a) => a.date === today);
    const presentCount = todayAttendances.filter(
      (a) => a.status === 'Hadir' || a.status === 'Terlambat'
    ).length;
    const lateCount = todayAttendances.filter((a) => a.status === 'Terlambat').length;
    const leaveCount = todayAttendances.filter(
      (a) => a.status === 'Izin' || a.status === 'Sakit' || a.status === 'Cuti'
    ).length;

    // Monthly payroll stats
    const currentPayrolls = (db.payrolls || []).filter(
      (p) => p.periodMonth === selectedMonth && p.periodYear === selectedYear
    );
    const totalPayrollAmount = currentPayrolls.reduce((sum, p) => sum + p.netSalary, 0);
    const paidPayrollAmount = currentPayrolls
      .filter((p) => p.status === 'Paid')
      .reduce((sum, p) => sum + p.netSalary, 0);

    return {
      totalStaff: activeStaff.length,
      presentToday: presentCount,
      lateToday: lateCount,
      leaveToday: leaveCount,
      absentToday: Math.max(0, activeStaff.length - presentCount - leaveCount),
      totalPayrollAmount,
      paidPayrollAmount,
      payrollCount: currentPayrolls.length,
    };
  }, [db.employees, db.attendances, db.payrolls, selectedMonth, selectedYear]);

  // Handle Calculate Payroll
  const handleRunPayrollCalculation = async () => {
    setIsCalculatingPayroll(true);
    try {
      const success = await calculateMonthlyPayroll(selectedMonth, selectedYear);
      if (success) {
        addToast(
          'Kalkulasi payroll berhasil digenerate untuk periode ini.',
          'success'
        );
      }
    } catch (err: any) {
      addToast('Gagal kalkulasi payroll: ' + err.message, 'error');
    } finally {
      setIsCalculatingPayroll(false);
    }
  };

  // Handle Pay Payroll record
  const handlePayPayroll = async (record: PayrollRecord) => {
    if (
      !window.confirm(
        `Konfirmasi pembayaran gaji untuk ${record.employeeName} sebesar ${formatCurrency(
          record.netSalary
        )}? Biaya ini akan otomatis dicatat pada Keuangan/Pengeluaran Operasional Kebun.`
      )
    ) {
      return;
    }

    const success = await payPayroll(record.id, {
      paymentMethod: 'Transfer Bank',
      paymentReference: `TRF-PAY-${Date.now().toString().slice(-6)}`,
      paymentNotes: `Gaji ${record.periodLabel} - ${record.position} ${record.greenhouse}`,
    });

    if (success) {
      addToast(`Gaji ${record.employeeName} berhasil dibayarkan & dicatat di Keuangan`, 'success');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Fast Action Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/30 border border-emerald-400/40 rounded-full text-xs font-semibold text-emerald-200">
              Modul Tenaga Kerja Kebun Melon Premium
            </span>
            <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-200 text-xs rounded-full">
              HPP Auto-Integration
            </span>
          </div>
          <h1 className="text-2xl font-black mt-2 tracking-tight">HR & Payroll Management Pro</h1>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            Sistem terintegrasi presensi biometrik wajah, shift kerja greenhouse, kalkulasi upah
            harian/bulanan, bonus panen melon, dan pencatatan otomatis ke arus kas keuangan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsFaceCheckInOpen(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition transform active:scale-95"
          >
            <Camera className="w-4 h-4" /> Live Face Biometric Check-In
          </button>
          <button
            onClick={() => {
              setEmployeeToEdit(null);
              setIsRegisterOpen(true);
            }}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Tambah Karyawan Baru
          </button>
        </div>
      </div>

      {/* Subtab Navigation Pills */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-emerald-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { key: 'dashboard', label: 'Ringkasan HR', icon: TrendingUp },
          { key: 'karyawan', label: 'Data Karyawan', icon: Users },
          { key: 'absensi', label: 'Presensi & Absensi', icon: CalendarCheck },
          { key: 'jadwal-shift', label: 'Jadwal & Shift', icon: Clock },
          { key: 'lembur', label: 'Lembur Kerja', icon: Coffee },
          { key: 'izin-cuti', label: 'Izin / Cuti', icon: FileText },
          { key: 'payroll', label: 'Penggajian & Slip Gaji', icon: DollarSign },
          { key: 'pengaturan-payroll', label: 'Pengaturan Upah', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.key ||
            (tab.key === 'absensi' &&
              (activeTab === 'input-absensi' || activeTab === 'rekap-absensi')) ||
            (tab.key === 'payroll' &&
              (activeTab === 'slip-gaji' || activeTab === 'riwayat-pembayaran'));

          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-gray-600 hover:text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===================== TAB 1: DASHBOARD ===================== */}
      {(activeTab === 'dashboard' || !activeTab) && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Staf Aktif</p>
                <h3 className="text-2xl font-black text-gray-900 mt-0.5">{hrMetrics.totalStaff}</h3>
                <p className="text-[11px] text-emerald-600 mt-0.5">Semua greenhouse & divisi</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-800 rounded-2xl">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Hadir Hari Ini</p>
                <h3 className="text-2xl font-black text-gray-900 mt-0.5">
                  {hrMetrics.presentToday}{' '}
                  <span className="text-xs font-normal text-gray-400">/ {hrMetrics.totalStaff}</span>
                </h3>
                <p className="text-[11px] text-blue-600 mt-0.5">
                  {hrMetrics.lateToday > 0 ? `${hrMetrics.lateToday} orang terlambat` : 'Semua tepat waktu'}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Izin / Sakit / Cuti</p>
                <h3 className="text-2xl font-black text-gray-900 mt-0.5">{hrMetrics.leaveToday}</h3>
                <p className="text-[11px] text-amber-600 mt-0.5">
                  {hrMetrics.absentToday} belum absen masuk
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-teal-100 text-teal-800 rounded-2xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Estimasi Payroll Bln Ini</p>
                <h3 className="text-xl font-black text-teal-800 mt-0.5">
                  {formatCurrency(hrMetrics.totalPayrollAmount)}
                </h3>
                <p className="text-[11px] text-teal-600 mt-0.5">
                  Terbayar: {formatCurrency(hrMetrics.paidPayrollAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Schedule & Staff Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Shifts for today */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" /> Jadwal Shift Hari Ini
                </h3>
                <button
                  onClick={() => setTab('jadwal-shift')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                >
                  Kelola Shift <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {(db.workShifts || []).map((shift) => (
                  <div
                    key={shift.id}
                    className="p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-emerald-50/50 transition flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-800">{shift.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Jam: {shift.startTime} - {shift.endTime} • Istirahat: {shift.breakMinutes} mnt
                      </p>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                      Toleransi {shift.lateToleranceMinutes}m
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Face Attendance Log */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-emerald-600" /> Presensi Hari Ini (
                    {new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' })})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Status kehadiran real-time staf di lapangan greenhouse
                  </p>
                </div>
                <button
                  onClick={() => setTab('absensi')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                >
                  Lihat Rekap Lengkap <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Karyawan</th>
                      <th className="py-2.5 px-3">Penugasan</th>
                      <th className="py-2.5 px-3">Clock In</th>
                      <th className="py-2.5 px-3">Clock Out</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(db.employees || [])
                      .filter((e) => e.isActive && !e.isDeleted)
                      .slice(0, 5)
                      .map((emp) => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const att = (db.attendances || []).find(
                          (a) => a.employeeId === emp.id && a.date === todayStr
                        );
                        return (
                          <tr key={emp.id} className="hover:bg-gray-50/80">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={
                                    emp.avatarUrl ||
                                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'
                                  }
                                  alt={emp.name}
                                  className="w-7 h-7 rounded-full object-cover"
                                />
                                <div>
                                  <p className="font-bold text-gray-900">{emp.name}</p>
                                  <p className="text-[10px] text-gray-500">{emp.nikInternal}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-gray-700">
                              {emp.greenhouse} • {emp.workArea}
                            </td>
                            <td className="py-3 px-3 font-mono font-medium">
                              {att?.clockIn ? (
                                <span className="text-emerald-700">{att.clockIn} WIB</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono font-medium">
                              {att?.clockOut ? (
                                <span className="text-blue-700">{att.clockOut} WIB</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  att?.status === 'Hadir'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : att?.status === 'Terlambat'
                                    ? 'bg-amber-100 text-amber-800'
                                    : att?.status === 'Izin' || att?.status === 'Sakit'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {att?.status || 'Belum Absen'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {!att?.clockIn ? (
                                <button
                                  onClick={() => recordClockIn(emp.id, emp.greenhouse)}
                                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-semibold transition"
                                >
                                  Masuk
                                </button>
                              ) : !att?.clockOut ? (
                                <button
                                  onClick={() => recordClockOut(emp.id)}
                                  className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-[11px] font-semibold transition"
                                >
                                  Pulang
                                </button>
                              ) : (
                                <span className="text-[11px] text-gray-400">Selesai</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: DATA KARYAWAN ===================== */}
      {activeTab === 'karyawan' && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, NIK, jabatan..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-emerald-500 outline-none"
                />
              </div>

              <select
                value={staffFilterGreenhouse}
                onChange={(e) => setStaffFilterGreenhouse(e.target.value)}
                className="text-xs px-3 py-2 border border-gray-200 rounded-xl focus:border-emerald-500 outline-none"
              >
                <option value="ALL">Semua Greenhouse</option>
                {db.tunnels.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => {
                  setEmployeeToEdit(null);
                  setIsRegisterOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" /> Registrasi Staf Baru
              </button>
            </div>
          </div>

          {/* Employee Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          emp.avatarUrl ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                        }
                        alt={emp.name}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-100 shadow-sm"
                      />
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm leading-tight">{emp.name}</h4>
                        <p className="text-xs text-emerald-700 font-medium">{emp.position}</p>
                        <span className="text-[10px] font-mono text-gray-500 block">{emp.nikInternal}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        emp.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {emp.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Greenhouse:</span>
                      <span className="font-medium text-gray-800">{emp.greenhouse}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Divisi & Area:</span>
                      <span className="font-medium text-gray-800">
                        {emp.division} ({emp.workArea})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tipe Upah:</span>
                      <span className="font-semibold text-emerald-700">
                        {emp.salaryType} (
                        {emp.salaryType === 'Bulanan'
                          ? formatCurrency(emp.baseSalary)
                          : emp.salaryType === 'Harian'
                          ? formatCurrency(emp.dailyRate) + '/hari'
                          : formatCurrency(emp.hourlyRate) + '/jam'}
                        )
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rekening Bank:</span>
                      <span className="font-medium text-gray-700">
                        {emp.bankName} {emp.bankAccount || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-gray-400">Masuk: {formatDate(emp.joinDate)}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEmployeeToEdit(emp);
                        setIsRegisterOpen(true);
                      }}
                      className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                      title="Edit Data Karyawan"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Yakin ingin menghapus ${emp.name} dari sistem?`)) {
                          deleteEmployee(emp.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Hapus Karyawan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== TAB 3: ABSENSI & PRESENSI ===================== */}
      {(activeTab === 'absensi' ||
        activeTab === 'input-absensi' ||
        activeTab === 'rekap-absensi') && (
        <div className="space-y-6">
          {/* Attendance Controls */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-emerald-600" /> Tanggal Presensi:
              </label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded-xl focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFaceCheckInOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Camera className="w-4 h-4" /> Presensi Face Biometrik
              </button>
              <button
                onClick={() => {
                  const emp = (db.employees || [])[0];
                  setManualAttData({
                    employeeId: emp?.id || '',
                    date: attendanceDate,
                    clockIn: '07:00',
                    clockOut: '15:00',
                    status: 'Hadir',
                    note: '',
                  });
                  setIsManualAttendanceOpen(true);
                }}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Input Manual Presensi
              </button>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                  <tr>
                    <th className="py-3 px-4">Nama Karyawan</th>
                    <th className="py-3 px-4">Greenhouse & Shift</th>
                    <th className="py-3 px-4">Clock In</th>
                    <th className="py-3 px-4">Clock Out</th>
                    <th className="py-3 px-4">Terlambat</th>
                    <th className="py-3 px-4">Total Jam</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedDateAttendances.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400">
                        Belum ada data presensi tercatat untuk tanggal {formatDate(attendanceDate)}.
                      </td>
                    </tr>
                  ) : (
                    selectedDateAttendances.map((att) => (
                      <tr key={att.id} className="hover:bg-gray-50/80">
                        <td className="py-3 px-4 font-bold text-gray-900">{att.employeeName}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {att.greenhouse} • {att.shiftName}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-700 font-medium">
                          {att.clockIn ? `${att.clockIn} WIB` : '-'}
                        </td>
                        <td className="py-3 px-4 font-mono text-blue-700 font-medium">
                          {att.clockOut ? `${att.clockOut} WIB` : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {att.lateMinutes > 0 ? (
                            <span className="text-amber-700 font-semibold">
                              {att.lateMinutes} menit
                            </span>
                          ) : (
                            <span className="text-gray-400">Tepat Waktu</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium">{att.workHours} Jam</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              att.status === 'Hadir'
                                ? 'bg-emerald-100 text-emerald-800'
                                : att.status === 'Terlambat'
                                ? 'bg-amber-100 text-amber-800'
                                : att.status === 'Izin' || att.status === 'Sakit'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {att.method === 'clock_in_out' ? 'Face / Kamera' : 'Admin Manual'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!att.clockOut && (
                            <button
                              onClick={() => recordClockOut(att.employeeId)}
                              className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-[11px] font-semibold"
                            >
                              Clock-Out
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 4: JADWAL & SHIFT ===================== */}
      {activeTab === 'jadwal-shift' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Konfigurasi Shift Kerja Melon Premium
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Pengaturan jam kerja operasional kebun untuk perhitungan keterlambatan dan jam kerja.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(db.workShifts || []).map((shift) => (
                <div
                  key={shift.id}
                  className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/20 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-gray-900 text-sm">{shift.name}</h4>
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg">
                        {shift.startTime} - {shift.endTime}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Toleransi keterlambatan: {shift.lateToleranceMinutes} menit | Waktu Istirahat:{' '}
                      {shift.breakMinutes} menit
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {shift.workDays.map((day) => (
                        <span
                          key={day}
                          className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-[10px] text-gray-700 font-medium"
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 5: LEMBUR KERJA ===================== */}
      {activeTab === 'lembur' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Pengajuan & Persetujuan Lembur</h3>
              <p className="text-xs text-gray-500">
                Pekerjaan lembur dihitung otomatis ke dalam payroll bulanan
              </p>
            </div>
            <button
              onClick={() => {
                const first = (db.employees || [])[0];
                setOvertimeFormData({
                  employeeId: first?.id || '',
                  date: new Date().toISOString().split('T')[0],
                  startTime: '16:00',
                  endTime: '19:00',
                  taskDescription: 'Pemangkasan tunas air & kontrol nutrisi DFT',
                  greenhouse: 'Greenhouse 1',
                });
                setIsOvertimeModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Ajukan Lembur
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Karyawan</th>
                  <th className="py-3 px-4">Tanggal & Jam</th>
                  <th className="py-3 px-4">Tugas Lembur</th>
                  <th className="py-3 px-4">Durasi & Tarif</th>
                  <th className="py-3 px-4">Total Upah Lembur</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(db.overtimeRequests || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Belum ada permohonan lembur.
                    </td>
                  </tr>
                ) : (
                  (db.overtimeRequests || []).map((ot) => (
                    <tr key={ot.id} className="hover:bg-gray-50/80">
                      <td className="py-3 px-4 font-bold text-gray-900">{ot.employeeName}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(ot.date)} ({ot.startTime} - {ot.endTime})
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-gray-700">
                        {ot.taskDescription}
                      </td>
                      <td className="py-3 px-4">
                        {ot.durationHours} Jam @ {formatCurrency(ot.overtimeRate)}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-800">
                        {formatCurrency(ot.totalAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            ot.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ot.status === 'Rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ot.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {ot.status === 'Pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => approveOvertime(ot.id)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-semibold"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => rejectOvertime(ot.id)}
                              className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-semibold"
                            >
                              Tolak
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 6: IZIN / CUTI ===================== */}
      {activeTab === 'izin-cuti' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Permohonan Izin / Sakit / Cuti</h3>
              <p className="text-xs text-gray-500">
                Pencatatan ketidakhadiran staf dengan verifikasi persetujuan
              </p>
            </div>
            <button
              onClick={() => {
                const first = (db.employees || [])[0];
                setLeaveFormData({
                  employeeId: first?.id || '',
                  type: 'Izin',
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0],
                  durationDays: 1,
                  reason: '',
                });
                setIsLeaveModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Ajukan Izin / Cuti
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Karyawan</th>
                  <th className="py-3 px-4">Tipe</th>
                  <th className="py-3 px-4">Rentang Tanggal</th>
                  <th className="py-3 px-4">Durasi</th>
                  <th className="py-3 px-4">Alasan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(db.leaveRequests || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Belum ada permohonan izin atau cuti.
                    </td>
                  </tr>
                ) : (
                  (db.leaveRequests || []).map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50/80">
                      <td className="py-3 px-4 font-bold text-gray-900">{req.employeeName}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {req.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(req.startDate)} - {formatDate(req.endDate)}
                      </td>
                      <td className="py-3 px-4 font-medium">{req.durationDays} Hari</td>
                      <td className="py-3 px-4 max-w-xs truncate text-gray-700">{req.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === 'Disetujui'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'Ditolak'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {req.status === 'Pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => approveLeave(req.id)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-semibold"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => rejectLeave(req.id)}
                              className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[10px] font-semibold"
                            >
                              Tolak
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 7: PAYROLL & SLIP GAJI ===================== */}
      {(activeTab === 'payroll' ||
        activeTab === 'slip-gaji' ||
        activeTab === 'riwayat-pembayaran') && (
        <div className="space-y-6">
          {/* Payroll Generator Bar */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Periode Bulan & Tahun:
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="text-xs font-semibold px-3 py-2 border border-gray-300 rounded-xl focus:border-emerald-500 outline-none"
                  >
                    {[
                      'Januari',
                      'Februari',
                      'Maret',
                      'April',
                      'Mei',
                      'Juni',
                      'Juli',
                      'Agustus',
                      'September',
                      'Oktober',
                      'November',
                      'Desember',
                    ].map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="text-xs font-semibold px-3 py-2 border border-gray-300 rounded-xl focus:border-emerald-500 outline-none"
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunPayrollCalculation}
                disabled={isCalculatingPayroll}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 flex items-center gap-2 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" /> Hitung Gaji Otomatis Periode Ini
              </button>
            </div>
          </div>

          {/* Payroll List */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                Daftar Payroll Karyawan (
                {(db.payrolls || []).filter(
                  (p) => p.periodMonth === selectedMonth && p.periodYear === selectedYear
                ).length}{' '}
                Karyawan)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                  <tr>
                    <th className="py-3 px-4">Karyawan & Jabatan</th>
                    <th className="py-3 px-4">Kehadiran</th>
                    <th className="py-3 px-4">Gaji Pokok / Upah</th>
                    <th className="py-3 px-4">Tunjangan & Lembur</th>
                    <th className="py-3 px-4">Bonus Panen</th>
                    <th className="py-3 px-4">Total Potongan</th>
                    <th className="py-3 px-4 font-bold text-emerald-900">Gaji Bersih (THP)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(db.payrolls || []).filter(
                    (p) => p.periodMonth === selectedMonth && p.periodYear === selectedYear
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-gray-400">
                        Belum ada kalkulasi payroll untuk periode bulan ini. Klik tombol "Hitung Gaji
                        Otomatis" di atas.
                      </td>
                    </tr>
                  ) : (
                    (db.payrolls || [])
                      .filter(
                        (p) => p.periodMonth === selectedMonth && p.periodYear === selectedYear
                      )
                      .map((pay) => (
                        <tr key={pay.id} className="hover:bg-gray-50/80">
                          <td className="py-3 px-4">
                            <p className="font-bold text-gray-900">{pay.employeeName}</p>
                            <p className="text-[10px] text-gray-500">
                              {pay.position} • {pay.greenhouse}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {pay.daysPresent} Hari ({pay.daysLate} Terlambat)
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {formatCurrency(pay.baseSalary || pay.dailyWages || 0)}
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            +{formatCurrency(pay.overtimePay + pay.allowanceMeal + pay.allowanceTransport)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-emerald-700">
                            {pay.bonusHarvest > 0 ? formatCurrency(pay.bonusHarvest) : '-'}
                          </td>
                          <td className="py-3 px-4 text-red-600 font-medium">
                            -{formatCurrency(pay.totalDeductions)}
                          </td>
                          <td className="py-3 px-4 font-black text-emerald-800 text-sm">
                            {formatCurrency(pay.netSalary)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                pay.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {pay.status === 'Paid' ? 'Lunas / Terbayar' : 'Draft / Disetujui'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedSlipRecord(pay)}
                                className="px-2.5 py-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-2xs"
                              >
                                <FileText className="w-3.5 h-3.5 text-emerald-600" /> Slip Gaji
                              </button>

                              {pay.status !== 'Paid' && (
                                <button
                                  onClick={() => handlePayPayroll(pay)}
                                  className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-[11px] font-bold shadow-xs transition"
                                >
                                  Bayar Gaji
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 8: PENGATURAN PAYROLL ===================== */}
      {activeTab === 'pengaturan-payroll' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs max-w-2xl">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Parameter & Aturan Penggajian Kebun
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Konfigurasi potongan keterlambatan, absensi tanpa kabar, bonus panen, dan integrasi
              biaya tenaga kerja ke HPP melon.
            </p>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">Denda Keterlambatan</p>
                    <p className="text-gray-500 text-[11px]">
                      Potongan upah jika hadir melebihi toleransi shift
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={db.payrollSettings?.lateDeductionEnabled ?? true}
                    onChange={(e) =>
                      updatePayrollSettings({ lateDeductionEnabled: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                </div>
                {db.payrollSettings?.lateDeductionEnabled && (
                  <div className="pt-2">
                    <label className="block text-gray-600 mb-1">Tarif Denda per Menit (Rp)</label>
                    <input
                      type="number"
                      value={db.payrollSettings?.lateDeductionRatePerMinute || 1000}
                      onChange={(e) =>
                        updatePayrollSettings({
                          lateDeductionRatePerMinute: Number(e.target.value),
                        })
                      }
                      className="w-48 px-3 py-1.5 border border-gray-300 rounded-lg outline-none font-semibold text-emerald-800"
                    />
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">Denda Alpha / Tidak Masuk Tanpa Izin</p>
                    <p className="text-gray-500 text-[11px]">
                      Potongan upah jika tidak hadir tanpa pengajuan izin/sakit
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={db.payrollSettings?.alphaDeductionEnabled ?? true}
                    onChange={(e) =>
                      updatePayrollSettings({ alphaDeductionEnabled: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                </div>
                {db.payrollSettings?.alphaDeductionEnabled && (
                  <div className="pt-2">
                    <label className="block text-gray-600 mb-1">Potongan per Hari Alpha (Rp)</label>
                    <input
                      type="number"
                      value={db.payrollSettings?.alphaDeductionRatePerDay || 120000}
                      onChange={(e) =>
                        updatePayrollSettings({
                          alphaDeductionRatePerDay: Number(e.target.value),
                        })
                      }
                      className="w-48 px-3 py-1.5 border border-gray-300 rounded-lg outline-none font-semibold text-emerald-800"
                    />
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">Integrasi Tenaga Kerja ke HPP Panen</p>
                    <p className="text-gray-500 text-[11px]">
                      Biaya gaji tenaga kerja akan langsung diperhitungkan dalam biaya pokok produksi (HPP) per kg melon
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={db.payrollSettings?.includeLaborInHpp ?? true}
                    onChange={(e) =>
                      updatePayrollSettings({ includeLaborInHpp: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <RegisterStaffModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        employeeToEdit={employeeToEdit}
      />

      <LiveFaceCheckInModal
        isOpen={isFaceCheckInOpen}
        onClose={() => setIsFaceCheckInOpen(false)}
      />

      <PayrollSlipModal
        isOpen={!!selectedSlipRecord}
        onClose={() => setSelectedSlipRecord(null)}
        record={selectedSlipRecord}
      />

      {/* Manual Attendance Modal */}
      {isManualAttendanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">Input Manual Presensi Karyawan</h3>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Pilih Karyawan</label>
              <select
                value={manualAttData.employeeId}
                onChange={(e) => setManualAttData({ ...manualAttData, employeeId: e.target.value })}
                className="w-full text-xs p-2 border border-gray-300 rounded-xl"
              >
                {(db.employees || []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.position})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Clock-In</label>
                <input
                  type="time"
                  value={manualAttData.clockIn}
                  onChange={(e) => setManualAttData({ ...manualAttData, clockIn: e.target.value })}
                  className="w-full text-xs p-2 border border-gray-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Clock-Out</label>
                <input
                  type="time"
                  value={manualAttData.clockOut}
                  onChange={(e) => setManualAttData({ ...manualAttData, clockOut: e.target.value })}
                  className="w-full text-xs p-2 border border-gray-300 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Status Kehadiran</label>
              <select
                value={manualAttData.status}
                onChange={(e) =>
                  setManualAttData({ ...manualAttData, status: e.target.value as any })
                }
                className="w-full text-xs p-2 border border-gray-300 rounded-xl"
              >
                <option value="Hadir">Hadir</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
                <option value="Cuti">Cuti</option>
                <option value="Alpha">Alpha</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsManualAttendanceOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const emp = (db.employees || []).find((e) => e.id === manualAttData.employeeId);
                  if (!emp) return;
                  await addAttendanceRecord({
                    employeeId: emp.id,
                    employeeName: emp.name,
                    date: manualAttData.date,
                    greenhouse: emp.greenhouse,
                    shiftName: 'Shift Standar',
                    clockIn: manualAttData.clockIn,
                    clockOut: manualAttData.clockOut,
                    status: manualAttData.status,
                    lateMinutes: manualAttData.status === 'Terlambat' ? 20 : 0,
                    workHours: 8,
                    overtimeHours: 0,
                    method: 'manual_admin',
                  });
                  addToast(`Presensi manual untuk ${emp.name} berhasil disimpan`, 'success');
                  setIsManualAttendanceOpen(false);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
              >
                Simpan Presensi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">Pengajuan Izin / Sakit / Cuti</h3>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Karyawan</label>
              <select
                value={leaveFormData.employeeId}
                onChange={(e) =>
                  setLeaveFormData({ ...leaveFormData, employeeId: e.target.value })
                }
                className="w-full text-xs p-2 border border-gray-300 rounded-xl"
              >
                {(db.employees || []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.position})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Jenis Ketidakhadiran</label>
                <select
                  value={leaveFormData.type}
                  onChange={(e) =>
                    setLeaveFormData({ ...leaveFormData, type: e.target.value as any })
                  }
                  className="w-full text-xs p-2 border border-gray-300 rounded-xl"
                >
                  <option value="Izin">Izin Keperluan</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Cuti">Cuti Tahunan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Durasi (Hari)</label>
                <input
                  type="number"
                  min="1"
                  value={leaveFormData.durationDays}
                  onChange={(e) =>
                    setLeaveFormData({ ...leaveFormData, durationDays: Number(e.target.value) })
                  }
                  className="w-full text-xs p-2 border border-gray-300 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Alasan</label>
              <textarea
                value={leaveFormData.reason}
                onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                rows={3}
                placeholder="Tuliskan keterangan..."
                className="w-full text-xs p-2 border border-gray-300 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const emp = (db.employees || []).find((e) => e.id === leaveFormData.employeeId);
                  if (!emp) return;
                  await requestLeave({
                    employeeId: emp.id,
                    employeeName: emp.name,
                    type: leaveFormData.type,
                    startDate: leaveFormData.startDate,
                    endDate: leaveFormData.endDate,
                    durationDays: leaveFormData.durationDays,
                    reason: leaveFormData.reason || 'Izin keperluan pribadi',
                    status: 'Pending',
                  });
                  addToast(`Pengajuan izin untuk ${emp.name} berhasil dibuat`, 'success');
                  setIsLeaveModalOpen(false);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
              >
                Kirim Pengajuan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overtime Modal */}
      {isOvertimeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">Formulir Pengajuan Lembur</h3>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Karyawan</label>
              <select
                value={overtimeFormData.employeeId}
                onChange={(e) =>
                  setOvertimeFormData({ ...overtimeFormData, employeeId: e.target.value })
                }
                className="w-full text-xs p-2 border border-gray-300 rounded-xl"
              >
                {(db.employees || []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.position})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Jam Mulai</label>
                <input
                  type="time"
                  value={overtimeFormData.startTime}
                  onChange={(e) =>
                    setOvertimeFormData({ ...overtimeFormData, startTime: e.target.value })
                  }
                  className="w-full text-xs p-2 border border-gray-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Jam Selesai</label>
                <input
                  type="time"
                  value={overtimeFormData.endTime}
                  onChange={(e) =>
                    setOvertimeFormData({ ...overtimeFormData, endTime: e.target.value })
                  }
                  className="w-full text-xs p-2 border border-gray-300 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Uraian Tugas Lembur</label>
              <textarea
                value={overtimeFormData.taskDescription}
                onChange={(e) =>
                  setOvertimeFormData({ ...overtimeFormData, taskDescription: e.target.value })
                }
                rows={2}
                className="w-full text-xs p-2 border border-gray-300 rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOvertimeModalOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const emp = (db.employees || []).find((e) => e.id === overtimeFormData.employeeId);
                  if (!emp) return;
                  const rate = emp.overtimeRate || 25000;
                  const dur = 3;
                  await requestOvertime({
                    employeeId: emp.id,
                    employeeName: emp.name,
                    date: overtimeFormData.date,
                    startTime: overtimeFormData.startTime,
                    endTime: overtimeFormData.endTime,
                    durationHours: dur,
                    overtimeRate: rate,
                    totalAmount: dur * rate,
                    taskDescription: overtimeFormData.taskDescription,
                    greenhouse: overtimeFormData.greenhouse,
                    status: 'Pending',
                  });
                  addToast(`Pengajuan lembur untuk ${emp.name} berhasil dibuat`, 'success');
                  setIsOvertimeModalOpen(false);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
              >
                Ajukan Lembur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
