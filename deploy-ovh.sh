#!/bin/bash
# ============================================================
# Solidata — Script de déploiement sur OVH Public Cloud
# ============================================================
# Usage :
#   1. Créer une instance OVH (Ubuntu 24.04, B2-7 recommandé)
#   2. Copier ce script sur le serveur :
#      scp deploy-ovh.sh ubuntu@<IP_OVH>:~/
#   3. Lancer :
#      ssh ubuntu@<IP_OVH>
#      chmod +x deploy-ovh.sh
#      ./deploy-ovh.sh
# ============================================================

set -e  # Arrêter en cas d'erreur

# --- Couleurs ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERREUR]${NC} $1"; exit 1; }

# ============================================================
# 1. MISE À JOUR DU SYSTÈME
# ============================================================
info "Mise à jour du système..."
sudo apt update && sudo apt upgrade -y

# ============================================================
# 2. INSTALLATION DE DOCKER
# ============================================================
if ! command -v docker &> /dev/null; then
    info "Installation de Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    info "Docker installé. Reconnectez-vous pour appliquer le groupe docker."
    info "Puis relancez ce script."
    exit 0
else
    info "Docker déjà installé : $(docker --version)"
fi

# Vérifier que l'utilisateur est dans le groupe docker
if ! groups | grep -q docker; then
    warn "Vous n'êtes pas dans le groupe docker. Ajout en cours..."
    sudo usermod -aG docker $USER
    warn "Déconnectez-vous et reconnectez-vous, puis relancez ce script."
    exit 0
fi

# ============================================================
# 3. INSTALLATION DES UTILITAIRES
# ============================================================
info "Installation des utilitaires (git, ufw, fail2ban)..."
sudo apt install -y git ufw fail2ban

# ============================================================
# 4. CONFIGURATION DU FIREWALL
# ============================================================
info "Configuration du firewall..."
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
echo "y" | sudo ufw enable
info "Firewall activé (ports 22, 80, 443)."

# ============================================================
# 5. CLONER LE REPO
# ============================================================
APP_DIR="/home/$USER/solidata"
BRANCH="main"

if [ -d "$APP_DIR" ]; then
    info "Le répertoire $APP_DIR existe déjà, mise à jour..."
    cd "$APP_DIR"
    # Détecter la branche courante
    CURRENT=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    if [ -n "$CURRENT" ]; then
        BRANCH="$CURRENT"
    fi
    git pull origin "$BRANCH"
else
    info "Clonage du dépôt..."
    cd "/home/$USER"
    git clone https://github.com/juliengonde-5G/solidata.git
    cd "$APP_DIR"
fi

# ============================================================
# 6. GÉNÉRER LE FICHIER .env
# ============================================================
if [ ! -f "$APP_DIR/.env" ]; then
    info "Génération du fichier .env avec des secrets aléatoires..."

    PG_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 48)

    cat > "$APP_DIR/.env" <<EOF
# ============================================
# Solidata — Configuration environnement
# Généré automatiquement le $(date +%Y-%m-%d)
# ============================================

# --- Base de données ---
POSTGRES_USER=solidata
POSTGRES_PASSWORD=${PG_PASSWORD}
POSTGRES_DB=solidata

# --- Backend ---
DATABASE_URL=postgresql+asyncpg://solidata:${PG_PASSWORD}@db:5432/solidata
JWT_SECRET=${JWT_SECRET}
CORS_ORIGINS=https://solidata.online,https://www.solidata.online

# --- Domaine ---
DOMAIN=solidata.online
EOF

    info "Fichier .env créé avec des secrets forts."
    warn "IMPORTANT : Notez les secrets ou sauvegardez le fichier .env !"
else
    info "Le fichier .env existe déjà. Aucune modification."
fi

# ============================================================
# 7. CRÉER LES RÉPERTOIRES CERTBOT
# ============================================================
info "Création des répertoires pour les certificats SSL..."
mkdir -p "$APP_DIR/certbot/conf" "$APP_DIR/certbot/www"

# ============================================================
# 8. LANCER L'APPLICATION
# ============================================================
info "Construction et lancement des conteneurs Docker..."
cd "$APP_DIR"
docker compose up -d --build

# ============================================================
# 9. VÉRIFICATION
# ============================================================
info "Vérification des conteneurs..."
sleep 10
docker compose ps

# ============================================================
# 10. SCRIPT DE BACKUP
# ============================================================
BACKUP_SCRIPT="/home/$USER/backup-solidata.sh"
if [ ! -f "$BACKUP_SCRIPT" ]; then
    info "Création du script de sauvegarde automatique..."
    cat > "$BACKUP_SCRIPT" <<'BACKUP_EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M)
BACKUP_DIR=/home/$USER/backups
mkdir -p $BACKUP_DIR

# Backup BDD
docker exec solidata-db-1 pg_dump -U solidata -d solidata -F c \
  -f /tmp/backup_$DATE.dump
docker cp solidata-db-1:/tmp/backup_$DATE.dump $BACKUP_DIR/

# Garder les 7 derniers backups
ls -t $BACKUP_DIR/*.dump 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null

echo "Backup terminé : $BACKUP_DIR/backup_$DATE.dump"
BACKUP_EOF
    chmod +x "$BACKUP_SCRIPT"

    # Ajouter le cron si pas déjà présent
    if ! crontab -l 2>/dev/null | grep -q "backup-solidata"; then
        (crontab -l 2>/dev/null; echo "0 3 * * * $BACKUP_SCRIPT >> /home/$USER/backups/backup.log 2>&1") | crontab -
        info "Sauvegarde automatique programmée chaque jour à 3h du matin."
    fi
fi

# ============================================================
# 11. MISES À JOUR AUTOMATIQUES (SÉCURITÉ)
# ============================================================
info "Activation des mises à jour de sécurité automatiques..."
sudo apt install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' | sudo tee /etc/apt/apt.conf.d/50unattended-upgrades-local > /dev/null

# ============================================================
# RÉSUMÉ
# ============================================================
echo ""
echo "============================================================"
info "DÉPLOIEMENT TERMINÉ !"
echo "============================================================"
echo ""
echo "  Application : http://$(curl -s ifconfig.me)"
echo "  Conteneurs  : docker compose ps"
echo "  Logs        : docker compose logs -f"
echo ""
echo "  PROCHAINES ÉTAPES :"
echo "  1. Configurer le DNS (solidata.online → $(curl -s ifconfig.me))"
echo "  2. Obtenir le certificat SSL :"
echo "     docker run --rm \\"
echo "       -v ./certbot/conf:/etc/letsencrypt \\"
echo "       -v ./certbot/www:/var/www/certbot \\"
echo "       certbot/certbot certonly \\"
echo "       --webroot --webroot-path=/var/www/certbot \\"
echo "       -d solidata.online -d www.solidata.online \\"
echo "       --email votre@email.fr \\"
echo "       --agree-tos --no-eff-email"
echo "  3. Activer HTTPS :"
echo "     cp frontend/nginx-ssl.conf frontend/nginx.conf"
echo "     docker compose up -d --build frontend"
echo ""
echo "============================================================"
