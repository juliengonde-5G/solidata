import React, { useState, useEffect, useCallback } from 'react';
import api from './utils/api';
import { Card, Btn, Badge } from './App';

const T = { primary: "#008678", dark: "#253036", sub: "#5a6872", border: "#e8e0d8", card: "#FFFFFF", success: "#2ecc71", warning: "#f39c12", danger: "#e74c3c" };

const ROLES = ["ADMIN", "MANAGER", "OPERATOR", "VIEWER"];
const ROLE_COLORS = { ADMIN: "#e74c3c", MANAGER: "#f39c12", OPERATOR: "#008678", VIEWER: "#95a5a6" };

export default function UsersModule() {
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", email: "", role: "VIEWER" });
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => { setUsers(await api("/users/")); }, []);
  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api("/users/", { method: "POST", body: JSON.stringify(form) });
      setShowAdd(false); setForm({ username: "", password: "", full_name: "", email: "", role: "VIEWER" }); load();
      setToast({ message: "Utilisateur créé" });
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const handleToggleActive = async (user) => {
    try {
      await api(`/users/${user.id}`, { method: "PUT", body: JSON.stringify({ is_active: !user.is_active }) });
      load();
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  const handleResetPassword = async (userId) => {
    const newPwd = prompt("Nouveau mot de passe :");
    if (!newPwd) return;
    try {
      await api(`/users/${userId}/reset-password`, { method: "POST", body: JSON.stringify({ new_password: newPwd }) });
      setToast({ message: "Mot de passe réinitialisé" });
    } catch (err) { setToast({ message: err.message, type: "error" }); }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark }}>Gestion des comptes</h2>
        <Btn onClick={() => setShowAdd(true)}>+ Utilisateur</Btn>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {users.map(u => (
          <Card key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name || u.username}</div>
              <div style={{ color: T.sub, fontSize: 12 }}>{u.username} {u.email && `— ${u.email}`}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge color={ROLE_COLORS[u.role]}>{u.role}</Badge>
              <Badge color={u.is_active ? T.success : T.danger}>{u.is_active ? "Actif" : "Inactif"}</Badge>
              <button onClick={() => handleToggleActive(u)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: "Poppins" }}>
                {u.is_active ? "Désactiver" : "Activer"}
              </button>
              <button onClick={() => handleResetPassword(u.id)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: "Poppins" }}>
                Reset MDP
              </button>
            </div>
          </Card>
        ))}
      </div>

      {showAdd && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200 }}>
          <form onSubmit={handleAdd} style={{ background: T.card, borderRadius: 16, padding: 32, width: 420 }}>
            <h3 style={{ marginBottom: 16 }}>Nouvel utilisateur</h3>
            {["username", "password", "full_name", "email"].map(f => (
              <input key={f} placeholder={f} type={f === "password" ? "password" : "text"} value={form[f]}
                onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }} />
            ))}
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 16, fontSize: 13, fontFamily: "Poppins" }}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setShowAdd(false)}>Annuler</Btn>
              <Btn>Créer</Btn>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "error" ? T.danger : T.success, color: "#fff", padding: "12px 24px", borderRadius: 10, fontSize: 14, zIndex: 9999 }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
