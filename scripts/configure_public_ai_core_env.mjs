#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { chmod, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const RUNTIME_SHA = 'b9c58dbbd0cd28fcc0de9e2751b0ddd5a3a66763';
const CONTRACT_SHA = '6cd71a5596346925ecdd2ffeb9d45262d881ee93';

function valuesFrom(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    return match ? [[match[1], match[2]]] : [];
  }));
}

export function updatePublicAiCoreEnv(source, enabled) {
  if (enabled !== true && enabled !== false) {
    throw new Error('INVALID_PUBLIC_AI_CORE_FLAG');
  }
  const required = new Map([
    ['AI_CORE_PUBLIC_ENABLED', enabled ? 'true' : 'false'],
    ['AI_CORE_PUBLIC_RUNTIME_SHA', RUNTIME_SHA],
    ['AI_CORE_PUBLIC_CONTRACT_SHA', CONTRACT_SHA],
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
    const values = valuesFrom(result);
    if (values.AI_CORE_OWNER_CANARY_ENABLED === 'true') {
      throw new Error('OWNER_CANARY_MUST_BE_OFF');
    }
    if (!values.AI_CORE_PUBLIC_URL?.startsWith('https://')
      || (values.AI_CORE_PUBLIC_SECRET?.length ?? 0) < 32
      || !/^[a-f0-9]{40}$/.test(values.AI_CORE_PUBLIC_SITE_SHA ?? '')
      || !/^[a-f0-9]{40}$/.test(values.AI_CORE_PUBLIC_GATEWAY_SHA ?? '')
      || (values.AI_CORE_IDENTITY_HMAC_KEY?.length ?? 0) < 32) {
      throw new Error('PUBLIC_AI_CORE_REQUIRED_CONFIG_INVALID');
    }
  }
  return result;
}

async function main() {
  const [pathArg, value] = process.argv.slice(2);
  if (!pathArg || !['true', 'false'].includes(value)) {
    throw new Error('usage: configure_public_ai_core_env.mjs ENV true|false');
  }
  const path = resolve(pathArg);
  const info = await stat(path);
  if (!info.isFile() || (info.mode & 0o077) !== 0) {
    throw new Error('PUBLIC_AI_CORE_ENV_MODE_UNSAFE');
  }
  const next = updatePublicAiCoreEnv(
    await readFile(path, 'utf8'),
    value === 'true',
  );
  const temporary = `${dirname(path)}/.${randomUUID()}.public-ai-core-env`;
  await writeFile(temporary, next, {
    encoding: 'utf8', mode: 0o600, flag: 'wx',
  });
  await chmod(temporary, 0o600);
  await rename(temporary, path);
  console.log(`AI_CORE_PUBLIC_ENABLED=${value}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
