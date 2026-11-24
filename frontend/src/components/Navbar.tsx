import { Link, NavLink, useNavigate } from "react-router-dom";
import logoUrl from "../../assets/logo.png";
import { useAuth } from "../hooks/useAuth";

function Navbar() {
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
  );
}

export default Navbar;
