/**
 * Strategy for one language: which image to use, where the source goes, and
 * how to compile and run it. The executor (Chapter 4) only talks to this
 * interface, so adding a language means adding one class.
 */
export interface LanguageRunner {
  /** Judge0 language ID (also the primary key in `languages`). */
  readonly languageId: number;
  readonly slug: string;
  readonly displayName: string;
  /** Docker image without registry, e.g. `arena-runtime-python:1`. */
  readonly image: string;
  /** File name inside the sandbox working directory (`/box`). */
  readonly sourceFile: string;
  /** Extra memory the runtime itself needs on top of the user's limit. */
  readonly memoryOverheadKb: number;
  /** Argv to compile, or `null` for interpreted languages. */
  compileCommand(): readonly string[] | null;
  /** Argv to run the program. stdin is attached by the executor. */
  runCommand(): readonly string[];
}

/** Image tag shared by every runtime. Bump when a Dockerfile changes. */
export const RUNTIME_TAG = '1';

export function runtimeImage(runtime: 'gcc' | 'java' | 'node' | 'python'): string {
  return `arena-runtime-${runtime}:${RUNTIME_TAG}`;
}

/** Base for languages that run their source file directly. */
export abstract class InterpretedRunner implements LanguageRunner {
  abstract readonly languageId: number;
  abstract readonly slug: string;
  abstract readonly displayName: string;
  abstract readonly image: string;
  abstract readonly sourceFile: string;
  readonly memoryOverheadKb: number = 0;

  compileCommand(): readonly string[] | null {
    return null;
  }

  abstract runCommand(): readonly string[];
}

/** Base for languages with a separate compile step. */
export abstract class CompiledRunner implements LanguageRunner {
  abstract readonly languageId: number;
  abstract readonly slug: string;
  abstract readonly displayName: string;
  abstract readonly image: string;
  abstract readonly sourceFile: string;
  readonly memoryOverheadKb: number = 0;

  abstract compileCommand(): readonly string[];
  abstract runCommand(): readonly string[];
}
