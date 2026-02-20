import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = `http://${window.location.hostname}:5000`;

const AdminDashboard = () => {
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newMedicine, setNewMedicine] = useState({
        name: '',
        used_for: '',
        how_it_works: '',
        side_effects: '',
        notes: ''
    });
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            navigate('/admin/login');
            return;
        }
        fetchMedicines();
    }, []);

    const fetchMedicines = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const resp = await axios.get(`${API_BASE_URL}/admin/medicines`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMedicines(resp.data);
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 401) {
                navigate('/admin/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddMedicine = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('adminToken');
            await axios.post(`${API_BASE_URL}/admin/add-medicine`, newMedicine, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewMedicine({
                name: '',
                used_for: '',
                how_it_works: '',
                side_effects: '',
                notes: ''
            });
            fetchMedicines();
            alert('Medicine added successfully!');
        } catch (err) {
            alert('Error adding medicine');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
    };

    return (
        <div className="chat-container admin-dashboard">
            <div className="app-header">
                <div className="brand">
                    <div className="app-logo">🛠️</div>
                    <div>
                        <h1 className="title">Admin Dashboard</h1>
                        <p className="subtitle">Manage Medicine Database</p>
                    </div>
                </div>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>

            <div className="content" style={{ padding: '20px', overflowY: 'auto' }}>
                <div className="admin-container">
                    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <h3 style={{ margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Add New Medicine</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <input
                                className="input-glass"
                                placeholder="Medicine Name"
                                value={newMedicine.name}
                                onChange={e => setNewMedicine({ ...newMedicine, name: e.target.value })}
                            />
                            <input
                                className="input-glass"
                                placeholder="Used for"
                                value={newMedicine.used_for}
                                onChange={e => setNewMedicine({ ...newMedicine, used_for: e.target.value })}
                            />
                        </div>
                        <input
                            className="input-glass"
                            placeholder="How it works"
                            value={newMedicine.how_it_works}
                            onChange={e => setNewMedicine({ ...newMedicine, how_it_works: e.target.value })}
                        />
                        <input
                            className="input-glass"
                            placeholder="Common side effects"
                            value={newMedicine.side_effects}
                            onChange={e => setNewMedicine({ ...newMedicine, side_effects: e.target.value })}
                        />
                        <textarea
                            className="input-glass"
                            placeholder="Notes"
                            style={{ height: '80px', borderRadius: '12px' }}
                            value={newMedicine.notes}
                            onChange={e => setNewMedicine({ ...newMedicine, notes: e.target.value })}
                        />
                        <button className="btn-primary" onClick={handleAddMedicine}>Add to Database</button>
                    </div>

                    <div style={{ marginTop: '40px' }}>
                        <h3 style={{ marginBottom: '20px', color: 'var(--text-main)', fontSize: '1.2rem' }}>Current Database</h3>
                        {loading ? (
                            <p style={{ color: 'var(--text-muted)' }}>Loading medicines...</p>
                        ) : (
                            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-main)' }}>
                                        <thead style={{ background: 'rgba(37, 99, 235, 0.05)', borderBottom: '1px solid var(--glass-border)' }}>
                                            <tr>
                                                <th style={{ padding: '15px', textAlign: 'left', fontSize: '0.85rem', color: 'var(--primary)' }}>Name</th>
                                                <th style={{ padding: '15px', textAlign: 'left', fontSize: '0.85rem', color: 'var(--primary)' }}>Used For</th>
                                                <th style={{ padding: '15px', textAlign: 'left', fontSize: '0.85rem', color: 'var(--primary)' }}>Side Effects</th>
                                                <th style={{ padding: '15px', textAlign: 'left', fontSize: '0.85rem', color: 'var(--primary)' }}>Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {medicines.map((med, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{med.Name}</td>
                                                    <td style={{ padding: '15px', fontSize: '0.9rem' }}>{med['Used for']}</td>
                                                    <td style={{ padding: '15px', fontSize: '0.9rem' }}>{med['Common side effects']}</td>
                                                    <td style={{ padding: '15px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{med.Notes}</td>
                                                </tr>
                                            ))}
                                            {medicines.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No medicines found in database.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
