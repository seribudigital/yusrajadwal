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
// 1. SLOTS (DURATIONS & BREAKS ENGINE)
// ==========================================
router.get('/slots', asyncHandler(async (req, res) => {
  const [setting, slots] = await Promise.all([
    prisma.timeSetting.findUnique({
      where: { user_id: req.user.id }
    }),
    prisma.slot.findMany({
      where: { user_id: req.user.id },
      orderBy: [
        { id: 'asc' }
      ]
    })
  ]);

  const active_days = setting ? setting.active_days : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const total_jp = setting ? setting.total_jp : 10;

  // Normalize breaks format
  let rawBreaks = setting ? setting.breaks : [
    { id: 1, after_jp: 5, label: "ISTIRAHAT PAGI" },
    { id: 2, after_jp: 8, label: "ISTIRAHAT SIANG" },
    { id: 3, after_jp: 12, label: "ISTIRAHAT SORE" }
  ];
  if (!Array.isArray(rawBreaks)) rawBreaks = [];
  let configBreaks = rawBreaks;
  // Backwards compatibility with old number array format [4, 7]
  if (rawBreaks.length > 0 && typeof rawBreaks[0] === 'number') {
    configBreaks = rawBreaks.map((b, idx) => ({
      id: idx + 1,
      after_jp: b,
      label: idx === 0 ? "ISTIRAHAT PAGI" : (idx === 1 ? "ISTIRAHAT SIANG" : "ISTIRAHAT SORE")
    }));
  }

  let filteredSlots = [];

  // Process day by day to preserve ordering and correct insertion
  for (const day of active_days) {
    const daySlots = slots.filter(s => s.hari === day);
    
    const dbLessons = daySlots
      .filter(s => s.is_istirahat === false && s.jam_ke !== null)
      .sort((a, b) => a.jam_ke - b.jam_ke);
      
    const dbBreaks = daySlots.filter(s => s.is_istirahat === true);

    // Take only the lesson slots up to total_jp
    const activeLessons = dbLessons.slice(0, total_jp);

    for (let i = 0; i < activeLessons.length; i++) {
      const lessonSlot = activeLessons[i];
      filteredSlots.push(lessonSlot);

      const currentJp = lessonSlot.jam_ke;
      
      // Find if breaks are configured after this JP
      const matchedBreakConfs = configBreaks
        .filter(b => Number(b.after_jp) === Number(currentJp))
        .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

      for (const matchedBreakConf of matchedBreakConfs) {
        // Find database break slot for this day matching the label prefix (e.g. pagi/siang/sore)
        const breakLabel = matchedBreakConf.label || 'ISTIRAHAT';
        const labelKey = breakLabel.toLowerCase();
        
        let matchedDbBreak = null;
        if (labelKey.includes('pagi')) {
          matchedDbBreak = dbBreaks.find(b => b.keterangan && b.keterangan.toLowerCase().includes('pagi'));
        } else if (labelKey.includes('siang')) {
          matchedDbBreak = dbBreaks.find(b => b.keterangan && b.keterangan.toLowerCase().includes('siang'));
        } else if (labelKey.includes('sore')) {
          matchedDbBreak = dbBreaks.find(b => b.keterangan && b.keterangan.toLowerCase().includes('sore'));
        }
        
        // Fallback if not found by name
        if (!matchedDbBreak) {
          const breakIdx = matchedBreakConf.id - 1;
          matchedDbBreak = dbBreaks[breakIdx] || dbBreaks[0];
        }

        // Construct the final break slot
        const finalBreakSlot = matchedDbBreak ? {
          ...matchedDbBreak,
          is_istirahat: true,
          jam_ke: null,
          keterangan: breakLabel
        } : {
          id: 9000 + day.charCodeAt(0) + matchedBreakConf.id, // fake but unique ID
          hari: day,
          jam_ke: null,
          jam_mulai: '12:00',
          jam_selesai: '12:30',
          is_istirahat: true,
          keterangan: breakLabel,
          user_id: req.user.id
        };

        filteredSlots.push(finalBreakSlot);
      }
    }
  }

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json(filteredSlots);
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
// 2. TIME SETTINGS
// ==========================================
router.get('/time-settings', asyncHandler(async (req, res) => {
  const setting = await prisma.timeSetting.findUnique({
    where: { user_id: req.user.id }
  });
  if (!setting) {
    return res.json({
      active_days: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
      total_jp: 10,
      breaks: []
    });
  }
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json(setting);
}));

router.post('/time-settings', asyncHandler(async (req, res) => {
  const { active_days, total_jp, breaks } = req.body;

  if (!Array.isArray(active_days) || typeof total_jp !== 'number' || !Array.isArray(breaks)) {
    return res.status(400).json({ error: 'Input tidak valid.' });
  }

  const setting = await prisma.timeSetting.upsert({
    where: { user_id: req.user.id },
    update: {
      active_days,
      total_jp,
      breaks
    },
    create: {
      user_id: req.user.id,
      active_days,
      total_jp,
      breaks
    }
  });

  res.json(setting);
}));

export default router;
