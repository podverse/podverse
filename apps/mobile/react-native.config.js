const { loadProjectEnv } = require('@expo/env');
const { reactNativeDependencyOverrides } = require('./fossNativeModules');

// Pod install and Gradle read this file outside Expo, so load the same .env Expo prebuild uses.
loadProjectEnv(__dirname, { silent: true });

/** FOSS and file-less builds drop Firebase and store billing here. Expo autolinking reads this file. */
module.exports = {
  dependencies: reactNativeDependencyOverrides(process.env),
};
