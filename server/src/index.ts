import express from 'express';
import cors from 'cors';
import { projectsRouter } from './routes/projects.js';
import './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static('uploads'));
app.use('/api/projects', projectsRouter);

app.listen(4000, () => console.log('GuideForge API on :4000'));
