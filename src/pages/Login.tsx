import React, { useState, useMemo } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { AuthUser } from '../types';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, addToast, users } = useGreenhouse();

  const activeUsers = useMemo(() => {
    return users && users.length > 0 ? users.filter((u) => u.status === 'Aktif') : [];
  }, [users]);

  // Form States
  const [username, setUsername] = useState(activeUsers[0]?.username || 'ibnu');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password Modal State
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!username.trim() || !password.trim()) {
      setPasswordError('Silakan masukkan username/email dan kata sandi.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const q = username.trim().toLowerCase();
      const foundUser = activeUsers.find(
        (u) =>
          (u.username.toLowerCase() === q || u.email.toLowerCase() === q) &&
          u.password === password
      );

      if (foundUser) {
        const authUser: AuthUser = {
          id: foundUser.id,
          name: foundUser.name,
          email: foundUser.email,
          username: foundUser.username,
          role: foundUser.role,
          avatarUrl: foundUser.avatarUrl,
          phone: foundUser.phone,
          loginMethod: 'password',
          lastLogin: new Date().toISOString(),
        };

        login(authUser);
        addToast({
          type: 'success',
          title: 'Login Berhasil',
          message: `Selamat datang kembali, ${foundUser.name}!`,
        });
      } else {
        setPasswordError('Username atau kata sandi tidak cocok. Silakan coba lagi atau gunakan opsi Lupa Sandi.');
        setIsSubmitting(false);
      }
    }, 450);
  };

  const handleQuickFill = (uname: string, pwd?: string) => {
    setUsername(uname);
    if (pwd) setPassword(pwd);
    setPasswordError('');
    addToast({
      type: 'info',
      title: 'Akun Dipilih',
      message: `Form diisi dengan akun "${uname}".`,
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Gradients & Accents */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 space-y-6">
          {/* Header Branding */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-lg shadow-emerald-900/30 mb-1">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Greenhouse Finance Pro</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Masuk ke Sistem
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Sistem Akuntansi, HPP & Manajemen Perkebunan Melon Premium
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs animate-in shake duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed">{passwordError}</span>
              </div>
            )}

            {/* Username / Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Username atau Email Perusahaan
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="Contoh: ibnu atau ibnu@greenhouse.id"
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-2xs"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 block">Kata Sandi</label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline transition cursor-pointer flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Lupa Sandi?</span>
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="Masukkan kata sandi Anda"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Ingat sesi saya di perangkat ini</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/20 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Akses...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-Test Accounts Pill */}
          <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold">
              <span>Bantuan Akun Default:</span>
              <span className="text-[10px] text-emerald-700 font-semibold">Klik untuk isi otomatis</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickFill(u.username, u.password || 'ibnu123')}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-800 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="font-bold text-slate-900">{u.username}</span>
                  <span className="text-slate-400 font-normal">({u.role.split(' ')[0]})</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">
              Kata sandi default akun Super Admin: <code className="bg-slate-200/70 px-1 py-0.5 rounded font-mono font-bold text-slate-900">ibnu123</code>
            </p>
          </div>

          {/* Security Badge */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Otentikasi Kredensial Aman · Enkripsi TLS & Proteksi Sesi</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onSuccessReset={(resetUsername) => {
          setUsername(resetUsername);
          setPassword('');
          setPasswordError('');
        }}
      />
    </div>
  );
};
