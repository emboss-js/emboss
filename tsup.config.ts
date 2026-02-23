import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'extensions/free/index': 'src/extensions/free/index.ts',
    'extensions/paid/organize/index': 'src/extensions/paid/organize/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
})
