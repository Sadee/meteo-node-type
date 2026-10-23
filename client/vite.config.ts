import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Set in Docker, where the site is served through caddy-proxy over HTTPS.
const publicHost = process.env.PUBLIC_HOST;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: publicHost ? [publicHost] : [],
    // Behind Caddy the browser connects on 443, so HMR must use wss on that port.
    hmr: publicHost ? { host: publicHost, protocol: "wss", clientPort: 443 } : undefined,
    // Inside Docker the API is reachable as "server"; outside Docker it is localhost.
    proxy: {
      "/api": process.env.API_PROXY_TARGET ?? "http://localhost:3000",
    },
  },
});
