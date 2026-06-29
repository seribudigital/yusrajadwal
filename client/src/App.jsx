import React, { useState, useEffect, useCallback, Suspense } from 'react';
import ProktorDashboard from './components/ProktorDashboard';
import { useAuth } from './hooks/useAuth';
import { useMasterData } from './hooks/useMasterData';

const AuthPage = React.lazy(() => import('./components/AuthPage'));
const JadwalBoard = React.lazy(() => import('./components/JadwalBoard'));
const MasterDataTab = React.lazy(() => import('./components/MasterDataTab'));
const RekapTab = React.lazy(() => import('./components/RekapTab'));
const ProfilTab = React.lazy(() => import('./components/ProfilTab'));
const PanduanTab = React.lazy(() => import('./components/PanduanTab'));

const API_BASE = import.meta.env.VITE_API_BASE || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : '/api');

const getBlockedIcon = (label) => {
  if (!label) return '🔒';
  const l = label.toLowerCase();
  if (l.includes('upacara')) return '🚩';
  if (l.includes('sholat') || l.includes('dhuha') || l.includes('shalat')) return '🕌';
  if (l.includes('istirahat')) return '⏰';
  if (l.includes('seni') || l.includes('lukis') || l.includes('tari') || l.includes('musik') || l.includes('desain')) return '🎨';
  if (l.includes('lari') || l.includes('atletik')) return '🏃';
  if (l.includes('ekskul') || l.includes('ekstra') || l.includes('olahraga') || l.includes('basket') || l.includes('futsal') || l.includes('bola') || l.includes('senam') || l.includes('pramuka')) return '⚽';
  return '🔒';
};

function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState('profil'); // 'profil' | 'master' | 'jadwal' | 'rekap' | 'panduan'

  // Toasts Notification State
  const [toasts, setToasts] = useState([]);

  // Helper to show toasts
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Consume Hooks
  const auth = useAuth(showToast, setActiveTab);
  const master = useMasterData({
    apiFetch: auth.apiFetch,
    API_BASE: auth.API_BASE,
    showToast,
    token: auth.token,
    user: auth.user,
    setActiveTab
  });

  // Destructure for compatibility with existing render code
  const {
    token, setToken,
    user, setUser,
    authMode, setAuthMode,
    authForm, setAuthForm,
    showPassword, setShowPassword,
    authError, setAuthError,
    authLoading, setAuthLoading,
    announcement, setAnnouncement,
    checkUserStatus, fetchAnnouncement,
    handleAuthSubmit, handleLogout
  } = auth;

  const {
    gurus, setGurus,
    kelas, setKelas,
    mapels, setMapels,
    slots, setSlots,
    plots, setPlots,
    jadwals, setJadwals,
    blockedSlots, setBlockedSlots,
    timeSettings, setTimeSettings,
    timeForm, setTimeForm,
    selectedKelasId, setSelectedKelasId,
    selectedRekapKelasId, setSelectedRekapKelasId,
    selectedRekapGuruId, setSelectedRekapGuruId,
    selectedFilterGuruId, setSelectedFilterGuruId,
    masterSubTab, setMasterSubTab,
    guruForm, setGuruForm,
    kelasForm, setKelasForm,
    mapelForm, setMapelForm,
    plotForm, setPlotForm,
    editingSlotId, setEditingSlotId,
    editingSlotData, setEditingSlotData,
    draggedOverSlotId, setDraggedOverSlotId,
    successDropSlotId, setSuccessDropSlotId,
    highlightedPlotId, setHighlightedPlotId,
    schoolProfile, setSchoolProfile,
    profileForm, setProfileForm,
    kepalaSekolahName, setKepalaSekolahName,
    kepalaSekolahNip, setKepalaSekolahNip,
    wakaKurikulumName, setWakaKurikulumName,
    wakaKurikulumNip, setWakaKurikulumNip,
    tanggalPengesahan, setTanggalPengesahan,

    // Actions
    fetchData,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDeleteJadwal,
    handleLockSlot,
    handleUnlockSlot,
    saveSchoolProfile,
    handleLogoChange,
    handleExportGuru,
    handleImportGuru,
    handleImportMaster,
    saveGuru,
    deleteGuru,
    saveKelas,
    deleteKelas,
    saveMapel,
    deleteMapel,
    saveSlotTime,
    savePlot,
    deletePlot,
    saveTimeSettings,

    // Computed Values
    days,
    slotsByDay,
    getSisaJam,
    activeClassPlots,
    visibleClassPlots,
    activeClassGurus,
    firstActiveDay,
    totalRows
  } = master;

  if (!token) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">Memuat...</div>}>
        <AuthPage
          authMode={authMode}
          setAuthMode={setAuthMode}
          authForm={authForm}
          setAuthForm={setAuthForm}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          authError={authError}
          setAuthError={setAuthError}
          authLoading={authLoading}
          handleAuthSubmit={handleAuthSubmit}
        />
      </Suspense>
    );
  }

  // 1. Account Suspended Check
  if (user?.status === 'SUSPENDED') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-955/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-rose-900/40 rounded-2xl shadow-2xl p-8 z-10 text-center space-y-6">
          <div className="h-16 w-16 bg-rose-950/60 border border-rose-500/40 rounded-full flex items-center justify-center text-3xl mx-auto animate-pulse">
            🚫
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Akun Ditangguhkan</h2>
            <p className="text-sm text-slate-400">
              Akses sekolah <strong className="text-rose-300">{user?.nama_sekolah}</strong> sementara dinonaktifkan oleh administrator sistem.
            </p>
          </div>
          <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-4 text-xs text-rose-200">
            Hal ini terjadi karena batas paket lisensi telah terlampaui, tagihan jatuh tempo, atau pemeliharaan akun. Silakan hubungi Proktor Central untuk mengaktifkan kembali akun Anda.
          </div>
          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => checkUserStatus(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors shadow-md block text-center cursor-pointer flex items-center justify-center gap-2"
            >
              Cek Ulang Status Akun 🔄
            </button>
            <a
              href="mailto:proktor@yusrajadwal.com?subject=Reaktivasi%20Akun%20Sekolah"
              className="w-full bg-rose-900 hover:bg-rose-800 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors shadow-md block text-center"
            >
              Hubungi Proktor Central ✉️
            </a>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setToken(null);
                setUser(null);
                showToast('Anda telah keluar.');
              }}
              className="text-xs text-slate-500 hover:text-slate-350 underline cursor-pointer"
            >
              Keluar dari Akun 🚪
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Proktor Central Check
  if (user?.role === 'SUPER_ADMIN') {
    return (
      <ProktorDashboard
        token={token}
        user={user}
        setUser={setUser}
        setToken={setToken}
        showToast={showToast}
        API_BASE={API_BASE}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden w-full">
      
      {/* Global Announcement Banner */}
      {announcement && (
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-cyan-900 text-white py-2 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2 relative z-40 animate-fade-in border-b border-indigo-500/20 shrink-0">
          <span>📢</span>
          <span>{announcement}</span>
        </div>
      )}

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border pointer-events-auto transform translate-y-0 transition-all duration-300 animate-slide-in ${
              t.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
            }`}
          >
            <span className="text-xl">{t.type === 'error' ? '⚠️' : '✅'}</span>
            <p className="text-sm font-medium">{t.message}</p>
          </div>
        ))}
      </div>

      {/* Header / Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 print:hidden w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 lg:py-0 lg:h-16 flex flex-col lg:flex-row items-center justify-between gap-2.5 lg:gap-4">
          {/* Top Row on Mobile / Left Section on Desktop */}
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="text-2xl shrink-0">🗓️</span>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent truncate">
                  Yusra Jadwal
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-none">
                  {user ? user.nama_sekolah : 'Semi-Otomatis & Anti-Bentrok'}
                </p>
              </div>
            </div>

            {/* Logout button on mobile top bar */}
            <div className="flex lg:hidden items-center gap-2 shrink-0 ml-2">
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  setToken(null);
                  setUser(null);
                  showToast('Anda telah keluar.');
                }}
                className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 hover:border-rose-500/50 text-rose-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1"
              >
                <span>Logout</span>
                <span>🚪</span>
              </button>
            </div>
          </div>
          
          {/* Bottom Row on Mobile / Right Section on Desktop */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            <nav className="flex bg-slate-950 border border-slate-800 p-1 rounded-lg overflow-x-auto whitespace-nowrap w-full lg:w-auto max-w-full justify-start lg:justify-center no-scrollbar">
              <button
                onClick={() => setActiveTab('profil')}
                className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 shrink-0 cursor-pointer ${
                  activeTab === 'profil'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Profil Sekolah
              </button>
              <button
                onClick={() => setActiveTab('master')}
                className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 shrink-0 cursor-pointer ${
                  activeTab === 'master'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Data Master
              </button>
              <button
                onClick={() => setActiveTab('jadwal')}
                className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 shrink-0 cursor-pointer ${
                  activeTab === 'jadwal'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Penyusunan Jadwal
              </button>
              <button
                onClick={() => setActiveTab('rekap')}
                className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 shrink-0 cursor-pointer ${
                  activeTab === 'rekap'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cetak / Rekap
              </button>
              <button
                onClick={() => setActiveTab('panduan')}
                className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 shrink-0 cursor-pointer ${
                  activeTab === 'panduan'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Panduan Pengguna
              </button>
            </nav>

            {/* User & Logout on Desktop */}
            <div className="hidden lg:flex items-center gap-2 border-l border-slate-800 pl-4 shrink-0">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-300">{user?.email}</span>
                <span className="text-[10px] text-slate-500 font-medium">Online</span>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  setToken(null);
                  setUser(null);
                  showToast('Anda telah keluar.');
                }}
                className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 hover:border-rose-500/50 text-rose-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
              >
                Logout 🚪
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
        
        {/* =======================================================
            TAB 1: INTERACTIVE SCHEDULING (DRAG & DROP)
            ======================================================= */}
        {activeTab === 'jadwal' && (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Papan Jadwal...</div>}>
            <JadwalBoard
              days={days}
              slotsByDay={slotsByDay}
              totalRows={totalRows}
              firstActiveDay={firstActiveDay}
              kelas={kelas}
              selectedKelasId={selectedKelasId}
              setSelectedKelasId={setSelectedKelasId}
              selectedFilterGuruId={selectedFilterGuruId}
              setSelectedFilterGuruId={setSelectedFilterGuruId}
              activeClassGurus={activeClassGurus}
              activeClassPlots={activeClassPlots}
              visibleClassPlots={visibleClassPlots}
              jadwals={jadwals}
              blockedSlots={blockedSlots}
              draggedOverSlotId={draggedOverSlotId}
              successDropSlotId={successDropSlotId}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              handleDeleteJadwal={handleDeleteJadwal}
              handleLockSlot={handleLockSlot}
              handleUnlockSlot={handleUnlockSlot}
              handleExportGuru={handleExportGuru}
              gurus={gurus}
              getSisaJam={getSisaJam}
            />
          </Suspense>
        )}

        {/* =======================================================
            TAB 2: DATA MASTER CRUD PANEL
            ======================================================= */}
        {activeTab === 'master' && (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Data Master...</div>}>
            <MasterDataTab
              masterSubTab={masterSubTab}
              setMasterSubTab={setMasterSubTab}
              gurus={gurus}
              kelas={kelas}
              mapels={mapels}
              slots={slots}
              plots={plots}
              guruForm={guruForm}
              setGuruForm={setGuruForm}
              kelasForm={kelasForm}
              setKelasForm={setKelasForm}
              mapelForm={mapelForm}
              setMapelForm={setMapelForm}
              plotForm={plotForm}
              setPlotForm={setPlotForm}
              editingSlotId={editingSlotId}
              setEditingSlotId={setEditingSlotId}
              editingSlotData={editingSlotData}
              setEditingSlotData={setEditingSlotData}
              highlightedPlotId={highlightedPlotId}
              timeForm={timeForm}
              setTimeForm={setTimeForm}
              saveGuru={saveGuru}
              deleteGuru={deleteGuru}
              saveKelas={saveKelas}
              deleteKelas={deleteKelas}
              saveMapel={saveMapel}
              deleteMapel={deleteMapel}
              saveSlotTime={saveSlotTime}
              savePlot={savePlot}
              deletePlot={deletePlot}
              saveTimeSettings={saveTimeSettings}
              handleExportGuru={handleExportGuru}
              handleImportGuru={handleImportGuru}
              schoolProfile={schoolProfile}
              handleImportMaster={handleImportMaster}
            />
          </Suspense>
        )}

        {/* =======================================================
            TAB 3: CETAK & REKAP (PRINT READY VIEW)
            ======================================================= */}
        {activeTab === 'rekap' && (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Rekap...</div>}>
            <RekapTab
              days={days}
              slotsByDay={slotsByDay}
              totalRows={totalRows}
              firstActiveDay={firstActiveDay}
              kelas={kelas}
              gurus={gurus}
              plots={plots}
              jadwals={jadwals}
              blockedSlots={blockedSlots}
              selectedRekapKelasId={selectedRekapKelasId}
              setSelectedRekapKelasId={setSelectedRekapKelasId}
              selectedRekapGuruId={selectedRekapGuruId}
              setSelectedRekapGuruId={setSelectedRekapGuruId}
              schoolProfile={schoolProfile}
              kepalaSekolahName={kepalaSekolahName}
              setKepalaSekolahName={setKepalaSekolahName}
              kepalaSekolahNip={kepalaSekolahNip}
              setKepalaSekolahNip={setKepalaSekolahNip}
              wakaKurikulumName={wakaKurikulumName}
              setWakaKurikulumName={setWakaKurikulumName}
              wakaKurikulumNip={wakaKurikulumNip}
              setWakaKurikulumNip={setWakaKurikulumNip}
              tanggalPengesahan={tanggalPengesahan}
              setTanggalPengesahan={setTanggalPengesahan}
            />
          </Suspense>
        )}

        {/* =======================================================
            TAB 4: SCHOOL PROFILE CONFIGURATION
            ======================================================= */}
        {activeTab === 'profil' && (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Profil...</div>}>
            <ProfilTab
              profileForm={profileForm}
              setProfileForm={setProfileForm}
              saveSchoolProfile={saveSchoolProfile}
              handleLogoChange={handleLogoChange}
            />
          </Suspense>
        )}

        {/* =======================================================
            TAB 5: PANDUAN PENGGUNA (USER GUIDE)
            ======================================================= */}
        {activeTab === 'panduan' && (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Memuat Panduan...</div>}>
            <PanduanTab />
          </Suspense>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-[10px] text-slate-500 font-medium print:hidden">
        © 2026 Yusra Jadwal (Semi-Otomatis). Created by anamf.
      </footer>
    </div>
  );
}

export default App;
