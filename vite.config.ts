import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { scanSources, type SourceFile } from "./src/lib/bloomScan";

// API_PORT lets a second dev server pair with an API on another port.
const api = `http://localhost:${process.env.API_PORT ?? 8080}`;

const BLOOM_SCAN = "virtual:bloom-scan";

/** Serves the Bloom compliance scan of `src/` (see src/lib/bloomScan.ts) as `virtual:bloom-scan`. */
function bloomScanPlugin(): Plugin {
  const resolved = `\0${BLOOM_SCAN}`;
  const readSources = (): SourceFile[] => {
    const out: SourceFile[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name)) out.push({ path: path.relative(__dirname, full).split(path.sep).join("/"), text: fs.readFileSync(full, "utf8") });
      }
    };
    walk(path.resolve(__dirname, "src"));
    return out;
  };
  return {
    name: "bloom-scan",
    resolveId: (id) => (id === BLOOM_SCAN ? resolved : undefined),
    load: (id) => (id === resolved ? `export default ${JSON.stringify(scanSources(readSources()))};` : undefined),
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(path.resolve(__dirname, "src")) || !/\.tsx?$/.test(file)) return;
      const mod = server.moduleGraph.getModuleById(resolved);
      if (mod) server.moduleGraph.invalidateModule(mod);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    // The preview tools pass a free port in PORT when 5173 is taken.
    port: Number(process.env.PORT) || 5173,
    hmr: {
      overlay: false,
    },
    // The Node server (npm run server) serves the API and Google sign-in.
    proxy: {
      "/api": api,
      "/auth/google": api,
    },
  },
  plugins: [react(), bloomScanPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
