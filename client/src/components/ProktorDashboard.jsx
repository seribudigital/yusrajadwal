import React, { useState, useEffect } from 'react';

export default function ProktorDashboard({ token, user, setUser, setToken, showToast, API_BASE }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGurus: 0,
    totalMapels: 0,
    totalPlots: 0,
    totalJadwals: 0
  });
  const [users, setUsers] = useState([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores user ID of action
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  const fetchAdminData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [resStats, resUsers, resAnnounce] = await Promise.all([
        fetch(`${API_BASE}/proktor/dashboard`, { headers }),
        fetch(`${API_BASE}/proktor/users`, { headers }),
        fetch(`${API_BASE}/proktor/announcement`, { headers })
      ]);

      if (resStats.status === 401 || resUsers.status === 401) {
        handleLogout();
        return;
      }

      if (!resStats.ok || !resUsers.ok) {
        throw new Error('Gagal memuat data admin dari server.');
      }

      const statsData = await resStats.json();
      const usersData = await resUsers.json();
      const announceData = await resAnnounce.json();

      setStats(statsData);
      setUsers(usersData);
      setAnnouncementText(announceData.text || '');
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat data dashboard: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAdminData();
    }
  }, [token]);

  const toggleUserStatus = async (userId, currentStatus) => {
    setActionLoading(userId);
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`${API_BASE}/proktor/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal memperbarui status pengguna.');
      }

      showToast(`Berhasil mengubah status pengguna menjadi ${newStatus === 'ACTIVE' ? 'Aktif' : 'Ditangguhkan'}.`);
      
      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(u => u.id === userId ? { ...u, status: newStatus } : u)
      );
      
      // Refresh dashboard stats if needed
      fetchAdminData();
    } catch (err) {
      console.error(err);
      showToast('Gagal mengubah status: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus akun ${userEmail} beserta seluruh data jadwalnya secara permanen?`)) {
      return;
    }
    setDeleteLoading(userId);
    try {
      const res = await fetch(`${API_BASE}/proktor/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal menghapus pengguna.');
      }

      showToast(`Berhasil menghapus akun ${userEmail}.`);
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      fetchAdminData();
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus akun: ' + err.message, 'error');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setBroadcastLoading(true);
    try {
      const res = await fetch(`${API_BASE}/proktor/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: announcementText })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal mengirim pengumuman.');
      }

      showToast('Pengumuman global berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengirim pengumuman: ' + err.message, 'error');
    } finally {
      setBroadcastLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    showToast('Anda telah keluar dari dashboard Proktor.');
  };

  // Mock license income (e.g. active paying users count * Rp 299.000)
  const activeSchools = users.filter(u => u.role !== 'SUPER_ADMIN' && u.status === 'ACTIVE').length;
  const totalLicenseIncome = activeSchools * 299000;

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
          <p className="text-slate-400 text-sm font-semibold">Memuat Proktor Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden w-full">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-0 sm:h-16 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="text-2xl shrink-0">⚡</span>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent truncate">
                Yusra Jadwal Proktor
              </h1>
              <p className="text-[9px] sm:text-[10px] text-indigo-400 font-semibold tracking-wider uppercase truncate">System Super Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-300">{user?.email}</span>
              <span className="text-[10px] text-emerald-400 font-medium">Proktor Active</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 hover:border-rose-500/50 text-rose-300 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1"
            >
              <span>Logout</span>
              <span>🚪</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Banner Announcement */}
        <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900/40 to-cyan-950/40 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Broadcast Announcement Banner</h2>
            <p className="text-xs text-slate-400">Pesan ini akan langsung ditampilkan kepada semua administrator sekolah di atas halaman mereka.</p>
          </div>
          <form onSubmit={handleBroadcast} className="flex-1 max-w-xl w-full flex items-center gap-3">
            <input
              type="text"
              placeholder="Masukkan pesan pengumuman global di sini..."
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full transition-all"
            />
            <button
              type="submit"
              disabled={broadcastLoading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors shadow-md flex items-center gap-2 shrink-0"
            >
              {broadcastLoading ? 'Mengirim...' : 'Broadcast 📢'}
            </button>
          </form>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-md hover:border-slate-700/60 transition-all flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center text-xl">
              🏫
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Schools</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.totalUsers - 1 > 0 ? stats.totalUsers - 1 : 0}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Registered clients</p>
            </div>
          </div>
          {/* Card 2 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-md hover:border-slate-700/60 transition-all flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-xl">
              👥
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Active Gurus</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.totalGurus}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Registered across platform</p>
            </div>
          </div>
          {/* Card 3 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-md hover:border-slate-700/60 transition-all flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center text-xl">
              📅
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Schedules</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stats.totalJadwals}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Placed lesson slots</p>
            </div>
          </div>
          {/* Card 4 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-md hover:border-slate-700/60 transition-all flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-purple-950/50 border border-purple-500/30 flex items-center justify-center text-xl">
              💰
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">License Income</p>
              <h3 className="text-xl font-bold text-white mt-1">{formatRupiah(totalLicenseIncome)}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{activeSchools} Active Subscriptions</p>
            </div>
          </div>
        </div>

        {/* User Management Section */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Registered School Accounts</h2>
              <p className="text-xs text-slate-400 mt-0.5">Kelola lisensi, status, dan batasan operasional penyusunan jadwal sekolah.</p>
            </div>
            <button
              onClick={fetchAdminData}
              className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Refresh Table 🔄
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                  <th className="py-4 px-6">Nama Sekolah / Admin</th>
                  <th className="py-4 px-6">Email</th>
                  <th className="py-4 px-6">Tanggal Registrasi</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Aksi Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500 font-medium">
                      Tidak ada sekolah terdaftar.
                    </td>
                  </tr>
                ) : (
                  users.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/35 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-white">
                          {item.nama_sekolah || (item.role === 'SUPER_ADMIN' ? 'PROKTOR CENTRAL' : 'Sekolah Tanpa Nama')}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {item.id}</div>
                      </td>
                      <td className="py-4 px-6 text-slate-300 font-medium">
                        {item.email}
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                          item.role === 'SUPER_ADMIN'
                            ? 'bg-amber-950/60 border border-amber-500/40 text-amber-300'
                            : 'bg-indigo-950/60 border border-indigo-500/40 text-indigo-300'
                        }`}>
                          {item.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-950/60 border border-rose-500/30 text-rose-400'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${item.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                          {item.status === 'ACTIVE' ? 'Aktif' : 'Ditangguhkan'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {item.role === 'SUPER_ADMIN' ? (
                          <span className="text-xs text-slate-500 italic">No Action Needed</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleUserStatus(item.id, item.status)}
                              disabled={actionLoading === item.id || deleteLoading === item.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                item.status === 'ACTIVE'
                                  ? 'bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/50 text-rose-300 hover:border-rose-500/50'
                                  : 'bg-emerald-950/30 hover:bg-emerald-900/50 border border-emerald-900/50 text-emerald-300 hover:border-emerald-500/50'
                              } disabled:opacity-40`}
                            >
                              {actionLoading === item.id 
                                ? 'Proses...' 
                                : item.status === 'ACTIVE' ? 'Tangguhkan 🚫' : 'Aktifkan Akun 🔓'
                              }
                            </button>
                            <button
                              onClick={() => deleteUser(item.id, item.email)}
                              disabled={actionLoading === item.id || deleteLoading === item.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-red-950/40 hover:bg-red-900/60 border border-red-900/60 text-red-300 hover:border-red-500/60 disabled:opacity-40"
                              title="Hapus Akun Permanen"
                            >
                              {deleteLoading === item.id ? '...' : 'Hapus 🗑️'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600">
        © 2026 Yusra Jadwal Proktor Central. Created by anamf.
      </footer>
    </div>
  );
}
