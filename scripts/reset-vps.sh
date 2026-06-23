#!/bin/sh
# Réinitialisation complète de la stack Audax sur le VPS (Supabase)
set -e

cd "$(dirname "$0")/.."
COMPOSE="docker-compose -f docker-compose.prod.yml"

echo "==> Arrêt et suppression de l'ancienne stack (Postgres local inclus)"
docker-compose down -v 2>/dev/null || true
$COMPOSE down -v 2>/dev/null || true
docker rm -f audax-postgres audax-redis audax-api audax-web 2>/dev/null || true
docker volume rm audax_pg_data audax_redis_data 2>/dev/null || true

echo "==> Nettoyage des images inutilisées"
docker image prune -f

echo "==> Mise à jour du code"
git pull

if [ ! -f .env ]; then
  echo "ERREUR: .env manquant. Copiez .env.example et configurez Supabase + JWT."
  exit 1
fi

echo "==> Build et démarrage (API + Web → Supabase)"
$COMPOSE up -d --build

echo "==> Attente du démarrage (30s)"
sleep 30

echo "==> État des conteneurs"
$COMPOSE ps

echo "==> Test API"
curl -sf http://127.0.0.1:4000/api/health && echo "" || echo "API pas encore prête — voir: $COMPOSE logs --tail=80 api"

echo ""
echo "Réinitialisation terminée."
echo "Frontend: http://$(curl -sf ifconfig.me 2>/dev/null || echo 'VOTRE_IP'):3000"
echo "Les migrations et le seed Supabase se font depuis votre machine locale."
