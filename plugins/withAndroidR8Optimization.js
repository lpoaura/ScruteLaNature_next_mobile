const {
  createRunOncePlugin,
  withAppBuildGradle,
} = require("@expo/config-plugins");

const PLUGIN_NAME = "with-android-r8-optimization";
const PLUGIN_VERSION = "1.0.0";

function withAndroidR8Optimization(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== "groovy") {
      throw new Error(`${PLUGIN_NAME} nécessite un build.gradle Groovy.`);
    }

    const nonOptimizedConfig =
      /getDefaultProguardFile\(["']proguard-android\.txt["']\)/g;
    const optimizedConfig =
      'getDefaultProguardFile("proguard-android-optimize.txt")';

    if (
      !nonOptimizedConfig.test(config.modResults.contents) &&
      !config.modResults.contents.includes("proguard-android-optimize.txt")
    ) {
      throw new Error(
        `${PLUGIN_NAME} n'a pas trouvé la configuration ProGuard dans android/app/build.gradle.`,
      );
    }

    config.modResults.contents = config.modResults.contents.replace(
      nonOptimizedConfig,
      optimizedConfig,
    );

    return config;
  });
}

module.exports = createRunOncePlugin(
  withAndroidR8Optimization,
  PLUGIN_NAME,
  PLUGIN_VERSION,
);
