import React from 'react';

const MasterDataTab = React.memo(function MasterDataTab({
  masterSubTab,
  setMasterSubTab,
  gurus,
  kelas,
  mapels,
  slots,
  plots,
  guruForm,
  setGuruForm,
  kelasForm,
  setKelasForm,
  mapelForm,
  setMapelForm,
  plotForm,
  setPlotForm,
  editingSlotId,
  setEditingSlotId,
  editingSlotData,
  setEditingSlotData,
  highlightedPlotId,
  timeForm,
  setTimeForm,
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
  handleExportGuru,
  handleImportGuru
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 w-full max-w-full overflow-hidden">
      
      {/* Master Navigation Left Sidebar */}
      <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-2 sm:p-3 shadow-xl h-fit max-w-full overflow-hidden">
        <nav className="flex flex-row md:flex-col gap-1.5 overflow-x-auto whitespace-nowrap pb-1 md:pb-0 no-scrollbar">
          {[
            { id: 'guru', label: '👨‍🏫 Guru' },
            { id: 'kelas', label: '🏫 Kelas' },
            { id: 'mapel', label: '📚 Mata Pelajaran' },
            { id: 'timeSetting', label: '⚙️ Pengaturan Waktu' },
            { id: 'slot', label: '⏰ Waktu & Slot' },
            { id: 'plot', label: '🎯 Plotting Beban Mengajar' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMasterSubTab(tab.id)}
              className={`w-auto md:w-full shrink-0 text-left px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
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
              <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Guru (Team Teaching / Multi-Guru)</label>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 max-h-[125px] overflow-y-auto flex flex-col gap-2 custom-scrollbar">
                  {gurus.map((g) => {
                    const isChecked = (plotForm.guru_ids || []).includes(String(g.id));
                    return (
                      <label key={g.id} className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer hover:bg-slate-800/40 p-1 rounded transition-colors duration-150">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const currentIds = plotForm.guru_ids || [];
                            const nextIds = e.target.checked
                              ? [...currentIds, String(g.id)]
                              : currentIds.filter(id => id !== String(g.id));
                            setPlotForm({ ...plotForm, guru_ids: nextIds });
                          }}
                          className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span>{g.nama_guru}</span>
                      </label>
                    );
                  })}
                </div>
                {(plotForm.guru_ids || []).length === 0 && (
                  <span className="text-[10px] text-rose-400 font-medium">Pilih minimal 1 guru.</span>
                )}
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
                    onClick={() => setPlotForm({ id: null, guru_ids: [], mapel_id: '', kelas_id: '', beban_jam: '' })}
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
                            {p.gurus && p.gurus.length > 0 ? p.gurus.map(g => g.nama_guru).join(', ') : (p.guru?.nama_guru || '(Terhapus)')}
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
                                  guru_ids: p.gurus ? p.gurus.map(g => String(g.id)) : (p.guru_id ? [String(p.guru_id)] : []),
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

        {masterSubTab === 'timeSetting' && (
          <div>
            <h2 className="text-base font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">
              ⚙️ Pengaturan Slot Waktu & Istirahat Sekolah
            </h2>
            
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-md max-w-2xl flex flex-col gap-6">
              <form onSubmit={saveTimeSettings} className="flex flex-col gap-6">
                
                {/* Hari Aktif Checkboxes */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-350">
                    1. Pilih Hari Sekolah Aktif
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => {
                      const isChecked = timeForm.active_days.includes(day);
                      return (
                        <label key={day} className="flex items-center gap-3 p-3 rounded-lg border border-slate-850 bg-slate-900/60 cursor-pointer hover:border-slate-755 hover:bg-slate-900 transition-all select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const nextDays = e.target.checked
                                ? [...timeForm.active_days, day]
                                : timeForm.active_days.filter(d => d !== day);
                              setTimeForm({ ...timeForm, active_days: nextDays });
                            }}
                            className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-slate-200">{day}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Total JP Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-350" htmlFor="total_jp_input">
                    2. Total Jam Pelajaran (JP) per Hari
                  </label>
                  <input
                    id="total_jp_input"
                    type="number"
                    min="1"
                    max="15"
                    value={timeForm.total_jp}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setTimeForm({ ...timeForm, total_jp: val });
                    }}
                    className="w-full sm:w-1/3 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500">
                    Masukkan jumlah total jam pelajaran sekolah per hari (contoh: 8, 10, atau 12 JP).
                  </span>
                </div>

                {/* Break Slots Configuration */}
                <div className="flex flex-col gap-4">
                  <label className="text-sm font-semibold text-slate-350">
                    3. Atur Posisi Istirahat (Maksimal 3 Istirahat)
                  </label>
                  <span className="text-[11px] text-slate-500 -mt-3">
                    Tentukan setelah jam ke berapa istirahat disisipkan. Istirahat disisipkan di antara jam pelajaran tanpa mengurangi jumlah total JP.
                  </span>
                  
                  <div className="flex flex-col gap-4 bg-slate-900/40 border border-slate-850 p-4 rounded-lg">
                    {[
                      { id: 1, label: "Istirahat 1 (Pagi)", key: "ISTIRAHAT PAGI" },
                      { id: 2, label: "Istirahat 2 (Siang)", key: "ISTIRAHAT SIANG" },
                      { id: 3, label: "Istirahat 3 (Sore)", key: "ISTIRAHAT SORE" }
                    ].map((bConf) => {
                      const currentBreak = (timeForm.breaks || []).find(b => b.id === bConf.id) || { id: bConf.id, after_jp: 0, label: bConf.key };
                      const value = currentBreak.after_jp;

                      return (
                        <div key={bConf.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-850 last:border-b-0 last:pb-0">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-200">{bConf.label}</span>
                            <span className="text-[10px] text-slate-500">Posisi: {value > 0 ? `Setelah Jam Ke-${value}` : 'Tidak Ada (Nonaktif)'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <select
                              value={value}
                              onChange={(e) => {
                                const newVal = parseInt(e.target.value) || 0;
                                const updatedBreaks = [1, 2, 3].map(id => {
                                  const original = (timeForm.breaks || []).find(b => b.id === id) || { id, after_jp: 0, label: id === 1 ? "ISTIRAHAT PAGI" : (id === 2 ? "ISTIRAHAT SIANG" : "ISTIRAHAT SORE") };
                                  if (id === bConf.id) {
                                    return { ...original, after_jp: newVal };
                                  }
                                  return original;
                                });
                                setTimeForm({ ...timeForm, breaks: updatedBreaks });
                              }}
                              className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-44 cursor-pointer"
                            >
                              <option value="0">Tidak Ada (Nonaktif)</option>
                              {Array.from({ length: Number(timeForm.total_jp || 0) }).map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  Setelah Jam Ke-{i + 1}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-2 pt-4 border-t border-slate-800/80 flex justify-end">
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-3 rounded-lg shadow-lg cursor-pointer transition-colors"
                  >
                    Simpan Pengaturan
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
});

export default MasterDataTab;
