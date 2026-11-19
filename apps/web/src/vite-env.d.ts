/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_DEMO_TOKEN?: string;
  readonly VITE_EXPLORER_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
