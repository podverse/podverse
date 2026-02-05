import { addAliases } from 'module-alias';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

addAliases({
  '@parser': path.join(__dirname, ''),
});

export {};
