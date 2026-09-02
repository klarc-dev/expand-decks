import packageJson from '../../package.json';

export function getBuildIdentity() {
  return {
    version: packageJson.version,
    commit: process.env.APP_COMMIT ?? 'unknown',
  } as const;
}
