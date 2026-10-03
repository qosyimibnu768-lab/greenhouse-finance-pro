import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  CalendarDays,
  Sprout,
  ShoppingBag,
  Landmark,
  Warehouse,
  Package,
  Layers,
  CreditCard,
  BarChart3,
  Users,
  Settings,
  X,
  LogOut,
} from 'lucide-react';
import { NavItemKey } from './Navigation';
import { useGreenhouse } from '../context/GreenhouseContext';
import { formatCurrency } from '../utils/formatters';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  onSelectHrSubtab?: (subtab: string) => void;
  hrSubtab?: string;
}

const HR_SUBMENUS = [
  { key: 'dashboard', label: 'Dashboard HR' },
  { key: 'karyawan', label: 'Data Karyawan' },
  { key: 'absensi', label: 'Absensi' },
  { key: 'input-absensi', label: 'Input Absensi' },
  { key: 'rekap-absensi', label: 'Rekap Absensi' },
  { key: 'jadwal-shift', label: 'Jadwal / Shift' },
  { key: 'lembur', label: 'Lembur' },
  { key: 'izin-cuti', label: 'Izin / Sakit / Cuti' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'slip-gaji', label: 'Slip Gaji' },
  { key: 'riwayat-pembayaran', label: 'Riwayat Pembayaran' },
  { key: 'pengaturan-payroll', label: 'Pengaturan Payroll' },
];

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  onSelectHrSubtab,
  hrSubtab = 'dashboard',
}) => {
  const { db, currentUser, logout, metrics, lowStockItems, employees, users } = useGreenhouse();
  if (!isOpen) return null;

  const tunnels = db.tunnels || [];
  const activeCycles = (db.cycles || []).filter((c) => c.status !== 'Selesai');
  const activeStaffCount = (employees || []).filter((e) => !e.isDeleted).length;

  const navSections: {
    title: string;
    items: {
      key: NavItemKey;
      label: string;
      icon: React.ReactNode;
      badge?: string | number;
      badgeColor?: string;
    }[];
  }[] = [
    {
      title: 'Operasional Utama',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { key: 'transaksi', label: 'Daftar Transaksi', icon: <Receipt className="w-4 h-4" /> },
        { key: 'kalender-panen', label: 'Kalender & Jadwal', icon: <CalendarDays className="w-4 h-4" /> },
        { key: 'panen', label: 'Panen & Penjualan', icon: <ShoppingBag className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Budidaya & Unit Greenhouse',
      items: [
        {
          key: 'tunnels',
          label: 'Manajemen GH Tunnels',
          icon: <Warehouse className="w-4 h-4" />,
          badge: tunnels.length > 0 ? `${tunnels.length} Unit` : undefined,
        },
        {
          key: 'siklus',
          label: 'Siklus Tanam Melon',
          icon: <Sprout className="w-4 h-4" />,
          badge: activeCycles.length > 0 ? `${activeCycles.length} Aktif` : undefined,
          badgeColor: 'bg-emerald-500/20 text-emerald-300',
        },
        {
          key: 'stok',
          label: 'Stok Bahan & Pupuk',
          icon: <Package className="w-4 h-4" />,
          badge: lowStockItems.length > 0 ? `${lowStockItems.length} Menipis` : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-300',
        },
        { key: 'aset', label: 'Aset Fisik Kebun', icon: <Layers className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Keuangan & Tim',
      items: [
        { key: 'investasi', label: 'Investasi Greenhouse', icon: <Landmark className="w-4 h-4" /> },
        { key: 'hutang-piutang', label: 'Hutang & Piutang', icon: <CreditCard className="w-4 h-4" /> },
        { key: 'laporan', label: 'Laporan Keuangan & BEP', icon: <BarChart3 className="w-4 h-4" /> },
        {
          key: 'hr-payroll',
          label: 'HR & Payroll Karyawan',
          icon: <Users className="w-4 h-4" />,
          badge: activeStaffCount > 0 ? `${activeStaffCount} Staf` : undefined,
          badgeColor: 'bg-emerald-500/20 text-emerald-300',
        },
      ],
    },
    {
      title: 'Pengaturan Sistem',
      items: [
        {
          key: 'users',
          label: 'Profil & Pengguna',
          icon: <Users className="w-4 h-4" />,
          badge: users.length > 0 ? `${users.length} Akun` : undefined,
        },
        { key: 'pengaturan', label: 'Pengaturan & Integrasi', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-4/5 max-w-xs bg-slate-900 text-white flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-250">
        {/* Header Drawer */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-white shadow-md">
              GH
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-white leading-tight">Greenhouse Finance Pro</h2>
              <p className="text-[10px] text-emerald-400 font-medium">Tarno Jaya Farm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saldo Kas Quick Card */}
        <div className="mx-4 mt-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
          <span className="text-[10px] text-slate-400 block">Saldo Kas Saat Ini</span>
          <div className="flex items-baseline justify-between mt-0.5">
            <span
              className={`text-base font-black font-mono ${
                metrics.saldoKas >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(metrics.saldoKas)}
            </span>
            <span className="text-[10px] text-slate-400">{tunnels.length} Tunnel</span>
          </div>
        </div>

        {/* Scrollable Navigation Menu */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                {section.title}
              </span>
              {section.items.map((item) => {
                const isActive = currentTab === item.key;
                return (
                  <div key={item.key} className="space-y-1">
                    <button
                      onClick={() => {
                        onSelectTab(item.key);
                        if (item.key !== 'hr-payroll') {
                          onClose();
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/40'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                            item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300')
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>

                    {/* Nested HR Submenus in Mobile Drawer */}
                    {item.key === 'hr-payroll' && isActive && (
                      <div className="pl-3 pr-1 py-1 space-y-0.5 border-l-2 border-emerald-500/60 ml-4 animate-in fade-in">
                        {HR_SUBMENUS.map((sub) => {
                          const isSubActive = hrSubtab === sub.key;
                          return (
                            <button
                              key={sub.key}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectHrSubtab) onSelectHrSubtab(sub.key);
                                onClose();
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                                isSubActive
                                  ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/30'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                              }`}
                            >
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer User Info & Logout */}
        {currentUser && (
          <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  {currentUser.name[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.role}</p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
              title="Keluar Akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
