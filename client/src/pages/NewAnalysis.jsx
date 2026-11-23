import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const LANGS = { 'snippet.py': 'Python', 'snippet.js': 'JavaScript', 'snippet.ts': 'TypeScript', 'snippet.java': 'Java', 'snippet.go': 'Go' };

export default function NewAnalysis() {
  const [mode, setMode] = useState('upload');
  const [name, setName] = useState('');
  const [files, setFiles] = useState([]);
  const [code, setCode] = useState('');
  const [filename, setFilename] = useState('snippet.py');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const fd = new FormData();
    fd.append('name', name);
    if (mode === 'upload') files.forEach((f) => fd.append('files', f));
    else { fd.append('code', code); fd.append('filename', filename); }
    try {
      const doc = await api.create(fd);
      nav(`/reports/${doc._id}`);
    } catch (err) {
      setError(err.message); setBusy(false);
    }
  };

  const ready = mode === 'upload' ? files.length > 0 : code.trim().length > 0;
  return (
    <form className="panel narrow" onSubmit={submit}>
      <h2>New analysis</h2>
      <label>Report name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. payments service, sprint 14" maxLength={80} />
      </label>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'upload'} onClick={() => setMode('upload')}>Upload files</button>
        <button type="button" role="tab" aria-selected={mode === 'paste'} onClick={() => setMode('paste')}>Paste code</button>
      </div>
      {mode === 'upload' ? (
        <label>Source files (.py .js .jsx .ts .tsx .java .go .c .cpp .cs, up to 30 files, 1 MB each)
          <input type="file" multiple accept=".py,.js,.jsx,.mjs,.ts,.tsx,.java,.go,.c,.cpp,.cs" onChange={(e) => setFiles([...e.target.files])} />
        </label>
      ) : (
        <>
          <label>Language
            <select value={filename} onChange={(e) => setFilename(e.target.value)}>
              {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>Code
            <textarea rows={14} value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} className="mono" />
          </label>
        </>
      )}
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={!ready || busy}>{busy ? 'Analysing…' : 'Analyse code'}</button>
    </form>
  );
}
