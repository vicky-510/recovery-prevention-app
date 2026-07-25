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

// Every route but one carries a small JSON body. The voice route carries a
// recording, so it is skipped here and parses with its own larger cap rather
// than raising the limit for everything.
const AUDIO_ROUTE = '/api/interventions/voice';
const parseJson = express.json({ limit: '10kb' });

app.use((req, res, next) => (req.path === AUDIO_ROUTE ? next() : parseJson(req, res, next)));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/interventions', interventionRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/me', userRoutes);

app.use(notFound);
app.use(errorHandler);
