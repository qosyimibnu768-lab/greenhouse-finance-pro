import { Tunnel } from '../types';

/**
 * Nilai agregat lama -> baru. 'Kedua Tunnel' & 'Semua / Gabungan Greenhouse'
 * diganti menjadi satu nilai baku: 'Semua Greenhouse'.
 */
export const AGGREGATE_GREENHOUSE = 'Semua Greenhouse';

/**
 * Migrasi nama lama "Tunnel N" -> "Greenhouse N" pada unit & seluruh referensinya
 * (transaksi, panen, siklus, investasi, data HR). Idempoten & aman dijalankan berulang.
 */
export function migrateLegacyGreenhouseNaming(database: any): { data: any; changed: boolean } {
  if (!database || typeof database !== 'object') return { data: database, changed: false };

  let changed = false;

  const renames: Record<string, string> = {
    'Kedua Tunnel': AGGREGATE_GREENHOUSE,
    'Semua / Gabungan Greenhouse': AGGREGATE_GREENHOUSE,
  };

  const tunnels: any[] = Array.isArray(database.tunnels) ? database.tunnels : [];
  tunnels.forEach((t) => {
    if (t && typeof t.name === 'string' && /^Tunnel\s+/i.test(t.name)) {
      renames[t.name] = t.name.replace(/^Tunnel\s+/i, 'Greenhouse ');
    }
  });

  const renameValue = (value: any): any => {
    if (typeof value !== 'string') return value;
    // Peta dari nama unit yang ada, atau fallback pola "Tunnel N" -> "Greenhouse N"
    const renamed = renames[value] || value.replace(/^Tunnel\s+/i, 'Greenhouse ');
    if (renamed !== value) {
      changed = true;
      return renamed;
    }
    return value;
  };

  tunnels.forEach((t) => {
    if (t && typeof t.name === 'string') {
      t.name = renameValue(t.name);
    }
  });

  ['transactions', 'harvests', 'cycles', 'investments'].forEach((key) => {
    const list = database[key];
    if (Array.isArray(list)) {
      list.forEach((item) => {
        if (item && typeof item.tunnel === 'string') {
          item.tunnel = renameValue(item.tunnel);
        }
      });
    }
  });

  ['employees', 'workShifts', 'attendances', 'leaveRequests', 'overtimeRequests', 'payrolls'].forEach((key) => {
    const list = database[key];
    if (Array.isArray(list)) {
      list.forEach((item) => {
        if (item && typeof item.greenhouse === 'string') {
          item.greenhouse = renameValue(item.greenhouse);
        }
      });
    }
  });

  return { data: database, changed };
}

/**
 * Utilitas spesifikasi greenhouse — semua teks spesifikasi di aplikasi
 * diambil dari data pada menu Manajemen GH (daftar unit), sehingga:
 *  - Data diisi  → spesifikasi muncul otomatis sesuai isian.
 *  - Data kosong → spesifikasi ikut hilang (tidak ada teks lama yang nyangkut).
 */

export function getStructureMaterials(tunnels: Tunnel[] = []): string {
  return Array.from(
    new Set((tunnels || []).map((t) => (t.structureMaterial || '').trim()).filter(Boolean))
  ).join(' & ');
}

export function getSystemTypes(tunnels: Tunnel[] = []): string {
  return Array.from(
    new Set((tunnels || []).map((t) => (t.systemType || '').trim()).filter(Boolean))
  ).join(' & ');
}

export function getTotalCapacity(tunnels: Tunnel[] = []): number {
  return (tunnels || []).reduce((sum, t) => sum + (Number(t.capacityPlants) || 0), 0);
}

/** Baris ringkas spesifikasi greenhouse, contoh:
 *  "Greenhouse Bambu Petung Super 2 Unit (15 × 48 m) · Greenhouse 1 (8×48m) & Greenhouse 2 (7×48m) · Sistem DFT Hydroponic Kapasitas 2.000 Tanaman"
 *  Mengembalikan string kosong bila belum ada data unit. */
export function buildGreenhouseSpecLine(tunnels: Tunnel[] = []): string {
  if (!tunnels || tunnels.length === 0) return '';

  const totalWidth = tunnels.reduce((sum, t) => sum + (Number(t.widthM) || 0), 0);
  const maxLength = Math.max(...tunnels.map((t) => Number(t.lengthM) || 0));
  const totalCapacity = getTotalCapacity(tunnels);
  const materials = getStructureMaterials(tunnels);
  const systems = getSystemTypes(tunnels);
  const unitDetails = tunnels.map((t) => `${t.name} (${t.widthM}×${t.lengthM}m)`).join(' & ');

  const parts: string[] = [];
  parts.push(`Greenhouse${materials ? ` ${materials}` : ''} ${tunnels.length} Unit (${totalWidth} × ${maxLength} m)`);
  if (unitDetails) parts.push(unitDetails);
  const capacityText = totalCapacity > 0 ? `Kapasitas ${totalCapacity.toLocaleString('id-ID')} Tanaman` : '';
  if (systems && capacityText) parts.push(`Sistem ${systems} ${capacityText}`);
  else if (systems) parts.push(`Sistem ${systems}`);
  else if (capacityText) parts.push(capacityText);
  return parts.join(' · ');
}
