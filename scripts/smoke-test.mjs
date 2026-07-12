#!/usr/bin/env node
/**
 * Smoke test complet AUDAX — API locale
 * Usage: node scripts/smoke-test.mjs
 * Vars: API_URL (défaut http://localhost:4000/api), WEB_URL (défaut http://localhost:3000)
 */

const API = (process.env.API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
const WEB = (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL ?? 'admin@audax.fardc.cd';
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD ?? 'Audax2026!';
const SALLE_EMAIL = process.env.SMOKE_SALLE_EMAIL ?? 'salle@audax.fardc.cd';
const SALLE_PASSWORD = process.env.SMOKE_SALLE_PASSWORD ?? 'Audax2026!';

/** @type {{ name: string; ok: boolean; detail: string; ms: number }[]} */
const results = [];

function record(name, ok, detail, ms) {
  results.push({ name, ok, detail, ms });
  const icon = ok ? 'PASS' : 'FAIL';
  console.log(`${icon.padEnd(4)} ${name} (${ms}ms) — ${detail}`);
}

async function req(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API}${path}`;
  const started = Date.now();
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const ms = Date.now() - started;
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data, ms, text };
}

async function expectStatus(name, path, options, expectedStatus) {
  try {
    const { res, data, ms } = await req(path, options);
    const ok = res.status === expectedStatus;
    const detail = ok
      ? `HTTP ${res.status}`
      : `attendu ${expectedStatus}, reçu ${res.status}: ${typeof data === 'string' ? data.slice(0, 120) : JSON.stringify(data)?.slice(0, 160)}`;
    record(name, ok, detail, ms);
    return { ok, res, data, ms };
  } catch (err) {
    record(name, false, err instanceof Error ? err.message : String(err), 0);
    return { ok: false, res: null, data: null, ms: 0 };
  }
}

async function main() {
  console.log(`\n=== AUDAX smoke test ===\nAPI: ${API}\nWEB: ${WEB}\n`);

  // 1. Health
  await expectStatus('API health', '/health', {}, 200);

  // 2. Web pages
  for (const page of ['/', '/login']) {
    try {
      const started = Date.now();
      const res = await fetch(`${WEB}${page}`, { redirect: 'manual' });
      const ms = Date.now() - started;
      const ok = res.status >= 200 && res.status < 400;
      record(`Web ${page}`, ok, `HTTP ${res.status}`, ms);
    } catch (err) {
      record(`Web ${page}`, false, err instanceof Error ? err.message : String(err), 0);
    }
  }

  // 3. Auth — bad password
  await expectStatus(
    'Login mauvais mot de passe',
    '/auth/login',
    { method: 'POST', body: { email: ADMIN_EMAIL, password: 'wrong-password' } },
    401,
  );

  // 4. Auth — admin
  const login = await expectStatus(
    'Login admin',
    '/auth/login',
    { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } },
    200,
  );
  if (!login.ok || !login.data?.accessToken) {
    console.log('\nAbandon: login admin impossible.\n');
    printSummary();
    process.exit(1);
  }
  const adminToken = login.data.accessToken;
  const refreshToken = login.data.refreshToken;

  await expectStatus('GET /auth/me', '/auth/me', { token: adminToken }, 200);

  // 5. Données métier
  const audiences = await expectStatus('Liste audiences', '/audiences', { token: adminToken }, 200);
  if (audiences.ok) {
    const n = Array.isArray(audiences.data) ? audiences.data.length : -1;
    record('Audiences payload', n >= 0, `${n} élément(s)`, audiences.ms);
  }

  const visitors = await expectStatus('Liste visiteurs', '/visitors', { token: adminToken }, 200);
  if (visitors.ok) {
    const n = Array.isArray(visitors.data) ? visitors.data.length : -1;
    record('Visiteurs payload', n >= 0, `${n} élément(s)`, visitors.ms);
  }

  const rooms = await expectStatus('Liste salles', '/rooms', { token: adminToken }, 200);
  if (rooms.ok) {
    const n = Array.isArray(rooms.data) ? rooms.data.length : -1;
    record('Salles payload', n >= 0, `${n} élément(s)`, rooms.ms);
  }

  const reports = await expectStatus('Rapports dashboard', '/dashboard/reports', { token: adminToken }, 200);
  if (reports.ok && reports.data) {
    const hasShape =
      typeof reports.data.total === 'number' &&
      typeof reports.data.validationRate === 'number' &&
      Array.isArray(reports.data.byCategory) &&
      Array.isArray(reports.data.byMonth);
    record('Rapports shape', hasShape, hasShape ? `total=${reports.data.total}` : 'champs manquants', reports.ms);
  }

  await expectStatus('Dashboard overview', '/dashboard', { token: adminToken }, 200);
  await expectStatus('Org-units cabinets (GET)', '/org-units/cabinets', { token: adminToken }, 200);
  await expectStatus('Notifications', '/notifications', { token: adminToken }, 200);
  await expectStatus('Audit', '/audit', { token: adminToken }, 200);
  await expectStatus('Users', '/users', { token: adminToken }, 200);
  await expectStatus('Grades militaires', '/military-grades', { token: adminToken }, 200);
  await expectStatus('Matrice rôles', '/roles/matrix', { token: adminToken }, 200);
  await expectStatus('Contacts chat', '/chat/contacts', { token: adminToken }, 200);
  await expectStatus('Sécurité système', '/system-settings/security', { token: adminToken }, 200);

  // 6. RBAC org-units — salle ne peut pas créer
  const salleLogin = await expectStatus(
    'Login salle d\'attente',
    '/auth/login',
    { method: 'POST', body: { email: SALLE_EMAIL, password: SALLE_PASSWORD } },
    200,
  );
  if (salleLogin.ok && salleLogin.data?.accessToken) {
    const salleToken = salleLogin.data.accessToken;
    await expectStatus(
      'RBAC: salle crée cabinet → 403',
      '/org-units/cabinets',
      { method: 'POST', token: salleToken, body: { name: `Smoke-Forbidden-${Date.now()}` } },
      403,
    );
    await expectStatus('Salle: visiteurs OK', '/visitors', { token: salleToken }, 200);
    await expectStatus('Salle: users → 403', '/users', { token: salleToken }, 403);
  }

  // 7. Admin peut créer puis supprimer un cabinet de test
  const cabName = `Smoke-Test-${Date.now()}`;
  try {
    const started = Date.now();
    const { res, data, ms } = await req('/org-units/cabinets', {
      method: 'POST',
      token: adminToken,
      body: { name: cabName },
    });
    const ok = res.status === 200 || res.status === 201;
    record('Admin crée cabinet smoke', ok, `HTTP ${res.status}`, ms);
    const cabId = data?.id;
    if (ok && cabId) {
      await expectStatus(
        'Admin supprime cabinet smoke',
        `/org-units/cabinets/${cabId}`,
        { method: 'DELETE', token: adminToken },
        200,
      );
    } else if (ok && !cabId) {
      record('Admin crée cabinet smoke id', false, 'réponse sans id', Date.now() - started);
    }
  } catch (err) {
    record('Admin crée cabinet smoke', false, err instanceof Error ? err.message : String(err), 0);
  }

  // 8. Sans token
  await expectStatus('Audiences sans token → 401', '/audiences', {}, 401);

  // 9. Refresh + logout
  if (refreshToken) {
    const refreshed = await expectStatus(
      'Refresh token',
      '/auth/refresh',
      { method: 'POST', body: { refreshToken } },
      200,
    );
    if (refreshed.ok && refreshed.data?.refreshToken) {
      await expectStatus(
        'Logout',
        '/auth/logout',
        { method: 'POST', body: { refreshToken: refreshed.data.refreshToken } },
        200,
      );
    }
  }

  // 10. Swagger (dev)
  try {
    const started = Date.now();
    const res = await fetch(`${API}/docs`);
    const ms = Date.now() - started;
    const ok = res.status === 200;
    record('Swagger /api/docs (dev)', ok, `HTTP ${res.status}`, ms);
  } catch (err) {
    record('Swagger /api/docs (dev)', false, err instanceof Error ? err.message : String(err), 0);
  }

  printSummary();
  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed > 0 ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n=== Résumé: ${passed} pass / ${failed} fail / ${results.length} total ===\n`);
  if (failed) {
    console.log('Échecs:');
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  - ${r.name}: ${r.detail}`);
    }
    console.log('');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
