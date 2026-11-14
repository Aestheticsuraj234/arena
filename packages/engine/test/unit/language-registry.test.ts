import {describe, expect, it} from 'vitest';

import {
  createDefaultRegistry,
  LanguageRegistry,
  PythonRunner,
  UnsupportedLanguageError,
} from '../../src';

describe('LanguageRegistry', () => {
  const registry = createDefaultRegistry();

  it('registers the six Judge0 language IDs', () => {
    expect(registry.list().map((r) => r.languageId)).toEqual([50, 54, 62, 63, 71, 74]);
  });

  it('needs only four images', () => {
    expect(registry.images()).toEqual([
      'arena-runtime-gcc:1',
      'arena-runtime-java:1',
      'arena-runtime-node:1',
      'arena-runtime-python:1',
    ]);
  });

  it('throws a typed error for unknown languages', () => {
    expect(() => registry.get(999)).toThrow(UnsupportedLanguageError);
    expect(registry.has(999)).toBe(false);
  });

  it('rejects duplicate registrations', () => {
    const r = new LanguageRegistry().register(new PythonRunner());
    expect(() => r.register(new PythonRunner())).toThrow(/already registered/);
  });

  it('only compiled languages have a compile command', () => {
    const compiled = registry
      .list()
      .filter((r) => r.compileCommand() !== null)
      .map((r) => r.slug);
    expect(compiled).toEqual(['c', 'cpp', 'java', 'typescript']);
  });

  it('every command names its source file or build output', () => {
    for (const runner of registry.list()) {
      const all = [...(runner.compileCommand() ?? []), ...runner.runCommand()].join(' ');
      expect(all, runner.slug).toMatch(new RegExp(runner.sourceFile.replace('.', '\\.')));
    }
  });
});
