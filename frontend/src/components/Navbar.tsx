import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoUrl from "../../assets/logo.png";

function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuth();

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

          {user ? (
            <div className="navbar-user-wrap">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="navbar-avatar" />
              ) : (
                <div className="navbar-avatar-placeholder">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <span className="navbar-username">{user.name}</span>
              <button onClick={logout} className="navbar-logout-btn">
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className={`nav-link login-nav-link ${location.pathname === "/login" ? "active" : ""}`}
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
