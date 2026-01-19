/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly MODE: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
    glob<T>(pattern: string, options?: { eager?: boolean }): Record<string, () => Promise<T>>;
}
