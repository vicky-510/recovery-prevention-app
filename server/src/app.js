import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import interventionRoutes from './routes/intervention.routes.js';
import educationRoutes from './routes/education.routes.js';
import userRoutes from './routes/user.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export const app = express();

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/interventions', interventionRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/me', userRoutes);

app.use(notFound);
app.use(errorHandler);
