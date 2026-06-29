import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { seedDefaultSlots } from '../prisma/seed.js';

const router = express.Router();

const globalForPrisma = globalThis;
const prisma = globalForPrisma.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

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
      nama_sekolah: newUser.nama_sekolah,
      role: newUser.role,
      status: newUser.status
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
      nama_sekolah: user.nama_sekolah,
      role: user.role,
      status: user.status
    }
  });
}));

// Endpoint to verify current session and status
router.get('/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ditemukan atau tidak valid.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-scheduling-jwt-key-change-in-production');
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        nama_sekolah: true,
        role: true,
        status: true
      }
    });
    if (!user) {
      return res.status(401).json({ error: 'Pengguna tidak ditemukan.' });
    }
    res.json({ user });
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid.' });
  }
}));

export default router;
