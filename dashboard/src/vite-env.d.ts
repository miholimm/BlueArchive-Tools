interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly VITE_RESOURCE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
