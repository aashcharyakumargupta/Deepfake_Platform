import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const fileInputRef = useRef(null);
  const terminalRef = useRef(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/media/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch history', err); if (err.response && err.response.status === 401) { localStorage.removeItem('token'); window.location.reload(); }
    }
  };

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
      setLogs([]);
      addLog(`[SYSTEM] Target acquired: ${selectedFile.name}`, 'info');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setLogs([]);
    
    addLog('[INIT] Commencing deep biometric scan...', 'warning');
    addLog('[NET] Establishing secure uplink to ML_CORE...', 'info');
    
    // Simulate AI thinking steps for the UI
    const t1 = setTimeout(() => addLog('[PROC] Extracting latent space vectors using MTCNN...', 'info'), 800);
    const t2 = setTimeout(() => addLog('[PROC] Isolating facial geometry...', 'info'), 1500);
    const t3 = setTimeout(() => addLog('[DB] Querying MongoDB Vector DB for known signatures...', 'warning'), 2200);
    const t4 = setTimeout(() => addLog('[SYS] Generating Forensic Edge-Map visualization...', 'info'), 2600);
    
    const formData = new FormData();
    formData.append('media', file);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/media/upload', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const resData = res.data.result;
      setTimeout(() => {
        if(resData.isDeepfake) {
          addLog('[CRIT] ANOMALY DETECTED: Synthetic signatures found!', 'error');
        } else {
          addLog('[OK] Biometric signatures verified.', 'success');
        }
        setResult(resData);
        setLoading(false);
        fetchHistory();
      }, 3500); 

    } catch (err) {
      console.error(err);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      addLog('[ERR] Uplink failed or analysis aborted.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="cyber-panel">
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '2px' }}>TARGET_UPLINK</h2>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*"
            onChange={handleFileSelect} 
          />
          
          {!preview ? (
            <div style={{ border: '1px dashed var(--neon-cyan)', padding: '4rem 2rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s' }} 
                 onMouseOver={(e) => e.currentTarget.style.background = 'var(--neon-cyan-dim)'}
                 onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                 onClick={() => fileInputRef.current.click()}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--neon-cyan)' }}>[+]</div>
              <p className="mono" style={{ color: 'var(--text-muted)' }}>INITIATE_DATA_TRANSFER</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="scanner-container" style={{ flex: 1 }}>
                  <img src={preview} alt="Target" />
                  {loading && (
                    <>
                      <div className="scan-line"></div>
                      <div className="target-box"></div>
                    </>
                  )}
                </div>
                {result && result.heatmap && (
                  <div className="scanner-container" style={{ flex: 1 }}>
                    <img src={result.heatmap} alt="Forensic Heatmap" />
                    <div style={{ position: 'absolute', top: 5, left: 5, background: 'rgba(0,0,0,0.7)', color: 'var(--neon-cyan)', padding: '2px 5px', fontSize: '0.8rem', fontFamily: 'monospace' }}>FORENSIC_EDGE_MAP</div>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn" onClick={handleUpload} disabled={loading} style={{ flex: 1 }}>
                  {loading ? 'ANALYZING...' : 'EXECUTE_SCAN'}
                </button>
                <button className="btn btn-danger" onClick={() => { setFile(null); setPreview(null); setResult(null); setLogs([]); }} disabled={loading}>
                  ABORT
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scan History */}
        <div className="cyber-panel" style={{ flex: 1 }}>
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>SCAN_HISTORY_LOG</h2>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {history.length === 0 ? <p className="mono" style={{ color: 'var(--text-muted)' }}>No previous scans found.</p> : null}
            {history.map(h => (
              <div key={h._id} className={`history-item ${h.isDeepfake ? 'fake' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="mono" style={{ color: h.isDeepfake ? 'var(--neon-red)' : 'var(--neon-green)' }}>
                    {h.isDeepfake ? '[THREAT]' : '[CLEAN]'} {h.filename}
                  </span>
                  <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(h.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', opacity: 0.8 }}>
                  Confidence: {(h.confidence * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cyber-panel">
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '2px' }}>ANALYSIS_CORE</h2>
        
        <div className="terminal-window" ref={terminalRef}>
          <div className="terminal-line" style={{ color: 'var(--text-muted)' }}>
            OVERWATCH OS v2.0.4 loaded.<br/>
            Awaiting input...
          </div>
          {logs.map((l, i) => (
            <div key={i} className={`terminal-line ${l.type} typewriter`}>
              [{l.time}] {l.msg}
            </div>
          ))}
          {loading && <div className="terminal-line blinking-cursor">_</div>}
        </div>

        {result && (
          <div style={{ marginTop: '2rem', animation: 'fadeIn 0.5s ease' }} className={result.isDeepfake ? 'glitch' : ''} data-text={result.isDeepfake ? 'THREAT_DETECTED' : 'CLEAN'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--neon-cyan-dim)' }}>
              <span className="mono" style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>SYS_VERDICT:</span>
              <span className={`status-badge ${result.isDeepfake ? 'fake' : 'real'}`}>
                {result.isDeepfake ? 'THREAT_DETECTED (DEEPFAKE)' : 'CLEAN (AUTHENTIC)'}
              </span>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontFamily: 'Share Tech Mono' }}>
                <span>FORGERY_PROBABILITY</span>
                <span style={{ color: result.isDeepfake ? 'var(--neon-red)' : 'var(--neon-cyan)' }}>
                  {(result.confidence * 100).toFixed(2)}%
                </span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${result.confidence * 100}%`, background: result.isDeepfake ? 'var(--neon-red)' : 'var(--neon-cyan)' }}></div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontFamily: 'Share Tech Mono' }}>
                <span>VECTOR_SIMILARITY</span>
                <span style={{ color: 'var(--neon-cyan)' }}>{(result.similarityScore * 100).toFixed(2)}%</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${result.similarityScore * 100}%`, background: 'var(--neon-cyan)' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
