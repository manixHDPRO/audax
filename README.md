# AUDAX

**Plateforme de gestion stratégique des audiences** — Cabinet du Chef EMG, FARDC

## Fonctionnalités

- **2FA TOTP** — Activation dans Paramètres, vérification au login
- **Agenda drag & drop** — Replanification avec détection de conflits
- **Docker + CI/CD** — Stack complète et pipeline GitHub Actions

## Démarrage rapide

```bash
npm install
copy .env.example .env

# Mode développement (frontend seul, données démo)
npm run dev

# Stack complète Docker
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000/api |
| Swagger | http://localhost:4000/api/docs |

**Comptes démo** : `admin@audax.fardc.cd` / `Audax2026!` — `salle@audax.fardc.cd` (salle d'attente, enregistrement audiences uniquement)

### Tester la 2FA (mode démo)

1. Connectez-vous → **Paramètres** → **Activer 2FA**
2. Scannez le QR avec Google Authenticator / Authy
3. Déconnectez-vous et reconnectez-vous — le code 2FA sera demandé

### Tester le calendrier

Glissez une audience vers un autre jour dans **Agenda**. Les conflits horaires s'affichent en temps réel.

