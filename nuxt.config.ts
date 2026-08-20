// https://nuxt.com/docs/api/configuration/nuxt-config
import pkg from './package.json'

export default defineNuxtConfig({
  srcDir: 'app/',
  serverDir: 'server/',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
  ],

  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
    typeCheck: false,
  },

  nitro: {
    preset: 'node_server',
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
    // Receipt scanning. Tunable per tier without a rebuild — see docs/dev-workflow.md
    receiptMaxDimension: 1200,   // NUXT_RECEIPT_MAX_DIMENSION — longest edge before OCR
    receiptMaxSizeMb: 15,        // NUXT_RECEIPT_MAX_SIZE_MB  — upload cap
    receiptIdleMs: 120_000,      // NUXT_RECEIPT_IDLE_MS      — keep OCR session warm between scans
    receiptLockTimeoutMs: 30_000, // NUXT_RECEIPT_LOCK_TIMEOUT_MS — max wait for the scan mutex
    receiptModelDir: '',         // NUXT_RECEIPT_MODEL_DIR — local model dir; empty = download at runtime

    public: {
      // Client-side config
      appName: 'Basic Budget App',
      nodeEnv: process.env.NODE_ENV || 'development',
      // Baked at build time, so the running container reports the version it
      // was actually built from — matches ecommerce-template / online-tutoring-app.
      appVersion: pkg.version,
    },
  },

  compatibilityDate: '2025-01-15',
})