import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'AUTH_FAILURE');
    }
  };

  return (
    <div className="cyber-panel" style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--neon-cyan)' }}>Secure Login</h2>
      {error && <div style={{ color: 'var(--neon-red)', marginBottom: '1rem', textAlign: 'center', fontFamily: 'Share Tech Mono' }}>[ERR] {error}</div>}
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label>ID_STRING (EMAIL)</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>PASS_KEY (PASSWORD)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn" style={{ width: '100%' }}>EXECUTE_AUTH</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem' }}>
        NO CLEARANCE? <Link to="/register" style={{ color: 'var(--neon-cyan)' }}>REQUEST_ACCESS</Link>
      </p>
    </div>
  );
}

export default Login;
