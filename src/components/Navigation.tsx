import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Sprout,
  ShoppingBag,
  Landmark,
  Package,
  Layers,
  CreditCard,
  BarChart3,
  Settings,
  Leaf,
  ShieldCheck,
  Warehouse,
  Users,
  CalendarDays,
} from 'lucide-react';
import { useGreenhouse } from '../context/GreenhouseContext';

export type NavItemKey =
  | 'dashboard'
  | 'transaksi'
  | 'kalender-panen'
  | 'siklus'
  | 'panen'
  | 'investasi'
  | 'tunnels'
  | 'stok'
  | 'aset'
  | 'hutang-piutang'
  | 'laporan'
  | 'hr-payroll'
  | 'users'
  | 'pengaturan';

interface NavigationProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  hrSubtab?: string;
  onSelectHrSubtab?: (sub: any) => void;
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

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  hrSubtab = 'dashboard',
  onSelectHrSubtab,
}) => {
  const { lowStockItems, db, users, employees } = useGreenhouse();
  const activeCycles = (db.cycles || []).filter((c) => c.status !== 'Selesai');
  const activeCyclesCount = activeCycles.length;
  const tunnels = db.tunnels || [];
  const activeEmployeesCount = (employees || []).filter((e) => !e.isDeleted).length;
  const totalCapacity = tunnels.reduce((acc, t) => acc + (Number(t.capacityPlants) || 0), 0);

  const uniqueSystems = Array.from(
    new Set(tunnels.map((t) => t.systemType?.trim()).filter(Boolean) as string[])
  );
  const sistemBudidayaText = uniqueSystems.length > 0 ? uniqueSystems.join(', ') : 'DFT Hydroponic';

  const activeVarieties = Array.from(
    new Set(activeCycles.map((c) => c.melonVariety?.trim()).filter(Boolean) as string[])
  );

  let brandSubtitle = 'Greenhouse Melon Premium';
  if (tunnels.length > 0) {
    const sysName = uniqueSystems[0] || 'DFT Hydroponic';
    const varName = activeVarieties.length > 0 ? ` · ${activeVarieties[0]}` : '';
    brandSubtitle = `${tunnels.length} Unit (${sysName}${varName})`;
  } else if (activeVarieties.length > 0) {
    brandSubtitle = `Melon ${activeVarieties.join(', ')}`;
  }

  const navItems: { key: NavItemKey; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'transaksi', label: 'Transaksi', icon: <Receipt className="w-4 h-4" /> },
    {
      key: 'kalender-panen',
      label: 'Kalender Panen',
      icon: <CalendarDays className="w-4 h-4" />,
      badge: 'Rotasi',
    },
    {
      key: 'siklus',
      label: 'Siklus Tanam',
      icon: <Sprout className="w-4 h-4" />,
      badge: activeCyclesCount > 0 ? `${activeCyclesCount} Aktif` : undefined,
    },
    { key: 'panen', label: 'Panen & Penjualan', icon: <ShoppingBag className="w-4 h-4" /> },
    { key: 'tunnels', label: 'Manajemen GH', icon: <Warehouse className="w-4 h-4" />, badge: tunnels.length > 0 ? `${tunnels.length} Unit` : undefined },
    { key: 'investasi', label: 'Investasi', icon: <Landmark className="w-4 h-4" /> },
    {
      key: 'stok',
      label: 'Stok Bahan',
      icon: <Package className="w-4 h-4" />,
      badge: lowStockItems.length > 0 ? `${lowStockItems.length} Menipis` : undefined,
    },
    { key: 'aset', label: 'Aset Greenhouse', icon: <Layers className="w-4 h-4" /> },
    { key: 'hutang-piutang', label: 'Hutang & Piutang', icon: <CreditCard className="w-4 h-4" /> },
    { key: 'laporan', label: 'Laporan & BEP', icon: <BarChart3 className="w-4 h-4" /> },
    {
      key: 'hr-payroll',
      label: 'HR & Payroll',
      icon: <Users className="w-4 h-4" />,
      badge: activeEmployeesCount > 0 ? `${activeEmployeesCount} Staf` : undefined,
    },
    { key: 'users', label: 'Profil & Pengguna', icon: <Users className="w-4 h-4" />, badge: users.length > 0 ? `${users.length} Akun` : undefined },
    { key: 'pengaturan', label: 'Pengaturan & Integrasi', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0 text-slate-300">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-950/40">
            <Leaf className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              GREENHOUSE <span className="text-emerald-400 text-xs font-semibold">FINANCE PRO</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[155px]" title={brandSubtitle}>
              {brandSubtitle}
            </p>
          </div>
        </div>
        {/* Spec Overview */}
        <div className="mt-4 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">{tunnels.length} Unit Greenhouse</span>
            <span className="text-emerald-400 font-semibold">{totalCapacity.toLocaleString('id-ID')} Tanaman</span>
          </div>
          <div className="flex justify-between items-center text-[11px] mt-1">
            <span className="text-slate-400">Sistem Budidaya</span>
            <span className="text-white font-medium truncate max-w-[120px] text-right" title={sistemBudidayaText}>
              {sistemBudidayaText}
            </span>
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentTab === item.key;
          return (
            <div key={item.key} className="space-y-1">
              <button
                onClick={() => {
                  onSelectTab(item.key);
                  if (item.key === 'hr-payroll' && onSelectHrSubtab && !isActive) {
                    onSelectHrSubtab(hrSubtab || 'dashboard');
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      item.key === 'stok' && lowStockItems.length > 0
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>

              {/* Submenus for HR & Payroll */}
              {item.key === 'hr-payroll' && isActive && (
                <div className="pl-3 pr-1 py-1 space-y-0.5 border-l-2 border-emerald-600/60 ml-4 animate-in fade-in">
                  {HR_SUBMENUS.map((sub) => {
                    const isSubActive = hrSubtab === sub.key;
                    return (
                      <button
                        key={sub.key}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectHrSubtab) onSelectHrSubtab(sub.key);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                          isSubActive
                            ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
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
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Sistem Siap Sinkron</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">v1.2</span>
      </div>
    </aside>
  );
};
