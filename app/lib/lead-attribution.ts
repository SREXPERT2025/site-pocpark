export type LeadAttribution = Partial<Record<(typeof ATTRIBUTION_KEYS)[number], string>>;

const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'yclid',
  'gclid',
  'fbclid',
] as const;

const STORAGE_KEY = 'rospark_lead_attribution';

function isBrowser() {
  return typeof window !== 'undefined';
}

function readStoredAttribution(): LeadAttribution {
  if (!isBrowser()) return {};

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return ATTRIBUTION_KEYS.reduce<LeadAttribution>((acc, key) => {
      const value = parsed[key];
      if (typeof value === 'string' && value.trim()) {
        acc[key] = value.trim();
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function writeStoredAttribution(value: LeadAttribution) {
  if (!isBrowser() || Object.keys(value).length === 0) return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private modes or restricted browsers.
  }
}

function readUrlAttribution(): LeadAttribution {
  if (!isBrowser()) return {};

  try {
    const params = new URLSearchParams(window.location.search);
    return ATTRIBUTION_KEYS.reduce<LeadAttribution>((acc, key) => {
      const value = params.get(key);
      if (value?.trim()) {
        acc[key] = value.trim();
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function getLeadAttribution(): LeadAttribution | undefined {
  const stored = readStoredAttribution();
  const fromUrl = readUrlAttribution();
  const merged = { ...stored, ...fromUrl };

  writeStoredAttribution(merged);

  return Object.keys(merged).length > 0 ? merged : undefined;
}
