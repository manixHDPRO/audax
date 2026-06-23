#!/bin/sh
# Réinitialisation complète du VPS Audax — PM2 + dossier projet
set -e

VPS_HOST="${VPS_HOST:-187.77.72.4}"
PROJECT_DIRS="/root/Audax /root/audax /opt/Audax /opt/audax /home/*/Audax /home/*/audax"

echo "================================================"
echo "  RESET VPS AUDAX — suppression totale"
echo "  Hôte: $(hostname) ($VPS_HOST)"
echo "================================================"
echo ""
echo "Cette opération va :"
echo "  - Arrêter les processus PM2 (audax-api, audax-web)"
echo "  - Supprimer les dossiers du projet Audax"
echo ""
printf "Tapez 'OUI' pour confirmer : "
read -r CONFIRM
if [ "$CONFIRM" != "OUI" ]; then
  echo "Annulé."
  exit 1
fi

echo ""
echo "==> Arrêt PM2"
if command -v pm2 >/dev/null 2>&1; then
  pm2 delete audax-api audax-web 2>/dev/null || true
  pm2 save 2>/dev/null || true
else
  echo "    PM2 non installé — ignoré."
fi

echo "==> Suppression des dossiers projet"
for pattern in $PROJECT_DIRS; do
  for dir in $pattern; do
    if [ -d "$dir" ]; then
      echo "    Suppression : $dir"
      rm -rf "$dir"
    fi
  done
done

echo ""
echo "==> État PM2"
if command -v pm2 >/dev/null 2>&1; then
  pm2 status
else
  echo "  (PM2 non disponible)"
fi

echo ""
echo "================================================"
echo "  RESET TERMINÉ — VPS nettoyé pour Audax"
echo "================================================"
