export const CANONICAL_SITE_URL = 'https://www.роспарк.рф/';

function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return CANONICAL_SITE_URL;
  }
}

export function getSiteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_SITE_URL);
}

export function getSiteUrlWithoutTrailingSlash(): string {
  return getSiteUrl().replace(/\/$/, '');
}

export function getMetadataBase(): URL {
  return new URL(getSiteUrl());
}

export function absoluteUrl(pathname = '/'): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${getSiteUrlWithoutTrailingSlash()}${normalizedPath}`;
}

export function canonicalUrl(pathname = '/'): string {
  return absoluteUrl(pathname);
}
