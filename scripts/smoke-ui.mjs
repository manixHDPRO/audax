#!/usr/bin/env node
/**
 * Smoke UI — login + pages clés (Playwright one-shot)
 * Usage: node scripts/smoke-ui.mjs
 */
import { chromium } from 'playwright';

const WEB = (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL ?? 'admin@audax.fardc.cd';
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD ?? 'Audax2026!';

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} — ${detail}`);
}

async function waitForPageContent(page, path, heading) {
  await page.goto(`${WEB}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // Attendre la fin du spinner AuthGuard / contenu métier (pas la page login)
  await page.waitForFunction(
    (pattern) => {
      const text = document.body?.innerText ?? '';
      if (/SECURE_AUTH_V1\.0|Initialiser Connexion/i.test(text)) return false;
      return new RegExp(pattern, 'i').test(text);
    },
    heading.source,
    { timeout: 20000 },
  );
  const body = await page.locator('body').innerText();
  const hasError = /API indisponible|erreur serveur|failed to fetch/i.test(body);
  return { body, hasError, url: page.url() };
}

async function main() {
  console.log(`\n=== AUDAX UI smoke ===\nWEB: ${WEB}\n`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto(`${WEB}/login`, { waitUntil: 'networkidle', timeout: 60000 });
    record('Page login', true, page.url());

    await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /initialiser connexion|authentifier|connexion/i }).click();

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
    record('Login admin UI', true, page.url());

    const pagesToCheck = [
      ['/audiences', /audience/i],
      ['/visitors', /visiteur/i],
      ['/reports', /rapport|analytics/i],
      ['/dashboard', /dashboard|tableau|pilotage|audience/i],
      ['/command-center', /command|salle|audience|kpi|total/i],
    ];

    for (const [path, heading] of pagesToCheck) {
      try {
        const { body, hasError, url } = await waitForPageContent(page, path, heading);
        if (url.includes('/login')) {
          record(`UI ${path}`, false, 'redirigé vers login');
          continue;
        }
        record(
          `UI ${path}`,
          !hasError,
          hasError ? 'erreur API visible' : `contenu OK (${body.slice(0, 40).replace(/\s+/g, ' ')}…)`,
        );
      } catch (err) {
        record(
          `UI ${path}`,
          false,
          err instanceof Error ? err.message.slice(0, 120) : String(err),
        );
      }
    }
  } catch (err) {
    record('UI smoke fatal', false, err instanceof Error ? err.message : String(err));
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok).length;
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== UI résumé: ${passed} pass / ${failed} fail ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
