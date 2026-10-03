import React, { useState, useEffect, useRef } from 'react';
import { useGreenhouse } from '../../context/GreenhouseContext';
import { Employee, EmploymentStatus, SalaryPaymentType, WorkArea } from '../../types';
import { X, Camera, RefreshCw, User, Briefcase, DollarSign, Building, Phone, MapPin, CheckCircle } from 'lucide-react';

interface RegisterStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeToEdit?: Employee | null;
}

export const RegisterStaffModal: React.FC<RegisterStaffModalProps> = ({
  isOpen,
  onClose,
  employeeToEdit,
}) => {
  const { db, addEmployee, updateEmployee, addToast } = useGreenhouse();

  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    nikInternal: '',
    gender: 'Laki-laki',
    phone: '',
    address: '',
    position: 'Operator Nutrisi DFT',
    division: 'Operasional Kebun',
    greenhouse: 'Tunnel 1',
    workArea: 'Nutrisi',
    joinDate: new Date().toISOString().split('T')[0],
    employmentStatus: 'Tetap',
    salaryType: 'Bulanan',
    baseSalary: 3500000,
    dailyRate: 120000,
    hourlyRate: 20000,
    overtimeRate: 25000,
    bankName: 'BCA',
    bankAccount: '',
    defaultShiftId: db.workShifts?.[0]?.id || 'SHIFT-01',
    avatarUrl: '',
    isActive: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (employeeToEdit) {
      setFormData(employeeToEdit);
    } else {
      const nextNum = (db.employees?.length || 0) + 1;
      const autoNik = `NIK-GH-2026-${String(nextNum).padStart(3, '0')}`;
      setFormData({
        name: '',
        nikInternal: autoNik,
        gender: 'Laki-laki',
        phone: '',
        address: '',
        position: 'Operator Nutrisi DFT',
        division: 'Operasional Kebun',
        greenhouse: 'Tunnel 1',
        workArea: 'Nutrisi',
        joinDate: new Date().toISOString().split('T')[0],
        employmentStatus: 'Tetap',
        salaryType: 'Bulanan',
        baseSalary: 3500000,
        dailyRate: 120000,
        hourlyRate: 20000,
        overtimeRate: 25000,
        bankName: 'BCA',
        bankAccount: '',
        defaultShiftId: db.workShifts?.[0]?.id || 'SHIFT-01',
        avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80`,
        isActive: true,
      });
    }
  }, [employeeToEdit, db.employees, isOpen]);

  // Camera stream handler
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (showCamera) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'user' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch((err) => {
          console.error('Camera access failed', err);
          addToast('Tidak dapat mengakses kamera perangkat', 'warning');
          setShowCamera(false);
        });
    }
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [showCamera, addToast]);

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 400;
      canvas.height = videoRef.current.videoHeight || 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setFormData((prev) => ({ ...prev, avatarUrl: dataUrl }));
        setShowCamera(false);
        addToast('Foto wajah berhasil diambil untuk verifikasi biometrik', 'success');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      addToast('Nama lengkap karyawan wajib diisi', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      if (employeeToEdit) {
        await updateEmployee(employeeToEdit.id, formData);
        addToast(`Data karyawan ${formData.name} berhasil diperbarui`, 'success');
      } else {
        await addEmployee(formData as any);
        addToast(`Karyawan baru ${formData.name} berhasil didaftarkan`, 'success');
      }
      onClose();
    } catch (err: any) {
      addToast('Gagal menyimpan karyawan: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden border border-emerald-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <User className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {employeeToEdit ? 'Edit Profil Karyawan' : 'Registrasi Karyawan Baru'}
              </h2>
              <p className="text-xs text-emerald-100">
                Pencatatan data tenaga kerja, biometrik, dan parameter payroll
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-sm">
          {/* Section 1: Profil & Foto */}
          <div>
            <h3 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> 1. Data Diri & Biometrik Wajah
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Photo Box */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-200 rounded-xl p-4 bg-emerald-50/50">
                {showCamera ? (
                  <div className="relative w-36 h-36 rounded-full overflow-hidden bg-black mb-3">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <img
                    src={
                      formData.avatarUrl ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
                    }
                    alt="Preview"
                    className="w-32 h-32 rounded-full object-cover shadow-md border-4 border-white mb-3"
                  />
                )}

                <div className="flex items-center gap-2 w-full justify-center">
                  {showCamera ? (
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 flex items-center gap-1.5 shadow"
                    >
                      <Camera className="w-3.5 h-3.5" /> Ambil Foto
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCamera(true)}
                      className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-lg text-xs font-medium hover:bg-emerald-50 flex items-center gap-1.5 shadow-sm"
                    >
                      <Camera className="w-3.5 h-3.5" /> Buka Kamera
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Atau URL Foto..."
                  value={formData.avatarUrl || ''}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  className="mt-3 w-full text-xs px-2.5 py-1.5 rounded-lg border border-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Bio Inputs */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">NIK Internal</label>
                  <input
                    type="text"
                    value={formData.nikInternal || ''}
                    onChange={(e) => setFormData({ ...formData, nikInternal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.gender || 'Laki-laki'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="081234567890"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Alamat Domisili</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Alamat tempat tinggal / desa sekitar kebun"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Section 2: Penugasan & Shift */}
          <div>
            <h3 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> 2. Jabatan, Wilayah Penugasan & Shift
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jabatan / Peran</label>
                <input
                  type="text"
                  value={formData.position || ''}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Kepala Kebun / Operator Nutrisi / Teknisi"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Divisi Kerja</label>
                <select
                  value={formData.division || 'Operasional Kebun'}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                >
                  <option value="Operasional Kebun">Operasional Kebun</option>
                  <option value="Nutrisi & DFT">Nutrisi & DFT</option>
                  <option value="Maintenance & Listrik">Maintenance & Listrik</option>
                  <option value="QC & Logistik Panen">QC & Logistik Panen</option>
                  <option value="Sanitasi & Nursery">Sanitasi & Nursery</option>
                  <option value="Administrasi & Finance">Administrasi & Finance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Penugasan Greenhouse</label>
                <select
                  value={formData.greenhouse || 'Semua / Gabungan'}
                  onChange={(e) => setFormData({ ...formData, greenhouse: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                >
                  <option value="Semua / Gabungan Greenhouse">Semua / Gabungan Greenhouse</option>
                  {db.tunnels.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} ({t.systemType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Area Kerja Spesifik</label>
                <select
                  value={formData.workArea || 'Nutrisi'}
                  onChange={(e) => setFormData({ ...formData, workArea: e.target.value as WorkArea })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                >
                  <option value="Nutrisi">Nutrisi DFT</option>
                  <option value="Budidaya">Budidaya & Pangkas</option>
                  <option value="Penyiraman">Penyiraman & Otomasi</option>
                  <option value="Sanitasi">Sanitasi & Kebersihan</option>
                  <option value="Panen">Panen</option>
                  <option value="Packing">Packing & Sortasi</option>
                  <option value="Maintenance">Maintenance & Pompa</option>
                  <option value="Administrasi">Administrasi</option>
                  <option value="Security">Security & Ronda</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status Ketenagakerjaan</label>
                <select
                  value={formData.employmentStatus || 'Tetap'}
                  onChange={(e) =>
                    setFormData({ ...formData, employmentStatus: e.target.value as EmploymentStatus })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                >
                  <option value="Tetap">Karyawan Tetap</option>
                  <option value="Kontrak">Kontrak</option>
                  <option value="Harian">Harian Lepas</option>
                  <option value="Freelance">Borongan / Freelance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Jadwal Shift Standar</label>
                <select
                  value={formData.defaultShiftId || 'SHIFT-01'}
                  onChange={(e) => setFormData({ ...formData, defaultShiftId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                >
                  {(db.workShifts || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Section 3: Penggajian & Rekening */}
          <div>
            <h3 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> 3. Struktur Upah & Informasi Bank
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipe Pembayaran Gaji</label>
                <select
                  value={formData.salaryType || 'Bulanan'}
                  onChange={(e) =>
                    setFormData({ ...formData, salaryType: e.target.value as SalaryPaymentType })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                >
                  <option value="Bulanan">Bulanan (Gaji Pokok)</option>
                  <option value="Harian">Harian (Upah Harian)</option>
                  <option value="Per Jam">Per Jam (Hourly Rate)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {formData.salaryType === 'Bulanan'
                    ? 'Gaji Pokok Bulanan (Rp)'
                    : formData.salaryType === 'Harian'
                    ? 'Upah Harian (Rp)'
                    : 'Upah Per Jam (Rp)'}
                </label>
                <input
                  type="number"
                  value={
                    formData.salaryType === 'Bulanan'
                      ? formData.baseSalary || 0
                      : formData.salaryType === 'Harian'
                      ? formData.dailyRate || 0
                      : formData.hourlyRate || 0
                  }
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (formData.salaryType === 'Bulanan') setFormData({ ...formData, baseSalary: val });
                    else if (formData.salaryType === 'Harian') setFormData({ ...formData, dailyRate: val });
                    else setFormData({ ...formData, hourlyRate: val });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none font-semibold text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tarif Lembur per Jam (Rp)
                </label>
                <input
                  type="number"
                  value={formData.overtimeRate || 0}
                  onChange={(e) => setFormData({ ...formData, overtimeRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nama Bank / Dompet</label>
                <input
                  type="text"
                  value={formData.bankName || 'BCA'}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="BCA / Mandiri / BRI / Cash"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nomor Rekening / Catatan Pembayaran
                </label>
                <input
                  type="text"
                  value={formData.bankAccount || ''}
                  onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                  placeholder="Contoh: 123456789 a/n Budi Santoso"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="staffActive"
                checked={formData.isActive ?? true}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="staffActive" className="text-xs font-medium text-gray-700">
                Karyawan Aktif Bekerja
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-800 transition shadow-lg shadow-emerald-700/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Menyimpan...' : employeeToEdit ? 'Simpan Perubahan' : 'Daftarkan Karyawan'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
