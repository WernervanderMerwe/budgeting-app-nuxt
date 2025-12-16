import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@nuxtjs/supabase',
  ],

  css: [],

  typescript: {
    strict: true,
    typeCheck: false,
  },

  nitro: {
    preset: 'cloudflare_module',
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
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: ['/transaction/*', '/yearly/*'],
      exclude: ['/'],
    },
    cookieOptions: {
      maxAge: 60 * 60 * 8, // 8 hours
      sameSite: 'lax',
      secure: false, // Set to true in production with HTTPS
    },
  },

  runtimeConfig: {
    public: {
      // Client-side config
      appName: 'Basic Budget App',
    },
  },

  compatibilityDate: '2025-01-15',
})