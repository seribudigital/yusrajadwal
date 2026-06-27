import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : '/api');

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
  const [activeTab, setActiveTab] = useState('jadwal'); // 'jadwal' | 'master' | 'rekap' | 'profil'

  // Master Data State
  const [gurus, setGurus] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [mapels, setMapels] = useState([]);
  const [slots, setSlots] = useState([]);
  const [plots, setPlots] = useState([]);
  const [jadwals, setJadwals] = useState([]);

  // Active Selections
  const [selectedKelasId, setSelectedKelasId] = useState(null);
  const [selectedRekapKelasId, setSelectedRekapKelasId] = useState(null);
  const [selectedRekapGuruId, setSelectedRekapGuruId] = useState(null);
  const [selectedFilterGuruId, setSelectedFilterGuruId] = useState('');

  // Sub-tabs inside Master Data
  const [masterSubTab, setMasterSubTab] = useState('guru'); // 'guru' | 'kelas' | 'mapel' | 'slot' | 'plot'

  // Form States for CRUD
  const [guruForm, setGuruForm] = useState({ id: null, nama_guru: '', nip: '' });
  const [kelasForm, setKelasForm] = useState({ id: null, nama_kelas: '' });
  const [mapelForm, setMapelForm] = useState({ id: null, nama_mapel: '', kode_mapel: '' });
  const [plotForm, setPlotForm] = useState({ id: null, guru_id: '', mapel_id: '', kelas_id: '', beban_jam: '' });
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
      ]);

      // Verify all responses succeeded
      for (const res of responses) {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Endpoint ${res.url} mengembalikan status ${res.status}: ${text ? (text.length > 400 ? text.substring(0, 400) + '...' : text) : 'Unknown Error'}`);
        }
      }

      const [g, k, m, s, p, j, sp] = await Promise.all(responses.map((r) => r.json()));

      setGurus(g);
      setKelas(k);
      setMapels(m);
      setSlots(s);
      setPlots(p);
      setJadwals(j);
      setSchoolProfile(sp);

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

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

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

    try {
      if (isMove) {
        const sourceJadwalId = parseInt(sourceJadwalIdStr);
        // Find existing schedule to check if slot changed
        const currentJadwal = jadwals.find(j => j.id === sourceJadwalId);
        if (currentJadwal && currentJadwal.slot_id === slotId) {
          // Dropped on the same slot, do nothing
          return;
        }

        const res = await apiFetch(`${API_BASE}/jadwals/${sourceJadwalId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot_id: slotId, plot_id: plotId }),
        });
        const data = await res.json();

        if (res.ok) {
          setJadwals((prev) => prev.map((j) => (j.id === sourceJadwalId ? data : j)));
          setSuccessDropSlotId(slotId);
          showToast('Jadwal berhasil dipindahkan!', 'success');
          setTimeout(() => setSuccessDropSlotId(null), 1000);
        } else {
          showToast(data.error || 'Gagal memindahkan jadwal.', 'error');
        }
      } else {
        const res = await apiFetch(`${API_BASE}/jadwals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot_id: slotId, plot_id: plotId }),
        });
        const data = await res.json();

        if (res.ok) {
          setJadwals((prev) => [...prev, data]);
          setSuccessDropSlotId(slotId);
          showToast('Jadwal berhasil ditambahkan!', 'success');
          setTimeout(() => setSuccessDropSlotId(null), 1000);
        } else {
          showToast(data.error || 'Gagal menyimpan jadwal.', 'error');
        }
      }
    } catch (err) {
      showToast('Koneksi server gagal.', 'error');
    }
  };

  const handleDeleteJadwal = async (jadwalId) => {
    if (!window.confirm('Hapus jadwal pelajaran ini?')) return;
    try {
      const res = await apiFetch(`${API_BASE}/jadwals/${jadwalId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setJadwals((prev) => prev.filter((j) => j.id !== jadwalId));
        showToast('Jadwal berhasil dihapus.', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal menghapus jadwal.', 'error');
      }
    } catch (err) {
      showToast('Koneksi server gagal.', 'error');
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
          setPlots(prev => prev.map(p => p.guru_id === data.id ? { ...p, guru: data } : p));
          setJadwals(prev => prev.map(j => j.plot?.guru_id === data.id ? { ...j, plot: { ...j.plot, guru: data } } : j));
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
        const deletedPlotIds = plots.filter(p => p.guru_id === id).map(p => p.id);
        setJadwals(prev => prev.filter(j => !deletedPlotIds.includes(j.plot_id)));
        setPlots(prev => prev.filter(p => p.guru_id !== id));
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
        const data = await res.json();
        setSlots(prev => prev.map(s => s.id === data.id ? data : s));
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

    try {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guru_id: plotForm.guru_id,
          mapel_id: plotForm.mapel_id,
          kelas_id: plotForm.kelas_id,
          beban_jam: plotForm.beban_jam,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (isEdit) {
          setPlots(prev => prev.map(p => p.id === data.id ? data : p));
        } else {
          setPlots(prev => [...prev, data]);
        }
        showToast(`Plot tugas mengajar berhasil ${isEdit ? 'diperbarui' : 'disimpan'}!`);
        setPlotForm({ id: null, guru_id: '', mapel_id: '', kelas_id: '', beban_jam: '' });
      } else {
        const data = await res.json();
        showToast(data.error || 'Gagal menyimpan plot.', 'error');
        if (data.existingPlotId) {
          setHighlightedPlotId(data.existingPlotId);
          setTimeout(() => {
            const el = document.getElementById(`plot-row-${data.existingPlotId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
          setTimeout(() => {
            setHighlightedPlotId(null);
          }, 4500);
        }
      }
    } catch (err) {
      showToast('Koneksi server gagal.', 'error');
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

  // ==========================================
  // MATRIX RENDERING PREPARATIONS
  // ==========================================
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Group slots by day
  const slotsByDay = {};
  days.forEach((day) => {
    slotsByDay[day] = slots
      .filter((s) => s.hari === day)
      .sort((a, b) => a.id - b.id);
  });

  // Calculate dynamic sisa jam for a plot
  const getSisaJam = (plot) => {
    const scheduledCount = jadwals.filter((j) => j.plot_id === plot.id).length;
    return Math.max(0, plot.beban_jam - scheduledCount);
  };

  // Filter plots for current selected class
  const activeClassPlots = plots.filter((p) => p.kelas_id === Number(selectedKelasId));
  const visibleClassPlots = selectedFilterGuruId
    ? activeClassPlots.filter((p) => p.guru_id === Number(selectedFilterGuruId))
    : activeClassPlots;

  // Extract unique teachers from activeClassPlots
  const activeClassGurus = React.useMemo(() => {
    const seen = new Set();
    const list = [];
    activeClassPlots.forEach((p) => {
      if (p.guru && !seen.has(p.guru_id)) {
        seen.add(p.guru_id);
        list.push(p.guru);
      }
    });
    return list.sort((a, b) => a.nama_guru.localeCompare(b.nama_guru));
  }, [activeClassPlots]);

  // Determine row count based on Monday's slots (which has 17 slots)
  const totalRows = slotsByDay['Senin'] ? slotsByDay['Senin'].length : 0;

  if (!token) {
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
                <p className="text-xs text-slate-400">Online SaaS Platform</p>
              </div>
            </div>
            
            <div className="my-8 md:my-0 space-y-6">
              <h3 className="text-2xl font-bold text-white leading-tight">
                Penyusunan Jadwal Sekolah Jadi Lebih Mudah dan Cepat.
              </h3>
              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Early Warning System:</strong> Validasi otomatis anti-bentrok guru dan kelas secara real-time.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Multi-Tenant SaaS:</strong> Data sekolah Anda aman terisolasi di database cloud.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Interactive Drag & Drop:</strong> Susun jadwal pelajaran langsung di grid interaktif.</span>
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
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
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
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗓️</span>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Yusra Jadwal
              </h1>
              <p className="text-xs text-slate-400 font-medium">{user ? user.nama_sekolah : 'Semi-Otomatis & Anti-Bentrok'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="flex bg-slate-950 border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('jadwal')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                activeTab === 'jadwal'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Penyusunan Jadwal
            </button>
            <button
              onClick={() => setActiveTab('master')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                activeTab === 'master'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Data Master
            </button>
            <button
              onClick={() => setActiveTab('rekap')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                activeTab === 'rekap'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cetak / Rekap
            </button>
            <button
              onClick={() => setActiveTab('profil')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                activeTab === 'profil'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Profil Sekolah
            </button>
          </nav>
          <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
            <div className="hidden md:flex flex-col text-right">
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
              className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 hover:border-rose-500/50 text-rose-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Logout 🚪
            </button>
          </div>
        </div>
      </div>
    </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* =======================================================
            TAB 1: INTERACTIVE SCHEDULING (DRAG & DROP)
            ======================================================= */}
        {activeTab === 'jadwal' && (
          <div className="flex flex-col gap-6">
            
            {/* Top Bar Filter */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-slate-300">Kelas Aktif:</label>
                  <select
                    value={selectedKelasId || ''}
                    onChange={(e) => {
                      setSelectedKelasId(e.target.value);
                      setSelectedFilterGuruId(''); // Clear teacher filter when class changes
                    }}
                    className="bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    {kelas.length === 0 ? (
                      <option value="">(Belum ada kelas)</option>
                    ) : (
                      kelas
                        .filter((k) => k.nama_kelas !== 'OFFLINE')
                        .map((k) => (
                          <option key={k.id} value={k.id}>Kelas {k.nama_kelas}</option>
                        ))
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-slate-300">Sorot Jadwal Guru:</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedFilterGuruId || ''}
                      onChange={(e) => setSelectedFilterGuruId(e.target.value)}
                      className="bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="">(Semua Guru)</option>
                      {activeClassGurus.map((g) => (
                        <option key={g.id} value={g.id}>{g.nama_guru}</option>
                      ))}
                    </select>
                    {selectedFilterGuruId && (
                      <button
                        onClick={() => {
                          const tg = gurus.find((g) => g.id === Number(selectedFilterGuruId));
                          if (tg) handleExportGuru(tg.id, tg.nama_guru);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                        title="Ekspor jadwal guru terpilih"
                      >
                        📤 Ekspor
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-xs text-indigo-400 font-semibold bg-indigo-950/40 border border-indigo-900/60 px-3 py-1.5 rounded-lg">
                ℹ️ Tarik mata pelajaran dari sidebar kanan, lalu jatuhkan (drop) di kotak kosong jadwal kelas.
              </div>
            </div>

            {/* Layout Grid: Matrix & Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Matrix Grid (3/4 width) */}
              <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl overflow-auto max-h-[700px]">
                <table className="w-full min-w-[800px] border-collapse text-left text-sm table-fixed relative">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold sticky top-0 z-10 shadow-[0_1px_0_0_#1e293b]">
                      <th className="py-3 px-3 w-40 text-center bg-slate-950 rounded-tl-lg sticky top-0 z-10">Waktu & Jam</th>
                      {days.map((day) => (
                        <th key={day} className="py-3 px-3 text-center bg-slate-950 last:rounded-tr-lg sticky top-0 z-10">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {totalRows > 0 && Array.from({ length: totalRows }).map((_, rowIndex) => {
                      // Look up Monday slot to decide if row is break
                      const referenceSlot = slotsByDay['Senin'] ? slotsByDay['Senin'][rowIndex] : null;
                      if (!referenceSlot) return null;

                      const isBreakRow = referenceSlot.is_istirahat;

                      if (isBreakRow) {
                        return (
                          <tr key={rowIndex} className="border-b border-slate-800/50">
                            <td className="py-2.5 px-3 bg-slate-950/80 border-r border-slate-800 text-center text-xs font-semibold text-slate-400">
                              {referenceSlot.keterangan}
                            </td>
                            {/* Colspan across all 6 day columns */}
                            <td colSpan={6} className="py-2.5 px-4 bg-slate-800/40 text-center font-bold text-xs tracking-wider text-slate-400 italic">
                              ☕ {referenceSlot.keterangan.toUpperCase()} (
                              {referenceSlot.jam_mulai} - {referenceSlot.jam_selesai} 
                              {slotsByDay['Jumat'] && slotsByDay['Jumat'][rowIndex] && (
                                <span> | Jumat: {slotsByDay['Jumat'][rowIndex].jam_mulai} - {slotsByDay['Jumat'][rowIndex].jam_selesai}</span>
                              )}
                              )
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={rowIndex} className="border-b border-slate-800/50 hover:bg-slate-900/40 transition-colors">
                          {/* Row Header: Period & Monday Time template */}
                          <td className="py-4 px-3 bg-slate-950/40 border-r border-slate-800 text-center">
                            <div className="font-bold text-xs text-slate-300">Jam Ke-{referenceSlot.jam_ke}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {referenceSlot.jam_mulai}-{referenceSlot.jam_selesai}
                            </div>
                          </td>

                          {/* Day Columns */}
                          {days.map((day) => {
                            const slotsForThisDay = slotsByDay[day] || [];
                            const slot = slotsForThisDay[rowIndex];

                            // Cutoff Saturday after period 8
                            if (day === 'Sabtu' && rowIndex > 8) {
                              return (
                                <td
                                  key={day}
                                  className="py-4 px-2 bg-slate-950/40 border-r border-slate-800/30 text-center text-slate-600 text-xs italic font-medium"
                                >
                                  Libur
                                </td>
                              );
                            }

                            if (!slot) return <td key={day} className="border-r border-slate-800/30"></td>;

                            // Find schedule assigned to this slot
                            const scheduled = jadwals.find(
                              (j) => j.slot_id === slot.id && j.plot.kelas_id === Number(selectedKelasId)
                            );

                            // Check if selected teacher is busy at this slot in another class
                            const busyTeacherJadwal = selectedFilterGuruId
                              ? jadwals.find(
                                  (j) =>
                                    j.slot_id === slot.id &&
                                    j.plot.guru_id === Number(selectedFilterGuruId) &&
                                    j.plot.kelas_id !== Number(selectedKelasId)
                                )
                              : null;

                            const isDraggedOver = draggedOverSlotId === slot.id;
                            const isSuccessDrop = successDropSlotId === slot.id;

                            return (
                              <td
                                key={day}
                                onDragOver={(e) => handleDragOver(e, slot.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, slot.id)}
                                className={`p-2 border-r border-slate-800/30 relative group transition-all duration-200 ${
                                  isDraggedOver ? 'bg-indigo-950/60 ring-2 ring-indigo-500 border-indigo-500' : ''
                                } ${
                                  isSuccessDrop ? 'bg-emerald-950/60 ring-2 ring-emerald-500 border-emerald-500 scale-[0.98]' : ''
                                }`}
                              >
                                {scheduled ? (
                                  <div
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, scheduled.plot_id, scheduled.id)}
                                    className="bg-indigo-950/90 border border-indigo-500/30 p-2.5 rounded-lg relative flex flex-col h-full justify-between shadow-md cursor-grab active:cursor-grabbing hover:border-indigo-400/50 transition-all duration-200"
                                  >
                                    {/* Subject */}
                                    <div className="font-bold text-xs text-indigo-200 leading-tight">
                                      {scheduled.plot.mapel.nama_mapel}
                                    </div>
                                    {/* Teacher */}
                                    <div className="text-[10px] text-slate-300 mt-1 font-medium truncate">
                                      👨‍🏫 {scheduled.plot.guru.nama_guru}
                                    </div>
                                    {/* Individual slot times if different */}
                                    <div className="text-[8px] text-slate-500 mt-1">
                                      ⏰ {slot.jam_mulai} - {slot.jam_selesai}
                                    </div>
                                    
                                    {/* Delete Button */}
                                    <button
                                      onClick={() => handleDeleteJadwal(scheduled.id)}
                                      className="absolute top-1 right-1 p-1 rounded hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      title="Hapus Penempatan"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                ) : busyTeacherJadwal ? (
                                  busyTeacherJadwal.plot.kelas.nama_kelas === "OFFLINE" ? (
                                    <div
                                      style={{
                                        backgroundImage: 'repeating-linear-gradient(45deg, #1e293b 0px, #1e293b 6px, #0f172a 6px, #0f172a 12px)',
                                      }}
                                      className="border border-slate-700/60 rounded-lg py-3.5 px-1 text-center text-[10px] select-none flex flex-col justify-center items-center gap-0.5 shadow-sm animate-pulse"
                                      title="Guru Blockout / Jadwal Luar"
                                    >
                                      <span className="font-extrabold text-slate-350 tracking-wide text-[9px]">❌ GURU BLOCKOUT</span>
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider leading-none">❌ JADWAL LUAR</span>
                                    </div>
                                  ) : (
                                    <div className="border border-dashed border-rose-900/50 bg-rose-950/20 text-rose-400 rounded-lg py-3.5 px-1 text-center text-[10px] select-none flex flex-col justify-center items-center gap-0.5 animate-pulse">
                                      <span className="font-bold text-rose-400 tracking-wide text-[10px]">⚠️ SIBUK</span>
                                      <span className="text-[9px] text-rose-300/80 font-semibold leading-none truncate max-w-full" title={`Mengajar di kelas ${busyTeacherJadwal.plot.kelas.nama_kelas}`}>Kelas {busyTeacherJadwal.plot.kelas.nama_kelas}</span>
                                    </div>
                                  )
                                ) : (
                                  <div className="border border-dashed border-slate-800 rounded-lg py-4 px-1 text-center text-[10px] text-slate-600 group-hover:border-slate-700 select-none">
                                    Kosong
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Draggable Lessons Sidebar (1/4 width) */}
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col max-h-[700px] overflow-y-auto">
                <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 mb-4">
                  Daftar Tugas Mengajar (Plots)
                </h3>

                {activeClassPlots.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 py-6 italic">
                    Belum ada plot mengajar untuk kelas ini. Sila tambahkan plot di tab "Data Master".
                  </div>
                ) : visibleClassPlots.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 py-6 italic">
                    Tidak ada tugas mengajar untuk guru terpilih di kelas ini.
                  </div>
                ) : visibleClassPlots.filter(p => getSisaJam(p) > 0).length === 0 ? (
                  <div className="text-center text-xs text-emerald-400 py-6 font-semibold bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 shadow-sm animate-pulse">
                    {selectedFilterGuruId ? (
                      <span>🎉 Semua tugas mengajar guru ini untuk kelas ini sudah terjadwal!</span>
                    ) : (
                      <span>🎉 Semua mata pelajaran kelas ini sudah sepenuhnya terjadwal!</span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {visibleClassPlots
                      .filter((p) => getSisaJam(p) > 0)
                      .map((plot) => {
                        const sisa = getSisaJam(plot);

                        return (
                          <div
                            key={plot.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, plot.id)}
                            className="bg-slate-950/60 border border-slate-800 text-slate-200 cursor-grab hover:border-indigo-500/50 hover:bg-slate-950/80 active:cursor-grabbing hover:-translate-y-0.5 border p-3 rounded-xl shadow-sm transition-all duration-200"
                          >
                            <div className="flex justify-between items-start gap-1">
                              <span className="text-xs font-bold text-indigo-300">
                                {plot.mapel.nama_mapel}
                              </span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-indigo-950 text-indigo-400 border border-indigo-900/50">
                                Sisa: {sisa} Jam
                              </span>
                            </div>
                            
                            <div className="text-[10px] text-slate-400 mt-2 font-medium truncate">
                              👨‍🏫 {plot.guru.nama_guru}
                            </div>
                            
                            <div className="text-[9px] text-slate-500 mt-1 flex justify-between">
                              <span>Beban: {plot.beban_jam} Jam</span>
                              {plot.mapel.kode_mapel && <span>Code: {plot.mapel.kode_mapel}</span>}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            TAB 2: DATA MASTER CRUD PANEL
            ======================================================= */}
        {activeTab === 'master' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Master Navigation Left Sidebar */}
            <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl h-fit">
              <nav className="flex flex-col gap-1">
                {[
                  { id: 'guru', label: '👨‍🏫 Guru' },
                  { id: 'kelas', label: '🏫 Kelas' },
                  { id: 'mapel', label: '📚 Mata Pelajaran' },
                  { id: 'slot', label: '⏰ Waktu & Slot' },
                  { id: 'plot', label: '🎯 Plotting Beban Mengajar' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMasterSubTab(tab.id)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      masterSubTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Master Content Area Right Panel (3/4 width) */}
            <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col gap-6">
              
              {/* SUB TAB: GURU */}
              {masterSubTab === 'guru' && (
                <div>
                  <h2 className="text-base font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">
                    Manajemen Data Guru
                  </h2>
                  
                  {/* Guru Form */}
                  <form onSubmit={saveGuru} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-wrap gap-4 mb-6">
                    <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Nama Guru</label>
                      <input
                        type="text"
                        placeholder="Contoh: Budi Utomo, S.Pd"
                        value={guruForm.nama_guru}
                        onChange={(e) => setGuruForm({ ...guruForm, nama_guru: e.target.value })}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">NIP (Optional)</label>
                      <input
                        type="text"
                        placeholder="Contoh: 1980xxxx"
                        value={guruForm.nip}
                        onChange={(e) => setGuruForm({ ...guruForm, nip: e.target.value })}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="w-full md:w-auto flex items-end gap-2">
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow cursor-pointer transition-colors"
                      >
                        {guruForm.id ? 'Simpan Update' : 'Tambah Guru'}
                      </button>
                      {guruForm.id && (
                        <button
                          type="button"
                          onClick={() => setGuruForm({ id: null, nama_guru: '', nip: '' })}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Guru Table List */}
                  <div className="overflow-x-auto border border-slate-850 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-450 font-bold">
                          <th className="py-3 px-4">Nama Guru</th>
                          <th className="py-3 px-4">NIP</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gurus.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center py-6 text-slate-500 italic">
                              Tidak ada data guru.
                            </td>
                          </tr>
                        ) : (
                          gurus.map((g) => (
                            <tr key={g.id} className="border-b border-slate-800/40 hover:bg-slate-950/20">
                              <td className="py-3 px-4 font-semibold text-slate-200">{g.nama_guru}</td>
                              <td className="py-3 px-4 text-slate-400">{g.nip || '-'}</td>
                              <td className="py-3 px-4 text-right flex justify-end gap-2">
                                <button
                                  onClick={() => handleExportGuru(g.id, g.nama_guru)}
                                  className="text-emerald-450 hover:text-emerald-350 p-1 text-[11px] font-semibold cursor-pointer"
                                  title="Ekspor Jadwal Guru ke JSON"
                                >
                                  Ekspor
                                </button>
                                <button
                                  onClick={() => setGuruForm({ id: g.id, nama_guru: g.nama_guru, nip: g.nip || '' })}
                                  className="text-indigo-400 hover:text-indigo-300 p-1 text-[11px] font-semibold cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteGuru(g.id)}
                                  className="text-rose-400 hover:text-rose-300 p-1 text-[11px] font-semibold cursor-pointer"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Import zone */}
                  <div className="mt-8 border-t border-slate-800 pt-6">
                    <h3 className="text-xs font-bold text-slate-350 mb-3 uppercase tracking-wider">
                      📥 Impor Jadwal Guru (Sekolah Lain)
                    </h3>
                    <p className="text-xs text-slate-450 leading-relaxed mb-4">
                      Anda dapat mengunggah file `.json` jadwal guru dari sekolah lain. Sistem akan otomatis mendeteksi bentrok jadwal guru tersebut dan memasukkannya ke kelas <code className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-400 text-[10px]">OFFLINE</code> di database ini.
                    </p>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer bg-slate-950 border-slate-800 hover:bg-slate-900/60 hover:border-indigo-500/50 transition-all duration-200">
                        <div className="flex flex-col items-center justify-center pt-4 pb-4">
                          <span className="text-2xl mb-1">📁</span>
                          <p className="text-xs text-slate-300 font-bold mb-0.5">
                            Pilih File Jadwal (.json)
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Drag & drop file di sini atau klik untuk memilih
                          </p>
                        </div>
                        <input
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleImportGuru(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB TAB: KELAS */}
              {masterSubTab === 'kelas' && (
                <div>
                  <h2 className="text-base font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">
                    Manajemen Data Kelas
                  </h2>
                  
                  {/* Kelas Form */}
                  <form onSubmit={saveKelas} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-wrap gap-4 mb-6">
                    <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Nama Kelas</label>
                      <input
                        type="text"
                        placeholder="Contoh: 7-A atau 8-B"
                        value={kelasForm.nama_kelas}
                        onChange={(e) => setKelasForm({ ...kelasForm, nama_kelas: e.target.value })}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow cursor-pointer transition-colors"
                      >
                        {kelasForm.id ? 'Simpan Update' : 'Tambah Kelas'}
                      </button>
                      {kelasForm.id && (
                        <button
                          type="button"
                          onClick={() => setKelasForm({ id: null, nama_kelas: '' })}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Kelas Table List */}
                  <div className="overflow-x-auto border border-slate-850 rounded-lg max-w-md">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-450 font-bold">
                          <th className="py-3 px-4">Nama Kelas</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kelas.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="text-center py-6 text-slate-500 italic">
                              Tidak ada data kelas.
                            </td>
                          </tr>
                        ) : (
                          kelas.map((k) => (
                            <tr key={k.id} className="border-b border-slate-800/40 hover:bg-slate-950/20">
                              <td className="py-3 px-4 font-semibold text-slate-200">Kelas {k.nama_kelas}</td>
                              <td className="py-3 px-4 text-right flex justify-end gap-2">
                                <button
                                  onClick={() => setKelasForm({ id: k.id, nama_kelas: k.nama_kelas })}
                                  className="text-indigo-400 hover:text-indigo-300 p-1 text-[11px] font-semibold cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteKelas(k.id)}
                                  className="text-rose-400 hover:text-rose-300 p-1 text-[11px] font-semibold cursor-pointer"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB TAB: MAPEL */}
              {masterSubTab === 'mapel' && (
                <div>
                  <h2 className="text-base font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">
                    Manajemen Mata Pelajaran
                  </h2>
                  
                  {/* Mapel Form */}
                  <form onSubmit={saveMapel} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-wrap gap-4 mb-6">
                    <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Nama Mata Pelajaran</label>
                      <input
                        type="text"
                        placeholder="Contoh: Matematika"
                        value={mapelForm.nama_mapel}
                        onChange={(e) => setMapelForm({ ...mapelForm, nama_mapel: e.target.value })}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Kode Mapel (Optional)</label>
                      <input
                        type="text"
                        placeholder="Contoh: MTK"
                        value={mapelForm.kode_mapel}
                        onChange={(e) => setMapelForm({ ...mapelForm, kode_mapel: e.target.value })}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="w-full md:w-auto flex items-end gap-2">
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow cursor-pointer transition-colors"
                      >
                        {mapelForm.id ? 'Simpan Update' : 'Tambah Mapel'}
                      </button>
                      {mapelForm.id && (
                        <button
                          type="button"
                          onClick={() => setMapelForm({ id: null, nama_mapel: '', kode_mapel: '' })}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Mapel Table List */}
                  <div className="overflow-x-auto border border-slate-850 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-450 font-bold">
                          <th className="py-3 px-4">Nama Pelajaran</th>
                          <th className="py-3 px-4">Kode</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mapels.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center py-6 text-slate-500 italic">
                              Tidak ada data mata pelajaran.
                            </td>
                          </tr>
                        ) : (
                          mapels.map((m) => (
                            <tr key={m.id} className="border-b border-slate-800/40 hover:bg-slate-950/20">
                              <td className="py-3 px-4 font-semibold text-slate-200">{m.nama_mapel}</td>
                              <td className="py-3 px-4 text-slate-400">{m.kode_mapel || '-'}</td>
                              <td className="py-3 px-4 text-right flex justify-end gap-2">
                                <button
                                  onClick={() => setMapelForm({ id: m.id, nama_mapel: m.nama_mapel, kode_mapel: m.kode_mapel || '' })}
                                  className="text-indigo-400 hover:text-indigo-300 p-1 text-[11px] font-semibold cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteMapel(m.id)}
                                  className="text-rose-400 hover:text-rose-300 p-1 text-[11px] font-semibold cursor-pointer"
                                >
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB TAB: SLOT WAKTU */}
              {masterSubTab === 'slot' && (
                <div>
                  <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                    <h2 className="text-base font-bold text-slate-200">
                      Konfigurasi Jam Operasional Sekolah (Slots)
                    </h2>
                    <span className="text-[10px] bg-slate-950 text-indigo-400 px-3 py-1 rounded border border-slate-800 font-semibold">
                      Total: {slots.length} Slots
                    </span>
                  </div>

                  <p className="text-xs text-slate-450 leading-relaxed mb-4">
                    💡 Anda dapat mengedit rentang waktu jam masuk pelajaran di bawah ini. Waktu ini akan langsung ter-update di grid jadwal secara dinamis tanpa mengubah susunan jadwal yang sudah terisi.
                  </p>

                  {/* Slots Table List */}
                  <div className="overflow-y-auto border border-slate-850 rounded-lg max-h-[450px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-450 font-bold sticky top-0">
                          <th className="py-3 px-4">Hari</th>
                          <th className="py-3 px-4">Jam Ke</th>
                          <th className="py-3 px-4">Jam Mulai</th>
                          <th className="py-3 px-4">Jam Selesai</th>
                          <th className="py-3 px-4">Keterangan</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slots.map((s) => {
                          const isEditing = editingSlotId === s.id;

                          return (
                            <tr key={s.id} className={`border-b border-slate-800/40 hover:bg-slate-950/20 ${s.is_istirahat ? 'bg-slate-900/30' : ''}`}>
                              <td className="py-3 px-4 font-bold text-slate-350">{s.hari}</td>
                              <td className="py-3 px-4 font-medium text-slate-200">
                                {s.is_istirahat ? '-' : `Jam ${s.jam_ke}`}
                              </td>
                              <td className="py-3 px-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingSlotData.jam_mulai}
                                    onChange={(e) => setEditingSlotData({ ...editingSlotData, jam_mulai: e.target.value })}
                                    className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-slate-200 w-16"
                                  />
                                ) : (
                                  s.jam_mulai
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingSlotData.jam_selesai}
                                    onChange={(e) => setEditingSlotData({ ...editingSlotData, jam_selesai: e.target.value })}
                                    className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-xs text-slate-200 w-16"
                                  />
                                ) : (
                                  s.jam_selesai
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-400">
                                {s.is_istirahat ? `☕ ${s.keterangan}` : s.keterangan || 'Pelajaran'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {isEditing ? (
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => saveSlotTime(s.id)}
                                      className="text-emerald-400 hover:text-emerald-300 font-bold px-1.5 py-0.5 cursor-pointer"
                                    >
                                      Simpan
                                    </button>
                                    <button
                                      onClick={() => setEditingSlotId(null)}
                                      className="text-slate-400 hover:text-slate-300 font-bold px-1.5 py-0.5 cursor-pointer"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingSlotId(s.id);
                                      setEditingSlotData({ jam_mulai: s.jam_mulai, jam_selesai: s.jam_selesai });
                                    }}
                                    className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                                  >
                                    Edit Waktu
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB TAB: PLOTTING BEBAN MENGAJAR */}
              {masterSubTab === 'plot' && (
                <div>
                  <h2 className="text-base font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">
                    Pembagian Beban Jam Mengajar (Plots)
                  </h2>
                  
                  {/* Plot Form */}
                  <form onSubmit={savePlot} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-wrap gap-4 mb-6">
                    <div className="flex-1 min-w-[150px] flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Guru</label>
                      <select
                        value={plotForm.guru_id}
                        onChange={(e) => setPlotForm({ ...plotForm, guru_id: e.target.value })}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        required
                      >
                        <option value="">-- Pilih Guru --</option>
                        {gurus.map((g) => (
                          <option key={g.id} value={g.id}>{g.nama_guru}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 min-w-[150px] flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Mata Pelajaran</label>
                      <select
                        value={plotForm.mapel_id}
                        onChange={(e) => setPlotForm({ ...plotForm, mapel_id: e.target.value })}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        required
                      >
                        <option value="">-- Pilih Pelajaran --</option>
                        {mapels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nama_mapel} {m.kode_mapel ? `(${m.kode_mapel})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 min-w-[150px] flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Diberikan di Kelas</label>
                      <select
                        value={plotForm.kelas_id}
                        onChange={(e) => setPlotForm({ ...plotForm, kelas_id: e.target.value })}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        required
                      >
                        <option value="">-- Pilih Kelas --</option>
                        {kelas.map((k) => (
                          <option key={k.id} value={k.id}>Kelas {k.nama_kelas}</option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24 flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">Beban Jam</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="JP"
                        value={plotForm.beban_jam}
                        onChange={(e) => setPlotForm({ ...plotForm, beban_jam: e.target.value })}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div className="w-full lg:w-auto flex items-end gap-2">
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow cursor-pointer transition-colors"
                      >
                        {plotForm.id ? 'Simpan Update' : 'Tambah Plot'}
                      </button>
                      {plotForm.id && (
                        <button
                          type="button"
                          onClick={() => setPlotForm({ id: null, guru_id: '', mapel_id: '', kelas_id: '', beban_jam: '' })}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition-colors"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Plot Table List */}
                  <div className="overflow-x-auto border border-slate-850 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-450 font-bold">
                          <th className="py-3 px-4">Guru</th>
                          <th className="py-3 px-4">Mata Pelajaran</th>
                          <th className="py-3 px-4">Kelas</th>
                          <th className="py-3 px-4">Beban Jam</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plots.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-6 text-slate-500 italic">
                              Tidak ada data plot mengajar.
                            </td>
                          </tr>
                        ) : (
                          plots.map((p) => {
                            const isHighlighted = p.id === highlightedPlotId;
                            return (
                              <tr
                                key={p.id}
                                id={`plot-row-${p.id}`}
                                className={`border-b border-slate-800/40 hover:bg-slate-950/20 transition-all duration-500 ${
                                  isHighlighted
                                    ? 'bg-yellow-950/65 border-yellow-500 ring-2 ring-yellow-500/50 animate-pulse scale-[1.01]'
                                    : ''
                                }`}
                              >
                                <td className="py-3 px-4 font-semibold text-slate-200">
                                  {p.guru?.nama_guru || '(Terhapus)'}
                                </td>
                                <td className="py-3 px-4 text-slate-350">
                                  {p.mapel?.nama_mapel || '(Terhapus)'}
                                </td>
                                <td className="py-3 px-4 text-slate-400">
                                  {p.kelas ? `Kelas ${p.kelas.nama_kelas}` : '(Terhapus)'}
                                </td>
                                <td className="py-3 px-4 font-bold text-indigo-400">{p.beban_jam} Jam Pelajaran (JP)</td>
                                <td className="py-3 px-4 text-right flex justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      setPlotForm({
                                        id: p.id,
                                        guru_id: p.guru_id,
                                        mapel_id: p.mapel_id,
                                        kelas_id: p.kelas_id,
                                        beban_jam: p.beban_jam,
                                      })
                                    }
                                    className="text-indigo-400 hover:text-indigo-300 p-1 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deletePlot(p.id)}
                                    className="text-rose-400 hover:text-rose-300 p-1 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* =======================================================
            TAB 3: CETAK & REKAP (PRINT READY VIEW)
            ======================================================= */}
        {activeTab === 'rekap' && (
          <div className="flex flex-col gap-8 print:p-0">
            
            {/* Top selectors, hidden when printing */}
            <div className="flex flex-wrap gap-6 bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg print:hidden">
              {/* Option 1: Rekap Per Kelas */}
              <div className="flex-1 min-w-[280px] flex flex-col gap-2">
                <h3 className="text-sm font-bold text-slate-200">1. Rekap Jadwal per Kelas</h3>
                <div className="flex gap-2">
                  <select
                    value={selectedRekapKelasId || ''}
                    onChange={(e) => {
                      setSelectedRekapKelasId(e.target.value);
                      setSelectedRekapGuruId(''); // Clear teacher filter
                    }}
                    className="bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-200 flex-1 focus:outline-none"
                  >
                    {kelas.map((k) => (
                      <option key={k.id} value={k.id}>Kelas {k.nama_kelas}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => window.print()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer"
                  >
                    Cetak PDF
                  </button>
                </div>
              </div>

              {/* Option 2: Rekap Per Guru */}
              <div className="flex-1 min-w-[280px] flex flex-col gap-2">
                <h3 className="text-sm font-bold text-slate-200">2. Rekap Agenda per Guru</h3>
                <div className="flex gap-2">
                  <select
                    value={selectedRekapGuruId || ''}
                    onChange={(e) => {
                      setSelectedRekapGuruId(e.target.value);
                      setSelectedRekapKelasId(''); // Clear class filter
                    }}
                    className="bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-200 flex-1 focus:outline-none"
                  >
                    {gurus.map((g) => (
                      <option key={g.id} value={g.id}>{g.nama_guru}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => window.print()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer"
                  >
                    Cetak PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Printable Preview Container */}
            <div className="bg-white text-slate-900 border border-slate-200 rounded-xl p-8 shadow-xl max-w-5xl mx-auto w-full print:border-none print:shadow-none print:p-0">
              
              {/* REKAP PER KELAS VIEW */}
              {selectedRekapKelasId && (
                <div>
                  {/* Print Header */}
                  <div className="flex items-center justify-center border-b-4 border-double border-slate-900 pb-4 mb-6 gap-4">
                    {schoolProfile?.logo_url && (
                      <img src={schoolProfile.logo_url} alt="Logo Sekolah" className="w-16 h-16 object-contain flex-shrink-0" />
                    )}
                    <div className="text-center flex-1">
                      <h2 className="text-2xl font-black tracking-wide text-slate-950 uppercase leading-none">
                        JADWAL PELAJARAN {schoolProfile?.nama_sekolah || 'SEKOLAH'}
                      </h2>
                      <h3 className="text-lg font-bold text-slate-800 mt-1.5">
                        KELAS {kelas.find(k => k.id === Number(selectedRekapKelasId))?.nama_kelas || ''}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 font-bold">
                        Tahun Ajaran: {schoolProfile?.tahun_ajaran || '2026/2027'} | Semester: {schoolProfile?.semester || 'Ganjil'}
                      </p>
                    </div>
                    {schoolProfile?.logo_url && <div className="w-16 h-16 flex-shrink-0 invisible"></div>}
                  </div>

                  {/* Clean printable grid */}
                  <table className="w-full border-collapse border border-slate-400 text-xs table-fixed">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 border border-slate-400 font-bold">
                        <th className="py-2.5 px-2 border border-slate-400 w-24 text-center">Waktu & Jam</th>
                        {days.map((day) => (
                          <th key={day} className="py-2.5 px-2 border border-slate-400 text-center">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {totalRows > 0 && Array.from({ length: totalRows }).map((_, rowIndex) => {
                        const referenceSlot = slotsByDay['Senin'] ? slotsByDay['Senin'][rowIndex] : null;
                        if (!referenceSlot) return null;

                        const isBreakRow = referenceSlot.is_istirahat;

                        if (isBreakRow) {
                          return (
                            <tr key={rowIndex} className="border border-slate-400">
                              <td className="py-2 px-2 border border-slate-400 text-center bg-slate-100 font-bold text-[10px] text-slate-700">
                                ISTIRAHAT
                              </td>
                              <td colSpan={6} className="py-2 px-2 text-center bg-slate-100/70 font-bold text-[10px] italic tracking-widest text-slate-650">
                                {referenceSlot.keterangan.toUpperCase()} (
                                {referenceSlot.jam_mulai} - {referenceSlot.jam_selesai}
                                {slotsByDay['Jumat'] && slotsByDay['Jumat'][rowIndex] && (
                                  <span> | Jumat: {slotsByDay['Jumat'][rowIndex].jam_mulai} - {slotsByDay['Jumat'][rowIndex].jam_selesai}</span>
                                )}
                                )
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={rowIndex} className="border border-slate-400">
                            {/* Time */}
                            <td className="py-3 px-1 border border-slate-400 text-center font-bold bg-slate-50/50">
                              <div className="text-[11px] text-slate-800">Jam {referenceSlot.jam_ke}</div>
                              <div className="text-[9px] text-slate-500 font-medium">{referenceSlot.jam_mulai}-{referenceSlot.jam_selesai}</div>
                            </td>

                            {/* Days */}
                            {days.map((day) => {
                              const slotsForThisDay = slotsByDay[day] || [];
                              const slot = slotsForThisDay[rowIndex];

                              if (day === 'Sabtu' && rowIndex > 8) {
                                return (
                                  <td key={day} className="py-3 px-2 border border-slate-400 text-center bg-slate-100/40 text-slate-400 font-semibold italic">
                                    -
                                  </td>
                                );
                              }

                              if (!slot) return <td key={day} className="border border-slate-400"></td>;

                              const scheduled = jadwals.find(
                                (j) => j.slot_id === slot.id && j.plot.kelas_id === Number(selectedRekapKelasId)
                              );

                              return (
                                <td key={day} className="py-3 px-2 border border-slate-400 text-center align-middle">
                                  {scheduled ? (
                                    <div>
                                      <div className="font-extrabold text-[11px] text-slate-900 leading-tight">
                                        {scheduled.plot.mapel.nama_mapel}
                                      </div>
                                      <div className="text-[9px] text-slate-600 font-semibold mt-1">
                                        {scheduled.plot.guru.nama_guru}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-350 font-normal italic">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Lembar Pengesahan (Signature Validation Block) */}
                  <div className="mt-12 grid grid-cols-2 text-xs text-slate-800 px-8 print:mt-16">
                    <div className="text-center flex flex-col items-center">
                      <p className="font-semibold">Mengetahui,</p>
                      <p className="font-bold mt-1">Kepala Sekolah</p>
                      <div className="h-16"></div> {/* Space for signature */}
                      <input
                        type="text"
                        value={kepalaSekolahName}
                        onChange={(e) => setKepalaSekolahName(e.target.value)}
                        className="text-center font-bold underline border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent w-full text-slate-900 focus:ring-0 cursor-text"
                        title="Klik untuk mengubah nama Kepala Sekolah"
                      />
                      <input
                        type="text"
                        value={kepalaSekolahNip}
                        onChange={(e) => setKepalaSekolahNip(e.target.value)}
                        className="text-center text-[10px] text-slate-500 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent w-full mt-0.5 focus:ring-0 cursor-text"
                        title="Klik untuk mengubah NIP Kepala Sekolah"
                      />
                    </div>
                    
                    <div className="text-center flex flex-col items-center">
                      <input
                        type="text"
                        value={tanggalPengesahan}
                        onChange={(e) => setTanggalPengesahan(e.target.value)}
                        className="text-center border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent w-full text-slate-800 text-xs focus:ring-0 cursor-text"
                        title="Klik untuk mengubah tanggal/kota pengesahan"
                      />
                      <p className="font-bold mt-1">Waka Kurikulum</p>
                      <div className="h-16"></div> {/* Space for signature */}
                      <input
                        type="text"
                        value={wakaKurikulumName}
                        onChange={(e) => setWakaKurikulumName(e.target.value)}
                        className="text-center font-bold underline border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent w-full text-slate-900 focus:ring-0 cursor-text"
                        title="Klik untuk mengubah nama Waka Kurikulum"
                      />
                      <input
                        type="text"
                        value={wakaKurikulumNip}
                        onChange={(e) => setWakaKurikulumNip(e.target.value)}
                        className="text-center text-[10px] text-slate-500 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent w-full mt-0.5 focus:ring-0 cursor-text"
                        title="Klik untuk mengubah NIP Waka Kurikulum"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* REKAP PER GURU VIEW */}
              {selectedRekapGuruId && (

                <div>
                  {/* Print Header */}
                  <div className="flex items-center justify-center border-b-4 border-double border-slate-900 pb-4 mb-6 gap-4">
                    {schoolProfile?.logo_url && (
                      <img src={schoolProfile.logo_url} alt="Logo Sekolah" className="w-16 h-16 object-contain flex-shrink-0" />
                    )}
                    <div className="text-center flex-1">
                      <h2 className="text-2xl font-black tracking-wide text-slate-950 uppercase leading-none">
                        JADWAL MENGAJAR GURU - {schoolProfile?.nama_sekolah || 'SEKOLAH'}
                      </h2>
                      <h3 className="text-lg font-bold text-slate-855 mt-1.5">
                        {gurus.find(g => g.id === Number(selectedRekapGuruId))?.nama_guru || ''}
                      </h3>
                      {gurus.find(g => g.id === Number(selectedRekapGuruId))?.nip && (
                        <p className="text-sm font-semibold text-slate-600 mt-0.5">
                          NIP. {gurus.find(g => g.id === Number(selectedRekapGuruId))?.nip}
                        </p>
                      )}
                      <p className="text-xs text-slate-600 mt-1 font-bold">
                        Tahun Ajaran: {schoolProfile?.tahun_ajaran || '2026/2027'} | Semester: {schoolProfile?.semester || 'Ganjil'}
                      </p>
                    </div>
                    {schoolProfile?.logo_url && <div className="w-16 h-16 flex-shrink-0 invisible"></div>}
                  </div>

                  {/* Summary of Teaching Hours per Class */}
                  {(() => {
                    const teacherJadwals = jadwals.filter(
                      (j) => j.plot.guru_id === Number(selectedRekapGuruId) &&
                             j.plot.kelas.nama_kelas?.toUpperCase() !== "OFFLINE" &&
                             j.plot.kelas.nama_kelas?.toUpperCase() !== "SIBUK" &&
                             j.plot.kelas.nama_kelas?.toUpperCase() !== "KELAS SIBUK"
                    );
                    const hoursPerClass = {};
                    teacherJadwals.forEach((j) => {
                      const className = j.plot.kelas.nama_kelas;
                      hoursPerClass[className] = (hoursPerClass[className] || 0) + 1;
                    });

                    return (
                      <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 print:border-slate-350 shadow-sm">
                        <h4 className="font-bold text-xs text-slate-900 mb-2">Ringkasan Beban Mengajar:</h4>
                        <div className="flex flex-wrap gap-3">
                          {Object.keys(hoursPerClass).length === 0 ? (
                            <span className="text-slate-500 italic">Belum ada beban mengajar terjadwal.</span>
                          ) : (
                            Object.entries(hoursPerClass).map(([className, hours]) => (
                              <div key={className} className="bg-white border border-slate-300 px-3 py-1 rounded shadow-sm">
                                <span className="font-semibold text-slate-600">Kelas {className} :</span>{' '}
                                <span className="font-bold text-indigo-700">{hours} Jam (JP)</span>
                              </div>
                            ))
                          )}
                          <div className="bg-indigo-50 border border-indigo-200 px-3 py-1 rounded shadow-sm ml-auto print:ml-0">
                            <span className="font-semibold text-indigo-750">Total Beban :</span>{' '}
                            <span className="font-bold text-indigo-900">{teacherJadwals.length} Jam / Minggu</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Clean printable grid matrix */}
                  <table className="w-full border-collapse border border-slate-400 text-xs table-fixed">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 border border-slate-400 font-bold">
                        <th className="py-2.5 px-2 border border-slate-400 w-24 text-center">Waktu & Jam</th>
                        {days.map((day) => (
                          <th key={day} className="py-2.5 px-2 border border-slate-400 text-center">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {totalRows > 0 && Array.from({ length: totalRows }).map((_, rowIndex) => {
                        const referenceSlot = slotsByDay['Senin'] ? slotsByDay['Senin'][rowIndex] : null;
                        if (!referenceSlot) return null;

                        const isBreakRow = referenceSlot.is_istirahat;

                        if (isBreakRow) {
                          return (
                            <tr key={rowIndex} className="border border-slate-400">
                              <td className="py-2 px-2 border border-slate-400 text-center bg-slate-100 font-bold text-[10px] text-slate-700">
                                ISTIRAHAT
                              </td>
                              <td colSpan={6} className="py-2 px-2 text-center bg-slate-100/70 font-bold text-[10px] italic tracking-widest text-slate-650">
                                {referenceSlot.keterangan.toUpperCase()} (
                                {referenceSlot.jam_mulai} - {referenceSlot.jam_selesai}
                                {slotsByDay['Jumat'] && slotsByDay['Jumat'][rowIndex] && (
                                  <span> | Jumat: {slotsByDay['Jumat'][rowIndex].jam_mulai} - {slotsByDay['Jumat'][rowIndex].jam_selesai}</span>
                                )}
                                )
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={rowIndex} className="border border-slate-400">
                            {/* Time */}
                            <td className="py-3 px-1 border border-slate-400 text-center font-bold bg-slate-50/50">
                              <div className="text-[11px] text-slate-800">Jam {referenceSlot.jam_ke}</div>
                              <div className="text-[9px] text-slate-500 font-medium">{referenceSlot.jam_mulai}-{referenceSlot.jam_selesai}</div>
                            </td>

                            {/* Days */}
                            {days.map((day) => {
                              const slotsForThisDay = slotsByDay[day] || [];
                              const slot = slotsForThisDay[rowIndex];

                              if (day === 'Sabtu' && rowIndex > 8) {
                                return (
                                  <td key={day} className="py-3 px-2 border border-slate-400 text-center bg-slate-100/40 text-slate-400 font-semibold italic">
                                    -
                                  </td>
                                );
                              }

                              if (!slot) return <td key={day} className="border border-slate-400"></td>;

                              const scheduled = jadwals.find(
                                (j) => j.slot_id === slot.id && j.plot.guru_id === Number(selectedRekapGuruId)
                              );

                              const isOfflineSlot = scheduled && (
                                scheduled.plot.kelas.nama_kelas?.toUpperCase() === "OFFLINE" ||
                                scheduled.plot.kelas.nama_kelas?.toUpperCase() === "SIBUK" ||
                                scheduled.plot.kelas.nama_kelas?.toUpperCase() === "KELAS SIBUK"
                              );

                              return (
                                <td key={day} className={`py-3 px-2 border border-slate-400 text-center align-middle ${isOfflineSlot ? 'bg-gray-100' : ''}`}>
                                  {scheduled ? (
                                    isOfflineSlot ? null : (
                                      <div>
                                        <div className="font-extrabold text-[11px] text-slate-900 leading-tight">
                                          {scheduled.plot.mapel.nama_mapel}
                                        </div>
                                        <div className="text-[9px] text-indigo-750 font-extrabold mt-1">
                                          Kelas {scheduled.plot.kelas.nama_kelas}
                                        </div>
                                      </div>
                                    )
                                  ) : (
                                    <span className="text-slate-350 font-normal italic">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Daftar Mata Pelajaran dan Kelas yang Diampu */}
                  {(() => {
                    const teacherPlots = plots.filter(
                      (p) => p.guru_id === Number(selectedRekapGuruId) &&
                             p.kelas?.nama_kelas?.toUpperCase() !== "OFFLINE" &&
                             p.kelas?.nama_kelas?.toUpperCase() !== "SIBUK" &&
                             p.kelas?.nama_kelas?.toUpperCase() !== "KELAS SIBUK"
                    );

                    if (teacherPlots.length === 0) return null;

                    return (
                      <div className="mt-8 text-xs text-slate-800 px-2 print:mt-10">
                        <h4 className="font-bold text-slate-900 border-b border-slate-300 pb-1 mb-2 tracking-wide uppercase">
                          Daftar Mata Pelajaran &amp; Kelas yang Diampu
                        </h4>
                        <table className="w-full border-collapse border border-slate-300 text-left text-[11px] table-auto">
                          <thead>
                            <tr className="bg-slate-50 font-bold border-b border-slate-300 text-slate-700">
                              <th className="py-2 px-3 border border-slate-300 w-12 text-center">No.</th>
                              <th className="py-2 px-3 border border-slate-300">Mata Pelajaran</th>
                              <th className="py-2 px-3 border border-slate-300 text-center">Kelas</th>
                              <th className="py-2 px-3 border border-slate-300 text-center">Beban Mengajar (JP)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teacherPlots.map((p, index) => (
                              <tr key={p.id} className="border-b border-slate-200 text-slate-800">
                                <td className="py-1.5 px-3 border border-slate-300 text-center font-medium">{index + 1}</td>
                                <td className="py-1.5 px-3 border border-slate-300 font-semibold">{p.mapel?.nama_mapel}</td>
                                <td className="py-1.5 px-3 border border-slate-300 text-center font-medium">Kelas {p.kelas?.nama_kelas}</td>
                                <td className="py-1.5 px-3 border border-slate-300 text-center font-bold text-indigo-700">{p.beban_jam} JP</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}

                  {/* Lembar Pengesahan (Signature Validation Block) */}
                  <div className="mt-12 grid grid-cols-2 text-xs text-slate-800 px-8 print:mt-16">
                    <div className="text-center flex flex-col items-center">
                      <p className="font-semibold">Mengetahui,</p>
                      <p className="font-bold mt-1">Kepala Sekolah</p>
                      <div className="h-16"></div> {/* Space for signature */}
                      <input
                        type="text"
                        value={kepalaSekolahName}
                        onChange={(e) => setKepalaSekolahName(e.target.value)}
                        className="text-center font-bold underline border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent w-full text-slate-900 focus:ring-0 cursor-text"
                        title="Klik untuk mengubah nama Kepala Sekolah"
                      />
                      <input
                        type="text"
                        value={kepalaSekolahNip}
                        onChange={(e) => setKepalaSekolahNip(e.target.value)}
                        className="text-center text-[10px] text-slate-500 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent w-full mt-0.5 focus:ring-0 cursor-text"
                        title="Klik untuk mengubah NIP Kepala Sekolah"
                      />
                    </div>
                    
                    <div className="text-center flex flex-col items-center">
                      <input
                        type="text"
                        value={tanggalPengesahan}
                        onChange={(e) => setTanggalPengesahan(e.target.value)}
                        className="text-center border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent w-full text-slate-800 text-xs focus:ring-0 cursor-text"
                        title="Klik untuk mengubah tanggal/kota pengesahan"
                      />
                      <p className="font-bold mt-1">Waka Kurikulum</p>
                      <div className="h-16"></div> {/* Space for signature */}
                      <input
                        type="text"
                        value={wakaKurikulumName}
                        onChange={(e) => setWakaKurikulumName(e.target.value)}
                        className="text-center font-bold underline border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent w-full text-slate-900 focus:ring-0 cursor-text"
                        title="Klik untuk mengubah nama Waka Kurikulum"
                      />
                      <input
                        type="text"
                        value={wakaKurikulumNip}
                        onChange={(e) => setWakaKurikulumNip(e.target.value)}
                        className="text-center text-[10px] text-slate-500 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent w-full mt-0.5 focus:ring-0 cursor-text"
                        title="Klik untuk mengubah NIP Waka Kurikulum"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =======================================================
            TAB 4: SCHOOL PROFILE CONFIGURATION
            ======================================================= */}
        {activeTab === 'profil' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col gap-6 max-w-3xl mx-auto w-full">
            <div>
              <h2 className="text-lg font-bold text-slate-200 mb-2 border-b border-slate-800 pb-2">
                ⚙️ Pengaturan Profil Sekolah & Cetakan
              </h2>
              <p className="text-xs text-slate-400">
                Informasi di bawah ini digunakan untuk melengkapi kop surat dan lembar pengesahan pada saat pencetakan PDF jadwal pelajaran.
              </p>
            </div>

            <form onSubmit={saveSchoolProfile} className="flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Nama Sekolah</label>
                  <input
                    type="text"
                    placeholder="Contoh: SMA Negeri 1 Jakarta"
                    value={profileForm.nama_sekolah}
                    onChange={(e) => setProfileForm({ ...profileForm, nama_sekolah: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Nama Kepala Sekolah</label>
                  <input
                    type="text"
                    placeholder="Nama Kepala Sekolah beserta gelar"
                    value={profileForm.nama_kepala_sekolah}
                    onChange={(e) => setProfileForm({ ...profileForm, nama_kepala_sekolah: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">NIP Kepala Sekolah</label>
                  <input
                    type="text"
                    placeholder="Contoh: NIP. 197509..."
                    value={profileForm.nip_kepala_sekolah || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, nip_kepala_sekolah: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Nama Penyusun Jadwal (Waka Kurikulum)</label>
                  <input
                    type="text"
                    placeholder="Nama Penyusun beserta gelar"
                    value={profileForm.nama_penyusun_jadwal}
                    onChange={(e) => setProfileForm({ ...profileForm, nama_penyusun_jadwal: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">NIP Penyusun Jadwal</label>
                  <input
                    type="text"
                    placeholder="Contoh: NIP. 198304..."
                    value={profileForm.nip_penyusun_jadwal || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, nip_penyusun_jadwal: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Semester</label>
                  <select
                    value={profileForm.semester}
                    onChange={(e) => setProfileForm({ ...profileForm, semester: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full"
                    required
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Tahun Ajaran</label>
                  <input
                    type="text"
                    placeholder="Contoh: 2026/2027"
                    value={profileForm.tahun_ajaran}
                    onChange={(e) => setProfileForm({ ...profileForm, tahun_ajaran: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Tanggal Berlaku Jadwal (Optional)</label>
                  <input
                    type="date"
                    value={profileForm.tanggal_berlaku || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, tanggal_berlaku: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Kota & Tanggal Cetak (Pengesahan)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Jakarta, 24 Juni 2026"
                    value={profileForm.tanggal_cetak}
                    onChange={(e) => setProfileForm({ ...profileForm, tanggal_cetak: e.target.value })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Logo Sekolah</label>
                  <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 p-4 rounded-lg">
                    {profileForm.logo_url ? (
                      <div className="relative group w-16 h-16 bg-slate-900 border border-slate-800 rounded flex items-center justify-center overflow-hidden">
                        <img src={profileForm.logo_url} alt="Logo Preview" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setProfileForm({ ...profileForm, logo_url: null })}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-rose-400 transition-opacity cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-slate-900 border border-dashed border-slate-800 rounded flex items-center justify-center text-xl text-slate-500">
                        🏫
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="text-xs text-slate-450 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-slate-300 hover:file:bg-slate-800 file:cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Gunakan gambar PNG, JPG, atau SVG.</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg cursor-pointer transition-colors shadow-md mt-2 flex items-center justify-center gap-2"
              >
                💾 Simpan Profil Sekolah
              </button>
            </form>
          </div>
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
