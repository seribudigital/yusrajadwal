import jwt from 'jsonwebtoken';
import prisma from './prismaClient.js';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan atau tidak valid.' });
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
      return res.status(401).json({ error: 'Sesi Anda telah berakhir atau token tidak valid. Silakan login kembali.' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'Akun Anda telah ditangguhkan oleh proktor.',
        status: 'SUSPENDED',
        user
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesi Anda telah berakhir atau token tidak valid. Silakan login kembali.' });
  }
};

export default authMiddleware;
