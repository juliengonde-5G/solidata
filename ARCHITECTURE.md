# Architecture technique - Solidata

## Vue d'ensemble

```
                    +-------------------+
                    |   Navigateur      |
                    |   (port 8083)     |
                    +--------+----------+
                             |
                    +--------v----------+
                    |   Nginx (frontend)|
                    |   - SPA React     |
                    |   - Reverse proxy |
                    |     /api -> :5003 |
                    +--------+----------+
                             |
                    +--------v----------+
                    |   Express (backend)|
                    |   Node.js :5003   |
                    |   JWT auth        |
                    +--------+----------+
                             |
                    +--------v----------+
                    |   PostgreSQL      |
                    |   (port interne)  |
                    |   27 tables       |
                    +-------------------+
```

## Infrastructure Docker

3 conteneurs orchestres par `docker-compose.yml` :

| Service | Image | Role | Port |
|---------|-------|------|------|
| `solidata-db` | `postgres:15-alpine` | Base de donnees | interne |
| `solidata-backend` | Build `./backend` (node:20-alpine) | API REST | 5003 (interne) |
| `solidata-frontend` | Build `./frontend` (nginx:alpine) | SPA + reverse proxy | 8083 (expose) |

Volumes persistants :
- `postgres_data` : donnees PostgreSQL
- `uploads` : fichiers uploades (CV, documents)

## Backend - Architecture

### Point d'entree : `server.js`

Le serveur Express initialise dans cet ordre :
1. Middleware (cors, json, auth)
2. Synchronisation Sequelize (`alter: true` en prod)
3. Auto-import des CAV depuis fichier KML (premier demarrage)
4. Preloading des tournees standard depuis `data/`
5. Enregistrement de toutes les routes
6. Seed admin si aucun utilisateur

### Modeles Sequelize (27 tables)

#### Recrutement
| Modele | Table | Description |
|--------|-------|-------------|
| `User` | `users` | Comptes utilisateurs (login, role, mot de passe) |
| `JobPosition` | `job_positions` | Postes a pourvoir |
| `Candidate` | `candidates` | Candidats (statut kanban, CV, convocation) |
| `CandidateHistory` | `candidate_histories` | Historique des changements de statut |
| `PersonalityTest` | `personality_tests` | Tests PCM (Process Communication Model) |

#### Equipe
| Modele | Table | Description |
|--------|-------|-------------|
| `Employee` | `employees` | Salaries (contrat, horaires, permis, CACES) |
| `Skill` | `skills` | Competences des salaries |
| `Planning` | `plannings` | Planning hebdomadaire |
| `WorkStation` | `work_stations` | Postes de travail (groupe, obligatoire) |
| `DailyAssignment` | `daily_assignments` | Affectations quotidiennes |
| `EmployeeDayStatus` | `employee_day_statuses` | Statut jour (travaille, repos, vacances...) |
| `Vehicle` | `vehicles` | Vehicules (immatriculation, CT, kilometrage) |

#### VAK (Ventes, Animations, Kermesses)
| Modele | Table | Description |
|--------|-------|-------------|
| `VakEvent` | `vak_events` | Evenements VAK |
| `VakWorkStation` | `vak_work_stations` | Postes specifiques VAK |
| `VakAssignment` | `vak_assignments` | Affectations aux postes VAK |

#### Collecte
| Modele | Table | Description |
|--------|-------|-------------|
| `Route` | `routes` | Modeles de tournees |
| `RouteTemplatePoint` | `route_template_points` | Points d'un modele de tournee |
| `CollectionPoint` | `collection_points` | Points de collecte (CAV) avec coordonnees GPS |
| `DailyRoute` | `daily_routes` | Tournees journalieres generees |
| `DailyRoutePoint` | `daily_route_points` | Points d'une tournee journaliere |
| `GPSTrack` | `gps_tracks` | Traces GPS des vehicules |
| `WeightRecord` | `weight_records` | Pesees au centre de tri |
| `Collection` | `collections` | Enregistrements de collecte (legacy) |

#### Reporting
| Modele | Table | Description |
|--------|-------|-------------|
| `CollectionReport` | `collection_reports` | Rapports de collecte |
| `RefashionDeclaration` | `refashion_declarations` | Declarations eco-organisme |

#### Systeme
| Modele | Table | Description |
|--------|-------|-------------|
| `AppSettings` | `app_settings` | Parametres globaux (cle/valeur) |

### Relations principales

```
Candidate --> JobPosition (poste vise)
Candidate --> CandidateHistory (historique)
Candidate --> PersonalityTest (test PCM)

Employee --> Skill (competences)
Employee --> Planning (planning hebdo)
Employee --> DailyAssignment (affectation jour)
Employee --> EmployeeDayStatus (statut jour)
Employee --> VakAssignment (affectation VAK)

Route --> RouteTemplatePoint --> CollectionPoint (modele tournee)
Route --> DailyRoute --> DailyRoutePoint --> CollectionPoint (tournee jour)
DailyRoute --> GPSTrack (traces GPS)
DailyRoute --> WeightRecord (pesees)
DailyRoute --> Vehicle (vehicule assigne)
DailyRoute --> Employee (chauffeur + suiveur)

WorkStation --> DailyAssignment --> Employee
VakEvent --> VakAssignment --> Employee + VakWorkStation
```

### Routes API

#### Authentification (`/api/auth`)
| Methode | Route | Description |
|---------|-------|-------------|
| POST | `/login` | Connexion (retourne JWT) |
| GET | `/me` | Utilisateur courant |
| PUT | `/change-password` | Changement mot de passe |

#### Administration (`/api/admin`)
| Methode | Route | Description |
|---------|-------|-------------|
| GET/POST | `/users` | Gestion utilisateurs |
| GET/PUT | `/settings` | Parametres globaux |

#### Recrutement (`/api/recruitment`)
| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/candidates` | Liste des candidats |
| GET | `/candidates/kanban` | Vue Kanban groupee par statut |
| POST | `/candidates` | Creer un candidat |
| PUT | `/candidates/:id` | Modifier un candidat |
| PUT | `/candidates/:id/status` | Changer le statut kanban |
| POST | `/candidates/:id/ocr` | Extraction OCR depuis CV |
| POST | `/candidates/:id/sms-convocation` | Envoyer SMS de convocation |
| GET | `/candidates/:id/pre-interview-questions` | 20 questions pre-entretien |
| POST | `/candidates/:id/send-rejection` | Envoyer email de rejet |
| POST | `/candidates/:id/send-recruitment-letter` | Envoyer lettre de recrutement |
| GET/POST | `/positions` | Postes a pourvoir |
| GET/POST | `/personality/:testId` | Tests de personnalite PCM |

#### Equipe (`/api/team`)
| Methode | Route | Description |
|---------|-------|-------------|
| GET/POST | `/employees` | Gestion salaries |
| GET/PUT | `/employees/:id` | Detail/modification salarie |
| GET/POST | `/vehicles` | Gestion vehicules |
| GET/PUT | `/planning` | Planning hebdomadaire |
| GET | `/assignments/day/:date` | Affectations d'un jour |
| PUT | `/assignments/assign` | Affecter un salarie |
| PUT | `/assignments/confirm` | Confirmer les affectations |
| GET | `/assignments/available/:date` | Salaries disponibles |
| GET | `/assignments/stats/:date` | Statistiques du jour |
| GET | `/assignments/week/:date` | Vue semaine (export PDF) |
| PUT | `/assignments/saturday-repos` | Repos samedi auto |
| GET/POST | `/workstations` | Postes de travail |
| GET/POST/PUT | `/vak/*` | Module VAK complet |

#### Collecte (`/api/collection`)
| Methode | Route | Description |
|---------|-------|-------------|
| GET/POST | `/routes` | Modeles de tournees |
| GET/PUT | `/routes/:id` | Detail/modification tournee |
| GET/POST | `/points` | Points de collecte (CAV) |
| GET | `/points/scan/:qrCode` | Scan QR code |
| POST | `/import/kml` | Import KML des points |
| GET | `/daily-routes/day/:date` | Tournees du jour |
| POST | `/daily-routes/generate` | Generer tournees du jour |
| PUT | `/daily-routes/:id/start` | Demarrer une tournee |
| PUT | `/daily-routes/:id/scan/:pointId` | Marquer un point |
| PUT | `/daily-routes/:id/finish` | Terminer une tournee |
| POST | `/daily-routes/:id/weight` | Saisir une pesee |
| POST | `/gps` | Envoyer position GPS |
| GET | `/gps/live` | Positions live |
| GET/POST | `/weight-records` | Historique pesees |
| GET | `/planning` | Planning collecte |

#### Reporting (`/api/reporting`)
| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/reports/dashboard` | KPI tableau de bord |
| GET/POST | `/refashion` | Declarations Refashion |
| GET | `/autorite/report` | Rapport autorite |

### Middleware d'authentification

`middleware/auth.js` - Verification du token JWT sur toutes les routes `/api/*` sauf `/api/auth/login` et les routes publiques (test personnalite).

### Services

| Service | Fichier | Description |
|---------|---------|-------------|
| CV Parser | `services/cvParser.js` | Extraction de texte depuis PDF (pdf-parse) |
| Email Ingestion | `services/emailIngestion.js` | Aspiration IMAP des CV recus par email |
| PCM Test | `services/pcmTest.js` | Calcul des profils PCM |

## Frontend - Architecture

### Framework et outils
- **React 18** avec hooks fonctionnels
- **Vite 5** pour le build et HMR
- **TailwindCSS 3.4** pour le styling (charte Solidarite Textiles)
- **React Router 6** pour le routing SPA
- **Axios** pour les appels API
- **Lucide React** pour les icones

### Couleurs de la charte graphique (TailwindCSS)

```javascript
// tailwind.config.js
colors: {
  'soltex-green': '#4C8C4A',       // Vert principal
  'soltex-green-dark': '#3A6B39',  // Vert fonce
  'soltex-green-light': '#E8F5E8', // Vert clair (fond)
  'soltex-gray': '#F5F5F5',        // Gris fond
  'soltex-gray-dark': '#2D2D2D',   // Gris texte
}
```

### Authentification

`hooks/useAuth.js` fournit un contexte React avec :
- `user` : utilisateur connecte (id, login, role, employeeId)
- `login(username, password)` : connexion
- `logout()` : deconnexion
- Token JWT stocke en `localStorage`

### Client API

`utils/api.js` : instance Axios configuree avec :
- Base URL : `/api`
- Intercepteur pour ajouter le token JWT
- Intercepteur 401 pour deconnexion automatique

### Controle d'acces

Deux composants dans `App.jsx` :
- `ProtectedRoute` : redirige vers `/login` si non connecte, force changement de mot de passe si necessaire
- `RoleRoute` : restreint l'acces selon le role (`roles` prop)

### Pages par module

#### Recrutement (5 pages)
- `KanbanBoard.jsx` : tableau kanban drag & drop (touch + desktop)
- `CandidateDetail.jsx` : fiche candidat, OCR, convocation, entretien
- `Positions.jsx` : gestion des postes a pourvoir
- `PersonalityQuiz.jsx` : questionnaire PCM (acces public via lien)
- `PersonalityResults.jsx` : resultats du test PCM

#### Equipe (7 pages)
- `Employees.jsx` : liste des salaries avec recherche/filtres
- `EmployeeDetail.jsx` : fiche detaillee salarie
- `Vehicles.jsx` : gestion de la flotte
- `Planning.jsx` : planning hebdomadaire
- `DailyPlanning.jsx` : affectations du jour (groupes, absences)
- `WorkStations.jsx` : configuration des postes de travail
- `VakModule.jsx` : evenements et affectations VAK

#### Collecte (7 pages)
- `Routes.jsx` : liste des modeles de tournees
- `RouteDetail.jsx` : detail d'une tournee avec carte
- `Collections.jsx` : historique des collectes
- `MapCAV.jsx` : carte Leaflet de tous les CAV
- `PlanningCollecte.jsx` : generation et gestion des tournees
- `LiveDashboard.jsx` : suivi temps reel GPS
- `MobileCollecte.jsx` : interface mobile chauffeur

#### Reporting (3 pages)
- `Dashboard.jsx` : KPI et graphiques
- `Refashion.jsx` : declarations eco-organisme
- `RapportAutorite.jsx` : rapport autorite administrative

#### Administration (3 pages)
- `Users.jsx` : gestion des comptes utilisateurs
- `Settings.jsx` : parametres globaux (templates email/SMS)
- `CAVManagement.jsx` : import et edition des CAV

#### Autres (3 pages)
- `Dashboard.jsx` : accueil manager
- `CollaborateurHome.jsx` : accueil collaborateur
- `MonProfil.jsx` / `MonPlanning.jsx` : espace personnel

## Securite

- Mots de passe hashes avec bcryptjs (salt rounds: 12)
- Tokens JWT avec expiration configurable
- Changement de mot de passe force a la premiere connexion
- CSP (Content Security Policy) sur nginx
- Roles avec controle d'acces frontend et backend
- Validation des entrees avec express-validator

## Donnees initiales

Au premier demarrage, le backend :
1. Synchronise les modeles avec `ALTER` (pas de migration manuelle)
2. Importe les ~199 CAV depuis le fichier KML si la table est vide
3. Precharge les tournees standard depuis les fichiers `data/`
4. Cree un compte admin par defaut si aucun utilisateur n'existe
5. Initialise les parametres par defaut (AppSettings)
