export type TransactionType = 'pemasukan' | 'pengeluaran';
export type ExpenseGroup = 'operasional' | 'investasi' | 'pembayaran-hutang';

export interface Tunnel {
  id: string; // e.g. 'T1', 'T2', 'TUNNEL-xxx'
  name: string; // e.g. 'Tunnel 1', 'Tunnel 2'
  lengthM: number; // Panjang (meter) e.g. 48
  widthM: number; // Lebar (meter) e.g. 8
  capacityPlants: number; // Kapasitas tanaman e.g. 1000
  systemType: string; // e.g. 'DFT Hydroponic', 'NFT', 'Dutch Bucket'
  structureMaterial?: string; // e.g. 'Bambu Petung', 'Baja Ringan'
  status: 'Aktif' | 'Perawatan' | 'Nonaktif';
  notes?: string;
  createdAt?: string;
}

export type TunnelType = string;
export type PaymentMethod = 'Transfer Bank' | 'Tunai / Cash' | 'QRIS' | 'Hutang / Piutang';

export type CycleStatus =
  | 'Persiapan'
  | 'Tanam'
  | 'Vegetatif'
  | 'Generatif'
  | 'Menjelang panen'
  | 'Panen'
  | 'Selesai';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  expenseGroup?: ExpenseGroup; // required if type === 'pengeluaran'
  category: string;
  subcategory?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  cycleId?: string;
  tunnel: TunnelType;
  note?: string;
  receiptUrl?: string; // base64 or photo URL
  createdAt: string;
}

export interface CropCycle {
  id: string; // e.g. S001
  name: string;
  melonVariety: string;
  tunnel: TunnelType;
  startDate: string;
  plantingDate: string;
  harvestTargetDate: string;
  actualHarvestDate?: string;
  plantCount: number;
  livePlants: number;
  deadPlants: number;
  status: CycleStatus;
  notes?: string;
}

export interface HarvestRecord {
  id: string;
  date: string;
  cycleId: string;
  tunnel: TunnelType;
  totalWeightKg: number;
  gradeAKg: number;
  gradeBKg: number;
  gradeCKg: number;
  pricePerKg: number;
  totalRevenue: number; // totalWeightKg * pricePerKg
  buyer: string;
  paymentStatus: 'Lunas' | 'Belum lunas' | 'Sebagian';
  notes?: string;
}

export type InvestmentCategory =
  | 'Pembangunan'
  | 'Instalasi'
  | 'Instalasi DFT'
  | 'Listrik & Air'
  | 'Peralatan';

export interface Investment {
  id: string;
  date: string;
  category: InvestmentCategory;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  supplier?: string;
  tunnel: TunnelType;
  notes?: string;
}

export interface Asset {
  id: string;
  name: string;
  category: 'Pembangunan' | 'Instalasi' | 'Listrik & Air' | 'Peralatan' | 'Lainnya';
  purchaseDate: string;
  purchasePrice: number;
  quantity: number;
  condition: 'Sangat Baik' | 'Baik' | 'Perlu Perbaikan' | 'Rusak';
  economicLifeYears: number;
  location: string;
  notes?: string;
  /** ID investasi asal (jika aset dibuat dari modul Investasi) */
  investmentId?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category:
    | 'Benih'
    | 'AB Mix'
    | 'Nutrisi Tambahan'
    | 'Pestisida'
    | 'Fungisida'
    | 'Insektisida'
    | 'Media Tanam'
    | 'Plastik & Net'
    | 'Kemasan & Packing'
    | 'Perlengkapan Lain';
  unit: string;
  initialStock: number;
  incomingStock: number;
  outgoingStock: number;
  currentStock: number;
  minStock: number;
  avgPrice: number;
  lastUpdated: string;
}

export interface StockMutation {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  type: 'Masuk' | 'Keluar';
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalCost?: number;
  cycleId?: string;
  note?: string;
}

export interface DebtReceivable {
  id: string;
  type: 'hutang' | 'piutang';
  counterparty: string; // Supplier / Pelanggan
  date: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'Belum lunas' | 'Sebagian' | 'Lunas';
  description?: string;
  relatedTransactionId?: string;
  /** Hutang/pinjaman yang uangnya diterima masuk ke kas (menambah saldo) */
  receivedToCash?: boolean;
  /** ID transaksi kas penerimaan pinjaman */
  receivedTransactionId?: string;
}

export interface FinancialMetrics {
  totalPemasukan: number;
  totalOperasional: number;
  totalInvestasi: number;
  totalPengeluaran: number;
  saldoKas: number;
  labaBersih: number;
  modalKembali: number;
  modalBelumKembali: number;
  roiPercent: number;
  hppPerKg: number;
  biayaPerTanaman: number;
  totalPanenKg: number;
}

export type UserRole = 'Owner / Super Admin' | 'Manajer Operasional' | 'Operator Kebun';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  avatarUrl: string;
  password?: string;
  phone?: string;
  status: 'Aktif' | 'Nonaktif';
  faceMatchScore?: number;
  createdAt: string;
  lastLogin?: string;
  loginMethod?: 'password' | 'face_id';
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  loginMethod: 'password' | 'face_id';
  lastLogin: string;
}

export interface GreenhouseDatabase {
  tunnels: Tunnel[];
  transactions: Transaction[];
  cycles: CropCycle[];
  harvests: HarvestRecord[];
  investments: Investment[];
  assets: Asset[];
  inventory: InventoryItem[];
  stockMutations: StockMutation[];
  debts: DebtReceivable[];
  lastSynced?: string;
  sheetsWebhookUrl?: string;
  lastSheetsSync?: string;
  // HR & Payroll Module
  employees?: Employee[];
  workShifts?: WorkShift[];
  attendances?: AttendanceRecord[];
  leaveRequests?: LeaveRequest[];
  overtimeRequests?: OvertimeRequest[];
  payrolls?: PayrollRecord[];
  payrollSettings?: PayrollSettings;
  employeeAuditLogs?: HRAuditLog[];
}

// ======================== HR & PAYROLL TYPES ========================
export type EmploymentStatus = 'Tetap' | 'Kontrak' | 'Harian' | 'Freelance';
export type SalaryPaymentType = 'Bulanan' | 'Harian' | 'Per Jam';
export type WorkArea = 'Konstruksi' | 'Budidaya' | 'Panen' | 'Security';

export interface Employee {
  id: string; // e.g. EMP-001
  nikInternal: string; // e.g. NIK-GH-2026-001
  name: string;
  avatarUrl?: string;
  gender: 'Laki-laki' | 'Perempuan';
  phone: string;
  address: string;
  position: string; // e.g. 'Kepala Kebun', 'Operator Nutrisi DFT', 'Teknisi Pompa'
  division: string; // e.g. 'Operasional Kebun', 'Perbaikan', 'QC & Logistik Panen', 'Administrasi & Finance'
  greenhouse: string; // e.g. 'Tunnel 1', 'Tunnel 2', 'Semua / Gabungan Greenhouse'
  workArea: WorkArea;
  joinDate: string; // YYYY-MM-DD
  employmentStatus: EmploymentStatus;
  salaryType: SalaryPaymentType;
  baseSalary: number; // For Bulanan
  dailyRate: number; // For Harian
  hourlyRate: number; // For Per Jam
  overtimeRate: number; // Rate per hour for overtime
  bankAccount: string;
  bankName: string;
  defaultShiftId?: string;
  isActive: boolean;
  isDeleted?: boolean; // Soft delete support
  createdAt: string;
}

export interface WorkShift {
  id: string; // e.g. SHIFT-01
  name: string; // e.g. 'Shift Pagi (07:00 - 15:00)'
  startTime: string; // '07:00'
  endTime: string; // '15:00'
  breakMinutes: number; // 60
  lateToleranceMinutes: number; // 15
  workDays: string[]; // ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
}

export type AttendanceStatus =
  | 'Hadir'
  | 'Setengah Hari'
  | 'Terlambat'
  | 'Izin'
  | 'Sakit'
  | 'Cuti'
  | 'Alpha'
  | 'Libur';

export interface AttendanceRecord {
  id: string; // ATT-xxx
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  greenhouse: string;
  shiftId?: string;
  shiftName: string;
  clockIn?: string; // HH:mm
  clockOut?: string; // HH:mm
  status: AttendanceStatus;
  lateMinutes: number;
  workHours: number;
  overtimeHours: number;
  note?: string;
  method: 'clock_in_out' | 'manual_admin';
  createdAt: string;
  updatedAt?: string;
  /** Fase konstruksi: menandai absensi ini sudah dibayar upahnya */
  wagePaid?: boolean;
}

export type LeaveType = 'Izin' | 'Sakit' | 'Cuti';
export type ApprovalStatus = 'Pending' | 'Disetujui' | 'Ditolak';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  durationDays: number;
  reason: string;
  attachmentUrl?: string;
  status: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface OvertimeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationHours: number;
  overtimeRate: number;
  totalAmount: number;
  taskDescription: string;
  greenhouse: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export type PayrollStatus = 'Draft' | 'Menunggu Approval' | 'Approved' | 'Paid';

export interface PayrollRecord {
  id: string; // PAY-2026-09-EMP001
  periodMonth: number; // 1-12
  periodYear: number; // e.g. 2026
  periodLabel: string; // 'September 2026'
  employeeId: string;
  employeeName: string;
  employeeNik: string;
  position: string;
  greenhouse: string;
  salaryType: SalaryPaymentType;
  // Attendance metrics
  daysPresent: number;
  daysLate: number;
  daysLeave: number;
  daysSick: number;
  daysCuti: number;
  daysAlpha: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
  // Income components
  baseSalary: number;
  dailyWages: number;
  hourlyWages: number;
  overtimePay: number;
  allowanceMeal: number;
  allowanceTransport: number;
  bonusHarvest: number; // Special melon harvest bonus
  bonusProduction: number;
  otherBonus: number;
  // Deductions
  deductionLate: number;
  deductionAlpha: number;
  deductionKasbon: number;
  deductionBpjs: number;
  deductionOther: number;
  // Net
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  // Status and transaction linking
  status: PayrollStatus;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  paymentMethod?: 'Cash' | 'Transfer Bank' | 'E-Wallet' | 'Lainnya';
  paymentReference?: string;
  financeTransactionId?: string; // Foreign key linking to Finance Transaction!
  paymentNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PayrollSettings {
  lateDeductionEnabled: boolean;
  lateDeductionRatePerMinute: number; // e.g. 1000
  alphaDeductionEnabled: boolean;
  alphaDeductionRatePerDay: number; // e.g. 120000
  defaultMealAllowance: number; // e.g. 200000
  defaultTransportAllowance: number; // e.g. 150000
  includeLaborInHpp: boolean; // ON / OFF labour cost into melon HPP
  harvestBonusPerKg: number; // Rp / kg bonus panen
}

export interface HRAuditLog {
  id: string;
  timestamp: string;
  action: string;
  adminName: string;
  employeeName?: string;
  previousData?: any;
  updatedData?: any;
  notes?: string;
}
