import { pct, riskColor } from '../api.js';

export function RiskBar({ value }) {
  return (
    <span className="riskbar" title={`Bug risk ${pct(value)}`}>
      <span style={{ width: pct(value), background: riskColor(value) }} />
      <b>{pct(value)}</b>
    </span>
  );
}

export const Sev = ({ level }) => <span className={`sev ${level}`}>{level}</span>;
