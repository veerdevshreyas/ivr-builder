// App.js
import React, { useState, useEffect } from 'react';
import IVRBuilder from './components/IVRBuilder';
import axios from 'axios';

const API_BASE = 'https://flow-builder-backend.onrender.com';

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("ivrUser")) || null);
  const [form, setForm] = useState({ username: "", password: "" });
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, form);
      localStorage.setItem("ivrUser", JSON.stringify(res.data));
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setUser(res.data);
      setError("");
    } catch (err) {
      setError("Invalid credentials or server error.");
    }
  };

  const handleRegister = async () => {
    try {
      const res = await axios.post(`${API_BASE}/auth/register`, form);
      alert("User registered successfully");
      setIsRegisterMode(false);
      setForm({ username: "", password: "" });
      setError("");
    } catch (err) {
      setError("User already exists or server error.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ivrUser");
    setUser(null);
  };

  useEffect(() => {
    if (user?.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
    }
  }, [user]);

  return (
    <div>
      {!user ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <h2>{isRegisterMode ? "Register" : "Login"} to IVR Flow Builder</h2>
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            style={{ padding: 10, fontSize: 16, margin: 6 }}
          />
          <br />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={{ padding: 10, fontSize: 16, margin: 6 }}
          />
          <br />
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button
            onClick={isRegisterMode ? handleRegister : handleLogin}
            style={{ padding: "10px 20px", margin: 10 }}
          >
            {isRegisterMode ? "Register" : "Login"}
          </button>
          <p>
            {isRegisterMode ? "Already have an account?" : "Don't have an account?"}
            <button
              style={{ marginLeft: 10 }}
              onClick={() => setIsRegisterMode(!isRegisterMode)}
            >
              {isRegisterMode ? "Login" : "Register"}
            </button>
          </p>
        </div>
      ) : (
        <>
          <div style={{ padding: 8, background: "#f0f0f0", textAlign: "right" }}>
            Logged in as <strong>{user.username}</strong> ({user.role})
            <button onClick={handleLogout} style={{ marginLeft: 12, padding: "6px 12px" }}>Logout</button>
          </div>
          <IVRBuilder user={user} />
        </>
      )}
    </div>
  );
}

export default App;

