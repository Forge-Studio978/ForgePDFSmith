import { useEffect, useState } from 'react';

export function AdminPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pdf, setPdf] = useState<File | null>(null);

  const load = async () => setProjects(await (await fetch('http://localhost:4000/api/projects')).json());
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdf || !title) return;
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', description);
    fd.append('pdf', pdf);
    await fetch('http://localhost:4000/api/projects', { method: 'POST', body: fd });
    setTitle(''); setDescription(''); setPdf(null); load();
  };

  return <div className="container"><h1>GuideForge Admin</h1>
    <form onSubmit={submit} className="card">
      <input placeholder="Project title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} required />
      <button>Create Project (PDF required)</button>
    </form>
    <div>{projects.length === 0 ? <p>No projects yet.</p> : projects.map((p) => <div key={p.id} className="card"><h3>{p.title}</h3><p>{p.status}</p><a href={`/p/${p.id}`}>Public page</a></div>)}</div>
  </div>;
}
