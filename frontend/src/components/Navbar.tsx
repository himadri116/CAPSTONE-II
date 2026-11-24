import { Link, NavLink, useNavigate } from "react-router-dom";
import logoUrl from "../../assets/logo.png";
import { useAuth } from "../hooks/useAuth";
import "../styles/navbar.css";

function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="navbar-container">
      <nav className="navbar" aria-label="Main navigation">
        <Link to="/" className="navbar-brand" aria-label="BugSight home">
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
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link home-link${isActive ? " active is-active" : ""}`}
          >
            Home
          </NavLink>
          <NavLink
            to="/repository-input"
            className={({ isActive }) => `nav-link scan-link${isActive ? " active is-active" : ""}`}
          >
            Scan a Repository
          </NavLink>
          <NavLink
            to="/prediction-history"
            className={({ isActive }) => `nav-link history-link${isActive ? " active is-active" : ""}`}
          >
            Prediction History
          </NavLink>
          <NavLink
            to="/how-it-works"
            className={({ isActive }) => `nav-link works-link${isActive ? " active is-active" : ""}`}
          >
            How It Works
          </NavLink>
          <NavLink
            to="/feedback"
            className={({ isActive }) => `nav-link feedback-link${isActive ? " active is-active" : ""}`}
          >
            Feedback
          </NavLink>

          {!loading && (
            <div className="navbar-auth">
              {user ? (
                <div className="navbar-user-wrap">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="navbar-avatar" />
                  ) : (
                    <div className="navbar-avatar-placeholder">
                      {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                  <span className="navbar-username" title={user.email}>{user.name}</span>
                  <button type="button" onClick={handleLogout} className="navbar-logout-btn">
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="navbar-guest-links">
                  <NavLink
                    to="/login"
                    className={({ isActive }) => `nav-link login-nav-link${isActive ? " active is-active" : ""}`}
                  >
                    Log In
                  </NavLink>
                  <Link to="/signup" className="nav-link signup-link">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
