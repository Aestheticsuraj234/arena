import {CompiledRunner, InterpretedRunner, runtimeImage} from './language-runner';

export class CRunner extends CompiledRunner {
  readonly languageId = 50;
  readonly slug = 'c';
  readonly displayName = 'C (GCC 14)';
  readonly image = runtimeImage('gcc');
  readonly sourceFile = 'main.c';

  compileCommand() {
    return ['gcc', '-O2', '-std=c17', '-pipe', '-o', 'main', 'main.c', '-lm'] as const;
  }

  runCommand() {
    return ['./main'] as const;
  }
}

export class CppRunner extends CompiledRunner {
  readonly languageId = 54;
  readonly slug = 'cpp';
  readonly displayName = 'C++ (GCC 14)';
  readonly image = runtimeImage('gcc');
  readonly sourceFile = 'main.cpp';

  compileCommand() {
    return ['g++', '-O2', '-std=c++20', '-pipe', '-o', 'main', 'main.cpp'] as const;
  }

  runCommand() {
    return ['./main'] as const;
  }
}

export class JavaRunner extends CompiledRunner {
  readonly languageId = 62;
  readonly slug = 'java';
  readonly displayName = 'Java (OpenJDK 21)';
  readonly image = runtimeImage('java');
  /** The public class must be named `Main`, as on most judges. */
  readonly sourceFile = 'Main.java';
  /** The JVM's own metaspace, code cache and threads. */
  override readonly memoryOverheadKb = 131_072;

  compileCommand() {
    return ['javac', '-J-Xms32m', '-J-Xmx256m', '-encoding', 'UTF-8', 'Main.java'] as const;
  }

  runCommand() {
    return ['java', '-Xss64m', '-cp', '.', 'Main'] as const;
  }
}

export class JavaScriptRunner extends InterpretedRunner {
  readonly languageId = 63;
  readonly slug = 'javascript';
  readonly displayName = 'JavaScript (Node.js 22)';
  readonly image = runtimeImage('node');
  readonly sourceFile = 'main.js';
  override readonly memoryOverheadKb = 32_768;

  runCommand() {
    return ['node', 'main.js'] as const;
  }
}

export class TypeScriptRunner extends CompiledRunner {
  readonly languageId = 74;
  readonly slug = 'typescript';
  readonly displayName = 'TypeScript 5 (Node.js 22)';
  readonly image = runtimeImage('node');
  readonly sourceFile = 'main.ts';
  override readonly memoryOverheadKb = 32_768;

  /** Type errors fail the build, like any other compiler. */
  compileCommand() {
    return [
      'tsc',
      '--target',
      'ES2022',
      '--module',
      'commonjs',
      '--strict',
      '--skipLibCheck',
      '--noEmitOnError',
      '--typeRoots',
      '/usr/local/lib/node_modules/@types',
      '--types',
      'node',
      'main.ts',
    ] as const;
  }

  runCommand() {
    return ['node', 'main.js'] as const;
  }
}

export class PythonRunner extends InterpretedRunner {
  readonly languageId = 71;
  readonly slug = 'python';
  readonly displayName = 'Python 3.12';
  readonly image = runtimeImage('python');
  readonly sourceFile = 'main.py';

  runCommand() {
    return ['python3', 'main.py'] as const;
  }
}
