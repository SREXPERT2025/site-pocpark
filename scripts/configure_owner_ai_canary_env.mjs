#!/usr/bin/env node
import { chmod, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isExecutedAsMain } from './esm-cli-entrypoint.mjs';

const RUNTIME_SHA = '20afd06ba703338541cf65ab167f3b218af09699';
const CONTRACT_SHA = '6cd71a5596346925ecdd2ffeb9d45262d881ee93';
const PUBLIC_ORIGIN = 'https://www.xn--80aukedde.xn--p1ai';
const DEPRECATED_SITE_SHA_KEY = 'AI_CORE_OWNER_CANARY_SITE_SHA';

function valuesFrom(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    return match ? [[match[1], match[2]]] : [];
  }));
}

export function assertOwnerCanaryEnv(source, enabled) {
  const values = valuesFrom(source);
  if (values.AI_CORE_OWNER_CANARY_ENABLED !== (enabled ? 'true' : 'false')
    || values.AI_CORE_OWNER_CANARY_RUNTIME_SHA !== RUNTIME_SHA
    || values.AI_CORE_OWNER_CANARY_CONTRACT_SHA !== CONTRACT_SHA
    || values.OWNER_CANARY_PUBLIC_ORIGIN !== PUBLIC_ORIGIN
    || DEPRECATED_SITE_SHA_KEY in values) {
    throw new Error('CONFIGURATOR_OUTPUT_MISSING');
  }
}

export function updateOwnerCanaryEnv(source, enabled) {
  if (enabled !== true && enabled !== false) {
    throw new Error('INVALID_OWNER_CANARY_FLAG');
  }
  const required = new Map([
    ['AI_CORE_OWNER_CANARY_ENABLED', enabled ? 'true' : 'false'],
    ['AI_CORE_OWNER_CANARY_RUNTIME_SHA', RUNTIME_SHA],
    ['AI_CORE_OWNER_CANARY_CONTRACT_SHA', CONTRACT_SHA],
    ['OWNER_CANARY_PUBLIC_ORIGIN', PUBLIC_ORIGIN],
  ]);
  const seen = new Set();
  const lines = source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match?.[1] === DEPRECATED_SITE_SHA_KEY) return [];
    if (!match || !required.has(match[1])) return [line];
    if (seen.has(match[1])) throw new Error(`DUPLICATE_${match[1]}`);
    seen.add(match[1]);
    return [`${match[1]}=${required.get(match[1])}`];
  });
  for (const [key, value] of required) {
    if (!seen.has(key)) lines.push(`${key}=${value}`);
  }
  const result = `${lines.join('\n').replace(/\n+$/, '')}\n`;
  if (enabled) {
    const values = valuesFrom(result);
    if (values.OWNER_CANARY_PUBLIC_ORIGIN !== PUBLIC_ORIGIN
      || !values.AI_CORE_OWNER_CANARY_URL?.startsWith('https://')
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
  const written = await import('node:fs/promises').then(({ readFile }) =>
    readFile(path, 'utf8'));
  assertOwnerCanaryEnv(written, value === 'true');
  console.log(`OWNER_CANARY_ENABLED=${value}`);
}

if (isExecutedAsMain(import.meta.url, process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
