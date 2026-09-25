import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// API_PORT lets a second dev server pair with an API on another port.
const api = `http://localhost:${process.env.API_PORT ?? 8080}`;

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
    // The Node server (npm run server) serves the API and Google sign-in.
    proxy: {
      "/api": api,
      "/auth/google": api,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
