import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  splitting: false,
  noExternal: [/^@arena\//],
  esbuildPlugins: [
    {
      // Workspace packages ship TypeScript source, so bundle them in. Every
      // other bare import stays external and loads from node_modules, so
      // CommonJS packages such as `pg` keep working.
      name: 'external-node-modules',
      setup(build) {
        build.onResolve({filter: /^[^./]/}, (args) =>
          args.path.startsWith('@arena/') ? undefined : {path: args.path, external: true},
        );
      },
    },
  ],
});
