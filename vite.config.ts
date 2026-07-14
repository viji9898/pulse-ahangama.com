import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isNetlifyDev = process.env.NETLIFY_DEV === "true";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: isNetlifyDev ? { hmr: false } : undefined,
});
