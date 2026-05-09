import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");

  return {
    plugins: [react(), tailwindcss()],
    envDir: ".",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@assets": path.resolve(__dirname, "./attached_assets"),
      },
    },
    build: {
      target: "esnext",
      minify: "esbuild",
      cssMinify: true,
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "wouter"],
            "vendor-ui": ["lucide-react", "@radix-ui/react-slot", "class-variance-authority", "clsx", "tailwind-merge"],
            "vendor-charts": ["recharts"],
            "vendor-query": ["@tanstack/react-query"],
          },
        },
      },
    },
    server: {
      port: 8081,
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://127.0.0.1:8080",
          changeOrigin: true,
        },
      },
    },
  };
});
