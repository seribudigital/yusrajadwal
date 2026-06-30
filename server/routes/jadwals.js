import express from 'express';
import prisma from '../prismaClient.js';
import authMiddleware from '../authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Core scheduling validation engine
export async function validateJadwal(prismaClient, userId, slot_id, plot_id, excludeJadwalId = null) {
  // Fetch Slot and Plot in parallel (independent queries)
  const [slot, plot] = await Promise.all([
    prismaClient.slot.findFirst({
      where: { id: slot_id, user_id: userId }
    }),
    prismaClient.plot.findFirst({
      where: { id: plot_id, user_id: userId },
      include: {
        gurus: true,
        kelas: true,
        mapel: true
      }
    })
  ]);

  if (!slot) {
    return { valid: false, status: 404, message: 'Slot waktu tidak ditemukan!' };
  }

  // 1. Validasi Slot Istirahat
  if (slot.is_istirahat) {
    return { valid: false, status: 422, message: 'Tidak dapat menempatkan pelajaran pada jam istirahat!' };
  }

  if (!plot) {
    return { valid: false, status: 404, message: 'Plot tugas mengajar tidak ditemukan!' };
  }

  // Run teacher clash, class clash, beban jam count, and blocked slot checks in parallel
  const plotGuruIds = plot.gurus.map(g => g.id);
  const [teacherClash, classClash, currentCount, blockedSlot] = await Promise.all([
    // 2. Validasi Guru Bentrok (Anti-Double Mengajar)
    prismaClient.jadwal.findFirst({
      where: {
        user_id: userId,
        slot_id: slot_id,
        plot: {
          gurus: {
            some: {
              id: { in: plotGuruIds }
            }
          }
        },
        NOT: excludeJadwalId ? { id: excludeJadwalId } : undefined
      },
      include: {
        plot: {
          include: {
            gurus: true
          }
        }
      }
    }),
    // 3. Validasi Kelas Bentrok
    prismaClient.jadwal.findFirst({
      where: {
        user_id: userId,
        slot_id: slot_id,
        plot: {
          kelas_id: plot.kelas_id
        },
        NOT: excludeJadwalId ? { id: excludeJadwalId } : undefined
      }
    }),
    // 4. Validasi Kuota Beban Jam
    prismaClient.jadwal.count({
      where: {
        user_id: userId,
        plot_id: plot_id,
        NOT: excludeJadwalId ? { id: excludeJadwalId } : undefined
      }
    }),
    // 5. Validasi Blocked Slot
    prismaClient.blockedSlot.findFirst({
      where: {
        user_id: userId,
        slot_id: slot_id,
        kelas_id: plot.kelas_id
      }
    })
  ]);

  if (teacherClash) {
    const clashingTeacher = teacherClash.plot.gurus.find(g => plotGuruIds.includes(g.id));
    const clashingTeacherName = clashingTeacher ? clashingTeacher.nama_guru : 'Guru';
    return { valid: false, status: 422, message: `Guru ${clashingTeacherName} sudah mengajar di kelas lain pada jam ini!` };
  }

  if (classClash) {
    return { valid: false, status: 422, message: 'Kelas ini sudah memiliki jadwal pelajaran lain pada jam ini!' };
  }

  if (currentCount >= plot.beban_jam) {
    return { valid: false, status: 422, message: 'Jatah jam mengajar untuk mata pelajaran ini sudah habis!' };
  }

  if (blockedSlot) {
    return { valid: false, status: 422, message: `Slot waktu ini sedang diblokir untuk kelas ini (${blockedSlot.label})!` };
  }

  return { valid: true };
}

// ==========================================
// 1. JADWALS ENDPOINTS
// ==========================================
router.get('/jadwals', asyncHandler(async (req, res) => {
  const jadwals = await prisma.jadwal.findMany({
    where: { user_id: req.user.id },
    include: {
      slot: { select: { id: true, hari: true, jam_ke: true, jam_mulai: true, jam_selesai: true, is_istirahat: true, keterangan: true } },
      plot: {
        include: {
          gurus: { select: { id: true, nama_guru: true } },
          mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
          kelas: { select: { id: true, nama_kelas: true } }
        }
      }
    },
    orderBy: { id: 'asc' }
  });
  res.json(jadwals);
}));

router.post('/jadwals', asyncHandler(async (req, res) => {
  const { slot_id, plot_id } = req.body;
  if (!slot_id || !plot_id) {
    return res.status(400).json({ error: 'Slot ID dan Plot ID wajib diisi.' });
  }

  const numericSlotId = parseInt(slot_id);
  const numericPlotId = parseInt(plot_id);

  // Run validation checks
  const check = await validateJadwal(prisma, req.user.id, numericSlotId, numericPlotId);
  if (!check.valid) {
    return res.status(check.status).json({ error: check.message });
  }

  const newJadwal = await prisma.jadwal.create({
    data: {
      slot_id: numericSlotId,
      plot_id: numericPlotId,
      user_id: req.user.id
    },
    include: {
      slot: { select: { id: true, hari: true, jam_ke: true, jam_mulai: true, jam_selesai: true, is_istirahat: true, keterangan: true } },
      plot: {
        include: {
          gurus: { select: { id: true, nama_guru: true } },
          mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
          kelas: { select: { id: true, nama_kelas: true } }
        }
      }
    }
  });

  res.status(201).json(newJadwal);
}));

router.put('/jadwals/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { slot_id, plot_id } = req.body;

  if (!slot_id || !plot_id) {
    return res.status(400).json({ error: 'Slot ID dan Plot ID wajib diisi.' });
  }

  const numericSlotId = parseInt(slot_id);
  const numericPlotId = parseInt(plot_id);

  // Verify ownership
  const targetJadwal = await prisma.jadwal.findFirst({
    where: { id, user_id: req.user.id }
  });
  if (!targetJadwal) {
    return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
  }

  // Run validation checks (with self-exclusion)
  const check = await validateJadwal(prisma, req.user.id, numericSlotId, numericPlotId, id);
  if (!check.valid) {
    return res.status(check.status).json({ error: check.message });
  }

  const updatedJadwal = await prisma.jadwal.update({
    where: { id },
    data: {
      slot_id: numericSlotId,
      plot_id: numericPlotId
    },
    include: {
      slot: { select: { id: true, hari: true, jam_ke: true, jam_mulai: true, jam_selesai: true, is_istirahat: true, keterangan: true } },
      plot: {
        include: {
          gurus: { select: { id: true, nama_guru: true } },
          mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
          kelas: { select: { id: true, nama_kelas: true } }
        }
      }
    }
  });

  res.json(updatedJadwal);
}));

router.delete('/jadwals/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Verify ownership
  const targetJadwal = await prisma.jadwal.findFirst({
    where: { id, user_id: req.user.id }
  });
  if (!targetJadwal) {
    return res.status(404).json({ error: 'Jadwal tidak ditemukan.' });
  }

  await prisma.jadwal.delete({ where: { id } });
  res.json({ message: 'Jadwal pelajaran berhasil dihapus.' });
}));

// ==========================================
// 2. BLOCKED SLOTS
// ==========================================
router.get('/blocked-slots', asyncHandler(async (req, res) => {
  const blockedSlots = await prisma.blockedSlot.findMany({
    where: { user_id: req.user.id }
  });
  res.json(blockedSlots);
}));

router.post('/blocked-slots', asyncHandler(async (req, res) => {
  const { kelas_id, slot_id, label } = req.body;
  if (!kelas_id || !slot_id || !label) {
    return res.status(400).json({ error: 'Kelas ID, Slot ID, dan label wajib diisi.' });
  }

  const numericKelasId = parseInt(kelas_id);
  const numericSlotId = parseInt(slot_id);

  // Check if slot and kelas exist and belong to user
  const verifiedKelas = await prisma.kelas.findFirst({ where: { id: numericKelasId, user_id: req.user.id } });
  const verifiedSlot = await prisma.slot.findFirst({ where: { id: numericSlotId, user_id: req.user.id } });

  if (!verifiedKelas || !verifiedSlot) {
    return res.status(422).json({ error: 'Kelas atau Slot tidak valid.' });
  }

  // Check if there is an existing schedule in this slot for this class
  const existingJadwal = await prisma.jadwal.findFirst({
    where: {
      user_id: req.user.id,
      slot_id: numericSlotId,
      plot: {
        kelas_id: numericKelasId
      }
    }
  });
  if (existingJadwal) {
    return res.status(400).json({ error: 'Tidak dapat mengunci slot yang sudah memiliki jadwal pelajaran!' });
  }

  const blockedSlot = await prisma.blockedSlot.upsert({
    where: {
      kelas_id_slot_id: {
        kelas_id: numericKelasId,
        slot_id: numericSlotId
      }
    },
    update: {
      label: label.trim()
    },
    create: {
      user_id: req.user.id,
      kelas_id: numericKelasId,
      slot_id: numericSlotId,
      label: label.trim()
    }
  });

  res.status(201).json(blockedSlot);
}));

router.delete('/blocked-slots/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Verify ownership
  const targetBlocked = await prisma.blockedSlot.findFirst({
    where: { id, user_id: req.user.id }
  });
  if (!targetBlocked) {
    return res.status(404).json({ error: 'Blocked slot tidak ditemukan.' });
  }

  await prisma.blockedSlot.delete({ where: { id } });
  res.json({ message: 'Slot berhasil dibuka kembali.' });
}));

// ==========================================
// 3. AUTO-FILL SCHEDULER ENGINE
// ==========================================
router.post('/jadwals/auto-fill', asyncHandler(async (req, res) => {
  const { kelas_id } = req.body;
  if (!kelas_id) {
    return res.status(400).json({ error: 'Kelas ID wajib diisi.' });
  }

  const kelasId = parseInt(kelas_id);
  const userId = req.user.id;

  // 1. Fetch class, plots, slots, blocked slots, and existing schedules (OUTSIDE of the transaction)
  const [targetKelas, plots, slots, blockedSlots, existingJadwals] = await Promise.all([
    prisma.kelas.findFirst({ where: { id: kelasId, user_id: userId } }),
    prisma.plot.findMany({
      where: { kelas_id: kelasId, user_id: userId },
      include: { mapel: true, gurus: true }
    }),
    prisma.slot.findMany({
      where: { user_id: userId }
    }),
    prisma.blockedSlot.findMany({
      where: { kelas_id: kelasId, user_id: userId }
    }),
    prisma.jadwal.findMany({
      where: { user_id: userId },
      include: {
        slot: true,
        plot: {
          include: {
            gurus: true,
            kelas: true,
            mapel: true
          }
        }
      }
    })
  ]);

  if (!targetKelas) {
    return res.status(404).json({ error: 'Kelas tidak ditemukan.' });
  }

  // 2. Filter plots that still need scheduling
  const activePlots = plots.map(plot => {
    const scheduledForPlot = existingJadwals.filter(j => j.plot_id === plot.id);
    const remainingHours = Math.max(0, plot.beban_jam - scheduledForPlot.length);
    return {
      ...plot,
      remainingHours
    };
  }).filter(p => p.remainingHours > 0);

  // 3. Sort plots by priority: heavy subjects first, then most teachers, then remaining hours descending
  const HEAVY_SUBJECTS = ['matematika', 'fisika', 'kimia', 'akuntansi', 'bilingual'];
  const isHeavySubject = (name) => {
    if (!name) return false;
    const n = name.toLowerCase();
    return HEAVY_SUBJECTS.some(sub => n.includes(sub));
  };

  activePlots.sort((a, b) => {
    const aHeavy = isHeavySubject(a.mapel?.nama_mapel);
    const bHeavy = isHeavySubject(b.mapel?.nama_mapel);
    if (aHeavy !== bHeavy) return bHeavy ? 1 : -1;

    const aGurusCount = a.gurus ? a.gurus.length : 0;
    const bGurusCount = b.gurus ? b.gurus.length : 0;
    if (aGurusCount !== bGurusCount) return bGurusCount - aGurusCount;

    return b.remainingHours - a.remainingHours;
  });

  // 4. Group and sort slots by day
  const slotsByDay = {};
  slots.forEach(slot => {
    if (!slotsByDay[slot.hari]) {
      slotsByDay[slot.hari] = [];
    }
    slotsByDay[slot.hari].push(slot);
  });

  for (const day in slotsByDay) {
    slotsByDay[day].sort((a, b) => {
      if (a.jam_ke === null) return 1;
      if (b.jam_ke === null) return -1;
      return a.jam_ke - b.jam_ke;
    });
  }

  const activeDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].filter(
    d => slotsByDay[d] && slotsByDay[d].length > 0
  );

  const currentJadwals = [...existingJadwals];
  const newJadwalsToCreate = [];

  const isSlotBlocked = (slotId) => blockedSlots.some(bs => bs.slot_id === slotId);
  const isClassBusy = (slotId) => currentJadwals.some(j => j.slot_id === slotId && j.plot && j.plot.kelas_id === kelasId);
  const isTeacherBusy = (slotId, teacherIds) => {
    if (teacherIds.length === 0) return false;
    return currentJadwals.some(j => {
      if (j.slot_id !== slotId || !j.plot) return false;
      const scheduledGurus = j.plot.gurus ? j.plot.gurus.map(g => g.id) : (j.plot.guru_id ? [j.plot.guru_id] : []);
      return teacherIds.some(id => scheduledGurus.includes(id));
    });
  };

  const findCandidateBlock = (plot, blockSize) => {
    const validCandidates = [];
    const plotGuruIds = plot.gurus ? plot.gurus.map(g => g.id) : (plot.guru_id ? [plot.guru_id] : []);
    const plotIsHeavy = isHeavySubject(plot.mapel?.nama_mapel);

    for (const day of activeDays) {
      const daySlots = slotsByDay[day];
      for (let i = 0; i <= daySlots.length - blockSize; i++) {
        const candidateSlots = daySlots.slice(i, i + blockSize);

        // Check if slots are consecutive and not istirahat
        let consecutive = true;
        for (let k = 0; k < blockSize; k++) {
          const slot = candidateSlots[k];
          if (slot.is_istirahat) {
            consecutive = false;
            break;
          }
          if (k > 0) {
            if (slot.jam_ke === null || candidateSlots[k - 1].jam_ke === null || slot.jam_ke !== candidateSlots[k - 1].jam_ke + 1) {
              consecutive = false;
              break;
            }
          }
        }

        if (!consecutive) continue;

        // Validate constraints
        let valid = true;
        for (const slot of candidateSlots) {
          if (isSlotBlocked(slot.id)) {
            valid = false;
            break;
          }
          if (isClassBusy(slot.id)) {
            valid = false;
            break;
          }
          if (isTeacherBusy(slot.id, plotGuruIds)) {
            valid = false;
            break;
          }
          if (plotIsHeavy) {
            if (slot.jam_ke === null || slot.jam_ke < 1 || slot.jam_ke > 5) {
              valid = false;
              break;
            }
          }
        }

        if (!valid) continue;

        // Scoring for soft constraint: heavy subject distribution
        let score = 0;
        if (plotIsHeavy) {
          const hasOtherHeavyOnDay = currentJadwals.some(j =>
            j.slot &&
            j.slot.hari === day &&
            j.plot &&
            j.plot.kelas_id === kelasId &&
            isHeavySubject(j.plot.mapel?.nama_mapel)
          );
          if (hasOtherHeavyOnDay) {
            score += 100;
          }

          const firstJam = candidateSlots[0].jam_ke;
          const lastJam = candidateSlots[blockSize - 1].jam_ke;

          const adjacentHeavy = currentJadwals.some(j =>
            j.slot &&
            j.slot.hari === day &&
            j.plot &&
            j.plot.kelas_id === kelasId &&
            isHeavySubject(j.plot.mapel?.nama_mapel) &&
            (j.slot.jam_ke === firstJam - 1 || j.slot.jam_ke === lastJam + 1)
          );
          if (adjacentHeavy) {
            score += 500;
          }
        }

        validCandidates.push({
          day,
          slots: candidateSlots,
          score
        });
      }
    }

    if (validCandidates.length > 0) {
      validCandidates.sort((a, b) => a.score - b.score);
      return validCandidates[0];
    }
    return null;
  };

  let iterations = 0;
  const max_iterations = 500;
  let placedCount = 0;
  let skippedCount = 0;

  for (const plot of activePlots) {
    let rem = plot.remainingHours;
    while (rem > 0) {
      iterations++;
      if (iterations > max_iterations) {
        console.warn('Auto-fill reached iteration limit (500), stopping search.');
        break;
      }

      let placed = false;
      const blockSizesToTry = [];
      if (rem >= 3) {
        blockSizesToTry.push(3, 2, 1);
      } else if (rem === 2) {
        blockSizesToTry.push(2, 1);
      } else {
        blockSizesToTry.push(1);
      }

      for (const blockSize of blockSizesToTry) {
        const candidate = findCandidateBlock(plot, blockSize);
        if (candidate) {
          // Place block
          candidate.slots.forEach(slot => {
            const newJadwalEntry = {
              slot_id: slot.id,
              plot_id: plot.id,
              slot: slot,
              plot: plot
            };
            currentJadwals.push(newJadwalEntry);
            newJadwalsToCreate.push({
              slot_id: slot.id,
              plot_id: plot.id,
              user_id: userId
            });
          });

          rem -= blockSize;
          placedCount += blockSize;
          placed = true;
          break;
        }
      }

      if (!placed) {
        skippedCount += rem;
        break;
      }
    }

    if (iterations > max_iterations) {
      break;
    }
  }

  // 5. Save placements using createMany for bulk insertion (extremely fast)
  if (newJadwalsToCreate.length > 0) {
    await prisma.jadwal.createMany({
      data: newJadwalsToCreate
    });
  }

  res.json({
    success: true,
    placedCount,
    skippedCount
  });
}));

export default router;
