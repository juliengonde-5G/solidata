import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from './utils/api';
import HomePage from './HomePage';
import CollecteModule from './CollecteModule';
import MapModule from './MapModule';
import MobileModule from './MobileModule';
import LiveDashboard from './LiveDashboard';
import PeseeModule from './PeseeModule';
import MaterielModule from './MaterielModule';
import PlanificationModule from './PlanificationModule';
import EquipeModule from './EquipeModule';
import POJModule from './POJModule';
import ReportingModule from './ReportingModule';
import UsersModule from './UsersModule';
import DashboardGlobal from './DashboardGlobal';

const T = {
  primary: "#008678", dark: "#253036", bg: "#FFFAF6", card: "#FFFFFF",
  text: "#253036", sub: "#5a6872", light: "#8a959e", border: "#e8e0d8",
  success: "#2ecc71", warning: "#f39c12", danger: "#e74c3c",
};

// ── Composants réutilisables ──
export function Card({ children, style, ...props }) {
  return <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20, ...style }} {...props}>{children}</div>;
}
export function Badge({ children, color }) {
  return <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: (color || T.primary) + "18", color: color || T.primary }}>{children}</span>;
}
export function Btn({ children, variant, onClick, style, disabled }) {
  const bg = variant === "danger" ? T.danger : variant === "secondary" ? T.border : T.primary;
  const clr = variant === "secondary" ? T.dark : "#fff";
  return <button onClick={onClick} disabled={disabled} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: bg, color: clr, fontWeight: 600, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "Poppins", opacity: disabled ? 0.6 : 1, ...style }}>{children}</button>;
}
export function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 16, textAlign: "center", minWidth: 140 }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || T.primary, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: T.sub }}>{label}</div>
    </div>
  );
}
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const bg = type === "error" ? T.danger : type === "warning" ? T.warning : T.success;
  return <div style={{ position: "fixed", bottom: 24, right: 24, background: bg, color: "#fff", padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>{message}</div>;
}

// ── KanbanBoard ──
function KanbanBoard() {
  const [candidates, setCandidates] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", gender: "", position_id: "" });
  const [toast, setToast] = useState(null);
  const dragRef = useRef(null);

  const columns = [
    { key: "received", label: "Candidature reçue", color: T.primary },
    { key: "preselected", label: "Qualifiée", color: T.warning },
    { key: "interview", label: "Entretien confirmé", color: "#3498db" },
    { key: "test", label: "Test", color: "#9b59b6" },
    { key: "hired", label: "Recruté", color: T.success },
  ];

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([api("/candidates"), api("/positions")]);
    setCandidates(c); setPositions(p);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleDrop = async (cid, toStatus) => {
    try {
      await api(`/candidates/${cid}/move`, { method: "POST", body: JSON.stringify({ to_status: toStatus }) });
      load();
    } catch (e) { setToast({ message: e.message, type: "error" }); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api("/candidates", { method: "POST", body: JSON.stringify({ ...form, position_id: form.position_id || null }) });
      setShowAdd(false); setForm({ first_name: "", last_name: "", email: "", phone: "", gender: "", position_id: "" }); load();
      setToast({ message: "Candidat ajouté", type: "success" });
    } catch (e) { setToast({ message: e.message, type: "error" }); }
  };

  const handleUpdateCandidate = async (field, value) => {
    if (!selected) return;
    try {
      await api(`/candidates/${selected.id}`, { method: "PUT", body: JSON.stringify({ [field]: value }) });
      load();
      setSelected(s => ({ ...s, [field]: value }));
    } catch (e) { setToast({ message: e.message, type: "error" }); }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark }}>Kanban Recrutement</h2>
        <Btn onClick={() => setShowAdd(true)}>+ Candidat</Btn>
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {columns.map(col => (
          <div key={col.key} style={{ minWidth: 240, flex: 1 }}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (dragRef.current) handleDrop(dragRef.current, col.key); }}
          >
            <div style={{ padding: "8px 12px", background: col.color + "15", borderRadius: "8px 8px 0 0", fontWeight: 600, fontSize: 13, color: col.color }}>
              {col.label} ({candidates.filter(c => c.kanban_status === col.key).length})
            </div>
            <div style={{ background: T.bg, borderRadius: "0 0 8px 8px", padding: 8, minHeight: 200 }}>
              {candidates.filter(c => c.kanban_status === col.key).map(c => (
                <div key={c.id} draggable onDragStart={() => { dragRef.current = c.id; }} onClick={() => setSelected(c)} style={{
                  background: T.card, borderRadius: 8, padding: 12, marginBottom: 8, cursor: "pointer",
                  border: `1px solid ${selected?.id === c.id ? T.primary : T.border}`, fontSize: 13,
                }}>
                  <div style={{ fontWeight: 600 }}>{c.first_name} {c.last_name}</div>
                  {c.email && <div style={{ color: T.sub, fontSize: 11 }}>{c.email}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Panneau détail */}
      {selected && (
        <div style={{ position: "fixed", top: 0, right: 0, width: 400, height: "100vh", background: T.card, boxShadow: "-4px 0 24px rgba(0,0,0,0.1)", padding: 24, overflowY: "auto", zIndex: 100 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>{selected.first_name} {selected.last_name}</h3>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>x</button>
          </div>
          {["first_name", "last_name", "email", "phone", "gender", "comment", "cr_interview", "cr_test"].map(field => (
            <div key={field} style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: T.sub, display: "block", marginBottom: 4 }}>{field}</label>
              <input value={selected[field] || ""} onChange={e => setSelected(s => ({ ...s, [field]: e.target.value }))}
                onBlur={e => handleUpdateCandidate(field, e.target.value)}
                style={{ width: "100%", padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, fontFamily: "Poppins" }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal ajout */}
      {showAdd && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200 }}>
          <form onSubmit={handleAdd} style={{ background: T.card, borderRadius: 16, padding: 32, width: 400, maxWidth: "90vw" }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Nouveau candidat</h3>
            {["first_name", "last_name", "email", "phone"].map(f => (
              <input key={f} placeholder={f} value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }}
              />
            ))}
            <select value={form.position_id} onChange={e => setForm(p => ({ ...p, position_id: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 16, fontSize: 13, fontFamily: "Poppins" }}>
              <option value="">Poste (optionnel)</option>
              {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setShowAdd(false)}>Annuler</Btn>
              <Btn>Ajouter</Btn>
            </div>
          </form>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── PCM Questionnaire ──
function PCMQuestionnaire({ candidateId, onDone }) {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [mode, setMode] = useState(null); // "images" ou "text"
  const [toast, setToast] = useState(null);

  useEffect(() => { api("/pcm/questionnaire").then(setQuestions); }, []);

  if (!mode) {
    return (
      <div style={{ padding: 40, textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: T.dark, marginBottom: 12 }}>Test de personnalité PCM</h2>
        <p style={{ color: T.sub, marginBottom: 32 }}>Choisissez votre mode de passation</p>
        <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
          <div onClick={() => setMode("images")} style={{ background: T.card, borderRadius: 16, padding: 32, cursor: "pointer", border: `2px solid ${T.border}`, flex: 1, maxWidth: 220 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{"\u{1F5BC}"}</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Images</div>
            <div style={{ color: T.sub, fontSize: 12, marginTop: 4 }}>Cartes visuelles avec pictogrammes</div>
          </div>
          <div onClick={() => setMode("text")} style={{ background: T.card, borderRadius: 16, padding: 32, cursor: "pointer", border: `2px solid ${T.border}`, flex: 1, maxWidth: 220 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{"\u{1F4DD}"}</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Texte</div>
            <div style={{ color: T.sub, fontSize: 12, marginTop: 4 }}>Descriptions textuelles détaillées</div>
          </div>
        </div>
      </div>
    );
  }

  if (!questions.length) return <div style={{ padding: 40, textAlign: "center", color: T.sub }}>Chargement...</div>;

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  const handleAnswer = async (typeKey) => {
    const newAnswers = [...answers, typeKey];
    setAnswers(newAnswers);
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      try {
        const result = await api("/pcm/submit", {
          method: "POST",
          body: JSON.stringify({ candidate_id: candidateId, answers: newAnswers, input_mode: mode }),
        });
        onDone(result);
      } catch (e) { setToast({ message: e.message, type: "error" }); }
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.sub, marginBottom: 8 }}>
          <span>Question {current + 1} / {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 6, background: T.border, borderRadius: 3 }}>
          <div style={{ height: 6, background: T.primary, borderRadius: 3, width: `${progress}%`, transition: "width 0.3s" }} />
        </div>
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 600, color: T.dark, marginBottom: 24, textAlign: "center" }}>{q.question}</h3>

      {mode === "images" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {q.options.map((opt, i) => (
            <div key={i} onClick={() => handleAnswer(opt.type)} style={{
              background: T.card, borderRadius: 12, padding: 20, cursor: "pointer", textAlign: "center",
              border: `2px solid ${opt.color}20`, transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = opt.color; e.currentTarget.style.transform = "scale(1.03)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = opt.color + "20"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ fontSize: 32 }}>{opt.emoji}</div>
              <div style={{ fontWeight: 600, color: opt.color, marginTop: 8, fontSize: 13 }}>{opt.short}</div>
              <div style={{ color: T.sub, fontSize: 11, marginTop: 4 }}>{opt.text}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {q.options.map((opt, i) => (
            <div key={i} onClick={() => handleAnswer(opt.type)} style={{
              background: T.card, borderRadius: 10, padding: "14px 18px", cursor: "pointer",
              border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = opt.color; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}
            >
              <span style={{ fontSize: 20 }}>{opt.emoji}</span>
              <span style={{ fontSize: 14 }}>{opt.text}</span>
            </div>
          ))}
        </div>
      )}

      {current > 0 && (
        <button onClick={() => { setCurrent(c => c - 1); setAnswers(a => a.slice(0, -1)); }}
          style={{ marginTop: 20, background: "none", border: "none", color: T.sub, cursor: "pointer", fontFamily: "Poppins", fontSize: 13 }}>
          Retour
        </button>
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── PCM Profile Report ──
function PCMProfileReport({ profile }) {
  const types = ["analyseur", "perseverant", "empathique", "imagineur", "energiseur", "promoteur"];
  const typeColors = { analyseur: "#2196F3", perseverant: "#9C27B0", empathique: "#FF9800", imagineur: "#795548", energiseur: "#4CAF50", promoteur: "#F44336" };
  const scores = types.map(t => ({ type: t, score: profile[`score_${t}`] || 0 })).sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...scores.map(s => s.score), 1);

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark, marginBottom: 4 }}>Profil PCM</h2>
      <p style={{ color: T.sub, fontSize: 13, marginBottom: 24 }}>Base : {profile.base_type} | Phase : {profile.phase_type}</p>

      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Immeuble de personnalité</h3>
        {scores.map((s, i) => (
          <div key={s.type} style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <div style={{ width: 100, fontSize: 13, fontWeight: i === 0 ? 600 : 400 }}>{s.type}</div>
            <div style={{ flex: 1, height: 20, background: T.bg, borderRadius: 4 }}>
              <div style={{ height: 20, background: typeColors[s.type], borderRadius: 4, width: `${(s.score / maxScore) * 100}%`, transition: "width 0.5s" }} />
            </div>
            <div style={{ width: 30, textAlign: "right", fontSize: 13, fontWeight: 600 }}>{s.score}</div>
          </div>
        ))}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <Card><div style={{ fontSize: 11, color: T.sub }}>Perception</div><div style={{ fontWeight: 600, fontSize: 14 }}>{profile.perception_dominante}</div></Card>
        <Card><div style={{ fontSize: 11, color: T.sub }}>Canal</div><div style={{ fontWeight: 600, fontSize: 14 }}>{profile.canal_communication}</div></Card>
        <Card><div style={{ fontSize: 11, color: T.sub }}>Besoin psychologique</div><div style={{ fontWeight: 600, fontSize: 14 }}>{profile.besoin_psychologique}</div></Card>
        <Card><div style={{ fontSize: 11, color: T.sub }}>Driver</div><div style={{ fontWeight: 600, fontSize: 14 }}>{profile.driver_principal}</div></Card>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Stress & RPS</h3>
        <Badge color={profile.rps_risk_level === "élevé" ? T.danger : profile.rps_risk_level === "modéré" ? T.warning : T.success}>
          Risque {profile.rps_risk_level}
        </Badge>
        <p style={{ color: T.sub, fontSize: 13, marginTop: 8 }}>{profile.masque_stress && `Masque de stress : ${profile.masque_stress}`}</p>
        <p style={{ color: T.sub, fontSize: 13, marginTop: 4 }}>{profile.scenario_stress}</p>
      </Card>

      {profile.communication_tips && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Guide Manager</h3>
          <p style={{ color: T.sub, fontSize: 13 }}>{profile.communication_tips}</p>
          {profile.environment_tips && <p style={{ color: T.sub, fontSize: 13, marginTop: 8 }}>{profile.environment_tips}</p>}
        </Card>
      )}
    </div>
  );
}

// ── PCM Page (liste candidats, questionnaire, rapport) ──
function PCMPage() {
  const [candidates, setCandidates] = useState([]);
  const [view, setView] = useState("list");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => { api("/candidates").then(setCandidates); }, []);

  if (view === "questionnaire" && selectedCandidate) {
    return (
      <div>
        <button onClick={() => setView("list")} style={{ margin: 16, background: "none", border: "none", color: T.primary, cursor: "pointer", fontFamily: "Poppins" }}>Retour</button>
        <PCMQuestionnaire candidateId={selectedCandidate.id} onDone={p => { setProfile(p); setView("report"); }} />
      </div>
    );
  }

  if (view === "report" && profile) {
    return (
      <div>
        <button onClick={() => setView("list")} style={{ margin: 16, background: "none", border: "none", color: T.primary, cursor: "pointer", fontFamily: "Poppins" }}>Retour</button>
        <PCMProfileReport profile={profile} />
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark, marginBottom: 20 }}>Tests PCM</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {candidates.map(c => (
          <Card key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.first_name} {c.last_name}</div>
              <div style={{ color: T.sub, fontSize: 12 }}>{c.email || ""}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => { setSelectedCandidate(c); setView("questionnaire"); }}>Passer le test</Btn>
              {c.pcm_test_id && <Btn variant="secondary" onClick={async () => {
                const p = await api(`/pcm/profiles/${c.id}`);
                setProfile(p); setView("report");
              }}>Voir profil</Btn>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Positions Page ──
function PositionsPage() {
  const [positions, setPositions] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", type: "", month: "", slots_open: 1 });
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => { setPositions(await api("/positions")); }, []);
  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api("/positions", { method: "POST", body: JSON.stringify(form) });
      setShowAdd(false); setForm({ title: "", type: "", month: "", slots_open: 1 }); load();
    } catch (e) { setToast({ message: e.message, type: "error" }); }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark }}>Postes</h2>
        <Btn onClick={() => setShowAdd(true)}>+ Poste</Btn>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {positions.map(p => (
          <Card key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{p.title}</div>
              <div style={{ color: T.sub, fontSize: 12 }}>{p.type} {p.month && `— ${p.month}`}</div>
            </div>
            <Badge>{p.slots_filled || 0}/{p.slots_open}</Badge>
          </Card>
        ))}
      </div>
      {showAdd && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200 }}>
          <form onSubmit={handleAdd} style={{ background: T.card, borderRadius: 16, padding: 32, width: 400 }}>
            <h3 style={{ marginBottom: 16 }}>Nouveau poste</h3>
            <input placeholder="Titre" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }} />
            <input placeholder="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }} />
            <input placeholder="Mois" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 10, fontSize: 13, fontFamily: "Poppins" }} />
            <input type="number" placeholder="Places" value={form.slots_open} onChange={e => setForm(f => ({ ...f, slots_open: parseInt(e.target.value) || 1 }))} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 16, fontSize: 13, fontFamily: "Poppins" }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setShowAdd(false)}>Annuler</Btn>
              <Btn>Créer</Btn>
            </div>
          </form>
        </div>
      )}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── App principale ──
export default function App({ user, onLogout }) {
  const [currentPage, setCurrentPage] = useState("home");

  // Détection mobile PWA
  const isMobile = window.location.search.includes("mobile=1");
  if (isMobile) return <MobileModule user={user} />;

  const navItems = [
    { key: "home", label: "Accueil" },
    { key: "collecte", label: "Collecte" },
    { key: "carte", label: "Carte" },
    { key: "poj", label: "Tri (POJ)" },
    { key: "kanban", label: "Kanban" },
    { key: "pcm", label: "PCM" },
    { key: "positions", label: "Postes" },
    { key: "reporting", label: "Reporting" },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case "home": return <HomePage user={user} onNavigate={setCurrentPage} />;
      case "collecte": return <CollecteModule user={user} />;
      case "carte": return <MapModule />;
      case "live": return <LiveDashboard />;
      case "mobile": return <MobileModule user={user} />;
      case "pesee": return <PeseeModule />;
      case "materiel": return <MaterielModule />;
      case "planification": return <PlanificationModule />;
      case "equipe": return <EquipeModule />;
      case "poj": return <POJModule />;
      case "reporting": return <ReportingModule />;
      case "users": return <UsersModule />;
      case "kanban": return <KanbanBoard />;
      case "pcm": return <PCMPage />;
      case "positions": return <PositionsPage />;
      case "dashboard": return <DashboardGlobal />;
      case "personnel": return (
        <div style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: T.dark, marginBottom: 20 }}>Personnel</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { key: "kanban", label: "Kanban", icon: "\u{1F4CB}" },
              { key: "pcm", label: "Tests PCM", icon: "\u{1F9E0}" },
              { key: "positions", label: "Postes", icon: "\u{1F4BC}" },
              { key: "users", label: "Comptes", icon: "\u{1F464}" },
            ].map(l => (
              <Card key={l.key} onClick={() => setCurrentPage(l.key)} style={{ cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 32 }}>{l.icon}</div>
                <div style={{ fontWeight: 600, marginTop: 8 }}>{l.label}</div>
              </Card>
            ))}
          </div>
        </div>
      );
      default: return <HomePage user={user} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg }}>
      {/* Sidebar */}
      <nav style={{ width: 220, background: T.dark, padding: "20px 0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 20px", marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>Solidata</div>
          <div style={{ fontSize: 11, color: T.light, marginTop: 2 }}>Solidarité Textiles</div>
        </div>
        <div style={{ flex: 1 }}>
          {navItems.map(item => (
            <div key={item.key} onClick={() => setCurrentPage(item.key)} style={{
              padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: currentPage === item.key ? 600 : 400,
              color: currentPage === item.key ? "#fff" : T.light,
              background: currentPage === item.key ? T.primary + "30" : "transparent",
              borderLeft: currentPage === item.key ? `3px solid ${T.primary}` : "3px solid transparent",
            }}>
              {item.label}
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.light}30` }}>
          <div style={{ fontSize: 12, color: T.light, marginBottom: 4 }}>{user.full_name || user.username}</div>
          <div style={{ fontSize: 11, color: T.light + "80" }}>{user.role}</div>
          <button onClick={onLogout} style={{ marginTop: 8, background: "none", border: `1px solid ${T.light}40`, color: T.light, padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "Poppins" }}>
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Content */}
      <main style={{ flex: 1, overflow: "auto" }}>
        {renderPage()}
      </main>
    </div>
  );
}
