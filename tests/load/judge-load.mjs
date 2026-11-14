#!/usr/bin/env node
/**
 * End-to-end load test through the Judge0 API: every request is a real
 * submission that is queued, judged in a sandbox and returned (`wait=true`).
 *
 *   API_URL=http://localhost:4000 ARENA_KEY=arena_… node tests/load/judge-load.mjs
 *
 * Options (env): TOTAL (default 200), CONCURRENCY (20), MIX (python,cpp,java,javascript).
 * Prints throughput, latency percentiles and verdict counts; exits 1 if any
 * request failed or any verdict was unexpected.
 */
const API = process.env.API_URL ?? 'http://localhost:4000';
const KEY = process.env.ARENA_KEY;
const TOTAL = Number(process.env.TOTAL ?? 200);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 20);
const MIX = (process.env.MIX ?? 'python,cpp,java,javascript').split(',');

if (!KEY) {
  console.error('Set ARENA_KEY to an API key (create one under Settings → API keys).');
  process.exit(2);
}

/** Sum of two numbers in each language; stdin "a b", expected a+b. */
const PROGRAMS = {
  python: {language_id: 71, source_code: 'a, b = map(int, input().split())\nprint(a + b)\n'},
  javascript: {
    language_id: 63,
    source_code:
      "const [a, b] = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n",
  },
  cpp: {
    language_id: 54,
    source_code:
      '#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}\n',
  },
  java: {
    language_id: 62,
    source_code:
      'import java.util.*;\npublic class Main{public static void main(String[] x){Scanner s=new Scanner(System.in);System.out.println(s.nextLong()+s.nextLong());}}\n',
  },
};

const latencies = [];
const verdicts = {};
const perLanguage = {};
let failures = 0;
let next = 0;

async function one(i) {
  const lang = MIX[i % MIX.length];
  const a = Math.floor(Math.random() * 1e6);
  const b = Math.floor(Math.random() * 1e6);
  const started = performance.now();
  try {
    const res = await fetch(`${API}/submissions?wait=true&fields=status,stdout`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Auth-Token': KEY},
      body: JSON.stringify({...PROGRAMS[lang], stdin: `${a} ${b}`, expected_output: `${a + b}`}),
    });
    const ms = performance.now() - started;
    if (!res.ok) {
      failures++;
      verdicts[`HTTP ${res.status}`] = (verdicts[`HTTP ${res.status}`] ?? 0) + 1;
      return;
    }
    const body = await res.json();
    const label = body.status?.description ?? 'unknown';
    verdicts[label] = (verdicts[label] ?? 0) + 1;
    latencies.push(ms);
    (perLanguage[lang] ??= []).push(ms);
  } catch (err) {
    failures++;
    verdicts[`error: ${err.message}`] = (verdicts[`error: ${err.message}`] ?? 0) + 1;
  }
}

async function worker() {
  while (next < TOTAL) await one(next++);
}

const pct = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
const fmt = (ms) => `${(ms / 1000).toFixed(2)} s`;

console.log(
  `Load test: ${TOTAL} submissions, concurrency ${CONCURRENCY}, mix ${MIX.join('/')}, ${API}`,
);
const t0 = performance.now();
await Promise.all(Array.from({length: CONCURRENCY}, worker));
const seconds = (performance.now() - t0) / 1000;

const sorted = [...latencies].sort((x, y) => x - y);
console.log(`\nDone in ${seconds.toFixed(1)} s: ${(TOTAL / seconds).toFixed(2)} submissions/s`);
if (sorted.length) {
  console.log(
    `Latency  p50 ${fmt(pct(sorted, 50))}  p95 ${fmt(pct(sorted, 95))}  max ${fmt(sorted.at(-1))}`,
  );
}
for (const [lang, values] of Object.entries(perLanguage)) {
  const s = values.sort((x, y) => x - y);
  console.log(
    `  ${lang.padEnd(11)} p50 ${fmt(pct(s, 50))}  p95 ${fmt(pct(s, 95))}  (n=${s.length})`,
  );
}
console.log('Verdicts', verdicts);

const unexpected = Object.keys(verdicts).filter((v) => v !== 'Accepted');
if (failures > 0 || unexpected.length > 0) {
  console.error(
    `FAILED: ${failures} failed requests, unexpected verdicts: ${unexpected.join(', ') || 'none'}`,
  );
  process.exit(1);
}
console.log('PASSED: every submission accepted');
