export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export function isApiConfigured(): boolean {
  return Boolean(API_BASE_URL);
}

export const API_REQUIRED_MESSAGE =
  'L\'API backend est requise. Lancez npm run dev:api ou npm run dev:all.';

export const API_UNAVAILABLE_MESSAGE =
  'L\'API backend n\'est pas encore disponible. Attendez le message « AUDAX API running » dans le terminal, puis réessayez.';

export async function checkApiHealth(): Promise<boolean> {
  if (!API_BASE_URL) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}
