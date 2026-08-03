export type LandingRuntimeMode = 'preview' | 'production';

type LandingRuntimeEnv = Record<string, string | undefined>;

export function landingRuntimeMode(
  env: LandingRuntimeEnv = process.env,
): LandingRuntimeMode {
  return env.ROSPARK_LANDING_RUNTIME_MODE === 'production'
    ? 'production'
    : 'preview';
}

export function landingIndexable(
  env: LandingRuntimeEnv = process.env,
) {
  return (
    landingRuntimeMode(env) === 'production'
    && env.ROSPARK_LANDING_INDEXABLE === 'true'
  );
}

