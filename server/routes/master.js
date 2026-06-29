import express from 'express';
import { PrismaClient } from '@prisma/client';
import authMiddleware from '../authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

const globalForPrisma = globalThis;
const prisma = globalForPrisma.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ==========================================
// 1. MASTER DATA: GURUS
// ==========================================
router.get('/gurus', asyncHandler(async (req, res) => {
  const gurus = await prisma.guru.findMany({
    where: { user_id: req.user.id },
    orderBy: { nama_guru: 'asc' }
  });
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
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
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json(kelasList);
}));

router.post('/kelas', asyncHandler(async (req, res) => {
  const { nama_kelas } = req.body;
  if (!nama_kelas) {
    return res.status(400).json({ error: 'Nama kelas wajib diisi.' });
  }

  // Check for duplicate name
  const existingKelas = await prisma.kelas.findFirst({
    where: {
      user_id: req.user.id,
      nama_kelas: {
        equals: nama_kelas.trim(),
        mode: 'insensitive'
      }
    }
  });
  if (existingKelas) {
    return res.status(400).json({ error: 'Kelas dengan nama tersebut sudah terdaftar!' });
  }

  const newKelas = await prisma.kelas.create({
    data: { nama_kelas: nama_kelas.trim(), user_id: req.user.id }
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

  // Check for duplicate name (excluding this kelas itself)
  const existingKelas = await prisma.kelas.findFirst({
    where: {
      user_id: req.user.id,
      nama_kelas: {
        equals: nama_kelas.trim(),
        mode: 'insensitive'
      },
      NOT: {
        id: id
      }
    }
  });
  if (existingKelas) {
    return res.status(400).json({ error: 'Kelas dengan nama tersebut sudah terdaftar!' });
  }

  const updatedKelas = await prisma.kelas.update({
    where: { id },
    data: { nama_kelas: nama_kelas.trim() }
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
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json(mapels);
}));

router.post('/mapels', asyncHandler(async (req, res) => {
  const { nama_mapel, kode_mapel } = req.body;
  if (!nama_mapel) {
    return res.status(400).json({ error: 'Nama mata pelajaran wajib diisi.' });
  }

  // Check for duplicate name
  const existingMapel = await prisma.mapel.findFirst({
    where: {
      user_id: req.user.id,
      nama_mapel: {
        equals: nama_mapel.trim(),
        mode: 'insensitive'
      }
    }
  });
  if (existingMapel) {
    return res.status(400).json({ error: 'Mata pelajaran dengan nama tersebut sudah terdaftar!' });
  }

  const newMapel = await prisma.mapel.create({
    data: { nama_mapel: nama_mapel.trim(), kode_mapel, user_id: req.user.id }
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

  // Check for duplicate name (excluding this mapel itself)
  const existingMapel = await prisma.mapel.findFirst({
    where: {
      user_id: req.user.id,
      nama_mapel: {
        equals: nama_mapel.trim(),
        mode: 'insensitive'
      },
      NOT: {
        id: id
      }
    }
  });
  if (existingMapel) {
    return res.status(400).json({ error: 'Mata pelajaran dengan nama tersebut sudah terdaftar!' });
  }

  const updatedMapel = await prisma.mapel.update({
    where: { id },
    data: { nama_mapel: nama_mapel.trim(), kode_mapel }
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
// 4. PLOTS (PEMBAGIAN TUGAS)
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
// 5. SCHOOL PROFILE (PROFIL SEKOLAH)
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
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
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

export default router;
