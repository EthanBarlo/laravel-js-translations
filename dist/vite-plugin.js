// resources/js/vite-plugin.ts
import { execSync } from "child_process";
import { existsSync, watch } from "fs";
import { resolve, join } from "path";
function exportTranslations(options, root) {
  const artisanPath = resolve(root, "artisan");
  if (!existsSync(artisanPath)) {
    console.warn("[js-translations] artisan file not found, skipping export");
    return;
  }
  try {
    const command = `${options.php} artisan translations:export --path="${options.outputPath}"`;
    execSync(command, {
      cwd: root,
      stdio: "inherit"
    });
  } catch (error) {
    console.error("[js-translations] Failed to export translations:", error);
  }
}
function debounce(fn, delay) {
  let timeoutId = null;
  return ((...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  });
}
function laravelTranslations(userOptions = {}) {
  const options = {
    langPath: userOptions.langPath ?? "lang",
    outputPath: userOptions.outputPath ?? "resources/js/translations/generated",
    defaultLocale: userOptions.defaultLocale ?? "en",
    php: userOptions.php ?? "php",
    watch: userOptions.watch ?? true
  };
  let root;
  let watcher = null;
  return {
    name: "laravel-js-translations",
    enforce: "pre",
    configResolved(config) {
      root = config.root;
    },
    /**
     * Export translations when the dev server starts.
     */
    configureServer(server) {
      exportTranslations(options, root);
      if (options.watch) {
        const langPath = resolve(root, options.langPath);
        if (existsSync(langPath)) {
          const debouncedExport = debounce(() => {
            console.log("[js-translations] Detected changes in lang directory, re-exporting...");
            exportTranslations(options, root);
            const outputPath = resolve(root, options.outputPath);
            server.watcher.emit("change", join(outputPath, `${options.defaultLocale}.json`));
          }, 300);
          watcher = watch(
            langPath,
            { recursive: true },
            (eventType, filename) => {
              if (filename && (filename.endsWith(".php") || filename.endsWith(".json"))) {
                debouncedExport();
              }
            }
          );
          server.httpServer?.on("close", () => {
            watcher?.close();
          });
        }
      }
    },
    /**
     * Export translations before production build.
     */
    buildStart() {
      exportTranslations(options, root);
    },
    /**
     * Clean up watcher on build end.
     */
    buildEnd() {
      watcher?.close();
      watcher = null;
    }
  };
}
var vite_plugin_default = laravelTranslations;
export {
  vite_plugin_default as default,
  laravelTranslations
};
