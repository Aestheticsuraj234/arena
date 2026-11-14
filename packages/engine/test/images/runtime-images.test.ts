/**
 * Runs each language's hello program inside its runtime image with plain
 * `docker run`, using the same sandbox flags the executor uses. Needs Docker
 * and the images (`./scripts/build-images.sh`). Run with `pnpm test:images`.
 */
import {spawnSync} from 'node:child_process';

import {describe, expect, it} from 'vitest';

import {createDefaultRegistry, type LanguageRunner} from '../../src';
import {HELLO} from '../fixtures/programs';

const q = (argv: readonly string[]) => argv.map((a) => `'${a}'`).join(' ');

function runInImage(runner: LanguageRunner, source: string, stdin: string) {
  const compile = runner.compileCommand();
  // Source arrives base64-encoded in an env var; stdin of the program is a file.
  const script = [
    `printf %s "$SRC" | base64 -d > ${runner.sourceFile}`,
    `printf %s "$IN" > /tmp/stdin`,
    compile ? `${q(compile)} || exit 90` : 'true',
    `/usr/bin/time -f 'ARENA_META %e %M' ${q(runner.runCommand())} < /tmp/stdin`,
  ].join(' && ');
  return spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '--network=none',
      '--read-only',
      '--tmpfs=/box:rw,exec,size=64m,mode=1777',
      '--tmpfs=/tmp:rw,exec,size=64m,mode=1777',
      '--user=65534:65534',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '--memory=512m',
      '--pids-limit=128',
      '-e',
      `SRC=${Buffer.from(source).toString('base64')}`,
      '-e',
      `IN=${stdin}`,
      '-e',
      'HOME=/tmp',
      runner.image,
      'sh',
      '-c',
      script,
    ],
    {encoding: 'utf8', timeout: 60_000},
  );
}

describe('runtime images', () => {
  for (const runner of createDefaultRegistry().list()) {
    it(`${runner.slug}: compiles and runs hello in ${runner.image}`, () => {
      const source = HELLO[runner.slug];
      if (!source) throw new Error(`No hello program for ${runner.slug}`);
      const res = runInImage(runner, source, 'Arena\n');
      expect(res.stderr, res.stderr).toMatch(/ARENA_META [\d.]+ \d+/);
      expect(res.stdout).toBe('Hello, Arena!\n');
      expect(res.status).toBe(0);
    });
  }
});
