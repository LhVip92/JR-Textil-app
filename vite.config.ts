/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // Atualiza o service worker automaticamente quando há nova versão
      registerType: 'autoUpdate',

      // Pré-cacheia os ícones PWA
      includeAssets: ['icons/*'],

      // ============================================================
      // MANIFEST — PWA instalável
      // ============================================================
      manifest: {
        // ID único e estável do app (obrigatório desde Chrome 90+)
        id: '/',

        // Escopo de navegação (quais rotas ficam dentro do "app")
        scope: '/',

        name: 'JR Têxtil Fortaleza',
        short_name: 'JR Têxtil',
        description: 'Catálogo atacadista JR Têxtil Fortaleza',

        // Cores da marca
        theme_color: '#0a0a0a',
        background_color: '#ffffff',

        // Como o app aparece quando instalado
        display: 'standalone',
        orientation: 'portrait',
        lang: 'pt-BR',
        dir: 'ltr',

        start_url: '/',
        categories: ['shopping', 'business'],

        // ============================================================
        // ÍCONES — cada purpose é um tipo de uso
        //   any       → ícone normal (telas Android/iOS)
        //   maskable  → Android recorta em círculo/quadrado/redondo
        // ============================================================
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },

      // ============================================================
      // WORKBOX — service worker
      // ============================================================
      workbox: {
        // Limpa caches de versões antigas automaticamente
        cleanupOutdatedCaches: true,

        // Não intercepta /admin (área logada — sempre buscar da rede)
        navigateFallbackDenylist: [/^\/admin/],

        // Pré-cacheia arquivos estáticos comuns
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],

        // Estratégias de cache em runtime
        runtimeCaching: [
          // 1) Imagens locais (do próprio site)
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'jr-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
              }
            }
          },

          // 2) Imagens do Supabase Storage (fotos de produtos)
          {
            urlPattern: /^https:\/\/gzzjkiobdtaxhoenjllc\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'jr-supabase-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 60 // 60 dias
              }
            }
          }
        ]
      }
    })
  ],

  // ============================================================
  // ALIAS — @/ aponta para src/
  // ============================================================
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },

  // ============================================================
  // VITEST — configuração de testes
  // ============================================================
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
} as any);