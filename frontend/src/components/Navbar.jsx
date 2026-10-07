import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span style={{color: 'var(--text-main)'}}>[</span>SYS<span style={{color: 'var(--text-main)'}}>]</span> OVERWATCH
      </Link>
      <div>
        {token ? (
          <button onClick={handleLogout} className="btn btn-danger">LOGOUT_SEQ</button>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/login" className="btn">AUTH_LOGIN</Link>
            <Link to="/register" className="btn" style={{ background: 'transparent', border: '1px solid var(--neon-cyan)' }}>INIT_USER</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
