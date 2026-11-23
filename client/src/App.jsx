import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewAnalysis from './pages/NewAnalysis.jsx';
import Report from './pages/Report.jsx';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const nav = useNavigate();

  useEffect(() => { api.me().then(setUser).catch(() => setUser(null)); }, []);
  if (user === undefined) return <p className="center muted">Loading…</p>;

  const signOut = async () => { await api.logout(); setUser(null); nav('/login'); };

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={setUser} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <>
      <header className="bar">
        <Link to="/" className="brand">BugSight</Link>
        <nav>
          <Link to="/">Reports</Link>
          <Link to="/new" className="btn small">New analysis</Link>
        </nav>
        <div className="who">
          {user.avatar && <img src={user.avatar} alt="" referrerPolicy="no-referrer" />}
          <span>{user.name || user.email}</span>
          <button className="link" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<NewAnalysis />} />
          <Route path="/reports/:id" element={<Report />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
