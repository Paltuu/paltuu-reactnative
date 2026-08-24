/**
 * Config plugin: disable AGP's `verifyRelease/DebugResources` task for library subprojects.
 *
 * This task checks a library module's manifest-referenced resources (e.g. a color set via
 * a manifest placeholder) against ONLY that module's own isolated resource set — it can't
 * see resources the consuming app provides, even though the app's resources are exactly
 * what the manifest placeholder is designed to be filled in with at final merge time. In
 * this project, react-native-firebase/messaging's manifest references
 * `@color/notification_icon_color` (driven by firebase.json, matching the same color
 * expo-notifications configures at the app level — see firebase.json's own comment for why
 * they must match) — a real resource the app defines and the final merged APK/AAB
 * genuinely has, but this task fails anyway because it never looks at the app's resources.
 *
 * This is a known false-positive pattern for exactly this "app supplies a resource for a
 * library's manifest placeholder" setup, not a real missing-resource bug — disabling the
 * task (rather than the resource, which the manifest merge step still correctly needs) is
 * the standard workaround.
 *
 * Uses `gradle.taskGraph.whenReady` rather than `subprojects { afterEvaluate {...} }` —
 * the latter throws "Cannot run Project.afterEvaluate(Closure) when the project is already
 * evaluated" here, since this snippet is appended to the root build.gradle late enough
 * that some subprojects are already evaluated by the time it runs. taskGraph.whenReady
 * fires once the whole task graph is known, after all project evaluation is done, so there
 * is no ordering to get wrong.
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');

const SNIPPET_MARKER = '// @paltuu disable verifyRelease/DebugResources for library subprojects';

const GRADLE_SNIPPET = `
${SNIPPET_MARKER}
gradle.taskGraph.whenReady { graph ->
  graph.allTasks.each { task ->
    if (task.name == 'verifyReleaseResources' || task.name == 'verifyDebugResources') {
      task.enabled = false
    }
  }
}
`;

const withDisableVerifyReleaseResources = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(SNIPPET_MARKER)) {
      cfg.modResults.contents += GRADLE_SNIPPET;
    }
    return cfg;
  });

module.exports = withDisableVerifyReleaseResources;
