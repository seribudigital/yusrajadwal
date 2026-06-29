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

export default router;
