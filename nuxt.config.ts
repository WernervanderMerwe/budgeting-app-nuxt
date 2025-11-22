// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
  ],

  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
    typeCheck: true,
  },

  app: {
    head: {
      title: 'Basic Budget App',
      meta: [
        { name: 'description', content: 'A simple budgeting application' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
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
