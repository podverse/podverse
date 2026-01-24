const moduleAlias = require('module-alias');
const path = require('path');

moduleAlias.addAliases({
  '@qa': path.join(__dirname, ''),
});

export {};
