# Changelog - Solidata

Historique des evolutions de la plateforme Solidata.

## [1.8.0] - 2026-03-05

### Collecte mobile - Workflow QR obligatoire
- Le remplissage et le bouton "Collecte" sont desormais masques tant que le QR code n'a pas ete flashe ou declare indisponible
- Scan QR valide le point sans auto-collecter (workflow en 2 etapes)
- Declaration QR indisponible debloque le remplissage avec une note dans les observations
- Bouton "Annuler" pour revenir a l'ecran de scan

### Planning
- Retrait du choix de tournee pour les postes Collecte (affichage "Chauffeur 1, 2...")
- L'affectation de tournee se fait dans le module Collecte, pas dans le planning

## [1.7.0] - 2026-03-05

### Recrutement - Refonte du workflow
- Renommage "a qualifier" en "a convoquer" dans le Kanban
- Support drag & drop tactile (smartphone/tablette) via TouchSensor
- OCR CV : extraction automatique nom, prenom, email, telephone, permis B, CACES
- Convocation SMS : formulaire date/heure/lieu (siege ou boutique)
- 20 questions de pre-entretien (aucune mauvaise reponse)
- Email automatique de rejet pour les candidats non retenus
- Lettre de recrutement par email (engagements, reglement interieur, mutuelle)
- Nouveau statut "refus candidat" pour les candidatures sans reponse
- Templates email/SMS configurables dans les parametres

### Collecte mobile - Redesign complet
- Carte Google Maps integree en haut de page avec itineraire
- Bandeau distance/temps restant + progression
- Affichage du prochain arret uniquement (plus de liste complete)
- Remplissage par images (vide, peu rempli, a moitie, presque plein, plein, deborde)
- Saisie par CAV quand plusieurs conteneurs a la meme adresse
- Barre fixe en bas : Flasher QR, Camion plein, Terminer
- Retrait de "Saisie sans QR code"

### Equipe
- Correction du module VAK (affectation impossible resolue)
- Menu Vehicules deplace dans le groupe Collecte

## [1.6.0] - 2026-03-04

### Collecte
- API backend pesees (GET/POST `/api/collection/weight-records`)
- Historique et regularisation des tonnages

### Equipe
- Planning quotidien groupe par Tri / Collecte / Logistique / Boutique / Autre
- Section Absences en bas du planning (repos, vacances, conge, formation)
- Equipe Collecte restreinte aux employes avec permis B
- Bouton "Repos samedi" automatique (hors boutique et VAK)

## [1.5.0] - 2026-03-01

### Collecte
- Amelioration du planning de collecte et generation automatique
- Preloading des tournees standard depuis fichiers data/
- Import des tonnages depuis fichier Excel

### Recrutement
- Correction du compteur de candidats dans le Kanban

## [1.4.0] - 2026-03-01

### Collecte
- Auto-import de 199 CAV depuis fichier KML au premier demarrage
- Page d'administration des CAV (import, edition, suppression)
- Correction de la generation du planning collecte

## [1.3.0] - 2026-03-01

### Recrutement
- Correction test de personnalite : le lien du quiz fonctionne correctement

### Reporting
- Page rapport autorite avec controle d'acces par role

## [1.2.0] - 2026-03-01

### Collecte
- Interface mobile PWA pour les chauffeurs
- Corrections du modele Collection
- QR codes sur les points de collecte
- Module collecte complet : modeles, routes, carte, planning

### Equipe
- Champs supplementaires employes : CACES, heures contrat, jour de repos
- Export PDF hebdomadaire des affectations
- Systeme d'affectations quotidiennes (POJ)

## [1.1.0] - 2026-02-28

### Recrutement
- Module Kanban avec drag & drop
- Mise en situation et test PCM enrichi
- Recrutement automatise

### Equipe
- Import de donnees Excel (xlsx)

## [1.0.0] - 2026-02-28

### Premiere version
- Module Administration : gestion utilisateurs, roles (admin, manager, rh, collaborateur, autorite)
- Module Equipe : gestion salaries, planning hebdomadaire
- Module Collecte : modeles de tournees, points de collecte
- Module Reporting : declarations Refashion
- Deploiement Docker Compose (PostgreSQL + Node.js + Nginx)
- Authentification JWT avec changement de mot de passe force
- Interface responsive avec charte Solidarite Textiles

## Notes techniques

### Fonctionnalites en attente d'integration
- **Envoi reel de SMS** : logique et templates en place, en attente d'un provider (OVH, Twilio). Actuellement en mode console.log.
- **Envoi reel d'emails** : logique et templates en place, en attente de configuration nodemailer.
- **SMS veille entretien** : template existe, mecanisme de declenchement automatique (cron) a implementer.
- **Upload documents recrutement** : parametrages mentionnent les documents (engagements, reglement interieur, mutuelle), upload a implementer.
- **Cle Google Maps** : actuellement codee en dur dans MobileCollecte.jsx, a externaliser dans .env.
