# GuideForge MVP

GuideForge is a mobile-first PDF-to-interactive-webpage generator.

## Stack
- Frontend: React + TypeScript
- Backend: Node + Express + TypeScript
- DB: SQLite
- Uploads: local filesystem (`server/uploads`)

## Run
### Backend
```bash
cd server
npm install
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

## MVP Flow
1. Admin creates project with required PDF upload.
2. Backend stores project, PDF metadata, and file.
3. Backend attempts text extraction and creates editable sections.
4. Admin edits sections/blocks and publishes.
5. Public page loads published content and stores responses in `localStorage` only.
6. User can export completed HTML, print to PDF, and optionally download ICS calendar.

## Notes
- Public user responses are **never** stored on the server.
- PDF extraction can fail for scanned PDFs; admin manual editing is supported.
