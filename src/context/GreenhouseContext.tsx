import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  GreenhouseDatabase,
  Transaction,
  CropCycle,
  HarvestRecord,
  Investment,
  Asset,
  InventoryItem,
  StockMutation,
  DebtReceivable,
  Tunnel,
  AuthUser,
  AppUser,
  Employee,
  WorkShift,
  AttendanceRecord,
  LeaveRequest,
  OvertimeRequest,
  PayrollRecord,
  PayrollSettings,
  HRAuditLog,
  ApprovalStatus,
  AttendanceStatus,
} from '../types';
import { INITIAL_DATABASE, INITIAL_TUNNELS } from '../data/initialData';
import { migrateLegacyGreenhouseNaming } from '../utils/greenhouseSpec';
import { INITIAL_USERS } from '../data/initialUsers';
import {
  getStoredSheetsWebhook,
  saveStoredSheetsWebhook,
  getStoredLastSync,
  saveStoredLastSync,
  syncTransactionToSheets,
  syncAllDataToSheets,
} from '../services/sheetsSyncService';

const LOCAL_STORAGE_KEY = 'greenhouse_finance_db_v1';

// Penanda bila ada perubahan lokal yang belum berhasil diunggah ke server.
// Selama penanda ini ada, data server TIDAK ditarik agar perubahan lokal tidak tertimpa.
const PENDING_UPLOAD_KEY = 'greenhouse_pending_upload_v1';

const markPendingUpload = () => {
  try {
    localStorage.setItem(PENDING_UPLOAD_KEY, '1');
  } catch {
    // abaikan
  }
};

const clearPendingUpload = () => {
  try {
    localStorage.removeItem(PENDING_UPLOAD_KEY);
  } catch {
    // abaikan
  }
};

// Kunci-kunci data usaha yang dipakai untuk menilai apakah sebuah database kosong.
const EMPTY_CHECK_KEYS = [
  'transactions',
  'harvests',
  'cycles',
  'investments',
  'inventory',
  'tunnels',
  'assets',
  'debts',
  'employees',
  'payrolls',
  'stockMutations',
];

const isDatabaseEmpty = (database: any): boolean => {
  if (!database || typeof database !== 'object') return true;
  return EMPTY_CHECK_KEYS.every((key) => {
    const value = database[key];
    return !Array.isArray(value) || value.length === 0;
  });
};
const AUTH_STORAGE_KEY = 'greenhouse_auth_user_v1';
const USERS_STORAGE_KEY = 'greenhouse_registered_users_v1';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

export interface FinancialMetrics {
  saldoKas: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  totalOmzet: number;
  totalBiayaOperasional: number;
  totalInvestasi: number;
  labaBersih: number;
  totalPanenKg: number;
  hppPerKg: number;
  biayaPerTanaman: number;
  nilaiAset: number;
  modalKembali: number;
  modalBelumKembali: number;
  roiPercent: number;
  totalHutang: number;
  totalPiutang: number;
}

interface GreenhouseContextType {
  db: GreenhouseDatabase;
  loading: boolean;
  metrics: FinancialMetrics;
  lowStockItems: InventoryItem[];
  toasts: ToastMessage[];
  addToast: (toast: string | Omit<ToastMessage, 'id'>, type?: 'success' | 'error' | 'info' | 'warning' | string) => void;
  removeToast: (id: string) => void;
  // Tunnels (Greenhouse Units)
  addTunnel: (tunnel: Omit<Tunnel, 'id' | 'createdAt'>) => Promise<boolean>;
  updateTunnel: (id: string, tunnel: Partial<Tunnel>) => Promise<boolean>;
  deleteTunnel: (id: string) => Promise<boolean>;
  // Transactions
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<boolean>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
  // Crop Cycles
  addCycle: (cycle: CropCycle) => Promise<boolean>;
  updateCycle: (id: string, cycle: Partial<CropCycle>) => Promise<boolean>;
  deleteCycle: (id: string) => Promise<boolean>;
  // Harvests
  addHarvest: (harvest: Omit<HarvestRecord, 'id' | 'totalRevenue'>) => Promise<boolean>;
  updateHarvest: (id: string, harvest: Partial<HarvestRecord>) => Promise<boolean>;
  deleteHarvest: (id: string) => Promise<boolean>;
  // Investments
  addInvestment: (inv: Omit<Investment, 'id' | 'totalAmount'>) => Promise<boolean>;
  updateInvestment: (id: string, inv: Partial<Investment>) => Promise<boolean>;
  deleteInvestment: (id: string) => Promise<boolean>;
  // Assets
  addAsset: (asset: Omit<Asset, 'id'>) => Promise<boolean>;
  updateAsset: (id: string, asset: Partial<Asset>) => Promise<boolean>;
  deleteAsset: (id: string) => Promise<boolean>;
  // Inventory
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'currentStock' | 'lastUpdated'>) => Promise<boolean>;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => Promise<boolean>;
  deleteInventoryItem: (id: string) => Promise<boolean>;
  recordStockMutation: (mutation: Omit<StockMutation, 'id'>) => Promise<boolean>;
  // Debts & Receivables
  addDebt: (debt: Omit<DebtReceivable, 'id' | 'remainingAmount' | 'status'>) => Promise<boolean>;
  updateDebt: (id: string, debt: Partial<DebtReceivable>) => Promise<boolean>;
  deleteDebt: (id: string) => Promise<boolean>;
  // HR, Absensi & Payroll Module
  employees: Employee[];
  workShifts: WorkShift[];
  attendances: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  payrolls: PayrollRecord[];
  payrollSettings: PayrollSettings;
  employeeAuditLogs: HRAuditLog[];
  // Employee CRUD
  addEmployee: (emp: Omit<Employee, 'id' | 'createdAt'>) => Promise<boolean>;
  updateEmployee: (id: string, emp: Partial<Employee>) => Promise<boolean>;
  deleteEmployee: (id: string, soft?: boolean) => Promise<boolean>;
  // Shifts
  addWorkShift: (shift: Omit<WorkShift, 'id'>) => Promise<boolean>;
  updateWorkShift: (id: string, shift: Partial<WorkShift>) => Promise<boolean>;
  deleteWorkShift: (id: string) => Promise<boolean>;
  // Attendance & Clock in/out
  clockIn: (employeeId: string, customTime?: string, customDate?: string) => Promise<{ success: boolean; message: string }>;
  clockOut: (employeeId: string, customTime?: string, customDate?: string) => Promise<{ success: boolean; message: string }>;
  recordAttendance: (att: Omit<AttendanceRecord, 'id' | 'createdAt'>) => Promise<boolean>;
  updateAttendance: (id: string, att: Partial<AttendanceRecord>, reason?: string) => Promise<boolean>;
  deleteAttendance: (id: string) => Promise<boolean>;
  // Leaves
  addLeaveRequest: (leave: Omit<LeaveRequest, 'id' | 'createdAt'>) => Promise<boolean>;
  updateLeaveRequestStatus: (id: string, status: ApprovalStatus, reason?: string) => Promise<boolean>;
  approveLeaveRequest: (id: string) => Promise<boolean>;
  rejectLeaveRequest: (id: string, reason?: string) => Promise<boolean>;
  deleteLeaveRequest: (id: string) => Promise<boolean>;
  // Overtime
  addOvertimeRequest: (ot: Omit<OvertimeRequest, 'id' | 'createdAt'>) => Promise<boolean>;
  updateOvertimeRequestStatus: (id: string, status: 'Pending' | 'Approved' | 'Rejected') => Promise<boolean>;
  approveOvertimeRequest: (id: string) => Promise<boolean>;
  rejectOvertimeRequest: (id: string) => Promise<boolean>;
  deleteOvertimeRequest: (id: string) => Promise<boolean>;
  // HR Helper Aliases
  addAttendanceRecord: (att: Omit<AttendanceRecord, 'id' | 'createdAt'>) => Promise<boolean>;
  updateAttendanceRecord: (id: string, att: Partial<AttendanceRecord>, reason?: string) => Promise<boolean>;
  recordClockIn: (employeeId: string, location?: string) => Promise<boolean>;
  recordClockOut: (employeeId: string) => Promise<boolean>;
  requestLeave: (leave: Omit<LeaveRequest, 'id' | 'createdAt'>) => Promise<boolean>;
  approveLeave: (id: string) => Promise<boolean>;
  rejectLeave: (id: string, reason?: string) => Promise<boolean>;
  requestOvertime: (ot: Omit<OvertimeRequest, 'id' | 'createdAt'>) => Promise<boolean>;
  approveOvertime: (id: string) => Promise<boolean>;
  rejectOvertime: (id: string) => Promise<boolean>;
  // Payroll
  generateMonthlyPayroll: (month: number, year: number, greenhouse?: string) => Promise<boolean>;
  calculateMonthlyPayroll: (month: number, year: number, greenhouse?: string) => Promise<boolean>;
  updatePayrollRecord: (id: string, updates: Partial<PayrollRecord>) => Promise<boolean>;
  approvePayroll: (id: string) => Promise<boolean>;
  approvePayrollRecord: (id: string) => Promise<boolean>;
  payPayroll: (id: string, paymentData: {
    paymentMethod: 'Cash' | 'Transfer Bank' | 'E-Wallet' | 'Lainnya';
    paymentReference?: string;
    paymentNotes?: string;
    paymentDate?: string;
  }) => Promise<boolean>;
  deletePayrollRecord: (id: string) => Promise<boolean>;
  addHarvestBonusToPayroll: (employeeId: string, month: number, year: number, bonusAmount: number, notes?: string) => Promise<boolean>;
  // Settings & Logs
  updatePayrollSettings: (settings: Partial<PayrollSettings>) => Promise<boolean>;
  addAuditLog: (log: Omit<HRAuditLog, 'id' | 'timestamp'>) => void;
  // Authentication & User Management
  currentUser: AuthUser | null;
  users: AppUser[];
  login: (user: AuthUser) => void;
  logout: () => void;
  updateCurrentUserProfile: (updatedData: Partial<AppUser>) => Promise<boolean>;
  addUser: (user: Omit<AppUser, 'id' | 'createdAt'>) => Promise<boolean>;
  updateUser: (id: string, user: Partial<AppUser>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  // Data management & Cloud Multi-Device Sync
  resetToDemoData: () => Promise<void>;
  clearAllData: () => Promise<void>;
  importDatabase: (importedDb: GreenhouseDatabase) => Promise<boolean>;
  refreshData: (silent?: boolean) => Promise<boolean>;
  isSyncing: boolean;
  lastSyncTime: string;
  // Google Sheets Auto-Sync
  sheetsWebhookUrl: string;
  lastSheetsSync: string;
  isSheetsSyncing: boolean;
  setSheetsWebhookUrl: (url: string) => void;
  syncAllToGoogleSheets: () => Promise<boolean>;
}

const GreenhouseContext = createContext<GreenhouseContextType | undefined>(undefined);

export const GreenhouseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<GreenhouseDatabase>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = migrateLegacyGreenhouseNaming(JSON.parse(saved)).data;
        if (!parsed.tunnels || !Array.isArray(parsed.tunnels)) {
          parsed.tunnels = INITIAL_TUNNELS;
        }
        if (!parsed.employees) parsed.employees = INITIAL_DATABASE.employees || [];
        if (!parsed.workShifts) parsed.workShifts = INITIAL_DATABASE.workShifts || [];
        if (!parsed.attendances) parsed.attendances = INITIAL_DATABASE.attendances || [];
        if (!parsed.leaveRequests) parsed.leaveRequests = INITIAL_DATABASE.leaveRequests || [];
        if (!parsed.overtimeRequests) parsed.overtimeRequests = INITIAL_DATABASE.overtimeRequests || [];
        if (!parsed.payrolls) parsed.payrolls = INITIAL_DATABASE.payrolls || [];
        if (!parsed.payrollSettings) parsed.payrollSettings = INITIAL_DATABASE.payrollSettings;
        if (!parsed.employeeAuditLogs) parsed.employeeAuditLogs = INITIAL_DATABASE.employeeAuditLogs || [];
        return parsed;
      }
    } catch (e) {
      console.error('Failed reading localStorage', e);
    }
    return INITIAL_DATABASE;
  });

  // Ref yang selalu berisi data terbaru — dipakai saat inisialisasi cloud
  // (Sinkron pertama ketika server masih kosong).
  const dbRef = useRef<GreenhouseDatabase>(db);
  dbRef.current = db;

  const [loading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Google Sheets Auto-Sync State
  const [sheetsWebhookUrl, setSheetsWebhookUrlState] = useState<string>(() => {
    return getStoredSheetsWebhook() || '';
  });
  const [lastSheetsSync, setLastSheetsSyncState] = useState<string>(() => {
    return getStoredLastSync() || '';
  });
  const [isSheetsSyncing, setIsSheetsSyncing] = useState<boolean>(false);

  const setSheetsWebhookUrl = useCallback((url: string) => {
    const trimmed = url.trim();
    setSheetsWebhookUrlState(trimmed);
    saveStoredSheetsWebhook(trimmed);
  }, []);

  // Authentication & Users State
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed reading users from localStorage', e);
    }
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
    } catch {}
    return INITIAL_USERS;
  });

  const saveUsersState = useCallback((newUsers: AppUser[]) => {
    setUsers(newUsers);
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(newUsers));
    } catch (e) {
      console.error('Failed saving users to localStorage', e);
    }
  }, []);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.username) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed reading auth state from localStorage', e);
    }
    return null;
  });

  const login = useCallback((user: AuthUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed saving user to localStorage', e);
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error('Failed removing user from localStorage', e);
    }
  }, []);

  // Update Current User Profile
  const updateCurrentUserProfile = useCallback(
    async (updatedData: Partial<AppUser>): Promise<boolean> => {
      if (!currentUser) return false;
      try {
        const nextUsers = users.map((u) => {
          if (u.id === currentUser.id) {
            return { ...u, ...updatedData };
          }
          return u;
        });
        saveUsersState(nextUsers);

        const updatedAuthUser: AuthUser = {
          ...currentUser,
          name: updatedData.name ?? currentUser.name,
          email: updatedData.email ?? currentUser.email,
          username: updatedData.username ?? currentUser.username,
          avatarUrl: updatedData.avatarUrl ?? currentUser.avatarUrl,
          phone: updatedData.phone ?? currentUser.phone,
          role: updatedData.role ?? currentUser.role,
        };
        setCurrentUser(updatedAuthUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedAuthUser));
        return true;
      } catch (err) {
        console.error('Failed updating profile', err);
        return false;
      }
    },
    [currentUser, users, saveUsersState]
  );

  // Add User
  const addUser = useCallback(
    async (newUser: Omit<AppUser, 'id' | 'createdAt'>): Promise<boolean> => {
      try {
        const id = `usr-${Date.now().toString().slice(-4)}`;
        const userWithMeta: AppUser = {
          ...newUser,
          id,
          createdAt: new Date().toISOString().split('T')[0],
          faceMatchScore: newUser.faceMatchScore || 98.5,
          status: newUser.status || 'Aktif',
        };
        const nextUsers = [...users, userWithMeta];
        saveUsersState(nextUsers);
        return true;
      } catch (err) {
        console.error('Failed adding user', err);
        return false;
      }
    },
    [users, saveUsersState]
  );

  // Update Any User
  const updateUser = useCallback(
    async (id: string, updatedFields: Partial<AppUser>): Promise<boolean> => {
      try {
        const nextUsers = users.map((u) => (u.id === id ? { ...u, ...updatedFields } : u));
        saveUsersState(nextUsers);

        if (currentUser && currentUser.id === id) {
          const updatedAuthUser: AuthUser = {
            ...currentUser,
            name: updatedFields.name ?? currentUser.name,
            email: updatedFields.email ?? currentUser.email,
            username: updatedFields.username ?? currentUser.username,
            avatarUrl: updatedFields.avatarUrl ?? currentUser.avatarUrl,
            phone: updatedFields.phone ?? currentUser.phone,
            role: updatedFields.role ?? currentUser.role,
          };
          setCurrentUser(updatedAuthUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedAuthUser));
        }
        return true;
      } catch (err) {
        console.error('Failed updating user', err);
        return false;
      }
    },
    [currentUser, users, saveUsersState]
  );

  // Delete User
  const deleteUser = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const nextUsers = users.filter((u) => u.id !== id);
        saveUsersState(nextUsers);
        return true;
      } catch (err) {
        console.error('Failed deleting user', err);
        return false;
      }
    },
    [users, saveUsersState]
  );

  const addToast = useCallback(
    (toastOrTitle: string | Omit<ToastMessage, 'id'>, typeOrMsg?: any) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      let newToast: ToastMessage;
      if (typeof toastOrTitle === 'string') {
        const validTypes = ['success', 'error', 'info', 'warning'];
        const type = validTypes.includes(typeOrMsg) ? typeOrMsg : 'info';
        newToast = {
          id,
          title: toastOrTitle,
          type: type as any,
          message: typeof typeOrMsg === 'string' && !validTypes.includes(typeOrMsg) ? typeOrMsg : undefined,
        };
      } else {
        newToast = { ...toastOrTitle, id };
      }
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Cloud & Multi-Device Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toISOString());
  const lastSeenVersionRef = useRef<number>(0);

  // Save state: local update + push to server
  const saveState = useCallback((newDb: GreenhouseDatabase) => {
    setDb(newDb);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newDb));
    } catch (e) {
      console.error('Failed saving to localStorage', e);
    }

    fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDb),
    })
      .then(async (res) => {
        if (res.ok) {
          clearPendingUpload();
          const result = await res.json();
          if (result?.data && Array.isArray(result.data.transactions)) {
            setDb(result.data);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result.data));
            } catch {}
          }
          setLastSyncTime(new Date().toISOString());
        } else {
          markPendingUpload();
        }
      })
      .catch(() => {
        // Offline: tandai agar perubahan lokal diunggah ulang sebelum menarik data server
        markPendingUpload();
      });
  }, []);

  // Fetch latest data from backend & synchronize with local state.
  // Returns true when server data was fetched successfully, false when offline/unreachable.
  const refreshData = useCallback(async (silent = false): Promise<boolean> => {
    if (!silent) {
      setIsSyncing(true);
    }
    try {
      // Jika ada perubahan lokal yang belum terunggah, unggah dulu —
      // jangan tarik data server agar perubahan lokal tidak tertimpa.
      if (localStorage.getItem(PENDING_UPLOAD_KEY) === '1') {
        try {
          const pushRes = await fetch('/api/database', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dbRef.current),
          });
          if (pushRes.ok) {
            clearPendingUpload();
            const result = await pushRes.json().catch(() => null);
            if (result?.version) {
              lastSeenVersionRef.current = result.version;
            }
            setLastSyncTime(new Date().toISOString());
            return true;
          }
        } catch {
          // Masih offline — pertahankan data lokal
        }
        return false;
      }

      const res = await fetch('/api/database');
      if (res.ok) {
        const rawData: GreenhouseDatabase = await res.json();
        const migration = migrateLegacyGreenhouseNaming(rawData);
        const data: GreenhouseDatabase = migration.data;
        if (data && Array.isArray(data.transactions)) {
          if (migration.changed) {
            // Data di server masih memakai penamaan lama ("Tunnel") —
            // simpan versi baru (termasuk unggah ke server) lalu selesai.
            saveState(data);
            return true;
          }
          // Penyelamat data: server kosong total tetapi perangkat ini masih memiliki
          // data → unggah data perangkat, jangan biarkan tarikan kosong menghapusnya.
          if (isDatabaseEmpty(data) && !isDatabaseEmpty(dbRef.current)) {
            try {
              const pushRes = await fetch('/api/database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dbRef.current),
              });
              if (pushRes.ok) {
                clearPendingUpload();
                const result = await pushRes.json().catch(() => null);
                if (result?.version) {
                  lastSeenVersionRef.current = result.version;
                }
                setLastSyncTime(new Date().toISOString());
                return true;
              }
            } catch {
              // Gagal unggah — pertahankan data lokal
            }
            return false;
          }
          if (!data.tunnels || !Array.isArray(data.tunnels)) {
            data.tunnels = INITIAL_TUNNELS;
          }
          if (!data.employees) data.employees = INITIAL_DATABASE.employees || [];
          if (!data.workShifts) data.workShifts = INITIAL_DATABASE.workShifts || [];
          if (!data.attendances) data.attendances = INITIAL_DATABASE.attendances || [];
          if (!data.leaveRequests) data.leaveRequests = INITIAL_DATABASE.leaveRequests || [];
          if (!data.overtimeRequests) data.overtimeRequests = INITIAL_DATABASE.overtimeRequests || [];
          if (!data.payrolls) data.payrolls = INITIAL_DATABASE.payrolls || [];
          if (!data.payrollSettings) data.payrollSettings = INITIAL_DATABASE.payrollSettings;
          if (!data.employeeAuditLogs) data.employeeAuditLogs = INITIAL_DATABASE.employeeAuditLogs || [];
          setDb(data);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
          } catch {}
          setLastSyncTime(new Date().toISOString());
          return true;
        }
      }
      if (res.status === 404) {
        // Cloud belum berisi data — jadikan data perangkat ini sebagai sumber awal,
        // sehingga tombol "Sinkron" pertama berhasil (tidak lagi menampilkan gagal).
        try {
          const pushRes = await fetch('/api/database', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dbRef.current),
          });
          if (pushRes.ok) {
            const result = await pushRes.json().catch(() => null);
            if (result?.version) {
              lastSeenVersionRef.current = result.version;
            }
            setLastSyncTime(new Date().toISOString());
            return true;
          }
        } catch {
          // Gagal unggah — perlakukan seperti offline
        }
      }
      return false;
    } catch {
      // Offline mode: keep local storage
      return false;
    } finally {
      if (!silent) {
        setIsSyncing(false);
      }
    }
  }, []);

  // 1. Initial fetch on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // 2. Real-time Server-Sent Events (SSE) listener
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/sync/events');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.version && payload.version !== lastSeenVersionRef.current) {
            lastSeenVersionRef.current = payload.version;
            refreshData(true);
          }
        } catch {
          // ignore
        }
      };
      eventSource.onerror = () => {
        // Server tidak mendukung SSE (mis. hosting serverless) —
        // tutup koneksi dan andalkan polling berkala.
        try {
          eventSource?.close();
        } catch {
          // abaikan
        }
      };
    } catch {
      // fallback
    }
    return () => {
      eventSource?.close();
    };
  }, [refreshData]);

  // 3. Fallback auto-poll
  useEffect(() => {
    const timer = setInterval(() => {
      fetch('/api/sync/version')
        .then((r) => {
          if (r.status === 503) {
            // Server sinkronisasi belum siap (mis. Blob belum dihubungkan) —
            // hentikan polling agar tidak membebani server.
            clearInterval(timer);
            return null;
          }
          return r.json();
        })
        .then((res) => {
          if (res?.version && res.version !== lastSeenVersionRef.current) {
            lastSeenVersionRef.current = res.version;
            refreshData(true);
          }
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [refreshData]);

  // 4. Instant sync on visibility/focus
  useEffect(() => {
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshData(true);
      }
    };
    window.addEventListener('visibilitychange', handleFocusOrVisible);
    window.addEventListener('focus', handleFocusOrVisible);
    return () => {
      window.removeEventListener('visibilitychange', handleFocusOrVisible);
      window.removeEventListener('focus', handleFocusOrVisible);
    };
  }, [refreshData]);

  // ======================== COMPUTED METRICS ========================
  const metrics: FinancialMetrics = useMemo(() => {
    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    let totalBiayaOperasional = 0;
    let totalOmzet = 0;

    db.transactions.forEach((t) => {
      const amount = Number(t.amount) || 0;
      if (t.type === 'pemasukan') {
        totalPemasukan += amount;
        const category = (t.category || '').toLowerCase();
        if (category.includes('melon') || category.includes('penjualan')) {
          totalOmzet += amount;
        }
      } else {
        totalPengeluaran += amount;
        if (t.expenseGroup === 'operasional' || !t.expenseGroup) {
          totalBiayaOperasional += amount;
        }
      }
    });

    const saldoKas = totalPemasukan - totalPengeluaran;
    const totalInvestasi = db.investments.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    const totalPanenKg = db.harvests.reduce((sum, h) => sum + (Number(h.totalWeightKg) || 0), 0);

    const harvestRevenue = db.harvests.reduce((sum, h) => sum + (Number(h.totalRevenue) || 0), 0);
    if (harvestRevenue > totalOmzet) {
      totalOmzet = harvestRevenue;
    }

    const hppPerKg = totalPanenKg > 0 ? Math.round(totalBiayaOperasional / totalPanenKg) : 0;
    const totalTanaman = db.cycles.reduce((sum, c) => sum + (Number(c.plantCount) || 0), 0);
    const biayaPerTanaman = totalTanaman > 0 ? Math.round(totalBiayaOperasional / totalTanaman) : 0;
    const labaBersih = totalOmzet - totalBiayaOperasional;
    const nilaiAset = db.assets.reduce((sum, a) => sum + (Number(a.purchasePrice) || 0) * (Number(a.quantity) || 1), 0);
    const modalKembali = Math.max(0, labaBersih);
    const modalBelumKembali = Math.max(0, totalInvestasi - modalKembali);
    const roiPercent = totalInvestasi > 0 ? (labaBersih / totalInvestasi) * 100 : 0;

    const totalHutang = db.debts
      .filter((d) => d.type === 'hutang' && d.status !== 'Lunas')
      .reduce((sum, d) => sum + (Number(d.remainingAmount) || 0), 0);

    const totalPiutang = db.debts
      .filter((d) => d.type === 'piutang' && d.status !== 'Lunas')
      .reduce((sum, d) => sum + (Number(d.remainingAmount) || 0), 0);

    return {
      saldoKas,
      totalPemasukan,
      totalPengeluaran,
      totalOmzet,
      totalBiayaOperasional,
      totalInvestasi,
      labaBersih,
      totalPanenKg,
      hppPerKg,
      biayaPerTanaman,
      nilaiAset,
      modalKembali,
      modalBelumKembali,
      roiPercent,
      totalHutang,
      totalPiutang,
    };
  }, [db]);

  const lowStockItems = useMemo(() => {
    return db.inventory.filter((item) => (Number(item.currentStock) || 0) <= (Number(item.minStock) || 0));
  }, [db.inventory]);

  // ======================== TUNNELS CRUD ========================
  const addTunnel = async (tunnelData: Omit<Tunnel, 'id' | 'createdAt'>): Promise<boolean> => {
    const id = `TUNNEL-${Date.now()}`;
    const newTunnel: Tunnel = {
      ...tunnelData,
      id,
      name: tunnelData.name.trim(),
      lengthM: Number(tunnelData.lengthM) || 48,
      widthM: Number(tunnelData.widthM) || 8,
      capacityPlants: Number(tunnelData.capacityPlants) || 1000,
      systemType: tunnelData.systemType || 'DFT Hydroponic',
      structureMaterial: tunnelData.structureMaterial || 'Bambu Petung Super',
      status: tunnelData.status || 'Aktif',
      notes: tunnelData.notes || '',
      createdAt: new Date().toISOString(),
    };
    const newDb: GreenhouseDatabase = {
      ...db,
      tunnels: [...(db.tunnels || []), newTunnel],
    };
    saveState(newDb);
    addToast({
      type: 'success',
      title: 'Greenhouse Berhasil Ditambahkan',
      message: `${newTunnel.name} (${newTunnel.widthM}x${newTunnel.lengthM} m · ${newTunnel.capacityPlants} tanaman)`,
    });
    return true;
  };

  const updateTunnel = async (id: string, tunnelData: Partial<Tunnel>): Promise<boolean> => {
    const updated = (db.tunnels || []).map((t) => {
      if (t.id === id) {
        return {
          ...t,
          ...tunnelData,
          name: tunnelData.name !== undefined ? tunnelData.name.trim() : t.name,
          lengthM: tunnelData.lengthM !== undefined ? Number(tunnelData.lengthM) : t.lengthM,
          widthM: tunnelData.widthM !== undefined ? Number(tunnelData.widthM) : t.widthM,
          capacityPlants: tunnelData.capacityPlants !== undefined ? Number(tunnelData.capacityPlants) : t.capacityPlants,
        };
      }
      return t;
    });
    saveState({ ...db, tunnels: updated });
    addToast({ type: 'success', title: 'Data Greenhouse Diperbarui' });
    return true;
  };

  const deleteTunnel = async (id: string): Promise<boolean> => {
    const target = (db.tunnels || []).find((t) => t.id === id);
    if (!target) return false;
    const updated = (db.tunnels || []).filter((t) => t.id !== id);
    saveState({ ...db, tunnels: updated });
    addToast({
      type: 'info',
      title: 'Greenhouse Dihapus',
      message: `${target.name} telah berhasil dihapus dari sistem.`,
    });
    return true;
  };

  // ======================== TRANSACTION CRUD ========================
  const addTransaction = async (data: Omit<Transaction, 'id' | 'createdAt'>): Promise<boolean> => {
    const id = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newTrx: Transaction = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    const newDb: GreenhouseDatabase = {
      ...db,
      transactions: [newTrx, ...db.transactions],
    };
    saveState(newDb);
    addToast({
      type: 'success',
      title: 'Transaksi Tersimpan',
      message: `${newTrx.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'} ${newTrx.category} berhasil dicatat.`,
    });

    if (sheetsWebhookUrl) {
      syncTransactionToSheets(sheetsWebhookUrl, newTrx).then((res) => {
        if (res.success) {
          const now = new Date().toISOString();
          setLastSheetsSyncState(now);
          saveStoredLastSync(now);
        }
      });
    }
    return true;
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>): Promise<boolean> => {
    const updated = db.transactions.map((t) => (t.id === id ? { ...t, ...data } : t));
    saveState({ ...db, transactions: updated });
    addToast({ type: 'success', title: 'Transaksi Diperbarui' });
    return true;
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    const updated = db.transactions.filter((t) => t.id !== id);
    saveState({ ...db, transactions: updated });
    addToast({ type: 'info', title: 'Transaksi Dihapus' });
    return true;
  };

  // ======================== CROP CYCLES CRUD ========================
  const addCycle = async (cycle: CropCycle): Promise<boolean> => {
    if (db.cycles.some((c) => c.id === cycle.id)) {
      addToast({ type: 'error', title: 'Gagal', message: `ID Siklus ${cycle.id} sudah ada!` });
      return false;
    }
    const newDb = { ...db, cycles: [...db.cycles, cycle] };
    saveState(newDb);
    addToast({ type: 'success', title: 'Siklus Tanam Ditambahkan', message: cycle.name });
    return true;
  };

  const updateCycle = async (id: string, cycle: Partial<CropCycle>): Promise<boolean> => {
    const updated = db.cycles.map((c) => (c.id === id ? { ...c, ...cycle } : c));
    saveState({ ...db, cycles: updated });
    addToast({ type: 'success', title: 'Siklus Diperbarui' });
    return true;
  };

  const deleteCycle = async (id: string): Promise<boolean> => {
    const updated = db.cycles.filter((c) => c.id !== id);
    saveState({ ...db, cycles: updated });
    addToast({ type: 'info', title: 'Siklus Dihapus' });
    return true;
  };

  // ======================== HARVESTS CRUD ========================
  const addHarvest = async (harvestData: Omit<HarvestRecord, 'id' | 'totalRevenue'>): Promise<boolean> => {
    const id = `HRV-${Date.now()}`;
    const totalRevenue = (Number(harvestData.totalWeightKg) || 0) * (Number(harvestData.pricePerKg) || 0);
    const newHarvest: HarvestRecord = {
      ...harvestData,
      id,
      totalRevenue,
    };

    const saleTrx: Transaction = {
      id: `TRX-HRV-${id}`,
      date: newHarvest.date,
      type: 'pemasukan',
      category: 'Penjualan melon',
      amount: totalRevenue,
      paymentMethod: newHarvest.paymentStatus === 'Lunas' ? 'Transfer Bank' : 'Hutang / Piutang',
      cycleId: newHarvest.cycleId,
      tunnel: newHarvest.tunnel,
      note: `Hasil penjualan panen ${newHarvest.totalWeightKg} kg melon (${newHarvest.buyer || 'Pembeli'})`,
      createdAt: new Date().toISOString(),
    };

    const newDb: GreenhouseDatabase = {
      ...db,
      harvests: [newHarvest, ...db.harvests],
      transactions: [saleTrx, ...db.transactions],
    };
    saveState(newDb);
    addToast({
      type: 'success',
      title: 'Panen & Penjualan Dicatat',
      message: `${newHarvest.totalWeightKg} kg melon (${newHarvest.cycleId})`,
    });
    return true;
  };

  const updateHarvest = async (id: string, data: Partial<HarvestRecord>): Promise<boolean> => {
    const updated = db.harvests.map((h) => {
      if (h.id === id) {
        const merged = { ...h, ...data };
        merged.totalRevenue = (Number(merged.totalWeightKg) || 0) * (Number(merged.pricePerKg) || 0);
        return merged;
      }
      return h;
    });

    const target = updated.find((h) => h.id === id);
    let updatedTrx = db.transactions;
    if (target) {
      updatedTrx = db.transactions.map((t) => {
        if (t.id === `TRX-HRV-${id}`) {
          return {
            ...t,
            amount: target.totalRevenue,
            date: target.date,
            cycleId: target.cycleId,
          };
        }
        return t;
      });
    }
    saveState({ ...db, harvests: updated, transactions: updatedTrx });
    addToast({ type: 'success', title: 'Data Panen Diperbarui' });
    return true;
  };

  const deleteHarvest = async (id: string): Promise<boolean> => {
    const updated = db.harvests.filter((h) => h.id !== id);
    const updatedTrx = db.transactions.filter((t) => t.id !== `TRX-HRV-${id}`);
    saveState({ ...db, harvests: updated, transactions: updatedTrx });
    addToast({ type: 'info', title: 'Data Panen Dihapus' });
    return true;
  };

  // ======================== INVESTMENTS CRUD ========================
  const addInvestment = async (invData: Omit<Investment, 'id' | 'totalAmount'>): Promise<boolean> => {
    const id = `INV-${Date.now()}`;
    const totalAmount = (Number(invData.quantity) || 1) * (Number(invData.unitPrice) || 0);
    const newInv: Investment = {
      ...invData,
      id,
      totalAmount,
    };

    const invTrx: Transaction = {
      id: `TRX-INV-${id}`,
      date: newInv.date,
      type: 'pengeluaran',
      expenseGroup: 'investasi',
      category: newInv.category,
      subcategory: newInv.itemName,
      amount: totalAmount,
      paymentMethod: 'Transfer Bank',
      tunnel: newInv.tunnel,
      note: `Investasi: ${newInv.itemName} (${newInv.quantity} ${newInv.unit})`,
      createdAt: new Date().toISOString(),
    };
    const newDb: GreenhouseDatabase = {
      ...db,
      investments: [newInv, ...db.investments],
      transactions: [invTrx, ...db.transactions],
    };
    saveState(newDb);
    addToast({ type: 'success', title: 'Investasi Dicatat', message: newInv.itemName });
    return true;
  };

  const updateInvestment = async (id: string, data: Partial<Investment>): Promise<boolean> => {
    const updated = db.investments.map((i) => {
      if (i.id === id) {
        const merged = { ...i, ...data };
        merged.totalAmount = (Number(merged.quantity) || 1) * (Number(merged.unitPrice) || 0);
        return merged;
      }
      return i;
    });
    const target = updated.find((i) => i.id === id);
    let updatedTrx = db.transactions;
    if (target) {
      updatedTrx = db.transactions.map((t) => {
        if (t.id === `TRX-INV-${id}`) {
          return {
            ...t,
            amount: target.totalAmount,
            date: target.date,
            category: target.category,
          };
        }
        return t;
      });
    }
    saveState({ ...db, investments: updated, transactions: updatedTrx });
    addToast({ type: 'success', title: 'Data Investasi Diperbarui' });
    return true;
  };

  const deleteInvestment = async (id: string): Promise<boolean> => {
    const updated = db.investments.filter((i) => i.id !== id);
    const updatedTrx = db.transactions.filter((t) => t.id !== `TRX-INV-${id}`);
    saveState({ ...db, investments: updated, transactions: updatedTrx });
    addToast({ type: 'info', title: 'Data Investasi Dihapus' });
    return true;
  };

  // ======================== ASSETS CRUD ========================
  const addAsset = async (assetData: Omit<Asset, 'id'>): Promise<boolean> => {
    const id = `AST-${Date.now()}`;
    const newAsset: Asset = { ...assetData, id };
    const newDb = { ...db, assets: [newAsset, ...db.assets] };
    saveState(newDb);
    addToast({ type: 'success', title: 'Aset Ditambahkan', message: newAsset.name });
    return true;
  };

  const updateAsset = async (id: string, data: Partial<Asset>): Promise<boolean> => {
    const updated = db.assets.map((a) => (a.id === id ? { ...a, ...data } : a));
    saveState({ ...db, assets: updated });
    addToast({ type: 'success', title: 'Data Aset Diperbarui' });
    return true;
  };

  const deleteAsset = async (id: string): Promise<boolean> => {
    const updated = db.assets.filter((a) => a.id !== id);
    saveState({ ...db, assets: updated });
    addToast({ type: 'info', title: 'Aset Dihapus' });
    return true;
  };

  // ======================== INVENTORY & MUTATIONS ========================
  const addInventoryItem = async (
    itemData: Omit<InventoryItem, 'id' | 'currentStock' | 'lastUpdated'>
  ): Promise<boolean> => {
    const id = `ITM-${Date.now()}`;
    const currentStock =
      (Number(itemData.initialStock) || 0) +
      (Number(itemData.incomingStock) || 0) -
      (Number(itemData.outgoingStock) || 0);
    const newItem: InventoryItem = {
      ...itemData,
      id,
      currentStock,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    const newDb = { ...db, inventory: [newItem, ...db.inventory] };
    saveState(newDb);
    addToast({ type: 'success', title: 'Barang Stok Ditambahkan', message: newItem.name });
    return true;
  };

  const updateInventoryItem = async (id: string, data: Partial<InventoryItem>): Promise<boolean> => {
    const updated = db.inventory.map((i) => {
      if (i.id === id) {
        const merged = { ...i, ...data };
        merged.currentStock =
          (Number(merged.initialStock) || 0) +
          (Number(merged.incomingStock) || 0) -
          (Number(merged.outgoingStock) || 0);
        merged.lastUpdated = new Date().toISOString().slice(0, 10);
        return merged;
      }
      return i;
    });
    saveState({ ...db, inventory: updated });
    addToast({ type: 'success', title: 'Stok Barang Diperbarui' });
    return true;
  };

  const deleteInventoryItem = async (id: string): Promise<boolean> => {
    const updated = db.inventory.filter((i) => i.id !== id);
    saveState({ ...db, inventory: updated });
    addToast({ type: 'info', title: 'Barang Stok Dihapus' });
    return true;
  };

  const recordStockMutation = async (mutationData: Omit<StockMutation, 'id'>): Promise<boolean> => {
    const id = `MUT-${Date.now()}`;
    const mutation: StockMutation = { ...mutationData, id };
    const updatedInv = db.inventory.map((item) => {
      if (item.id === mutation.itemId) {
        const qty = Number(mutation.quantity) || 0;
        const incoming = mutation.type === 'Masuk' ? (item.incomingStock || 0) + qty : item.incomingStock || 0;
        const outgoing = mutation.type === 'Keluar' ? (item.outgoingStock || 0) + qty : item.outgoingStock || 0;
        const currentStock = (item.initialStock || 0) + incoming - outgoing;
        return {
          ...item,
          incomingStock: incoming,
          outgoingStock: outgoing,
          currentStock,
          lastUpdated: mutation.date,
        };
      }
      return item;
    });
    const newDb = {
      ...db,
      inventory: updatedInv,
      stockMutations: [mutation, ...db.stockMutations],
    };
    saveState(newDb);
    addToast({
      type: 'success',
      title: 'Mutasi Stok Dicatat',
      message: `${mutation.type === 'Masuk' ? '+ Masuk' : '- Keluar'} ${mutation.quantity} ${mutation.unit} (${mutation.itemName})`,
    });
    return true;
  };

  // ======================== DEBTS & RECEIVABLES ========================
  const addDebt = async (debtData: Omit<DebtReceivable, 'id' | 'remainingAmount' | 'status'>): Promise<boolean> => {
    const id = `DEBT-${Date.now()}`;
    const amount = Number(debtData.amount) || 0;
    const paidAmount = Number(debtData.paidAmount) || 0;
    const remainingAmount = Math.max(0, amount - paidAmount);
    const status = remainingAmount === 0 ? 'Lunas' : paidAmount > 0 ? 'Sebagian' : 'Belum lunas';
    const newDebt: DebtReceivable = {
      ...debtData,
      id,
      amount,
      paidAmount,
      remainingAmount,
      status,
    };
    const newDb = { ...db, debts: [newDebt, ...db.debts] };
    saveState(newDb);
    addToast({
      type: 'success',
      title: `${newDebt.type === 'hutang' ? 'Hutang' : 'Piutang'} Dicatat`,
      message: `${newDebt.counterparty}`,
    });
    return true;
  };

  const updateDebt = async (id: string, data: Partial<DebtReceivable>): Promise<boolean> => {
    const updated = db.debts.map((d) => {
      if (d.id === id) {
        const merged = { ...d, ...data };
        merged.amount = Number(merged.amount) || 0;
        merged.paidAmount = Number(merged.paidAmount) || 0;
        merged.remainingAmount = Math.max(0, merged.amount - merged.paidAmount);
        merged.status = merged.remainingAmount === 0 ? 'Lunas' : merged.paidAmount > 0 ? 'Sebagian' : 'Belum lunas';
        return merged;
      }
      return d;
    });
    saveState({ ...db, debts: updated });
    addToast({ type: 'success', title: 'Data Hutang/Piutang Diperbarui' });
    return true;
  };

  const deleteDebt = async (id: string): Promise<boolean> => {
    const updated = db.debts.filter((d) => d.id !== id);
    saveState({ ...db, debts: updated });
    addToast({ type: 'info', title: 'Data Hutang/Piutang Dihapus' });
    return true;
  };

  // ======================== HR, ABSENSI & PAYROLL METHODS ========================
  const createAuditLogEntry = (log: Omit<HRAuditLog, 'id' | 'timestamp'>): HRAuditLog => ({
    ...log,
    id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  });

  const addAuditLog = useCallback((log: Omit<HRAuditLog, 'id' | 'timestamp'>) => {
    const newLog = createAuditLogEntry(log);
    setDb((prev) => {
      const nextDb = { ...prev, employeeAuditLogs: [newLog, ...(prev.employeeAuditLogs || [])] };
      saveState(nextDb);
      return nextDb;
    });
  }, [saveState]);

  // Employee CRUD
  const addEmployee = async (empData: Omit<Employee, 'id' | 'createdAt'>): Promise<boolean> => {
    const nextNum = (db.employees || []).length + 1;
    const newId = `EMP-${String(nextNum).padStart(3, '0')}`;
    const newEmp: Employee = {
      ...empData,
      id: newId,
      isActive: empData.isActive ?? true,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    const auditLog = createAuditLogEntry({
      action: 'Tambah Karyawan Baru',
      adminName: currentUser?.name || 'Admin',
      employeeName: newEmp.name,
      notes: `Karyawan baru ${newEmp.name} (${newEmp.position} - ${newEmp.greenhouse}) berhasil didaftarkan.`,
    });
    const newDb: GreenhouseDatabase = {
      ...db,
      employees: [newEmp, ...(db.employees || [])],
      employeeAuditLogs: [auditLog, ...(db.employeeAuditLogs || [])],
    };
    saveState(newDb);
    addToast({ type: 'success', title: 'Karyawan Ditambahkan', message: `${newEmp.name} (${newEmp.position})` });
    return true;
  };

  const updateEmployee = async (id: string, empData: Partial<Employee>): Promise<boolean> => {
    const prev = (db.employees || []).find((e) => e.id === id);
    const updated = (db.employees || []).map((e) => (e.id === id ? { ...e, ...empData } : e));
    const auditLog = createAuditLogEntry({
      action: 'Edit Data Karyawan',
      adminName: currentUser?.name || 'Admin',
      employeeName: prev?.name || id,
      previousData: prev,
      updatedData: empData,
      notes: `Memperbarui profil data karyawan ${prev?.name || id}`,
    });
    saveState({
      ...db,
      employees: updated,
      employeeAuditLogs: [auditLog, ...(db.employeeAuditLogs || [])],
    });
    addToast({ type: 'success', title: 'Data Karyawan Diperbarui' });
    return true;
  };

  const deleteEmployee = async (id: string, soft = true): Promise<boolean> => {
    const emp = (db.employees || []).find((e) => e.id === id);
    let updated: Employee[];
    if (soft) {
      updated = (db.employees || []).map((e) => (e.id === id ? { ...e, isActive: false, isDeleted: true } : e));
    } else {
      updated = (db.employees || []).filter((e) => e.id !== id);
    }
    const auditLog = createAuditLogEntry({
      action: soft ? 'Nonaktifkan Karyawan' : 'Hapus Karyawan Permanen',
      adminName: currentUser?.name || 'Admin',
      employeeName: emp?.name || id,
      notes: `${emp?.name || id} ${soft ? 'dinonaktifkan (arsip)' : 'dihapus permanen'} dari sistem kebun`,
    });
    saveState({
      ...db,
      employees: updated,
      employeeAuditLogs: [auditLog, ...(db.employeeAuditLogs || [])],
    });
    addToast({ type: 'info', title: soft ? 'Karyawan Dinonaktifkan' : 'Karyawan Dihapus' });
    return true;
  };

  // Work Shifts
  const addWorkShift = async (shiftData: Omit<WorkShift, 'id'>): Promise<boolean> => {
    const newShift: WorkShift = {
      ...shiftData,
      id: `SHIFT-${Date.now().toString().slice(-4)}`,
    };
    saveState({ ...db, workShifts: [...(db.workShifts || []), newShift] });
    addToast({ type: 'success', title: 'Shift Kerja Ditambahkan', message: newShift.name });
    return true;
  };

  const updateWorkShift = async (id: string, shiftData: Partial<WorkShift>): Promise<boolean> => {
    const updated = (db.workShifts || []).map((s) => (s.id === id ? { ...s, ...shiftData } : s));
    saveState({ ...db, workShifts: updated });
    addToast({ type: 'success', title: 'Jadwal Shift Diperbarui' });
    return true;
  };

  const deleteWorkShift = async (id: string): Promise<boolean> => {
    const updated = (db.workShifts || []).filter((s) => s.id !== id);
    saveState({ ...db, workShifts: updated });
    addToast({ type: 'info', title: 'Shift Dihapus' });
    return true;
  };

  // Clock In & Clock Out
  const clockIn = async (employeeId: string, customTime?: string, customDate?: string): Promise<{ success: boolean; message: string }> => {
    const emp = (db.employees || []).find((e) => e.id === employeeId);
    if (!emp) return { success: false, message: 'Karyawan tidak ditemukan.' };
    const today = customDate || new Date().toISOString().slice(0, 10);
    const existing = (db.attendances || []).find((a) => a.employeeId === employeeId && a.date === today);
    if (existing && existing.clockIn && !existing.clockOut) {
      return { success: false, message: `${emp.name} sudah melakukan Clock In hari ini (${existing.clockIn}) dan belum Clock Out.` };
    }

    const nowTime = customTime || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    const shift = (db.workShifts || []).find((s) => s.id === emp.defaultShiftId) || (db.workShifts || [])[0] || {
      id: 'SHIFT-01',
      name: 'Shift Reguler',
      startTime: '07:00',
      endTime: '15:00',
      breakMinutes: 60,
      lateToleranceMinutes: 15,
    };

    const [shiftH, shiftM] = shift.startTime.split(':').map(Number);
    const [nowH, nowM] = nowTime.split(':').map(Number);
    const shiftStartMinutes = shiftH * 60 + shiftM;
    const nowMinutes = nowH * 60 + nowM;
    const tolerance = shift.lateToleranceMinutes || 0;
    let lateMinutes = 0;
    let status: AttendanceStatus = 'Hadir';

    if (nowMinutes > shiftStartMinutes + tolerance) {
      lateMinutes = nowMinutes - shiftStartMinutes;
      status = 'Terlambat';
    }

    const newAttendance: AttendanceRecord = {
      id: existing?.id || `ATT-${today.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date: today,
      greenhouse: emp.greenhouse,
      shiftId: shift.id,
      shiftName: shift.name,
      clockIn: nowTime,
      clockOut: undefined,
      status,
      lateMinutes,
      workHours: 0,
      overtimeHours: 0,
      method: 'clock_in_out',
      createdAt: new Date().toISOString(),
    };

    const nextAttendances = existing
      ? (db.attendances || []).map((a) => (a.id === existing.id ? newAttendance : a))
      : [newAttendance, ...(db.attendances || [])];

    saveState({ ...db, attendances: nextAttendances });
    const msg = status === 'Terlambat'
      ? `Clock In berhasil (${nowTime}). Status: TERLAMBAT ${lateMinutes} menit.`
      : `Clock In berhasil (${nowTime}). Tepat waktu!`;
    addToast({
      type: status === 'Terlambat' ? 'warning' : 'success',
      title: `${emp.name} Clock In`,
      message: msg,
    });
    return { success: true, message: msg };
  };

  const clockOut = async (employeeId: string, customTime?: string, customDate?: string): Promise<{ success: boolean; message: string }> => {
    const emp = (db.employees || []).find((e) => e.id === employeeId);
    if (!emp) return { success: false, message: 'Karyawan tidak ditemukan.' };
    const today = customDate || new Date().toISOString().slice(0, 10);
    const existing = (db.attendances || []).find((a) => a.employeeId === employeeId && a.date === today);

    if (!existing || !existing.clockIn) {
      return { success: false, message: `Belum ada catatan Clock In untuk ${emp.name} hari ini.` };
    }
    if (existing.clockOut) {
      return { success: false, message: `${emp.name} sudah melakukan Clock Out sebelumnya pada jam ${existing.clockOut}.` };
    }

    const outTime = customTime || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    const [inH, inM] = existing.clockIn.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    const inTotalMin = inH * 60 + inM;
    const outTotalMin = outH * 60 + outM;
    const shift = (db.workShifts || []).find((s) => s.id === existing.shiftId);
    const breakMin = shift?.breakMinutes || 60;
    let diffMin = outTotalMin - inTotalMin - breakMin;
    if (diffMin < 0) diffMin = 0;
    const workHours = Number((diffMin / 60).toFixed(2));

    let overtimeHours = 0;
    if (workHours > 7) {
      overtimeHours = Number((workHours - 7).toFixed(1));
    }

    const updatedAttendance: AttendanceRecord = {
      ...existing,
      clockOut: outTime,
      workHours,
      overtimeHours,
      updatedAt: new Date().toISOString(),
    };

    const nextAttendances = (db.attendances || []).map((a) => (a.id === existing.id ? updatedAttendance : a));
    saveState({ ...db, attendances: nextAttendances });
    const msg = `Clock Out berhasil (${outTime}). Total jam kerja: ${workHours} jam${overtimeHours > 0 ? ` (Lembur: ${overtimeHours} jam)` : ''}.`;
    addToast({ type: 'success', title: `${emp.name} Clock Out`, message: msg });
    return { success: true, message: msg };
  };

  const recordAttendance = async (attData: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<boolean> => {
    const newAtt: AttendanceRecord = {
      ...attData,
      id: `ATT-${attData.date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };
    const filtered = (db.attendances || []).filter((a) => !(a.employeeId === attData.employeeId && a.date === attData.date));
    const auditLog = createAuditLogEntry({
      action: 'Input Absensi Manual',
      adminName: currentUser?.name || 'Admin',
      employeeName: attData.employeeName,
      notes: `Input manual absensi ${attData.employeeName} tanggal ${attData.date}: ${attData.status}`,
    });
    saveState({
      ...db,
      attendances: [newAtt, ...filtered],
      employeeAuditLogs: [auditLog, ...(db.employeeAuditLogs || [])],
    });
    addToast({ type: 'success', title: 'Absensi Dicatat', message: `${attData.employeeName} - ${attData.status}` });
    return true;
  };

  const updateAttendance = async (id: string, attData: Partial<AttendanceRecord>, reason?: string): Promise<boolean> => {
    const prev = (db.attendances || []).find((a) => a.id === id);
    const updated = (db.attendances || []).map((a) => (a.id === id ? { ...a, ...attData, updatedAt: new Date().toISOString() } : a));
    const auditLog = createAuditLogEntry({
      action: 'Koreksi Absensi Manual',
      adminName: currentUser?.name || 'Admin',
      employeeName: prev?.employeeName,
      previousData: prev,
      updatedData: attData,
      notes: reason ? `Alasan: ${reason}` : 'Koreksi data absensi',
    });
    saveState({
      ...db,
      attendances: updated,
      employeeAuditLogs: [auditLog, ...(db.employeeAuditLogs || [])],
    });
    addToast({ type: 'success', title: 'Absensi Diperbarui' });
    return true;
  };

  const deleteAttendance = async (id: string): Promise<boolean> => {
    const prev = (db.attendances || []).find((a) => a.id === id);
    const updated = (db.attendances || []).filter((a) => a.id !== id);
    const auditLog = createAuditLogEntry({
      action: 'Hapus Absensi',
      adminName: currentUser?.name || 'Admin',
      employeeName: prev?.employeeName,
      notes: `Hapus absensi tanggal ${prev?.date}`,
    });
    saveState({
      ...db,
      attendances: updated,
      employeeAuditLogs: [auditLog, ...(db.employeeAuditLogs || [])],
    });
    addToast({ type: 'info', title: 'Data Absensi Dihapus' });
    return true;
  };

  // Leaves & Permits
  const addLeaveRequest = async (leaveData: Omit<LeaveRequest, 'id' | 'createdAt'>): Promise<boolean> => {
    const newLeave: LeaveRequest = {
      ...leaveData,
      id: `LV-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };
    saveState({ ...db, leaveRequests: [newLeave, ...(db.leaveRequests || [])] });
    addToast({ type: 'success', title: `Pengajuan ${newLeave.type} Dikirim`, message: `${newLeave.employeeName} (${newLeave.durationDays} hari)` });
    return true;
  };

  const updateLeaveRequestStatus = async (id: string, status: ApprovalStatus, reason?: string): Promise<boolean> => {
    const target = (db.leaveRequests || []).find((l) => l.id === id);
    if (!target) return false;
    const updatedLeave: LeaveRequest = {
      ...target,
      status,
      approvedBy: currentUser?.name || 'Admin',
      approvedAt: new Date().toISOString(),
    };

    let nextAttendances = [...(db.attendances || [])];
    if (status === 'Disetujui') {
      const start = new Date(target.startDate);
      const end = new Date(target.endDate);
      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().slice(0, 10);
        const existingAtt = nextAttendances.find((a) => a.employeeId === target.employeeId && a.date === dateStr);
        const leaveAttStatus: AttendanceStatus = target.type === 'Sakit' ? 'Sakit' : target.type === 'Cuti' ? 'Cuti' : 'Izin';
        const attRecord: AttendanceRecord = {
          id: existingAtt?.id || `ATT-${dateStr.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`,
          employeeId: target.employeeId,
          employeeName: target.employeeName,
          date: dateStr,
          greenhouse: 'Umum',
          shiftName: 'Shift Normal',
          status: leaveAttStatus,
          lateMinutes: 0,
          workHours: 0,
          overtimeHours: 0,
          note: `${target.type}: ${target.reason}`,
          method: 'manual_admin',
          createdAt: new Date().toISOString(),
        };
        nextAttendances = existingAtt
          ? nextAttendances.map((a) => (a.id === existingAtt.id ? attRecord : a))
          : [attRecord, ...nextAttendances];
        current.setDate(current.getDate() + 1);
      }
    }

    const auditLog = createAuditLogEntry({
      action: `Approval Pengajuan ${target.type}: ${status}`,
      adminName: currentUser?.name || 'Admin',
      employeeName: target.employeeName,
      notes: reason || `Status diubah menjadi ${status}`,
    });

    const nextLeaves = (db.leaveRequests || []).map((l) => (l.id === id ? updatedLeave : l));
    saveState({
      ...db,
      leaveRequests: nextLeaves,
      attendances: nextAttendances,
      employeeAuditLogs: [auditLog, ...(db.employeeAuditLogs || [])],
    });
    addToast({
      type: status === 'Disetujui' ? 'success' : 'warning',
      title: `Pengajuan ${target.type} ${status}`,
      message: `${target.employeeName}`,
    });
    return true;
  };

  const deleteLeaveRequest = async (id: string): Promise<boolean> => {
    const updated = (db.leaveRequests || []).filter((l) => l.id !== id);
    saveState({ ...db, leaveRequests: updated });
    addToast({ type: 'info', title: 'Pengajuan Dihapus' });
    return true;
  };

  // Overtime
  const addOvertimeRequest = async (otData: Omit<OvertimeRequest, 'id' | 'createdAt'>): Promise<boolean> => {
    const newOt: OvertimeRequest = {
      ...otData,
      id: `OT-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };
    saveState({ ...db, overtimeRequests: [newOt, ...(db.overtimeRequests || [])] });
    addToast({ type: 'success', title: 'Pengajuan Lembur Dicatat', message: `${newOt.employeeName} (${newOt.durationHours} jam)` });
    return true;
  };

  const updateOvertimeRequestStatus = async (id: string, status: 'Pending' | 'Approved' | 'Rejected'): Promise<boolean> => {
    const target = (db.overtimeRequests || []).find((o) => o.id === id);
    if (!target) return false;
    const updatedOt: OvertimeRequest = {
      ...target,
      status,
      approvedBy: currentUser?.name || 'Admin',
      approvedAt: new Date().toISOString(),
    };
    const auditLog = createAuditLogEntry({
      action: `Approval Lembur: ${status}`,
      adminName: currentUser?.name || 'Admin',
      employeeName: target.employeeName,
      notes: `Lembur ${target.durationHours} jam tanggal ${target.date} ${status}`,
    });
    const nextOts = (db.overtimeRequests || []).map((o) => (o.id === id ? updatedOt : o));
    saveState({
      ...db,
      overtimeRequests: nextOts,
      employeeAuditLogs: [auditLog, ...(db.employeeAuditLogs || [])],
    });
    addToast({
      type: status === 'Approved' ? 'success' : 'warning',
      title: `Lembur ${status}`,
      message: `${target.employeeName} (${target.durationHours} jam)`,
    });
    return true;
  };

  const deleteOvertimeRequest = async (id: string): Promise<boolean> => {
    const updated = (db.overtimeRequests || []).filter((o) => o.id !== id);
    saveState({ ...db, overtimeRequests: updated });
    addToast({ type: 'info', title: 'Data Lembur Dihapus' });
    return true;
  };

  // Payroll Calculation & Payment
  const generateMonthlyPayroll = async (month: number, year: number, greenhouse?: string): Promise<boolean> => {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const periodLabel = `${monthNames[month - 1]} ${year}`;
    const settings = db.payrollSettings || {
      lateDeductionEnabled: true,
      lateDeductionRatePerMinute: 1000,
      alphaDeductionEnabled: true,
      alphaDeductionRatePerDay: 125000,
      defaultMealAllowance: 200000,
      defaultTransportAllowance: 150000,
      includeLaborInHpp: true,
      harvestBonusPerKg: 150,
    };

    const targetEmployees = (db.employees || []).filter((e) => {
      if (e.isDeleted) return false;
      // Pekerja konstruksi dikelola di modul "HR Konstruksi", bukan payroll bulanan operasional
      if (e.workArea === 'Konstruksi') return false;
      if (greenhouse && greenhouse !== 'all' && e.greenhouse !== greenhouse) return false;
      return true;
    });

    if (targetEmployees.length === 0) {
      addToast({ type: 'warning', title: 'Tidak Ada Karyawan', message: 'Belum ada data karyawan aktif untuk diproses.' });
      return false;
    }

    const currentPayrolls = [...(db.payrolls || [])];
    const updatedPayrolls = [...currentPayrolls];

    targetEmployees.forEach((emp) => {
      const existing = currentPayrolls.find((p) => p.employeeId === emp.id && p.periodMonth === month && p.periodYear === year);
      if (existing && existing.status === 'Paid') {
        return;
      }

      const empAttendances = (db.attendances || []).filter((a) => {
        if (a.employeeId !== emp.id) return false;
        const [y, m] = a.date.split('-').map(Number);
        return y === year && m === month;
      });

      const daysPresent = empAttendances.filter((a) => a.status === 'Hadir' || a.status === 'Terlambat').length;
      const daysLate = empAttendances.filter((a) => a.status === 'Terlambat').length;
      const daysLeave = empAttendances.filter((a) => a.status === 'Izin').length;
      const daysSick = empAttendances.filter((a) => a.status === 'Sakit').length;
      const daysCuti = empAttendances.filter((a) => a.status === 'Cuti').length;
      const daysAlpha = empAttendances.filter((a) => a.status === 'Alpha').length;
      const totalWorkHours = empAttendances.reduce((sum, a) => sum + (Number(a.workHours) || 0), 0);
      const totalLateMinutes = empAttendances.reduce((sum, a) => sum + (Number(a.lateMinutes) || 0), 0);

      const empOvertimes = (db.overtimeRequests || []).filter((o) => {
        if (o.employeeId !== emp.id || o.status !== 'Approved') return false;
        const [y, m] = o.date.split('-').map(Number);
        return y === year && m === month;
      });
      const totalOvertimeHours = empOvertimes.reduce((sum, o) => sum + (Number(o.durationHours) || 0), 0);
      const overtimePay = empOvertimes.reduce((sum, o) => sum + (Number(o.totalAmount) || (o.durationHours * emp.overtimeRate)), 0);

      let baseSalary = 0;
      let dailyWages = 0;
      let hourlyWages = 0;
      if (emp.salaryType === 'Bulanan') {
        baseSalary = Number(emp.baseSalary) || 0;
      } else if (emp.salaryType === 'Harian') {
        dailyWages = daysPresent * (Number(emp.dailyRate) || 0);
      } else {
        hourlyWages = Math.round(totalWorkHours * (Number(emp.hourlyRate) || 0));
      }

      const allowanceMeal = Number(settings.defaultMealAllowance) || 0;
      const allowanceTransport = Number(settings.defaultTransportAllowance) || 0;
      const bonusHarvest = existing?.bonusHarvest || 0;
      const bonusProduction = existing?.bonusProduction || 0;
      const otherBonus = existing?.otherBonus || 0;

      const deductionLate = settings.lateDeductionEnabled
        ? Math.round((totalLateMinutes || daysLate * 15) * (Number(settings.lateDeductionRatePerMinute) || 1000))
        : 0;
      const deductionAlpha = settings.alphaDeductionEnabled
        ? Math.round(daysAlpha * (Number(settings.alphaDeductionRatePerDay) || (emp.dailyRate || 120000)))
        : 0;
      const deductionKasbon = existing?.deductionKasbon || 0;
      const deductionBpjs = existing?.deductionBpjs || (emp.employmentStatus === 'Tetap' ? 65000 : 0);
      const deductionOther = existing?.deductionOther || 0;

      const grossSalary = (baseSalary || dailyWages || hourlyWages) +
        overtimePay +
        allowanceMeal +
        allowanceTransport +
        bonusHarvest +
        bonusProduction +
        otherBonus;
      const totalDeductions = deductionLate + deductionAlpha + deductionKasbon + deductionBpjs + deductionOther;
      const netSalary = Math.max(0, grossSalary - totalDeductions);

      const payrollItem: PayrollRecord = {
        id: existing?.id || `PAY-${year}-${String(month).padStart(2, '0')}-${emp.id}`,
        periodMonth: month,
        periodYear: year,
        periodLabel,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeNik: emp.nikInternal,
        position: emp.position,
        greenhouse: emp.greenhouse,
        salaryType: emp.salaryType,
        daysPresent,
        daysLate,
        daysLeave,
        daysSick,
        daysCuti,
        daysAlpha,
        totalWorkHours,
        totalOvertimeHours,
        baseSalary,
        dailyWages,
        hourlyWages,
        overtimePay,
        allowanceMeal,
        allowanceTransport,
        bonusHarvest,
        bonusProduction,
        otherBonus,
        deductionLate,
        deductionAlpha,
        deductionKasbon,
        deductionBpjs,
        deductionOther,
        grossSalary,
        totalDeductions,
        netSalary,
        status: existing?.status || 'Draft',
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const existingIndex = updatedPayrolls.findIndex((p) => p.id === payrollItem.id);
      if (existingIndex >= 0) {
        updatedPayrolls[existingIndex] = payrollItem;
      } else {
        updatedPayrolls.push(payrollItem);
      }
    });

    saveState({ ...db, payrolls: updatedPayrolls });
    addToast({
      type: 'success',
      title: 'Payroll Berhasil Dihitung',
      message: `Perhitungan payroll periode ${periodLabel} untuk ${targetEmployees.length} staf berhasil digenerate.`,
    });
    return true;
  };

  const updatePayrollRecord = async (id: string, updates: Partial<PayrollRecord>): Promise<boolean> => {
    const existing = (db.payrolls || []).find((p) => p.id === id);
    if (!existing) return false;
    if (existing.status === 'Paid') {
      addToast({ type: 'warning', title: 'Sudah Dibayar', message: 'Data payroll yang sudah PAID tidak dapat diedit langsung.' });
      return false;
    }
    const merged = { ...existing, ...updates };
    const gross = (merged.baseSalary || merged.dailyWages || merged.hourlyWages) +
      (merged.overtimePay || 0) +
      (merged.allowanceMeal || 0) +
      (merged.allowanceTransport || 0) +
      (merged.bonusHarvest || 0) +
      (merged.bonusProduction || 0) +
      (merged.otherBonus || 0);
    const deductions = (merged.deductionLate || 0) +
      (merged.deductionAlpha || 0) +
      (merged.deductionKasbon || 0) +
      (merged.deductionBpjs || 0) +
      (merged.deductionOther || 0);

    merged.grossSalary = gross;
    merged.totalDeductions = deductions;
    merged.netSalary = Math.max(0, gross - deductions);
    merged.updatedAt = new Date().toISOString();

    const nextPayrolls = (db.payrolls || []).map((p) => (p.id === id ? merged : p));
    saveState({ ...db, payrolls: nextPayrolls });
    addToast({ type: 'success', title: 'Payroll Diperbarui', message: `Gaji bersih: Rp${merged.netSalary.toLocaleString('id-ID')}` });
    return true;
  };

  const approvePayroll = async (id: string): Promise<boolean> => {
    const existing = (db.payrolls || []).find((p) => p.id === id);
    if (!existing) return false;
    const approvedRecord: PayrollRecord = {
      ...existing,
      status: 'Approved',
      approvedBy: currentUser?.name || 'Owner',
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const auditLog = createAuditLogEntry({
      action: 'Approval Payroll',
      adminName: currentUser?.name || 'Admin',
      employeeName: existing.employeeName,
      notes: `Payroll ${existing.periodLabel} untuk ${existing.employeeName} senilai Rp${existing.netSalary.toLocaleString('id-ID')} disetujui.`,
    });
    const nextPayrolls = (db.payrolls || []).map((p) => (p.id === id ? approvedRecord : p));
    saveState({
      ...db,
      payrolls: nextPayrolls,
      employeeAuditLogs: [auditLog, ...(db.employeeAuditLogs || [])],
    });
    addToast({ type: 'success', title: 'Payroll Disetujui', message: `${existing.employeeName} siap dibayarkan.` });
    return true;
  };

  const payPayroll = async (id: string, paymentData: {
    paymentMethod: 'Cash' | 'Transfer Bank' | 'E-Wallet' | 'Lainnya';
    paymentReference?: string;
    paymentNotes?: string;
    paymentDate?: string;
  }): Promise<boolean> => {
    const payroll = (db.payrolls || []).find((p) => p.id === id);
    if (!payroll) {
      addToast({ type: 'error', title: 'Data Payroll Tidak Ditemukan' });
      return false;
    }
    if (payroll.status === 'Paid') {
      addToast({ type: 'warning', title: 'Sudah Dibayar', message: 'Payroll ini sudah berstatus PAID sebelumnya.' });
      return false;
    }

    const payDate = paymentData.paymentDate || new Date().toISOString().slice(0, 10);
    const ref = paymentData.paymentReference || `PAY-${payroll.employeeId}-${Date.now().toString().slice(-4)}`;

    // Karyawan fase konstruksi: upah dicatat sebagai Investasi (Pembangunan/capex),
    // bukan biaya operasional, agar tidak masuk HPP panen.
    const employee = (db.employees || []).find((e) => e.id === payroll.employeeId);
    const isConstructionWorker = employee?.workArea === 'Konstruksi';

    let constructionInvestment: Investment | null = null;
    let trxId = `TRX-PAY-${Date.now().toString().slice(-6)}`;

    if (isConstructionWorker) {
      const invId = `INV-${Date.now()}`;
      constructionInvestment = {
        id: invId,
        date: payDate,
        category: 'Pembangunan',
        itemName: `Upah Konstruksi: ${payroll.employeeName}`,
        quantity: 1,
        unit: 'orang',
        unitPrice: payroll.netSalary,
        totalAmount: payroll.netSalary,
        supplier: '-',
        tunnel: payroll.greenhouse || 'Semua Greenhouse',
        notes: `Payroll ${payroll.periodLabel} (${payroll.position}) - Ref: ${ref}`,
      };
      trxId = `TRX-INV-${invId}`;
    }

    const payrollTransaction: Transaction = isConstructionWorker
      ? {
          id: trxId,
          date: payDate,
          type: 'pengeluaran',
          expenseGroup: 'investasi',
          category: 'Pembangunan',
          subcategory: `Upah Konstruksi: ${payroll.employeeName}`,
          amount: payroll.netSalary,
          paymentMethod: paymentData.paymentMethod === 'Cash' ? 'Tunai / Cash' : 'Transfer Bank',
          tunnel: payroll.greenhouse || 'Semua Greenhouse',
          note: `Investasi: Upah Konstruksi ${payroll.employeeName} (${payroll.position}) - Payroll ${payroll.periodLabel} [Ref: ${ref}]`,
          createdAt: new Date().toISOString(),
        }
      : {
          id: trxId,
          date: payDate,
          type: 'pengeluaran',
          expenseGroup: 'operasional',
          category: 'Gaji Karyawan / Payroll',
          subcategory: `Gaji ${payroll.employeeName}`,
          amount: payroll.netSalary,
          paymentMethod: paymentData.paymentMethod === 'Cash' ? 'Tunai / Cash' : 'Transfer Bank',
          tunnel: payroll.greenhouse || 'Semua Greenhouse',
          note: `Payroll ${payroll.periodLabel} - ${payroll.employeeName} (${payroll.position}) [Ref: ${ref}]`,
          createdAt: new Date().toISOString(),
        };

    const updatedPayroll: PayrollRecord = {
      ...payroll,
      status: 'Paid',
      paidAt: new Date().toISOString(),
      paymentMethod: paymentData.paymentMethod,
      paymentReference: ref,
      financeTransactionId: trxId,
      paymentNotes: paymentData.paymentNotes,
      updatedAt: new Date().toISOString(),
    };

    const auditLog: HRAuditLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'Pembayaran Gaji Karyawan',
      adminName: currentUser?.name || 'Admin',
      employeeName: payroll.employeeName,
      notes: isConstructionWorker
        ? `Upah konstruksi ${payroll.periodLabel} senilai Rp${payroll.netSalary.toLocaleString('id-ID')} dibayar via ${paymentData.paymentMethod} dan dicatat sebagai Investasi/Pembangunan (Ref: ${ref})`
        : `Gaji ${payroll.periodLabel} senilai Rp${payroll.netSalary.toLocaleString('id-ID')} dibayar via ${paymentData.paymentMethod} (Ref: ${ref})`,
    };

    const newDb: GreenhouseDatabase = {
      ...db,
      transactions: [payrollTransaction, ...db.transactions],
      investments: constructionInvestment
        ? [constructionInvestment, ...(db.investments || [])]
        : db.investments,
      payrolls: (db.payrolls || []).map((p) => (p.id === id ? updatedPayroll : p)),
      employeeAuditLogs: [auditLog, ...(db.employeeAuditLogs || [])],
    };
    saveState(newDb);
    addToast({
      type: 'success',
      title: 'Gaji Berhasil Dibayarkan',
      message: isConstructionWorker
        ? `Upah ${payroll.employeeName} (${payroll.periodLabel}) sebesar Rp${payroll.netSalary.toLocaleString('id-ID')} tercatat sebagai Investasi Pembangunan (capex), bukan biaya operasional/HPP.`
        : `Gaji ${payroll.employeeName} (${payroll.periodLabel}) sebesar Rp${payroll.netSalary.toLocaleString('id-ID')} telah tercatat di pengeluaran operasional.`,
    });
    return true;
  };

  const deletePayrollRecord = async (id: string): Promise<boolean> => {
    const existing = (db.payrolls || []).find((p) => p.id === id);
    if (existing?.status === 'Paid') {
      addToast({ type: 'error', title: 'Tidak Dapat Dihapus', message: 'Payroll yang sudah PAID tidak boleh dihapus agar laporan keuangan tidak timpang.' });
      return false;
    }
    const updated = (db.payrolls || []).filter((p) => p.id !== id);
    saveState({ ...db, payrolls: updated });
    addToast({ type: 'info', title: 'Data Payroll Dihapus' });
    return true;
  };

  const addHarvestBonusToPayroll = async (
    employeeId: string,
    month: number,
    year: number,
    bonusAmount: number,
    notes?: string
  ): Promise<boolean> => {
    const existing = (db.payrolls || []).find(
      (p) => p.employeeId === employeeId && p.periodMonth === month && p.periodYear === year
    );
    if (!existing) {
      addToast({ type: 'warning', title: 'Payroll Belum Dibuat', message: 'Silakan generate payroll periode tersebut terlebih dahulu.' });
      return false;
    }
    return updatePayrollRecord(existing.id, {
      bonusHarvest: (existing.bonusHarvest || 0) + bonusAmount,
      paymentNotes: notes ? `${existing.paymentNotes || ''} | Bonus Panen: ${notes}` : existing.paymentNotes,
    });
  };

  const updatePayrollSettings = async (settings: Partial<PayrollSettings>): Promise<boolean> => {
    const current = db.payrollSettings || {
      lateDeductionEnabled: true,
      lateDeductionRatePerMinute: 1000,
      alphaDeductionEnabled: true,
      alphaDeductionRatePerDay: 125000,
      defaultMealAllowance: 200000,
      defaultTransportAllowance: 150000,
      includeLaborInHpp: true,
      harvestBonusPerKg: 150,
    };
    const merged = { ...current, ...settings };
    saveState({ ...db, payrollSettings: merged });
    addToast({ type: 'success', title: 'Pengaturan Payroll Disimpan' });
    return true;
  };

  // ======================== RESET & CLEAR ========================
  const resetToDemoData = async () => {
    setDb(INITIAL_DATABASE);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_DATABASE));
    } catch (e) {
      console.error('Failed saving to localStorage', e);
    }
    try {
      const res = await fetch('/api/database/reset', { method: 'POST' });
      if (res.ok) {
        clearPendingUpload();
        const result = await res.json();
        if (result?.data) {
          setDb(result.data);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result.data));
          } catch {}
        }
      } else {
        markPendingUpload();
      }
    } catch (err) {
      console.error('Failed resetting on server', err);
      markPendingUpload();
    }
    setLastSyncTime(new Date().toISOString());
    addToast({ type: 'success', title: 'Data Demo Dipulihkan', message: 'Seluruh sampel data telah dimuat kembali.' });
  };

  const clearAllData = async () => {
    const emptyDb: GreenhouseDatabase = {
      tunnels: [],
      transactions: [],
      cycles: [],
      harvests: [],
      investments: [],
      assets: [],
      inventory: [],
      stockMutations: [],
      debts: [],
      employees: [],
      workShifts: [],
      attendances: [],
      leaveRequests: [],
      overtimeRequests: [],
      payrolls: [],
      employeeAuditLogs: [],
      payrollSettings: INITIAL_DATABASE.payrollSettings,
      lastSynced: new Date().toISOString(),
    };
    setDb(emptyDb);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(emptyDb));
    } catch (e) {
      console.error('Failed saving to localStorage', e);
    }
    try {
      const res = await fetch('/api/database/clear', { method: 'POST' });
      if (res.ok) {
        clearPendingUpload();
        const result = await res.json();
        if (result?.data) {
          setDb(result.data);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result.data));
          } catch {}
        }
      } else {
        markPendingUpload();
      }
    } catch (err) {
      console.error('Failed clearing on server', err);
      markPendingUpload();
    }
    setLastSyncTime(new Date().toISOString());
    addToast({ type: 'warning', title: 'Data Dikosongkan', message: 'Seluruh data demo transaksi, siklus, dan aset telah dihapus. Siap untuk input operasional murni.' });
  };

  const importDatabase = async (imported: GreenhouseDatabase): Promise<boolean> => {
    if (!imported || !Array.isArray(imported.transactions)) {
      addToast({ type: 'error', title: 'Format File Tidak Sesuai' });
      return false;
    }
    saveState(migrateLegacyGreenhouseNaming(imported).data);
    addToast({ type: 'success', title: 'Database Berhasil Diimpor' });
    return true;
  };

  // Sync entire database to Google Sheets
  const syncAllToGoogleSheets = async (): Promise<boolean> => {
    const url = sheetsWebhookUrl || getStoredSheetsWebhook();
    if (!url) {
      addToast({
        type: 'error',
        title: 'URL Webhook Belum Diatur',
        message: 'Masukkan URL Web App Google Sheets di menu Pengaturan & Integrasi terlebih dahulu.',
      });
      return false;
    }
    setIsSheetsSyncing(true);
    try {
      const res = await syncAllDataToSheets(url, db);
      if (res.success) {
        const now = new Date().toISOString();
        setLastSheetsSyncState(now);
        saveStoredLastSync(now);
        addToast({
          type: 'success',
          title: 'Sinkronisasi Spreadsheet Berhasil!',
          message: 'Seluruh data transaksi, siklus, panen, investasi, dan stok berhasil diperbarui di Google Sheets.',
        });
        return true;
      } else {
        addToast({
          type: 'error',
          title: 'Sinkronisasi Gagal',
          message: res.error || res.message,
        });
        return false;
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Menghubungi Server',
        message: err.message || 'Periksa koneksi internet Anda.',
      });
      return false;
    } finally {
      setIsSheetsSyncing(false);
    }
  };

  return (
    <GreenhouseContext.Provider
      value={{
        db,
        loading,
        metrics,
        lowStockItems,
        toasts,
        addToast,
        removeToast,
        addTunnel,
        updateTunnel,
        deleteTunnel,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addCycle,
        updateCycle,
        deleteCycle,
        addHarvest,
        updateHarvest,
        deleteHarvest,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        addAsset,
        updateAsset,
        deleteAsset,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        recordStockMutation,
        addDebt,
        updateDebt,
        deleteDebt,
        // HR, Absensi & Payroll Module
        employees: db.employees || [],
        workShifts: db.workShifts || [],
        attendances: db.attendances || [],
        leaveRequests: db.leaveRequests || [],
        overtimeRequests: db.overtimeRequests || [],
        payrolls: db.payrolls || [],
        payrollSettings: db.payrollSettings || INITIAL_DATABASE.payrollSettings || {
          lateDeductionEnabled: true,
          lateDeductionRatePerMinute: 1000,
          alphaDeductionEnabled: true,
          alphaDeductionRatePerDay: 125000,
          defaultMealAllowance: 200000,
          defaultTransportAllowance: 150000,
          includeLaborInHpp: true,
          harvestBonusPerKg: 150,
        },
        employeeAuditLogs: db.employeeAuditLogs || [],
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addWorkShift,
        updateWorkShift,
        deleteWorkShift,
        clockIn,
        clockOut,
        recordAttendance,
        updateAttendance,
        deleteAttendance,
        addLeaveRequest,
        updateLeaveRequestStatus,
        approveLeaveRequest: (id: string) => updateLeaveRequestStatus(id, 'Disetujui'),
        rejectLeaveRequest: (id: string, reason?: string) => updateLeaveRequestStatus(id, 'Ditolak', reason),
        deleteLeaveRequest,
        addOvertimeRequest,
        updateOvertimeRequestStatus,
        deleteOvertimeRequest,
        addAttendanceRecord: recordAttendance,
        updateAttendanceRecord: updateAttendance,
        recordClockIn: async (empId: string) => {
          const res = await clockIn(empId);
          return res.success;
        },
        recordClockOut: async (empId: string) => {
          const res = await clockOut(empId);
          return res.success;
        },
        requestLeave: addLeaveRequest,
        approveLeave: (id: string) => updateLeaveRequestStatus(id, 'Disetujui'),
        rejectLeave: (id: string, reason?: string) => updateLeaveRequestStatus(id, 'Ditolak', reason),
        requestOvertime: addOvertimeRequest,
        approveOvertimeRequest: (id: string) => updateOvertimeRequestStatus(id, 'Approved'),
        rejectOvertimeRequest: (id: string) => updateOvertimeRequestStatus(id, 'Rejected'),
        approveOvertime: (id: string) => updateOvertimeRequestStatus(id, 'Approved'),
        rejectOvertime: (id: string) => updateOvertimeRequestStatus(id, 'Rejected'),
        generateMonthlyPayroll,
        calculateMonthlyPayroll: generateMonthlyPayroll,
        updatePayrollRecord,
        approvePayroll,
        approvePayrollRecord: approvePayroll,
        payPayroll,
        deletePayrollRecord,
        addHarvestBonusToPayroll,
        updatePayrollSettings,
        addAuditLog,
        currentUser,
        users,
        login,
        logout,
        updateCurrentUserProfile,
        addUser,
        updateUser,
        deleteUser,
        resetToDemoData,
        clearAllData,
        importDatabase,
        refreshData,
        isSyncing,
        lastSyncTime,
        sheetsWebhookUrl,
        lastSheetsSync,
        isSheetsSyncing,
        setSheetsWebhookUrl,
        syncAllToGoogleSheets,
      }}
    >
      {children}
    </GreenhouseContext.Provider>
  );
};

export const useGreenhouse = () => {
  const context = useContext(GreenhouseContext);
  if (!context) {
    throw new Error('useGreenhouse must be used within a GreenhouseProvider');
  }
  return context;
};
