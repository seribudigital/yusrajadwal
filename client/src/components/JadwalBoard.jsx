import React from 'react';

const getBlockedIcon = (label) => {
  if (!label) return '🔒';
  const l = label.toLowerCase();
  if (l.includes('upacara')) return '🚩';
  if (l.includes('sholat') || l.includes('dhuha') || l.includes('shalat')) return '🕌';
  if (l.includes('istirahat')) return '⏰';
  if (l.includes('seni') || l.includes('lukis') || l.includes('tari') || l.includes('musik') || l.includes('desain')) return '🎨';
  if (l.includes('lari') || l.includes('atletik')) return '🏃';
  if (l.includes('ekskul') || l.includes('ekstra') || l.includes('olahraga') || l.includes('basket') || l.includes('futsal') || l.includes('bola') || l.includes('senam') || l.includes('pramuka')) return '⚽';
  return '🔒';
};

const JadwalBoard = React.memo(function JadwalBoard({
  days,
  slotsByDay,
  totalRows,
  firstActiveDay,
  kelas,
  selectedKelasId,
  setSelectedKelasId,
  selectedFilterGuruId,
  setSelectedFilterGuruId,
  activeClassGurus,
  activeClassPlots,
  visibleClassPlots,
  jadwals,
  blockedSlots,
  draggedOverSlotId,
  successDropSlotId,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDeleteJadwal,
  handleLockSlot,
  handleUnlockSlot,
  handleExportGuru,
  gurus,
  getSisaJam,
  isAutoFilling,
  handleAutoFill
}) {
  const [hoveredPlotId, setHoveredPlotId] = React.useState(null);
  const [draggedPlotId, setDraggedPlotId] = React.useState(null);

  const activePlotId = draggedPlotId || hoveredPlotId;

  const activePlotGuruIds = React.useMemo(() => {
    if (!activePlotId) return [];
    
    let activePlot = activeClassPlots.find(p => p.id === activePlotId);
    if (!activePlot) {
      const scheduledJadwal = jadwals.find(j => j.plot_id === activePlotId);
      if (scheduledJadwal) {
        activePlot = scheduledJadwal.plot;
      }
    }
    
    if (!activePlot) return [];
    return activePlot.gurus
      ? activePlot.gurus.map(g => g.id)
      : (activePlot.guru_id ? [activePlot.guru_id] : []);
  }, [activePlotId, activeClassPlots, jadwals]);

  return (
    <div className="flex flex-col gap-6">
      {isAutoFilling && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl max-w-sm text-center">
            <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
            <h4 className="text-white font-bold text-lg mt-2">Menjadwalkan Otomatis...</h4>
            <p className="text-slate-400 text-xs">
              Mesin Auto-Fill sedang menganalisis slot waktu terbaik dan mencocokkan jadwal guru tanpa bentrok.
            </p>
          </div>
        </div>
      )}
      
      {/* Top Bar Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-300">Kelas Aktif:</label>
            <div className="flex items-center gap-2">
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
              {selectedKelasId && (
                <button
                  onClick={() => handleAutoFill(selectedKelasId)}
                  disabled={isAutoFilling}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-md active:scale-95 border border-indigo-500/30"
                  title="Auto-fill jadwal untuk kelas terpilih secara otomatis"
                >
                  {isAutoFilling ? '🤖 Memproses...' : '🤖 Auto-Fill Jadwal Kelas'}
                </button>
              )}
            </div>
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
                const referenceSlot = slotsByDay[firstActiveDay] ? slotsByDay[firstActiveDay][rowIndex] : null;
                if (!referenceSlot) return null;

                const isBreakRow = referenceSlot.is_istirahat;

                if (isBreakRow) {
                  const breakLabel = referenceSlot.keterangan || "ISTIRAHAT";
                  return (
                    <tr key={rowIndex} className="border-b border-slate-800/50">
                      <td className="py-2.5 px-3 bg-slate-950/80 border-r border-slate-800 text-center text-xs font-semibold text-slate-400">
                        ISTIRAHAT
                      </td>
                      {/* Colspan across all day columns */}
                      <td colSpan={days.length} className="py-2.5 px-4 bg-slate-800/40 text-center font-bold text-xs tracking-wider text-slate-400 italic">
                        ☕ {breakLabel.toUpperCase()} (
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
                      if (day === 'Sabtu' && (!slot || (slot.jam_ke !== null && slot.jam_ke > 8))) {
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

                      // Check if this slot is blocked for this class
                      const blocked = blockedSlots.find(
                        (bs) => bs.slot_id === slot.id && bs.kelas_id === Number(selectedKelasId)
                      );
                      const isBlocked = !!blocked;

                      // Determine which teachers we are highlighting (dragged/hovered plot or filtered teacher)
                      const targetGuruIds = activePlotGuruIds.length > 0
                        ? activePlotGuruIds
                        : (selectedFilterGuruId ? [Number(selectedFilterGuruId)] : []);

                      // Check if any target teacher is busy at this slot in another class
                      const busyTeacherJadwal = targetGuruIds.length > 0
                        ? jadwals.find(
                            (j) =>
                              j.slot_id === slot.id &&
                              j.plot &&
                              j.plot.kelas_id !== Number(selectedKelasId) &&
                              (j.plot.gurus
                                ? j.plot.gurus.some(g => targetGuruIds.includes(g.id))
                                : targetGuruIds.includes(j.plot.guru_id))
                          )
                        : null;

                      // Find which teacher(s) from targetGuruIds are actually busy in this slot
                      const clashingGurus = [];
                      if (busyTeacherJadwal && busyTeacherJadwal.plot) {
                        const busyPlotGurus = busyTeacherJadwal.plot.gurus
                          ? busyTeacherJadwal.plot.gurus.map(g => g.id)
                          : (busyTeacherJadwal.plot.guru_id ? [busyTeacherJadwal.plot.guru_id] : []);
                        
                        targetGuruIds.forEach(id => {
                          if (busyPlotGurus.includes(id)) {
                            let teacherObj = null;
                            if (activePlotId) {
                              const activePlot = activeClassPlots.find(p => p.id === activePlotId) || (jadwals.find(j => j.plot_id === activePlotId)?.plot);
                              if (activePlot && activePlot.gurus) {
                                teacherObj = activePlot.gurus.find(g => g.id === id);
                              }
                              if (!teacherObj && activePlot && activePlot.guru && activePlot.guru.id === id) {
                                teacherObj = activePlot.guru;
                              }
                            }
                            if (!teacherObj) {
                              teacherObj = activeClassGurus.find(g => g.id === id) || gurus.find(g => g.id === id);
                            }
                            if (teacherObj) {
                              clashingGurus.push(teacherObj.nama_guru);
                            } else {
                              clashingGurus.push("Guru");
                            }
                          }
                        });
                      }

                      const isMultiGuruPlot = activePlotGuruIds.length > 1;

                      const isDraggedOver = draggedOverSlotId === slot.id;
                      const isSuccessDrop = successDropSlotId === slot.id;

                      return (
                        <td
                          key={day}
                          onDragOver={(e) => {
                            if (isBlocked) return;
                            handleDragOver(e, slot.id);
                          }}
                          onDragLeave={isBlocked ? undefined : handleDragLeave}
                          onDrop={(e) => {
                            if (isBlocked) return;
                            handleDrop(e, slot.id);
                          }}
                          className={`p-2 border-r border-slate-800/30 relative group transition-all duration-200 ${
                            !isBlocked && isDraggedOver ? 'bg-indigo-950/60 ring-2 ring-indigo-500 border-indigo-500' : ''
                          }  ${
                            !isBlocked && isSuccessDrop ? 'bg-emerald-950/60 ring-2 ring-emerald-500 border-emerald-500 scale-[0.98]' : ''
                          }`}
                        >
                          {scheduled ? (
                            <div
                              draggable
                              onDragStart={(e) => {
                                setDraggedPlotId(scheduled.plot_id);
                                handleDragStart(e, scheduled.plot_id, scheduled.id);
                              }}
                              onDragEnd={() => {
                                setDraggedPlotId(null);
                              }}
                              onMouseEnter={() => {
                                setHoveredPlotId(scheduled.plot_id);
                              }}
                              onMouseLeave={() => {
                                setHoveredPlotId(null);
                              }}
                              className="bg-indigo-950/90 border border-indigo-500/30 p-2.5 rounded-lg relative flex flex-col h-[72px] justify-between shadow-md cursor-grab active:cursor-grabbing hover:border-indigo-400/50 transition-all duration-200"
                            >
                              {/* Subject */}
                              <div className="font-bold text-xs text-indigo-200 leading-tight">
                                {scheduled.plot.mapel.nama_mapel}
                              </div>
                              {/* Teacher */}
                              <div className="text-[10px] text-slate-300 mt-1 font-medium truncate" title={scheduled.plot.gurus ? scheduled.plot.gurus.map(g => g.nama_guru).join(', ') : (scheduled.plot.guru?.nama_guru || '')}>
                                👨‍🏫 {scheduled.plot.gurus && scheduled.plot.gurus.length > 0 ? scheduled.plot.gurus.map(g => g.nama_guru).join(', ') : (scheduled.plot.guru?.nama_guru || '')}
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
                          ) : blocked ? (
                            <div
                              className="border border-dashed border-slate-700/85 bg-slate-900/60 text-slate-400 rounded-lg p-2.5 flex flex-col h-[72px] justify-between shadow-md relative group select-none transition-all"
                              title={`Diberlakukan Kunci Slot: ${blocked.label}`}
                            >
                              <div className="font-bold text-xs text-slate-300 leading-tight flex items-center gap-1.5">
                                {getBlockedIcon(blocked.label)} {blocked.label}
                              </div>
                              <div className="text-[8px] text-slate-500 mt-1.5">
                                ⏰ {slot.jam_mulai} - {slot.jam_selesai}
                              </div>
                              <button
                                onClick={() => handleUnlockSlot(blocked.id)}
                                className="absolute top-1 right-1 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-450 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Buka Kunci Slot"
                              >
                                🔓
                              </button>
                            </div>
                          ) : busyTeacherJadwal ? (
                            busyTeacherJadwal.plot.kelas.nama_kelas === "OFFLINE" ? (
                              <div
                                style={{
                                  backgroundImage: 'repeating-linear-gradient(45deg, #2d1e24 0px, #2d1e24 6px, #1a0f12 6px, #1a0f12 12px)',
                                }}
                                className="border border-rose-900/60 rounded-lg p-2 text-center text-[10px] select-none flex flex-col justify-center items-center gap-0.5 h-[72px] shadow-sm animate-pulse"
                                title={
                                  clashingGurus.length > 0 
                                    ? `Blockout: ${clashingGurus.join(', ')} memiliki jadwal luar / blockout` 
                                    : 'Guru Blockout / Jadwal Luar'
                                }
                              >
                                <span className="font-extrabold text-rose-350 tracking-wide text-[9px]">
                                  {isMultiGuruPlot ? '❌ PARTNER BLOCKOUT' : '❌ GURU BLOCKOUT'}
                                </span>
                                <span className="text-[8px] text-rose-450 font-bold uppercase tracking-wider leading-none mt-0.5 truncate max-w-[95%]">
                                  {clashingGurus.length > 0 ? clashingGurus.join(', ') : 'JADWAL LUAR'}
                                </span>
                              </div>
                            ) : (
                              <div 
                                className={`border border-dashed rounded-lg p-2 text-center text-[10px] select-none flex flex-col justify-center items-center gap-0.5 h-[72px] animate-pulse transition-all duration-300 ${
                                  isMultiGuruPlot 
                                    ? 'border-rose-700 bg-rose-950/40 text-rose-300 shadow-md shadow-rose-950/20' 
                                    : 'border-rose-900/50 bg-rose-950/20 text-rose-400'
                                }`}
                                title={
                                  clashingGurus.length > 0 
                                    ? `Bentrok: ${clashingGurus.join(', ')} mengajar di kelas ${busyTeacherJadwal.plot.kelas.nama_kelas}` 
                                    : `Guru sibuk di kelas ${busyTeacherJadwal.plot.kelas.nama_kelas}`
                                }
                              >
                                <span className="font-bold tracking-wide text-[10px]">
                                  {isMultiGuruPlot ? '⚠️ PARTNER SIBUK' : '⚠️ SIBUK'}
                                </span>
                                <span className="text-[9px] text-rose-200/90 font-semibold leading-tight truncate max-w-[95%]">
                                  {clashingGurus.length > 0 ? clashingGurus.join(', ') : 'Guru'}
                                </span>
                                <span className="text-[8px] text-rose-400/80 font-medium leading-none mt-0.5">
                                  Kelas {busyTeacherJadwal.plot.kelas.nama_kelas}
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="border border-dashed border-slate-800 rounded-lg p-2 text-center text-[10px] text-slate-600 group-hover:border-slate-700 select-none relative flex flex-col justify-center items-center h-[72px]">
                              <span>Kosong</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLockSlot(slot.id);
                                }}
                                className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-indigo-400 cursor-pointer"
                                title="Kunci Slot Waktu"
                              >
                                🔒
                              </button>
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
                      onDragStart={(e) => {
                        setDraggedPlotId(plot.id);
                        handleDragStart(e, plot.id);
                      }}
                      onDragEnd={() => {
                        setDraggedPlotId(null);
                      }}
                      onMouseEnter={() => {
                        setHoveredPlotId(plot.id);
                      }}
                      onMouseLeave={() => {
                        setHoveredPlotId(null);
                      }}
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
                      
                      <div className="text-[10px] text-slate-400 mt-2 font-medium truncate" title={plot.gurus ? plot.gurus.map(g => g.nama_guru).join(', ') : (plot.guru?.nama_guru || '')}>
                        👨‍🏫 {plot.gurus && plot.gurus.length > 0 ? plot.gurus.map(g => g.nama_guru).join(', ') : (plot.guru?.nama_guru || '')}
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
  );
});

export default JadwalBoard;
