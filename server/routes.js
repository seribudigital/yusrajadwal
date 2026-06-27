import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authMiddleware from './authMiddleware.js';
import { seedDefaultSlots } from './prisma/seed.js';

const router = express.Router();
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

// Helper to handle async route errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ==========================================
// AUTHENTICATION ROUTES (UNPROTECTED)
// ==========================================

router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, nama_sekolah } = req.body;

  if (!email || !password || !nama_sekolah) {
    return res.status(400).json({ error: 'Email, password, dan nama sekolah wajib diisi.' });
  }

  // Check if email already registered
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });
  if (existingUser) {
    return res.status(400).json({ error: 'Email ini sudah terdaftar.' });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create User
  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      nama_sekolah
    }
  });

  // Generate 94 default slots for the new user
  await seedDefaultSlots(prisma, newUser.id);

  // Generate default School Profile for the new user
  await prisma.schoolProfile.create({
    data: {
      nama_sekolah: newUser.nama_sekolah,
      nama_kepala_sekolah: 'Nama Kepala Sekolah, M.Pd',
      nip_kepala_sekolah: 'NIP. 197509122002121002',
      nama_penyusun_jadwal: 'Nama Waka Kurikulum, S.Pd',
      nip_penyusun_jadwal: 'NIP. 198304152009042003',
      semester: 'Ganjil',
      tahun_ajaran: '2026/2027',
      tanggal_berlaku: '2026-07-01',
      tanggal_cetak: 'Jakarta, 24 Juni 2026',
      logo_url: null,
      user_id: newUser.id
    }
  });

  // Sign JWT token
  const token = jwt.sign(
    { id: newUser.id, email: newUser.email },
    process.env.JWT_SECRET || 'super-secret-scheduling-jwt-key-change-in-production',
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      nama_sekolah: newUser.nama_sekolah
    }
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });
  if (!user) {
    return res.status(401).json({ error: 'Email atau password salah.' });
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Email atau password salah.' });
  }

  // Sign JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || 'super-secret-scheduling-jwt-key-change-in-production',
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      nama_sekolah: user.nama_sekolah
    }
  });
}));

// ==========================================
// SECURE ALL SUBSEQUENT ROUTES WITH AUTH MIDDLEWARE
// ==========================================
router.use(authMiddleware);

// ==========================================
// 1. MASTER DATA: GURUS
// ==========================================
router.get('/gurus', asyncHandler(async (req, res) => {
  const gurus = await prisma.guru.findMany({
    where: { user_id: req.user.id },
    orderBy: { nama_guru: 'asc' }
  });
  res.json(gurus);
}));

router.post('/gurus', asyncHandler(async (req, res) => {
  const { nama_guru, nip } = req.body;
  if (!nama_guru) {
    return res.status(400).json({ error: 'Nama guru wajib diisi.' });
  }
  const newGuru = await prisma.guru.create({
    data: { nama_guru, nip, user_id: req.user.id }
  });
  res.status(201).json(newGuru);
}));

router.put('/gurus/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { nama_guru, nip } = req.body;
  if (!nama_guru) {
    return res.status(400).json({ error: 'Nama guru wajib diisi.' });
  }

  // Verify ownership before update
  const teacher = await prisma.guru.findFirst({
    where: { id, user_id: req.user.id }
  });
  if (!teacher) {
    return res.status(404).json({ error: 'Guru tidak ditemukan.' });
  }

  const updatedGuru = await prisma.guru.update({
    where: { id },
    data: { nama_guru, nip }
  });
  res.json(updatedGuru);
}));

router.delete('/gurus/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Verify ownership before delete
  const teacher = await prisma.guru.findFirst({
    where: { id, user_id: req.user.id }
  });
  if (!teacher) {
    return res.status(404).json({ error: 'Guru tidak ditemukan.' });
  }

  // Find all plots associated with this guru
  const plotsWithGuru = await prisma.plot.findMany({
    where: {
      gurus: {
        some: {
          id: id
        }
      }
    }
  });

  await prisma.guru.delete({ where: { id } });

  // Clean up plots that now have 0 gurus left
  const remainingPlots = await prisma.plot.findMany({
    where: {
      id: { in: plotsWithGuru.map(p => p.id) }
    },
    include: {
      gurus: true
    }
  });
  const plotsToDelete = remainingPlots.filter(p => p.gurus.length === 0).map(p => p.id);
  if (plotsToDelete.length > 0) {
    await prisma.plot.deleteMany({
      where: {
        id: { in: plotsToDelete }
      }
    });
  }

  res.json({ message: 'Guru berhasil dihapus.' });
}));

// ==========================================
// 2. MASTER DATA: KELAS
// ==========================================
router.get('/kelas', asyncHandler(async (req, res) => {
  const kelasList = await prisma.kelas.findMany({
    where: { user_id: req.user.id },
    orderBy: { nama_kelas: 'asc' }
  });
  res.json(kelasList);
}));

router.post('/kelas', asyncHandler(async (req, res) => {
  const { nama_kelas } = req.body;
  if (!nama_kelas) {
    return res.status(400).json({ error: 'Nama kelas wajib diisi.' });
  }
  const newKelas = await prisma.kelas.create({
    data: { nama_kelas, user_id: req.user.id }
  });
  res.status(201).json(newKelas);
}));

router.put('/kelas/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { nama_kelas } = req.body;
  if (!nama_kelas) {
    return res.status(400).json({ error: 'Nama kelas wajib diisi.' });
  }

  // Verify ownership
  const targetKelas = await prisma.kelas.findFirst({
    where: { id, user_id: req.user.id }
  });
  if (!targetKelas) {
    return res.status(404).json({ error: 'Kelas tidak ditemukan.' });
  }

  const updatedKelas = await prisma.kelas.update({
    where: { id },
    data: { nama_kelas }
  });
  res.json(updatedKelas);
}));

router.delete('/kelas/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Verify ownership
  const targetKelas = await prisma.kelas.findFirst({
    where: { id, user_id: req.user.id }
  });
  if (!targetKelas) {
    return res.status(404).json({ error: 'Kelas tidak ditemukan.' });
  }

  await prisma.kelas.delete({ where: { id } });
  res.json({ message: 'Kelas berhasil dihapus.' });
}));

// ==========================================
// 3. MASTER DATA: MAPELS
// ==========================================
router.get('/mapels', asyncHandler(async (req, res) => {
  const mapels = await prisma.mapel.findMany({
    where: { user_id: req.user.id },
    orderBy: { nama_mapel: 'asc' }
  });
  res.json(mapels);
}));

router.post('/mapels', asyncHandler(async (req, res) => {
  const { nama_mapel, kode_mapel } = req.body;
  if (!nama_mapel) {
    return res.status(400).json({ error: 'Nama mata pelajaran wajib diisi.' });
  }
  const newMapel = await prisma.mapel.create({
    data: { nama_mapel, kode_mapel, user_id: req.user.id }
  });
  res.status(201).json(newMapel);
}));

router.put('/mapels/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { nama_mapel, kode_mapel } = req.body;
  if (!nama_mapel) {
    return res.status(400).json({ error: 'Nama mata pelajaran wajib diisi.' });
  }

  // Verify ownership
  const targetMapel = await prisma.mapel.findFirst({
    where: { id, user_id: req.user.id }
  });
  if (!targetMapel) {
    return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan.' });
  }

  const updatedMapel = await prisma.mapel.update({
    where: { id },
    data: { nama_mapel, kode_mapel }
  });
  res.json(updatedMapel);
}));

router.delete('/mapels/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Verify ownership
  const targetMapel = await prisma.mapel.findFirst({
    where: { id, user_id: req.user.id }
  });
  if (!targetMapel) {
    return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan.' });
  }

  await prisma.mapel.delete({ where: { id } });
  res.json({ message: 'Mata pelajaran berhasil dihapus.' });
}));

// ==========================================
// 4. MASTER DATA: SLOTS
// ==========================================
router.get('/slots', asyncHandler(async (req, res) => {
  const slots = await prisma.slot.findMany({
    where: { user_id: req.user.id },
    orderBy: [
      { id: 'asc' }
    ]
  });
  res.json(slots);
}));

router.put('/slots/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { hari, jam_ke, jam_mulai, jam_selesai, is_istirahat, keterangan } = req.body;
  
  if (!hari || !jam_mulai || !jam_selesai) {
    return res.status(400).json({ error: 'Hari, jam mulai, dan jam selesai wajib diisi.' });
  }

  // Verify ownership
  const targetSlot = await prisma.slot.findFirst({
    where: { id, user_id: req.user.id }
  });
  if (!targetSlot) {
    return res.status(404).json({ error: 'Slot waktu tidak ditemukan.' });
  }

  const updatedSlot = await prisma.slot.update({
    where: { id },
    data: {
      hari,
      jam_ke: jam_ke !== undefined ? jam_ke : null,
      jam_mulai,
      jam_selesai,
      is_istirahat: !!is_istirahat,
      keterangan
    }
  });
  res.json(updatedSlot);
}));

// ==========================================
// 5. PLOTS (PEMBAGIAN TUGAS)
// ==========================================
router.get('/plots', asyncHandler(async (req, res) => {
  const plots = await prisma.plot.findMany({
    where: { user_id: req.user.id },
    include: {
      gurus: true,
      mapel: true,
      kelas: true
    },
    orderBy: { id: 'asc' }
  });
  res.json(plots);
}));

router.post('/plots', asyncHandler(async (req, res) => {
  const { guru_id, guru_ids, mapel_id, kelas_id, beban_jam } = req.body;
  
  let numericGuruIds = [];
  if (Array.isArray(guru_ids)) {
    numericGuruIds = guru_ids.map(id => parseInt(id));
  } else if (guru_id) {
    numericGuruIds = [parseInt(guru_id)];
  }

  if (numericGuruIds.length === 0 || !mapel_id || !kelas_id || beban_jam === undefined) {
    return res.status(400).json({ error: 'Guru, Mapel, Kelas, dan Beban Jam wajib diisi.' });
  }

  const numericMapelId = parseInt(mapel_id);
  const numericKelasId = parseInt(kelas_id);

  // Check unique combination scoped to user
  const existingPlots = await prisma.plot.findMany({
    where: {
      user_id: req.user.id,
      mapel_id: numericMapelId,
      kelas_id: numericKelasId
    },
    include: {
      gurus: true
    }
  });

  const existingPlot = existingPlots.find(p => {
    const pIds = p.gurus.map(g => g.id).sort();
    const targetIds = [...numericGuruIds].sort();
    return pIds.length === targetIds.length && pIds.every((val, index) => val === targetIds[index]);
  });

  if (existingPlot) {
    return res.status(400).json({ 
      error: 'Kombinasi Guru, Mata Pelajaran, dan Kelas ini sudah terdaftar!',
      existingPlotId: existingPlot.id
    });
  }

  // Verify relation fields exist and belong to user
  const verifiedGurus = await prisma.guru.findMany({ where: { id: { in: numericGuruIds }, user_id: req.user.id } });
  const verifiedMapel = await prisma.mapel.findFirst({ where: { id: numericMapelId, user_id: req.user.id } });
  const verifiedKelas = await prisma.kelas.findFirst({ where: { id: numericKelasId, user_id: req.user.id } });

  if (verifiedGurus.length !== numericGuruIds.length || !verifiedMapel || !verifiedKelas) {
    return res.status(422).json({ error: 'Guru, Mapel, atau Kelas tidak valid.' });
  }

  const newPlot = await prisma.plot.create({
    data: {
      gurus: {
        connect: numericGuruIds.map(id => ({ id }))
      },
      mapel_id: numericMapelId,
      kelas_id: numericKelasId,
      beban_jam: parseInt(beban_jam),
      user_id: req.user.id
    },
    include: {
      gurus: true,
      mapel: true,
      kelas: true
    }
  });
  res.status(201).json(newPlot);
}));

router.put('/plots/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { guru_id, guru_ids, mapel_id, kelas_id, beban_jam } = req.body;

  let numericGuruIds = [];
  if (Array.isArray(guru_ids)) {
    numericGuruIds = guru_ids.map(id => parseInt(id));
  } else if (guru_id) {
    numericGuruIds = [parseInt(guru_id)];
  }

  if (numericGuruIds.length === 0 || !mapel_id || !kelas_id || beban_jam === undefined) {
    return res.status(400).json({ error: 'Guru, Mapel, Kelas, dan Beban Jam wajib diisi.' });
  }

  const numericMapelId = parseInt(mapel_id);
  const numericKelasId = parseInt(kelas_id);

  // Verify ownership
  const targetPlot = await prisma.plot.findFirst({
    where: { id, user_id: req.user.id }
  });
  if (!targetPlot) {
    return res.status(404).json({ error: 'Plot tugas mengajar tidak ditemukan.' });
  }

  // Check unique combination excluding self, scoped to user
  const existingPlots = await prisma.plot.findMany({
    where: {
      user_id: req.user.id,
      mapel_id: numericMapelId,
      kelas_id: numericKelasId,
      NOT: { id: id }
    },
    include: {
      gurus: true
    }
  });

  const existingPlot = existingPlots.find(p => {
    const pIds = p.gurus.map(g => g.id).sort();
    const targetIds = [...numericGuruIds].sort();
    return pIds.length === targetIds.length && pIds.every((val, index) => val === targetIds[index]);
  });

  if (existingPlot) {
    return res.status(400).json({ 
      error: 'Kombinasi Guru, Mata Pelajaran, dan Kelas ini sudah terdaftar!',
      existingPlotId: existingPlot.id
    });
  }

  // Verify relation fields exist and belong to user
  const verifiedGurus = await prisma.guru.findMany({ where: { id: { in: numericGuruIds }, user_id: req.user.id } });
  const verifiedMapel = await prisma.mapel.findFirst({ where: { id: numericMapelId, user_id: req.user.id } });
  const verifiedKelas = await prisma.kelas.findFirst({ where: { id: numericKelasId, user_id: req.user.id } });

  if (verifiedGurus.length !== numericGuruIds.length || !verifiedMapel || !verifiedKelas) {
    return res.status(422).json({ error: 'Guru, Mapel, atau Kelas tidak valid.' });
  }

  const updatedPlot = await prisma.plot.update({
    where: { id },
    data: {
      gurus: {
        set: numericGuruIds.map(id => ({ id }))
      },
      mapel_id: numericMapelId,
      kelas_id: numericKelasId,
      beban_jam: parseInt(beban_jam)
    },
    include: {
      gurus: true,
      mapel: true,
      kelas: true
    }
  });
  res.json(updatedPlot);
}));

router.delete('/plots/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Verify ownership
  const targetPlot = await prisma.plot.findFirst({
    where: { id, user_id: req.user.id }
  });
  if (!targetPlot) {
    return res.status(404).json({ error: 'Plot tugas mengajar tidak ditemukan.' });
  }

  await prisma.plot.delete({ where: { id } });
  res.json({ message: 'Plot tugas mengajar berhasil dihapus.' });
}));

// ==========================================
// 6. JADWALS (UTAMA - PENJADWALAN)
// ==========================================

// Helper validation function scoped to user
async function validateJadwal(prismaClient, userId, slot_id, plot_id, excludeJadwalId = null) {
  // Fetch Slot
  const slot = await prismaClient.slot.findFirst({
    where: { id: slot_id, user_id: userId }
  });
  if (!slot) {
    return { valid: false, status: 404, message: 'Slot waktu tidak ditemukan!' };
  }

  // 1. Validasi Slot Istirahat
  if (slot.is_istirahat) {
    return { valid: false, status: 422, message: 'Tidak dapat menempatkan pelajaran pada jam istirahat!' };
  }

  // Fetch Plot
  const plot = await prismaClient.plot.findFirst({
    where: { id: plot_id, user_id: userId },
    include: {
      gurus: true,
      kelas: true,
      mapel: true
    }
  });
  if (!plot) {
    return { valid: false, status: 404, message: 'Plot tugas mengajar tidak ditemukan!' };
  }

  // 2. Validasi Guru Bentrok (Anti-Double Mengajar)
  // Check if this teacher is scheduled in another class at the same slot
  const plotGuruIds = plot.gurus.map(g => g.id);
  const teacherClash = await prismaClient.jadwal.findFirst({
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
  });
  if (teacherClash) {
    const clashingTeacher = teacherClash.plot.gurus.find(g => plotGuruIds.includes(g.id));
    const clashingTeacherName = clashingTeacher ? clashingTeacher.nama_guru : 'Guru';
    return { valid: false, status: 422, message: `Guru ${clashingTeacherName} sudah mengajar di kelas lain pada jam ini!` };
  }

  // 3. Validasi Kelas Bentrok
  // Check if this class is already occupied at the same slot
  const classClash = await prismaClient.jadwal.findFirst({
    where: {
      user_id: userId,
      slot_id: slot_id,
      plot: {
        kelas_id: plot.kelas_id
      },
      NOT: excludeJadwalId ? { id: excludeJadwalId } : undefined
    }
  });
  if (classClash) {
    return { valid: false, status: 422, message: 'Kelas ini sudah memiliki jadwal pelajaran lain pada jam ini!' };
  }

  // 4. Validasi Kuota Beban Jam
  // Check if count of schedules for this plot exceeds beban_jam
  const currentCount = await prismaClient.jadwal.count({
    where: {
      user_id: userId,
      plot_id: plot_id,
      NOT: excludeJadwalId ? { id: excludeJadwalId } : undefined
    }
  });
  if (currentCount >= plot.beban_jam) {
    return { valid: false, status: 422, message: 'Jatah jam mengajar untuk mata pelajaran ini sudah habis!' };
  }

  // 5. Validasi Blocked Slot (Slot Terkunci/Kustom)
  const blockedSlot = await prismaClient.blockedSlot.findFirst({
    where: {
      user_id: userId,
      slot_id: slot_id,
      kelas_id: plot.kelas_id
    }
  });
  if (blockedSlot) {
    return { valid: false, status: 422, message: `Slot waktu ini sedang diblokir untuk kelas ini (${blockedSlot.label})!` };
  }

  return { valid: true };
}

// GET all schedules
router.get('/jadwals', asyncHandler(async (req, res) => {
  const jadwals = await prisma.jadwal.findMany({
    where: { user_id: req.user.id },
    include: {
      slot: true,
      plot: {
        include: {
          gurus: true,
          mapel: true,
          kelas: true
        }
      }
    },
    orderBy: { id: 'asc' }
  });
  res.json(jadwals);
}));

// POST save schedule
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
      slot: true,
      plot: {
        include: {
          gurus: true,
          mapel: true,
          kelas: true
        }
      }
    }
  });

  res.status(201).json(newJadwal);
}));

// PUT update schedule
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

  // Run validation checks (excluding the current Jadwal ID)
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
      slot: true,
      plot: {
        include: {
          gurus: true,
          mapel: true,
          kelas: true
        }
      }
    }
  });

  res.json(updatedJadwal);
}));

// DELETE delete schedule
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
// 7. SCHOOL PROFILE (PROFIL SEKOLAH)
// ==========================================
router.get('/school-profile', asyncHandler(async (req, res) => {
  let profile = await prisma.schoolProfile.findFirst({
    where: { user_id: req.user.id }
  });
  if (!profile) {
    profile = await prisma.schoolProfile.create({
      data: {
        nama_sekolah: 'Nama Sekolah Anda',
        nama_kepala_sekolah: 'Nama Kepala Sekolah, M.Pd',
        nip_kepala_sekolah: 'NIP. 197509122002121002',
        nama_penyusun_jadwal: 'Nama Waka Kurikulum, S.Pd',
        nip_penyusun_jadwal: 'NIP. 198304152009042003',
        semester: 'Ganjil',
        tahun_ajaran: '2026/2027',
        tanggal_berlaku: '2026-07-01',
        tanggal_cetak: 'Jakarta, 24 Juni 2026',
        logo_url: null,
        user_id: req.user.id
      }
    });
  }
  res.json(profile);
}));

router.put('/school-profile', asyncHandler(async (req, res) => {
  const {
    nama_sekolah,
    nama_kepala_sekolah,
    nip_kepala_sekolah,
    nama_penyusun_jadwal,
    nip_penyusun_jadwal,
    semester,
    tahun_ajaran,
    tanggal_berlaku,
    tanggal_cetak,
    logo_url
  } = req.body;

  if (!nama_sekolah || !nama_kepala_sekolah || !nama_penyusun_jadwal || !semester || !tahun_ajaran) {
    return res.status(400).json({ error: 'Nama Sekolah, Kepala Sekolah, Penyusun Jadwal, Semester, dan Tahun Ajaran wajib diisi.' });
  }

  let profile = await prisma.schoolProfile.findFirst({
    where: { user_id: req.user.id }
  });
  if (profile) {
    profile = await prisma.schoolProfile.update({
      where: { id: profile.id },
      data: {
        nama_sekolah,
        nama_kepala_sekolah,
        nip_kepala_sekolah,
        nama_penyusun_jadwal,
        nip_penyusun_jadwal,
        semester,
        tahun_ajaran,
        tanggal_berlaku,
        tanggal_cetak,
        logo_url
      }
    });
  } else {
    profile = await prisma.schoolProfile.create({
      data: {
        nama_sekolah,
        nama_kepala_sekolah,
        nip_kepala_sekolah,
        nama_penyusun_jadwal,
        nip_penyusun_jadwal,
        semester,
        tahun_ajaran,
        tanggal_berlaku,
        tanggal_cetak,
        logo_url,
        user_id: req.user.id
      }
    });
  }
  res.json(profile);
}));

// ==========================================
// 8. EXPORT / IMPORT TEACHER SCHEDULES
// ==========================================
router.get('/gurus/:id/export', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const teacher = await prisma.guru.findFirst({
    where: { id, user_id: req.user.id },
    include: {
      plots: {
        where: { user_id: req.user.id },
        include: {
          kelas: true,
          jadwals: {
            where: { user_id: req.user.id },
            include: {
              slot: true
            }
          }
        }
      }
    }
  });

  if (!teacher) {
    return res.status(404).json({ error: 'Guru tidak ditemukan.' });
  }

  const occupied_slots = [];
  teacher.plots.forEach((plot) => {
    plot.jadwals.forEach((jadwal) => {
      occupied_slots.push({
        hari: jadwal.slot.hari,
        jam_ke: jadwal.slot.jam_ke,
        jam_mulai: jadwal.slot.jam_mulai,
        jam_selesai: jadwal.slot.jam_selesai
      });
    });
  });

  res.json({
    nama_guru: teacher.nama_guru,
    nip: teacher.nip,
    occupied_slots
  });
}));

router.post('/gurus/import', asyncHandler(async (req, res) => {
  const { nama_guru, nip, occupied_slots } = req.body;

  if (!nama_guru || !Array.isArray(occupied_slots)) {
    return res.status(400).json({ error: 'Nama Guru dan data occupied_slots wajib diisi.' });
  }

  // 1. Find or create Guru
  let teacher = null;
  if (nip) {
    teacher = await prisma.guru.findFirst({
      where: { nip, user_id: req.user.id }
    });
  }
  if (!teacher) {
    teacher = await prisma.guru.findFirst({
      where: {
        nama_guru: {
          equals: nama_guru
        },
        user_id: req.user.id
      }
    });
  }
  if (!teacher) {
    teacher = await prisma.guru.create({
      data: { nama_guru, nip, user_id: req.user.id }
    });
  }

  // 2. Find or create "OFFLINE" Kelas
  let offlineClass = await prisma.kelas.findFirst({
    where: {
      nama_kelas: {
        equals: 'OFFLINE'
      },
      user_id: req.user.id
    }
  });
  if (!offlineClass) {
    offlineClass = await prisma.kelas.create({
      data: { nama_kelas: 'OFFLINE', user_id: req.user.id }
    });
  }

  // 3. Find or create "OFFLINE" Mapel
  let offlineMapel = await prisma.mapel.findFirst({
    where: {
      nama_mapel: {
        equals: 'OFFLINE'
      },
      user_id: req.user.id
    }
  });
  if (!offlineMapel) {
    offlineMapel = await prisma.mapel.create({
      data: { nama_mapel: 'OFFLINE', kode_mapel: 'OFFLINE', user_id: req.user.id }
    });
  }

  // 4. Find or create Plot for the offline blockout
  let offlinePlot = await prisma.plot.findFirst({
    where: {
      kelas_id: offlineClass.id,
      mapel_id: offlineMapel.id,
      gurus: {
        some: {
          id: teacher.id
        }
      },
      user_id: req.user.id
    }
  });
  if (!offlinePlot) {
    offlinePlot = await prisma.plot.create({
      data: {
        gurus: {
          connect: { id: teacher.id }
        },
        kelas_id: offlineClass.id,
        mapel_id: offlineMapel.id,
        beban_jam: 100,
        user_id: req.user.id
      }
    });
  }

  const allSlots = await prisma.slot.findMany({
    where: { user_id: req.user.id }
  });

  // 5. Match and insert schedules
  let importedCount = 0;
  for (const item of occupied_slots) {
    const matchedSlot = allSlots.find((s) => 
      s.hari === item.hari &&
      ((item.jam_ke !== null && s.jam_ke === item.jam_ke) ||
       (item.jam_ke === null && s.jam_mulai === item.jam_mulai && s.jam_selesai === item.jam_selesai))
    );

    if (matchedSlot) {
      const existingJadwal = await prisma.jadwal.findFirst({
        where: {
          slot_id: matchedSlot.id,
          plot: {
            gurus: {
              some: {
                id: teacher.id
              }
            }
          },
          user_id: req.user.id
        }
      });

      if (!existingJadwal) {
        await prisma.jadwal.create({
          data: {
            slot_id: matchedSlot.id,
            plot_id: offlinePlot.id,
            user_id: req.user.id
          }
        });
        importedCount++;
      }
    }
  }

  res.json({
    message: 'Jadwal berhasil diimpor.',
    guru: teacher,
    imported_count: importedCount
  });
}));

// ==========================================
// 8. BLOCKED SLOTS (FITUR PREMIUM - KUSTOM BLOK PER KELAS)
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
      label,
      user_id: req.user.id
    },
    create: {
      kelas_id: numericKelasId,
      slot_id: numericSlotId,
      label,
      user_id: req.user.id
    }
  });

  res.status(201).json(blockedSlot);
}));

router.delete('/blocked-slots/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  // Verify ownership
  const targetBlockedSlot = await prisma.blockedSlot.findFirst({
    where: { id, user_id: req.user.id }
  });
  if (!targetBlockedSlot) {
    return res.status(404).json({ error: 'Kunci slot tidak ditemukan.' });
  }

  await prisma.blockedSlot.delete({ where: { id } });
  res.json({ message: 'Kunci slot berhasil dihapus.' });
}));

export default router;
