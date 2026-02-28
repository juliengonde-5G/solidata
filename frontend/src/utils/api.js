const API = "/api";

export function getToken() {
  return window.__solidata_token || localStorage.getItem("solidata_token");
}

export function setToken(token) {
  localStorage.setItem("solidata_token", token);
  window.__solidata_token = token;
}

export function clearToken() {
  localStorage.removeItem("solidata_token");
  window.__solidata_token = null;
}

export default async function api(path, opts = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...opts.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.detail || "Erreur");
  }
  return res.json();
}
