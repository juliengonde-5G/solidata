import React, { useState, useEffect } from 'react';
import api, { setToken, clearToken, getToken } from './utils/api';
import App from './App';

const T = {
  primary: "#008678",
  dark: "#253036",
  bg: "#FFFAF6",
  card: "#FFFFFF",
  text: "#253036",
  sub: "#5a6872",
  light: "#8a959e",
  border: "#e8e0d8",
  success: "#2ecc71",
  warning: "#f39c12",
  danger: "#e74c3c",
};

export default function AppWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const token = getToken();
    if (token) {
      api("/me").then(u => { setUser(u); setLoading(false); })
        .catch(() => { clearToken(); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const data = await api("/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setToken(data.access_token);
      const me = await api("/me");
      setUser(me);
    } catch (err) {
      setLoginError(err.message || "Erreur de connexion");
    }
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: T.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: T.primary }}>Solidata</div>
          <div style={{ color: T.sub, marginTop: 8 }}>Chargement...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: T.bg }}>
        <form onSubmit={handleLogin} style={{
          background: T.card, padding: 40, borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          width: 380, maxWidth: "90vw",
        }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: T.primary }}>Solidata</div>
            <div style={{ color: T.sub, fontSize: 13, marginTop: 4 }}>Solidarité Textiles — ERP</div>
          </div>
          {loginError && <div style={{ color: T.danger, fontSize: 13, marginBottom: 12, textAlign: "center" }}>{loginError}</div>}
          <input
            type="text" placeholder="Identifiant" value={username}
            onChange={e => setUsername(e.target.value)}
            style={{
              width: "100%", padding: "12px 16px", border: `1px solid ${T.border}`, borderRadius: 8,
              fontSize: 14, marginBottom: 12, outline: "none", fontFamily: "Poppins",
            }}
          />
          <input
            type="password" placeholder="Mot de passe" value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: "100%", padding: "12px 16px", border: `1px solid ${T.border}`, borderRadius: 8,
              fontSize: 14, marginBottom: 20, outline: "none", fontFamily: "Poppins",
            }}
          />
          <button type="submit" style={{
            width: "100%", padding: "12px 0", background: T.primary, color: "#fff", border: "none",
            borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "Poppins",
          }}>
            Se connecter
          </button>
        </form>
      </div>
    );
  }

  return <App user={user} onLogout={handleLogout} />;
}
