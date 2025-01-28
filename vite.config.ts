import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://largeinfra.com", // Your backend server
        changeOrigin: true, // Change the origin of the request to the target URL
        rewrite: (path) => path.replace(/^\/api/, ""), // Remove the `/api` prefix
        secure: false, // Bypass SSL/TLS certificate validation (for testing only)
      },
    },
  },
});