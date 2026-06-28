import React from 'react';

const getBlockedIcon = (label) => {
  if (!label) return '🔒';
  const l = label.toLowerCase();
  if (l.includes('upacara')) return '🚩';
  if (l.includes('sholat') || l.includes('dhuha') || l.includes('shalat')) return '🕌';
  if (l.includes('istirahat')) return '⏰';
  return '🔒';
};

const RekapTab = React.memo(function RekapTab({
  days,
  slotsByDay,
  totalRows,
  firstActiveDay,
  kelas,
  gurus,
  plots,
  jadwals,
  blockedSlots,
  selectedRekapKelasId,
  setSelectedRekapKelasId,
  selectedRekapGuruId,
  setSelectedRekapGuruId,
  schoolProfile,
  kepalaSekolahName,
  setKepalaSekolahName,
  kepalaSekolahNip,
  setKepalaSekolahNip,
  wakaKurikulumName,
  setWakaKurikulumName,
  wakaKurikulumNip,
  setWakaKurikulumNip,
  tanggalPengesahan,
  setTanggalPengesahan
}) {
  return (
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
                  const referenceSlot = slotsByDay[firstActiveDay] ? slotsByDay[firstActiveDay][rowIndex] : null;
                  if (!referenceSlot) return null;

                  const isBreakRow = referenceSlot.is_istirahat;

                  if (isBreakRow) {
                    const breakLabel = referenceSlot.keterangan || "ISTIRAHAT";
                    return (
                      <tr key={rowIndex} className="border border-slate-400">
                        <td className="py-2 px-2 border border-slate-400 text-center bg-slate-100 font-bold text-[10px] text-slate-700">
                          ISTIRAHAT
                        </td>
                        <td colSpan={days.length} className="py-2 px-2 text-center bg-slate-100/70 font-bold text-[10px] italic tracking-widest text-slate-650">
                          {breakLabel.toUpperCase()} (
                          {referenceSlot.jam_mulai} - {referenceSlot.jam_selesai}
                          {days.includes('Jumat') && slotsByDay['Jumat'] && slotsByDay['Jumat'][rowIndex] && (
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

                        if (day === 'Sabtu' && (!slot || (slot.jam_ke !== null && slot.jam_ke > 8))) {
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

                        const blocked = blockedSlots.find(
                          (bs) => bs.slot_id === slot.id && bs.kelas_id === Number(selectedRekapKelasId)
                        );

                        return (
                          <td key={day} className="py-3 px-2 border border-slate-400 text-center align-middle">
                            {scheduled ? (
                              <div>
                                <div className="font-extrabold text-[11px] text-slate-900 leading-tight">
                                  {scheduled.plot.mapel.nama_mapel}
                                </div>
                                <div className="text-[9px] text-slate-600 font-semibold mt-1">
                                  {scheduled.plot.gurus && scheduled.plot.gurus.length > 0 ? scheduled.plot.gurus.map(g => g.nama_guru).join(', ') : (scheduled.plot.guru?.nama_guru || '')}
                                </div>
                              </div>
                            ) : blocked ? (
                              <div className="font-bold text-[10px] text-slate-700 uppercase italic">
                                {getBlockedIcon(blocked.label)} {blocked.label}
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
                (j) => (j.plot.gurus ? j.plot.gurus.some(g => g.id === Number(selectedRekapGuruId)) : j.plot.guru_id === Number(selectedRekapGuruId)) &&
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
                  const referenceSlot = slotsByDay[firstActiveDay] ? slotsByDay[firstActiveDay][rowIndex] : null;
                  if (!referenceSlot) return null;

                  const isBreakRow = referenceSlot.is_istirahat;

                  if (isBreakRow) {
                    const breakLabel = referenceSlot.keterangan || "ISTIRAHAT";
                    return (
                      <tr key={rowIndex} className="border border-slate-400">
                        <td className="py-2 px-2 border border-slate-400 text-center bg-slate-100 font-bold text-[10px] text-slate-700">
                          ISTIRAHAT
                        </td>
                        <td colSpan={days.length} className="py-2 px-2 text-center bg-slate-100/70 font-bold text-[10px] italic tracking-widest text-slate-650">
                          {breakLabel.toUpperCase()} (
                          {referenceSlot.jam_mulai} - {referenceSlot.jam_selesai}
                          {days.includes('Jumat') && slotsByDay['Jumat'] && slotsByDay['Jumat'][rowIndex] && (
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

                        if (day === 'Sabtu' && (!slot || (slot.jam_ke !== null && slot.jam_ke > 8))) {
                          return (
                            <td key={day} className="py-3 px-2 border border-slate-400 text-center bg-slate-100/40 text-slate-400 font-semibold italic">
                              -
                            </td>
                          );
                        }

                        if (!slot) return <td key={day} className="border border-slate-400"></td>;

                        const scheduled = jadwals.find(
                          (j) => j.slot_id === slot.id && (j.plot.gurus ? j.plot.gurus.some(g => g.id === Number(selectedRekapGuruId)) : j.plot.guru_id === Number(selectedRekapGuruId))
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
                (p) => (p.gurus ? p.gurus.some(g => g.id === Number(selectedRekapGuruId)) : p.guru_id === Number(selectedRekapGuruId)) &&
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
  );
});

export default RekapTab;
