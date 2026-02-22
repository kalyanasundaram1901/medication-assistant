import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

// For mobile apps, you should replace 'localhost' with your computer's local IP (e.g., 10.142.143.132)
const API_BASE_URL = `https://medication-assistant.onrender.com`;

export const Login = ({ onToggle, deferredPrompt, onInstall }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const resp = await axios.post(`${API_BASE_URL}/login`, { username, password });
            login(resp.data.access_token);
        } catch (err) {
            alert("Invalid credentials");
        }
    };

    return (
        <div className="glass-card auth-card" style={{ padding: '32px' }}>
            {deferredPrompt && (
                <div className="install-banner" style={{
                    background: 'var(--primary-light)',
                    padding: '12px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid var(--primary)'
                }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Add to Home Screen?</span>
                    <button onClick={onInstall} style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}>Install</button>
                </div>
            )}
            <h2 style={{ marginBottom: '24px', fontWeight: '700', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Welcome Back</h2>
            <form onSubmit={handleSubmit}>
                <input className="input-glass" type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required style={{ marginBottom: '16px' }} />
                <input className="input-glass" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ marginBottom: '24px' }} />
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Login</button>
            </form>
            <p onClick={onToggle} style={{ marginTop: '20px', cursor: 'pointer', fontSize: '0.9rem' }}>Don't have an account? <span style={{ color: '#60a5fa', fontWeight: '600' }}>Sign Up</span></p>
            <p style={{ marginTop: '16px', fontSize: '0.8rem', opacity: 0.7 }}>
                Are you an Admin? <Link to="/admin/login" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Login here</Link>
            </p>
        </div>
    );
};


export const Signup = ({ onToggle }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/register`, { username, password });
            alert("Registered! Please login.");
            onToggle();
        } catch (err) {
            alert("Registration failed");
        }
    };

    return (
        <div className="glass-card auth-card" style={{ padding: '32px' }}>
            <h2 style={{ marginBottom: '24px', fontWeight: '700', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Join MedAssist</h2>
            <form onSubmit={handleSubmit}>
                <input className="input-glass" type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required style={{ marginBottom: '16px' }} />
                <input className="input-glass" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ marginBottom: '24px' }} />
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Register</button>
            </form>
            <p onClick={onToggle} style={{ marginTop: '20px', cursor: 'pointer', fontSize: '0.9rem' }}>Already have an account? <span style={{ color: '#60a5fa', fontWeight: '600' }}>Login</span></p>
        </div>
    );
};
