module.exports = {
  env: { node: true, es2022: true },
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['unused-imports'],
  rules: {
    'no-console': 'error',
    'unused-imports/no-unused-imports': 'error'
  }
}
