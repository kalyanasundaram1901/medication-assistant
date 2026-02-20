import React, { useState, useEffect, useRef } from "react";
import axios from 'axios';
import "./App.css";
import "./components/ScheduleStyles.css";

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login, Signup } from './components/Auth';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

// For mobile apps, you should replace 'localhost' with your computer's local IP (e.g., 10.142.143.132)
const API_BASE_URL = `http://${window.location.hostname}:5000`;

function MainApp() {
  const { token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [scheduleList, setScheduleList] = useState([]);
  const [newMedicine, setNewMedicine] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newDays, setNewDays] = useState(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [extractedMedicines, setExtractedMedicines] = useState([]);
  const [selectedForSchedule, setSelectedForSchedule] = useState(null);


  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDays, setEditDays] = useState([]);

  // Multi-Period Scheduling State
  const [schedulePeriods, setSchedulePeriods] = useState({
    morning: false,
    afternoon: false,
    night: false,
    custom: false
  });
  const [scheduleTimes, setScheduleTimes] = useState({
    morning: "08:00",
    afternoon: "14:00",
    night: "21:00",
    custom: ""
  });

  // Reminder State
  const [popupData, setPopupData] = useState(null);
  const [lastNotifiedTime, setLastNotifiedTime] = useState("");
  const [pushStatus, setPushStatus] = useState("Checking...");

  const chatEndRef = useRef(null);
  const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Create a stable authenticated axios instance
  const api = React.useMemo(() => {
    const instance = axios.create({
      baseURL: API_BASE_URL,
      headers: { Authorization: `Bearer ${token}` }
    });

    // Add interceptor to handle 401 (Unauthorized) errors
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          console.warn("Unauthorized! Logging out...");
          logout();
        }
        return Promise.reject(error);
      }
    );
    return instance;
  }, [token, logout]);

  useEffect(() => {
    fetchSchedule();
    requestNotificationPermission();
  }, [token]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    updateStatusLabel(permission);
  };

  const updateStatusLabel = (permission) => {
    if (permission === "granted") {
      setPushStatus("Allowed ✅");
    } else {
      setPushStatus("Denied ❌");
    }
  };

  // In-App Reminder Interval
  useEffect(() => {
    if (!token || scheduleList.length === 0) return;

    const checkSchedule = async () => {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      if (currentTime === lastNotifiedTime) return;

      const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' });

      const medicinesToTake = scheduleList.filter(item => {
        if (item.time !== currentTime) return false;
        if (!item.days?.includes(currentDay)) return false;
        return true;
      });

      if (medicinesToTake.length > 0) {
        medicinesToTake.forEach(med => {
          setPopupData(med);
          setMessages(prev => [...prev, {
            sender: "bot",
            text: `⏰ **REMINDER**: It's time for **${med.name}** (${med.time})! ✅`
          }]);

          if (Notification.permission === "granted") {
            new Notification("Medicine Reminder", {
              body: `Time to take ${med.name}`,
              icon: "/logo192.png"
            });
          }
        });
        setLastNotifiedTime(currentTime);
      }
    };

    const interval = setInterval(checkSchedule, 10000);
    return () => clearInterval(interval);
  }, [scheduleList, lastNotifiedTime, token]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const setupPushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn("Push notifications not supported");
      return;
    }

    // 1. Request permission immediately (Required for mobile user-gesture)
    let permission = Notification.permission;
    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      setPushStatus("Denied 🚫");
      alert("Permission denied. Please enable notifications in your browser settings (click the lock icon in the URL bar).");
      return;
    }

    try {
      console.log("Attempting Service Worker registration...");
      const registration = await navigator.serviceWorker.register('/custom-sw.js');
      console.log("Service Worker registered:", registration);

      await navigator.serviceWorker.ready;
      console.log("Service Worker is ready.");

      setPushStatus("In Progress...");
      const pubKeyResp = await api.get('/vapid-public-key');
      const publicKey = pubKeyResp.data.publicKey;

      if (!publicKey) {
        console.error("Server failed to provide VAPID key.");
        return;
      }

      const convertedVapidKey = urlBase64ToUint8Array(publicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      console.log("Subscription object created:", subscription);

      await api.post('/subscribe', subscription);
      console.log("Saved to database");
      setPushStatus("Active ✅");
      alert("Success! Notifications are now active.");
    } catch (err) {
      console.error("Critical Push Error:", err);
      setPushStatus("Error ❌");
      alert("Failed to sync notifications. See console for details.");
    }
  };

  const fetchSchedule = async () => {
    try {
      const resp = await api.get('/schedule');
      setScheduleList(resp.data);
    } catch (e) { console.error(e); }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const resp = await api.post('/ask', { question: input });
      setMessages(prev => [...prev, { sender: 'bot', text: resp.data.answer }]);
    } catch (e) {
      console.error("AI fetch error:", e);
      let errorMsg = "Error connecting to AI.";
      if (e.response) {
        errorMsg += ` Server responded with ${e.response.status}`;
      } else if (e.request) {
        errorMsg += " No response received from server. Is the backend running?";
      }
      setMessages(prev => [...prev, { sender: 'bot', text: errorMsg }]);
    }
    setLoading(false);
  };

  const addSchedule = async () => {
    if (!newMedicine || !newTime) return;
    try {
      await api.post('/schedule', { name: newMedicine, time: newTime, days: newDays });
      setNewMedicine(""); setNewTime("");
      fetchSchedule();
    } catch (e) { alert("Error adding schedule"); }
  };

  const handleMultiSchedule = async () => {
    if (!newMedicine) return alert("Please enter medicine name");

    const tasks = [];
    if (schedulePeriods.morning) tasks.push({ time: scheduleTimes.morning, period: "Morning" });
    if (schedulePeriods.afternoon) tasks.push({ time: scheduleTimes.afternoon, period: "Afternoon" });
    if (schedulePeriods.night) tasks.push({ time: scheduleTimes.night, period: "Night" });
    if (schedulePeriods.custom && scheduleTimes.custom) tasks.push({ time: scheduleTimes.custom, period: null });

    if (tasks.length === 0) return alert("Please select at least one time slot.");

    try {
      for (const t of tasks) {
        await api.post('/schedule', {
          name: newMedicine,
          time: t.time,
          period: t.period,
          days: newDays
        });
      }
      setNewMedicine("");
      setSchedulePeriods({ morning: false, afternoon: false, night: false, custom: false });
      setScheduleTimes({ ...scheduleTimes, custom: "" });
      fetchSchedule();
      alert("Schedule added successfully!");
    } catch (e) { alert("Error adding schedule"); }
  };

  const handleOCRSubmit = async (medName) => {
    const tasks = [];
    if (schedulePeriods.morning) tasks.push({ time: scheduleTimes.morning, period: "Morning" });
    if (schedulePeriods.afternoon) tasks.push({ time: scheduleTimes.afternoon, period: "Afternoon" });
    if (schedulePeriods.night) tasks.push({ time: scheduleTimes.night, period: "Night" });
    if (schedulePeriods.custom && scheduleTimes.custom) tasks.push({ time: scheduleTimes.custom, period: null });

    if (tasks.length === 0) return alert("Please select at least one time slot.");

    try {
      for (const t of tasks) {
        await api.post('/schedule', {
          name: medName,
          time: t.time,
          period: t.period,
          days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        });
      }
      setSelectedForSchedule(null);
      setSchedulePeriods({ morning: false, afternoon: false, night: false, custom: false });
      fetchSchedule();
      alert(`Scheduled ${medName} successfully!`);
    } catch (e) { alert("Error adding schedule"); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const resp = await api.post('/upload', fd);
      setExtractedText(resp.data.extracted_text);
      setExtractedMedicines(resp.data.medicines || []);
    } catch (e) { alert("Upload failed"); }
    setUploading(false);
  };

  // Edit/Delete Logic
  const handleEditClick = (item) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditTime(item.time);
    setEditDays(item.days || []);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/schedule/${editId}`, {
        name: editName,
        time: editTime,
        days: editDays
      });
      setIsEditing(false);
      fetchSchedule();
    } catch (e) { alert("Error updating schedule"); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this schedule?")) return;
    try {
      await api.delete(`/schedule/${editId}`);
      setIsEditing(false);
      fetchSchedule();
    } catch (e) { alert("Error deleting"); }
  };

  const handleConfirmAction = () => {
    setMessages(prev => [...prev, { sender: 'bot', text: `✅ Recorded: You took **${popupData.name}**.` }]);
    setPopupData(null);
  };

  const handleSnoozeAction = async (min) => {
    try {
      // If we have a confirmation_id (from backend push), notify backend
      if (popupData.id) {
        await api.post('/confirm', { confirmation_id: popupData.id, status: 'snoozed', minutes: min });
      }
      setMessages(prev => [...prev, { sender: 'bot', text: `⏳ OK, I'll remind you about **${popupData.name}** in ${min} mins.` }]);
      setPopupData(null);
    } catch (e) {
      console.error("Snooze error:", e);
      setPopupData(null);
    }
  };

  const renderMessage = (text) => {
    if (!text) return "";

    // Split into lines to detect section titles
    return text.split('\n').map((line, lineIdx) => {
      // If line is a title like "💊 **...**", wrap in section-title class
      if (line.startsWith("💊 **") && line.endsWith("**")) {
        return <span key={lineIdx} className="section-title">{line.replace(/\*\*/g, '')}</span>;
      }

      // Split line for bold parts
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={lineIdx}>
          {parts.map((part, index) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={index} style={{ fontWeight: '700', color: 'inherit' }}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </div>
      );
    });
  };

  return (
    <div className="app-wrapper">
      <div className="chat-container">
        <div className="app-header">
          <div className="brand">
            <div className="app-logo">💊</div>
            <div>
              <h1 className="title">MedAssist AI</h1>
              <p className="subtitle">Secure Health Companion | <span style={{ color: pushStatus.includes('Allowed') ? 'var(--secondary)' : '#e11d48' }}>{pushStatus}</span></p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="toast-btn btn-primary" style={{ height: '32px', padding: '0 12px', fontSize: '11px', boxShadow: 'none' }} onClick={setupPushNotifications}>Sync</button>
            <button className="logout-btn" style={{ background: 'rgba(225, 29, 72, 0.1)', color: '#e11d48', border: '1px solid rgba(225, 29, 72, 0.2)', padding: '0 12px', height: '32px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }} onClick={logout}>Exit</button>
          </div>
        </div>

        <div className="tabs">
          <div className={`tab ${activeTab === "chat" ? "active" : ""}`} onClick={() => setActiveTab("chat")}>
            <span className="tab-icon">💬</span>
            <span>Assistant</span>
          </div>
          <div className={`tab ${activeTab === "upload" ? "active" : ""}`} onClick={() => setActiveTab("upload")}>
            <span className="tab-icon">📷</span>
            <span>Scan</span>
          </div>
          <div className={`tab ${activeTab === "schedule" ? "active" : ""}`} onClick={() => setActiveTab("schedule")}>
            <span className="tab-icon">📅</span>
            <span>Schedule</span>
          </div>
        </div>

        {showDisclaimer && (
          <div className="disclaimer-banner">
            <p>⚠️ <b>Disclaimer:</b> This app is for informational purposes only and does not replace professional medical advice.</p>
            <button onClick={() => setShowDisclaimer(false)}>OK</button>
          </div>
        )}

        <div className="content">
          {activeTab === "chat" && (
            <div className="chat-area">
              <div className="chat-box">
                {messages.map((m, i) => (
                  <div key={i} className={`message-row ${m.sender}`}>
                    <div className={`avatar ${m.sender === 'bot' ? 'bot-avatar' : 'user-avatar'}`}>
                      {m.sender === 'bot' ? '🤖' : '👤'}
                    </div>
                    <div className="message-bubble">{renderMessage(m.text)}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="input-area">
                <div className="input-wrapper">
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message" />
                </div>
                <button className="send-btn" onClick={sendMessage}>➤</button>
              </div>
            </div>
          )}

          {activeTab === "schedule" && (
            <div className="schedule-container">
              <div className="glass-card" style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 12px 0', fontWeight: '500', color: 'var(--text-muted)' }}>Experience AI-powered prescription scanning</p>
                <button className="btn-primary" onClick={() => setActiveTab("upload")} style={{ width: 'auto', margin: '0 auto', fontSize: '14px' }}>
                  📸 Scan Prescription
                </button>
              </div>

              <div className="glass-card">
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>✨ Manual Entry</h3>
                <input className="input-glass" placeholder="Medicine Name" value={newMedicine} onChange={e => setNewMedicine(e.target.value)} style={{ marginBottom: '15px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '15px' }}>
                  {['morning', 'afternoon', 'night', 'custom'].map(p => (
                    <div key={p} className={`period-row ${schedulePeriods[p] ? 'active' : ''}`}
                      onClick={() => setSchedulePeriods({ ...schedulePeriods, [p]: !schedulePeriods[p] })}>
                      <input type="checkbox" className="period-checkbox" checked={schedulePeriods[p]} readOnly />
                      <span className="period-label">{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                      {schedulePeriods[p] && (
                        <input type="time" className="period-time-input"
                          value={scheduleTimes[p]}
                          onClick={(e) => e.stopPropagation()}
                          onChange={e => setScheduleTimes({ ...scheduleTimes, [p]: e.target.value })} />
                      )}
                    </div>
                  ))}
                </div>
                <button className="btn-primary" onClick={handleMultiSchedule}>Add to My Schedule</button>
              </div>

              <div className="days-grid">
                {DAYS_OF_WEEK.map(d => (
                  <div key={d} className={`day-checkbox ${newDays.includes(d) ? 'selected' : ''}`}
                    onClick={() => setNewDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}>
                    {d}
                  </div>
                ))}
              </div>

              <ul className="schedule-list">
                {scheduleList.map(s => (
                  <li key={s.id} className="schedule-item">
                    <div className="schedule-info">
                      <span className="schedule-name">{s.name}</span>
                      <span className="schedule-time">{s.time}</span>
                    </div>
                    <button className="toast-btn btn-secondary" style={{ width: 'auto' }} onClick={() => handleEditClick(s)}>Edit</button>
                  </li>
                ))}
              </ul>
              <div style={{ height: '100px', flexShrink: 0 }} />
            </div>
          )}

          {activeTab === "upload" && (
            <div className="upload-container">
              {!extractedText ? (
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 0 10px var(--primary-glow))' }}>📷</div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem' }}>Smart Scanner</h3>
                  <p style={{ color: 'var(--text-muted)', margin: '-10px 0 10px 0' }}>Upload a photo and our AI will extract medications instantly.</p>
                  <input type="file" id="file-upload" onChange={handleFileUpload} style={{ display: 'none' }} />
                  <label htmlFor="file-upload" className="btn-primary" style={{ cursor: 'pointer', padding: '16px 32px', display: 'inline-block' }}>
                    {uploading ? "⌛ Processing..." : "📁 Choose Image"}
                  </label>
                  {uploading && <p style={{ fontSize: '12px', color: 'var(--primary)' }}>⚡ Analyzing prescription with AI...</p>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <button className="btn-outline" onClick={() => { setExtractedText(""); setExtractedMedicines([]); }} style={{ alignSelf: 'flex-start' }}>← Scan Another</button>
                  {extractedMedicines.length > 0 && (
                    <div className="schedule-container" style={{ padding: 0, border: '2px solid #10b981', background: '#f0fdf4' }}>
                      <h3 style={{ padding: '15px', margin: 0, borderBottom: '1px solid #bbf7d0', color: '#166534', background: '#dcfce7' }}>🚀 Found {extractedMedicines.length} Medicines</h3>
                      <div className="schedule-list" style={{ padding: '15px' }}>
                        {extractedMedicines.map((med, idx) => (
                          <div key={idx} className="schedule-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', background: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>💊 {med}</span>
                              {selectedForSchedule !== med && (
                                <button className="btn-primary" style={{ width: 'auto', background: '#10b981' }} onClick={() => {
                                  setSelectedForSchedule(med);
                                  setSchedulePeriods({ morning: false, afternoon: false, night: false, custom: false });
                                }}>Schedule This</button>
                              )}
                            </div>
                            {selectedForSchedule === med && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#64748b' }}>Select times for <b>{med}</b>:</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {['morning', 'afternoon', 'night', 'custom'].map(p => (
                                    <div key={p} className={`period-row ${schedulePeriods[p] ? 'active' : ''}`}
                                      onClick={() => setSchedulePeriods({ ...schedulePeriods, [p]: !schedulePeriods[p] })}>
                                      <input type="checkbox" className="period-checkbox" checked={schedulePeriods[p]} readOnly />
                                      <span className="period-label">{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                                      {schedulePeriods[p] && (
                                        <input type="time" className="period-time-input"
                                          value={scheduleTimes[p]}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={e => setScheduleTimes({ ...scheduleTimes, [p]: e.target.value })} />
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                  <button className="btn-primary" onClick={() => handleOCRSubmit(med)}>Confirm Schedule</button>
                                  <button className="btn-outline" onClick={() => setSelectedForSchedule(null)}>Cancel</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="schedule-form" style={{ flexDirection: 'column', opacity: 0.8 }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>📄 Full Prescription Text</h3>
                    <textarea className="extracted-text" value={extractedText} readOnly style={{ height: '150px' }} />
                  </div>
                  <div style={{ height: '100px', flexShrink: 0 }} />
                </div>
              )}
            </div>
          )}
        </div>


        {/* Overlays */}
        {popupData && (
          <div className="notification-toast">
            <div className="toast-icon">💊</div>
            <div className="toast-body">
              <div className="toast-title">Medicine Reminder</div>
              <p className="toast-message">It's time for <b>{popupData.name}</b> ({popupData.time})</p>
              <div className="toast-actions">
                <button className="toast-btn btn-primary" onClick={handleConfirmAction}>Taken ✅</button>
                <button className="toast-btn btn-secondary" onClick={() => handleSnoozeAction(5)}>Snooze 5m</button>
                <button className="toast-btn btn-secondary" onClick={() => handleSnoozeAction(30)}>Snooze 30m</button>
              </div>
            </div>
          </div>
        )}

        {isEditing && (
          <div className="popup-overlay">
            <div className="popup-content">
              <h3 className="popup-title">Edit Medication</h3>
              <div className="edit-form">
                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Medicine Name" />
                <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} />
                <div className="days-grid">
                  {DAYS_OF_WEEK.map(d => (
                    <div key={d} className={`day-checkbox ${editDays.includes(d) ? 'selected' : ''}`}
                      onClick={() => setEditDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}>
                      {d}
                    </div>
                  ))}
                </div>
              </div>
              <div className="popup-footer">
                <button className="toast-btn delete-btn" onClick={handleDelete}>Delete</button>
                <button className="toast-btn cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                <button className="toast-btn save-btn" onClick={handleSaveEdit}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function App() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/" element={<AuthCheck isLogin={isLogin} setIsLogin={setIsLogin} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

function AuthCheck({ isLogin, setIsLogin }) {
  const { token } = useAuth();

  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-container">
          {isLogin ? <Login onToggle={() => setIsLogin(false)} /> : <Signup onToggle={() => setIsLogin(true)} />}
        </div>
      </div>
    );
  }

  return <MainApp />;
}

export default App;