import React, { useState } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import {
  KeyRound,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  RefreshCw,
  Phone,
  ShieldAlert,
  Building2,
  Sparkles,
  HelpCircle,
  Check,
} from 'lucide-react';
import { AppUser } from '../types';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessReset: (username: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccessReset,
}) => {
  const { users, updateUser, addToast } = useGreenhouse();

  const [activeTab, setActiveTab] = useState<'reset' | 'admin_help'>('reset');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Search User
  const [accountQuery, setAccountQuery] = useState('');
  const [matchedUser, setMatchedUser] = useState<AppUser | null>(null);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Step 2: Verification Code
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('849201');
  const [codeSent, setCodeSent] = useState(false);
  const [codeError, setCodeError] = useState('');

  // Step 3: New Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSearchAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    if (!accountQuery.trim()) {
      setSearchError('Silakan masukkan username atau email terdaftar.');
      return;
    }
    setIsSearching(true);
    setTimeout(() => {
      const q = accountQuery.trim().toLowerCase();
      const found = users.find(
        (u) =>
          u.username.toLowerCase() === q ||
          u.email.toLowerCase() === q ||
          (u.phone && u.phone.replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, '')))
      );

      if (found) {
        setMatchedUser(found);
        // generate a realistic 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedCode(code);
        setCodeSent(true);
        setStep(2);
      } else {
        setSearchError('Akun tidak ditemukan. Pastikan username atau email sudah benar.');
      }
      setIsSearching(false);
    }, 400);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    if (verificationCode.trim() !== generatedCode) {
      setCodeError('Kode verifikasi salah atau telah kadaluarsa. Silakan periksa kembali.');
      return;
    }
    setStep(3);
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (!matchedUser) {
      setPasswordError('Data akun tidak valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await updateUser(matchedUser.id, {
        password: newPassword,
      });

      if (success) {
        setStep(4);
        addToast({
          type: 'success',
          title: 'Kata Sandi Berhasil Direset',
          message: `Kata sandi akun ${matchedUser.username} telah diperbarui. Silakan login.`,
        });
      } else {
        setPasswordError('Gagal memperbarui kata sandi. Silakan coba lagi.');
      }
    } catch (err) {
      console.error(err);
      setPasswordError('Terjadi kesalahan sistem saat memperbarui kata sandi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishAndLogin = () => {
    if (matchedUser) {
      onSuccessReset(matchedUser.username);
    }
    onClose();
  };

  // Quick Emergency Reset to default 'ibnu123'
  const handleQuickEmergencyReset = async (user: AppUser) => {
    const success = await updateUser(user.id, {
      password: 'ibnu123',
    });
    if (success) {
      addToast({
        type: 'success',
        title: 'Reset Cepat Berhasil',
        message: `Kata sandi untuk ${user.username} telah dikembalikan ke default: "ibnu123"`,
      });
      onSuccessReset(user.username);
      onClose();
    }
  };

  // Mask email for privacy (e.g. i***@greenhouse.id)
  const maskEmail = (emailStr: string) => {
    if (!emailStr.includes('@')) return emailStr;
    const [namePart, domain] = emailStr.split('@');
    if (namePart.length <= 2) return `${namePart}***@${domain}`;
    return `${namePart.slice(0, 2)}***${namePart.slice(-1)}@${domain}`;
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[a-zA-Z]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, text: 'Lemah', color: 'bg-rose-500 text-rose-600' };
    if (score <= 4) return { score: 2, text: 'Sedang', color: 'bg-amber-500 text-amber-600' };
    return { score: 3, text: 'Kuat & Aman', color: 'bg-emerald-500 text-emerald-600' };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Pemulihan Kata Sandi</h3>
              <p className="text-xs text-slate-500">
                Atur ulang kata sandi login sistem greenhouse secara mandiri & aman
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-100 px-5 pt-3 gap-2 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('reset')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'reset'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Reset Mandiri Akun</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin_help')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'admin_help'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Bantuan Super Admin</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {activeTab === 'reset' && (
            <div>
              {/* Stepper indicator */}
              <div className="flex items-center justify-between mb-6 px-1">
                {[
                  { num: 1, label: 'Cari Akun' },
                  { num: 2, label: 'Verifikasi' },
                  { num: 3, label: 'Sandi Baru' },
                  { num: 4, label: 'Selesai' },
                ].map((s, idx) => (
                  <React.Fragment key={s.num}>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                          step === s.num
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                            : step > s.num
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                      </div>
                      <span
                        className={`text-[10px] font-bold ${
                          step === s.num
                            ? 'text-emerald-800'
                            : step > s.num
                            ? 'text-slate-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {idx < 3 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 -mt-4 transition ${
                          step > s.num ? 'bg-emerald-400' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* STEP 1: Search Account */}
              {step === 1 && (
                <form onSubmit={handleSearchAccount} className="space-y-4">
                  {searchError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{searchError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Username atau Email Terdaftar
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Masukkan identitas akun yang ingin Anda pulihkan kata sandinya:
                    </p>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={accountQuery}
                        onChange={(e) => setAccountQuery(e.target.value)}
                        placeholder="Contoh: ibnu atau ibnu@greenhouse.id"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  {/* Quick-fill helper with existing active accounts */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Akun Terdaftar di Sistem:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {users.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setAccountQuery(u.username)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <span className="font-bold text-slate-900">{u.username}</span>
                          <span className="text-slate-400">({u.role.split(' ')[0]})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md shadow-slate-950/20 transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-75"
                    >
                      {isSearching ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Mencari Akun...</span>
                        </>
                      ) : (
                        <>
                          <span>Lanjut Verifikasi</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Verification Code */}
              {step === 2 && matchedUser && (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  {codeError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{codeError}</span>
                    </div>
                  )}

                  {/* Matched User Card */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {matchedUser.avatarUrl ? (
                        <img
                          src={matchedUser.avatarUrl}
                          alt={matchedUser.name}
                          className="w-10 h-10 rounded-xl object-cover border border-emerald-300 ring-2 ring-emerald-500/20"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-800 font-bold flex items-center justify-center text-sm">
                          {matchedUser.name[0]}
                        </div>
                      )}
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900">{matchedUser.name}</h4>
                        <p className="text-[11px] text-slate-600 font-mono">@{matchedUser.username}</p>
                        <span className="text-[10px] text-emerald-800 font-medium">
                          {maskEmail(matchedUser.email)}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      Terverifikasi
                    </span>
                  </div>

                  {/* Verification Info & Code Box */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">
                      Kode Verifikasi Keamanan 6 Digit
                    </label>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Sistem telah membuat kode verifikasi untuk akun Anda. Masukkan kode 6 digit di bawah ini untuk mengonfirmasi bahwa Anda adalah pemilik akun:
                    </p>

                    {/* Simulation badge with the generated OTP */}
                    <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-inner">
                      <div>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                          Kode Verifikasi OTP Anda:
                        </span>
                        <div className="text-2xl font-black font-mono tracking-widest text-emerald-300">
                          {generatedCode}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Berlaku selama 15 menit ke depan
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationCode(generatedCode);
                          addToast({
                            type: 'info',
                            title: 'Kode Terisi Otomatis',
                            message: 'Kode verifikasi telah disalin ke kolom input.',
                          });
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl transition cursor-pointer active:scale-95"
                      >
                        Isi Otomatis
                      </button>
                    </div>

                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Masukkan 6 digit angka"
                      required
                      className="w-full text-center tracking-widest font-mono text-lg font-black py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                    />
                  </div>

                  <div className="pt-2 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      &larr; Ganti Akun
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md shadow-slate-950/20 transition active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <span>Verifikasi Kode</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Set New Password */}
              {step === 3 && matchedUser && (
                <form onSubmit={handleSaveNewPassword} className="space-y-4">
                  {passwordError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    Akun: <strong className="text-slate-900">@{matchedUser.username}</strong> ({matchedUser.name})
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Kata Sandi Baru
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        required
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Strength Indicator */}
                    {newPassword && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Kekuatan Sandi:</span>
                          <span className={`font-bold ${strength.color.split(' ')[1]}`}>
                            {strength.text}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                          <div
                            className={`h-full flex-1 rounded-full ${
                              strength.score >= 1 ? strength.color.split(' ')[0] : 'bg-slate-200'
                            }`}
                          />
                          <div
                            className={`h-full flex-1 rounded-full ${
                              strength.score >= 2 ? strength.color.split(' ')[0] : 'bg-slate-200'
                            }`}
                          />
                          <div
                            className={`h-full flex-1 rounded-full ${
                              strength.score >= 3 ? strength.color.split(' ')[0] : 'bg-slate-200'
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Konfirmasi Kata Sandi Baru
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ketik ulang kata sandi baru"
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      &larr; Kembali
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md shadow-emerald-950/20 transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-75"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan Sandi...</span>
                        </>
                      ) : (
                        <>
                          <span>Simpan Sandi Baru</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 4: Success Screen */}
              {step === 4 && matchedUser && (
                <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-lg shadow-emerald-900/10">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-slate-900">Kata Sandi Berhasil Diperbarui!</h4>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto">
                      Akun <strong>@{matchedUser.username}</strong> kini telah memiliki kata sandi baru. Anda dapat langsung menggunakannya untuk login ke dalam sistem.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 font-medium">
                    Sistem telah memperbarui kredensial Anda dan data telah tersinkronisasi.
                  </div>

                  <button
                    type="button"
                    onClick={handleFinishAndLogin}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/20 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Masuk dengan Kata Sandi Baru</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Super Admin Help */}
          {activeTab === 'admin_help' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Building2 className="w-4 h-4" />
                  <span>Dukungan Manajemen Greenhouse</span>
                </div>
                <h4 className="font-extrabold text-sm">Butuh Bantuan Administrator?</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Jika Anda kehilangan akses ke email/ponsel terdaftar atau lupa kredensial login, Anda dapat menghubungi Super Admin/Owner perkebunan untuk mereset akun Anda dari menu <strong>Manajemen Pengguna</strong>.
                </p>
              </div>

              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-700 block">
                  Daftar Administrator Resmi:
                </span>
                {users
                  .filter((u) => u.role === 'Owner / Super Admin' || u.role === 'Manajer Operasional')
                  .map((adm) => (
                    <div
                      key={adm.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={adm.avatarUrl}
                          alt={adm.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-300"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-extrabold text-xs text-slate-900">{adm.name}</h5>
                            <span className="text-[10px] px-2 py-0.2 rounded-md bg-purple-100 text-purple-800 font-bold">
                              {adm.role.split(' ')[0]}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono">@{adm.username} · {adm.email}</p>
                          <p className="text-[11px] text-emerald-700 font-semibold">{adm.phone || '0812-3456-7890'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Fast Emergency Reset Button for default account */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Opsi Pemulihan Cepat Default</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Untuk keperluan pengujian atau kondisi darurat di kebun, Anda dapat mengembalikan kata sandi akun Owner <strong>(ibnu)</strong> ke default pabrik: <code className="bg-amber-100 px-1 py-0.5 rounded font-bold font-mono">ibnu123</code>.
                </p>
                <div className="pt-1">
                  {users.find((u) => u.username === 'ibnu') && (
                    <button
                      type="button"
                      onClick={() => {
                        const ibnuUser = users.find((u) => u.username === 'ibnu');
                        if (ibnuUser) handleQuickEmergencyReset(ibnuUser);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer active:scale-95 shadow-sm"
                    >
                      Reset Akun Ibnu ke "ibnu123"
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
