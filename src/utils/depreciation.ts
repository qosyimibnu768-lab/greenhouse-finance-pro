import { Asset } from '../types';

export interface AssetDepreciation {
  /** Nilai perolehan = harga satuan × jumlah */
  acquisitionValue: number;
  /** Masa manfaat dalam bulan */
  lifeMonths: number;
  /** Umur aset dalam bulan (sejak tanggal perolehan) */
  ageMonths: number;
  /** Beban penyusutan per bulan (garis lurus) */
  monthlyDepreciation: number;
  /** Akumulasi penyusutan sampai saat ini */
  accumulatedDepreciation: number;
  /** Nilai buku = perolehan − akumulasi */
  bookValue: number;
  /** Persentase sudah disusutkan (0–100) */
  percentDepreciated: number;
  /** Sisa masa manfaat (bulan) */
  remainingMonths: number;
  /** Sudah habis masa manfaatnya */
  isFullyDepreciated: boolean;
}

/**
 * Penyusutan garis lurus (straight-line):
 *   beban/bulan = nilai perolehan ÷ (masa manfaat tahun × 12)
 *   akumulasi   = beban/bulan × jumlah bulan terpakai (dibatasi masa manfaat)
 *   nilai buku  = nilai perolehan − akumulasi
 */
export function calcAssetDepreciation(asset: Asset, asOf: Date = new Date()): AssetDepreciation {
  const acquisitionValue = (Number(asset.purchasePrice) || 0) * (Number(asset.quantity) || 1);
  const lifeMonths = Math.max(1, Math.round((Number(asset.economicLifeYears) || 1) * 12));
  const monthlyRaw = acquisitionValue / lifeMonths;

  let ageMonths = 0;
  const start = new Date(asset.purchaseDate || '');
  if (!isNaN(start.getTime())) {
    ageMonths = (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth());
    if (asOf.getDate() < start.getDate()) ageMonths -= 1; // bulan berjalan belum genap
    ageMonths = Math.max(0, ageMonths);
  }

  const elapsed = Math.min(ageMonths, lifeMonths);
  const accumulated = Math.min(acquisitionValue, Math.round(monthlyRaw * elapsed));

  return {
    acquisitionValue,
    lifeMonths,
    ageMonths,
    monthlyDepreciation: Math.round(monthlyRaw),
    accumulatedDepreciation: accumulated,
    bookValue: Math.max(0, Math.round(acquisitionValue - accumulated)),
    percentDepreciated: acquisitionValue > 0 ? (accumulated / acquisitionValue) * 100 : 0,
    remainingMonths: Math.max(0, lifeMonths - elapsed),
    isFullyDepreciated: elapsed >= lifeMonths,
  };
}

/** 27 bulan -> "2 thn 3 bln" */
export function formatMonths(totalMonths: number): string {
  const m = Math.max(0, Math.round(totalMonths));
  const years = Math.floor(m / 12);
  const months = m % 12;
  if (years <= 0) return `${months} bln`;
  if (months === 0) return `${years} thn`;
  return `${years} thn ${months} bln`;
}
