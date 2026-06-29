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
// 1. EXPORT / IMPORT TEACHER SCHEDULES
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
// 2. MASS IMPORT MASTER DATA EXCEL
// ==========================================
router.post('/import-master', asyncHandler(async (req, res) => {
  const { profil = [], gurus = [], kelas = [], mapels = [], plots = [] } = req.body;

  const getVal = (obj, keys) => {
    if (!obj) return undefined;
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
        return String(obj[k]).trim();
      }
      const foundKey = Object.keys(obj).find(ok => ok.toLowerCase().trim() === k.toLowerCase());
      if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null && String(obj[foundKey]).trim() !== '') {
        return String(obj[foundKey]).trim();
      }
    }
    return undefined;
  };

  try {
    const result = await prisma.$transaction(async (tx) => {
      let profilCount = 0;
      let guruCount = 0;
      let kelasCount = 0;
      let mapelCount = 0;
      let plotCount = 0;

      // 1. Profil Sekolah
      if (Array.isArray(profil) && profil.length > 0) {
        const pRow = profil[0];
        const nama_sekolah = getVal(pRow, ['Nama Sekolah', 'nama_sekolah']) || 'Nama Sekolah';
        const nama_kepala_sekolah = getVal(pRow, ['Nama Kepala Sekolah', 'nama_kepala_sekolah']) || '-';
        const nip_kepala_sekolah = getVal(pRow, ['NIP Kepala Sekolah', 'nip_kepala_sekolah']) || null;
        const nama_penyusun_jadwal = getVal(pRow, ['Nama Penyusun Jadwal', 'nama_penyusun_jadwal']) || '-';
        const nip_penyusun_jadwal = getVal(pRow, ['NIP Penyusun Jadwal', 'nip_penyusun_jadwal']) || null;
        const semester = getVal(pRow, ['Semester', 'semester']) || 'Ganjil';
        const tahun_ajaran = getVal(pRow, ['Tahun Ajaran', 'tahun_ajaran']) || '2026/2027';

        const existingProfile = await tx.schoolProfile.findFirst({
          where: { user_id: req.user.id }
        });

        if (existingProfile) {
          await tx.schoolProfile.update({
            where: { id: existingProfile.id },
            data: {
              nama_sekolah,
              nama_kepala_sekolah,
              nip_kepala_sekolah,
              nama_penyusun_jadwal,
              nip_penyusun_jadwal,
              semester,
              tahun_ajaran
            }
          });
        } else {
          await tx.schoolProfile.create({
            data: {
              nama_sekolah,
              nama_kepala_sekolah,
              nip_kepala_sekolah,
              nama_penyusun_jadwal,
              nip_penyusun_jadwal,
              semester,
              tahun_ajaran,
              user_id: req.user.id
            }
          });
        }
        await tx.user.update({
          where: { id: req.user.id },
          data: { nama_sekolah }
        });
        profilCount = 1;
      }

      // 2. Data Guru
      const existingGurus = await tx.guru.findMany({ where: { user_id: req.user.id } });
      const guruMap = new Map();
      const guruObjMap = new Map();
      existingGurus.forEach(g => {
        guruMap.set(g.nama_guru.toLowerCase().trim(), g.id);
        guruObjMap.set(g.nama_guru.toLowerCase().trim(), g);
      });

      if (Array.isArray(gurus)) {
        for (const row of gurus) {
          const nama_guru = getVal(row, ['Nama Guru', 'nama_guru']);
          if (!nama_guru) continue;
          const nip = getVal(row, ['NIP', 'nip']) || null;
          const key = nama_guru.toLowerCase().trim();

          if (guruMap.has(key)) {
            const existingId = guruMap.get(key);
            const existingObj = guruObjMap.get(key);
            const targetNip = nip || existingObj?.nip || null;
            if (targetNip !== (existingObj?.nip || null)) {
              await tx.guru.update({
                where: { id: existingId },
                data: { nip: targetNip }
              });
              if (existingObj) existingObj.nip = targetNip;
            }
          } else {
            const created = await tx.guru.create({
              data: { nama_guru, nip, user_id: req.user.id }
            });
            guruMap.set(key, created.id);
            guruObjMap.set(key, created);
          }
          guruCount++;
        }
      }

      // 3. Data Kelas
      const existingKelas = await tx.kelas.findMany({ where: { user_id: req.user.id } });
      const kelasMap = new Map();
      existingKelas.forEach(k => {
        kelasMap.set(k.nama_kelas.toLowerCase().trim(), k.id);
      });

      if (Array.isArray(kelas)) {
        for (const row of kelas) {
          const nama_kelas = getVal(row, ['Nama Kelas', 'nama_kelas']);
          if (!nama_kelas) continue;
          const key = nama_kelas.toLowerCase().trim();

          if (!kelasMap.has(key)) {
            const created = await tx.kelas.create({
              data: { nama_kelas, user_id: req.user.id }
            });
            kelasMap.set(key, created.id);
          }
          kelasCount++;
        }
      }

      // 4. Data Mata Pelajaran
      const existingMapels = await tx.mapel.findMany({ where: { user_id: req.user.id } });
      const mapelMap = new Map();
      const mapelObjMap = new Map();
      existingMapels.forEach(m => {
        mapelMap.set(m.nama_mapel.toLowerCase().trim(), m.id);
        mapelObjMap.set(m.nama_mapel.toLowerCase().trim(), m);
      });

      if (Array.isArray(mapels)) {
        for (const row of mapels) {
          const nama_mapel = getVal(row, ['Nama Mata Pelajaran', 'nama_mapel']);
          if (!nama_mapel) continue;
          const kode_mapel = getVal(row, ['Kode Mapel', 'kode_mapel']) || null;
          const key = nama_mapel.toLowerCase().trim();

          if (mapelMap.has(key)) {
            const existingId = mapelMap.get(key);
            const existingObj = mapelObjMap.get(key);
            const targetKode = kode_mapel || existingObj?.kode_mapel || null;
            if (targetKode !== (existingObj?.kode_mapel || null)) {
              await tx.mapel.update({
                where: { id: existingId },
                data: { kode_mapel: targetKode }
              });
              if (existingObj) existingObj.kode_mapel = targetKode;
            }
          } else {
            const created = await tx.mapel.create({
              data: { nama_mapel, kode_mapel, user_id: req.user.id }
            });
            mapelMap.set(key, created.id);
            mapelObjMap.set(key, created);
          }
          mapelCount++;
        }
      }

      // 5. Plotting Beban Mengajar
      const lookupKelasId = (rawStr) => {
        const trimmed = rawStr.trim();
        const lower = trimmed.toLowerCase();
        if (kelasMap.has(lower)) return kelasMap.get(lower);
        for (const [keyName, id] of kelasMap.entries()) {
          if (keyName.replace(/\s+/g, '') === lower.replace(/\s+/g, '')) return id;
        }
        throw new Error(`Kelas "${trimmed}" pada sheet Plotting Beban Mengajar tidak ditemukan pada Data Kelas.`);
      };

      const lookupMapelId = (rawStr) => {
        const trimmed = rawStr.trim();
        const lower = trimmed.toLowerCase();
        if (mapelMap.has(lower)) return mapelMap.get(lower);
        for (const [keyName, id] of mapelMap.entries()) {
          if (keyName.replace(/\s+/g, '') === lower.replace(/\s+/g, '')) return id;
        }
        throw new Error(`Mata Pelajaran "${trimmed}" pada sheet Plotting Beban Mengajar tidak ditemukan pada Data Mata Pelajaran.`);
      };

      const findGuruIds = (rawStr) => {
        if (!rawStr) return [];
        const trimmed = rawStr.trim();
        const lower = trimmed.toLowerCase();
        if (guruMap.has(lower)) {
          return [guruMap.get(lower)];
        }
        const delimiters = [';', '/', '+'];
        for (const delim of delimiters) {
          if (rawStr.includes(delim)) {
            const parts = rawStr.split(delim).map(p => p.trim()).filter(Boolean);
            const ids = [];
            let allFound = true;
            for (const part of parts) {
              const pLower = part.toLowerCase();
              if (guruMap.has(pLower)) {
                ids.push(guruMap.get(pLower));
              } else {
                allFound = false;
                break;
              }
            }
            if (allFound && ids.length > 0) {
              return ids;
            }
          }
        }
        if (rawStr.includes(',')) {
          const parts = rawStr.split(',').map(p => p.trim()).filter(Boolean);
          const ids = [];
          let allFound = true;
          for (const part of parts) {
            const pLower = part.toLowerCase();
            if (guruMap.has(pLower)) {
              ids.push(guruMap.get(pLower));
            } else {
              allFound = false;
              break;
            }
          }
          if (allFound && ids.length > 0) {
            return ids;
          }
        }
        for (const [keyName, id] of guruMap.entries()) {
          if (keyName.replace(/\s+/g, '') === lower.replace(/\s+/g, '')) {
            return [id];
          }
        }
        throw new Error(`Guru dengan nama "${trimmed}" pada sheet Plotting Beban Mengajar tidak ditemukan pada Data Guru.`);
      };

      const existingPlots = await tx.plot.findMany({
        where: { user_id: req.user.id },
        include: { gurus: true }
      });

      if (Array.isArray(plots)) {
        for (const row of plots) {
          const rawKelas = getVal(row, ['Nama Kelas', 'nama_kelas']);
          const rawMapel = getVal(row, ['Nama Mata Pelajaran', 'nama_mapel']);
          const rawGuru = getVal(row, ['Nama Guru', 'nama_guru']);
          const rawBeban = getVal(row, ['Beban Jam', 'beban_jam', 'Beban Jam Mengajar']);

          if (!rawKelas || !rawMapel || !rawGuru) continue;

          const kelas_id = lookupKelasId(rawKelas);
          const mapel_id = lookupMapelId(rawMapel);
          const numericGuruIds = findGuruIds(rawGuru);
          const beban_jam = parseInt(rawBeban) || 2;

          const existingPlot = existingPlots.find(p => {
            const pIds = p.gurus.map(g => g.id).sort();
            const targetIds = [...numericGuruIds].sort();
            return p.mapel_id === mapel_id && p.kelas_id === kelas_id && pIds.length === targetIds.length && pIds.every((val, index) => val === targetIds[index]);
          });

          if (existingPlot) {
            if (existingPlot.beban_jam !== beban_jam) {
              await tx.plot.update({
                where: { id: existingPlot.id },
                data: { beban_jam }
              });
              existingPlot.beban_jam = beban_jam;
            }
          } else {
            const newP = await tx.plot.create({
              data: {
                gurus: {
                  connect: numericGuruIds.map(id => ({ id }))
                },
                mapel_id,
                kelas_id,
                beban_jam,
                user_id: req.user.id
              },
              include: { gurus: true }
            });
            existingPlots.push(newP);
          }
          plotCount++;
        }
      }

      return { profilCount, guruCount, kelasCount, mapelCount, plotCount };
    }, {
      maxWait: 120000,
      timeout: 120000
    });

    res.json({
      success: true,
      message: `Berhasil mengimpor ${result.profilCount} Profil, ${result.guruCount} Guru, ${result.kelasCount} Kelas, ${result.mapelCount} Mapel, dan ${result.plotCount} Plotting`
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Gagal memproses impor data Excel.' });
  }
}));

export default router;
