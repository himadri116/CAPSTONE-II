import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { RiskBar } from '../components/Risk.jsx';
import Trend from '../components/Trend.jsx';

export default function Dashboard() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.list().then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm('Delete this report?')) return;
    await api.remove(id);
    load();
  };

  if (error) return <p className="error">{error}</p>;
  if (!items) return <p className="muted">Loading reports…</p>;
  if (!items.length) {
    return (
      <div className="empty">
        <h2>No reports yet</h2>
        <p>Upload source files or paste a function to see which parts are most likely to contain bugs.</p>
        <Link className="btn" to="/new">Run your first analysis</Link>
      </div>
    );
  }
  return (
    <>
      <section className="panel">
        <h2>Average risk over time</h2>
        <Trend items={items} />
      </section>
      <section className="panel">
        <h2>Report history</h2>
        <table>
          <thead><tr><th>Report</th><th>Date</th><th>Files</th><th>Avg. risk</th><th>High-risk functions</th><th>Smells</th><th /></tr></thead>
          <tbody>
            {items.map((r) => (
              <tr key={r._id}>
                <td><Link to={`/reports/${r._id}`}>{r.name}</Link></td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>{r.summary?.files}</td>
                <td><RiskBar value={r.summary?.avgRisk || 0} /></td>
                <td>{r.summary?.highRisk}</td>
                <td>{r.summary?.smells}</td>
                <td><button className="link danger" onClick={() => remove(r._id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
