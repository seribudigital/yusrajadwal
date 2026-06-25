# Product Requirement Document (PRD): Aplikasi Jadwal Pelajaran Sekolah (Fase 1)

## 1. Ringkasan Projek
Projek ini bertujuan untuk membangun aplikasi berbasis web untuk mendigitalisasi penyusunan jadwal pelajaran sekolah. Sistem berfokus pada pendekatan **Semi-Otomatis** dengan keunggulan **Early Warning System (Anti-Bentrok)** dan **Validasi Beban Jam Mengajar** secara *real-time*.

### Sifat Aplikasi (Penting):
Seluruh komponen data (Guru, Kelas, Mata Pelajaran, dan Slot Waktu) wajib bersifat **DINAMIS**. Tidak boleh ada angka yang dikunci (*hardcoded*) di dalam kode program. Admin dapat menambah, mengubah, atau menghapus data master kapan saja melalui antarmuka (UI).

---

## 2. Arsitektur Database (Skema Relasi)

Harap buat migrasi database menggunakan DBMS Relasional (seperti MySQL/PostgreSQL) dengan struktur tabel sebagai berikut:

[mapels] -------> [plots] (Tabel Jembatan) <------- [gurus]
|
v
[kelas] --------> [jadwals] (Tabel Utama) <------- [slots]


### Detail Migrasi Tabel:

#### a. `gurus`
* `id` (Primary Key)
* `nama_guru` (String)
* `nip` (String, Nullable)

#### b. `kelas`
* `id` (Primary Key)
* `nama_kelas` (String, contoh: '7-A', '8-B')

#### c. `mapels`
* `id` (Primary Key)
* `nama_mapel` (String, contoh: 'Matematika')
* `kode_mapel` (String, contoh: 'MTK', Nullable)

#### d. `slots` (Master Waktu & Istirahat)
* `id` (Primary Key)
* `hari` (Enum: 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat')
* `jam_ke` (Integer, Nullable) -> Diisi angka 1, 2, 3 dst. Jika merupakan jam istirahat, diisi `NULL`.
* `jam_mulai` (Time, contoh: '07:00:00')
* `jam_selesai` (Time, contoh: '07:40:00')
* `is_istirahat` (Boolean, Default: false) -> Bernilai `true` jika slot tersebut adalah waktu istirahat.
* `keterangan` (String, Nullable) -> Contoh: 'Pelajaran', 'Istirahat Pagi', 'Istirahat Siang'.

#### e. `plots` (Pembagian Kuota Mengajar Semester)
Tabel jembatan untuk menentukan konfigurasi tugas mengajar sebelum jadwal disusun.
* `id` (Primary Key)
* `guru_id` (Foreign Key -> `gurus` dengan `onDelete('cascade')`)
* `mapel_id` (Foreign Key -> `mapels` dengan `onDelete('cascade')`)
* `kelas_id` (Foreign Key -> `kelas` dengan `onDelete('cascade')`)
* `beban_jam` (Integer, contoh: 3 -> Artinya kombinasi ini harus muncul 3 kali di tabel jadwal).

#### f. `jadwals` (Hasil Penempatan Jadwal)
* `id` (Primary Key)
* `slot_id` (Foreign Key -> `slots` dengan `onDelete('cascade')`)
* `plot_id` (Foreign Key -> `plots` dengan `onDelete('cascade')`)

---

## 3. Logika Utama Backend (Aturan Validasi)

Sebelum data disimpan (`store`) atau diperbarui (`update`) ke dalam tabel `jadwals`, sistem **WAJIB** menjalankan validasi berlapis berikut:

1. **Validasi Slot Istirahat:**
   * *Logika:* Periksa apakah `slot_id` tujuan memiliki nilai `is_istirahat == true`.
   * *Action:* Gagalkan simpan, kembalikan error: `"Tidak dapat menempatkan pelajaran pada jam istirahat!"`.

2. **Validasi Guru Bentrok (Anti-Double Mengajar):**
   * *Logika:* Tarik data `guru_id` dari `plot_id` yang sedang diinput. Periksa apakah `guru_id` tersebut sudah terjadwal di tabel `jadwals` pada `slot_id` (hari dan jam) yang sama di kelas mana pun.
   * *Action:* Jika ditemukan duplikasi, gagalkan simpan, kembalikan error: `"Guru [Nama Guru] sudah mengajar di kelas lain pada jam ini!"`.

3. **Validasi Kelas Bentrok:**
   * *Logika:* Tarik data `kelas_id` dari `plot_id` yang sedang diinput. Periksa apakah `kelas_id` tersebut sudah terisi oleh `plot_id` lain pada `slot_id` yang sama.
   * *Action:* Jika sudah terisi, gagalkan simpan, kembalikan error: `"Kelas ini sudah memiliki jadwal pelajaran lain pada jam ini!"`.

4. **Validasi Kuota Beban Jam:**
   * *Logika:* Hitung total kemunculan `plot_id` tersebut di tabel `jadwals`. Jumlahnya tidak boleh melebihi nilai `beban_jam` pada tabel `plots`.
   * *Action:* Jika kuota sudah habis (Sisa = 0), gagalkan simpan, kembalikan error: `"Jatah jam mengajar untuk mata pelajaran ini sudah habis!"`.

---

## 4. Kebutuhan Antarmuka (UI/UX) & Fitur Utama

### Halaman 1: CRUD Master & Plotting Data
* Sediakan form manajemen data untuk menambah/mengedit/menghapus data **Guru, Kelas, Mapel**, dan susunan **Slot Waktu**.
* **Form Plotting Mengajar:** Halaman khusus untuk memetakan Guru, Mapel, Kelas, dan Beban Jam di awal semester.

### Halaman 2: Ruang Penyusunan Jadwal (Interactive Grid)
* **Filter Utama:** Dropdown pilihan **Kelas** (Aplikasi akan merender grid jadwal khusus kelas yang dipilih).
* **Bentuk Grid:** Matriks tabel. Baris berdasarkan data `slots` yang diurutkan kronologis (`jam_mulai`). Kolom berdasarkan Hari (Senin-Jumat).
* **Baris Istirahat:** Jika baris data `slots` memiliki status `is_istirahat == true`, render baris tersebut secara penuh (*colspan*) dengan warna abu-abu bertuliskan nama istirahatnya (misal: "ISTIRAHAT SIANG") dan kunci agar tidak bisa diisi pelajaran.
* **Sidebar Pelajaran (Sisa Jam):** Tampilkan daftar pelajaran (`plots`) yang tersedia untuk kelas tersebut. Tampilkan teks interaktif: `[Nama Mapel] - [Nama Guru] (Sisa: X Jam)`.
* **Mekanisme Input:** Gunakan metode *Drag-and-Drop* (direkomendasikan) atau *Dropdown Klik* di setiap sel grid kosong untuk memasukkan pelajaran dari sidebar.
* **Reaktivitas:** Jika validasi sukses, sisa jam di sidebar langsung berkurang. Jika gagal (bentrok), munculkan *pop-up alert* peringatan merah dan batalkan penempatan.

### Halaman 3: Cetak & Rekap (Output)
Aplikasi harus dapat mengelompokkan data jadwal yang sudah jadi untuk kebutuhan cetak:
1. **Rekap Per Kelas (Untuk Siswa):** Filter per kelas, menampilkan grid jadwal bersih (Hari x Jam Pelajaran) siap cetak/simpan PDF.
2. **Rekap Per Guru (Untuk Guru):** Filter per guru, menampilkan tabel agenda mengajar mingguan (Hari, Jam Ke, Jam Mulai-Selesai, Mengajar di Kelas Apa, Mata Pelajaran Apa).
3. **Optimasi Cetak:** Gunakan CSS `@media print` yang rapi agar halaman bersih saat dicetak ke kertas.

---

## 5. Pola Pengisian Data Slot Waktu (Sebagai Referensi)

Struktur data harian pada tabel `slots` akan mengikuti pola operasional sekolah berikut (Contoh untuk 1 Hari):
* Jam ke 1 - 5 (Pelajaran)
* Slot Istirahat Pagi (`jam_ke = NULL`, `is_istirahat = true`)
* Jam ke 6 - 8 (Pelajaran)
* Slot Istirahat Siang (`jam_ke = NULL`, `is_istirahat = true`)
* Jam ke 9 - 12 (Pelajaran)
* Slot Istirahat Sore (`jam_ke = NULL`, `is_istirahat = true`)
* Jam ke 13 - 14 (Pelajaran)

---

## 6. Rekomendasi Tech Stack
* **Backend Framework:** Laravel (PHP) atau ExpressJS/NestJS (Node.js)
* **Frontend:** TailwindCSS + Livewire (jika Laravel) atau React/Vue (jika Node.js)
* **Database:** MySQL atau PostgreSQL