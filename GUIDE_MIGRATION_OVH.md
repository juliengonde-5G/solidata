# Guide de migration Solidata vers OVH Public Cloud

## Situation actuelle

| Élément | Actuel |
|---------|--------|
| Serveur | Synology DS 220+ (NAS personnel) |
| IP publique | 82.65.155.79:8083 |
| Déploiement | Docker Compose (3 services) |
| Services | PostgreSQL 15 + PostGIS, FastAPI, React/Nginx |
| Stockage | Local (BDD + fichiers uploadés) |
| HTTPS | Non (HTTP uniquement) |
| Nom de domaine | Aucun |

---

## Architecture cible OVH Public Cloud

```
                    ┌─────────────────────────┐
                    │     Nom de domaine       │
                    │  ex: solidata.fr         │
                    └────────┬────────────────┘
                             │
                    ┌────────▼────────────────┐
                    │   Reverse Proxy Nginx    │
                    │   + Let's Encrypt HTTPS  │
                    │   Port 443 / 80          │
                    └────────┬────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───┐  ┌──────▼─────┐ ┌──────▼──────┐
     │  Frontend   │  │  Backend   │ │ PostgreSQL  │
     │  Nginx :80  │  │ FastAPI    │ │ + PostGIS   │
     │  (React)    │  │ :8000      │ │ :5432       │
     └─────────────┘  └────────────┘ └─────────────┘
                                          │
                                    ┌─────▼─────┐
                                    │  Volume    │
                                    │ persistant │
                                    └───────────┘
```

---

## Étape 1 — Créer un compte OVH et commander une instance

### 1.1 Créer un compte OVH
- Aller sur [https://www.ovhcloud.com/fr/public-cloud/](https://www.ovhcloud.com/fr/public-cloud/)
- Créer un compte ou se connecter
- Créer un **projet Public Cloud** (gratuit, on ne paie que les ressources)

### 1.2 Choisir l'instance

Pour Solidata (application légère, ~30 utilisateurs), l'offre recommandée :

| Paramètre | Recommandation |
|-----------|---------------|
| **Modèle** | **B2-7** (2 vCPU, 7 Go RAM) — ~12€/mois |
| **Région** | **GRA** (Gravelines) ou **SBG** (Strasbourg) — France |
| **Image** | **Ubuntu 24.04 LTS** |
| **Stockage** | 50 Go SSD inclus (suffisant) |
| **Réseau** | IP publique incluse |

> **Alternative économique** : **D2-2** (1 vCPU, 2 Go RAM) à ~5€/mois peut suffire pour démarrer, mais sera limité si les données grossissent.

### 1.3 Ajouter une clé SSH
```bash
# Sur votre PC, générer une clé SSH si pas déjà fait
ssh-keygen -t ed25519 -C "solidata-ovh"

# Copier la clé publique
cat ~/.ssh/id_ed25519.pub
```
Coller cette clé dans le formulaire OVH lors de la création de l'instance.

---

## Étape 2 — Configurer le serveur

### 2.1 Se connecter à l'instance
```bash
ssh ubuntu@<IP_PUBLIQUE_OVH>
```

### 2.2 Mettre à jour le système
```bash
sudo apt update && sudo apt upgrade -y
```

### 2.3 Installer Docker et Docker Compose
```bash
# Installer Docker
curl -fsSL https://get.docker.com | sudo sh

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Se reconnecter pour appliquer le groupe
exit
ssh ubuntu@<IP_PUBLIQUE_OVH>

# Vérifier
docker --version
docker compose version
```

### 2.4 Installer les utilitaires
```bash
sudo apt install -y git ufw fail2ban
```

### 2.5 Configurer le firewall
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## Étape 3 — Transférer le code

### 3.1 Cloner le dépôt
```bash
cd /home/ubuntu
git clone https://github.com/juliengonde-5G/solidata.git
cd solidata
```

> **Note** : Le repo actuel ne contient pas encore les fichiers Docker. Il faudra les recréer ou les récupérer depuis le Synology.

### 3.2 Récupérer les fichiers Docker depuis le Synology
```bash
# Depuis le Synology, copier les fichiers essentiels :
scp -r user@82.65.155.79:/chemin/solidata/docker-compose.yml ubuntu@<IP_OVH>:/home/ubuntu/solidata/
scp -r user@82.65.155.79:/chemin/solidata/backend/ ubuntu@<IP_OVH>:/home/ubuntu/solidata/backend/
scp -r user@82.65.155.79:/chemin/solidata/frontend/ ubuntu@<IP_OVH>:/home/ubuntu/solidata/frontend/
```

---

## Étape 4 — Adapter la configuration pour OVH

### 4.1 Créer un fichier `.env` (sécurité)

Créer `/home/ubuntu/solidata/.env` :
```env
# Base de données
POSTGRES_USER=solidata
POSTGRES_PASSWORD=<MOT_DE_PASSE_FORT>
POSTGRES_DB=solidata

# Backend
DATABASE_URL=postgresql+asyncpg://solidata:<MOT_DE_PASSE_FORT>@db:5432/solidata
JWT_SECRET=<CLE_SECRETE_LONGUE>
CORS_ORIGINS=https://solidata.fr,https://www.solidata.fr

# Ports
BACKEND_PORT=8000
```

> Générer des mots de passe forts :
> ```bash
> openssl rand -base64 32  # pour POSTGRES_PASSWORD
> openssl rand -base64 48  # pour JWT_SECRET
> ```

### 4.2 Adapter le `docker-compose.yml`

Modifications à apporter par rapport à la version Synology :

```yaml
services:
  db:
    image: postgis/postgis:15-3.4-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    # SUPPRIMER l'exposition du port 5003 en production
    # ports:
    #   - "5003:5432"  ← NE PAS EXPOSER la BDD

  backend:
    build: ./backend
    restart: always
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - db

  frontend:
    build: ./frontend
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    volumes:
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro

  # Service pour renouveler les certificats SSL
  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  pgdata:
```

### 4.3 Adapter le `nginx.conf` pour HTTPS

Remplacer le `frontend/nginx.conf` :

```nginx
server {
    listen 80;
    server_name solidata.fr www.solidata.fr;

    # Challenge Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirection HTTP → HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name solidata.fr www.solidata.fr;

    ssl_certificate /etc/letsencrypt/live/solidata.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/solidata.fr/privkey.pem;

    # Frontend React
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API vers backend
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 10M;
    }
}
```

---

## Étape 5 — Migrer la base de données

### 5.1 Exporter la BDD depuis le Synology
```bash
# Sur le Synology ou depuis un PC connecté
docker exec solidata-db-1 pg_dump -U solidata -d solidata -F c -f /tmp/solidata_backup.dump

# Récupérer le fichier
docker cp solidata-db-1:/tmp/solidata_backup.dump ./solidata_backup.dump
```

### 5.2 Transférer vers OVH
```bash
scp solidata_backup.dump ubuntu@<IP_OVH>:/home/ubuntu/solidata/
```

### 5.3 Restaurer sur OVH
```bash
cd /home/ubuntu/solidata

# Démarrer uniquement la BDD
docker compose up -d db

# Attendre que PostgreSQL soit prêt (10 secondes)
sleep 10

# Copier le dump dans le conteneur
docker cp solidata_backup.dump solidata-db-1:/tmp/

# Restaurer
docker exec solidata-db-1 pg_restore -U solidata -d solidata -c /tmp/solidata_backup.dump

# Vérifier
docker exec solidata-db-1 psql -U solidata -d solidata -c "SELECT count(*) FROM cav;"
```

---

## Étape 6 — Configurer le nom de domaine

### 6.1 Acheter un domaine (optionnel)
- OVH propose des noms de domaine (~7€/an pour un .fr)
- Ou utiliser un domaine existant

### 6.2 Configurer le DNS

Dans l'interface OVH (ou votre registrar) :

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| A | solidata.fr | `<IP_PUBLIQUE_OVH>` | 3600 |
| A | www.solidata.fr | `<IP_PUBLIQUE_OVH>` | 3600 |

### 6.3 Obtenir le certificat SSL (Let's Encrypt)
```bash
cd /home/ubuntu/solidata

# Créer les répertoires
mkdir -p certbot/conf certbot/www

# Obtenir le certificat (arrêter nginx d'abord si lancé)
docker compose down

# Lancer uniquement nginx en mode HTTP pour le challenge
docker compose up -d frontend

# Lancer certbot
docker run --rm \
  -v ./certbot/conf:/etc/letsencrypt \
  -v ./certbot/www:/var/www/certbot \
  certbot/certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d solidata.fr -d www.solidata.fr \
  --email votre@email.fr \
  --agree-tos --no-eff-email

# Relancer tout
docker compose down
docker compose up -d
```

---

## Étape 7 — Lancer l'application

```bash
cd /home/ubuntu/solidata

# Construire et lancer
docker compose up -d --build

# Vérifier que tout tourne
docker compose ps

# Vérifier les logs
docker compose logs -f

# Tester le health check
curl https://solidata.fr/api/health
```

---

## Étape 8 — Sécurisation et maintenance

### 8.1 Sauvegardes automatiques

Créer `/home/ubuntu/backup.sh` :
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M)
BACKUP_DIR=/home/ubuntu/backups
mkdir -p $BACKUP_DIR

# Backup BDD
docker exec solidata-db-1 pg_dump -U solidata -d solidata -F c \
  -f /tmp/backup_$DATE.dump
docker cp solidata-db-1:/tmp/backup_$DATE.dump $BACKUP_DIR/

# Garder les 7 derniers backups
ls -t $BACKUP_DIR/*.dump | tail -n +8 | xargs rm -f 2>/dev/null

echo "Backup terminé : $BACKUP_DIR/backup_$DATE.dump"
```

```bash
chmod +x /home/ubuntu/backup.sh

# Planifier un backup quotidien à 3h du matin
crontab -e
# Ajouter :
0 3 * * * /home/ubuntu/backup.sh >> /home/ubuntu/backups/backup.log 2>&1
```

### 8.2 Mises à jour automatiques (sécurité)
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 8.3 Monitoring basique
```bash
# Vérifier l'espace disque
df -h

# Vérifier la mémoire
free -h

# Vérifier les conteneurs
docker compose ps
docker stats --no-stream
```

---

## Étape 9 — Mettre à jour le code (CI/CD simplifié)

Après chaque modification sur GitHub :

```bash
cd /home/ubuntu/solidata
git pull origin main
docker compose up -d --build
```

Ou créer un script `/home/ubuntu/deploy.sh` :
```bash
#!/bin/bash
cd /home/ubuntu/solidata
git pull origin main
docker compose down
docker compose up -d --build
echo "Déploiement terminé à $(date)"
```

---

## Récapitulatif des coûts estimés

| Service | Coût mensuel |
|---------|-------------|
| Instance B2-7 (2 vCPU, 7 Go RAM) | ~12 € |
| Nom de domaine .fr | ~0,60 € (7€/an) |
| Certificat SSL (Let's Encrypt) | Gratuit |
| Stockage 50 Go SSD (inclus) | Inclus |
| **Total** | **~13 €/mois** |

---

## Checklist de migration

- [ ] Créer un compte OVH Public Cloud
- [ ] Commander une instance B2-7 (Ubuntu 24.04, région GRA ou SBG)
- [ ] Configurer la clé SSH
- [ ] Se connecter et installer Docker
- [ ] Configurer le firewall (UFW)
- [ ] Cloner le repo et récupérer les fichiers Docker depuis le Synology
- [ ] Créer le fichier `.env` avec des secrets forts
- [ ] Adapter `docker-compose.yml` (ne pas exposer le port BDD)
- [ ] Exporter la BDD du Synology (`pg_dump`)
- [ ] Restaurer la BDD sur OVH (`pg_restore`)
- [ ] Configurer le nom de domaine et le DNS
- [ ] Obtenir le certificat SSL (Let's Encrypt)
- [ ] Adapter `nginx.conf` pour HTTPS
- [ ] Lancer l'application et tester
- [ ] Mettre en place les sauvegardes automatiques
- [ ] Mettre à jour les URLs dans `config.py` (CORS, etc.)
- [ ] Tester le PWA mobile avec le nouveau domaine
- [ ] Couper l'ancien serveur Synology (après validation)

---

## Points d'attention spécifiques à Solidata

1. **PostGIS** : L'image Docker `postgis/postgis:15-3.4-alpine` est nécessaire (pas un simple PostgreSQL)
2. **GPS/Leaflet** : HTTPS est requis pour l'API Geolocation du navigateur (tracking GPS mobile)
3. **PWA** : Le service worker nécessite HTTPS pour fonctionner correctement
4. **Google Maps** : Mettre à jour la restriction de domaine dans la console Google (si API key)
5. **Fichiers uploadés** : Les CVs et photos d'incidents doivent être dans un volume Docker persistant
6. **BarcodeDetector API** : Fonctionne uniquement sur Chrome/Edge, nécessite HTTPS
