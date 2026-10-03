import React, { useState } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { AppUser, UserRole } from '../types';
import { formatDate } from '../utils/formatters';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Mail,
  User,
  CheckCircle2,
  X,
  Key,
  KeyRound,
  RotateCcw,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, currentUser, addToast } = useGreenhouse();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const [formData, setFormData] = useState<Partial<AppUser>>({
    name: '',
    username: '',
    email: '',
    role: 'Operator Kebun',
    password: '',
    phone: '',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
    status: 'Aktif',
  });

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      role: 'Operator Kebun',
      password: '',
      phone: '',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      status: 'Aktif',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    setEditingUser(user);
    setFormData(user);
    setIsModalOpen(true);
  };

  const handleQuickResetPassword = async (user: AppUser) => {
    const defaultPwd = 'user123';
    const ok = window.confirm(`Reset kata sandi pengguna "${user.name}" (@${user.username}) ke default "${defaultPwd}"?`);
    if (!ok) return;

    const success = await updateUser(user.id, { password: defaultPwd });
    if (success) {
      addToast({
        type: 'success',
        title: 'Kata Sandi Direset',
        message: `Kata sandi akun ${user.username} telah direset ke "${defaultPwd}".`,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.username) {
      addToast({ type: 'error', title: 'Form Tidak Lengkap', message: 'Nama dan username wajib diisi.' });
      return;
    }

    if (editingUser) {
      const updateData: Partial<AppUser> = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        role: formData.role,
        avatarUrl: formData.avatarUrl,
        phone: formData.phone,
        status: formData.status,
      };
      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password.trim();
      }
      await updateUser(editingUser.id, updateData);
      addToast({ type: 'success', title: 'Pengguna Diperbarui', message: `Data akun ${formData.name} berhasil disimpan.` });
    } else {
      if (!formData.password || formData.password.length < 6) {
        addToast({ type: 'error', title: 'Kata Sandi Lemah', message: 'Kata sandi minimal 6 karakter.' });
        return;
      }
      await addUser({
        name: formData.name,
        username: formData.username,
        email: formData.email || `${formData.username}@greenhouse.id`,
        role: formData.role || 'Operator Kebun',
        password: formData.password,
        phone: formData.phone || '',
        avatarUrl: formData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
        status: formData.status || 'Aktif',
      });
      addToast({ type: 'success', title: 'Pengguna Ditambahkan', message: `Akun baru ${formData.name} berhasil dibuat.` });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Hak Akses & Keamanan Login</span>
            </span>
          </div>
          <h1 className="text-2xl font-black mt-2 tracking-tight">Manajemen Pengguna Sistem</h1>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl leading-relaxed">
            Kelola akun otentikasi login, kata sandi pengguna, peran hak akses kebun, dan pemulihan kredensial.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tambah Pengguna Sistem
        </button>
      </div>

      {/* Users List Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
              <tr>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Username & Email</th>
                <th className="py-3 px-4">Peran Hak Akses</th>
                <th className="py-3 px-4">Status Akun</th>
                <th className="py-3 px-4">Terakhir Login</th>
                <th className="py-3 px-4 text-right">Aksi & Sandi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/80">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                        alt={u.name}
                        className="w-9 h-9 rounded-full object-cover border border-emerald-200"
                      />
                      <div>
                        <p className="font-bold text-gray-900">{u.name}</p>
                        {currentUser?.id === u.id && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.2 rounded-full">
                            Akun Anda
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    <p className="font-mono font-medium text-gray-800">@{u.username}</p>
                    <p className="text-[11px] text-gray-400">{u.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'Owner / Super Admin'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'Manajer Operasional'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'Aktif'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {u.lastLogin ? formatDate(u.lastLogin) : 'Belum pernah'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleQuickResetPassword(u)}
                        className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                        title="Reset kata sandi pengguna ini ke default"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                        title="Edit data & kata sandi akun"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {users.length > 1 && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Yakin ingin menghapus akun ${u.name}?`)) {
                              deleteUser(u.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Hapus akun"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-gray-900">
                  {editingUser ? 'Edit Pengguna Sistem' : 'Tambah Pengguna Sistem'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama lengkap staf"
                  className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="username"
                    className="w-full p-2.5 border border-gray-300 rounded-xl outline-none font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Status</label>
                  <select
                    value={formData.status || 'Aktif'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Aktif' | 'Nonaktif' })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Email Perusahaan</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="staf@greenhouse.id"
                  className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Peran Hak Akses</label>
                <select
                  value={formData.role || 'Operator Kebun'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Owner / Super Admin">Owner / Super Admin (Akses Penuh)</option>
                  <option value="Manajer Operasional">Manajer Operasional</option>
                  <option value="Operator Kebun">Operator Kebun</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-gray-700 font-bold">
                    {editingUser ? 'Kata Sandi Baru (Kosongkan jika tetap)' : 'Kata Sandi Login'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, password: 'ibnu123' })}
                    className="text-[10px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                  >
                    Isi default "ibnu123"
                  </button>
                </div>
                <input
                  type="password"
                  placeholder={editingUser ? 'Ketik sandi baru jika ingin diubah' : 'Minimal 6 karakter'}
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-xl outline-none font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">URL Foto Profil</label>
                <input
                  type="text"
                  value={formData.avatarUrl || ''}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-700/20 transition cursor-pointer active:scale-95"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
