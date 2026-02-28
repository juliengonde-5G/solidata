import React from 'react';

const T = {
  primary: "#008678", dark: "#253036", bg: "#FFFAF6", card: "#FFFFFF",
  text: "#253036", sub: "#5a6872", border: "#e8e0d8",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function HomePage({ user, onNavigate }) {
  const univers = [
    { key: "collecte", icon: "\u{1F69B}", title: "Collecte", desc: "Tournées, CAV, véhicules, pesées", color: "#008678" },
    { key: "poj", icon: "\u{267B}\u{FE0F}", title: "Tri & Production", desc: "Plan d'Occupation Journalier", color: "#f39c12" },
    { key: "personnel", icon: "\u{1F465}", title: "Personnel", desc: "Recrutement, tests, comptes", color: "#9b59b6" },
  ];

  const quickLinks = [
    { key: "mobile", label: "Mobile", icon: "\u{1F4F1}" },
    { key: "live", label: "Live", icon: "\u{1F4E1}" },
    { key: "kanban", label: "Kanban", icon: "\u{1F4CB}" },
    { key: "users", label: "Comptes", icon: "\u{1F464}" },
  ];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: T.dark }}>
          {getGreeting()}, {user?.full_name || user?.username}
        </h1>
        <p style={{ color: T.sub, marginTop: 4 }}>Solidarité Textiles — Métropole Rouen Normandie</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 32 }}>
        {univers.map(u => (
          <div key={u.key} onClick={() => onNavigate(u.key)} style={{
            background: T.card, borderRadius: 16, padding: 28, cursor: "pointer",
            border: `1px solid ${T.border}`, transition: "all 0.2s",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>{u.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: u.color, marginBottom: 6 }}>{u.title}</div>
            <div style={{ color: T.sub, fontSize: 13 }}>{u.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {quickLinks.map(l => (
          <button key={l.key} onClick={() => onNavigate(l.key)} style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 20px",
            cursor: "pointer", fontSize: 13, fontFamily: "Poppins", color: T.dark, fontWeight: 500,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>{l.icon}</span> {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
