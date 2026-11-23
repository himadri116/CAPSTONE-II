// Line-level diff (LCS) between original and suggested code
function diff(a, b) {
  const n = a.length, m = b.length;
  const t = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push([' ', a[i]]); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) out.push(['-', a[i++]]);
    else out.push(['+', b[j++]]);
  }
  while (i < n) out.push(['-', a[i++]]);
  while (j < m) out.push(['+', b[j++]]);
  return out;
}

export default function Diff({ before, after }) {
  const a = before.split('\n'), b = after.split('\n');
  if (a.length > 400 || b.length > 400) return <pre className="code">{after}</pre>;
  return (
    <pre className="code diff">
      {diff(a, b).map(([k, line], i) => (
        <div key={i} className={k === '+' ? 'add' : k === '-' ? 'del' : ''}>{k === ' ' ? '  ' : `${k} `}{line}</div>
      ))}
    </pre>
  );
}
