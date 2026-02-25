/**
 * CLI entry for npm run generate. Calls main() from generate-feed-cli.
 * Only this file is run when the user invokes the generate script;
 * Lighthouse and generate_and_parse never import this file.
 */
import { main } from './generate-feed-cli.js';

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
