import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { db } from '../db.js';
import { convertPdfToSections } from '../services/pdfService.js';
import { generateIcs } from '../services/icsService.js';

const upload = multer({ dest: 'uploads/' });
export const projectsRouter = Router();

projectsRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(rows);
});

projectsRouter.post('/', upload.single('pdf'), async (req, res) => {
  const { title, description } = req.body;
  if (!title || !req.file) return res.status(400).json({ error: 'Title and PDF are required' });

  const sourcePath = path.resolve(req.file.path);
  const result = db.prepare('INSERT INTO projects (title, description, source_pdf_path) VALUES (?, ?, ?)').run(title, description ?? '', sourcePath);
  const projectId = Number(result.lastInsertRowid);

  db.prepare('INSERT INTO pdf_uploads (project_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)')
    .run(projectId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size);

  const sections = await convertPdfToSections(sourcePath);
  if (sections.length) {
    const stmt = db.prepare('INSERT INTO page_sections (project_id, type, title, content, sort_order) VALUES (?, ?, ?, ?, ?)');
    sections.forEach((s) => stmt.run(projectId, s.type, s.title, s.content, s.sort_order));
  }

  res.status(201).json({ id: projectId, converted: sections.length });
});

projectsRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  const sections = db.prepare('SELECT * FROM page_sections WHERE project_id = ? ORDER BY sort_order').all(id);
  const blocks = db.prepare('SELECT * FROM interactive_blocks WHERE project_id = ? ORDER BY sort_order').all(id);
  const calendarItems = db.prepare('SELECT * FROM calendar_items WHERE project_id = ? ORDER BY sort_order').all(id);
  res.json({ project, sections, blocks, calendarItems });
});

projectsRouter.post('/:id/publish', (req, res) => {
  db.prepare('UPDATE projects SET status = ? WHERE id = ?').run(req.body.status === 'published' ? 'published' : 'draft', Number(req.params.id));
  res.json({ ok: true });
});

projectsRouter.get('/:id/calendar.ics', (req, res) => {
  const id = Number(req.params.id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  if (!project || !project.calendar_export_enabled) return res.status(404).json({ error: 'Calendar unavailable' });
  const items = db.prepare('SELECT * FROM calendar_items WHERE project_id = ? ORDER BY sort_order').all(id) as any[];
  const ics = generateIcs(project.title, items);
  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/\s+/g, '_')}.ics"`);
  res.send(ics);
});
