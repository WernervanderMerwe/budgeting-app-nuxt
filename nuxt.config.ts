// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/color-mode', 
    '@nuxtjs/tailwindcss'
  ],

  css: [],

  typescript: {
    strict: true,
    typeCheck: false,
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
    // Server-side only config
    databaseUrl: 'file:./prisma/dev.db',

    public: {
      // Client-side config
      appName: 'Basic Budget App',
    },
  },

  compatibilityDate: '2025-01-15',
})