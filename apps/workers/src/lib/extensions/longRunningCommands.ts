/** Deployment-style worker commands (K8s long-running); not CronJob one-shots. */
export const LONG_RUNNING_COMMANDS = new Set([
  'mqRSSRunParser',
  'mqAddByRSSRunParser',
  'mqRSSRunLiveItemListener',
  'mqRSSRunDlqConsumer',
  'imageShrinkRunConsumer',
]);

export const isLongRunningCommand = (commandName: string): boolean =>
  LONG_RUNNING_COMMANDS.has(commandName);
