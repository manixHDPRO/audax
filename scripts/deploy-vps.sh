#!/bin/sh
# Déploiement Audax sur VPS — Node.js + PM2 (sans Docker)
set -e

INSTALL_DIR="${INSTALL_DIR:-/root/Audax}"
SEED=false
NODE_MAJOR="${NODE_MAJOR:-22}"

for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
  esac
done

echo "================================================"
echo "  DEPLOI AUDAX — VPS (Node.js + PM2)"
echo "  Dossier: $INSTALL_DIR"
echo "================================================"

if [ ! -d "$INSTALL_DIR" ]; then
  echo "ERREUR: dossier $INSTALL_DIR introuvable."
  exit 1
fi

cd "$INSTALL_DIR"

if [ ! -f ".env" ]; then
  echo "ERREUR: fichier .env absent dans $INSTALL_DIR"
  exit 1
fi

echo "==> Vérification Node.js"
if ! command -v node >/dev/null 2>&1; then
  echo "    Installation de Node.js ${NODE_MAJOR}..."
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq
    apt-get install -y curl ca-certificates build-essential
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    apt-get install -y nodejs
  else
    echo "ERREUR: installez Node.js ${NODE_MAJOR} manuellement."
    exit 1
  fi
fi

echo "    Node $(node -v) — npm $(npm -v)"

echo "==> Vérification PM2"
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

echo "==> Mise à jour du code"
git pull origin main || true

echo "==> Chargement des variables d'environnement"
set -a
# shellcheck disable=SC1091
. ./.env
set +a

echo "==> Installation des dépendances"
npm ci

echo "==> Prisma (generate + migrations)"
npm run db:generate
npm run db:migrate:deploy

echo "==> Build API + Web"
npm run build

if [ "$SEED" = true ]; then
  echo "==> Seed des données initiales"
  npm run db:seed
fi

echo "==> Redémarrage PM2"
pm2 delete audax-api audax-web 2>/dev/null || true
pm2 start ecosystem.config.cjs --update-env
pm2 save

if ! pm2 startup systemd -u root --hp /root 2>/dev/null | grep -q "already"; then
  pm2 startup systemd -u root --hp /root 2>/dev/null || true
fi

echo ""
echo "==> État des processus"
pm2 status

echo ""
echo "==> Test API"
sleep 3
curl -sf http://127.0.0.1:4000/api/health && echo "" || echo "API pas encore prête — voir: pm2 logs audax-api --lines 50"

VPS_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
PUBLIC_HOST="${PUBLIC_HOST:-}"
echo ""
echo "================================================"
echo "  DEPLOI TERMINÉ"
if [ -n "$PUBLIC_HOST" ]; then
  echo "  Frontend : https://${PUBLIC_HOST}"
  echo "  API      : https://${PUBLIC_HOST}/api"
  echo "  TLS      : voir deploy/TLS.md"
else
  echo "  Frontend : http://${VPS_IP}:${AUDAX_WEB_PORT:-3001}  (temporaire — configurez TLS)"
  echo "  API      : http://${VPS_IP}:4000/api"
  echo "  ATTENTION: HTTP en clair. Suivez deploy/TLS.md avant production."
fi
echo "  Swagger  : désactivé en production (ENABLE_SWAGGER=true pour forcer)"
echo "  Logs     : pm2 logs"
echo "================================================"
