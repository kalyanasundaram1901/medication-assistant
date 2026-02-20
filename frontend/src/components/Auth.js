import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// For mobile apps, you should replace 'localhost' with your computer's local IP (e.g., 10.142.143.132)
const API_BASE_URL = `http://${window.location.hostname}:5000`;

export const Login = ({ onToggle }) => {
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
            <h2 style={{ marginBottom: '24px', fontWeight: '700', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Welcome Back</h2>
            <form onSubmit={handleSubmit}>
                <input className="input-glass" type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required style={{ marginBottom: '16px' }} />
                <input className="input-glass" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ marginBottom: '24px' }} />
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Login</button>
            </form>
            <p onClick={onToggle} style={{ marginTop: '20px', cursor: 'pointer', fontSize: '0.9rem' }}>Don't have an account? <span style={{ color: '#60a5fa', fontWeight: '600' }}>Sign Up</span></p>
            <p style={{ marginTop: '16px', fontSize: '0.8rem', opacity: 0.7 }}>
                Are you an Admin? <a href="/admin/login" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Login here</a>
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
