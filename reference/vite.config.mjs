import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";
import { exportTranslations } from "./vite-plugins/export-translations.js";

export default defineConfig({
  resolve: {
    alias: {
        '@/*': './resources/js/*',
        '@translations': './resources/js/translations/index.ts',
    },
  },
  plugins: [
    exportTranslations(),
    laravel({
      input: [
        'resources/js/app.js',
        'resources/css/app.css',
      ],
      refresh: true,
    }),
    react(),
  ],
});
