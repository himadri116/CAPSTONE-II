import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="page">
      <section className="hero home-hero">
        <div className="home-hero-copy">
          <span className="home-eyebrow">
            <span className="home-eyebrow-mark" aria-hidden="true" />
            Software defect prediction
          </span>
          <h1>
            Know where to look <span>before the code review begins.</span>
          </h1>
          <p>
            Scan a GitHub commit to surface files that may deserve a closer
            look. Explore risk signals and clear explanations for Java, Python,
            and C++ code.
          </p>

<<<<<<< HEAD
        <p>
          BugSight checks Java, Python, and C++ files in a selected
          repository commit. It estimates which files may be more likely to
          contain defects, explains the important metrics behind the result, and
          helps developers decide what to review first.
        </p>
=======
          <div className="hero-actions">
            <Link to="/repository-input" className="primary-button">
              Start a prediction <span aria-hidden="true">→</span>
            </Link>
>>>>>>> origin/tanvi

            <Link to="/how-it-works" className="secondary-home-link">
              Explore how it works
            </Link>
          </div>
          <div className="home-hero-note">
            <span aria-hidden="true">✓</span>
            Review support, not a replacement for developer judgment
          </div>
          <div className="home-language-tags" aria-label="Supported languages">
            <span><i className="language-dot language-java" /> Java</span>
            <span><i className="language-dot language-python" /> Python</span>
            <span><i className="language-dot language-cpp" /> C++</span>
          </div>
        </div>

        <aside className="home-risk-preview" aria-label="Illustrative prediction preview">
          <div className="home-preview-heading">
            <div>
              <span className="home-preview-kicker">Illustrative preview</span>
              <h2>File risk overview</h2>
            </div>
            <span className="home-preview-icon" aria-hidden="true">⌁</span>
          </div>
          <div className="home-preview-file">
            <span className="home-file-icon" aria-hidden="true">PY</span>
            <div>
              <strong>checkout.py</strong>
              <span>src / payments</span>
            </div>
            <span className="home-risk-pill"><i /> Review</span>
          </div>
          <div className="home-preview-score">
            <div>
              <span>Estimated risk</span>
              <strong>72%</strong>
            </div>
            <span className="home-score-caption">Example only</span>
          </div>
          <div className="home-preview-meter" aria-hidden="true">
            <span />
          </div>
          <div className="home-preview-signals">
            <span>Signals to explore</span>
            <div><span>Change frequency</span><strong>Elevated</strong></div>
            <div><span>Code complexity</span><strong>Moderate</strong></div>
          </div>
        </aside>
      </section>

      <section className="home-intro-grid" aria-label="Application overview">
        <div className="home-intro-panel">
          <h2>What the application does</h2>
          <p>
            The app reads source files from a GitHub commit, extracts code and
            commit-history metrics, then sends those metrics into a trained
            machine learning model.
          </p>
          <p>
            The output is not a final bug report. It is a risk estimate that
            helps developers focus review time on files that deserve more
            attention.
          </p>
        </div>

        <div className="home-intro-panel">
          <h2>What you get back</h2>
          <ul>
            <li>Risk probability for each supported file.</li>
            <li>High, medium, or low risk category.</li>
            <li>Plain-language explanation of why the file was marked risky.</li>
            <li>Dashboard charts, filtering, selection, and export options.</li>
          </ul>
        </div>
      </section>

      <section className="card-grid home-card-grid">
        <div className="card home-step-card">
          <span>1</span>
          <h3>Choose Repository</h3>
          <p>
            Enter a GitHub repository URL, select a branch, tag, or commit, then
            run prediction on the selected version of the code.
          </p>
        </div>

        <div className="card home-step-card">
          <span>2</span>
          <h3>Extract Metrics</h3>
          <p>
            The backend measures file size, complexity, conditional checks,
            method structure, and commit-history activity for supported files.
          </p>
        </div>

        <div className="card home-step-card">
          <span>3</span>
          <h3>Review Risk</h3>
          <p>
            The model predicts file-level defect risk and shows which metric
            values influenced the result, so the output is easier to understand.
          </p>
        </div>
      </section>

      <section className="home-concept-grid" aria-label="Key concepts">
        <div className="home-concept">
          <h3>Risk probability</h3>
          <p>
            A percentage showing how strongly the model thinks a file matches
            patterns seen in defective files during training.
          </p>
        </div>

        <div className="home-concept">
          <h3>Prediction threshold</h3>
          <p>
            The cut-off used to decide whether a file is labelled defective. For
            example, a 36% threshold means files at or above 36% are marked as
            defective by the app.
          </p>
        </div>

        <div className="home-concept">
          <h3>SHAP explanation</h3>
          <p>
            SHAP helps explain a model decision by showing which metrics pushed
            the prediction higher or lower for a specific file.
          </p>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
