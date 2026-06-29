# 📚 DEVELOPMENT GUIDE — Yusra Jadwal

> **Versi Dokumen:** 1.0  
> **Terakhir Diperbarui:** 29 Juni 2026  
> **Platform:** [yusrajadwal.anamf.my.id](https://yusrajadwal.anamf.my.id)  

Dokumen ini adalah panduan pengembangan komprehensif untuk aplikasi **Yusra Jadwal** — platform penjadwalan sekolah berbasis web dengan arsitektur multi-tenant SaaS. Ditujukan untuk semua developer yang terlibat dalam pengembangan, pemeliharaan, dan perluasan fitur aplikasi ini.

---

## Daftar Isi

1. [🌐 Project Overview & SaaS Architecture](#1--project-overview--saas-architecture)
2. [📁 Folder Structure & Modular Component Map](#2--folder-structure--modular-component-map)
3. [🗄️ Database Schema & Relationship Logic](#3--database-schema--relationship-logic)
4. [⏱️ Core Engine Logic](#4--core-engine-logic)
5. [⚡ Performance & Caching Strategies](#5--performance--caching-strategies)
6. [🔮 Future Development Guidelines](#6--future-development-guidelines)

---

## 1. 🌐 Project Overview & SaaS Architecture

### 1.1 Ringkasan Produk

**Yusra Jadwal** adalah platform penyusunan jadwal pelajaran sekolah yang beroperasi secara **semi-otomatis** dengan pendekatan **drag-and-drop** interaktif. Keunggulan utama platform ini adalah:

- **Early Warning System (Anti-Bentrok)** — Validasi real-time 5 lapis yang mencegah tabrakan jadwal guru dan kelas.
- **Multi-Tenant SaaS** — Setiap sekolah memiliki akun independen dengan data terisolasi (tenant isolation via `user_id`).
- **Dynamic Interleaved Breaks** — Sistem istirahat yang dapat dikustomisasi posisinya (setelah JP ke-berapa) tanpa mengganggu jumlah JP aktif.
- **Proktor Central Dashboard** — Panel admin Super Admin untuk mengelola seluruh tenant dari satu tempat.
- **Excel Mass Import** — Impor data master (Guru, Kelas, Mapel, Plotting) dari file Excel sekaligus dalam satu transaksi atomik.

### 1.2 Arsitektur Multi-Tenant

```
┌──────────────────────────────────────────────────────────────┐
│                     VERCEL DEPLOYMENT                        │
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────────────┐  │
│  │   Frontend (SPA)    │    │     Backend (Serverless)     │  │
│  │   Vite + React 19   │───▶│     Express.js + Node.js    │  │
│  │   TailwindCSS v4    │ /api│     Prisma ORM Client      │  │
│  │   Static Build      │    │     JWT Authentication      │  │
│  └─────────────────────┘    └──────────┬──────────────────┘  │
│                                        │                      │
└────────────────────────────────────────┼──────────────────────┘
                                         │ DATABASE_URL
                                         ▼
                              ┌─────────────────────┐
                              │   PostgreSQL         │
                              │   (Supabase Cloud)   │
                              │   + Prisma Migrate   │
                              └─────────────────────┘
```

**Alur Tenant Isolation:** Setiap record di database memiliki kolom `user_id` yang memastikan data antar sekolah tidak tercampur. Middleware `authMiddleware.js` mengekstrak `user_id` dari JWT token dan meng-inject-nya ke `req.user`, sehingga seluruh query Prisma di-filter berdasarkan `user_id` secara otomatis.

### 1.3 Tech Stack Overview

| Layer       | Teknologi                            | Versi        | Peran                                            |
|-------------|--------------------------------------|--------------|--------------------------------------------------|
| **Frontend** | React                               | `19.2.7`     | UI Library dengan Suspense & Lazy Loading        |
| **Frontend** | Vite                                | `8.1.0`      | Build tool dengan HMR & manual chunk splitting   |
| **Frontend** | TailwindCSS                         | `4.3.1`      | Utility-first CSS framework (via Vite plugin)    |
| **Frontend** | SheetJS (xlsx)                      | `0.18.5`     | Parsing file Excel di sisi client                |
| **Backend**  | Express.js                          | `4.19.2`     | HTTP server & REST API router                    |
| **Backend**  | Node.js                             | LTS          | Runtime JavaScript di sisi server                |
| **Backend**  | JSON Web Token                      | `9.0.2`      | Autentikasi stateless berbasis token             |
| **Backend**  | bcryptjs                            | `2.4.3`      | Hashing password pengguna                        |
| **Backend**  | compression                         | `1.8.1`      | HTTP response compression (gzip/brotli)          |
| **Database** | PostgreSQL                          | Cloud        | RDBMS utama (hosted di Supabase)                 |
| **Database** | Prisma ORM                          | `5.11.0`     | Type-safe ORM dengan migration system            |
| **Deploy**   | Vercel                              | v2           | Serverless deployment (static + functions)       |
| **Linting**  | OxLint                              | `1.69.0`     | Linter modern ultra-cepat berbasis Rust           |

### 1.4 Deployment Architecture (Vercel)

File konfigurasi `vercel.json` mendefinisikan dua build target:

```json
{
  "version": 2,
  "builds": [
    { "src": "client/package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } },
    { "src": "server/index.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "server/index.js" },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "client/$1" }
  ]
}
```

- **Client**: Di-build menjadi static assets oleh Vite, disajikan dari folder `dist/`.
- **Server**: Berjalan sebagai Vercel Serverless Function, meng-handle semua request ke `/api/*`.
- **Routing**: Request `/api/*` diarahkan ke backend, sisanya ke frontend SPA.

---

## 2. 📁 Folder Structure & Modular Component Map

### 2.1 Root Directory

```
jadwal/
├── client/                         # Frontend React Application
│   ├── public/                     # Static assets (favicon, og-image)
│   ├── src/                        # Source code
│   │   ├── components/             # Modular lazy-loaded tab components
│   │   │   ├── AuthPage.jsx        # Halaman login & registrasi
│   │   │   ├── JadwalBoard.jsx     # Papan penyusunan jadwal (drag & drop)
│   │   │   ├── MasterDataTab.jsx   # Panel CRUD data master
│   │   │   ├── RekapTab.jsx        # Cetak & rekap jadwal (per kelas/guru)
│   │   │   ├── ProfilTab.jsx       # Konfigurasi profil sekolah
│   │   │   ├── PanduanTab.jsx      # Panduan pengguna interaktif
│   │   │   └── ProktorDashboard.jsx# Dashboard Super Admin (Proktor)
│   │   ├── App.jsx                 # Main orchestrator (~1564 baris)
│   │   ├── App.css                 # CSS tambahan minimal
│   │   ├── index.css               # Global base styles
│   │   └── main.jsx                # React entry point (ReactDOM.render)
│   ├── index.html                  # HTML template + SEO meta tags
│   ├── vite.config.js              # Vite build configuration
│   └── package.json                # Frontend dependencies
│
├── server/                         # Backend Express.js Application
│   ├── prisma/                     # Prisma ORM
│   │   ├── schema.prisma           # Database schema definition
│   │   ├── seed.js                 # Default slot seeder
│   │   └── migrations/             # Prisma migration history
│   ├── index.js                    # Express app entry point
│   ├── routes.js                   # Seluruh API routes (~1681 baris)
│   ├── proktorRoutes.js            # Routes khusus Proktor (Super Admin)
│   ├── authMiddleware.js           # JWT verification + status check
│   ├── envFix.js                   # Environment variable helper
│   ├── package.json                # Backend dependencies
│   └── .env                        # Environment variables (DATABASE_URL, JWT_SECRET)
│
├── vercel.json                     # Vercel deployment configuration
├── prd.md                          # Product Requirement Document (Fase 1)
└── DEVELOPMENT_GUIDE.md            # 📌 Dokumen ini
```

### 2.2 App.jsx — Main Orchestrator

`App.jsx` adalah **komponen pusat** yang mengorkestrasi seluruh state management dan business logic di sisi frontend. File ini bertanggung jawab atas:

| Tanggung Jawab                      | Detail                                                                            |
|--------------------------------------|-----------------------------------------------------------------------------------|
| **State Management**                 | Mengelola ~30+ state variables untuk auth, data master, navigasi, form, dan UI.  |
| **Authentication Flow**             | Login/register, JWT token management via `localStorage`, auto-logout on 401.     |
| **Data Fetching (`fetchData`)**     | Parallel fetch 9 endpoint via `Promise.all` saat login berhasil.                 |
| **Authenticated Fetch (`apiFetch`)** | Wrapper `fetch()` dengan auto-inject Bearer token dan handling 401/403.          |
| **Drag & Drop Engine**              | `handleDragStart`, `handleDragOver`, `handleDrop` — termasuk optimistic updates. |
| **CRUD Operations**                 | `saveGuru`, `deleteGuru`, `saveKelas`, `savePlot`, dll — dengan optimistic UI.   |
| **Tab Navigation**                  | State `activeTab` mengontrol rendering komponen lazily via `React.Suspense`.     |
| **Computed Data**                   | `slotsByDay`, `activeClassPlots`, `getSisaJam`, `activeClassGurus`.              |
| **Toast Notification**              | Sistem notifikasi ephemeral (auto-dismiss 4.5 detik).                            |

### 2.3 Modular Component Map (Lazy-Loaded Tabs)

Seluruh tab utama di-lazy-load menggunakan `React.lazy()` untuk **code splitting** otomatis:

```jsx
const AuthPage      = React.lazy(() => import('./components/AuthPage'));
const JadwalBoard   = React.lazy(() => import('./components/JadwalBoard'));
const MasterDataTab = React.lazy(() => import('./components/MasterDataTab'));
const RekapTab      = React.lazy(() => import('./components/RekapTab'));
const ProfilTab     = React.lazy(() => import('./components/ProfilTab'));
const PanduanTab    = React.lazy(() => import('./components/PanduanTab'));
```

> ⚠️ **Pengecualian:** `ProktorDashboard` di-import secara **eager** karena Super Admin langsung diarahkan ke komponen ini tanpa melalui tab navigation.

| Komponen               | File                     | Ukuran    | Tanggung Jawab                                                        |
|------------------------|--------------------------|-----------|-----------------------------------------------------------------------|
| **AuthPage**           | `AuthPage.jsx`           | ~8 KB     | Form login/registrasi sekolah, toggle mode, validasi input.          |
| **JadwalBoard**        | `JadwalBoard.jsx`        | ~20 KB    | Grid interaktif jadwal (Hari × Jam), sidebar plot, drag & drop.      |
| **MasterDataTab**      | `MasterDataTab.jsx`      | ~47 KB    | CRUD panel Guru, Kelas, Mapel, Slot, Plot, Time Settings, Import.    |
| **RekapTab**           | `RekapTab.jsx`           | ~35 KB    | Rekap per Kelas & per Guru, print-ready layout, tanda tangan.       |
| **ProfilTab**          | `ProfilTab.jsx`          | ~8 KB     | Form profil sekolah (nama, kepala sekolah, logo, tahun ajaran).      |
| **PanduanTab**         | `PanduanTab.jsx`         | ~14 KB    | Panduan pengguna interaktif, FAQ, tutorial langkah demi langkah.     |
| **ProktorDashboard**   | `ProktorDashboard.jsx`   | ~19 KB    | Dashboard admin global, user management, broadcast, freeze akun.     |

### 2.4 Rendering Hierarchy

```
App.jsx (Orchestrator)
│
├── [!token] ─────▶ <AuthPage />             # Halaman login/register
│
├── [SUSPENDED] ──▶ Suspended Screen          # Tampilan akun ditangguhkan
│
├── [SUPER_ADMIN] ▶ <ProktorDashboard />      # Dashboard Proktor (eager load)
│
└── [USER + ACTIVE] ─────────────────────────
    ├── Header + Tab Navigation
    │   ├── [profil]  ── <ProfilTab />
    │   ├── [master]  ── <MasterDataTab />
    │   ├── [jadwal]  ── <JadwalBoard />
    │   ├── [rekap]   ── <RekapTab />
    │   └── [panduan] ── <PanduanTab />
    └── Footer
```

---

## 3. 🗄️ Database Schema & Relationship Logic

### 3.1 Entity Relationship Diagram (ERD)

```
                              ┌──────────────────────┐
                              │        User           │
                              │ (Multi-Tenant Root)   │
                              ├──────────────────────┤
                              │ id (PK)              │
                              │ email (UNIQUE)       │
                              │ password (hashed)    │
                              │ nama_sekolah         │
                              │ role (USER|SUPER_ADMIN)│
                              │ status (ACTIVE|SUSPENDED)│
                              │ createdAt            │
                              └──────┬───────────────┘
                                     │ 1:N (user_id FK)
         ┌───────────┬───────────┬───┼───────┬────────────┬──────────────┬──────────────┐
         ▼           ▼           ▼   ▼       ▼            ▼              ▼              ▼
   ┌──────────┐ ┌──────────┐ ┌──────┐ ┌──────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐
   │   Guru   │ │  Kelas   │ │Mapel │ │ Slot │ │ SchoolProfile│ │  TimeSetting  │ │Announcement│
   ├──────────┤ ├──────────┤ ├──────┤ ├──────┤ ├──────────────┤ ├──────────────┤ │ (Global)   │
   │id (PK)   │ │id (PK)   │ │id(PK)│ │id(PK)│ │id (PK)       │ │id (PK)       │ ├────────────┤
   │nama_guru │ │nama_kelas│ │nama  │ │hari  │ │nama_sekolah  │ │active_days   │ │text        │
   │nip       │ │user_id   │ │kode  │ │jam_ke│ │kepala_sekolah│ │total_jp      │ │createdAt   │
   │user_id   │ │          │ │user_id││jam_*  │ │penyusun_jadwal││breaks (JSON)│ └────────────┘
   └────┬─────┘ └────┬─────┘ └──┬───┘ │is_ist│ │semester      │ │user_id (1:1) │
        │            │          │     │keter │ │tahun_ajaran  │ └──────────────┘
        │            │          │     │user_id│ │logo_url      │
        │            │          │     └──┬───┘ │user_id       │
        │            │          │        │     └──────────────┘
        │  M:N       │ 1:N     │ 1:N    │ 1:N
        ▼            ▼         ▼        ▼
   ┌─────────────────────────────────────────────┐
   │                   Plot                       │
   │          (Tabel Jembatan Tugas Mengajar)     │
   ├─────────────────────────────────────────────┤
   │ id (PK)                                      │
   │ mapel_id (FK → Mapel) ─── ON DELETE CASCADE   │
   │ kelas_id (FK → Kelas) ─── ON DELETE CASCADE   │
   │ beban_jam (Integer) ─── Kuota JP per semester │
   │ gurus[] (M:N Relation) ── Bisa > 1 guru       │
   │ user_id (FK → User)                           │
   └────────────────────┬────────────────────────┘
                        │ 1:N
                        ▼
             ┌─────────────────────┐
             │       Jadwal        │         ┌───────────────────┐
             │ (Hasil Penempatan)  │         │    BlockedSlot    │
             ├─────────────────────┤         ├───────────────────┤
             │ id (PK)             │         │ id (PK)           │
             │ slot_id (FK → Slot) │         │ label             │
             │ plot_id (FK → Plot) │         │ user_id (FK)      │
             │ user_id (FK → User) │         │ kelas_id (FK)     │
             └─────────────────────┘         │ slot_id (FK)      │
                                             │ @@unique(kelas,slot)│
                                             └───────────────────┘
```

### 3.2 Detail Model

#### `User` — Tabel Induk Multi-Tenant
```prisma
model User {
  id             Int             @id @default(autoincrement())
  email          String          @unique
  password       String                          // bcrypt hash
  nama_sekolah   String
  role           String          @default("USER") // "USER" | "SUPER_ADMIN"
  status         String          @default("ACTIVE") // "ACTIVE" | "SUSPENDED"
  createdAt      DateTime        @default(now())
  // ... relasi ke semua child models
  @@map("users")
}
```
> **Peran:** Setiap `User` mewakili **satu sekolah** (tenant). Kolom `role` membedakan pengguna biasa dan Super Admin (Proktor). Kolom `status` digunakan untuk menangguhkan (freeze) akun sekolah.

#### `SchoolProfile` — Identitas Sekolah
```prisma
model SchoolProfile {
  id                   Int     @id @default(autoincrement())
  nama_sekolah         String
  nama_kepala_sekolah  String
  nip_kepala_sekolah   String?
  nama_penyusun_jadwal String
  nip_penyusun_jadwal  String?
  semester             String        // "Ganjil" | "Genap"
  tahun_ajaran         String        // e.g. "2026/2027"
  tanggal_berlaku      String?
  tanggal_cetak        String?
  logo_url             String?       // Base64 encoded
  user_id              Int
  @@map("school_profiles")
}
```
> **Peran:** Menyimpan informasi identitas resmi sekolah yang digunakan pada halaman cetak/rekap. Otomatis dibuat saat registrasi dengan data placeholder.

#### `Guru`, `Kelas`, `Mapel` — Master Data Inti
Tiga model utama yang menyimpan data dasar:

| Model    | Kolom Utama                    | Constraint Unik                      |
|----------|--------------------------------|---------------------------------------|
| `Guru`   | `nama_guru`, `nip` (opsional) | — (nama boleh duplikat antar tenant) |
| `Kelas`  | `nama_kelas`                   | `@@unique([user_id, nama_kelas])`     |
| `Mapel`  | `nama_mapel`, `kode_mapel`     | `@@unique([user_id, nama_mapel])`     |

> Semua data master ter-isolasi lewat `user_id` dan di-cascade delete ketika User dihapus.

#### `Slot` — Master Waktu & Istirahat
```prisma
model Slot {
  id           Int      @id @default(autoincrement())
  hari         String           // 'Senin' s/d 'Sabtu'
  jam_ke       Int?             // NULL jika istirahat
  jam_mulai    String           // Format "HH:MM"
  jam_selesai  String           // Format "HH:MM"
  is_istirahat Boolean  @default(false)
  keterangan   String?          // 'Pelajaran' | 'Istirahat Pagi/Siang/Sore'
  user_id      Int
  @@index([user_id])
  @@index([user_id, hari])      // Composite index untuk lookup per hari
  @@map("slots")
}
```
> **Peran:** Menyimpan template jam pelajaran per hari termasuk slot istirahat. Saat user baru mendaftar, sistem otomatis men-seed **94 slot default** (17 slot × 5 hari + 9 slot Sabtu) menggunakan fungsi `seedDefaultSlots()` di `seed.js`.

#### `TimeSetting` — Konfigurasi Waktu Dinamis
```prisma
model TimeSetting {
  id          Int      @id @default(autoincrement())
  user_id     Int      @unique       // 1:1 relation dengan User
  active_days Json                   // Array hari aktif, e.g. ["Senin","Selasa",...]
  total_jp    Int                    // Total JP aktif per hari, e.g. 10
  breaks      Json                   // Konfigurasi posisi istirahat
  @@map("time_settings")
}
```
> **Peran:** Mengontrol berapa JP aktif dan di mana istirahat disisipkan. Format `breaks`:
> ```json
> [
>   { "id": 1, "after_jp": 5, "label": "ISTIRAHAT PAGI" },
>   { "id": 2, "after_jp": 8, "label": "ISTIRAHAT SIANG" },
>   { "id": 3, "after_jp": 0, "label": "ISTIRAHAT SORE" }
> ]
> ```
> `after_jp: 0` berarti istirahat tersebut dinonaktifkan.

#### `Plot` — Pembagian Tugas Mengajar
```prisma
model Plot {
  id        Int      @id @default(autoincrement())
  mapel_id  Int           // FK → Mapel
  kelas_id  Int           // FK → Kelas
  beban_jam Int           // Kuota JP per semester (e.g. 3)
  gurus     Guru[]  @relation("GuruPlots")  // M:N — mendukung team teaching
  user_id   Int
  @@index([kelas_id, mapel_id])   // Composite index untuk lookup cepat
  @@map("plots")
}
```
> **Peran:** Tabel jembatan yang menentukan **"siapa mengajar apa, di kelas mana, berapa jam"**. Relasi `gurus` bersifat **Many-to-Many** untuk mendukung team teaching (satu plot bisa diajar oleh > 1 guru).

#### `Jadwal` — Hasil Penempatan
```prisma
model Jadwal {
  id      Int  @id @default(autoincrement())
  slot_id Int       // FK → Slot (kapan)
  plot_id Int       // FK → Plot (siapa mengajar apa di mana)
  user_id Int
  @@index([user_id])
  @@index([slot_id])
  @@index([plot_id])
  @@index([user_id, slot_id])   // Composite index krusial
  @@map("jadwals")
}
```
> **Peran:** Tabel utama yang menyimpan penempatan jadwal final. Setiap baris merepresentasikan **satu slot waktu yang diisi oleh satu plot mengajar**.

#### `BlockedSlot` — Slot Terkunci per Kelas
```prisma
model BlockedSlot {
  id       Int    @id @default(autoincrement())
  label    String           // Label aktivitas, e.g. "Upacara", "Sholat Dhuha"
  user_id  Int
  kelas_id Int
  slot_id  Int
  @@unique([kelas_id, slot_id])           // Satu kelas hanya bisa blokir 1x per slot
  @@index([user_id, slot_id, kelas_id])   // Composite index 3 kolom
  @@map("blocked_slots")
}
```
> **Peran:** Memungkinkan admin mengunci slot tertentu untuk kelas tertentu (misalnya upacara, sholat Dhuha) agar tidak bisa diisi jadwal pelajaran.

#### `Announcement` — Pengumuman Global
```prisma
model Announcement {
  id        Int      @id @default(autoincrement())
  text      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@map("announcements")
}
```
> **Peran:** Dikelola oleh Proktor (Super Admin) untuk broadcast pesan ke semua tenant. Tanpa relasi `user_id` — bersifat global.

### 3.3 Relasi Kunci: Slot → Plot → Jadwal

```
Slot (KAPAN?)          Plot (SIAPA-APA-DI MANA?)          Jadwal (HASIL)
┌──────────────┐       ┌─────────────────────────┐       ┌──────────────────┐
│ Senin, JP 3  │       │ Guru: Bu Ani            │       │ slot_id: 15      │
│ 08:10-08:45  │──────▶│ Mapel: Matematika       │──────▶│ plot_id: 7       │
│              │       │ Kelas: 7-A              │       │ (Senin JP3 = MTK │
│              │       │ Beban: 4 JP/minggu      │       │  7-A oleh Bu Ani)│
└──────────────┘       └─────────────────────────┘       └──────────────────┘
```

Satu **Jadwal** = "Plot ini ditaruh di Slot ini". Validasi memastikan:
1. Satu slot tidak boleh diisi oleh guru yang sudah mengajar di slot yang sama di kelas lain (**guru bentrok**).
2. Satu kelas tidak boleh memiliki dua jadwal di slot yang sama (**kelas bentrok**).
3. Jumlah Jadwal untuk satu Plot tidak boleh melebihi `beban_jam` (**kuota habis**).

### 3.4 Composite Indexes — Optimasi Performa

| Model          | Index                             | Tujuan                                                         |
|----------------|-----------------------------------|----------------------------------------------------------------|
| `Slot`         | `[user_id, hari]`                 | Mempercepat query `GET /api/slots` yang filter per hari.       |
| `Plot`         | `[kelas_id, mapel_id]`            | Mempercepat lookup plot duplikat saat insert/import.           |
| `Jadwal`       | `[user_id, slot_id]`              | **Index krusial** untuk validasi bentrok — query terberat.     |
| `Jadwal`       | `[slot_id]`, `[plot_id]`          | Single-column indexes untuk JOIN dan cascade operations.       |
| `BlockedSlot`  | `[user_id, slot_id, kelas_id]`    | Mempercepat validasi blocked slot saat penempatan jadwal.      |
| `Kelas`        | `[user_id, nama_kelas]` (UNIQUE)  | Mencegah duplikasi nama kelas dalam satu tenant.               |
| `Mapel`        | `[user_id, nama_mapel]` (UNIQUE)  | Mencegah duplikasi nama mapel dalam satu tenant.               |

---

## 4. ⏱️ Core Engine Logic

### 4.1 Scheduling & Conflict Detection (`validateJadwal`)

Fungsi `validateJadwal()` di `server/routes.js` (baris 754-856) adalah **jantung logika penjadwalan**. Fungsi ini menjalankan **5 validasi paralel** menggunakan `Promise.all` untuk kecepatan maksimal.

#### Alur Validasi (2-Phase Parallel)

```
PHASE 1: Fetch Data (Promise.all)
├── 🔍 prisma.slot.findFirst()   → Ambil data slot target
└── 🔍 prisma.plot.findFirst()   → Ambil data plot + guru + kelas + mapel

     ⬇️ Validasi #1: Slot Istirahat (Instant Check)

PHASE 2: Conflict Detection (Promise.all)
├── 🔍 prisma.jadwal.findFirst() → Cek guru bentrok (teacher clash)
├── 🔍 prisma.jadwal.findFirst() → Cek kelas bentrok (class clash)
├── 🔍 prisma.jadwal.count()     → Hitung kuota beban jam
└── 🔍 prisma.blockedSlot.findFirst() → Cek slot terkunci

     ⬇️ Evaluasi Hasil: Return { valid: true } atau { valid: false, message }
```

#### Kode Inti Validasi

```javascript
async function validateJadwal(prismaClient, userId, slot_id, plot_id, excludeJadwalId = null) {
  // PHASE 1: Fetch slot & plot secara paralel
  const [slot, plot] = await Promise.all([
    prismaClient.slot.findFirst({ where: { id: slot_id, user_id: userId } }),
    prismaClient.plot.findFirst({
      where: { id: plot_id, user_id: userId },
      include: { gurus: true, kelas: true, mapel: true }
    })
  ]);

  // Validasi #1: Cek Slot Istirahat
  if (slot.is_istirahat) {
    return { valid: false, status: 422, message: 'Tidak dapat menempatkan pelajaran pada jam istirahat!' };
  }

  // PHASE 2: 4 query paralel sekaligus
  const plotGuruIds = plot.gurus.map(g => g.id);
  const [teacherClash, classClash, currentCount, blockedSlot] = await Promise.all([
    // #2: Guru Bentrok — apakah ada guru yang sama di slot yang sama?
    prismaClient.jadwal.findFirst({
      where: {
        user_id: userId, slot_id: slot_id,
        plot: { gurus: { some: { id: { in: plotGuruIds } } } },
        NOT: excludeJadwalId ? { id: excludeJadwalId } : undefined
      },
      include: { plot: { include: { gurus: true } } }
    }),
    // #3: Kelas Bentrok — apakah kelas sudah terisi di slot yang sama?
    prismaClient.jadwal.findFirst({
      where: {
        user_id: userId, slot_id: slot_id,
        plot: { kelas_id: plot.kelas_id },
        NOT: excludeJadwalId ? { id: excludeJadwalId } : undefined
      }
    }),
    // #4: Kuota Beban Jam — apakah kuota JP sudah habis?
    prismaClient.jadwal.count({
      where: {
        user_id: userId, plot_id: plot_id,
        NOT: excludeJadwalId ? { id: excludeJadwalId } : undefined
      }
    }),
    // #5: Blocked Slot — apakah slot dikunci untuk kelas ini?
    prismaClient.blockedSlot.findFirst({
      where: { user_id: userId, slot_id: slot_id, kelas_id: plot.kelas_id }
    })
  ]);

  // Evaluasi hasil
  if (teacherClash) return { valid: false, message: `Guru ${...} sudah mengajar di kelas lain!` };
  if (classClash)   return { valid: false, message: 'Kelas ini sudah memiliki jadwal lain!' };
  if (currentCount >= plot.beban_jam) return { valid: false, message: 'Jatah jam mengajar habis!' };
  if (blockedSlot)  return { valid: false, message: 'Slot waktu ini sedang diblokir!' };

  return { valid: true };
}
```

#### Dual-Layer Validation (Client + Server)

Validasi berjalan di **dua layer** untuk UX optimal:

| Layer     | Lokasi                  | Kecepatan      | Tujuan                                           |
|-----------|-------------------------|----------------|--------------------------------------------------|
| **Client** | `App.jsx` `handleDrop` | Instan (~0ms) | Feedback visual langsung, mencegah request sia-sia |
| **Server** | `validateJadwal()`     | ~50-100ms      | Source of truth, mencegah race condition           |

Client melakukan validasi identik menggunakan data dari state React (tanpa network call), lalu server memvalidasi ulang saat request masuk. Jika server menolak, **optimistic update di-revert** otomatis.

---

### 4.2 Dynamic Interleaved Breaks

Endpoint `GET /api/slots` (baris 437-536 di `routes.js`) tidak hanya mengembalikan data slot mentah dari database — ia **menyusun ulang** urutan slot secara programatis berdasarkan konfigurasi `TimeSetting`.

#### Konsep

```
Database (slot mentah):                    Response (slot tersusun):
┌────────────────────────┐                ┌────────────────────────┐
│ JP1, JP2, JP3, JP4,    │    ┌──────┐    │ JP1, JP2, JP3, JP4, JP5│
│ JP5, JP6, JP7, JP8,    │───▶│Engine│───▶│ 🟡 ISTIRAHAT PAGI     │
│ JP9, JP10, JP11, JP12, │    └──────┘    │ JP6, JP7, JP8          │
│ JP13, JP14             │                │ 🟢 ISTIRAHAT SIANG    │
│ ──────────────────── ─ │                │ JP9, JP10              │
│ IST_PAGI, IST_SIANG,   │                └────────────────────────┘
│ IST_SORE               │                total_jp=10, breaks=[5,8]
└────────────────────────┘
```

#### Alur Logika

```javascript
router.get('/slots', asyncHandler(async (req, res) => {
  // 1. Fetch TimeSetting dan semua Slot secara paralel
  const [setting, slots] = await Promise.all([
    prisma.timeSetting.findUnique({ where: { user_id: req.user.id } }),
    prisma.slot.findMany({ where: { user_id: req.user.id }, orderBy: [{ id: 'asc' }] })
  ]);

  const total_jp = setting ? setting.total_jp : 10;
  const configBreaks = /* normalize breaks config */;

  let filteredSlots = [];

  // 2. Proses hari per hari
  for (const day of active_days) {
    const daySlots = slots.filter(s => s.hari === day);
    const dbLessons = daySlots.filter(s => !s.is_istirahat && s.jam_ke !== null)
                              .sort((a, b) => a.jam_ke - b.jam_ke);
    const dbBreaks = daySlots.filter(s => s.is_istirahat);

    // 3. Ambil hanya JP aktif sesuai total_jp
    const activeLessons = dbLessons.slice(0, total_jp);

    // 4. Iterasi setiap JP, sisipkan istirahat di posisi yang tepat
    for (let i = 0; i < activeLessons.length; i++) {
      filteredSlots.push(activeLessons[i]);          // Push JP

      const currentJp = activeLessons[i].jam_ke;
      // Cari apakah ada break yang dikonfigurasi SETELAH JP ini
      const matchedBreaks = configBreaks.filter(b => b.after_jp === currentJp);

      for (const breakConf of matchedBreaks) {
        // Cocokkan dengan slot istirahat DB berdasarkan label (pagi/siang/sore)
        const dbBreak = /* match by label keyword */;
        filteredSlots.push(dbBreak || syntheticBreak);  // Push istirahat
      }
    }
  }

  res.json(filteredSlots);
}));
```

#### Poin-Poin Kunci

1. **`total_jp` mengontrol jumlah JP aktif** — Jika `total_jp = 10`, maka hanya 10 slot pelajaran pertama yang digunakan, sisanya diabaikan.
2. **`after_jp` menentukan posisi istirahat** — `after_jp: 5` artinya istirahat disisipkan tepat setelah JP ke-5.
3. **`after_jp: 0` menonaktifkan istirahat** — Istirahat dengan `after_jp = 0` tidak akan disisipkan.
4. **Break matching by label** — Slot istirahat dari DB dicocokkan berdasarkan keyword label (`pagi`, `siang`, `sore`), dengan fallback ke index.
5. **Synthetic breaks** — Jika slot istirahat tidak ditemukan di DB, sistem membuat objek istirahat sintetis dengan ID unik.
6. **Tidak memengaruhi jumlah JP aktif** — Istirahat hanyalah "sisipan" di antara slot pelajaran, bukan pengganti.

---

### 4.3 Excel Batch Import (`POST /api/import-master`)

Endpoint `POST /api/import-master` (baris 1246-1557) memproses data master dari file Excel yang sudah diparsing di sisi client menggunakan library **SheetJS (xlsx)**.

#### Alur Transaksi

```
┌─────────────────────────────────────────────────────────────────┐
│                  prisma.$transaction(async (tx) => { ... })      │
│                                                                  │
│  1. 📋 PROFIL SEKOLAH                                           │
│     ├── Cek existing profile (findFirst)                         │
│     └── Upsert (create/update)                                   │
│                                                                  │
│  2. 👨‍🏫 DATA GURU                                                │
│     ├── Fetch existing gurus → build Map<namaLower, id>          │
│     └── Loop: create baru / update NIP jika sudah ada            │
│                                                                  │
│  3. 🏫 DATA KELAS                                                │
│     ├── Fetch existing kelas → build Map<namaLower, id>          │
│     └── Loop: create baru / skip jika sudah ada                  │
│                                                                  │
│  4. 📚 DATA MATA PELAJARAN                                       │
│     ├── Fetch existing mapels → build Map<namaLower, id>         │
│     └── Loop: create baru / update kode jika sudah ada           │
│                                                                  │
│  5. 📊 PLOTTING BEBAN MENGAJAR                                   │
│     ├── Lookup kelas_id, mapel_id, guru_ids dari Maps            │
│     ├── Cari plot duplikat (same guru+mapel+kelas)               │
│     └── Create baru / update beban_jam jika sudah ada            │
│                                                                  │
│  Return: { profilCount, guruCount, kelasCount, mapelCount, ... } │
│                                                                  │
│  Transaction Config: { maxWait: 120s, timeout: 120s }            │
└─────────────────────────────────────────────────────────────────┘
```

#### Fitur Cerdas pada Import

| Fitur                           | Detail                                                                |
|--------------------------------|-----------------------------------------------------------------------|
| **Case-Insensitive Matching**  | Semua lookup nama menggunakan `.toLowerCase().trim()`.               |
| **Flexible Column Headers**    | Fungsi `getVal()` mencari kolom dengan multiple alias header.        |
| **Upsert Logic**               | Data yang sudah ada di-update (bukan duplikasi), data baru di-create. |
| **Multi-Guru Delimiter**       | Mendukung pemisah `;`, `/`, `+`, `,` untuk team teaching.           |
| **Cross-Sheet Validation**     | Plot memvalidasi bahwa guru/kelas/mapel yang direferensikan ada.     |
| **Atomic Transaction**         | Menggunakan `prisma.$transaction()` — gagal satu, rollback semua.   |
| **Long Timeout**               | `maxWait: 120000ms` untuk menangani import data besar.               |

#### Contoh Parsing Multi-Guru

```javascript
// Input: "Pak Ahmad; Bu Siti" atau "Pak Ahmad / Bu Siti"
const findGuruIds = (rawStr) => {
  const delimiters = [';', '/', '+'];
  for (const delim of delimiters) {
    if (rawStr.includes(delim)) {
      const parts = rawStr.split(delim).map(p => p.trim());
      // Lookup setiap nama guru di guruMap
      return parts.map(name => guruMap.get(name.toLowerCase()));
    }
  }
};
```

---

## 5. ⚡ Performance & Caching Strategies

### 5.1 HTTP Compression Middleware

Backend menggunakan middleware `compression` dari npm yang secara otomatis mengompresi response body:

```javascript
// server/index.js
import compression from 'compression';
app.use(compression());
```

- **Algoritma:** gzip (default), dengan fallback ke deflate.
- **Threshold:** Minimum 1KB response body (default library).
- **Dampak:** Mengurangi ukuran transfer JSON response hingga **60-80%**, terutama untuk response besar seperti daftar jadwal dan slot.

### 5.2 HTTP Cache-Control Strategy

Strategi caching diterapkan dengan pendekatan **"no cache for dynamic data"** — data yang sering berubah (master data, jadwal) selalu fresh:

```javascript
// Diterapkan di seluruh GET endpoint data dinamis
res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
```

| Endpoint                | Cache Strategy                        | Alasan                                            |
|------------------------|---------------------------------------|---------------------------------------------------|
| `GET /api/gurus`       | `no-store, no-cache, must-revalidate` | Data bisa berubah setiap saat via CRUD.           |
| `GET /api/kelas`       | `no-store, no-cache, must-revalidate` | Data bisa berubah setiap saat via CRUD.           |
| `GET /api/mapels`      | `no-store, no-cache, must-revalidate` | Data bisa berubah setiap saat via CRUD.           |
| `GET /api/slots`       | `no-store, no-cache, must-revalidate` | Dihitung ulang secara dinamis dari TimeSetting.   |
| `GET /api/school-profile` | `no-store, no-cache, must-revalidate` | Profile bisa berubah kapan saja.              |
| `GET /api/time-settings` | `no-store, no-cache, must-revalidate` | Mengontrol rendering grid jadwal.              |
| Static assets (Vite)   | Long-term cache (Vercel default)      | File di-hash, aman untuk cache jangka panjang.    |

> **Catatan:** Static assets yang di-build oleh Vite sudah di-hash filename-nya (e.g. `index-A1b2C3.js`), sehingga secara otomatis mendapat **immutable cache** dari Vercel CDN tanpa konfigurasi tambahan.

### 5.3 Vite Manual Chunk Splitting

Konfigurasi `vite.config.js` memisahkan vendor libraries ke chunk terpisah:

```javascript
// client/vite.config.js
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'; // ~140KB — cached independently
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 200, // Warning jika chunk > 200KB
  },
});
```

#### Strategi Splitting

| Chunk              | Konten                                | Alasan                                            |
|--------------------|-----------------------------------------|---------------------------------------------------|
| `vendor-react`     | `react` + `react-dom`                  | Vendor stabil, jarang berubah → long-term cache.  |
| Per-komponen lazy  | `AuthPage`, `JadwalBoard`, dll.         | Auto-split oleh `React.lazy()` + dynamic import.  |
| Main bundle        | `App.jsx` + utilities                  | Kode aplikasi utama, berubah paling sering.       |

#### Dampak Lazy Loading

```
Tanpa Lazy Loading:          Dengan Lazy Loading:
┌────────────────────┐       ┌────────────────────┐
│   main.js (350KB)  │       │   main.js (120KB)  │  ← Initial load
│   (semua komponen) │       ├────────────────────┤
└────────────────────┘       │ AuthPage.js (8KB)  │  ← On demand
                             │ JadwalBoard.js(20KB)│  ← On demand
                             │ MasterData.js(47KB)│  ← On demand
                             │ RekapTab.js (35KB) │  ← On demand
                             │ ProfilTab.js (8KB) │  ← On demand
                             │ PanduanTab.js(14KB)│  ← On demand
                             │ vendor-react(140KB)│  ← Cached long-term
                             └────────────────────┘
```

### 5.4 Optimistic Updates

Frontend menggunakan **optimistic updates** untuk pengalaman pengguna yang responsif:

```
User Action          Client (Instant)         Server (Background)
────────────────     ──────────────────       ─────────────────────
Drop jadwal      ──▶ Update state lokal   ──▶  POST /api/jadwals
                     Toast "Berhasil!"         ├── 200 OK → Sync data
                                               └── 422 Error → Revert state
                                                    Toast "Ditolak"
```

Pola ini digunakan di `handleDrop`, `handleDeleteJadwal`, `savePlot`, dan operasi CRUD lainnya.

### 5.5 Parallel Data Fetching

Fungsi `fetchData()` di `App.jsx` memuat seluruh data awal secara paralel:

```javascript
const fetchData = async () => {
  const responses = await Promise.all([
    apiFetch(`${API_BASE}/gurus`),       // 1
    apiFetch(`${API_BASE}/kelas`),       // 2
    apiFetch(`${API_BASE}/mapels`),      // 3
    apiFetch(`${API_BASE}/slots`),       // 4
    apiFetch(`${API_BASE}/plots`),       // 5
    apiFetch(`${API_BASE}/jadwals`),     // 6
    apiFetch(`${API_BASE}/school-profile`), // 7
    apiFetch(`${API_BASE}/blocked-slots`), // 8
    apiFetch(`${API_BASE}/time-settings`), // 9
  ]);
  // Parse semua response secara paralel
  const [g, k, m, s, p, j, sp, bs, ts] = await Promise.all(
    responses.map(r => r.json())
  );
};
```

> Dibandingkan sequential fetching, ini memangkas waktu initial load hingga **~70%** (9 request paralel vs. 9 request berurutan).

---

## 6. 🔮 Future Development Guidelines

### 6.1 Menambah State Variable Baru

⚠️ **Jangan menambah state ke `App.jsx` tanpa pertimbangan matang.**

`App.jsx` saat ini sudah memiliki ~30+ state variables. Sebelum menambahkan state baru, tanyakan:

| Pertanyaan                                      | Jika Ya                                                    |
|-------------------------------------------------|-------------------------------------------------------------|
| Apakah state ini hanya dibutuhkan oleh 1 tab?   | Pindahkan ke komponen tab bersangkutan (lokal state).       |
| Apakah state ini perlu diakses lintas tab?       | Boleh di `App.jsx`, tapi pertimbangkan Context/Zustand.     |
| Apakah state ini bisa diderivasi dari state lain? | Gunakan `useMemo` atau computed variable, bukan state baru. |
| Apakah state ini form input?                     | Kelola secara lokal di komponen form itu sendiri.           |

**Aturan:**
1. **Lokal dulu.** State baru harus dimulai dari komponen yang menggunakannya. Hanya "naikkan" (lift state up) jika terbukti diperlukan oleh sibling atau parent.
2. **Jangan duplikasi.** Jangan simpan data yang bisa dihitung dari state lain (e.g. `sisaJam` bisa dihitung dari `jadwals` + `plot.beban_jam`).
3. **Dokumentasikan.** Setiap state yang ditambahkan ke `App.jsx` harus memiliki komentar yang menjelaskan tujuannya.

### 6.2 Menambah Endpoint API Baru

Ikuti pola yang sudah ada di `routes.js`:

```javascript
// ==========================================
// [NOMOR]. [NAMA FITUR] (KETERANGAN)
// ==========================================

// GET - Ambil data
router.get('/nama-fitur', asyncHandler(async (req, res) => {
  const data = await prisma.model.findMany({
    where: { user_id: req.user.id }  // ← WAJIB: tenant isolation
  });
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate'); // ← jika data dinamis
  res.json(data);
}));

// POST - Buat data baru
router.post('/nama-fitur', asyncHandler(async (req, res) => {
  // 1. Validasi input
  // 2. Cek ownership/authorization
  // 3. Operasi database
  // 4. Return response
}));
```

**Checklist untuk endpoint baru:**
- [ ] Selalu filter dengan `user_id: req.user.id` (tenant isolation).
- [ ] Gunakan `asyncHandler` wrapper untuk error handling otomatis.
- [ ] Validasi input di awal fungsi sebelum query database.
- [ ] Set `Cache-Control` header untuk GET endpoints.
- [ ] Tambahkan ke section komentar yang sesuai di `routes.js`.
- [ ] Jika endpoint membutuhkan role khusus, gunakan `requireSuperAdmin` middleware.

### 6.3 Menambah Tab/Fitur Frontend Baru

Untuk menambah tab baru tanpa memperbesar `App.jsx`:

```jsx
// 1. Buat komponen di src/components/NamaTab.jsx
export default function NamaTab({ prop1, prop2 }) {
  // State lokal di sini, BUKAN di App.jsx
  const [localState, setLocalState] = useState(null);
  return ( ... );
}

// 2. Lazy import di App.jsx
const NamaTab = React.lazy(() => import('./components/NamaTab'));

// 3. Tambah ke tab navigation
<button onClick={() => setActiveTab('namatab')}>Nama Tab</button>

// 4. Tambah ke rendering section
{activeTab === 'namatab' && (
  <Suspense fallback={<div>Memuat...</div>}>
    <NamaTab prop1={...} prop2={...} />
  </Suspense>
)}
```

### 6.4 Styling Guidelines — Dark Slate Theme

Aplikasi menggunakan konsistensi visual **dark-slate** dengan TailwindCSS v4. Patuhi palette berikut:

| Elemen                    | Class TailwindCSS                                              |
|--------------------------|----------------------------------------------------------------|
| **Background utama**     | `bg-slate-950`                                                  |
| **Background card/panel**| `bg-slate-900/60`, `bg-slate-900/80`                           |
| **Background header**    | `bg-slate-900/80 backdrop-blur-md`                             |
| **Border umum**          | `border-slate-800`, `border-slate-900`                         |
| **Teks utama**           | `text-slate-100`                                                |
| **Teks sekunder**        | `text-slate-400`, `text-slate-500`                             |
| **Teks muted**           | `text-slate-500`, `text-[10px]`                                |
| **Aksen primer**         | `bg-indigo-600`, `text-indigo-400`, `border-indigo-500`        |
| **Aksen gradient**       | `bg-gradient-to-r from-indigo-400 to-cyan-400`                |
| **Sukses**               | `bg-emerald-950/80`, `border-emerald-500/50`, `text-emerald-200` |
| **Error/Warning**        | `bg-rose-950/80`, `border-rose-500/50`, `text-rose-200`       |
| **Button primary**       | `bg-indigo-600 hover:bg-indigo-500 text-white`                |
| **Button danger**        | `bg-rose-950/40 hover:bg-rose-900/60 border-rose-900/50`      |
| **Glassmorphism**        | `backdrop-blur-xl`, `bg-slate-900/60`                          |

**Aturan Styling:**
1. **Jangan gunakan warna mentah** — Selalu gunakan palette slate/indigo/cyan/emerald/rose.
2. **Jangan hardcode `px` values untuk spacing** — Gunakan Tailwind spacing utilities (`p-4`, `gap-3`, `mb-6`).
3. **Print styles** — Semua elemen navigasi harus memiliki class `print:hidden`.
4. **Responsivitas** — Gunakan breakpoint `sm:`, `lg:` secara konsisten. Mobile-first approach.
5. **Animasi** — Gunakan transisi TailwindCSS (`transition-all duration-200`) daripada CSS animasi custom.
6. **Glassmorphism** — Gunakan `backdrop-blur-md` dengan background semi-transparan untuk header dan modal.

### 6.5 Database Migration

Untuk menambah model atau kolom baru:

```bash
# 1. Edit schema.prisma
# 2. Generate dan jalankan migrasi
cd server
npx prisma migrate dev --name deskripsi_perubahan

# 3. Generate ulang Prisma Client
npx prisma generate
```

**Aturan migrasi:**
- Selalu tambahkan `user_id` (FK ke User) pada model baru yang bersifat per-tenant.
- Gunakan `onDelete: Cascade` agar data child otomatis terhapus saat parent dihapus.
- Tambahkan composite index untuk kombinasi kolom yang sering di-query bersamaan.
- Jangan rename kolom — buat kolom baru dan migrasi data secara bertahap.

### 6.6 Testing & Verification

| Metode                    | Tools            | Kapan Digunakan                                         |
|--------------------------|------------------|----------------------------------------------------------|
| **Manual Testing**       | Browser DevTools | Selalu — setiap perubahan UI.                           |
| **API Testing**          | `test-api.js`    | Validasi endpoint baru atau perubahan logika server.     |
| **Slot Verification**    | `verify-slots.js`| Cek integritas data slot setelah migrasi atau refactoring.|
| **Linting**              | `npm run lint`   | Sebelum commit — OxLint menangkap error potensial.       |
| **Build Verification**   | `npm run build`  | Sebelum deploy — memastikan tidak ada build error.       |

### 6.7 Konvensi Kode

| Aspek                | Konvensi                                                     |
|----------------------|--------------------------------------------------------------|
| **Bahasa variabel**  | Bahasa Indonesia untuk domain (e.g. `namaGuru`, `bebanJam`). |
| **Bahasa komentar**  | Bahasa Indonesia atau Inggris, konsisten per file.           |
| **Bahasa error msg** | Bahasa Indonesia (user-facing).                               |
| **Penamaan file**    | PascalCase untuk komponen React, camelCase untuk utilitas.   |
| **State naming**     | camelCase, deskriptif (e.g. `selectedRekapKelasId`).         |
| **API response**     | Selalu JSON. Error menggunakan `{ error: "pesan" }`.        |
| **Async handling**   | Selalu gunakan `asyncHandler` wrapper di Express routes.     |

---

## 📎 Referensi Cepat API Endpoints

### Routes Utama (`/api/*`)

| Method   | Endpoint                   | Auth | Deskripsi                                    |
|----------|----------------------------|------|----------------------------------------------|
| `POST`   | `/register`                | ❌   | Registrasi sekolah baru                      |
| `POST`   | `/login`                   | ❌   | Login dan generate JWT token                 |
| `GET`    | `/me`                      | ✅   | Verifikasi sesi dan cek status akun          |
| `GET`    | `/gurus`                   | ✅   | Ambil semua data guru                        |
| `POST`   | `/gurus`                   | ✅   | Tambah guru baru                             |
| `PUT`    | `/gurus/:id`               | ✅   | Update data guru                             |
| `DELETE` | `/gurus/:id`               | ✅   | Hapus guru                                   |
| `GET`    | `/gurus/:id/export`        | ✅   | Export data guru (CSV/JSON)                  |
| `POST`   | `/gurus/import`            | ✅   | Import guru dari file                        |
| `GET`    | `/kelas`                   | ✅   | Ambil semua data kelas                       |
| `POST`   | `/kelas`                   | ✅   | Tambah kelas baru                            |
| `PUT`    | `/kelas/:id`               | ✅   | Update data kelas                            |
| `DELETE` | `/kelas/:id`               | ✅   | Hapus kelas                                  |
| `GET`    | `/mapels`                  | ✅   | Ambil semua mata pelajaran                   |
| `POST`   | `/mapels`                  | ✅   | Tambah mata pelajaran baru                   |
| `PUT`    | `/mapels/:id`              | ✅   | Update mata pelajaran                        |
| `DELETE` | `/mapels/:id`              | ✅   | Hapus mata pelajaran                         |
| `GET`    | `/slots`                   | ✅   | Ambil slot (dengan dynamic break injection)  |
| `PUT`    | `/slots/:id`               | ✅   | Update waktu slot                            |
| `GET`    | `/plots`                   | ✅   | Ambil semua plot mengajar                    |
| `POST`   | `/plots`                   | ✅   | Tambah plot baru                             |
| `PUT`    | `/plots/:id`               | ✅   | Update plot                                  |
| `DELETE` | `/plots/:id`               | ✅   | Hapus plot (cascade ke jadwal)               |
| `GET`    | `/jadwals`                 | ✅   | Ambil semua jadwal                           |
| `POST`   | `/jadwals`                 | ✅   | Tempatkan jadwal baru (dengan validasi 5x)   |
| `PUT`    | `/jadwals/:id`             | ✅   | Pindahkan jadwal (dengan validasi 5x)        |
| `DELETE` | `/jadwals/:id`             | ✅   | Hapus jadwal                                 |
| `GET`    | `/school-profile`          | ✅   | Ambil profil sekolah                         |
| `PUT`    | `/school-profile`          | ✅   | Update profil sekolah                        |
| `POST`   | `/import-master`           | ✅   | Mass import Excel (transaksional)            |
| `GET`    | `/blocked-slots`           | ✅   | Ambil semua blocked slots                    |
| `POST`   | `/blocked-slots`           | ✅   | Kunci slot untuk kelas tertentu              |
| `DELETE` | `/blocked-slots/:id`       | ✅   | Buka kunci slot                              |
| `GET`    | `/time-settings`           | ✅   | Ambil konfigurasi waktu                      |
| `POST`   | `/time-settings`           | ✅   | Simpan/update konfigurasi waktu              |

### Routes Proktor (`/api/proktor/*`)

| Method   | Endpoint                       | Auth          | Deskripsi                              |
|----------|--------------------------------|---------------|----------------------------------------|
| `GET`    | `/dashboard`                   | SUPER_ADMIN   | Statistik global (total user, guru, dll) |
| `GET`    | `/users`                       | SUPER_ADMIN   | Daftar semua sekolah terdaftar          |
| `PUT`    | `/users/:id/status`            | SUPER_ADMIN   | Aktifkan/tangguhkan akun sekolah       |
| `DELETE` | `/users/:id`                   | SUPER_ADMIN   | Hapus akun sekolah                     |
| `POST`   | `/broadcast`                   | SUPER_ADMIN   | Buat pengumuman global                 |
| `GET`    | `/announcement`                | ✅ (semua)    | Ambil pengumuman terbaru               |

---

> 📌 **Dokumen ini adalah "living document"**. Perbarui setiap kali ada perubahan arsitektur, penambahan model, atau refactoring signifikan.  
> © 2026 Yusra Jadwal — Created by anamf.
