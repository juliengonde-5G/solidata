# Guide de deploiement - Solidata sur Synology NAS

## Prerequis

### Materiel
- Synology NAS (DS218+, DS920+ ou superieur recommande)
- Minimum 4 Go de RAM
- Stockage SSD recommande pour PostgreSQL

### Logiciel
- DSM 7.x installe
- Package **Docker** (ou Container Manager) installe depuis le Centre de paquets
- Acces SSH active (Panneau de configuration > Terminal & SNMP)

## Installation initiale

### 1. Preparer le NAS

```bash
# Se connecter en SSH au NAS
ssh admin@<IP_NAS>

# Creer le repertoire du projet
sudo mkdir -p /volume1/docker/solidata
cd /volume1/docker/solidata
```

### 2. Transferer les fichiers

Depuis votre machine de developpement :

```bash
# Option 1 : Git clone (si depot accessible depuis le NAS)
git clone <url-depot> /volume1/docker/solidata

# Option 2 : SCP depuis la machine de dev
scp -r ./solidata/* admin@<IP_NAS>:/volume1/docker/solidata/
```

### 3. Configurer l'environnement

```bash
cd /volume1/docker/solidata
cp .env.example .env
```

Editer `.env` avec les valeurs de production :

```bash
# IMPORTANT: Changer ces valeurs en production !
DB_PASSWORD=<mot_de_passe_fort_genere>
JWT_SECRET=<secret_jwt_aleatoire_32_chars>

# Configuration email (optionnel)
MAIL_HOST=imap.votre-serveur.com
MAIL_PORT=993
MAIL_USER=recrutement@solidarite-textiles.fr
MAIL_PASSWORD=<mot_de_passe_email>
MAIL_TLS=true
```

### 4. Construire et lancer

```bash
cd /volume1/docker/solidata
sudo docker compose up -d --build
```

Premiere construction : environ 5-10 minutes selon la connexion internet.

### 5. Verifier le deploiement

```bash
# Statut des conteneurs
sudo docker compose ps

# Logs du backend (attendre "Server running on port 5003")
sudo docker compose logs -f backend

# Test de sante
curl http://localhost:8083/api/health
```

### 6. Premier acces

1. Ouvrir `http://<IP_NAS>:8083` dans un navigateur
2. Se connecter avec `admin` / `Solidata2026!`
3. Changer le mot de passe (force a la premiere connexion)
4. Configurer les parametres dans Administration > Parametres

## Mise a jour de l'application

### Mise a jour standard

```bash
cd /volume1/docker/solidata

# Arreter l'application
sudo docker compose down

# Mettre a jour le code
git pull origin main

# Reconstruire et relancer
sudo docker compose up -d --build

# Verifier les logs
sudo docker compose logs -f backend
```

### Mise a jour sans interruption (recommande)

```bash
cd /volume1/docker/solidata
git pull origin main

# Reconstruire les images
sudo docker compose build

# Relancer avec les nouvelles images
sudo docker compose up -d

# Le backend redemarre, la BDD reste active
```

## Sauvegarde

### Sauvegarde de la base de donnees

```bash
# Dump complet de la BDD
sudo docker exec solidata-db pg_dump -U solidata solidata > backup_$(date +%Y%m%d).sql

# Sauvegarde compressez
sudo docker exec solidata-db pg_dump -U solidata solidata | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Sauvegarde des volumes

```bash
# Localiser les volumes Docker
sudo docker volume inspect solidata_postgres_data
sudo docker volume inspect solidata_uploads

# Copier les donnees
sudo cp -r /volume1/@docker/volumes/solidata_postgres_data/_data /volume1/backups/solidata/db/
sudo cp -r /volume1/@docker/volumes/solidata_uploads/_data /volume1/backups/solidata/uploads/
```

### Sauvegarde automatique (cron)

Ajouter dans le planificateur de taches DSM (Panneau de configuration > Planificateur de taches) :

```bash
#!/bin/bash
BACKUP_DIR="/volume1/backups/solidata"
DATE=$(date +%Y%m%d_%H%M)
mkdir -p $BACKUP_DIR

# Dump BDD
docker exec solidata-db pg_dump -U solidata solidata | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Garder les 30 derniers backups
ls -t $BACKUP_DIR/db_*.sql.gz | tail -n +31 | xargs -r rm

echo "Backup Solidata termine: $DATE"
```

Frequence recommandee : quotidienne a 2h00.

### Restauration

```bash
# Restaurer un dump
gunzip -c backup_20260305.sql.gz | sudo docker exec -i solidata-db psql -U solidata solidata
```

## Reseau et pare-feu

### Port requis
- **8083/TCP** : acces web a l'application (configurable dans `docker-compose.yml`)

### Configuration pare-feu DSM
1. Panneau de configuration > Securite > Pare-feu
2. Creer une regle pour autoriser le port 8083
3. Limiter aux adresses IP du reseau local si l'acces externe n'est pas necessaire

### Acces externe (optionnel)
Pour un acces depuis l'exterieur, options :
- **VPN** (recommande) : configurer VPN Server sur le NAS
- **Reverse proxy DSM** : Panneau de configuration > Portail de connexion > Avance > Reverse Proxy
- **DDNS + Certificat Let's Encrypt** : pour un acces HTTPS

## Monitoring

### Verification sante des conteneurs

```bash
# Statut de tous les conteneurs
sudo docker compose ps

# Sante du backend
curl -s http://localhost:8083/api/health | python3 -m json.tool

# Utilisation memoire/CPU
sudo docker stats --no-stream
```

### Logs

```bash
# Tous les logs
sudo docker compose logs

# Logs d'un service specifique
sudo docker compose logs backend
sudo docker compose logs frontend
sudo docker compose logs db

# Suivre les logs en temps reel
sudo docker compose logs -f backend
```

## Depannage

### Le backend ne demarre pas

```bash
# Verifier les logs
sudo docker compose logs backend

# Cause frequente : BDD pas encore prete
# Le healthcheck avec start_period: 60s devrait couvrir ce cas
# Si besoin, redemarrer :
sudo docker compose restart backend
```

### Erreur 502 Bad Gateway

```bash
# Verifier que le backend est sain
sudo docker compose ps
# Si backend est "unhealthy" :
sudo docker compose restart backend
```

### Base de donnees corrompue

```bash
# Arreter tout
sudo docker compose down

# Supprimer le volume BDD (ATTENTION : perte de donnees si pas de backup)
sudo docker volume rm solidata_postgres_data

# Relancer (recreera la BDD vide avec les seeds)
sudo docker compose up -d --build
```

### Espace disque insuffisant

```bash
# Nettoyer les images Docker inutilisees
sudo docker system prune -a

# Verifier l'espace
df -h /volume1
```

## Performances

### Optimisations PostgreSQL

Pour un NAS avec 4+ Go de RAM, ajouter dans `docker-compose.yml` sous le service `db` :

```yaml
command:
  - "postgres"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "effective_cache_size=512MB"
  - "-c"
  - "work_mem=16MB"
```

### Limites memoire Docker

Ajouter des limites memoire dans `docker-compose.yml` :

```yaml
services:
  db:
    deploy:
      resources:
        limits:
          memory: 512M
  backend:
    deploy:
      resources:
        limits:
          memory: 256M
  frontend:
    deploy:
      resources:
        limits:
          memory: 128M
```
