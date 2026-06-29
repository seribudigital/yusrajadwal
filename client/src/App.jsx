import React, { useState, useEffect, Suspense } from 'react';
import ProktorDashboard from './components/ProktorDashboard';

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
  return '🔒';
};

const normalizeBreaks = (breaks) => {
  if (!Array.isArray(breaks)) return [];
  if (breaks.length > 0 && typeof breaks[0] === 'number') {
    return breaks.map((b, idx) => ({
      id: idx + 1,
      after_jp: b,
      label: idx === 0 ? "ISTIRAHAT PAGI" : (idx === 1 ? "ISTIRAHAT SIANG" : "ISTIRAHAT SORE")
    }));
  }
  return breaks;
};

const getInitialBreaks = (breaks) => {
  const normalized = normalizeBreaks(breaks);
  const result = [
    { id: 1, after_jp: 0, label: "ISTIRAHAT PAGI" },
    { id: 2, after_jp: 0, label: "ISTIRAHAT SIANG" },
    { id: 3, after_jp: 0, label: "ISTIRAHAT SORE" }
  ];
  normalized.forEach(b => {
    const idx = result.findIndex(r => r.id === b.id);
    if (idx !== -1) {
      result[idx].after_jp = b.after_jp || 0;
      if (b.label) result[idx].label = b.label;
    }
  });
  return result;
};

function App() {
  // Authentication States
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ email: '', password: '', nama_sekolah: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState('profil'); // 'profil' | 'master' | 'jadwal' | 'rekap' | 'panduan'

  // Master Data State
  const [gurus, setGurus] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [mapels, setMapels] = useState([]);
  const [slots, setSlots] = useState([]);
  const [plots, setPlots] = useState([]);
  const [jadwals, setJadwals] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [timeSettings, setTimeSettings] = useState({
    active_days: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    total_jp: 10,
    breaks: []
  });
  const [timeForm, setTimeForm] = useState({
    active_days: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    total_jp: 10,
    breaks: []
  });

  // Active Selections
  const [selectedKelasId, setSelectedKelasId] = useState(null);
  const [selectedRekapKelasId, setSelectedRekapKelasId] = useState(null);
  const [selectedRekapGuruId, setSelectedRekapGuruId] = useState(null);
  const [selectedFilterGuruId, setSelectedFilterGuruId] = useState('');

  // Sub-tabs inside Master Data
  const [masterSubTab, setMasterSubTab] = useState('guru'); // 'guru' | 'kelas' | 'mapel' | 'timeSetting' | 'slot' | 'plot'

  // Form States for CRUD
  const [guruForm, setGuruForm] = useState({ id: null, nama_guru: '', nip: '' });
  const [kelasForm, setKelasForm] = useState({ id: null, nama_kelas: '' });
  const [mapelForm, setMapelForm] = useState({ id: null, nama_mapel: '', kode_mapel: '' });
  const [plotForm, setPlotForm] = useState({ id: null, guru_ids: [], mapel_id: '', kelas_id: '', beban_jam: '' });
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editingSlotData, setEditingSlotData] = useState({ jam_mulai: '', jam_selesai: '' });

  // Toasts Notification State
  const [toasts, setToasts] = useState([]);

  // Drag and Drop Dragged Over indicator
  const [draggedOverSlotId, setDraggedOverSlotId] = useState(null);

  // Success indicator for drops
  const [successDropSlotId, setSuccessDropSlotId] = useState(null);

  // Highlight indicator for duplicate plot clashes
  const [highlightedPlotId, setHighlightedPlotId] = useState(null);

  // Signature States for Cetak/Rekap (Editable on-screen, prints clean)
  const [kepalaSekolahName, setKepalaSekolahName] = useState('Nama Kepala Sekolah, M.Pd');
  const [kepalaSekolahNip, setKepalaSekolahNip] = useState('NIP. 197509122002121002');
  const [wakaKurikulumName, setWakaKurikulumName] = useState('Nama Waka Kurikulum, S.Pd');
  const [wakaKurikulumNip, setWakaKurikulumNip] = useState('NIP. 198304152009042003');
  
  const getIndonesianDate = () => {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return `Jakarta, ${new Date().toLocaleDateString('id-ID', options)}`;
  };
  const [tanggalPengesahan, setTanggalPengesahan] = useState(getIndonesianDate());

  // School Profile states
  const [schoolProfile, setSchoolProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    nama_sekolah: '',
    nama_kepala_sekolah: '',
    nip_kepala_sekolah: '',
    nama_penyusun_jadwal: '',
    nip_penyusun_jadwal: '',
    semester: 'Ganjil',
    tahun_ajaran: '',
    tanggal_berlaku: '',
    tanggal_cetak: '',
    logo_url: null
  });

  // Authenticated Fetch Wrapper
  const apiFetch = async (url, options = {}) => {
    const currentToken = localStorage.getItem('token');
    const headers = {
      ...options.headers,
    };
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    
    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });
      
      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      } else if (res.status === 403) {
        try {
          const clonedRes = res.clone();
          const errData = await clonedRes.json();
          if (errData.status === 'SUSPENDED') {
            const suspendedUser = errData.user || { ...user, status: 'SUSPENDED' };
            localStorage.setItem('user', JSON.stringify(suspendedUser));
            setUser(suspendedUser);
          }
        } catch (e) {}
      }
      return res;
    } catch (err) {
      throw err;
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const url = authMode === 'login' ? `${API_BASE}/login` : `${API_BASE}/register`;
    const payload = authMode === 'login'
      ? { email: authForm.email, password: authForm.password }
      : { email: authForm.email, password: authForm.password, nama_sekolah: authForm.nama_sekolah };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { error: text ? (text.length > 150 ? text.substring(0, 150) + '...' : text) : `HTTP ${res.status}` };
      }

      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setActiveTab('profil');
        showToast(authMode === 'login' ? 'Login berhasil!' : 'Pendaftaran sekolah berhasil!');
      } else {
        setAuthError(data.error || 'Terjadi kesalahan saat otentikasi.');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Gagal terhubung ke server auth. Detail: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Fetch all initial data
  const fetchData = async () => {
    if (!token) return;
    try {
      const responses = await Promise.all([
        apiFetch(`${API_BASE}/gurus`),
        apiFetch(`${API_BASE}/kelas`),
        apiFetch(`${API_BASE}/mapels`),
        apiFetch(`${API_BASE}/slots`),
        apiFetch(`${API_BASE}/plots`),
        apiFetch(`${API_BASE}/jadwals`),
        apiFetch(`${API_BASE}/school-profile`),
        apiFetch(`${API_BASE}/blocked-slots`),
        apiFetch(`${API_BASE}/time-settings`),
      ]);

      // Verify all responses succeeded
      for (const res of responses) {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Endpoint ${res.url} mengembalikan status ${res.status}: ${text ? (text.length > 400 ? text.substring(0, 400) + '...' : text) : 'Unknown Error'}`);
        }
      }

      const [g, k, m, s, p, j, sp, bs, ts] = await Promise.all(responses.map((r) => r.json()));

      setGurus(g);
      setKelas(k);
      setMapels(m);
      setSlots(s);
      setPlots(p);
      setJadwals(j);
      setSchoolProfile(sp);
      setBlockedSlots(bs);
      if (ts) {
        const initialBreaks = getInitialBreaks(ts.breaks);
        setTimeSettings({ ...ts, breaks: initialBreaks });
        setTimeForm({
          active_days: ts.active_days || [],
          total_jp: ts.total_jp || 10,
          breaks: initialBreaks
        });
      }

      // Populate form and signature values
      if (sp) {
        setProfileForm({
          nama_sekolah: sp.nama_sekolah || '',
          nama_kepala_sekolah: sp.nama_kepala_sekolah || '',
          nip_kepala_sekolah: sp.nip_kepala_sekolah || '',
          nama_penyusun_jadwal: sp.nama_penyusun_jadwal || '',
          nip_penyusun_jadwal: sp.nip_penyusun_jadwal || '',
          semester: sp.semester || 'Ganjil',
          tahun_ajaran: sp.tahun_ajaran || '',
          tanggal_berlaku: sp.tanggal_berlaku || '',
          tanggal_cetak: sp.tanggal_cetak || '',
          logo_url: sp.logo_url || null
        });

        setKepalaSekolahName(sp.nama_kepala_sekolah || '');
        setKepalaSekolahNip(sp.nip_kepala_sekolah || '');
        setWakaKurikulumName(sp.nama_penyusun_jadwal || '');
        setWakaKurikulumNip(sp.nip_penyusun_jadwal || '');
        setTanggalPengesahan(sp.tanggal_cetak || '');
      }

      // Auto-select first class if not set (excluding OFFLINE if possible)
      if (k.length > 0) {
        const firstNonOffline = k.find((klass) => klass.nama_kelas !== 'OFFLINE') || k[0];
        if (!selectedKelasId) setSelectedKelasId(firstNonOffline.id);
        if (!selectedRekapKelasId) setSelectedRekapKelasId(firstNonOffline.id);
      }
      if (g.length > 0 && !selectedRekapGuruId) {
        setSelectedRekapGuruId(g[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat data: ' + err.message, 'error');
    }
  };

  // Announcement banner state
  const [announcement, setAnnouncement] = useState('');

  // Fetch global announcement for all logged-in users
  const fetchAnnouncement = async () => {
    if (!token) return;
    try {
      const res = await apiFetch(`${API_BASE}/proktor/announcement`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncement(data.text || '');
      }
    } catch (err) {
      console.error('Gagal memuat pengumuman:', err);
    }
  };

  const checkUserStatus = async (isManual = false) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const wasSuspended = user?.status === 'SUSPENDED';
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
          if (wasSuspended && data.user.status === 'ACTIVE') {
            showToast('Akun Anda telah diaktifkan kembali oleh Proktor!');
          } else if (isManual && data.user.status === 'SUSPENDED') {
            showToast('Akun Anda masih berstatus ditangguhkan.', 'error');
          }
        }
      } else if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Gagal mengecek status user:', err);
    }
  };

  useEffect(() => {
    if (token) {
      checkUserStatus();
      fetchAnnouncement();
      if (user?.role !== 'SUPER_ADMIN') {
        fetchData();
      }
    }
  }, [token, user?.role]);

  useEffect(() => {
    if (token && user?.status === 'SUSPENDED') {
      const timer = setInterval(() => {
        checkUserStatus();
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [token, user?.status]);

  // Helper to show toasts
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // ==========================================
  // DRAG & DROP HANDLERS
  // ==========================================
  const handleDragStart = (e, plotId, sourceJadwalId = null) => {
    e.dataTransfer.setData('text/plain', plotId.toString());
    if (sourceJadwalId) {
      e.dataTransfer.setData('sourceJadwalId', sourceJadwalId.toString());
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, slotId) => {
    e.preventDefault();
    setDraggedOverSlotId(slotId);
  };

  const handleDragLeave = () => {
    setDraggedOverSlotId(null);
  };

  const handleDrop = async (e, slotId) => {
    e.preventDefault();
    setDraggedOverSlotId(null);
    const plotIdStr = e.dataTransfer.getData('text/plain');
    if (!plotIdStr) return;
    const plotId = parseInt(plotIdStr);

    const sourceJadwalIdStr = e.dataTransfer.getData('sourceJadwalId');
    const isMove = !!sourceJadwalIdStr;
    const sourceJadwalId = isMove ? parseInt(sourceJadwalIdStr) : null;

    // === CLIENT-SIDE VALIDATION (instant, no server roundtrip) ===
    const slot = slots.find(s => s.id === slotId);
    const plot = plots.find(p => p.id === plotId);
    if (!slot || !plot) return;

    // 1. Break slot check
    if (slot.is_istirahat) {
      showToast('Tidak dapat menempatkan pelajaran pada jam istirahat!', 'error');
      return;
    }

    // 1b. Blocked slot check
    const isBlocked = blockedSlots.some(bs =>
      bs.slot_id === slotId &&
      bs.kelas_id === plot.kelas_id
    );
    if (isBlocked) {
      showToast('Slot waktu ini sedang dikunci/diblokir untuk kelas ini!', 'error');
      return;
    }

    // 2. Teacher clash check
    const plotGuruIds = plot.gurus ? plot.gurus.map(g => g.id) : (plot.guru_id ? [plot.guru_id] : []);
    const teacherClash = jadwals.find(j => {
      if (j.slot_id !== slotId || (isMove && j.id === sourceJadwalId) || !j.plot) return false;
      const scheduledGuruIds = j.plot.gurus ? j.plot.gurus.map(g => g.id) : (j.plot.guru_id ? [j.plot.guru_id] : []);
      return plotGuruIds.some(id => scheduledGuruIds.includes(id));
    });
    if (teacherClash) {
      const clashingGuruIds = teacherClash.plot.gurus ? teacherClash.plot.gurus.map(g => g.id) : (teacherClash.plot.guru_id ? [teacherClash.plot.guru_id] : []);
      const clashingTeacherId = plotGuruIds.find(id => clashingGuruIds.includes(id));
      const clashingTeacher = (plot.gurus || []).find(g => g.id === clashingTeacherId) || plot.guru || { nama_guru: 'Guru' };
      showToast(`Guru ${clashingTeacher.nama_guru} sudah mengajar di kelas lain pada jam ini!`, 'error');
      return;
    }

    // 3. Class clash check
    const classClash = jadwals.find(j =>
      j.slot_id === slotId &&
      j.plot?.kelas_id === plot.kelas_id &&
      (!isMove || j.id !== sourceJadwalId)
    );
    if (classClash) {
      showToast('Kelas ini sudah memiliki jadwal pelajaran lain pada jam ini!', 'error');
      return;
    }

    // 4. Quota check
    const scheduledCount = jadwals.filter(j =>
      j.plot_id === plotId &&
      (!isMove || j.id !== sourceJadwalId)
    ).length;
    if (scheduledCount >= plot.beban_jam) {
      showToast('Jatah jam mengajar untuk mata pelajaran ini sudah habis!', 'error');
      return;
    }

    // === OPTIMISTIC UPDATE (instant UI) ===
    if (isMove) {
      const currentJadwal = jadwals.find(j => j.id === sourceJadwalId);
      if (currentJadwal && currentJadwal.slot_id === slotId) return;

      // Instantly update UI
      setJadwals(prev => prev.map(j => j.id === sourceJadwalId
        ? { ...j, slot_id: slotId, slot: slot }
        : j
      ));
      setSuccessDropSlotId(slotId);
      showToast('Jadwal berhasil dipindahkan!', 'success');
      setTimeout(() => setSuccessDropSlotId(null), 1000);

      // Sync with server in background
      try {
        const res = await apiFetch(`${API_BASE}/jadwals/${sourceJadwalId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot_id: slotId, plot_id: plotId }),
        });
        if (res.ok) {
          const data = await res.json();
          setJadwals(prev => prev.map(j => j.id === sourceJadwalId ? data : j));
        } else {
          // Revert on server rejection
          const errData = await res.json();
          setJadwals(prev => prev.map(j => j.id === sourceJadwalId ? currentJadwal : j));
          showToast(errData.error || 'Server menolak perubahan. Jadwal dikembalikan.', 'error');
        }
      } catch (err) {
        setJadwals(prev => prev.map(j => j.id === sourceJadwalId ? currentJadwal : j));
        showToast('Koneksi server gagal. Jadwal dikembalikan.', 'error');
      }
    } else {
      // New drop — create optimistic jadwal
      const tempId = -Date.now();
      const optimisticJadwal = {
        id: tempId,
        slot_id: slotId,
        plot_id: plotId,
        slot: slot,
        plot: plot,
        user_id: null,
      };

      // Instantly update UI
      setJadwals(prev => [...prev, optimisticJadwal]);
      setSuccessDropSlotId(slotId);
      showToast('Jadwal berhasil ditambahkan!', 'success');
      setTimeout(() => setSuccessDropSlotId(null), 1000);

      // Sync with server in background
      try {
        const res = await apiFetch(`${API_BASE}/jadwals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot_id: slotId, plot_id: plotId }),
        });
        if (res.ok) {
          const data = await res.json();
          setJadwals(prev => prev.map(j => j.id === tempId ? data : j));
        } else {
          // Revert on server rejection
          const errData = await res.json();
          setJadwals(prev => prev.filter(j => j.id !== tempId));
          showToast(errData.error || 'Server menolak. Jadwal dihapus kembali.', 'error');
        }
      } catch (err) {
        setJadwals(prev => prev.filter(j => j.id !== tempId));
        showToast('Koneksi server gagal. Jadwal dihapus kembali.', 'error');
      }
    }
  };

  const handleDeleteJadwal = async (jadwalId) => {
    if (!window.confirm('Hapus jadwal pelajaran ini?')) return;

    // Optimistic: remove from UI instantly
    const removedJadwal = jadwals.find(j => j.id === jadwalId);
    setJadwals(prev => prev.filter(j => j.id !== jadwalId));
    showToast('Jadwal berhasil dihapus.', 'success');

    // Sync with server in background
    try {
      const res = await apiFetch(`${API_BASE}/jadwals/${jadwalId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        // Revert on failure
        if (removedJadwal) setJadwals(prev => [...prev, removedJadwal]);
        const data = await res.json();
        showToast(data.error || 'Gagal menghapus jadwal. Dikembalikan.', 'error');
      }
    } catch (err) {
      if (removedJadwal) setJadwals(prev => [...prev, removedJadwal]);
      showToast('Koneksi server gagal. Jadwal dikembalikan.', 'error');
    }
  };

  const handleLockSlot = async (slotId) => {
    if (!selectedKelasId) {
      showToast('Pilih kelas terlebih dahulu!', 'error');
      return;
    }
    const label = window.prompt("Masukkan label kustom untuk mengunci slot ini (misal: 'Sholat Dhuha', 'Upacara'):", "Kegiatan");
    if (label === null || !label.trim()) return;

    const tempId = -Math.floor(Math.random() * 1000000);
    const newBlocked = {
      id: tempId,
      kelas_id: Number(selectedKelasId),
      slot_id: slotId,
      label: label.trim()
    };

    // Optimistic update
    setBlockedSlots(prev => [...prev, newBlocked]);
    showToast('Slot berhasil dikunci!', 'success');

    try {
      const res = await apiFetch(`${API_BASE}/blocked-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelas_id: Number(selectedKelasId),
          slot_id: slotId,
          label: label.trim()
        })
      });
      if (res.ok) {
        const saved = await res.json();
        setBlockedSlots(prev => prev.map(bs => bs.id === tempId ? saved : bs));
      } else {
        setBlockedSlots(prev => prev.filter(bs => bs.id !== tempId));
        const data = await res.json();
        showToast(data.error || 'Gagal mengunci slot.', 'error');
      }
    } catch (err) {
      setBlockedSlots(prev => prev.filter(bs => bs.id !== tempId));
      showToast('Koneksi server gagal. Kunci slot dibatalkan.', 'error');
    }
  };

  const handleUnlockSlot = async (blockedId) => {
    if (!window.confirm('Buka kunci slot ini dan bebaskan kembali?')) return;

    // Optimistic update
    const removedBlocked = blockedSlots.find(bs => bs.id === blockedId);
    setBlockedSlots(prev => prev.filter(bs => bs.id !== blockedId));
    showToast('Kunci slot berhasil dilepas.', 'success');

    try {
      const res = await apiFetch(`${API_BASE}/blocked-slots/${blockedId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        if (removedBlocked) setBlockedSlots(prev => [...prev, removedBlocked]);
        const data = await res.json();
        showToast(data.error || 'Gagal melepas kunci slot.', 'error');
      }
    } catch (err) {
      if (removedBlocked) setBlockedSlots(prev => [...prev, removedBlocked]);
      showToast('Koneksi server gagal. Kunci slot dikembalikan.', 'error');
    }
  };

  // ==========================================
  // SCHOOL PROFILE & EXPORT-IMPORT ACTIONS
  // ==========================================
  const saveSchoolProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`${API_BASE}/school-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (res.ok) {
        setSchoolProfile(data);
        showToast('Profil Sekolah berhasil diperbarui!', 'success');
        
        // Update signature states dynamically
        setKepalaSekolahName(data.nama_kepala_sekolah || '');
        setKepalaSekolahNip(data.nip_kepala_sekolah || '');
        setWakaKurikulumName(data.nama_penyusun_jadwal || '');
        setWakaKurikulumNip(data.nip_penyusun_jadwal || '');
        setTanggalPengesahan(data.tanggal_cetak || '');
      } else {
        showToast(data.error || 'Gagal memperbarui profil sekolah.', 'error');
      }
    } catch (err) {
      showToast('Koneksi server gagal.', 'error');
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileForm((prev) => ({ ...prev, logo_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleExportGuru = async (guruId, namaGuru) => {
    try {
      const res = await apiFetch(`${API_BASE}/gurus/${guruId}/export`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mengekspor jadwal.');
      }
      const data = await res.json();
      
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const fileName = `jadwal_${namaGuru.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
      downloadAnchor.setAttribute("download", fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`Jadwal ${namaGuru} berhasil diekspor!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleImportGuru = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const payload = JSON.parse(e.target.result);
        if (!payload.nama_guru || !Array.isArray(payload.occupied_slots)) {
          showToast('Format file JSON tidak valid. Pastikan file berisi nama_guru dan occupied_slots.', 'error');
          return;
        }

        const res = await apiFetch(`${API_BASE}/gurus/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.ok) {
          showToast(`Berhasil mengimpor jadwal ${result.guru.nama_guru}! ${result.imported_count} slot diblokir.`, 'success');
          fetchData();
        } else {
          showToast(result.error || 'Gagal mengimpor jadwal.', 'error');
        }
      } catch (err) {
        showToast('Gagal membaca file JSON.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleImportMaster = async (payload) => {
    try {
      showToast('Memproses impor data massal dari Excel...', 'info');
      const res = await apiFetch(`${API_BASE}/import-master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (res.ok) {
        showToast(result.message || 'Berhasil mengimpor data master!', 'success');
        fetchData();
      } else {
        showToast(result.error || 'Gagal mengimpor data master.', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat mengimpor data ke server.', 'error');
    }
  };

  // ==========================================
  // DATA MANAGEMENT (CRUD API CALLS)
  // ==========================================

  // GURUS CRUD
  const saveGuru = async (e) => {
    e.preventDefault();
    const isEdit = !!guruForm.id;
    const url = isEdit ? `${API_BASE}/gurus/${guruForm.id}` : `${API_BASE}/gurus`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_guru: guruForm.nama_guru, nip: guruForm.nip }),
      });
      if (res.ok) {
        const data = await res.json();
        if (isEdit) {
          setGurus(prev => prev.map(g => g.id === data.id ? data : g));
          setPlots(prev => prev.map(p => {
            const hasGuru = p.gurus?.some(g => g.id === data.id);
            if (hasGuru || p.guru_id === data.id) {
              return {
                ...p,
                guru: p.guru?.id === data.id ? data : p.guru,
                gurus: p.gurus ? p.gurus.map(g => g.id === data.id ? data : g) : [data]
              };
            }
            return p;
          }));
          setJadwals(prev => prev.map(j => {
            const hasGuru = j.plot?.gurus?.some(g => g.id === data.id);
            if (hasGuru || j.plot?.guru_id === data.id) {
              return {
                ...j,
                plot: {
                  ...j.plot,
                  guru: j.plot.guru?.id === data.id ? data : j.plot.guru,
                  gurus: j.plot.gurus ? j.plot.gurus.map(g => g.id === data.id ? data : g) : [data]
                }
              };
            }
            return j;
          }));
        } else {
          setGurus(prev => [...prev, data].sort((a, b) => a.nama_guru.localeCompare(b.nama_guru)));
        }
        showToast(`Guru berhasil ${isEdit ? 'diperbarui' : 'disimpan'}!`);
        setGuruForm({ id: null, nama_guru: '', nip: '' });
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal menyimpan guru.', 'error');
      }
    } catch (err) {
      showToast('Koneksi server gagal.', 'error');
    }
  };

  const deleteGuru = async (id) => {
    if (!window.confirm('Menghapus guru ini akan menghapus seluruh plot mengajar dan jadwal terkait guru tersebut. Lanjutkan?')) return;
    try {
      const res = await apiFetch(`${API_BASE}/gurus/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const deletedPlotIds = plots.filter(p => {
          const nextGurus = p.gurus ? p.gurus.filter(g => g.id !== id) : [];
          return nextGurus.length === 0;
        }).map(p => p.id);
        setJadwals(prev => prev.filter(j => !deletedPlotIds.includes(j.plot_id)));
        setPlots(prev => prev.map(p => {
          if (p.gurus) {
            return {
              ...p,
              gurus: p.gurus.filter(g => g.id !== id)
            };
          }
          return p;
        }).filter(p => p.gurus ? p.gurus.length > 0 : p.guru_id !== id));
        setGurus(prev => prev.filter(g => g.id !== id));
        showToast('Guru berhasil dihapus.');
      }
    } catch (err) {
      showToast('Gagal menghapus guru.', 'error');
    }
  };

  // KELAS CRUD
  const saveKelas = async (e) => {
    e.preventDefault();
    const isEdit = !!kelasForm.id;
    const url = isEdit ? `${API_BASE}/kelas/${kelasForm.id}` : `${API_BASE}/kelas`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_kelas: kelasForm.nama_kelas }),
      });
      if (res.ok) {
        const data = await res.json();
        if (isEdit) {
          setKelas(prev => prev.map(k => k.id === data.id ? data : k));
          setPlots(prev => prev.map(p => p.kelas_id === data.id ? { ...p, kelas: data } : p));
          setJadwals(prev => prev.map(j => j.plot?.kelas_id === data.id ? { ...j, plot: { ...j.plot, kelas: data } } : j));
        } else {
          setKelas(prev => [...prev, data].sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas)));
        }
        showToast(`Kelas berhasil ${isEdit ? 'diperbarui' : 'disimpan'}!`);
        setKelasForm({ id: null, nama_kelas: '' });
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal menyimpan kelas.', 'error');
      }
    } catch (err) {
      showToast('Koneksi server gagal.', 'error');
    }
  };

  const deleteKelas = async (id) => {
    if (!window.confirm('Menghapus kelas ini akan menghapus seluruh plot mengajar dan jadwal terkait kelas tersebut. Lanjutkan?')) return;
    try {
      const res = await apiFetch(`${API_BASE}/kelas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const deletedPlotIds = plots.filter(p => p.kelas_id === id).map(p => p.id);
        setJadwals(prev => prev.filter(j => !deletedPlotIds.includes(j.plot_id)));
        setPlots(prev => prev.filter(p => p.kelas_id !== id));
        setKelas(prev => prev.filter(k => k.id !== id));
        showToast('Kelas berhasil dihapus.');
      }
    } catch (err) {
      showToast('Gagal menghapus kelas.', 'error');
    }
  };

  // MAPELS CRUD
  const saveMapel = async (e) => {
    e.preventDefault();
    const isEdit = !!mapelForm.id;
    const url = isEdit ? `${API_BASE}/mapels/${mapelForm.id}` : `${API_BASE}/mapels`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_mapel: mapelForm.nama_mapel, kode_mapel: mapelForm.kode_mapel }),
      });
      if (res.ok) {
        const data = await res.json();
        if (isEdit) {
          setMapels(prev => prev.map(m => m.id === data.id ? data : m));
          setPlots(prev => prev.map(p => p.mapel_id === data.id ? { ...p, mapel: data } : p));
          setJadwals(prev => prev.map(j => j.plot?.mapel_id === data.id ? { ...j, plot: { ...j.plot, mapel: data } } : j));
        } else {
          setMapels(prev => [...prev, data].sort((a, b) => a.nama_mapel.localeCompare(b.nama_mapel)));
        }
        showToast(`Mata pelajaran berhasil ${isEdit ? 'diperbarui' : 'disimpan'}!`);
        setMapelForm({ id: null, nama_mapel: '', kode_mapel: '' });
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal menyimpan mapel.', 'error');
      }
    } catch (err) {
      showToast('Koneksi server gagal.', 'error');
    }
  };

  const deleteMapel = async (id) => {
    if (!window.confirm('Menghapus mapel ini akan menghapus seluruh plot mengajar dan jadwal terkait mapel tersebut. Lanjutkan?')) return;
    try {
      const res = await apiFetch(`${API_BASE}/mapels/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const deletedPlotIds = plots.filter(p => p.mapel_id === id).map(p => p.id);
        setJadwals(prev => prev.filter(j => !deletedPlotIds.includes(j.plot_id)));
        setPlots(prev => prev.filter(p => p.mapel_id !== id));
        setMapels(prev => prev.filter(m => m.id !== id));
        showToast('Mata pelajaran berhasil dihapus.');
      }
    } catch (err) {
      showToast('Gagal menghapus mapel.', 'error');
    }
  };

  // SLOTS TIMES UPDATING
  const saveSlotTime = async (id) => {
    const slot = slots.find((s) => s.id === id);
    try {
      const res = await apiFetch(`${API_BASE}/slots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hari: slot.hari,
          jam_ke: slot.jam_ke,
          jam_mulai: editingSlotData.jam_mulai,
          jam_selesai: editingSlotData.jam_selesai,
          is_istirahat: slot.is_istirahat,
          keterangan: slot.keterangan,
        }),
      });
      if (res.ok) {
        const slotsRes = await apiFetch(`${API_BASE}/slots`);
        if (slotsRes.ok) {
          setSlots(await slotsRes.json());
        }
        showToast('Waktu slot berhasil diperbarui!');
        setEditingSlotId(null);
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal memperbarui slot.', 'error');
      }
    } catch (err) {
      showToast('Koneksi server gagal.', 'error');
    }
  };

  // PLOTS CRUD
  const savePlot = async (e) => {
    e.preventDefault();
    const isEdit = !!plotForm.id;
    const url = isEdit ? `${API_BASE}/plots/${plotForm.id}` : `${API_BASE}/plots`;
    const method = isEdit ? 'PUT' : 'POST';

    const numericGuruIds = (plotForm.guru_ids || []).map(id => parseInt(id));
    const numericMapelId = parseInt(plotForm.mapel_id);
    const numericKelasId = parseInt(plotForm.kelas_id);
    const numericBebanJam = parseInt(plotForm.beban_jam);

    if (numericGuruIds.length === 0) {
      showToast('Pilih setidaknya satu guru!', 'error');
      return;
    }

    // === CLIENT-SIDE VALIDATION (instant duplicate check) ===
    const existingPlot = plots.find(p => {
      if (p.mapel_id !== numericMapelId || p.kelas_id !== numericKelasId || (isEdit && p.id === plotForm.id)) {
        return false;
      }
      const existingIds = p.gurus ? p.gurus.map(g => g.id).sort() : (p.guru_id ? [p.guru_id].sort() : []);
      const targetIds = [...numericGuruIds].sort();
      return existingIds.length === targetIds.length && existingIds.every((val, index) => val === targetIds[index]);
    });

    if (existingPlot) {
      showToast('Kombinasi Guru, Mata Pelajaran, dan Kelas ini sudah terdaftar!', 'error');
      setHighlightedPlotId(existingPlot.id);
      setTimeout(() => {
        const el = document.getElementById(`plot-row-${existingPlot.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      setTimeout(() => setHighlightedPlotId(null), 4500);
      return;
    }

    // === BUILD OPTIMISTIC PLOT from local state ===
    const guruObjs = gurus.filter(g => numericGuruIds.includes(g.id));
    const mapelObj = mapels.find(m => m.id === numericMapelId);
    const kelasObj = kelas.find(k => k.id === numericKelasId);
    const tempId = -Date.now();
    const optimisticPlot = {
      id: isEdit ? plotForm.id : tempId,
      guru_id: numericGuruIds[0] || null,
      gurus: guruObjs,
      mapel_id: numericMapelId,
      kelas_id: numericKelasId,
      beban_jam: numericBebanJam,
      guru: guruObjs[0] || null,
      mapel: mapelObj || null,
      kelas: kelasObj || null,
      user_id: null,
    };

    // === OPTIMISTIC UPDATE (instant UI) ===
    const previousPlots = [...plots];
    if (isEdit) {
      setPlots(prev => prev.map(p => p.id === plotForm.id ? optimisticPlot : p));
    } else {
      setPlots(prev => [...prev, optimisticPlot]);
    }
    showToast(`Plot tugas mengajar berhasil ${isEdit ? 'diperbarui' : 'disimpan'}!`);
    setPlotForm({ id: null, guru_ids: [], mapel_id: '', kelas_id: '', beban_jam: '' });

    // === SYNC WITH SERVER in background ===
    try {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guru_id: numericGuruIds[0],
          guru_ids: numericGuruIds,
          mapel_id: numericMapelId,
          kelas_id: numericKelasId,
          beban_jam: numericBebanJam,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (isEdit) {
          setPlots(prev => prev.map(p => p.id === plotForm.id ? data : p));
        } else {
          setPlots(prev => prev.map(p => p.id === tempId ? data : p));
        }
      } else {
        // Revert on server rejection
        setPlots(previousPlots);
        const data = await res.json();
        showToast(data.error || 'Server menolak. Plot dikembalikan.', 'error');
        if (data.existingPlotId) {
          setHighlightedPlotId(data.existingPlotId);
          setTimeout(() => {
            const el = document.getElementById(`plot-row-${data.existingPlotId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
          setTimeout(() => setHighlightedPlotId(null), 4500);
        }
      }
    } catch (err) {
      setPlots(previousPlots);
      showToast('Koneksi server gagal. Plot dikembalikan.', 'error');
    }
  };

  const deletePlot = async (id) => {
    if (!window.confirm('Hapus plot mengajar ini? Seluruh jadwal yang menggunakan plot ini juga akan terhapus.')) return;
    try {
      const res = await apiFetch(`${API_BASE}/plots/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setJadwals(prev => prev.filter(j => j.plot_id !== id));
        setPlots(prev => prev.filter(p => p.id !== id));
        showToast('Plot mengajar berhasil dihapus.');
      }
    } catch (err) {
      showToast('Gagal menghapus plot.', 'error');
    }
  };

  const saveTimeSettings = async (e) => {
    if (e) e.preventDefault();
    
    const totalJpVal = Number(timeForm.total_jp);
    if (isNaN(totalJpVal) || totalJpVal < 1 || totalJpVal > 15) {
      showToast('Total JP harus berupa angka antara 1 sampai 15.', 'error');
      return;
    }

    if (timeForm.active_days.length === 0) {
      showToast('Pilih minimal 1 hari aktif sekolah.', 'error');
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE}/time-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active_days: timeForm.active_days,
          total_jp: totalJpVal,
          breaks: timeForm.breaks
        })
      });

      const data = await res.json();
      if (res.ok) {
        const initialBreaks = getInitialBreaks(data.breaks);
        setTimeSettings({ ...data, breaks: initialBreaks });
        setTimeForm({
          active_days: data.active_days || [],
          total_jp: data.total_jp || 10,
          breaks: initialBreaks
        });
        showToast('Pengaturan waktu berhasil disimpan!', 'success');
        
        const slotsRes = await apiFetch(`${API_BASE}/slots`);
        if (slotsRes.ok) {
          const s = await slotsRes.json();
          setSlots(s);
        }
      } else {
        showToast(data.error || 'Gagal menyimpan pengaturan waktu.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Koneksi server gagal.', 'error');
    }
  };

  // ==========================================
  // MATRIX RENDERING PREPARATIONS
  // ==========================================
  const days = timeSettings?.active_days || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Group slots by day
  const slotsByDay = {};
  days.forEach((day) => {
    slotsByDay[day] = slots.filter((s) => s.hari === day);
  });

  // Calculate dynamic sisa jam for a plot
  const getSisaJam = (plot) => {
    const scheduledCount = jadwals.filter((j) => j.plot_id === plot.id).length;
    return Math.max(0, plot.beban_jam - scheduledCount);
  };

  // Filter plots for current selected class
  const activeClassPlots = plots.filter((p) => p.kelas_id === Number(selectedKelasId));
  const visibleClassPlots = selectedFilterGuruId
    ? activeClassPlots.filter((p) => p.gurus ? p.gurus.some(g => g.id === Number(selectedFilterGuruId)) : p.guru_id === Number(selectedFilterGuruId))
    : activeClassPlots;

  // Extract unique teachers from activeClassPlots
  const activeClassGurus = React.useMemo(() => {
    const seen = new Set();
    const list = [];
    activeClassPlots.forEach((p) => {
      if (p.gurus) {
        p.gurus.forEach(g => {
          if (!seen.has(g.id)) {
            seen.add(g.id);
            list.push(g);
          }
        });
      } else if (p.guru && !seen.has(p.guru_id)) {
        seen.add(p.guru_id);
        list.push(p.guru);
      }
    });
    return list.sort((a, b) => a.nama_guru.localeCompare(b.nama_guru));
  }, [activeClassPlots]);

  // Determine row count based on the first active day's slots
  const firstActiveDay = days[0] || 'Senin';
  const totalRows = slotsByDay[firstActiveDay] ? slotsByDay[firstActiveDay].length : 0;

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
