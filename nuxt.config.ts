import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  srcDir: 'app/',
  serverDir: 'server/',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
  ],

  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
    typeCheck: false,
  },

  nitro: {
    preset: 'cloudflare_pages',
    // Enable WASM support for Prisma driver adapters
    experimental: {
      wasm: true,
    },
    // Externalize cloudflare sockets for pg driver
    rollupConfig: {
      external: ['cloudflare:sockets'],
    },
    // Mock optional deps that aren't used at runtime but break edge bundling:
    // - pg-native: optional native binding for pg
    // - @react-email/render: only used by the Resend SDK when sending React
    //   email components; we send HTML strings, so this path is never executed.
    alias: {
      'pg-native': './node_modules/unenv/dist/runtime/mock/empty.mjs',
      '@react-email/render': './node_modules/unenv/dist/runtime/mock/empty.mjs',
    },
    // Disable prerendering - dynamic routes require runtime
    prerender: {
      crawlLinks: false,
    },
  },

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      ],
    },
  },

  colorMode: {
    classSuffix: '', // Remove '-mode' suffix
  },

  runtimeConfig: {
    public: {
      // Client-side config
      appName: 'Basic Budget App',
      nodeEnv: process.env.NODE_ENV || 'development',
    },
  },

  compatibilityDate: '2025-01-15',
})