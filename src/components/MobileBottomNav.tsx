import React, { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  ShoppingBag,
  MoreHorizontal,
  Sprout,
  Landmark,
  Package,
  Layers,
  CreditCard,
  BarChart3,
  Settings,
  X,
  Warehouse,
  Users,
  CalendarDays,
} from 'lucide-react';
import { NavItemKey } from './Navigation';
import { useGreenhouse } from '../context/GreenhouseContext';

interface MobileBottomNavProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  onOpenAddTransaction: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddTransaction,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { lowStockItems, db, users } = useGreenhouse();
  const tunnels = db.tunnels || [];

  const moreItems: { key: NavItemKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    { key: 'kalender-panen', label: 'Kalender Panen', icon: <CalendarDays className="w-5 h-5 text-emerald-600" />, badge: 'Rotasi' },
    { key: 'tunnels', label: 'Manajemen GH', icon: <Warehouse className="w-5 h-5 text-emerald-600" />, badge: tunnels.length > 0 ? `${tunnels.length} Unit` : undefined },
    { key: 'siklus', label: 'Siklus Tanam', icon: <Sprout className="w-5 h-5 text-emerald-600" /> },
    { key: 'investasi', label: 'Investasi', icon: <Landmark className="w-5 h-5 text-amber-600" /> },
    {
      key: 'stok',
      label: 'Stok Bahan',
      icon: <Package className="w-5 h-5 text-blue-600" />,
      badge: lowStockItems.length > 0 ? `${lowStockItems.length} Menipis` : undefined,
    },
    { key: 'aset', label: 'Aset Greenhouse', icon: <Layers className="w-5 h-5 text-purple-600" /> },
    { key: 'hutang-piutang', label: 'Hutang & Piutang', icon: <CreditCard className="w-5 h-5 text-rose-600" /> },
    { key: 'laporan', label: 'Laporan & BEP', icon: <BarChart3 className="w-5 h-5 text-emerald-600" /> },
    { key: 'hr-payroll', label: 'HR & Payroll', icon: <Users className="w-5 h-5 text-teal-600" /> },
    { key: 'users', label: 'Profil & Pengguna', icon: <Users className="w-5 h-5 text-indigo-600" />, badge: users.length > 0 ? `${users.length} Akun` : undefined },
    { key: 'pengaturan', label: 'Pengaturan & Integrasi', icon: <Settings className="w-5 h-5 text-slate-600" /> },
  ];

  return (
    <>
      {/* More Menu Drawer (Mobile) */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-in fade-in">
          <div className="bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900">Menu Lainnya</span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {moreItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    onSelectTab(item.key);
                    setShowMoreMenu(false);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                    currentTab === item.key
                      ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-950'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {item.icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-tight truncate">{item.label}</p>
                    {item.badge && (
                      <span className="text-[10px] text-rose-600 font-medium">{item.badge}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 shadow-lg safe-area-pb">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Dashboard */}
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition cursor-pointer ${
              currentTab === 'dashboard' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Dashboard</span>
          </button>

          {/* Transaksi */}
          <button
            onClick={() => onSelectTab('transaksi')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition cursor-pointer ${
              currentTab === 'transaksi' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Transaksi</span>
          </button>

          {/* Prominent Center Action: + TRANSAKSI (iPhone one-hand friendly) */}
          <div className="relative -top-4">
            <button
              onClick={onOpenAddTransaction}
              className="w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex flex-col items-center justify-center shadow-lg shadow-emerald-700/30 ring-4 ring-white transition cursor-pointer"
              title="Tambah Transaksi Cepat"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
              <span className="text-[8px] font-extrabold tracking-tight uppercase leading-none">Catat</span>
            </button>
          </div>

          {/* Panen */}
          <button
            onClick={() => onSelectTab('panen')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition cursor-pointer ${
              currentTab === 'panen' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Panen</span>
          </button>

          {/* Lainnya */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition cursor-pointer ${
              !['dashboard', 'transaksi', 'panen'].includes(currentTab)
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Lainnya</span>
          </button>
        </div>
      </div>
    </>
  );
};
