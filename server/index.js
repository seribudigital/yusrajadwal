import './envFix.js';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import router from './routes.js';
import proktorRouter from './proktorRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(compression());
app.use(express.json());

// Root path healthcheck
app.get('/', (req, res) => {
  res.json({ message: 'School Scheduling System API is running' });
});

// Load API routes
app.use('/api', router);
app.use('/api/proktor', proktorRouter);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export default app;
