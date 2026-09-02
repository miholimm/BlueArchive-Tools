import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const resourceApiOrigin = env.RESOURCE_API_ORIGIN || "https://api.bluearchive.help";

  return {
    plugins: [react()],
    server: {
      port: 5186,
      proxy: {
        "/resource-api": {
          target: resourceApiOrigin,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/resource-api/, ""),
        },
      },
    },
  };
});
