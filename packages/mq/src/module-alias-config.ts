import moduleAlias from 'module-alias';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

moduleAlias.addAliases({
  '@queue': path.join(__dirname, ''),
});

export {};
