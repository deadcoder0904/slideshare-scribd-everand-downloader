import { defineConfig } from 'vite-plus'

export default defineConfig({
  lint: {
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ['slideshare-scribd-everand-downloader/**'],
  },
  fmt: {
    singleQuote: true,
    jsxSingleQuote: true,
    trailingComma: 'es5',
    semi: false,
    tabWidth: 2,
    printWidth: 100,
    ignorePatterns: [
      'node_modules/**',
      'dist/**',
      'output/**',
      '**/*.css',
      'bun.lock',
      'bun.lockb',
    ],
  },
})
