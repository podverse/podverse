const { reactNativeDependencyOverrides } = require('./fossNativeModules');

/** FOSS and file-less builds drop Firebase and store billing here. Expo autolinking reads this file. */
module.exports = {
  dependencies: reactNativeDependencyOverrides(process.env),
};
