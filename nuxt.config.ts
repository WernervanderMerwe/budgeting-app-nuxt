import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@nuxt/content',
  ],

  css: [],

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
    // Mock pg-native which is optional but causes build errors in edge runtime
    alias: {
      'pg-native': './node_modules/unenv/dist/runtime/mock/empty.mjs',
    },
    // Disable prerendering - content API and dynamic routes require runtime
    prerender: {
      crawlLinks: false,
      ignore: ['/api/_content'],
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

  supabase: {
    // Don't set url/key here - they get baked as undefined at build time
    // Instead, use NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_KEY env vars at runtime
    types: '', // Disable Supabase types - using Prisma for DB access
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: ['/', '/transaction/*', '/yearly/*'],
      exclude: ['/guide', '/api/_content/*'],
    },
    cookieOptions: {
      maxAge: 60 * 60 * 8, // 8 hours
      sameSite: 'lax',
      secure: true,
    },
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