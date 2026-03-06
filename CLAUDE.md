# Solidata - Contexte projet pour developpement

## Presentation

Solidata est la plateforme de gestion interne de **Solidarite Textiles**, association d'insertion par l'activite economique (IAE) specialisee dans la collecte et le recyclage de textiles en Normandie (siege : Le Houlme, 76770).

L'application est deployee sur un **Synology NAS** via Docker Compose, accessible sur le port **8083**.

## Commandes essentielles

```bash
# Build frontend
cd frontend && npm run build

# Dev frontend (port 5173)
cd frontend && npm run dev

# Dev backend (port 5003, avec watch)
cd backend && npm run dev

# Docker Compose
docker compose up -d --build
docker compose logs -f backend
docker compose ps
```

## Conventions de code

### Backend
- Node.js 20, Express, CommonJS (`require`/`module.exports`)
- Sequelize 6 avec `sync({ alter: true })` (pas de migrations manuelles)
- Routes organisees par module : `routes/{module}/{fichier}.js`
- Auth JWT via `middleware/auth.js`
- Modeles dans `models/`, associations centralisees dans `models/index.js`
- Validation avec `express-validator`
- Pas de TypeScript

### Frontend
- React 18, Vite 5, ESM (`import`/`export`)
- TailwindCSS pour tout le styling (pas de CSS custom sauf `index.css` minimal)
- Couleurs : `soltex-green` (#4C8C4A), `soltex-green-dark`, `soltex-green-light`, `soltex-gray`
- Icones : `lucide-react` exclusivement
- Client API : `utils/api.js` (Axios avec intercepteur JWT)
- Auth : `hooks/useAuth.js` (contexte React)
- Routing : React Router 6 avec `RoleRoute` pour le controle d'acces
- Pas de state manager global (useState/useEffect locaux)
- Pas de TypeScript

### Style general
- Interface en francais (labels, messages, commentaires)
- Design responsive avec focus mobile pour le module Collecte
- Arrondi des cartes : `rounded-xl` ou `rounded-2xl`
- Ombres : `shadow-sm`
- Espacement coherent avec les classes Tailwind

## Etat actuel du projet (mars 2026)

### Modules fonctionnels
1. **Recrutement** : Kanban complet avec OCR CV, convocation SMS, test PCM, emails automatiques
2. **Equipe** : Salaries, planning quotidien/hebdo, postes de travail, vehicules, VAK
3. **Collecte** : Tournees, application mobile chauffeur (GPS, QR-first, remplissage par images), carte CAV, suivi live
4. **Reporting** : Dashboard KPI, declarations Refashion, rapport autorite
5. **Administration** : Utilisateurs, parametres globaux, gestion CAV

### Points d'attention techniques
- Sequelize utilise `sync({ alter: true })` : pas de fichiers de migration, le schema evolue automatiquement
- Les ~199 CAV sont importes depuis un fichier KML au premier demarrage
- Les tournees standard sont prechargees depuis `data/`
- SMS et emails sont actuellement en mode "log" (console.log) avec TODO pour integration reelle (Twilio/OVH pour SMS, nodemailer pour emails)
- Google Maps Embed API utilise une cle codee en dur dans MobileCollecte.jsx (a externaliser)

### Fonctionnalites en attente d'integration reelle
- **SMS** : Templates et logique en place, mais pas d'envoi reel (besoin provider SMS type OVH ou Twilio)
- **Emails** : Templates et logique en place, mais pas d'envoi reel (besoin configuration nodemailer)
- **SMS veille entretien** : Le template existe mais pas de mecanisme de declenchement automatique la veille
- **Upload documents parametres** : Lettre de recrutement mentionne des documents (engagements, reglement interieur, mutuelle) a uploader dans les parametres

## Structure des fichiers cles

### Backend - Fichiers les plus modifies
- `backend/src/server.js` - Point d'entree, enregistrement des routes
- `backend/src/models/index.js` - Toutes les associations Sequelize
- `backend/src/routes/recruitment/candidates.js` - Pipeline recrutement complet
- `backend/src/routes/collection/daily-routes.js` - Logique tournees journalieres
- `backend/src/routes/team/daily-assignments.js` - Affectations quotidiennes

### Frontend - Fichiers les plus modifies
- `frontend/src/App.jsx` - Routes et controle d'acces
- `frontend/src/components/Layout.jsx` - Sidebar et navigation
- `frontend/src/pages/Collection/MobileCollecte.jsx` - App mobile chauffeur (la plus complexe)
- `frontend/src/pages/Recruitment/KanbanBoard.jsx` - Tableau kanban drag & drop
- `frontend/src/pages/Team/DailyPlanning.jsx` - Affectations du jour

## Donnees metier importantes

### Depot / Centre de tri
- **Adresse** : Le Houlme (76770)
- **Coordonnees** : lat 49.5008, lng 1.0506
- Utilise comme point de depart/arrivee des tournees

### Groupes de postes de travail
- **Tri** : tri des textiles au centre
- **Collecte** : chauffeurs de tournees (permis B obligatoire)
- **Logistique** : manutention, preparation
- **Boutique** : vente en boutique (travail le samedi)
- **Autre** : postes divers

### Statuts candidat (pipeline Kanban)
`nouveau` -> `a_convoquer` -> `convoque` -> `entretien` -> `retenu` -> `recrute`
Branches : `non_retenu`, `refus_candidat`

### Statuts tournee
`planifiee` -> `en_cours` -> `terminee` (ou `annulee`)

### Statuts point de collecte
`a_collecter` -> `collecte` | `passe` | `probleme`

### Workflow mobile (QR-first)
1. Arrivee au point -> affichage info
2. **Obligatoire** : Flasher QR OU declarer QR indisponible
3. Saisie du niveau de remplissage (images)
4. Confirmation "Collecte"
5. Passage au point suivant

## Pour ajouter un nouveau module

1. **Backend** :
   - Creer le modele dans `backend/src/models/NouveauModele.js`
   - Ajouter les associations dans `models/index.js`
   - Creer les routes dans `backend/src/routes/nouveau-module/fichier.js`
   - Enregistrer les routes dans `server.js`

2. **Frontend** :
   - Creer les pages dans `frontend/src/pages/NouveauModule/`
   - Ajouter les routes dans `App.jsx` avec `RoleRoute` si necessaire
   - Ajouter l'entree de menu dans `Layout.jsx`

3. Build : `cd frontend && npm run build`
4. Deploy : `docker compose up -d --build`
