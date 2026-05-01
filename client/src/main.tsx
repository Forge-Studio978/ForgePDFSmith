import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';
import { AdminPage } from './pages/AdminPage';
import { PublicPage } from './pages/PublicPage';
import './styles.css';

function ProjectRoute() {
  const { id } = useParams();
  return <PublicPage projectId={Number(id)} />;
}

function App() {
  return (
    <BrowserRouter>
      <nav><Link to="/admin">Admin</Link></nav>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/p/:id" element={<ProjectRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
