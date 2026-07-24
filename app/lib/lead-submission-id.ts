export function createLeadSubmissionId(prefix: 'site' | 'quiz') {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2),
  ].join('-');
  return `${prefix}:${randomPart}`;
}
