import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500, // raise limit to avoid noisy warnings
    rollupOptions: {
      output: {
        // Vite 8 / Rolldown requires a function (object form is invalid)
        manualChunks(id) {
          if (id.includes("node_modules/html2canvas")) return "html2canvas";
          if (id.includes("node_modules/jspdf")) return "jspdf";
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/@tanstack/react-query")
          ) {
            return "vendor";
          }
        },
      },
    },
  },
}));
