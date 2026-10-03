import React, { useState } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { exportFullBackupJSON } from '../services/exportService';
import { testSheetsConnection } from '../services/sheetsSyncService';
import { GreenhouseDatabase } from '../types';
import {
  Sheet,
  Smartphone,
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Send,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Zap,
  Mic,
  MicOff,
  Volume2,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { parseVoiceTransaction } from '../utils/voiceParser';
import { formatCurrency } from '../utils/formatters';

export const SettingsIntegrationsPage: React.FC = () => {
  const {
    db,
    resetToDemoData,
    clearAllData,
    importDatabase,
    addToast,
    sheetsWebhookUrl,
    lastSheetsSync,
    isSheetsSyncing,
    setSheetsWebhookUrl,
    syncAllToGoogleSheets,
    refreshData,
    metrics,
  } = useGreenhouse();

  const [activeTab, setActiveTab] = useState<'shortcuts' | 'sheets' | 'backup' | 'demo'>('shortcuts');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedGetUrl, setCopiedGetUrl] = useState(false);

  // Sheets Webhook State
  const [webhookInput, setWebhookInput] = useState(sheetsWebhookUrl || '');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  // Clear & Reset Loading State
  const [isClearing, setIsClearing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Voice Shortcut Simulator State
  const [voiceInputText, setVoiceInputText] = useState('Pengeluaran 250 ribu untuk beli nutrisi AB Mix siklus 1');
  const [isListening, setIsListening] = useState(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Clear confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleStartListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addToast({
        type: 'warning',
        title: 'Browser Tidak Mendukung Mic Otomatis',
        message: 'Gunakan Google Chrome atau Safari untuk fitur mikrofon langsung, atau gunakan kolom teks di bawah.',
      });
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => {
        setIsListening(true);
        addToast({
          type: 'info',
          title: 'Mendengarkan...',
          message: 'Silakan ucapkan kalimat transaksi dalam Bahasa Indonesia.',
        });
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceInputText(transcript);
        setIsListening(false);
        addToast({
          type: 'success',
          title: 'Suara Terdeteksi!',
          message: `"${transcript}"`,
        });
      };
      recognition.onerror = (event: any) => {
        setIsListening(false);
        addToast({
          type: 'error',
          title: 'Gagal Merekam Suara',
          message: event.error || 'Periksa izin akses mikrofon perangkat Anda.',
        });
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      addToast({ type: 'error', title: 'Error Audio', message: err.message });
    }
  };

  const handleSpeakReply = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
      addToast({ type: 'info', title: 'Simulasi Respon Siri', message: 'Memutar suara balasan Siri.' });
    } else {
      addToast({ type: 'warning', title: 'Audio Tidak Didukung', message: 'Browser tidak memiliki fitur Text-to-Speech.' });
    }
  };

  const handleTestShortcutAPI = async () => {
    setIsTesting(true);
    setTestResponse(null);
    try {
      const res = await fetch('/api/shortcuts/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: voiceInputText }),
      });
      const data = await res.json();
      setTestResponse(JSON.stringify(data, null, 2));
      if (res.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Simulasi Berhasil Masuk Database!',
          message: data.reply || 'Transaksi tercatat.',
        });
        if (data.reply) {
          handleSpeakReply(data.reply);
        }
        await refreshData();
      } else {
        addToast({
          type: 'error',
          title: 'Simulasi Gagal',
          message: data.reply || data.error || 'Terjadi kesalahan',
        });
      }
    } catch (err: any) {
      setTestResponse(JSON.stringify({ error: err.message }, null, 2));
      addToast({ type: 'error', title: 'Error Jaringan', message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed: GreenhouseDatabase = JSON.parse(event.target?.result as string);
          await importDatabase(parsed);
        } catch {
          addToast({ type: 'error', title: 'File JSON tidak valid' });
        }
      };
      reader.readAsText(file);
    }
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const googleAppsScriptCode = `/**
 * GREENHOUSE FINANCE PRO - GOOGLE APPS SCRIPT WEBHOOK SINKRONISASI
 * Mendukung Auto-Sync Realtime & Sinkronisasi Massal Semua Tabel
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || "add_transaction";
    
    // 1. UJI KONEKSI
    if (action === "test") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Koneksi Google Apps Script berhasil terhubung!",
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. TAMBAH TRANSAKSI REALTIME
    if (action === "add_transaction") {
      var sheet = getOrCreateSheet(ss, "TRANSAKSI", [
        "ID", "Tanggal", "Jenis", "Kelompok", "Kategori", "Subkategori",
        "Nominal", "Metode Bayar", "Siklus ID", "Tunnel", "Keterangan", "Dibuat Pada"
      ]);
      
      var row = [
        payload.id || "TRX-" + new Date().getTime(),
        payload.date || new Date().toISOString().slice(0, 10),
        payload.type || "-",
        payload.expenseGroup || "-",
        payload.category || "-",
        payload.subcategory || "-",
        payload.amount || 0,
        payload.paymentMethod || "Transfer Bank",
        payload.cycleId || "-",
        payload.tunnel || "Kedua Tunnel",
        payload.note || "",
        new Date().toISOString()
      ];
      sheet.appendRow(row);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Transaksi berhasil dicatat ke Google Sheets"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 3. SINKRONISASI ULANG SEMUA DATA (SYNC ALL)
    if (action === "sync_all") {
      if (payload.transactions && payload.transactions.length > 0) {
        syncTable(ss, "TRANSAKSI", [
          "ID", "Tanggal", "Jenis", "Kelompok", "Kategori", "Subkategori",
          "Nominal", "Metode Bayar", "Siklus ID", "Tunnel", "Keterangan", "Dibuat Pada"
        ], payload.transactions);
      }
      
      if (payload.cycles && payload.cycles.length > 0) {
        syncTable(ss, "SIKLUS", [
          "ID Siklus", "Nama Siklus", "Varietas", "Tunnel", "Tgl Mulai", "Tgl Tanam",
          "Target Panen", "Tgl Panen Aktual", "Jumlah Tanaman", "Tanaman Hidup", "Tanaman Mati", "Status", "Catatan"
        ], payload.cycles);
      }
      
      if (payload.harvests && payload.harvests.length > 0) {
        syncTable(ss, "PANEN", [
          "ID Panen", "Tanggal", "Siklus ID", "Tunnel", "Total Kg", "Grade A Kg",
          "Grade B Kg", "Grade C Kg", "Harga/Kg", "Total Omzet", "Pembeli", "Status Bayar", "Catatan"
        ], payload.harvests);
      }
      
      if (payload.investments && payload.investments.length > 0) {
        syncTable(ss, "INVESTASI", [
          "ID Investasi", "Tanggal", "Kategori", "Nama Barang", "Jumlah", "Satuan",
          "Harga Satuan", "Total Nominal", "Supplier", "Tunnel", "Catatan"
        ], payload.investments);
      }
      
      if (payload.assets && payload.assets.length > 0) {
        syncTable(ss, "ASET", [
          "ID Aset", "Nama Aset", "Kategori", "Tgl Perolehan", "Nilai Perolehan",
          "Jumlah", "Kondisi", "Umur Ekonomis (Tahun)", "Lokasi", "Catatan"
        ], payload.assets);
      }
      
      if (payload.inventory && payload.inventory.length > 0) {
        syncTable(ss, "STOK", [
          "ID Barang", "Nama Barang", "Kategori", "Satuan", "Stok Awal", "Barang Masuk",
          "Barang Keluar", "Stok Akhir", "Min Stok", "Harga Rata-rata", "Terakhir Update"
        ], payload.inventory);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Seluruh sheet berhasil disinkronkan ulang!"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#064e3b").setFontColor("#ffffff");
    }
  }
  return sheet;
}

function syncTable(ss, sheetName, headers, rows) {
  var sheet = getOrCreateSheet(ss, sheetName, headers);
  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#064e3b").setFontColor("#ffffff");
  if (rows && rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}`;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Pengaturan, Integrasi & Database</h2>
          <p className="text-xs text-slate-500">
            Koneksi Apple Shortcuts, skema Google Sheets, backup offline, dan manajemen data demo
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
        <button
          onClick={() => setActiveTab('shortcuts')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'shortcuts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smartphone className="w-4 h-4 text-emerald-700" />
          <span>iPhone Shortcuts (API)</span>
        </button>
        <button
          onClick={() => setActiveTab('sheets')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'sheets' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sheet className="w-4 h-4 text-emerald-600" />
          <span>Google Sheets (11 Sheets)</span>
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'backup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4 text-blue-600" />
          <span>Backup & Restore Data</span>
        </button>
        <button
          onClick={() => setActiveTab('demo')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'demo' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Trash2 className="w-4 h-4 text-rose-600" />
          <span>Data Demo & Reset</span>
        </button>
      </div>

      {/* 1. IPHONE SHORTCUTS & SIRI (VOICE ENTRY) TAB */}
      {activeTab === 'shortcuts' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Webhook Voice Online
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Bahasa Indonesia NLP</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-700" />
                  <span>INTEGRASI IPHONE SHORTCUTS & SIRI (VOICE ENTRY)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  Catat transaksi secara <em>hands-free</em> tanpa mengetik cukup berbicara ke iPhone saat Anda sedang berada di dalam tunnel greenhouse atau toko tani. Siri otomatis mengenali jenis transaksi, nominal rupiah, kategori pupuk/saprotan, dan nomor siklus.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="shortcuts://create-shortcut"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                  title="Buka Aplikasi Pintasan di iPhone / Mac"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-400" />
                  <span>Buka Pintasan iOS</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs mb-2">1</div>
                <h4 className="text-xs font-bold text-slate-900">Panggil Siri</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Katakan: <strong className="text-emerald-700 font-semibold">"Hey Siri, Catat Melon"</strong> di iPhone atau Apple Watch.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs mb-2">2</div>
                <h4 className="text-xs font-bold text-slate-900">Siri Mendengarkan</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Ucapkan kalimat bebas: <span className="text-slate-700 italic">"Pengeluaran 250 ribu beli nutrisi AB Mix siklus 1"</span>.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs mb-2">3</div>
                <h4 className="text-xs font-bold text-slate-900">Kirim ke Webhook</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Pintasan iOS otomatis mengirim suara ke endpoint API Greenhouse via POST/GET JSON.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs mb-2">4</div>
                <h4 className="text-xs font-bold text-slate-900">Siri Membaca Respon</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Siri berbicara: <span className="text-emerald-700 font-medium">"Tercatat! Pengeluaran Rp250.000... Saldo sisa Rp..."</span>
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span>Alamat Webhook untuk Aplikasi Pintasan iPhone</span>
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 font-mono">1. POST Endpoint (Direkomendasikan)</span>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/api/shortcuts/voice`, setCopiedUrl)}
                      className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-800 transition flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? 'Tersalin' : 'Salin URL'}</span>
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-slate-300 break-all bg-black/40 p-2 rounded-lg">
                    {window.location.origin}/api/shortcuts/voice
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Header: <code className="text-amber-300">Content-Type: application/json</code> | Body: <code className="text-emerald-300">&#123; "text": "Teks Suara" &#125;</code>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-400 font-mono">2. GET Endpoint (Paling Praktis di iOS)</span>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/api/shortcuts/voice?text=`, setCopiedGetUrl)}
                      className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-800 transition flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedGetUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedGetUrl ? 'Tersalin' : 'Salin URL'}</span>
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-slate-300 break-all bg-black/40 p-2 rounded-lg">
                    {window.location.origin}/api/shortcuts/voice?text=[Teks yang Didiktekan]
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Hanya butuh 2 aksi di iPhone: Diktekan Teks &rarr; Buka URL.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Voice Simulator */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Uji Coba Langsung Simulasi Perintah Suara Siri</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Uji rekaman suara via mikrofon browser atau ketik kalimat contoh untuk menguji parsing Bahasa Indonesia.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartListening}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isListening ? 'Mendengarkan...' : 'Bicara Lewat Mic'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pilih Contoh Kalimat Perintah Suara:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Pengeluaran 250 ribu untuk beli nutrisi AB Mix siklus 1',
                  'Pemasukan 3.500.000 hasil panen melon 150 kg siklus 1',
                  'Beli fungisida 85 ribu tunai di tunnel 2',
                  'Beli bibit melon fujisawa 450 ribu siklus 2',
                  'Bayar token listrik greenhouse 200 ribu',
                  'Beli bambu petung 2 juta untuk investasi',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setVoiceInputText(preset)}
                    className="text-xs py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 border border-slate-200 transition cursor-pointer text-left font-medium"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Kalimat Suara yang Ditangkap (Teks Suara Siri):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voiceInputText}
                  onChange={(e) => setVoiceInputText(e.target.value)}
                  placeholder="Contoh: Pengeluaran 150 ribu beli nutrisi ab mix siklus 1"
                  className="flex-1 p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleTestShortcutAPI}
                  disabled={isTesting || !voiceInputText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTesting ? 'Memproses...' : 'Kirim ke Server (Simulasi)'}</span>
                </button>
              </div>
            </div>

            {(() => {
              const liveParsed = parseVoiceTransaction(voiceInputText, metrics.saldoKas);
              return (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Hasil Analisis AI & Natural Language Parser:</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        liveParsed.amount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {liveParsed.amount > 0 ? 'Nominal Valid' : 'Nominal Belum Terdeteksi'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Jenis</span>
                      <span className={`font-bold capitalize ${liveParsed.type === 'pemasukan' ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {liveParsed.type}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Nominal Terdeteksi</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {formatCurrency(liveParsed.amount)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Kategori Otomatis</span>
                      <span className="font-bold text-slate-900 truncate block" title={liveParsed.category}>
                        {liveParsed.category}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Siklus & Tunnel</span>
                      <span className="font-bold text-slate-900">
                        {liveParsed.cycleId || 'Umum'} · {liveParsed.tunnel}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-950 text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-emerald-900">
                    <div className="flex items-start sm:items-center gap-2">
                      <Volume2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                      <div>
                        <span className="text-[10px] text-emerald-400 block font-bold uppercase">Respon Suara Siri (Voice Feedback):</span>
                        <p className="font-medium text-white italic mt-0.5 leading-snug">"{liveParsed.siriReply}"</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSpeakReply(liveParsed.siriReply)}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Putar Suara</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {testResponse && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Payload Response Dari Server (/api/shortcuts/voice):
                </span>
                <div className="p-3.5 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800">
                  <pre>{testResponse}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Setup Guide on iPhone */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-700" />
                <span>PANDUAN LANGKAH MEMBUAT SHORTCUT DI APLIKASI "PINTASAN" (IPHONE)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ikuti langkah mudah di bawah ini untuk membuat pintasan iPhone yang tersambung langsung ke Siri.
              </p>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                <div>
                  <strong className="text-slate-900">Buka Aplikasi Pintasan (Shortcuts) di iPhone:</strong>
                  <p className="text-slate-500 mt-0.5">
                    Aplikasi ini adalah bawaan resmi dari Apple. Tap tanda <strong>+ (Tambah Pintasan)</strong> di pojok kanan atas.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                <div>
                  <strong className="text-slate-900">Beri Nama Pintasan: "Catat Melon"</strong>
                  <p className="text-slate-500 mt-0.5">
                    Tap nama pintasan di bagian atas, ganti menjadi <code className="bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Catat Melon</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                <div>
                  <strong className="text-slate-900">Tambah Aksi 1: "Diktekan Teks" (Dictate Text)</strong>
                  <p className="text-slate-500 mt-0.5">
                    Cari aksi <strong className="text-slate-800">Diktekan Teks</strong>. Pastikan pengaturan Bahasa dipilih ke <strong className="text-slate-800">Bahasa Indonesia</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">4</span>
                <div className="space-y-1.5">
                  <strong className="text-slate-900">Tambah Aksi 2: "Dapatkan Isi URL" (Get Contents of URL)</strong>
                  <p className="text-slate-500">
                    Cari aksi <strong className="text-slate-800">Dapatkan Isi URL</strong> dan atur pengaturannya sebagai berikut:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600 bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px]">
                    <li><strong>URL:</strong> <span className="text-emerald-700 font-bold break-all">{window.location.origin}/api/shortcuts/voice</span></li>
                    <li><strong>Metode:</strong> <span className="text-slate-900 font-bold">POST</span></li>
                    <li><strong>Header:</strong> <span className="text-amber-700">Content-Type</span> = <span className="text-amber-700">application/json</span></li>
                    <li><strong>Isi Permintaan:</strong> <span className="text-slate-900 font-bold">JSON</span></li>
                    <li><strong>Tambah Kolom Baru:</strong> Kunci: <code className="text-indigo-700">text</code>, Tipe: <code className="text-indigo-700">Teks</code>, Nilai: pilih variabel <code className="bg-blue-100 text-blue-900 px-1 rounded font-sans font-bold">Teks yang Didiktekan</code>.</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">5</span>
                <div>
                  <strong className="text-slate-900">Tambah Aksi 3 & 4 (Agar Siri Membacakan Konfirmasi):</strong>
                  <p className="text-slate-500 mt-0.5">
                    1. Tambahkan aksi <strong className="text-slate-800">Dapatkan Nilai Kamus</strong> &rarr; Masukkan Kunci: <code className="font-mono text-emerald-800 font-bold">reply</code>, dari Kamus: <code className="font-mono text-slate-800">Isi URL</code>.<br />
                    2. Tambahkan aksi <strong className="text-slate-800">Ucapkan Teks</strong> &rarr; Masukkan variabel <code className="bg-emerald-100 text-emerald-900 px-1 rounded font-bold">Nilai Kamus</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-900">Pintasan Selesai & Siap Digunakan!</strong>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Sekarang setiap saat Anda belanja atau mencatat panen, tinggal panggil: <strong>"Hey Siri, Catat Melon"</strong>. Siri akan mendengarkan, mengirim ke sistem, dan membacakan nominal serta saldo kas Anda.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-500" />
                  <span>Uji Via Terminal (cURL Command):</span>
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `curl -X POST "${window.location.origin}/api/shortcuts/voice" -H "Content-Type: application/json" -d '{"text": "Pengeluaran 250 ribu beli nutrisi AB Mix siklus 1"}'`,
                      setCopiedCurl
                    )
                  }
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
                >
                  {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCurl ? 'Tersalin' : 'Salin cURL'}</span>
                </button>
              </div>
              <div className="p-3 bg-slate-900 text-slate-300 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800">
                <code>
                  curl -X POST "{window.location.origin}/api/shortcuts/voice" \<br />
                  &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                  &nbsp;&nbsp;-d '&#123;"text": "Pengeluaran 250 ribu beli nutrisi AB Mix siklus 1"&#125;'
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. GOOGLE SHEETS TAB */}
      {activeTab === 'sheets' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-in fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Sheet className="w-5 h-5 text-emerald-600" />
              <span>SKEMA 11 TABEL GOOGLE SHEETS & GOOGLE APPS SCRIPT</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Struktur kolom konsisten dan ID unik untuk sinkronisasi Google Sheets
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-900 block">1. CONFIG</span>
              <span className="text-slate-500">Key, Value, Description</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-900 block">2. TRANSAKSI</span>
              <span className="text-slate-500">ID, Tanggal, Jenis, Kelompok, Kategori, Subkategori, Nominal, Metode Bayar, Siklus ID, Tunnel, Keterangan, Dibuat Pada</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-900 block">3. SIKLUS</span>
              <span className="text-slate-500">ID Siklus, Nama Siklus, Varietas, Tunnel, Tgl Mulai, Tgl Tanam, Target Panen, Tgl Panen Aktual, Jumlah Tanaman, Tanaman Hidup, Tanaman Mati, Status, Catatan</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-900 block">4. PANEN</span>
              <span className="text-slate-500">ID Panen, Tanggal, Siklus ID, Tunnel, Total Kg, Grade A Kg, Grade B Kg, Grade C Kg, Harga/Kg, Total Omzet, Pembeli, Status Bayar, Catatan</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-900 block">5. INVESTASI</span>
              <span className="text-slate-500">ID Investasi, Tanggal, Kategori, Nama Barang, Jumlah, Satuan, Harga Satuan, Total Nominal, Supplier, Tunnel, Catatan</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-900 block">6. ASET</span>
              <span className="text-slate-500">ID Aset, Nama Aset, Kategori, Tgl Perolehan, Nilai Perolehan, Jumlah, Kondisi, Umur Ekonomis, Lokasi, Catatan</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-900 block">7. STOK</span>
              <span className="text-slate-500">ID Barang, Nama Barang, Kategori, Satuan, Stok Awal, Barang Masuk, Barang Keluar, Stok Akhir, Min Stok, Harga Rata-rata, Terakhir Update</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-900 block">8. HUTANG</span>
              <span className="text-slate-500">ID, Supplier, Tanggal, Jatuh Tempo, Total Nominal, Sudah Dibayar, Sisa Nominal, Status, Keterangan</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-900 block">9. PIUTANG</span>
              <span className="text-slate-500">ID, Pelanggan, Tanggal, Jatuh Tempo, Total Nominal, Sudah Dibayar, Sisa Nominal, Status, Keterangan</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="font-bold text-slate-900 block">10. KATEGORI</span>
              <span className="text-slate-500">Kategori, Jenis Biaya (Operasional / Investasi)</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 md:col-span-2">
              <span className="font-bold text-slate-900 block">11. DASHBOARD_DATA</span>
              <span className="text-slate-500">Metrik, Nilai, Satuan, Keterangan</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-slate-900">
                Kode Google Apps Script Webhook (Salin ke Extensions &gt; Apps Script di Spreadsheet Anda):
              </span>
              <button
                onClick={() => copyToClipboard(googleAppsScriptCode, setCopiedScript)}
                className="flex items-center gap-1 text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-900 text-slate-200 text-[11px] rounded-xl font-mono overflow-auto max-h-64">
              {googleAppsScriptCode}
            </pre>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Sheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-emerald-950">
                    Status Koneksi Google Sheets
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    {sheetsWebhookUrl ? (
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Terhubung · Auto-Sync Aktif</span>
                      </span>
                    ) : (
                      <span className="text-amber-800 font-medium">
                        Belum Terhubung · Masukkan URL Web App di bawah
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {lastSheetsSync && (
                <div className="text-[11px] text-emerald-800 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Terakhir Sinkron: <span className="font-bold">{new Date(lastSheetsSync).toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-emerald-900 leading-relaxed">
              Setelah men-deploy Web App di Google Apps Script (Who has access: <em>Anyone</em>), tempelkan URL Web App yang berakhiran <code className="bg-white px-1.5 py-0.5 rounded text-emerald-900 font-mono font-bold">/exec</code> di bawah ini:
            </p>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={webhookInput}
                  onChange={(e) => setWebhookInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  className="flex-1 p-2.5 bg-white rounded-xl border border-emerald-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!webhookInput.trim()) {
                      addToast({ type: 'warning', title: 'URL Kosong', message: 'Silakan isi URL Webhook terlebih dahulu.' });
                      return;
                    }
                    setSheetsWebhookUrl(webhookInput);
                    addToast({
                      type: 'success',
                      title: 'URL Berhasil Disimpan',
                      message: 'URL Google Sheets tersimpan. Setiap transaksi baru akan otomatis tersinkron ke Spreadsheet.',
                    });
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan URL</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isTestingWebhook || !webhookInput.trim()}
                  onClick={async () => {
                    if (!webhookInput.trim()) return;
                    setIsTestingWebhook(true);
                    setSheetsWebhookUrl(webhookInput);
                    try {
                      const res = await testSheetsConnection(webhookInput);
                      if (res.success) {
                        addToast({
                          type: 'success',
                          title: 'Koneksi Berhasil!',
                          message: res.message || 'Google Apps Script merespons dengan status OK.',
                        });
                      } else {
                        addToast({
                          type: 'error',
                          title: 'Koneksi Gagal',
                          message: res.error || res.message,
                        });
                      }
                    } catch (err: any) {
                      addToast({ type: 'error', title: 'Error', message: err.message });
                    } finally {
                      setIsTestingWebhook(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isTestingWebhook ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menguji Koneksi...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Uji Koneksi Webhook</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isSheetsSyncing || (!sheetsWebhookUrl && !webhookInput.trim())}
                  onClick={async () => {
                    if (webhookInput.trim() && webhookInput !== sheetsWebhookUrl) {
                      setSheetsWebhookUrl(webhookInput);
                    }
                    await syncAllToGoogleSheets();
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer disabled:opacity-50"
                >
                  {isSheetsSyncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyinkronkan Seluruh Data...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sinkronkan Ulang Seluruh Data Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. BACKUP & RESTORE TAB */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-in fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <span>PENCADANGAN (BACKUP) & PEMULIHAN (RESTORE) DATA</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simpan seluruh data transaksi, siklus, panen, investasi, dan stok ke file lokal untuk keamanan
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">Unduh File Cadangan (JSON Backup)</h4>
                <p className="text-slate-500 leading-relaxed">
                  Menyimpan salinan lengkap database dalam format standar JSON. Berisi seluruh rekaman transaksi, aset, stok, dan riwayat panen.
                </p>
              </div>
              <button
                onClick={() => exportFullBackupJSON(db)}
                className="mt-4 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Backup Database (.json)</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">Pulihkan Data dari Cadangan</h4>
                <p className="text-slate-500 leading-relaxed">
                  Upload file cadangan (.json) yang pernah Anda unduh sebelumnya untuk mengembalikan seluruh catatan keuangan ke sistem.
                </p>
              </div>
              <label className="mt-4 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Pilih File Backup untuk Dipulihkan</span>
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 4. DATA DEMO & RESET TAB */}
      {activeTab === 'demo' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-in fade-in">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>MANAJEMEN DATA DEMO & KOSONGKAN DATA USAHA</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hapus data demo saat siap mencatat operasional riil kebun greenhouse melon Anda
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">Muat Ulang Data Demo</h4>
                <p className="text-slate-500 leading-relaxed">
                  Memuat sampel data greenhouse 2 tunnel (Siklus 1 sukses panen, Siklus 2 berjalan, belanja bambu petung, UV net, gully DFT, dan inventori).
                </p>
              </div>
              <button
                onClick={async () => {
                  setIsResetting(true);
                  try {
                    await resetToDemoData();
                  } finally {
                    setIsResetting(false);
                  }
                }}
                disabled={isResetting || isClearing}
                className="mt-4 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
                <span>{isResetting ? 'Sedang Memulihkan...' : 'Reset ke Data Demo Asli'}</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-rose-700 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <h4 className="text-sm">Hapus Seluruh Data Demo (Mulai Kosong)</h4>
                </div>
                <p className="text-rose-900/80 leading-relaxed">
                  Mengosongkan semua transaksi, panen, siklus, dan stok sehingga aplikasi siap 100% untuk digunakan mencatat keuangan aktual harian kebun melon Anda.
                </p>
              </div>
              <button
                onClick={() => setShowClearConfirm(true)}
                disabled={isResetting || isClearing}
                className="mt-4 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Data Demo (Kosongkan Data)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Clear Data */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-xs">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 text-center">Kosongkan Semua Data?</h3>
            <p className="text-slate-500 text-center mt-2 leading-relaxed">
              Seluruh data demo transaksi, siklus, dan aset akan dikosongkan agar Anda dapat memulai pencatatan riil greenhouse Anda dari awal (Rp 0).
            </p>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="flex-1 py-2 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  setIsClearing(true);
                  try {
                    await clearAllData();
                    setShowClearConfirm(false);
                  } finally {
                    setIsClearing(false);
                  }
                }}
                disabled={isClearing}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengosongkan...</span>
                  </>
                ) : (
                  <span>Ya, Kosongkan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
