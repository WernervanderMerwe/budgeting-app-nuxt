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
    public: {
      // Client-side config
      appName: 'Basic Budget App',
      nodeEnv: process.env.NODE_ENV || 'development',
    },
  },

  compatibilityDate: '2025-01-15',
})