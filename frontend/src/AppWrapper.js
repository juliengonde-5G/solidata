import React, { useState, useEffect } from "react";
import MobileModule from "./MobileModule";

/**
 * AppWrapper.js — Wrapper principal de l'application Solidata
 *
 * Détecte si on est en mode mobile (?mobile=1) et redirige vers le bon module.
 * Pour l'instant, le focus est sur le module mobile.
 */
export default function AppWrapper() {
  const [isMobile, setIsMobile] = useState(false);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Détection mode mobile via URL param
    const params = new URLSearchParams(window.location.search);
    const mobileParam = params.get("mobile");
    setIsMobile(mobileParam === "1" || /Android|iPhone|iPad/i.test(navigator.userAgent));

    // Récupérer le token existant
    const savedToken = localStorage.getItem("solidata_token");
    if (savedToken) {
      setToken(savedToken);
      window.__solidata_token = savedToken;
    }
  }, []);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("solidata_token");
    delete window.__solidata_token;
  };

  // En mode mobile, afficher directement le module mobile
  if (isMobile) {
    return <MobileModule token={token} onLogout={handleLogout} />;
  }

  // Mode desktop — placeholder (les autres modules seront ajoutés plus tard)
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      fontFamily: "'Poppins', sans-serif",
      background: "#FFFAF6",
      flexDirection: "column",
      gap: 16,
    }}>
      <div style={{ fontSize: 48 }}>🚛</div>
      <h1 style={{ color: "#008678", fontSize: 28 }}>Solidata ERP</h1>
      <p style={{ color: "#5a6872" }}>Application de gestion de collecte textile</p>
      <a
        href="?mobile=1"
        style={{
          padding: "12px 32px",
          borderRadius: 10,
          background: "#008678",
          color: "#fff",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        Ouvrir l'application mobile
      </a>
    </div>
  );
}
