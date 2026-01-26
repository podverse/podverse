import moduleAlias from 'module-alias';
import path from 'path';

moduleAlias.addAliases({
  '@qa': path.join(__dirname, ''),
});
