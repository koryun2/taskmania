/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Where the API lives. Unset in development so requests go to /api and the
   * Vite proxy forwards them; set at build time for a deployed frontend.
   */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
