import { useEffect, useMemo, useState } from 'react';

const note = 'Your responses are saved on this device only. This organization does not receive your answers unless you choose to share or export them.';

const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function PublicPage({ projectId }: { projectId: number }) {
  const [data, setData] = useState<any>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  const key = useMemo(() => `guideforge:project:${projectId}:responses`, [projectId]);

  useEffect(() => {
    fetch(`http://localhost:4000/api/projects/${projectId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setStatus('Could not load project.'));
  }, [projectId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setResponses(JSON.parse(raw));
    } catch {
      setStatus('Saved responses on this browser are unreadable.');
    }
  }, [key]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(responses));
      } catch {
        setStatus('Could not auto-save. Browser storage may be full or disabled.');
      }
    }, 150);
    return () => clearTimeout(t);
  }, [responses, key]);

  if (!data) return <p>{status || 'Loading...'}</p>;

  const save = () => {
    try {
      localStorage.setItem(key, JSON.stringify(responses));
      setStatus('Progress saved on this device.');
    } catch {
      setStatus('Could not save. Browser storage may be full or disabled.');
    }
  };

  const clear = () => {
    if (confirm('Clear saved responses on this device?')) {
      localStorage.removeItem(key);
      setResponses({});
      setStatus('Saved responses cleared for this activity.');
    }
  };

  const downloadHtml = () => {
    const blocksHtml = (data.blocks || []).map((b: any) => {
      const value = responses[b.id] ?? '';
      return `<article class="block"><h4>${escapeHtml(b.label || '')}</h4><p>${escapeHtml(value)}</p></article>`;
    }).join('');

    const sectionsHtml = (data.sections || []).map((s: any) => `<section><h3>${escapeHtml(s.title || '')}</h3><p>${escapeHtml(s.content || '')}</p></section>`).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(data.project.title || 'GuideForge Activity')}</title><style>body{font-family:Arial,sans-serif;max-width:840px;margin:auto;padding:16px;line-height:1.4}.toolbar{display:none}.block,section{border:1px solid #ddd;border-radius:10px;padding:10px;margin:10px 0}.note{background:#fff7e5;padding:10px;border-radius:8px}@media print{.noprint{display:none}}</style></head><body><h1>${escapeHtml(data.project.title || '')}</h1><p>${escapeHtml(data.project.description || '')}</p><p class="note">${escapeHtml(note)}</p>${sectionsHtml}<h2>Responses</h2>${blocksHtml}<script>console.log('GuideForge offline export loaded')</script></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `guideforge_${projectId}_${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return <div className="container"><h1>{data.project.title}</h1><p>{data.project.description}</p><p className="note">{note}</p>
    {status ? <p>{status}</p> : null}
    {data.blocks.map((b: any) => <label key={b.id} className="card">{b.label}
      <input value={responses[b.id] ?? ''} onChange={(e) => setResponses((prev) => ({ ...prev, [b.id]: e.target.value }))} placeholder={b.placeholder || ''} />
    </label>)}
    <div className="toolbar noprint"><button onClick={save}>Save Progress</button><button onClick={clear}>Clear My Saved Responses</button><button onClick={downloadHtml}>Download My Completed Activity</button><button onClick={() => window.print()}>Print / Save as PDF</button>{data.project.calendar_export_enabled ? <a href={`http://localhost:4000/api/projects/${projectId}/calendar.ics`}>Add This Plan to My Calendar</a> : null}</div></div>;
}
