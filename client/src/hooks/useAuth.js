import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : '/api');

export function useAuth(showToast, setActiveTab) {
  // Authentication States
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ email: '', password: '', nama_sekolah: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // Authenticated Fetch Wrapper
  const apiFetch = useCallback(async (url, options = {}) => {
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
            setUser(prevUser => {
              const suspendedUser = errData.user || { ...prevUser, status: 'SUSPENDED' };
              localStorage.setItem('user', JSON.stringify(suspendedUser));
              return suspendedUser;
            });
          }
        } catch (e) {}
      }
      return res;
    } catch (err) {
      throw err;
    }
  }, []);

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

  const fetchAnnouncement = useCallback(async () => {
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
  }, [token, apiFetch]);

  const checkUserStatus = useCallback(async (isManual = false) => {
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
  }, [token, user, showToast]);

  useEffect(() => {
    if (token) {
      checkUserStatus();
      fetchAnnouncement();
    }
  }, [token, checkUserStatus, fetchAnnouncement]);

  useEffect(() => {
    if (token && user?.status === 'SUSPENDED') {
      const timer = setInterval(() => {
        checkUserStatus();
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [token, user?.status, checkUserStatus]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    showToast('Anda telah keluar.');
  };

  return {
    token,
    setToken,
    user,
    setUser,
    authMode,
    setAuthMode,
    authForm,
    setAuthForm,
    showPassword,
    setShowPassword,
    authError,
    setAuthError,
    authLoading,
    setAuthLoading,
    announcement,
    setAnnouncement,
    apiFetch,
    handleAuthSubmit,
    checkUserStatus,
    fetchAnnouncement,
    handleLogout,
    API_BASE
  };
}
