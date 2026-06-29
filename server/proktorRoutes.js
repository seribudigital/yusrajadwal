import express from 'express';
import { PrismaClient } from '@prisma/client';
import authMiddleware from './authMiddleware.js';

const router = express.Router();
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware: Require SUPER_ADMIN
export const requireSuperAdmin = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak valid.' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }
    if (user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Akses ditolak. Area khusus Super Admin / Proktor.' });
    }
    req.user.role = user.role;
    req.user.status = user.status;
    next();
  } catch (err) {
    next(err);
  }
};

// 1. GET /api/proktor/dashboard - Global stats
router.get('/dashboard', authMiddleware, requireSuperAdmin, asyncHandler(async (req, res) => {
  const [totalUsers, totalGurus, totalMapels, totalPlots, totalJadwals] = await Promise.all([
    prisma.user.count(),
    prisma.guru.count(),
    prisma.mapel.count(),
    prisma.plot.count(),
    prisma.jadwal.count()
  ]);

  res.json({
    totalUsers,
    totalGurus,
    totalMapels,
    totalPlots,
    totalJadwals
  });
}));

// 2. GET /api/proktor/users - List all registered schools
router.get('/users', authMiddleware, requireSuperAdmin, asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      nama_sekolah: true,
      role: true,
      status: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  res.json(users);
}));

// 3. PUT /api/proktor/users/:id/status - Freeze/suspend/activate school account
router.put('/users/:id/status', authMiddleware, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['ACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Status tidak valid. Harus ACTIVE atau SUSPENDED.' });
  }

  const userId = parseInt(id);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'ID pengguna tidak valid.' });
  }

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Anda tidak dapat mengubah status akun Anda sendiri.' });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: {
      id: true,
      email: true,
      nama_sekolah: true,
      role: true,
      status: true
    }
  });

  res.json(updatedUser);
}));

// DELETE /api/proktor/users/:id - Delete school account
router.delete('/users/:id', authMiddleware, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = parseInt(id);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'ID pengguna tidak valid.' });
  }

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri.' });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }
  if (targetUser.role === 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Akun Super Admin tidak dapat dihapus.' });
  }

  await prisma.user.delete({ where: { id: userId } });
  res.json({ message: 'Akun berhasil dihapus.' });
}));

// 4. POST /api/proktor/broadcast - Save global announcement banner text
router.post('/broadcast', authMiddleware, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (text === undefined) {
    return res.status(400).json({ error: 'Text pengumuman wajib disertakan.' });
  }

  const announcement = await prisma.announcement.create({
    data: { text: text.trim() }
  });

  res.json(announcement);
}));

// 5. GET /api/proktor/announcement - Retrieve current announcement banner text (for all users)
router.get('/announcement', authMiddleware, asyncHandler(async (req, res) => {
  const announcement = await prisma.announcement.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  res.json(announcement || { text: '' });
}));

export default router;
