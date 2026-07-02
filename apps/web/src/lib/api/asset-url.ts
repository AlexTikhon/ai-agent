const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';

export function resolveAssetUrl(pathOrUrl: string | null | undefined): string | null {
  if (pathOrUrl == null) return null;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  try {
    const { origin } = new URL(API_BASE);
    return `${origin}${pathOrUrl}`;
  } catch {
    return pathOrUrl;
  }
}
