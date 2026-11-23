import { Link, useLocation } from "react-router-dom";
import logoUrl from "../../assets/logo.png";

function Navbar() {
  const location = useLocation();

  return (
    <header className="navbar-container">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <div className="navbar-logo-wrap">
            <img src={logoUrl} alt="BugSight" className="navbar-logo" />
          </div>
          <div className="navbar-title">
            <span className="brand-bug">Bug</span>
            <span className="brand-sight">Sight</span>
            <span className="brand-badge">AI</span>
          </div>
        </Link>

        <div className="navbar-links">
          <Link
            to="/"
            className={`nav-link home-link ${location.pathname === "/" ? "active" : ""}`}
          >
            Home
          </Link>
          <Link
            to="/repository-input"
            className={`nav-link scan-link ${location.pathname === "/repository-input" ? "active" : ""}`}
          >
            Scan a Repository
          </Link>
          <Link
            to="/prediction-history"
            className={`nav-link history-link ${location.pathname === "/prediction-history" ? "active" : ""}`}
          >
            Prediction History
          </Link>
          <Link
            to="/how-it-works"
            className={`nav-link works-link ${location.pathname === "/how-it-works" ? "active" : ""}`}
          >
            How It Works
          </Link>
          <Link
            to="/feedback"
            className={`nav-link feedback-link ${location.pathname === "/feedback" ? "active" : ""}`}
          >
            Feedback
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
