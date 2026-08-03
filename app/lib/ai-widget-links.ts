export type AiWidgetMessagePart =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'link'; href: string; label: string };

const SAME_SITE_HOSTS = new Set([
  'роспарк.рф',
  'www.роспарк.рф',
  'xn--80aukedde.xn--p1ai',
  'www.xn--80aukedde.xn--p1ai',
]);

const MARKDOWN_TOKEN_RE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*/g;
const PLAIN_LINK_RE = /(https?:\/\/[^\s]+|\/[a-z0-9][^\s]*)/gi;

function stripTrailingLinkNoise(value: string) {
  let cleaned = value;
  let previous = '';
  while (cleaned !== previous) {
    previous = cleaned;
    cleaned = cleaned
      .replace(/%60$/i, '')
      .replace(/[`'"\]}>),.;!?]+$/, '');
  }
  return cleaned;
}

function cleanMarkdownLabel(value: string) {
  return value
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim();
}

export function normalizeAiWidgetHref(value: string) {
  const cleaned = stripTrailingLinkNoise(value.trim());
  if (cleaned.startsWith('/') && !cleaned.startsWith('//')) {
    return cleaned;
  }
  if (!/^https:\/\//i.test(cleaned)) return null;

  try {
    const url = new URL(cleaned);
    if (SAME_SITE_HOSTS.has(url.hostname.toLowerCase())) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function plainMessageParts(content: string): AiWidgetMessagePart[] {
  const parts: AiWidgetMessagePart[] = [];
  let cursor = 0;

  for (const match of content.matchAll(PLAIN_LINK_RE)) {
    const index = match.index ?? 0;
    const cleanRaw = stripTrailingLinkNoise(match[0]);
    const hasInlineCodeFence = (
      content[index - 1] === '`'
      && match[0].slice(cleanRaw.length).includes('`')
    );
    if (index > cursor) {
      const prefix = content.slice(
        cursor,
        hasInlineCodeFence ? index - 1 : index,
      );
      if (prefix) parts.push({ type: 'text', value: prefix });
    }

    const raw = match[0];
    const href = normalizeAiWidgetHref(cleanRaw);
    if (href && cleanRaw) {
      parts.push({ type: 'link', href, label: cleanRaw });
      const suffix = raw.slice(cleanRaw.length).replace(/[`'"]/g, '');
      if (suffix) parts.push({ type: 'text', value: suffix });
    } else {
      parts.push({ type: 'text', value: raw });
    }
    cursor = index + raw.length;
  }

  if (cursor < content.length) {
    parts.push({ type: 'text', value: content.slice(cursor) });
  }
  return parts;
}

export function aiWidgetMessageParts(content: string) {
  const parts: AiWidgetMessagePart[] = [];
  let cursor = 0;

  for (const match of content.matchAll(MARKDOWN_TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      parts.push(...plainMessageParts(content.slice(cursor, index)));
    }

    if (match[3]) {
      parts.push({ type: 'strong', value: match[3] });
    } else {
      const href = normalizeAiWidgetHref(match[2]);
      const label = cleanMarkdownLabel(match[1]);
      if (href && label) {
        parts.push({ type: 'link', href, label });
      } else {
        parts.push({ type: 'text', value: match[0] });
      }
    }
    cursor = index + match[0].length;
  }

  if (cursor < content.length) {
    parts.push(...plainMessageParts(content.slice(cursor)));
  }
  return parts;
}

