import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  splitting: false,
  // Workspace packages ship TypeScript source, so bundle them in.
  noExternal: [/^@arena\//],
});
