# SoliData - ERP Solidarité Textile

ERP pour l'association Solidarité Textile (collecte et recyclage textile, métropole de Rouen).

## Modules

### Recrutement
- Gestion des postes et campagnes de recrutement
- Suivi des candidatures en **Kanban** (drag & drop)
- Entretiens, mises en situation professionnelle
- **Test de personnalité** avec version visuelle (pictogrammes) pour les personnes ayant des difficultés avec la langue française

### Ressources Humaines
- Gestion des salariés (contrats CDDI, CDD, CDI...)
- Suivi des **compétences et certifications** (CACES, Permis B...) avec alertes d'expiration
- **Plannings** (présences / absences) par service (collecte, tri, logistique)

### Collecte
- Gestion du parc de **4 véhicules** (entretien, kilométrage, contrôle technique)
- **Tournées prédéfinies** (au moins 2 par jour par camion)
- Scan **QR code** des CAV (bornes d'apport volontaire) depuis smartphone
- Saisie du **niveau de remplissage** à chaque passage
- **Pesée** et verrouillage de la collecte à l'arrivée au centre de tri
- Remontées d'**incidents** terrain (état CAV, dépôts sauvages...)
- Géolocalisation véhicules via **Geo Coyote API**

### Traçabilité (phase 2)
- Conformité éco-organisme **Refashion**
- Suivi des flux : réemploi, recyclage (CSR), upcycling, boutique, VAK

## Stack technique

| Composant | Technologie |
|-----------|------------|
| Backend | Django 5.1 + Django REST Framework |
| Frontend | Vue.js 3 + Vuetify 3 (PWA) |
| Base de données | PostgreSQL 15 |
| Déploiement | Docker Compose |
| Hébergement | Synology DS218+ |

## Installation

```bash
# Cloner le projet
git clone <repo-url> solidata
cd solidata

# Copier la configuration
cp .env.example .env
# Éditer .env avec vos paramètres

# Lancer avec Docker
docker compose up -d

# Créer un superutilisateur
docker compose exec backend python manage.py createsuperuser
```

## Développement local

```bash
# Backend
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

## API

L'API REST est accessible sur `/api/` :
- `/api/recrutement/` - Postes, campagnes, candidatures, tests
- `/api/rh/` - Salariés, compétences, plannings, présences
- `/api/collecte/` - Véhicules, tournées, CAV, collectes, incidents
- `/api/tracabilite/` - Catégories flux, destinations, lots
- `/api/auth/` - Authentification

## Structure du projet

```
solidata/
├── backend/
│   ├── apps/
│   │   ├── core/          # Utilisateurs, paramètres association
│   │   ├── recrutement/   # Postes, campagnes, candidatures, tests
│   │   ├── rh/            # Salariés, compétences, plannings
│   │   ├── collecte/      # Véhicules, tournées, CAV, collectes
│   │   └── tracabilite/   # Flux matières, conformité Refashion
│   └── solidata/          # Configuration Django
├── frontend/
│   └── src/
│       ├── views/
│       │   ├── recrutement/  # Kanban, tests personnalité
│       │   ├── rh/           # Plannings, présences
│       │   ├── collecte/     # Tournées, véhicules, CAV
│       │   └── mobile/       # Interface smartphone collecte
│       ├── stores/           # Pinia stores
│       └── plugins/          # Vuetify, Axios
└── docker-compose.yml
```
