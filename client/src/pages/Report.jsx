import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, pct, riskColor } from '../api.js';
import { RiskBar, Sev } from '../components/Risk.jsx';
import Diff from '../components/Diff.jsx';

export default function Report() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');
  const [filePath, setFilePath] = useState(null);
  const [fn, setFn] = useState(null);
  const [sugg, setSugg] = useState({ loading: false, data: null, error: '' });

  useEffect(() => {
    api.get(id).then((d) => {
      setDoc(d);
      const first = d.files.find((f) => !f.skipped);
      if (first) setFilePath(first.path);
    }).catch((e) => setError(e.message));
  }, [id]);

  const file = useMemo(() => doc?.files.find((f) => f.path === filePath), [doc, filePath]);
  const funcs = useMemo(() => (file ? [...file.functions].sort((a, b) => b.risk - a.risk) : []), [file]);

  useEffect(() => { setFn(null); setSugg({ loading: false, data: null, error: '' }); }, [filePath]);

  const getSuggestion = async () => {
    setSugg({ loading: true, data: null, error: '' });
    try {
      setSugg({ loading: false, data: await api.suggest(id, { filePath, name: fn.name, start: fn.start }), error: '' });
    } catch (e) { setSugg({ loading: false, data: null, error: e.message }); }
  };

  if (error) return <p className="error">{error}</p>;
  if (!doc) return <p className="muted">Loading report…</p>;
  const s = doc.summary;
  const files = doc.files.filter((f) => !f.skipped);
  const skipped = doc.files.filter((f) => f.skipped);

  return (
    <>
      <p><Link to="/">← All reports</Link></p>
      <h1>{doc.name}</h1>
      <p className="muted">{new Date(doc.createdAt).toLocaleString()} · model: {doc.mlModel}</p>

      <section className="panel stats">
        <div><b>{s.files}</b> files</div>
        <div><b>{s.functions}</b> functions</div>
        <div><b>{pct(s.avgRisk)}</b> average risk</div>
        <div><b>{s.highRisk}</b> high-risk functions</div>
        <div><b>{s.smells}</b> code smells</div>
      </section>

      <section className="panel">
        <h2>Risk heatmap</h2>
        <p className="muted">Each tile is a file. Wider means more lines, redder means more likely to contain a bug.</p>
        <div className="heat">
          {files.map((f) => (
            <button key={f.path} className={f.path === filePath ? 'tile on' : 'tile'} style={{ flexGrow: Math.max(f.loc, 20), background: riskColor(f.risk) }}
              onClick={() => setFilePath(f.path)} title={`${f.path}: ${pct(f.risk)}`}>
              <span>{f.path.split('/').pop()}</span><b>{pct(f.risk)}</b>
            </button>
          ))}
        </div>
        {skipped.length > 0 && <p className="muted">Skipped (unsupported): {skipped.map((f) => f.path).join(', ')}</p>}
      </section>

      {file && (
        <div className="split">
          <section className="panel">
            <h2>{file.path}</h2>
            {file.smells.length > 0 && (
              <ul className="smells">
                {file.smells.map((m, i) => <li key={i}><Sev level={m.severity} /> {m.message} <span className="muted">line {m.line}</span></li>)}
              </ul>
            )}
            <table>
              <thead><tr><th>Function</th><th>Lines</th><th>Risk</th><th>Smells</th></tr></thead>
              <tbody>
                {funcs.map((f) => (
                  <tr key={`${f.name}${f.start}`} className={fn === f ? 'sel' : ''} onClick={() => { setFn(f); setSugg({ loading: false, data: null, error: '' }); }}>
                    <td className="mono">{f.name}</td><td>{f.start}–{f.end}</td><td><RiskBar value={f.risk} /></td><td>{f.smells.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel">
            {!fn ? <p className="muted">Select a function to see its metrics and get suggestions.</p> : (
              <>
                <h2 className="mono">{fn.name}</h2>
                <dl className="metrics">
                  {Object.entries(fn.metrics).map(([k, v]) => <div key={k}><dt>{k.replace(/_/g, ' ')}</dt><dd>{v}</dd></div>)}
                </dl>
                {fn.smells.length > 0 && (
                  <ul className="smells">{fn.smells.map((m, i) => <li key={i}><Sev level={m.severity} /> {m.message}</li>)}</ul>
                )}
                <button className="btn" onClick={getSuggestion} disabled={sugg.loading}>{sugg.loading ? 'Reviewing…' : 'Get AI suggestions'}</button>
                {sugg.error && <p className="error">{sugg.error}</p>}
                {sugg.data && (
                  <div className="suggestions">
                    <p>{sugg.data.summary} {sugg.data.cached && <span className="muted">(cached)</span>}</p>
                    {sugg.data.issues.length === 0 && <p className="muted">Nothing to fix was found for this function.</p>}
                    {sugg.data.issues.map((i, k) => (
                      <article key={k}>
                        <h3><Sev level={i.severity} /> {i.issue}</h3>
                        <p>{i.why}</p>
                        {i.hint && <p className="muted">{i.hint}</p>}
                        {i.fixed_code && <Diff before={fn.code} after={i.fixed_code} />}
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
