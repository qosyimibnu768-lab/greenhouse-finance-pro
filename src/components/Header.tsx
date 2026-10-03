import React, { useState } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { formatCurrency } from '../utils/formatters';
import { NavItemKey } from './Navigation';
import { EditProfileModal } from './EditProfileModal';
import { MobileNavDrawer } from './MobileNavDrawer';
import { Plus, AlertTriangle, Wallet, LogOut, Lock, KeyRound, RefreshCw, Menu } from 'lucide-react';

interface HeaderProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  onOpenAddTransaction: () => void;
  hrSubtab?: string;
  onSelectHrSubtab?: (sub: any) => void;
}

const TAB_TITLES: Record<NavItemKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard Keuangan', subtitle: 'Ringkasan arus kas, omzet, laba, dan kesehatan bisnis greenhouse' },
  transaksi: { title: 'Daftar Transaksi', subtitle: 'Pencatatan pemasukan, biaya operasional, dan modal investasi' },
  'kalender-panen': { title: 'Kalender Panen & Jadwal Tanam', subtitle: 'Peta visual fase HST, rotasi tanam antar tunnel, dan proyeksi omzet panen' },
  siklus: { title: 'Siklus Tanam Melon', subtitle: 'Manajemen siklus, populasi tanaman DFT, target panen, dan HPP' },
  panen: { title: 'Panen & Penjualan', subtitle: 'Data timbangan panen per grade, harga jual, dan omzet per siklus' },
  tunnels: { title: 'Manajemen Greenhouse', subtitle: 'Kelola ukuran, kapasitas tanaman, sistem hidroponik, dan unit greenhouse' },
  investasi: { title: 'Investasi Greenhouse', subtitle: 'Rincian belanja modal bambu petung, UV net, gully DFT, dan tandon' },
  stok: { title: 'Stok Bahan & Nutrisi', subtitle: 'Inventori pupuk AB Mix, benih melon, pestisida, dan media tanam' },
  aset: { title: 'Aset Greenhouse', subtitle: 'Daftar kepemilikan aset fisik, kondisi, dan umur ekonomis' },
  'hutang-piutang': { title: 'Hutang & Piutang', subtitle: 'Kontrol tagihan supplier bibit/pupuk dan tempo pembayaran toko buah' },
  laporan: { title: 'Laporan Keuangan & BEP', subtitle: 'Laba rugi, cash flow bulanan, titik impas (BEP), dan kalkulasi ROI' },
  'hr-payroll': { title: 'HR, Absensi & Payroll Karyawan', subtitle: 'Kelola data karyawan, presensi digital, shift, lembur, dan payroll terintegrasi finance' },
  users: { title: 'Profil & Manajemen Pengguna', subtitle: 'Kelola data akun pribadi, hak akses peran, dan manajemen tim kebun' },
  pengaturan: { title: 'Pengaturan & Integrasi', subtitle: 'Google Sheets sync, Apple Shortcuts API, dan manajemen backup' },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddTransaction,
  hrSubtab,
  onSelectHrSubtab,
}) => {
  const { metrics, lowStockItems, currentUser, logout, addToast, isSyncing, refreshData } = useGreenhouse();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<'profile' | 'password'>('profile');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const info = TAB_TITLES[currentTab] || { title: 'Greenhouse Finance Pro', subtitle: 'Manajemen Keuangan' };

  const handleManualSync = async () => {
    try {
      const syncOk = await refreshData(false);
      if (syncOk) {
        addToast({
          type: 'success',
          title: 'Sinkronisasi Berhasil',
          message: 'Data terbaru dari HP dan Web PC telah tersinkronisasi.',
        });
      } else {
        addToast({
          type: 'error',
          title: 'Gagal Sinkronisasi',
          message: 'Server sinkronisasi tidak terjangkau. Data Anda tetap aman di perangkat ini.',
        });
      }
    } catch {
      addToast({
        type: 'error',
        title: 'Gagal Sinkronisasi',
        message: 'Periksa koneksi jaringan internet Anda.',
      });
    }
  };

  const handleLogout = () => {
    logout();
    addToast({
      type: 'info',
      title: 'Sesi Berakhir',
      message: 'Anda telah berhasil keluar dari akun.',
    });
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
          {/* Left: Mobile Hamburger & Title */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition active:scale-95 shrink-0"
              aria-label="Buka Menu Navigasi"
            >
              <Menu className="w-5 h-5 text-slate-800" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">
                  {info.title}
                </h1>
                {lowStockItems.length > 0 && currentTab !== 'stok' && (
                  <button
                    onClick={() => onSelectTab('stok')}
                    className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold hover:bg-amber-100 transition shrink-0 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{lowStockItems.length} Menipis</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden sm:block mt-0.5 truncate">{info.subtitle}</p>
            </div>
          </div>

          {/* Right side: Quick stats & Action & User Profile */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0">
            {/* Quick Balance Preview */}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
              <div className="leading-tight">
                <span className="text-[9px] sm:text-[10px] text-slate-500 block">Saldo</span>
                <span className={`font-bold text-[11px] sm:text-xs font-mono ${metrics.saldoKas >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  {formatCurrency(metrics.saldoKas)}
                </span>
              </div>
            </div>

            {/* Real-time Multi-Device Sync Button (HP & PC) */}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-700 text-xs font-bold transition active:scale-95 border border-slate-200/80 cursor-pointer shadow-2xs"
              title="Sinkronisasi Multi-Perangkat (HP & PC). Klik untuk update data terbaru."
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{isSyncing ? 'Sinkron...' : 'Sinkron'}</span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" title="Cloud Sync Aktif" />
            </button>

            {/* Quick Add Transaction Desktop Button */}
            <button
              onClick={onOpenAddTransaction}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs hover:shadow-md transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Transaksi</span>
            </button>

            {/* Active User Profile Pill & Actions */}
            {currentUser && (
              <div className="flex items-center gap-1 sm:gap-1.5 pl-1 sm:pl-2 border-l border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setProfileInitialTab('profile');
                    setIsEditProfileOpen(true);
                  }}
                  className="flex items-center gap-1.5 p-0.5 sm:p-1 rounded-2xl hover:bg-slate-100 transition cursor-pointer text-left"
                  title="Klik untuk Edit Profil & Akun Anda"
                >
                  <div className="hidden lg:flex flex-col text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                        {currentUser.name.split(' ')[0]}
                      </span>
                      <span title="Keamanan Kata Sandi Aktif">
                        <Lock className="w-3 h-3 text-emerald-600" />
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[120px]">
                      {currentUser.role}
                    </span>
                  </div>
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover border border-slate-200 ring-2 ring-emerald-500/20"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                      {currentUser.name[0]}
                    </div>
                  )}
                </button>

                {/* Direct Shortcut to Change Password */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileInitialTab('password');
                    setIsEditProfileOpen(true);
                  }}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer flex items-center gap-1"
                  title="Ganti Kata Sandi Akun"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline text-[11px] font-bold">Ganti Sandi</span>
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Keluar / Ganti Akun"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Slide-Out Drawer */}
      <MobileNavDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        onSelectHrSubtab={onSelectHrSubtab}
        hrSubtab={hrSubtab}
      />

      {/* Edit Profile & Password Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        initialTab={profileInitialTab}
      />
    </>
  );
};
