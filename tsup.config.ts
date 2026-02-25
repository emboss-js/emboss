import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'extensions/free/index': 'src/extensions/free/index.ts',
    'extensions/paid/organize/index': 'src/extensions/paid/organize/index.ts',
    'extensions/paid/columns/index': 'src/extensions/paid/columns/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
})
