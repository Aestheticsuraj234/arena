import type {LanguageRunner} from './language-runner';
import {
  CppRunner,
  CRunner,
  JavaRunner,
  JavaScriptRunner,
  PythonRunner,
  TypeScriptRunner,
} from './runners';

export class UnsupportedLanguageError extends Error {
  constructor(readonly languageId: number) {
    super(`Language ${languageId} is not supported`);
    this.name = 'UnsupportedLanguageError';
  }
}

/** Looks up a `LanguageRunner` by Judge0 language ID. */
export class LanguageRegistry {
  private readonly runners = new Map<number, LanguageRunner>();

  register(runner: LanguageRunner): this {
    if (this.runners.has(runner.languageId)) {
      throw new Error(`Language ${runner.languageId} is already registered`);
    }
    this.runners.set(runner.languageId, runner);
    return this;
  }

  has(languageId: number): boolean {
    return this.runners.has(languageId);
  }

  get(languageId: number): LanguageRunner {
    const runner = this.runners.get(languageId);
    if (!runner) throw new UnsupportedLanguageError(languageId);
    return runner;
  }

  list(): LanguageRunner[] {
    return [...this.runners.values()].sort((a, b) => a.languageId - b.languageId);
  }

  /** Every distinct image, for pre-pulling or building. */
  images(): string[] {
    return [...new Set(this.list().map((r) => r.image))].sort();
  }
}

/** The registry with every language Arena ships with. */
export function createDefaultRegistry(): LanguageRegistry {
  return new LanguageRegistry()
    .register(new CRunner())
    .register(new CppRunner())
    .register(new JavaRunner())
    .register(new JavaScriptRunner())
    .register(new PythonRunner())
    .register(new TypeScriptRunner());
}
