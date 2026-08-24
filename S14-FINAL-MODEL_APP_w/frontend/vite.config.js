import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/driver/",
  build: {
    outDir: "dist-driver",
    emptyOutDir: true,
    rollupOptions: {
      input: "driver.index.html",
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        navigateFallback: "/driver/driver.index.html",
      },
      manifest: {
        name: "RuralLink",
        short_name: "Driver",
        start_url: "/driver/",
        scope: "/driver/",
        display: "standalone",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          {
            src: "/driver/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/driver/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});