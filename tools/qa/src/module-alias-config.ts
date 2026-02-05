import { addAliases } from 'module-alias';
import path from 'path';

addAliases({
  '@qa': path.join(__dirname, ''),
});
