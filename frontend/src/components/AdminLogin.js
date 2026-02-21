import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = `https://medication-assistant.onrender.com`;

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const resp = await axios.post(`${API_BASE_URL}/admin/login`, { username, password });
            localStorage.setItem('adminToken', resp.data.token);
            navigate('/admin/dashboard');
        } catch (err) {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-container">
                <div className="glass-card auth-card" style={{ padding: '32px' }}>
                    <h2 style={{ marginBottom: '24px', fontWeight: '700', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Admin Portal</h2>
                    {error && <p style={{ color: '#fb7185', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</p>}
                    <form onSubmit={handleLogin}>
                        <input
                            className="input-glass"
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            style={{ marginBottom: '16px' }}
                        />
                        <input
                            className="input-glass"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            style={{ marginBottom: '24px' }}
                        />
                        <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                            Login Securely
                        </button>
                    </form>
                    <p onClick={() => navigate('/')} style={{ marginTop: '20px', fontSize: '0.8rem', color: '#60a5fa', cursor: 'pointer', fontWeight: '500' }}>
                        ← Return to Health Companion
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
