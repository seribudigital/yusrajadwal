import React from 'react';

const PanduanTab = React.memo(function PanduanTab() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div>
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-2">
          <span className="text-2xl">📖</span>
          <div>
            <h2 className="text-lg font-bold text-slate-200">
              Panduan Pengguna Yusra Jadwal
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Panduan komprehensif bagi Administrator Sekolah untuk menyusun jadwal pelajaran secara efektif, anti-bentrok, dan fleksibel.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Alur Dasar */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div>
            <div className="flex justify-between items-start gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>🏢</span> 1. Alur Dasar Penyusunan Jadwal
              </h3>
              <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-900/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Dasar
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Alur sistematis untuk memulai penyusunan jadwal pelajaran dari awal hingga selesai:
            </p>
            <ul className="flex flex-col gap-3 text-xs text-slate-350">
              <li className="flex gap-2">
                <span className="text-indigo-400 font-bold">Langkah 1:</span>
                <div>
                  <strong className="text-slate-200">Data Master:</strong> Isi terlebih dahulu semua data di tab Guru, Kelas, dan Mata Pelajaran. Sistem kini dilengkapi proteksi anti-duplikat otomatis untuk menjaga integritas data.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-400 font-bold">Langkah 2:</span>
                <div>
                  <strong className="text-slate-200">Ploting Beban Jam:</strong> Masuk ke tab "Plot Data" untuk menentukan hubungan siapa mengajar apa, di kelas mana, dan berapa jam pelajaran seminggu.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-400 font-bold">Langkah 3:</span>
                <div>
                  <strong className="text-slate-200">Penyusunan:</strong> Masuk ke tab "Jadwal Interaktif", pilih kelas, lalu geser (drag & drop) kartu mengajar dari sidebar kiri ke dalam kotak matrix waktu. UI akan merespon secara instan dengan background sync yang aman.
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Card 2: Manajemen Slot Waktu & Istirahat Sisipan (Baru) */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div>
            <div className="flex justify-between items-start gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>⚙️</span> 2. Manajemen Slot Waktu & Istirahat Sisipan (Baru)
              </h3>
              <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-900/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Waktu
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Cara mengatur jam operasional sekolah dan istirahat global tanpa mengganggu jam pelajaran:
            </p>
            <ul className="flex flex-col gap-3 text-xs text-slate-350">
              <li className="flex gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <div>
                  <strong className="text-slate-200">Atur Waktu Global:</strong> Melalui menu "Master Data" -&gt; "Pengaturan Waktu", Anda dapat menentukan Hari Sekolah Aktif (misal 5 atau 6 hari) serta jumlah total Jam Pelajaran (JP) efektif per hari. Grid jadwal akan otomatis menciut atau melebar secara instan.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <div>
                  <strong className="text-slate-200">Istirahat Otomatis (Tidak Memotong JP):</strong> Tersedia 3 slot khusus (Istirahat Pagi, Siang, Sore) yang bisa Anda pilih untuk disisipkan "Setelah Jam Ke-X". Sistem akan otomatis menyisipkan baris abu-abu bertuliskan <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-400 font-mono text-[10px]">--- ISTIRAHAT ---</code> di semua kelas secara serentak.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <div>
                  <strong className="text-slate-200">Keunggulan:</strong> Istirahat ini bersifat sisipan di luar jam belajar, sehingga total JP efektif Anda tetap utuh (tidak terpotong oleh waktu istirahat) dan seluruh baris istirahat otomatis terkunci (🚫) dari aktivitas drag & drop.
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Card 3: Fitur Gembok Kustom (Custom Blocked Slots) */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div>
            <div className="flex justify-between items-start gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>🔒</span> 3. Fitur Gembok Kustom (Custom Blocked Slots)
              </h3>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Segel
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Mengunci slot tertentu untuk kelas spesifik di luar istirahat massal global:
            </p>
            <ul className="flex flex-col gap-3 text-xs text-slate-350">
              <li className="flex gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <div>
                  <strong className="text-slate-200">Fungsi:</strong> Digunakan secara khusus untuk mengunci slot-slot tertentu di luar jam istirahat massal yang hanya berlaku untuk kelas atau hari tertentu saja (misal: Upacara Bendera di hari Senin jam ke-1, atau Shalat Dhuha berjamaah).
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <div>
                  <strong className="text-slate-200">Cara Pakai:</strong> Cukup arahkan kursor ke kotak matrix kosong pada jadwal kelas tertentu, klik ikon gembok (🔒), masukkan nama kegiatannya, lalu simpan. Kotak tersebut akan tersegel secara mandiri.
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Card 4: Ekskul */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div>
            <div className="flex justify-between items-start gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>⚽</span> 4. Manajemen Kegiatan Ekskul (Lintas Kelas)
              </h3>
              <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-900/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Solusi
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Karena siswa ekskul berasal dari gabungan berbagai kelas reguler berdasarkan minat, jangan menempelkan ekskul di dalam jadwal kelas asli.
            </p>
            <div className="bg-slate-900 border border-slate-850 p-3 rounded-lg flex flex-col gap-2 text-xs text-slate-350">
              <strong className="text-amber-400">💡 Solusi Cerdas:</strong>
              <ol className="list-decimal list-inside flex flex-col gap-1.5">
                <li>
                  Buat <strong className="text-slate-200">"Kelas Baru"</strong> khusus di data master, contoh: <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-400 font-mono text-[11px]">Ekskul - Pramuka</code>.
                </li>
                <li>
                  Gunakan <strong className="text-slate-200">Fitur Gembok</strong> untuk mengunci jam Senin s.d Jumat di kelas ekskul tersebut dengan label "Jam Belajar Reguler".
                </li>
                <li>
                  <strong className="text-slate-200">Drag & drop</strong> plot pelajaran Ekskul ke kotak hari Sabtu yang masih terbuka. Rekap jam mengajar pembina tetap terhitung akurat tanpa mengotori jadwal mingguan kelas reguler.
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Card 5: Ekspor & Impor Jadwal Guru */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div>
            <div className="flex justify-between items-start gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>📥</span> 5. Fitur Ekspor & Impor Jadwal Guru (Format JSON)
              </h3>
              <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-900/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Integrasi
              </span>
            </div>
            <div className="flex flex-col gap-3 text-xs text-slate-350">
              <div>
                <strong className="text-slate-200">Ekspor Jadwal Guru (Backup):</strong>
                <p className="text-slate-400 mt-1">
                  Anda dapat mencadangkan jadwal guru tertentu ke file `.json`. Tombol **Ekspor** ini dapat ditemukan di menu *Data Master &rarr; Guru* di baris data guru, atau langsung di sidebar kiri tab *Penyusunan Jadwal* setelah memilih guru.
                </p>
              </div>
              <div>
                <strong className="text-slate-200">Impor Jadwal Guru (Sekolah Lain):</strong>
                <p className="text-slate-400 mt-1">
                  Untuk memindahkan jadwal mengajar guru honorer atau guru lintas sekolah, Anda dapat mengunggah file `.json` jadwal tersebut di bagian **Impor Jadwal Guru (Sekolah Lain)** di bawah tabel Guru.
                </p>
              </div>
              <div className="bg-rose-950/30 border border-rose-900/50 p-2.5 rounded-lg text-rose-300">
                <strong>⚠️ Format Data JSON:</strong> Pastikan format file `.json` tidak diubah secara manual agar sistem dapat membaca array `occupied_slots` dan memblokir waktu mengajar guru tersebut secara akurat di database.
              </div>
            </div>
          </div>
        </div>

        {/* Card 6: Kelas Sibuk, Jadwal Offline, & Multi-Guru Radar */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div>
            <div className="flex justify-between items-start gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>⚠️</span> 6. Manajemen Kelas Sibuk & Radar Multi-Guru (Team Teaching)
              </h3>
              <span className="text-[10px] bg-rose-950 text-rose-455 border border-rose-900/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Availability
              </span>
            </div>
            <div className="flex flex-col gap-2.5 text-xs text-slate-350">
              <div>
                <strong className="text-slate-200">Logika Kelas Sibuk & Offline:</strong>
                <p className="text-slate-400 mt-1">
                  Fitur ini mengunci slot waktu bagi guru yang memiliki keterbatasan waktu. Jadwal dari luar sekolah disimpan dalam kelas khusus bernama <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-400 font-mono text-[11px]">OFFLINE</code>.
                </p>
              </div>
              <div>
                <strong className="text-slate-200">Radar Deteksi Team-Teaching (Multi-Guru):</strong>
                <p className="text-slate-400 mt-1">
                  Saat menyeret atau menyoroti pelajaran dengan sistem tim pengajar (misal: kelas Tahfizh dengan 2+ guru), grid jadwal akan menganalisis jam sibuk dari **seluruh** guru yang terlibat. Jika ada salah satu guru yang berhalangan/sibuk, slot grid akan berdenyut merah dengan peringatan <span className="text-rose-400 font-bold">⚠️ PARTNER SIBUK</span> atau <span className="text-rose-350 font-bold">❌ PARTNER BLOCKOUT</span>.
                </p>
              </div>
              <div>
                <strong className="text-slate-200">Tooltip Keterangan Bentrok:</strong>
                <p className="text-slate-400 mt-1">
                  Arahkan kursor ke slot bentrok tersebut untuk menampilkan informasi instan mengenai nama guru yang berhalangan beserta lokasi/kelas tempat ia sedang mengajar.
                </p>
              </div>
              <div className="bg-indigo-950/30 border border-indigo-900/50 p-2.5 rounded-lg text-indigo-300">
                <strong>Proteksi Bentrok Real-time:</strong> Sistem memblokir peletakan kartu pelajaran ke slot bentrok secara real-time untuk menjamin jadwal 100% bebas tabrakan mengajar.
              </div>
            </div>
          </div>
        </div>

        {/* Card 7: Penyusunan Jadwal Otomatis Cerdas (Auto-Fill) */}
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors md:col-span-2">
          <div>
            <div className="flex justify-between items-start gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>🤖</span> 7. Penyusunan Jadwal Otomatis Cerdas (Auto-Fill)
              </h3>
              <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-900/50 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Otomatisasi
              </span>
            </div>
            <div className="flex flex-col gap-2.5 text-xs text-slate-350">
              <p className="text-slate-400">
                Fitur Auto-Fill Cerdas memungkinkan Anda menyusun jadwal satu kelas secara otomatis hanya dengan satu klik tombol **🤖 Auto-Fill Jadwal Kelas**. Mesin penjadwalan akan mencari slot kosong terbaik yang aman dan ideal.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-1">
                <div className="bg-slate-900/50 border border-slate-850 p-3 rounded-lg flex flex-col gap-1">
                  <strong className="text-indigo-300 font-semibold">📚 Mapel Berat di Pagi Hari</strong>
                  <p className="text-slate-500 text-[10px] leading-relaxed">
                    Mata pelajaran yang memerlukan konsentrasi tinggi (misal: Matematika, Fisika) diprioritaskan untuk ditempatkan pada jam-jam awal (pagi hari).
                  </p>
                </div>
                <div className="bg-slate-900/50 border border-slate-850 p-3 rounded-lg flex flex-col gap-1">
                  <strong className="text-indigo-300 font-semibold">🔗 Blok Mengajar Berurutan</strong>
                  <p className="text-slate-500 text-[10px] leading-relaxed">
                    Pelajaran dengan beban 2 atau 3 jam pelajaran (JP) akan diletakkan berurutan di hari yang sama agar materi tidak terpecah-pecah.
                  </p>
                </div>
                <div className="bg-slate-900/50 border border-slate-850 p-3 rounded-lg flex flex-col gap-1">
                  <strong className="text-indigo-300 font-semibold">⚙️ Preferensi Kustomisasi</strong>
                  <p className="text-slate-500 text-[10px] leading-relaxed">
                    Melalui *Master Data &rarr; Pengaturan Waktu*, Anda bisa menentukan daftar Mapel Berat, batas jam maksimal pagi hari, dan mengaktifkan/mematikan kebijakan Anti-Split.
                  </p>
                </div>
              </div>

              <div className="bg-indigo-950/30 border border-indigo-900/50 p-2.5 rounded-lg text-indigo-300">
                <strong>🛡️ Keamanan Sistem (Anti-Hang):</strong> Mesin ini dijalankan secara aditif (menjaga jadwal manual yang sudah Anda susun sebelumnya) dan dilengkapi batas maksimal 500 iterasi agar tidak menyebabkan server lambat atau hang.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});

export default PanduanTab;
