import React, { useState, useEffect } from "react";
import IVRBuilder from "./components/IVRBuilder";
import axios from "axios";
import "./App.css";

const API_BASE = "http://localhost:5000"; // or your backend URL

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("ivrUser")) || null);
  const [form, setForm] = useState({ username: "", password: "" });
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, form);
      localStorage.setItem("ivrUser", JSON.stringify(res.data));
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
      setUser(res.data);
      setError("");
    } catch {
      setError("Invalid credentials.");
    }
  };

  const handleRegister = async () => {
    try {
      await axios.post(`${API_BASE}/auth/register`, form);
      alert("User registered successfully");
      setIsRegisterMode(false);
      setForm({ username: "", password: "" });
    } catch {
      setError("User already exists.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ivrUser");
    setUser(null);
  };

  useEffect(() => {
    if (user?.token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${user.token}`;
    }
  }, [user]);

  return (
    <div className="app-wrapper">
      {!user ? (
        <div className="auth-box">
          <h2>{isRegisterMode ? "Register" : "Login"} to Flow Builder</h2>
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error && <p className="error">{error}</p>}
          <button onClick={isRegisterMode ? handleRegister : handleLogin}>
            {isRegisterMode ? "Register" : "Login"}
          </button>
          <p>
            {isRegisterMode ? "Already have an account?" : "No account yet?"}
            <span onClick={() => setIsRegisterMode(!isRegisterMode)}>
              {isRegisterMode ? " Login" : " Register"}
            </span>
          </p>
        </div>
      ) : (
        <>
          <div className="topbar">
            Logged in as <strong>{user.username}</strong>
            <button onClick={handleLogout}>Logout</button>
          </div>
          <IVRBuilder user={user} />
        </>
      )}
    </div>
  );
}

export default App;
