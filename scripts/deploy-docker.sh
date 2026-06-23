#!/bin/sh
set -e

cd "$(dirname "$0")/.."

echo "==> Mise à jour du code"
git pull

echo "==> Arrêt et nettoyage (base incluse)"
docker-compose down -v

echo "==> Build des images"
docker-compose build --no-cache api web

echo "==> Démarrage"
docker-compose up -d

echo "==> Attente PostgreSQL / API (30s)"
sleep 30

echo "==> Migrations Prisma"
docker-compose exec -T api npx prisma migrate deploy

echo "==> Seed"
docker-compose exec -T api npx prisma db seed

echo "==> État des conteneurs"
docker-compose ps

echo "==> Test API"
curl -sf http://127.0.0.1:4000/api/health && echo "" || echo "API pas encore prête — voir: docker-compose logs --tail=80 api"
