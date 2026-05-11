/** Non-prod stacks may show the server-environment disclaimer; local dev does not. */
export function shouldShowServerEnvironmentDisclaimer(serverEnv: string | undefined): boolean {
  return Boolean(serverEnv && serverEnv !== 'prod' && serverEnv !== 'local');
}
