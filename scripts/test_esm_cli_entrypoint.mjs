import assert from 'node:assert/strict';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { isExecutedAsMain } from './esm-cli-entrypoint.mjs';

const scriptsRoot = path.dirname(fileURLToPath(import.meta.url));
const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'rospark-cli-v32-'));
const helperSource = path.join(scriptsRoot, 'esm-cli-entrypoint.mjs');

function createProbe(relativeDirectory, filename = 'probe.mjs') {
  const directory = path.join(tempRoot, relativeDirectory);
  mkdirSync(directory, { recursive: true });
  copyFileSync(helperSource, path.join(directory, 'esm-cli-entrypoint.mjs'));
  const probe = path.join(directory, filename);
  writeFileSync(probe, [
    "import { isExecutedAsMain } from './esm-cli-entrypoint.mjs';",
    'if (isExecutedAsMain(import.meta.url, process.argv[1])) {',
    "  process.stdout.write('MAIN_INVOKED');",
    '}',
    '',
  ].join('\n'));
  return probe;
}

function execute(script, options = {}) {
  return spawnSync(process.execPath, [options.argv1 ?? script], {
    cwd: options.cwd,
    encoding: 'utf8',
  });
}

const cases = {
  absolute_plain: createProbe('plain'),
  application_support: createProbe(
    'Users/pocpark_ai/Library/Application Support/ROSPARK/ai-widget/releases/stage',
  ),
  multiple_spaces: createProbe('path  with   several spaces'),
  unicode: createProbe('Юникод/тестовый каталог', 'конфигуратор.mjs'),
  percent_sensitive: createProbe('percent%23-and-#-question?'),
};

for (const [name, script] of Object.entries(cases)) {
  const result = execute(script);
  assert.equal(result.status, 0, `${name}: ${result.stderr}`);
  assert.equal(result.stdout, 'MAIN_INVOKED', name);
}

const relativeScript = createProbe('relative invocation');
const relativeResult = execute(relativeScript, {
  cwd: tempRoot,
  argv1: path.relative(tempRoot, relativeScript),
});
assert.equal(relativeResult.status, 0, relativeResult.stderr);
assert.equal(relativeResult.stdout, 'MAIN_INVOKED');

const imported = spawnSync(process.execPath, [
  '--input-type=module',
  '--eval',
  `await import(${JSON.stringify(pathToFileURL(cases.application_support).href)})`,
], { encoding: 'utf8' });
assert.equal(imported.status, 0, imported.stderr);
assert.equal(imported.stdout, '');

assert.equal(isExecutedAsMain(import.meta.url, undefined), false);
assert.equal(isExecutedAsMain('https://example.invalid/module.mjs', process.argv[1]), false);

const stageRoot = path.join(
  tempRoot,
  'Users/pocpark_ai/Library/Application Support/ROSPARK/ai-widget/releases',
  '.8ac196cc80e25f35c88ce7f169b22ab75a55c440.stage-runtime-20afd06-retest-v3',
);
const stageScripts = path.join(stageRoot, 'scripts');
mkdirSync(stageScripts, { recursive: true });
for (const name of [
  'esm-cli-entrypoint.mjs',
  'configure_owner_ai_canary_env.mjs',
  'configure_public_ai_core_env.mjs',
]) {
  copyFileSync(path.join(scriptsRoot, name), path.join(stageScripts, name));
}
const envPath = path.join(stageRoot, '.env.ai-widget-production.local');
writeFileSync(envPath, [
  'AI_CORE_OWNER_CANARY_ENABLED=false',
  'AI_CORE_PUBLIC_ENABLED=false',
  'OWNER_CANARY_PUBLIC_ORIGIN=https://www.xn--80aukedde.xn--p1ai',
  'AI_WIDGET_FAST_ROUTE_BOUNDARY_MODE=shadow_only',
  '',
].join('\n'), { mode: 0o600 });
chmodSync(envPath, 0o600);

const ownerResult = spawnSync(process.execPath, [
  path.join(stageScripts, 'configure_owner_ai_canary_env.mjs'), envPath, 'false',
], { encoding: 'utf8' });
assert.equal(ownerResult.status, 0, ownerResult.stderr);
assert.equal(ownerResult.stdout.trim(), 'OWNER_CANARY_ENABLED=false');

const publicResult = spawnSync(process.execPath, [
  path.join(stageScripts, 'configure_public_ai_core_env.mjs'), envPath, 'false',
], { encoding: 'utf8' });
assert.equal(publicResult.status, 0, publicResult.stderr);
assert.equal(publicResult.stdout.trim(), 'AI_CORE_PUBLIC_ENABLED=false');

const configured = readFileSync(envPath, 'utf8');
assert.match(configured,
  /AI_CORE_OWNER_CANARY_RUNTIME_SHA=78db9e3c3363720fe680056873b41b332f319b96/);
assert.match(configured,
  /AI_CORE_OWNER_CANARY_CONTRACT_SHA=4d75773d60f3453279cbfcee1453f54b15b66567/);
assert.match(configured,
  /AI_CORE_PUBLIC_RUNTIME_SHA=78db9e3c3363720fe680056873b41b332f319b96/);
assert.match(configured,
  /AI_CORE_PUBLIC_CONTRACT_SHA=4d75773d60f3453279cbfcee1453f54b15b66567/);

console.log(JSON.stringify({
  schema: 'ROSPARK_ESM_CLI_ENTRYPOINT_V3_2_TEST_V1',
  cases: 8,
  absolute_plain: 'pass',
  application_support: 'pass',
  multiple_spaces: 'pass',
  unicode: 'pass',
  imported_module: 'pass',
  relative_invocation: 'pass',
  percent_sensitive: 'pass',
  exact_staging_shape_configurator: 'pass',
  runtime_sha: '78db9e3c3363720fe680056873b41b332f319b96',
  contract_sha: '4d75773d60f3453279cbfcee1453f54b15b66567',
  canonicalization_version: 'CANONICAL_JSON_HASH_V1',
  model_requests: 0,
  production_changes: 0,
}));
