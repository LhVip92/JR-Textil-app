/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      injectRegister: null,
      strategies: 'generateSW',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['icons/*'],

      manifest: {
        id: '/',
        scope: '/',
        name: 'JR Têxtil Fortaleza',
        short_name: 'JR Têxtil',
        description: 'Catálogo atacadista JR Têxtil Fortaleza',
        theme_color: '#0a0a0a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/',
        categories: ['shopping', 'business'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },

      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/admin/],
        globPatterns: []
      },

      devOptions: { enabled: false }
    })
  ],

  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { globals: true, environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] }
} as any);