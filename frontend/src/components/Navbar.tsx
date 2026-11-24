import { Link, useNavigate } from "react-router-dom";
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
    <nav className="navbar">
      <div className="navbar-brand">
        <img src={logoUrl} alt="SDP for GitHub" className="navbar-logo" />
        <div className="navbar-title">SDP for GitHub</div>
      </div>

      <div className="navbar-links">
        <Link to="/" className="nav-link home-link">Home</Link>
        <Link to="/repository-input" className="nav-link scan-link">
          Scan a Repository
        </Link>
        <Link to="/prediction-history" className="nav-link history-link">
          Prediction History
        </Link>
        <Link to="/how-it-works" className="nav-link works-link">
          How It Works
        </Link>
        <Link to="/feedback" className="nav-link feedback-link">
          Feedback
        </Link>

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
                <Link to="/login" className="nav-link login-link">Log in</Link>
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
