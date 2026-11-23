import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [cfg, setCfg] = useState({ google: true, dev: false });
  const [params] = useSearchParams();
  const nav = useNavigate();
  useEffect(() => { api.config().then(setCfg).catch(() => {}); }, []);

  const demo = async () => {
    await api.devLogin();
    onLogin(await api.me());
    nav('/');
  };

  return (
    <div className="login">
      <h1>BugSight</h1>
      <p className="lede">Find the functions most likely to break before they ship, with the reason and a suggested fix for each.</p>
      {params.get('error') && <p className="error">Google sign-in failed. Try again.</p>}
      {cfg.google
        ? <a className="btn" href="/api/auth/google">Sign in with Google</a>
        : <p className="muted">Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.</p>}
      {cfg.dev && <button className="btn ghost" onClick={demo}>Continue as demo user</button>}
    </div>
  );
}
