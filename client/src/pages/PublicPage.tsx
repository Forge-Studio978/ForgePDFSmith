import { useEffect, useMemo, useState } from 'react';

const note = 'Your responses are saved on this device only. This organization does not receive your answers unless you choose to share or export them.';

export function PublicPage({ projectId }: { projectId: number }) {
  const [data, setData] = useState<any>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const key = useMemo(() => `guideforge:project:${projectId}:responses`, [projectId]);

  useEffect(() => { fetch(`http://localhost:4000/api/projects/${projectId}`).then((r) => r.json()).then(setData); }, [projectId]);
  useEffect(() => { const raw = localStorage.getItem(key); if (raw) setResponses(JSON.parse(raw)); }, [key]);
  useEffect(() => { localStorage.setItem(key, JSON.stringify(responses)); }, [responses, key]);

  if (!data) return <p>Loading...</p>;

  const save = () => { localStorage.setItem(key, JSON.stringify(responses)); alert('Progress saved on this device.'); };
  const clear = () => { if (confirm('Clear saved responses on this device?')) { localStorage.removeItem(key); setResponses({}); } };
  const printPage = () => window.print();

  const downloadHtml = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial;padding:16px}button{display:none}@media print{.noprint{display:none}}</style></head><body><h1>${data.project.title}</h1><p>${data.project.description || ''}</p><p><em>${note}</em></p>${data.sections.map((s: any) => `<section><h3>${s.title || ''}</h3><p>${s.content || ''}</p></section>`).join('')}<h2>Responses</h2><pre>${JSON.stringify(responses, null, 2)}</pre><script>console.log('offline view')</script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `guideforge_${projectId}_${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
    a.click();
  };

  return <div className="container"><h1>{data.project.title}</h1><p>{data.project.description}</p><p className="note">{note}</p>
    {data.blocks.map((b: any) => <label key={b.id} className="card">{b.label}
      <input value={responses[b.id] ?? ''} onChange={(e) => setResponses((prev) => ({ ...prev, [b.id]: e.target.value }))} placeholder={b.placeholder || ''} />
    </label>)}
    <div className="toolbar noprint"><button onClick={save}>Save Progress</button><button onClick={clear}>Clear My Saved Responses</button><button onClick={downloadHtml}>Download My Completed Activity</button><button onClick={printPage}>Print / Save as PDF</button>{data.project.calendar_export_enabled ? <a href={`http://localhost:4000/api/projects/${projectId}/calendar.ics`}>Add This Plan to My Calendar</a> : null}</div></div>;
}
