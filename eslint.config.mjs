// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Keep closing bracket on same line as last attribute (not on new line)
    'vue/html-closing-bracket-newline': ['error', {
      singleline: 'never',
      multiline: 'never',
      selfClosingTag: {
        singleline: 'never',
        multiline: 'never'
      }
    }]
  }
})
