/* eslint-disable @typescript-eslint/no-require-imports */
const moduleAlias = require('module-alias');
const path = require('path');

moduleAlias.addAliases({
  '@queue': path.join(__dirname, ''),
});

export {};
