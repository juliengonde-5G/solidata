# Solidata - Plateforme de gestion interne

**Solidata** est la plateforme de gestion interne de **Solidarite Textiles**, association de collecte et recyclage de textiles basee en Normandie. L'application couvre l'ensemble des processus metier : recrutement, gestion d'equipe, collecte terrain, et reporting reglementaire.

## Acces

- **URL** : `http://<IP_NAS>:8083`
- **Hebergement** : Synology NAS via Docker Compose
- **Compte admin initial** : `admin` / `Solidata2026!` (changement force a la premiere connexion)

## Modules fonctionnels

### Recrutement (`/recrutement`)
- **Kanban** : pipeline visuel des candidatures (a convoquer, convoque, entretien, retenu, recrute, non retenu, refus candidat)
- **OCR CV** : extraction automatique nom, prenom, email, telephone, permis B, CACES depuis les CV
- **Convocation** : envoi SMS avec date, heure, lieu (siege ou boutique)
- **Pre-entretien** : 20 questions de discussion (aucune mauvaise reponse)
- **Test de personnalite** : questionnaire PCM (Process Communication Model)
- **Emails automatiques** : rejet (non retenu) et lettre de recrutement (modeles dans parametres)

### Equipe (`/equipe`)
- **Salaries** : fiches detaillees (contrat, horaires, permis B, CACES, jour de repos)
- **Planning hebdo** : affectation des salaries aux postes, export PDF semaine
- **Affectations du jour** : planning quotidien groupe par Tri/Collecte/Logistique/Boutique/Autre + absences
- **Postes de travail** : configuration des postes (groupe, obligatoire, requis CACES/permis)
- **VAK** : gestion des evenements et affectations VAK (ventes, animations, kermesses)

### Collecte (`/collecte`)
- **Tournees** : modeles de tournees avec points de collecte ordonnes
- **Planning collecte** : generation automatique des tournees journalieres
- **Application mobile** (`/collecte/mobile`) : interface chauffeur avec :
  - Carte GPS et navigation vers le prochain point
  - Distance et temps restants
  - Workflow QR-first : scan QR ou declaration QR indisponible obligatoire avant saisie
  - Remplissage par images (vide, peu rempli, a moitie, presque plein, plein, deborde)
  - Saisie par CAV quand plusieurs CAV a la meme adresse
  - Camion plein / pesee au centre de tri
  - Controle pre-depart (vehicule, carburant, securite)
- **Carte des CAV** : visualisation Leaflet de tous les points de collecte
- **Vehicules** : gestion de la flotte (immatriculation, kilometrage, CT)
- **Suivi live** : dashboard temps reel des tournees en cours

### Reporting (`/reporting`)
- **Dashboard** : KPI collecte (tonnages, points, vehicules)
- **Refashion** : declarations eco-organisme
- **Rapport autorite** : rapport pour les autorites administratives (acces role `autorite`)

### Administration (`/admin`)
- **Utilisateurs** : gestion comptes, roles (admin, manager, rh, collaborateur, autorite)
- **Parametres** : configuration globale (templates email/SMS, seuils, preferences)
- **Gestion CAV** : import/edition des conteneurs d'apport volontaire

## Stack technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Frontend | React + Vite + TailwindCSS | React 18, Vite 5 |
| Backend | Node.js + Express | Node 20 |
| BDD | PostgreSQL | 15 (Alpine) |
| ORM | Sequelize | 6.x |
| Conteneurs | Docker Compose | 3 services |
| Reverse proxy | Nginx | Alpine |
| Cartes | Leaflet / Google Maps | - |
| PDF | jsPDF + autotable | - |
| Drag & Drop | @dnd-kit | 6.x |
| QR Codes | qrcode.react | 4.x |

## Demarrage rapide

### Prerequis
- Docker et Docker Compose installes
- Port 8083 disponible

### Installation

```bash
# 1. Cloner le depot
git clone <url-depot> solidata
cd solidata

# 2. Configurer l'environnement
cp .env.example .env
# Editer .env avec vos valeurs (mot de passe BDD, secret JWT, etc.)

# 3. Lancer l'application
docker compose up -d --build

# 4. Verifier le statut
docker compose ps
docker compose logs -f backend
```

L'application est accessible sur `http://localhost:8083` apres environ 60 secondes (temps de demarrage du backend et synchronisation BDD).

### Developpement local

```bash
# Backend (port 5003)
cd backend
npm install
npm run dev

# Frontend (port 5173)
cd frontend
npm install
npm run dev
```

## Structure du projet

```
solidata/
  docker-compose.yml          # Orchestration des 3 conteneurs
  .env.example                # Variables d'environnement
  backend/
    Dockerfile
    package.json
    src/
      server.js               # Point d'entree Express + routes
      config/database.js      # Configuration Sequelize/PostgreSQL
      middleware/auth.js       # Authentification JWT
      models/                 # 27 modeles Sequelize
        index.js              # Associations entre modeles
      routes/
        auth/                 # Login, token
        admin/                # Utilisateurs, parametres
        recruitment/          # Candidats, postes, personnalite
        team/                 # Salaries, planning, vehicules, VAK
        collection/           # Tournees, points, GPS, pesees
        reporting/            # Refashion, autorite, rapports
      services/               # CV parser, email ingestion, test PCM
      seeds/                  # Donnees initiales (admin, postes standard)
  frontend/
    Dockerfile
    nginx.conf                # Reverse proxy + SPA routing
    package.json
    src/
      App.jsx                 # Routes React + controle d'acces
      components/Layout.jsx   # Sidebar + navigation
      hooks/useAuth.js        # Contexte authentification
      utils/api.js            # Client Axios configure
      pages/
        Auth/                 # Login, changement mot de passe
        Dashboard.jsx         # Tableau de bord manager
        CollaborateurHome.jsx # Accueil collaborateur
        Recruitment/          # Kanban, fiches candidat, personnalite
        Team/                 # Salaries, planning, affectations, VAK
        Collection/           # Tournees, mobile, carte, live
        Reporting/            # Dashboard, Refashion, autorite
        Admin/                # Utilisateurs, parametres, CAV
```

## Roles utilisateurs

| Role | Acces |
|------|-------|
| `admin` | Acces complet a tous les modules |
| `manager` | Recrutement, equipe, collecte, reporting |
| `rh` | Recrutement, equipe, collecte, reporting |
| `collaborateur` | Mon espace, planning perso, collecte mobile |
| `autorite` | Rapport autorite uniquement |

## API Backend

Toutes les routes sont prefixees par `/api`. Authentification par token JWT dans le header `Authorization: Bearer <token>`.

Principales routes :
- `POST /api/auth/login` - Connexion
- `GET /api/recruitment/candidates` - Liste candidats
- `GET /api/team/employees` - Liste salaries
- `GET /api/collection/daily-routes/day/:date` - Tournees du jour
- `GET /api/collection/points` - Points de collecte
- `GET /api/reporting/reports/dashboard` - KPI

Voir [ARCHITECTURE.md](ARCHITECTURE.md) pour le detail complet des endpoints.

## Documentation complementaire

- [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture technique detaillee, modeles, API
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guide de deploiement Synology NAS
- [CHANGELOG.md](CHANGELOG.md) - Historique des evolutions
- [CLAUDE.md](CLAUDE.md) - Contexte projet pour continuite de developpement

## Contexte metier

**Solidarite Textiles** est une association d'insertion par l'activite economique (IAE) specialisee dans la collecte, le tri et le recyclage de textiles en Normandie. L'association gere :
- ~200 conteneurs d'apport volontaire (CAV) repartis dans la region
- Une equipe de salaries en insertion avec rotation sur les postes
- Des tournees quotidiennes de collecte avec pesee au centre de tri (Le Houlme)
- Des declarations reglementaires aupres de l'eco-organisme Refashion
- Un processus de recrutement adapte au public en insertion

## Licence

Usage interne - Solidarite Textiles. Tous droits reserves.
