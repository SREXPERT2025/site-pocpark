#!/usr/bin/env node
import { chmod, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const RUNTIME_SHA = '5713258de76d4aa689baf30eae016df54cd8d579';
const CONTRACT_SHA = '8834367e7412656b5a83d0c01b05dbffae6d3dee';

export function updateOwnerCanaryEnv(source, enabled) {
  if (enabled !== true && enabled !== false) {
    throw new Error('INVALID_OWNER_CANARY_FLAG');
  }
  const required = new Map([
    ['AI_CORE_OWNER_CANARY_ENABLED', enabled ? 'true' : 'false'],
    ['AI_CORE_OWNER_CANARY_RUNTIME_SHA', RUNTIME_SHA],
    ['AI_CORE_OWNER_CANARY_CONTRACT_SHA', CONTRACT_SHA],
  ]);
  const seen = new Set();
  const lines = source.split(/\r?\n/).map((line) => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match || !required.has(match[1])) return line;
    if (seen.has(match[1])) throw new Error(`DUPLICATE_${match[1]}`);
    seen.add(match[1]);
    return `${match[1]}=${required.get(match[1])}`;
  });
  for (const [key, value] of required) {
    if (!seen.has(key)) lines.push(`${key}=${value}`);
  }
  const result = `${lines.join('\n').replace(/\n+$/, '')}\n`;
  if (enabled) {
    const values = Object.fromEntries(result.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      return match ? [[match[1], match[2]]] : [];
    }));
    if (!values.AI_CORE_OWNER_CANARY_URL?.startsWith('https://')
      || (values.AI_CORE_OWNER_CANARY_SECRET?.length ?? 0) < 32
      || (values.AI_CORE_OWNER_CANARY_COOKIE_KEY?.length ?? 0) < 32
      || (values.AI_CORE_IDENTITY_HMAC_KEY?.length ?? 0) < 32) {
      throw new Error('OWNER_CANARY_REQUIRED_CONFIG_INVALID');
    }
  }
  return result;
}

async function main() {
  const [pathArg, value] = process.argv.slice(2);
  if (!pathArg || !['true', 'false'].includes(value)) {
    throw new Error('usage: configure_owner_ai_canary_env.mjs ENV true|false');
  }
  const path = resolve(pathArg);
  const info = await stat(path);
  if (!info.isFile() || (info.mode & 0o077) !== 0) {
    throw new Error('OWNER_CANARY_ENV_MODE_UNSAFE');
  }
  const source = await import('node:fs/promises').then(({ readFile }) =>
    readFile(path, 'utf8'));
  const next = updateOwnerCanaryEnv(source, value === 'true');
  const temporary = `${dirname(path)}/.${randomUUID()}.owner-canary-env`;
  await writeFile(temporary, next, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  await chmod(temporary, 0o600);
  await rename(temporary, path);
  console.log(`OWNER_CANARY_ENABLED=${value}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
