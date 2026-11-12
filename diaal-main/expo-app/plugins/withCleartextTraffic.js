const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Release builds are HTTPS-only and exclude app data from OS backup.
 * Cleartext HTTP is permitted solely by the debug source-set overlay
 * (android/app/src/debug/AndroidManifest.xml) for local dev servers.
 */
module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:usesCleartextTraffic'] = 'false';
      application.$['android:allowBackup'] = 'false';
    }
    return config;
  });
};