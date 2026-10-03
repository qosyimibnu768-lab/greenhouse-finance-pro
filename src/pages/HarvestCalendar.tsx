import React, { useState, useMemo } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { TunnelType } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Sprout,
  ShoppingBag,
  Sparkles,
  Download,
  Plus,
  Clock,
  Layers,
  X,
} from 'lucide-react';

interface MilestoneEvent {
  id: string;
  cycleId: string;
  cycleName: string;
  tunnel: TunnelType;
  variety: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'semai' | 'tanam' | 'polinasi' | 'gantung_buah' | 'netting' | 'uji_brix' | 'panen';
  description: string;
  hstDay: number;
  estKg?: number;
  estRevenue?: number;
  completed?: boolean;
}

const EVENT_COLORS: Record<
  MilestoneEvent['type'],
  { bg: string; text: string; border: string; label: string; dot: string }
> = {
  panen: {
    bg: 'bg-emerald-600',
    text: 'text-white font-black',
    border: 'border-emerald-700',
    label: 'Panen Raya',
    dot: 'bg-emerald-500',
  },
  tanam: {
    bg: 'bg-teal-100',
    text: 'text-teal-900 font-bold',
    border: 'border-teal-300',
    label: 'Pindah Tanam',
    dot: 'bg-teal-500',
  },
  polinasi: {
    bg: 'bg-purple-100',
    text: 'text-purple-900 font-bold',
    border: 'border-purple-300',
    label: 'Polinasi Bunga',
    dot: 'bg-purple-500',
  },
  gantung_buah: {
    bg: 'bg-amber-100',
    text: 'text-amber-900 font-bold',
    border: 'border-amber-300',
    label: 'Gantung Buah',
    dot: 'bg-amber-500',
  },
  netting: {
    bg: 'bg-blue-100',
    text: 'text-blue-900 font-bold',
    border: 'border-blue-300',
    label: 'Fase Netting',
    dot: 'bg-blue-500',
  },
  uji_brix: {
    bg: 'bg-rose-100',
    text: 'text-rose-900 font-bold',
    border: 'border-rose-300',
    label: 'Uji Brix',
    dot: 'bg-rose-500',
  },
  semai: {
    bg: 'bg-slate-100',
    text: 'text-slate-800 font-semibold',
    border: 'border-slate-300',
    label: 'Semai Bibit',
    dot: 'bg-slate-400',
  },
};

const addDays = (dateStr: string, days: number): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const getDaysDiff = (dateStr1: string, dateStr2: string): number => {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const HarvestCalendarPage: React.FC = () => {
  const { db, addCycle, addToast } = useGreenhouse();
  const cycles = db.cycles || [];
  const tunnels = db.tunnels || [];

  const [viewMode, setViewMode] = useState<'calendar' | 'timeline' | 'agenda'>('calendar');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedTunnel, setSelectedTunnel] = useState<string>('all');
  const [selectedVariety, setSelectedVariety] = useState<string>('all');

  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    dateStr: string;
    events: MilestoneEvent[];
  } | null>(null);

  const [isAddCycleOpen, setIsAddCycleOpen] = useState(false);
  const [newCycleForm, setNewCycleForm] = useState<{
    name: string;
    melonVariety: string;
    tunnel: TunnelType;
    plantingDate: string;
    targetDays: number;
    plantCount: number;
  }>({
    name: '',
    melonVariety: 'Inthanon RZ',
    tunnel: tunnels[0]?.name || 'Tunnel 1',
    plantingDate: new Date().toISOString().split('T')[0],
    targetDays: 70,
    plantCount: 700,
  });

  const allMilestones = useMemo(() => {
    const list: MilestoneEvent[] = [];
    cycles.forEach((c) => {
      const plantDate = c.plantingDate || c.startDate;
      if (!plantDate) return;
      const targetHarvest = c.harvestTargetDate || addDays(plantDate, 70);
      const estTotalKg = Math.round((c.livePlants || c.plantCount || 650) * 1.6);
      const estRev = estTotalKg * 35000;

      list.push({
        id: `${c.id}-semai`,
        cycleId: c.id,
        cycleName: c.name,
        tunnel: c.tunnel,
        variety: c.melonVariety,
        title: `Semai Bibit ${c.melonVariety}`,
        date: c.startDate || addDays(plantDate, -10),
        type: 'semai',
        description: `Penyemaian ${c.plantCount} benih di tray rockwool/cocopeat.`,
        hstDay: -10,
      });

      list.push({
        id: `${c.id}-tanam`,
        cycleId: c.id,
        cycleName: c.name,
        tunnel: c.tunnel,
        variety: c.melonVariety,
        title: `Pindah Tanam (0 HST) - ${c.name}`,
        date: plantDate,
        type: 'tanam',
        description: `Bibit masuk talang DFT ${c.tunnel}. PPM Awal: 600-800.`,
        hstDay: 0,
      });

      list.push({
        id: `${c.id}-polinasi`,
        cycleId: c.id,
        cycleName: c.name,
        tunnel: c.tunnel,
        variety: c.melonVariety,
        title: `Polinasi Bunga Betina (HST 22)`,
        date: addDays(plantDate, 22),
        type: 'polinasi',
        description: `Penyerbukan manual bunga ruas ke-9 s/d 12.`,
        hstDay: 22,
      });

      list.push({
        id: `${c.id}-gantung`,
        cycleId: c.id,
        cycleName: c.name,
        tunnel: c.tunnel,
        variety: c.melonVariety,
        title: `Seleksi & Gantung Buah (HST 32)`,
        date: addDays(plantDate, 32),
        type: 'gantung_buah',
        description: `Sisakan 1 buah terbaik bentuk oval sempurna, gantung ke tali ajir.`,
        hstDay: 32,
      });

      list.push({
        id: `${c.id}-netting`,
        cycleId: c.id,
        cycleName: c.name,
        tunnel: c.tunnel,
        variety: c.melonVariety,
        title: `Monitoring Netting (HST 48)`,
        date: addDays(plantDate, 48),
        type: 'netting',
        description: `Jaring mulai retak & timbul. Jaga kelembaban & EC nutrisi stabil di 1800 PPM.`,
        hstDay: 48,
      });

      list.push({
        id: `${c.id}-brix`,
        cycleId: c.id,
        cycleName: c.name,
        tunnel: c.tunnel,
        variety: c.melonVariety,
        title: `Uji Refractometer Brix (HST 63)`,
        date: addDays(plantDate, 63),
        type: 'uji_brix',
        description: `Cek sampel buah acak. Target minimal: >13.5 Brix.`,
        hstDay: 63,
      });

      list.push({
        id: `${c.id}-panen`,
        cycleId: c.id,
        cycleName: c.name,
        tunnel: c.tunnel,
        variety: c.melonVariety,
        title: `PANEN RAYA ${c.name} (${c.melonVariety})`,
        date: targetHarvest,
        type: 'panen',
        description: `Petik buah serentak. Target: ${estTotalKg.toLocaleString('id-ID')} Kg (Est. Omzet: ${formatCurrency(estRev)}).`,
        hstDay: getDaysDiff(plantDate, targetHarvest),
        estKg: estTotalKg,
        estRevenue: estRev,
      });
    });
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [cycles]);

  const filteredMilestones = useMemo(() => {
    return allMilestones.filter((m) => {
      const matchTunnel = selectedTunnel === 'all' || m.tunnel === selectedTunnel;
      const matchVar = selectedVariety === 'all' || m.variety === selectedVariety;
      return matchTunnel && matchVar;
    });
  }, [allMilestones, selectedTunnel, selectedVariety]);

  const varieties = useMemo(() => {
    const set = new Set<string>();
    cycles.forEach((c) => {
      if (c.melonVariety) set.add(c.melonVariety);
    });
    return Array.from(set);
  }, [cycles]);

  const next90DaysProjection = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const after90 = addDays(today, 90);
    const upcomingHarvests = allMilestones.filter(
      (m) => m.type === 'panen' && m.date >= today && m.date <= after90
    );
    const totalEstKg = upcomingHarvests.reduce((acc, h) => acc + (h.estKg || 0), 0);
    const totalEstRev = upcomingHarvests.reduce((acc, h) => acc + (h.estRevenue || 0), 0);
    const nearestHarvest = upcomingHarvests[0] || null;
    let daysToNearest = null;
    if (nearestHarvest) {
      daysToNearest = getDaysDiff(today, nearestHarvest.date);
    }
    return {
      count: upcomingHarvests.length,
      totalEstKg,
      totalEstRev,
      nearestHarvest,
      daysToNearest,
    };
  }, [allMilestones]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const calendarDays = useMemo(() => {
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const days: {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: MilestoneEvent[];
    }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split('T')[0];
      const dayEvents = filteredMilestones.filter((m) => m.date === dateStr);
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: dayEvents,
      });
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const currDate = new Date(year, month, d);
      const dateStr = currDate.toISOString().split('T')[0];
      const dayEvents = filteredMilestones.filter((m) => m.date === dateStr);
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        events: dayEvents,
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const nextDate = new Date(year, month + 1, n);
      const dateStr = nextDate.toISOString().split('T')[0];
      const dayEvents = filteredMilestones.filter((m) => m.date === dateStr);
      days.push({
        dateStr,
        dayNum: n,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        events: dayEvents,
      });
    }
    return days;
  }, [year, month, filteredMilestones]);

  const handleExportICS = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Greenhouse Finance Pro//Harvest Calendar//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Jadwal Panen Greenhouse',
      'X-WR-TIMEZONE:Asia/Jakarta',
    ];
    allMilestones.forEach((m) => {
      const dateFormatted = m.date.replace(/-/g, '');
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${m.id}@greenhouse.finance`,
        `DTSTAMP:${dateFormatted}T000000Z`,
        `DTSTART;VALUE=DATE:${dateFormatted}`,
        `SUMMARY:${m.title}`,
        `DESCRIPTION:${m.description.replace(/\n/g, ' ')}`,
        `LOCATION:${m.tunnel}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });
    icsContent.push('END:VCALENDAR');
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `jadwal-panen-greenhouse-${year}-${month + 1}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast({
      type: 'success',
      title: 'Kalender Diekspor (.ics)',
      message: 'File kalender berhasil diunduh. Siap disinkronkan ke Google/Apple Calendar.',
    });
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCycleForm.name.trim() || !newCycleForm.plantingDate) {
      addToast({
        type: 'error',
        title: 'Form Belum Lengkap',
        message: 'Nama siklus dan tanggal tanam wajib diisi.',
      });
      return;
    }
    const harvestTarget = addDays(newCycleForm.plantingDate, Number(newCycleForm.targetDays) || 70);
    const newId = `S${(cycles.length + 1).toString().padStart(3, '0')}`;
    const success = await addCycle({
      id: newId,
      name: newCycleForm.name.trim(),
      melonVariety: newCycleForm.melonVariety,
      tunnel: newCycleForm.tunnel,
      startDate: addDays(newCycleForm.plantingDate, -10),
      plantingDate: newCycleForm.plantingDate,
      harvestTargetDate: harvestTarget,
      plantCount: Number(newCycleForm.plantCount) || 700,
      livePlants: Number(newCycleForm.plantCount) || 700,
      deadPlants: 0,
      status: 'Tanam',
      notes: `Target panen: ${harvestTarget} (Sistem DFT)`,
    });
    if (success) {
      addToast({
        type: 'success',
        title: 'Siklus & Jadwal Panen Dibuat',
        message: `Siklus ${newCycleForm.name} telah dijadwalkan panen pada ${harvestTarget}.`,
      });
      setIsAddCycleOpen(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & KPI Projections */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <CalendarDays className="w-4 h-4" />
              <span>Pusat Logistik & Rotasi Panen</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">Kalender Panen & Jadwal Tanam</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5 max-w-2xl">
              Peta visual komprehensif fase HST, jadwal panen raya antar tunnel, serta proyeksi omzet kas masuk.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportICS}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition active:scale-95 cursor-pointer backdrop-blur-xs"
              title="Ekspor ke Apple/Google Calendar"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Kalender (.ics)</span>
            </button>
            <button
              onClick={() => {
                setNewCycleForm({
                  name: `Siklus ${tunnels[0]?.name.split(' ')[0] || 'T1'} - ${new Date().toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })}`,
                  melonVariety: 'Inthanon RZ',
                  tunnel: tunnels[0]?.name || 'Tunnel 1',
                  plantingDate: new Date().toISOString().split('T')[0],
                  targetDays: 70,
                  plantCount: 700,
                });
                setIsAddCycleOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Jadwal Tanam Baru</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-white/10">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-1">
            <span className="text-[11px] text-slate-400 font-medium block">
              Panen 90 Hari ke Depan
            </span>
            <div className="text-xl font-black text-emerald-400">
              {next90DaysProjection.count} Siklus
            </div>
            <span className="text-[10px] text-slate-400">
              Est. {(next90DaysProjection.totalEstKg / 1000).toFixed(1)} Ton Buah
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-1">
            <span className="text-[11px] text-slate-400 font-medium block">
              Proyeksi Nilai Omzet
            </span>
            <div className="text-xl font-black text-white font-mono">
              {formatCurrency(next90DaysProjection.totalEstRev)}
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">Estimasi Arus Kas Masuk</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-1">
            <span className="text-[11px] text-slate-400 font-medium block">
              Panen Raya Terdekat
            </span>
            <div className="text-xl font-black text-amber-300">
              {next90DaysProjection.daysToNearest !== null
                ? `${next90DaysProjection.daysToNearest} Hari Lagi`
                : 'Belum Ada'}
            </div>
            <span className="text-[10px] text-slate-300 truncate block">
              {next90DaysProjection.nearestHarvest
                ? `${next90DaysProjection.nearestHarvest.tunnel} (${next90DaysProjection.nearestHarvest.variety})`
                : '-'}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-1">
            <span className="text-[11px] text-slate-400 font-medium block">Status Rotasi Tanam</span>
            <div className="text-xl font-black text-teal-300">
              {cycles.filter((c) => c.status !== 'Selesai').length} Aktif
            </div>
            <span className="text-[10px] text-slate-400">Pola Staggered Terjadwal</span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <span>Kalender Bulanan</span>
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'timeline'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Gantt Chart & Rotasi</span>
          </button>
          <button
            onClick={() => setViewMode('agenda')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'agenda'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Agenda Kegiatan</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {viewMode === 'calendar' && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-extrabold text-slate-900 px-2 min-w-[120px] text-center">
                {monthNames[month]} {year}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition ml-1 cursor-pointer"
              >
                Hari Ini
              </button>
            </div>
          )}

          <select
            value={selectedTunnel}
            onChange={(e) => setSelectedTunnel(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="all">Semua Tunnel</option>
            {tunnels.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>

          {varieties.length > 0 && (
            <select
              value={selectedVariety}
              onChange={(e) => setSelectedVariety(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">Semua Varietas</option>
              {varieties.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-2 text-xs font-semibold text-slate-600">
        <span className="text-slate-400 font-bold uppercase text-[10px]">Panduan Warna:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600" />
          <span>Panen Raya</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-teal-500" />
          <span>Pindah Tanam (0 HST)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-purple-500" />
          <span>Polinasi Bunga</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Gantung Buah</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Fase Netting</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500" />
          <span>Uji Brix & Ripening</span>
        </div>
      </div>

      {/* VIEW 1: MONTHLY CALENDAR GRID */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs animate-in fade-in">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-black text-slate-700 uppercase tracking-wider py-3">
            <div>Senin</div>
            <div>Selasa</div>
            <div>Rabu</div>
            <div>Kamis</div>
            <div>Jumat</div>
            <div className="text-emerald-700">Sabtu</div>
            <div className="text-rose-600">Minggu</div>
          </div>
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {calendarDays.map((cell, idx) => {
              const hasEvents = cell.events.length > 0;
              const hasHarvest = cell.events.some((e) => e.type === 'panen');
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (hasEvents) {
                      setSelectedDayEvents({
                        dateStr: cell.dateStr,
                        events: cell.events,
                      });
                    }
                  }}
                  className={`min-h-[105px] sm:min-h-[125px] p-2 flex flex-col justify-between transition relative ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/40 text-slate-400'
                      : 'bg-white text-slate-800'
                  } ${cell.isToday ? 'ring-2 ring-emerald-500/80 bg-emerald-50/30' : ''} ${
                    hasEvents ? 'cursor-pointer hover:bg-slate-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black px-1.5 py-0.5 rounded-lg ${
                        cell.isToday
                          ? 'bg-emerald-600 text-white'
                          : cell.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {hasHarvest && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    )}
                  </div>

                  <div className="space-y-1 my-1 overflow-hidden">
                    {cell.events.slice(0, 2).map((ev) => {
                      const col = EVENT_COLORS[ev.type];
                      return (
                        <div
                          key={ev.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-semibold border ${
                            ev.type === 'panen'
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                              : `${col.bg} ${col.text} ${col.border}`
                          }`}
                          title={`${ev.title} (${ev.tunnel})`}
                        >
                          {ev.type === 'panen' ? '🍈 ' : ''}
                          {ev.cycleName.split(' ')[0]}: {col.label}
                        </div>
                      );
                    })}
                    {cell.events.length > 2 && (
                      <span className="text-[9px] font-bold text-slate-500 pl-1 block">
                        +{cell.events.length - 2} kegiatan lagi
                      </span>
                    )}
                  </div>

                  <div className="text-[9px] text-slate-400 text-right">
                    {hasHarvest && (
                      <span className="font-extrabold text-emerald-700">Panen Raya</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: TIMELINE & GANTT */}
      {viewMode === 'timeline' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs animate-in fade-in">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Visualisasi Progres Siklus & Rotasi Tanam Antar Tunnel
              </h3>
              <p className="text-xs text-slate-500">
                Pola penanaman bertingkat (Staggered) memastikan kontinuitas panen melon DFT tanpa periode kosong.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              {cycles.length} Total Siklus
            </span>
          </div>

          <div className="space-y-5">
            {cycles.map((c) => {
              const plantDate = c.plantingDate || c.startDate;
              const targetHarvest = c.harvestTargetDate || addDays(plantDate, 70);
              const todayStr = new Date().toISOString().split('T')[0];
              const totalDays = Math.max(1, getDaysDiff(plantDate, targetHarvest));
              const passedDays = Math.max(0, getDaysDiff(plantDate, todayStr));
              const progressPercent = Math.min(100, Math.round((passedDays / totalDays) * 100));
              const isHarvested = c.status === 'Selesai';
              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm text-slate-900">{c.name}</h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-700 border border-slate-300">
                          {c.tunnel}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {c.melonVariety}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tanam: <strong>{plantDate}</strong> &rarr; Target Panen: <strong>{targetHarvest}</strong> ({totalDays} Hari Total)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900">
                        {isHarvested ? 'Selesai Panen' : `HST ${passedDays} / ${totalDays} Hari`}
                      </span>
                      <span className="block text-[11px] text-emerald-700 font-extrabold">
                        {progressPercent}% Masa Tumbuh
                      </span>
                    </div>
                  </div>

                  <div className="relative pt-3 pb-1">
                    <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isHarvested
                            ? 'bg-slate-400'
                            : progressPercent >= 90
                            ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                            : 'bg-gradient-to-r from-teal-500 to-emerald-600'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-semibold pt-2">
                      <span>0 HST (Tanam)</span>
                      <span>22 HST (Polinasi)</span>
                      <span>32 HST (Seleksi)</span>
                      <span>48 HST (Netting)</span>
                      <span>63 HST (Brix)</span>
                      <span className="font-bold text-emerald-700">
                        {totalDays} HST (Panen)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: AGENDA LIST VIEW */}
      {viewMode === 'agenda' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 animate-in fade-in">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Daftar Seluruh Agenda Budidaya & Jadwal Panen
              </h3>
              <p className="text-xs text-slate-500">
                Checklist tahapan krusial melon hidroponik DFT terurut berdasarkan tanggal
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {filteredMilestones.length} Kegiatan Terjadwal
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredMilestones.map((ev) => {
              const col = EVENT_COLORS[ev.type];
              const isPast = new Date(ev.date) < new Date(new Date().toISOString().split('T')[0]);
              return (
                <div
                  key={ev.id}
                  className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition rounded-2xl px-3 ${
                    ev.type === 'panen' ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                        ev.type === 'panen'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : `${col.bg} ${col.text}`
                      }`}
                    >
                      {ev.type === 'panen' ? (
                        <ShoppingBag className="w-5 h-5" />
                      ) : (
                        <Sprout className="w-5 h-5" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900">{ev.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700">
                          {ev.tunnel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{ev.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900 block font-mono">{ev.date}</span>
                      <span
                        className={`text-[10px] font-bold ${
                          isPast ? 'text-slate-400' : 'text-emerald-700'
                        }`}
                      >
                        {isPast ? 'Telah Lewat' : 'Mendatang'}
                      </span>
                    </div>
                    {ev.estRevenue && (
                      <div className="p-2 rounded-xl bg-white border border-emerald-200 text-right">
                        <span className="text-[9px] text-slate-400 block">Est. Omzet:</span>
                        <span className="text-xs font-black text-emerald-800 font-mono">
                          {formatCurrency(ev.estRevenue)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Day Events Detail Modal */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Agenda Tanggal: {selectedDayEvents.dateStr}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedDayEvents.events.length} Kegiatan Terjadwal pada hari ini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {selectedDayEvents.events.map((ev) => {
                const col = EVENT_COLORS[ev.type];
                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-2xl border space-y-2 ${
                      ev.type === 'panen'
                        ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900">{ev.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase ${col.bg} ${col.text}`}
                      >
                        {col.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Unit: {ev.tunnel}</span>
                      {ev.estKg && (
                        <span className="font-extrabold text-emerald-800 font-mono">
                          Est. {ev.estKg.toLocaleString('id-ID')} Kg ({formatCurrency(ev.estRevenue || 0)})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Scheduled Cycle Modal */}
      {isAddCycleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Sprout className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Jadwalkan Siklus Tanam & Panen Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sistem otomatis menghitung tanggal polinasi, gantung buah, dan panen raya
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddCycleOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCycle} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Siklus Tanam
                </label>
                <input
                  type="text"
                  value={newCycleForm.name}
                  onChange={(e) => setNewCycleForm({ ...newCycleForm, name: e.target.value })}
                  required
                  placeholder="Contoh: Siklus 2 Tunnel 1 - Inthanon"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Pilih Unit Tunnel
                  </label>
                  <select
                    value={newCycleForm.tunnel}
                    onChange={(e) =>
                      setNewCycleForm({ ...newCycleForm, tunnel: e.target.value as TunnelType })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    {tunnels.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Varietas Melon
                  </label>
                  <input
                    type="text"
                    value={newCycleForm.melonVariety}
                    onChange={(e) =>
                      setNewCycleForm({ ...newCycleForm, melonVariety: e.target.value })
                    }
                    required
                    placeholder="Inthanon RZ / Fujisawa / Golden Emerald"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tanggal Pindah Tanam (0 HST)
                  </label>
                  <input
                    type="date"
                    value={newCycleForm.plantingDate}
                    onChange={(e) =>
                      setNewCycleForm({ ...newCycleForm, plantingDate: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Lama Siklus Panen (Hari)
                  </label>
                  <input
                    type="number"
                    value={newCycleForm.targetDays}
                    onChange={(e) =>
                      setNewCycleForm({ ...newCycleForm, targetDays: Number(e.target.value) })
                    }
                    min={55}
                    max={90}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Populasi Tanaman (Lubang Tanam DFT)
                  </label>
                  <input
                    type="number"
                    value={newCycleForm.plantCount}
                    onChange={(e) =>
                      setNewCycleForm({ ...newCycleForm, plantCount: Number(e.target.value) })
                    }
                    min={100}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Kalkulasi Otomatis Sistem:</span>
                </div>
                <div className="text-[11px] grid grid-cols-2 gap-1 pt-1 text-slate-700">
                  <div>
                    Semai: <strong>{addDays(newCycleForm.plantingDate, -10)}</strong>
                  </div>
                  <div>
                    Polinasi: <strong>{addDays(newCycleForm.plantingDate, 22)}</strong>
                  </div>
                  <div>
                    Gantung Buah: <strong>{addDays(newCycleForm.plantingDate, 32)}</strong>
                  </div>
                  <div className="text-emerald-800 font-extrabold">
                    Target Panen:{' '}
                    <strong>{addDays(newCycleForm.plantingDate, newCycleForm.targetDays)}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCycleOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                >
                  Jadwalkan Siklus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
