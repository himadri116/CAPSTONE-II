import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const sampleRows = [
  { file: "services/session_store.py", score: 82, level: "high" },
  { file: "api/UserController.java", score: 57, level: "medium" },
  { file: "core/parser.cpp", score: 21, level: "low" },
];

function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <section className="auth-aside" aria-hidden="true">
        <h2>See which changed files need a closer look before you release.</h2>
        <p>Example prediction for one commit</p>
        <ul className="auth-sample">
          {sampleRows.map((row) => (
            <li key={row.file}>
              <span className="auth-sample-file">{row.file}</span>
              <span className="auth-sample-track">
                <span
                  className={`auth-sample-fill auth-sample-${row.level}`}
                  style={{ width: `${row.score}%` }}
                />
              </span>
              <span className="auth-sample-score">{row.score}%</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

export default AuthLayout;
