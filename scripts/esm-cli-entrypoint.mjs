import { realpathSync } from 'node:fs';
import { normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function canonicalFilePath(path) {
  const absolute = normalize(resolve(path));
  try {
    return (realpathSync.native ?? realpathSync)(absolute);
  } catch {
    return absolute;
  }
}

export function isExecutedAsMain(importMetaUrl, argv1, cwd = process.cwd()) {
  if (typeof importMetaUrl !== 'string' || importMetaUrl.length === 0
    || typeof argv1 !== 'string' || argv1.length === 0) {
    return false;
  }

  try {
    const moduleUrl = new URL(importMetaUrl);
    if (moduleUrl.protocol !== 'file:') return false;
    const modulePath = canonicalFilePath(fileURLToPath(moduleUrl));
    const invokedPath = canonicalFilePath(resolve(cwd, argv1));
    return modulePath === invokedPath;
  } catch {
    return false;
  }
}
