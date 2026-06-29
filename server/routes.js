import express from 'express';
import authRouter from './routes/auth.js';
import masterRouter from './routes/master.js';
import slotsRouter from './routes/slots.js';
import jadwalsRouter from './routes/jadwals.js';
import importRouter from './routes/import.js';

const router = express.Router();

// Mount all modular sub-routers
router.use('/', authRouter);
router.use('/', masterRouter);
router.use('/', slotsRouter);
router.use('/', jadwalsRouter);
router.use('/', importRouter);

export default router;
