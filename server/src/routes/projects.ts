import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { db } from '../db.js';
import { convertPdfToSections } from '../services/pdfService.js';
import { generateIcs } from '../services/icsService.js';

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF uploads are allowed'));
    cb(null, true);
  },
});

export const projectsRouter = Router();

projectsRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(rows);
});

projectsRouter.post('/', upload.single('pdf'), async (req, res) => {
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();

  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!req.file) return res.status(400).json({ error: 'PDF upload is required' });

  const sourcePath = path.resolve(req.file.path);
  const result = db.prepare('INSERT INTO projects (title, description, source_pdf_path) VALUES (?, ?, ?)').run(title, description, sourcePath);
  const projectId = Number(result.lastInsertRowid);

  db.prepare('INSERT INTO pdf_uploads (project_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)')
    .run(projectId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size);

  const sections = await convertPdfToSections(sourcePath);
  if (sections.length) {
    const stmt = db.prepare('INSERT INTO page_sections (project_id, type, title, content, sort_order) VALUES (?, ?, ?, ?, ?)');
    sections.forEach((s) => stmt.run(projectId, s.type, s.title, s.content, s.sort_order));
  } else {
    db.prepare('INSERT INTO page_sections (project_id, type, title, content, sort_order) VALUES (?, ?, ?, ?, ?)')
      .run(projectId, 'paragraph', 'Manual Editing Required', 'We could not extract text from this PDF. Add/edit content manually in the admin editor.', 0);
  }

  res.status(201).json({ id: projectId, converted: sections.length, needsManualEdit: sections.length === 0 });
});

projectsRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid project id' });

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const sections = db.prepare('SELECT * FROM page_sections WHERE project_id = ? ORDER BY sort_order').all(id);
  const blocks = db.prepare('SELECT * FROM interactive_blocks WHERE project_id = ? ORDER BY sort_order').all(id);
  const calendarItems = db.prepare('SELECT * FROM calendar_items WHERE project_id = ? ORDER BY sort_order').all(id);
  res.json({ project, sections, blocks, calendarItems });
});

projectsRouter.post('/:id/publish', (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid project id' });

  const status = req.body.status === 'published' ? 'published' : 'draft';
  db.prepare('UPDATE projects SET status = ? WHERE id = ?').run(status, id);
  res.json({ ok: true, status });
});

projectsRouter.get('/:id/calendar.ics', (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid project id' });

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  if (!project || !project.calendar_export_enabled) return res.status(404).json({ error: 'Calendar unavailable' });

  const items = db.prepare('SELECT * FROM calendar_items WHERE project_id = ? ORDER BY sort_order').all(id) as any[];
  const ics = generateIcs(project.title, items);
  const fileName = `${String(project.title || 'guideforge_plan').replace(/[^a-z0-9_-]+/gi, '_')}.ics`;

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(ics);
});

projectsRouter.use((err: Error, _req: any, res: any, _next: any) => {
  if (/Only PDF uploads are allowed/.test(err.message)) return res.status(400).json({ error: err.message });
  if (/File too large/.test(err.message)) return res.status(400).json({ error: 'PDF exceeds 25MB limit' });
  res.status(500).json({ error: 'Unexpected upload error' });
});

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads', { recursive: true });
