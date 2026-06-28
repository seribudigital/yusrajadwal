import React from 'react';

const AuthPage = React.memo(function AuthPage({
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  showPassword,
  setShowPassword,
  authError,
  setAuthError,
  authLoading,
  handleAuthSubmit
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl w-full bg-slate-905/60 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 z-10">
        {/* Info Side (hidden on mobile) */}
        <div className="p-8 md:p-12 bg-gradient-to-br from-indigo-950/40 to-slate-900/40 border-r border-slate-800 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🗓️</span>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Yusra Jadwal
              </h2>
              <p className="text-xs text-slate-400">Platform Penjadwalan Sekolah</p>
            </div>
          </div>
          
          <div className="my-8 md:my-0 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-white leading-tight">
                Susun Jadwal Sekolah Anti-Pusing, Instan, dan Akurat.
              </h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Platform Asisten Cerdas untuk Manajemen Waktu dan Penjadwalan Sekolah Modern.
              </p>
            </div>
            <ul className="space-y-4 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Anti-Bentrok & Real-Time:</strong> Validasi otomatis yang instan mengunci jadwal jika ada guru atau kelas yang bertabrakan di hari yang sama.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Atur Waktu & Istirahat Dinamis:</strong> Bebas atur jumlah hari kerja dan total jam pelajaran. Slot istirahat menyisip otomatis tanpa memotong kuota jam belajar efektif.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>Grid Interaktif Drag & Drop:</strong> Menyusun jadwal semudah menggeser kotak pelajaran langsung di layar browser Anda, lengkap dengan fitur gembok kustom per kelas.</span>
              </li>
            </ul>
          </div>

          <div className="text-[10px] text-slate-500 font-medium">
            © 2026 Yusra Jadwal. Created by anamf.
          </div>
        </div>

        {/* Form Side */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-white">
              {authMode === 'login' ? 'Selamat Datang' : 'Buat Akun Baru'}
            </h3>
            <p className="text-xs text-slate-455 mt-1.5">
              {authMode === 'login' 
                ? 'Silakan masuk untuk mengelola jadwal pelajaran sekolah Anda.' 
                : 'Daftarkan sekolah Anda untuk memulai penjadwalan online.'}
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-rose-950/80 border border-rose-500/30 rounded-lg text-xs text-rose-200 flex items-center gap-2">
              <span>⚠️</span>
              <p className="font-medium">{authError}</p>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Nama Sekolah</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SMA Negeri 1 Jakarta"
                  value={authForm.nama_sekolah}
                  onChange={(e) => setAuthForm({ ...authForm, nama_sekolah: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full transition-all"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Alamat Email</label>
              <input
                type="email"
                required
                placeholder="admin@sekolah.sch.id"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full pr-10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-250 cursor-pointer"
                >
                  {showPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold py-2.5 px-4 rounded-lg cursor-pointer transition-colors shadow-md mt-2 flex items-center justify-center gap-2 text-sm"
            >
              {authLoading ? (
                <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              ) : authMode === 'login' ? (
                'Masuk ke Akun'
              ) : (
                'Daftarkan Sekolah'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs">
            <span className="text-slate-400">
              {authMode === 'login' ? 'Belum punya akun sekolah? ' : 'Sudah terdaftar? '}
            </span>
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
              }}
              className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
            >
              {authMode === 'login' ? 'Daftar Sekarang' : 'Login di Sini'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default AuthPage;
