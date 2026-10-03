import React, { useState, useEffect } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { Transaction, TransactionType, ExpenseGroup, PaymentMethod, TunnelType } from '../types';
import { X, Camera, AlertCircle, Mic, MicOff, Sparkles } from 'lucide-react';
import { parseVoiceTransaction } from '../utils/voiceParser';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Transaction | null;
}

const CATEGORIES_PEMASUKAN = [
  'Penjualan melon',
  'Penjualan lainnya',
  'Modal Masuk',
  'Pinjaman',
  'Pendapatan lainnya',
];

const CATEGORIES_PENGELUARAN_OPERASIONAL = [
  'Benih',
  'AB Mix',
  'Nutrisi Tambahan',
  'Pestisida',
  'Fungisida',
  'Insektisida',
  'Media tanam',
  'Listrik',
  'Air',
  'Tenaga kerja',
  'Gaji Karyawan / Payroll',
  'Perawatan greenhouse',
  'Perawatan DFT',
  'Pompa',
  'Peralatan',
  'Transportasi',
  'Kemasan',
  'Sewa',
  'Administrasi',
  'Lainnya',
];

const CATEGORIES_PENGELUARAN_INVESTASI = [
  'Pembangunan',
  'Instalasi DFT',
  'Listrik',
  'Peralatan',
  'Struktur Bambu',
  'Plastik UV / Insect Net',
  'Tandon Air',
];

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, initialData }) => {
  const { db, addTransaction, updateTransaction } = useGreenhouse();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<TransactionType>('pengeluaran');
  const [expenseGroup, setExpenseGroup] = useState<ExpenseGroup>('operasional');
  const [category, setCategory] = useState(CATEGORIES_PENGELUARAN_OPERASIONAL[0]);
  const [subcategory, setSubcategory] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Transfer Bank');
  const [cycleId, setCycleId] = useState<string>('');
  const [tunnel, setTunnel] = useState<TunnelType>('Kedua Tunnel');
  const [note, setNote] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  const handleStartVoiceDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Browser Anda belum mendukung input suara mikrofon langsung. Gunakan Chrome atau Safari.');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => {
        setIsListeningVoice(true);
        setError(null);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListeningVoice(false);
        if (!transcript) return;
        const parsed = parseVoiceTransaction(transcript);

        setType(parsed.type);
        if (parsed.amount > 0) {
          setAmount(String(parsed.amount));
        }
        if (parsed.type === 'pengeluaran') {
          const eg = parsed.expenseGroup || 'operasional';
          setExpenseGroup(eg);
          if (eg === 'investasi') {
            setCategory('Peralatan');
          } else if (parsed.category.toLowerCase().includes('ab mix') || parsed.category.toLowerCase().includes('nutrisi')) {
            setCategory('AB Mix');
          } else if (parsed.category.toLowerCase().includes('benih')) {
            setCategory('Benih');
          } else if (parsed.category.toLowerCase().includes('pestisida')) {
            setCategory('Pestisida');
          } else if (parsed.category.toLowerCase().includes('listrik')) {
            setCategory('Listrik');
          } else if (parsed.category.toLowerCase().includes('tenaga') || parsed.category.toLowerCase().includes('gaji')) {
            setCategory('Tenaga kerja');
          } else {
            setCategory('Lainnya');
          }
        } else {
          setCategory('Penjualan melon');
        }
        if (parsed.cycleId) {
          const found = db.cycles.find((c) => c.id.toLowerCase() === parsed.cycleId?.toLowerCase());
          if (found) setCycleId(found.id);
        }
        if (parsed.tunnel && ['Tunnel 1', 'Tunnel 2', 'Kedua Tunnel'].includes(parsed.tunnel)) {
          setTunnel(parsed.tunnel as TunnelType);
        }
        if (parsed.paymentMethod) {
          setPaymentMethod(parsed.paymentMethod as PaymentMethod);
        }
        setNote(parsed.note);
      };
      recognition.onerror = () => {
        setIsListeningVoice(false);
      };
      recognition.onend = () => {
        setIsListeningVoice(false);
      };
      recognition.start();
    } catch {
      setIsListeningVoice(false);
      setError('Gagal mengakses mikrofon.');
    }
  };

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setType(initialData.type);
      setExpenseGroup(initialData.expenseGroup || 'operasional');
      setCategory(initialData.category);
      setSubcategory(initialData.subcategory || '');
      setAmount(String(initialData.amount));
      setPaymentMethod(initialData.paymentMethod);
      setCycleId(initialData.cycleId || '');
      setTunnel(initialData.tunnel);
      setNote(initialData.note || '');
      setReceiptUrl(initialData.receiptUrl || '');
    } else {
      const activeCycle = db.cycles.find((c) => c.status !== 'Selesai');
      if (activeCycle) {
        setCycleId(activeCycle.id);
        setTunnel(activeCycle.tunnel);
      }
      setDate(new Date().toISOString().slice(0, 10));
      setType('pengeluaran');
      setExpenseGroup('operasional');
      setCategory('AB Mix');
      setSubcategory('');
      setAmount('');
      setPaymentMethod('Transfer Bank');
      setNote('');
      setReceiptUrl('');
    }
    setError(null);
  }, [initialData, isOpen, db.cycles]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Ukuran file foto bukti maksimal 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedAmount = Number(amount.replace(/[^0-9]/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Nominal harus berupa angka lebih besar dari Rp 0');
      return;
    }
    if (!category.trim()) {
      setError('Kategori transaksi harus dipilih');
      return;
    }

    setIsSubmitting(true);
    try {
      if (initialData) {
        await updateTransaction(initialData.id, {
          date,
          type,
          expenseGroup: type === 'pengeluaran' ? expenseGroup : undefined,
          category,
          subcategory: subcategory.trim() || undefined,
          amount: parsedAmount,
          paymentMethod,
          cycleId: cycleId || undefined,
          tunnel,
          note: note.trim() || undefined,
          receiptUrl: receiptUrl || undefined,
        });
      } else {
        await addTransaction({
          date,
          type,
          expenseGroup: type === 'pengeluaran' ? expenseGroup : undefined,
          category,
          subcategory: subcategory.trim() || undefined,
          amount: parsedAmount,
          paymentMethod,
          cycleId: cycleId || undefined,
          tunnel,
          note: note.trim() || undefined,
          receiptUrl: receiptUrl || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat menyimpan transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialData ? 'Ubah Transaksi' : 'Tambah Transaksi'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Catat arus kas dan operasional greenhouse</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Voice Dictation Quick Entry Bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/90 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <div className="leading-snug">
                <span className="font-bold text-emerald-950 block">Dikte Suara (Voice Input)</span>
                <span className="text-[11px] text-emerald-800/80 block">Katakan: <em>"Pengeluaran 150 ribu beli AB Mix siklus 1"</em></span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStartVoiceDictation}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 ${
                isListeningVoice
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isListeningVoice ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isListeningVoice ? 'Mendengarkan...' : 'Bicara'}</span>
            </button>
          </div>

          {/* Type Selector (Pemasukan vs Pengeluaran) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('pengeluaran');
                setCategory(expenseGroup === 'investasi' ? CATEGORIES_PENGELUARAN_INVESTASI[0] : CATEGORIES_PENGELUARAN_OPERASIONAL[0]);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition cursor-pointer ${
                type === 'pengeluaran' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pengeluaran (Biaya)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('pemasukan');
                setCategory(CATEGORIES_PEMASUKAN[0]);
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-lg transition cursor-pointer ${
                type === 'pemasukan' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pemasukan (Uang Masuk)
            </button>
          </div>

          {/* If Pengeluaran: Clear Separation of INVESTASI vs BIAYA OPERASIONAL */}
          {type === 'pengeluaran' && (
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <label className="block text-xs font-semibold text-emerald-950 mb-1.5">
                Klasifikasi Biaya (Pemisahan Akuntansi)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseGroup('operasional');
                    setCategory(CATEGORIES_PENGELUARAN_OPERASIONAL[0]);
                  }}
                  className={`py-1.5 px-3 text-xs font-medium rounded-lg border text-left transition cursor-pointer ${
                    expenseGroup === 'operasional'
                      ? 'bg-white border-emerald-600 text-emerald-900 font-semibold shadow-xs ring-1 ring-emerald-500'
                      : 'border-emerald-200/80 bg-white/70 text-slate-700 hover:bg-white'
                  }`}
                >
                  <span className="block text-xs font-bold text-emerald-950">Biaya Operasional</span>
                  <span className="text-[10px] text-slate-500">Masuk HPP (Pupuk, Listrik, dsb)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseGroup('investasi');
                    setCategory(CATEGORIES_PENGELUARAN_INVESTASI[0]);
                  }}
                  className={`py-1.5 px-3 text-xs font-medium rounded-lg border text-left transition cursor-pointer ${
                    expenseGroup === 'investasi'
                      ? 'bg-white border-amber-600 text-amber-900 font-semibold shadow-xs ring-1 ring-amber-500'
                      : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
                  }`}
                >
                  <span className="block text-xs font-bold text-amber-950">Aset / Investasi</span>
                  <span className="text-[10px] text-slate-500">Modal Awal / Alat (Tidak masuk HPP)</span>
                </button>
              </div>
            </div>
          )}

          {/* Nominal Input with Rp Prefix */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nominal Transaksi (Rp) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                required
                value={amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setAmount(val ? Number(val).toLocaleString('id-ID') : '');
                }}
                placeholder="0"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
              />
            </div>
          </div>

          {/* Tanggal & Metode Bayar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Metode Bayar</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="Tunai / Cash">Tunai / Cash</option>
                <option value="QRIS">QRIS</option>
                <option value="Hutang / Piutang">Hutang / Piutang (Tempo)</option>
              </select>
            </div>
          </div>

          {/* Kategori & Subkategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {type === 'pemasukan'
                  ? CATEGORIES_PEMASUKAN.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))
                  : expenseGroup === 'investasi'
                  ? CATEGORIES_PENGELUARAN_INVESTASI.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))
                  : CATEGORIES_PENGELUARAN_OPERASIONAL.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Subkategori / Item</label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="Contoh: Pupuk A+B 500L, Insektisida"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Siklus Tanam & Tunnel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kaitkan Siklus Tanam</label>
              <select
                value={cycleId}
                onChange={(e) => setCycleId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Tanpa Siklus (Umum Kebun) --</option>
                {db.cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.name} ({c.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Lokasi Greenhouse</label>
              <select
                value={tunnel}
                onChange={(e) => setTunnel(e.target.value as TunnelType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {(db.tunnels || []).map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name} ({t.widthM} x {t.lengthM} m)
                  </option>
                ))}
                <option value="Kedua Tunnel">Semua / Gabungan Greenhouse</option>
                <option value="Umum / Fasilitas">Umum / Fasilitas (Tandon, Panel)</option>
              </select>
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Catatan / Keterangan</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan tambahan, merk, vendor, nomor invoice..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          {/* Upload Bukti / Foto Nota */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Foto Bukti / Nota (Opsional)</label>
            {receiptUrl ? (
              <div className="relative inline-block border rounded-xl overflow-hidden group">
                <img src={receiptUrl} alt="Bukti nota" className="h-28 w-auto object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => setReceiptUrl('')}
                  className="absolute top-1.5 right-1.5 bg-rose-600 text-white p-1 rounded-full hover:bg-rose-700 shadow-md transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-3 cursor-pointer transition bg-slate-50 hover:bg-emerald-50/20">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Ambil Foto atau Pilih Gambar Nota</span>
                </div>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Menyimpan...' : initialData ? 'Perbarui Transaksi' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
