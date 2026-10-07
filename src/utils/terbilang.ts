/** Ubah angka menjadi terbilang Bahasa Indonesia, mis. 1.250.000 -> "Satu Juta Dua Ratus Lima Puluh Ribu Rupiah" */
export function terbilang(n: number): string {
  const satuan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];
  const f = (x: number): string => {
    x = Math.floor(x);
    if (x <= 0) return '';
    if (x < 12) return satuan[x];
    if (x < 20) return f(x - 10) + ' Belas';
    if (x < 100) return f(Math.floor(x / 10)) + ' Puluh ' + f(x % 10);
    if (x < 200) return 'Seratus ' + f(x - 100);
    if (x < 1000) return f(Math.floor(x / 100)) + ' Ratus ' + f(x % 100);
    if (x < 2000) return 'Seribu ' + f(x - 1000);
    if (x < 1000000) return f(Math.floor(x / 1000)) + ' Ribu ' + f(x % 1000);
    if (x < 1000000000) return f(Math.floor(x / 1000000)) + ' Juta ' + f(x % 1000000);
    if (x < 1000000000000) return f(Math.floor(x / 1000000000)) + ' Miliar ' + f(x % 1000000000);
    return f(Math.floor(x / 1000000000000)) + ' Triliun ' + f(x % 1000000000000);
  };
  if (n <= 0) return 'Nol Rupiah';
  return f(n).trim().replace(/\s+/g, ' ') + ' Rupiah';
}
