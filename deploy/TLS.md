# TLS pour AUDAX — checklist VPS
#
# Prérequis : domaine DNS pointant vers le VPS, ports 80/443 ouverts.
#
# 1. Installer Nginx + Certbot
#    sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
#
# 2. Copier la config
#    sudo cp deploy/nginx/audax.conf /etc/nginx/sites-available/audax
#    # Éditer server_name + chemins SSL
#    sudo ln -sf /etc/nginx/sites-available/audax /etc/nginx/sites-enabled/audax
#    sudo nginx -t && sudo systemctl reload nginx
#
# 3. Certificat Let's Encrypt
#    sudo certbot --nginx -d votre-domaine.tld
#
# 4. Bind local uniquement (recommandé) — ecosystem / firewall
#    - API et Web écoutent déjà en local via Nginx (proxy 127.0.0.1)
#    - Fermer 3000/4000 dans le firewall public : ufw allow 80,443 ; deny 3000,4000
#
# 5. Variables .env (voir .env.production.example)
#    NEXT_PUBLIC_API_URL=https://votre-domaine.tld/api
#    CORS_ORIGIN=https://votre-domaine.tld
#    JWT_SECRET=$(openssl rand -base64 48)
#
# 6. Rebuild web après changement de NEXT_PUBLIC_API_URL
#    npm run build && pm2 restart audax-api audax-web
#
# 7. Vérifier
#    curl -sf https://votre-domaine.tld/api/health
#    # /api/docs doit répondre 404 en production
