// resources/js/vite-plugin.ts
import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { resolve, join } from "path";
var VIRTUAL_MODULE_ID = "virtual:laravel-translations";
var RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
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
function emitTranslationChanges(server, outputPath) {
  if (!existsSync(outputPath)) {
    return;
  }
  const files = readdirSync(outputPath).filter((file) => file.endsWith(".json"));
  for (const file of files) {
    server.watcher.emit("change", join(outputPath, file));
  }
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
  let config;
  return {
    name: "laravel-js-translations",
    enforce: "pre",
    configResolved(resolvedConfig) {
      root = resolvedConfig.root;
      config = resolvedConfig;
    },
    /**
     * Resolve the virtual module ID.
     */
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
    },
    /**
     * Load the virtual module with auto-initialization.
     */
    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        const outputPathFromRoot = "/" + options.outputPath;
        const packageEntry = "/vendor/ethanbarlo/laravel-js-translations/dist/index.js";
        return `
// Auto-generated virtual module for Laravel JS Translations
import defaultTranslations from '${outputPathFromRoot}/${options.defaultLocale}.json';
import { initTranslations } from '${packageEntry}';

// Auto-initialize with default translations
initTranslations(defaultTranslations, '${options.defaultLocale}');

// Re-export everything from the main module
export * from '${packageEntry}';
`;
      }
    },
    /**
     * Transform manager.ts to use the configured output path.
     */
    transform(code, id) {
      const defaultPath = "/resources/js/translations/generated";
      const configuredPath = "/" + options.outputPath;
      const isTranslationsModule = id.includes("laravel-js-translations") || id.includes("/vendor/ethanbarlo/laravel-js-translations/") || id.includes("/resources/js/manager.");
      if (isTranslationsModule && code.includes(defaultPath) && defaultPath !== configuredPath) {
        return code.replace(new RegExp(escapeRegExp(defaultPath), "g"), configuredPath);
      }
      return null;
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
            emitTranslationChanges(server, outputPath);
          }, 300);
          server.watcher.add(langPath);
          server.watcher.on("change", (filePath) => {
            if (filePath.startsWith(langPath) && (filePath.endsWith(".php") || filePath.endsWith(".json"))) {
              debouncedExport();
            }
          });
          server.watcher.on("add", (filePath) => {
            if (filePath.startsWith(langPath) && (filePath.endsWith(".php") || filePath.endsWith(".json"))) {
              debouncedExport();
            }
          });
          server.watcher.on("unlink", (filePath) => {
            if (filePath.startsWith(langPath) && (filePath.endsWith(".php") || filePath.endsWith(".json"))) {
              debouncedExport();
            }
          });
        }
      }
    },
    /**
     * Export translations before production build.
     */
    buildStart() {
      exportTranslations(options, root);
    }
  };
}
var vite_plugin_default = laravelTranslations;
export {
  vite_plugin_default as default,
  laravelTranslations
};
