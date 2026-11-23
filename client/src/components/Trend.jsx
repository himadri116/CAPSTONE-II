import { pct } from '../api.js';

// Average risk of each analysis over time (oldest → newest)
export default function Trend({ items }) {
  const pts = [...items].reverse().filter((i) => i.summary);
  if (pts.length < 2) return <p className="muted">Run at least two analyses to see your risk trend.</p>;
  const W = 640, H = 140, P = 24;
  const x = (i) => P + (i * (W - 2 * P)) / (pts.length - 1);
  const y = (v) => H - P - v * (H - 2 * P);
  const line = pts.map((p, i) => `${x(i)},${y(p.summary.avgRisk)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="trend" role="img" aria-label="Average bug risk across analyses">
      {[0, 0.5, 1].map((t) => (
        <g key={t}><line x1={P} x2={W - P} y1={y(t)} y2={y(t)} className="grid" /><text x={2} y={y(t) + 4}>{pct(t)}</text></g>
      ))}
      <polyline points={line} fill="none" className="trendline" />
      {pts.map((p, i) => <circle key={p._id} cx={x(i)} cy={y(p.summary.avgRisk)} r="4"><title>{p.name}: {pct(p.summary.avgRisk)}</title></circle>)}
    </svg>
  );
}
