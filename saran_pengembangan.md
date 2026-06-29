# 🔮 Saran Pengembangan — Yusra Jadwal

> Berdasarkan analisis mendalam terhadap seluruh codebase (schema, routes, components, config).

---

## 🔴 Prioritas Tinggi — Arsitektur & Skalabilitas

### 1. Refaktor "God Component" `App.jsx` (1.564 baris, ~62KB)

Ini adalah **risiko teknis terbesar** saat ini. Satu file mengelola 30+ state variables, semua CRUD handlers, drag & drop logic, dan rendering flow.

**Masalah:**
- Developer baru akan kesulitan memahami alur data
- Setiap perubahan kecil me-render ulang seluruh state tree
- Merge conflict sangat tinggi jika 2+ developer bekerja bersamaan

**Solusi bertahap (tidak perlu rewrite total):**

| Tahap | Aksi | Estimasi |
|-------|------|----------|
| 1 | Pindahkan `apiFetch`, `showToast`, `API_BASE` ke `src/utils/api.js` dan `src/hooks/useToast.js` | 1-2 jam |
| 2 | Buat `src/hooks/useAuth.js` — pindahkan semua auth state & logic (token, user, login, register, logout) | 2-3 jam |
| 3 | Buat `src/hooks/useMasterData.js` — pindahkan state CRUD (gurus, kelas, mapels, plots) + handler-nya | 3-4 jam |
| 4 | Buat `src/hooks/useScheduling.js` — pindahkan drag/drop logic, jadwals state, optimistic updates | 3-4 jam |
| 5 | Buat `src/context/AppContext.jsx` atau gunakan **Zustand** untuk shared state lintas tab | 2-3 jam |

**Hasil akhir:** `App.jsx` menyusut dari ~1.564 baris menjadi ~200-300 baris (hanya orchestration dan rendering).

---

### 2. Pisahkan `routes.js` (1.681 baris, ~51KB)

Satu file menampung **seluruh business logic** backend.

**Rekomendasi struktur:**
```
server/
├── routes/
│   ├── auth.js          # /register, /login, /me
│   ├── gurus.js         # /gurus CRUD
│   ├── kelas.js         # /kelas CRUD
│   ├── mapels.js        # /mapels CRUD
│   ├── slots.js         # /slots + dynamic break injection
│   ├── plots.js         # /plots CRUD
│   ├── jadwals.js       # /jadwals + validateJadwal
│   ├── import.js        # /import-master, /gurus/import
│   ├── blockedSlots.js  # /blocked-slots
│   └── timeSetting.js   # /time-settings
├── middleware/
│   ├── auth.js
│   └── requireAdmin.js
├── validators/
│   └── jadwalValidator.js  # validateJadwal() function
└── index.js
```

---

### 3. Tambahkan Rate Limiting & Input Sanitization

**Saat ini tidak ada rate limiting sama sekali.** Semua endpoint terbuka untuk abuse.

```javascript
// Contoh implementasi
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 menit
  max: 10,                    // 10 percobaan login per IP
  message: { error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }
});

app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
```

**Input sanitization** juga penting — saat ini `nama_guru`, `nama_kelas`, dll. langsung disimpan tanpa sanitasi XSS.

---

## 🟡 Prioritas Menengah — Fitur & UX

### 4. Auto-Scheduling Engine (Semi-Otomatis → Lebih Otomatis)

Saat ini penjadwalan 100% manual via drag & drop. Untuk sekolah dengan 30+ kelas, ini sangat melelahkan.

**Saran:** Tambahkan tombol **"Auto-Fill Cerdas"** yang:
1. Mengambil semua plot yang belum terjadwalkan (sisa jam > 0)
2. Mencari slot kosong yang valid (lolos 5 validasi)
3. Menempatkan secara otomatis menggunakan algoritma greedy/backtracking
4. Menampilkan preview sebelum commit

Ini bisa diimplementasi sebagai endpoint `POST /api/jadwals/auto-fill` dengan parameter `kelas_id`.

---

### 5. Undo/Redo System

Saat ini tidak ada cara untuk membatalkan aksi. Satu salah drop bisa berantai.

**Implementasi minimal:**
```javascript
// Di App.jsx atau useScheduling hook
const [history, setHistory] = useState([]);
const [historyIndex, setHistoryIndex] = useState(-1);

const pushHistory = (jadwalState) => {
  setHistory(prev => [...prev.slice(0, historyIndex + 1), jadwalState]);
  setHistoryIndex(prev => prev + 1);
};

// Ctrl+Z = undo, Ctrl+Shift+Z = redo
```

---

### 6. Real-Time Collaboration (WebSocket)

Jika 2 admin sekolah mengakses bersamaan, perubahan dari satu orang tidak terlihat oleh yang lain sampai refresh.

**Solusi:** Tambahkan **Server-Sent Events (SSE)** atau **WebSocket** untuk push update saat jadwal berubah. Karena menggunakan Vercel (serverless), SSE lebih cocok daripada WebSocket persisten.

---

### 7. Notifikasi Konflik Visual yang Lebih Kaya

Saat ini konflik hanya ditampilkan sebagai toast text. Tambahkan:
- **Highlight merah** pada sel grid yang menyebabkan konflik
- **Tooltip** yang menunjukkan "Guru X sudah mengajar di kelas Y pada jam ini"
- **Line connector** visual antara sel yang berkonflik

---

### 8. Dashboard Analytics untuk User Biasa

Saat ini hanya Proktor yang punya dashboard. Tambahkan untuk user biasa:

| Metrik | Deskripsi |
|--------|-----------|
| **Progress penjadwalan** | Bar chart: berapa % plot yang sudah terjadwalkan |
| **Distribusi beban guru** | Apakah ada guru yang terlalu padat atau terlalu sedikit jam? |
| **Slot kosong** | Berapa slot yang masih belum terisi per kelas? |
| **Heatmap jadwal** | Visualisasi kepadatan jadwal per hari (Senin padat, Jumat longgar?) |

---

## 🟢 Prioritas Rendah — Polish & Nice-to-Have

### 9. PWA (Progressive Web App)

Tambahkan `manifest.json` dan service worker agar aplikasi bisa:
- Di-install di homescreen HP guru/admin
- Bekerja offline (read-only mode untuk melihat jadwal)
- Push notification saat jadwal berubah

---

### 10. Multi-Bahasa (i18n)

Saat ini semua teks hardcoded dalam Bahasa Indonesia. Jika ingin ekspansi ke sekolah internasional, pertimbangkan `react-i18next`:

```
src/
├── locales/
│   ├── id.json   # Bahasa Indonesia
│   └── en.json   # English
```

---

### 11. Dark/Light Mode Toggle

Saat ini hanya dark mode (slate-950). Beberapa pengguna (terutama yang mencetak di ruang terang) mungkin lebih nyaman dengan light mode.

---

### 12. Audit Log / Riwayat Perubahan

Catat setiap perubahan jadwal:
```prisma
model AuditLog {
  id         Int      @id @default(autoincrement())
  user_id    Int
  action     String   // "CREATE_JADWAL", "DELETE_GURU", etc.
  entity     String   // "jadwal", "guru", etc.
  entity_id  Int
  old_data   Json?
  new_data   Json?
  createdAt  DateTime @default(now())
}
```

Berguna untuk:
- Melacak siapa mengubah apa
- Rollback jika ada kesalahan
- Compliance dan akuntabilitas

---

### 13. Template Jadwal & Duplikasi Semester

Tambahkan fitur:
- **Simpan sebagai template** — Simpan konfigurasi jadwal saat ini
- **Duplikasi ke semester baru** — Salin seluruh setup (plot, slot, jadwal) ke semester baru dengan 1 klik
- **Perbandingan semester** — Side-by-side view jadwal semester lalu vs. sekarang

---

### 14. Laporan PDF Profesional

Saat ini cetak menggunakan `window.print()` + CSS `@media print`. Pertimbangkan:
- Server-side PDF generation dengan **Puppeteer** atau **@react-pdf/renderer**
- Template PDF dengan header/footer resmi sekolah
- Watermark dan penomoran halaman otomatis
- Download langsung tanpa preview print browser

---

### 15. Automated Testing

Saat ini hanya ada `test-api.js` (manual script). Tambahkan:

| Jenis Test | Tools | Coverage Target |
|------------|-------|-----------------|
| Unit tests (backend) | **Vitest** | `validateJadwal`, break injection logic, import parser |
| Integration tests (API) | **Supertest** | Semua CRUD endpoints, auth flow |
| Component tests (frontend) | **React Testing Library** | Form validation, drag & drop |
| E2E tests | **Playwright** | Login → CRUD → Schedule → Print flow |

---

## 🏗️ Arsitektur Jangka Panjang

### 16. Migrasi ke Proper State Management

Jika fitur terus bertambah, React `useState` di App.jsx akan semakin tidak manageable. Opsi:

| Library | Kelebihan | Cocok Jika... |
|---------|-----------|---------------|
| **Zustand** | Ringan, simple API, no boilerplate | Ingin migrasi minimal dari useState |
| **TanStack Query** | Auto-caching, background refetch, optimistic updates built-in | Ingin menghapus manual fetch logic |
| **Jotai** | Atomic state, composable | Banyak state independen antar komponen |

**Rekomendasi:** **Zustand** + **TanStack Query** — Zustand untuk UI state, TanStack Query untuk server state. Ini akan menghilangkan ~60% kode di App.jsx.

---

### 17. API Versioning

Saat ini semua endpoint di `/api/*` tanpa versioning. Ketika breaking changes diperlukan:

```
/api/v1/jadwals  ← versi lama tetap berjalan
/api/v2/jadwals  ← versi baru dengan perubahan
```

---

### 18. Multi-Semester & Arsip Historis

Saat ini satu user hanya punya satu set jadwal aktif. Tambahkan konsep **"Periode Jadwal"**:

```prisma
model Period {
  id          Int      @id @default(autoincrement())
  name        String   // "Ganjil 2026/2027"
  is_active   Boolean  @default(true)
  user_id     Int
  jadwals     Jadwal[]
  plots       Plot[]
}
```

Ini memungkinkan:
- Menyimpan jadwal semester lalu sebagai arsip
- Membuat draft jadwal semester depan tanpa mengganggu yang aktif
- Perbandingan historis

---

## 📊 Ringkasan Prioritas

```
┌─────────────────────────────────────────────────────────┐
│  🔴 KRITIS (Lakukan Segera)                            │
│  ├── Refaktor App.jsx → custom hooks                    │
│  ├── Pisahkan routes.js → modular files                 │
│  └── Rate limiting & input sanitization                 │
├─────────────────────────────────────────────────────────┤
│  🟡 PENTING (Sprint Berikutnya)                         │
│  ├── Auto-scheduling engine                             │
│  ├── Undo/Redo system                                   │
│  ├── Dashboard analytics untuk user                     │
│  └── Notifikasi konflik visual yang lebih kaya          │
├─────────────────────────────────────────────────────────┤
│  🟢 NICE-TO-HAVE (Roadmap Q3-Q4)                       │
│  ├── PWA support                                        │
│  ├── Audit log & riwayat perubahan                      │
│  ├── Template & duplikasi semester                       │
│  ├── Server-side PDF generation                         │
│  ├── Automated testing suite                            │
│  └── Zustand + TanStack Query migration                 │
└─────────────────────────────────────────────────────────┘
```

---

> 💡 **Saran saya:** Mulai dari **Refaktor App.jsx** (poin 1) dan **Pisahkan routes.js** (poin 2). Ini adalah fondasi yang akan membuat semua pengembangan berikutnya 10x lebih mudah. Setelah itu, **Auto-Scheduling** (poin 4) adalah fitur dengan ROI tertinggi untuk pengalaman pengguna.
