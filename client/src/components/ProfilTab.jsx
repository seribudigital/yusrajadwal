import React from 'react';

const ProfilTab = React.memo(function ProfilTab({
  profileForm,
  setProfileForm,
  saveSchoolProfile,
  handleLogoChange
}) {
  return (
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
  );
});

export default ProfilTab;
