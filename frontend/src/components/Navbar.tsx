<<<<<<< HEAD
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
=======
import { Link, NavLink, useNavigate } from "react-router-dom";
>>>>>>> origin/tanvi
import logoUrl from "../../assets/logo.png";
import { useAuth } from "../hooks/useAuth";

function Navbar() {
<<<<<<< HEAD
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
=======
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar" aria-label="Main navigation">
      <Link to="/" className="navbar-brand" aria-label="SDP for GitHub home">
        <img src={logoUrl} alt="SDP for GitHub" className="navbar-logo" />
        <div className="navbar-title">SDP for GitHub</div>
      </Link>

      <div className="navbar-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link home-link${isActive ? " is-active" : ""}`}>
          Home
        </NavLink>
        <NavLink to="/repository-input" className={({ isActive }) => `nav-link scan-link${isActive ? " is-active" : ""}`}>
          Scan a Repository
        </NavLink>
        <NavLink to="/prediction-history" className={({ isActive }) => `nav-link history-link${isActive ? " is-active" : ""}`}>
          Prediction History
        </NavLink>
        <NavLink to="/how-it-works" className={({ isActive }) => `nav-link works-link${isActive ? " is-active" : ""}`}>
          How It Works
        </NavLink>
        <NavLink to="/feedback" className={({ isActive }) => `nav-link feedback-link${isActive ? " is-active" : ""}`}>
          Feedback
        </NavLink>

        {!loading && (
          <div className="navbar-auth">
            {user ? (
              <>
                <span className="nav-user" title={user.email}>{user.name}</span>
                <button type="button" className="nav-logout" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={({ isActive }) => `nav-link login-link${isActive ? " is-active" : ""}`}>
                  Log in
                </NavLink>
                <Link to="/signup" className="nav-link signup-link">Sign up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
>>>>>>> origin/tanvi
  );
}

export default Navbar;
