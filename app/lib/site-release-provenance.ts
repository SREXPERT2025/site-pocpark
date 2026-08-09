const SHA_PATTERN = /^[a-f0-9]{40}$/;

export const DEPLOYED_SITE_SHA =
  process.env.ROSPARK_DEPLOYED_SITE_SHA ?? '';

export type SiteReleaseProvenance = Readonly<{
  ready: boolean;
  reportedSiteSha: string;
  actualDeployedSiteSha: string;
  reasonCode: 'SITE_RELEASE_PROVENANCE_OK'
    | 'SITE_RELEASE_SHA_INVALID'
    | 'SITE_RELEASE_SHA_MISMATCH';
}>;

export function evaluateSiteReleaseProvenance(input: {
  actualDeployedSiteSha?: string;
  configuredOwnerSiteSha?: string | null;
} = {}): SiteReleaseProvenance {
  const actualDeployedSiteSha = (
    input.actualDeployedSiteSha ?? DEPLOYED_SITE_SHA
  ).trim();
  const configuredOwnerSiteSha = (
    input.configuredOwnerSiteSha
      ?? process.env.AI_CORE_OWNER_CANARY_SITE_SHA
      ?? ''
  ).trim();
  if (!SHA_PATTERN.test(actualDeployedSiteSha)) {
    return Object.freeze({
      ready: false,
      reportedSiteSha: '',
      actualDeployedSiteSha,
      reasonCode: 'SITE_RELEASE_SHA_INVALID',
    });
  }
  if (configuredOwnerSiteSha
    && configuredOwnerSiteSha !== actualDeployedSiteSha) {
    return Object.freeze({
      ready: false,
      reportedSiteSha: actualDeployedSiteSha,
      actualDeployedSiteSha,
      reasonCode: 'SITE_RELEASE_SHA_MISMATCH',
    });
  }
  return Object.freeze({
    ready: true,
    reportedSiteSha: actualDeployedSiteSha,
    actualDeployedSiteSha,
    reasonCode: 'SITE_RELEASE_PROVENANCE_OK',
  });
}

export function requireOwnerCanarySiteRelease(input: {
  actualDeployedSiteSha?: string;
  configuredOwnerSiteSha?: string | null;
} = {}) {
  const provenance = evaluateSiteReleaseProvenance(input);
  if (!provenance.ready) {
    throw new Error(provenance.reasonCode);
  }
  return provenance.reportedSiteSha;
}
