import {chromium} from 'playwright';
const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const API = process.env.API_URL ?? 'http://localhost:4000';

const out = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const badResponses = [];
page.on('response', async (r) => {
  if (r.status() < 400) return;
  const headers = await r.request().allHeaders();
  // Next 16 segment prefetches can 404 harmlessly; anything else is a bug.
  if (r.status() === 404 && headers['next-router-segment-prefetch']) return;
  badResponses.push(`${r.status()} ${r.url()}`);
});
const log = (m) => console.log('✓', m);
const shot = (name) => page.screenshot({path: `${out}/${name}.png`});
const setCode = (code) =>
  page.evaluate((c) => window.monaco.editor.getModels()[0].setValue(c), code);

// Sign up
await page.goto(WEB + '/sign-up');
await page.fill('#name', 'Suraj');
await page.fill('#email', `ui-${Date.now()}@test.dev`);
await page.fill('#password', 'password123');
await page.click('button[type=submit]');
await page.waitForURL('**/dashboard');
await shot('01-dashboard');
log('signed up, dashboard shown');

// Playground: Python starter runs
await page.click('text=Playground');
await page.waitForSelector('.monaco-editor', {timeout: 20000});
await page.waitForFunction(() =>
  window.monaco?.editor.getModels()[0]?.getValue().includes('input()'),
);
log('Monaco loaded from /monaco with the Python starter');
await page.click('button:has-text("Run")');
await page.waitForSelector('[data-status="accepted"]', {timeout: 30000});
const out1 = await page.textContent('[data-testid=result] pre');
if (out1.trim() !== 'Hello, Arena!') throw new Error(`unexpected stdout ${out1}`);
await shot('02-playground-python');
log('Python run → Accepted, "Hello, Arena!"');

// Switch to C++
await page.selectOption('select[aria-label=Language]', '54');
await page.waitForFunction(() =>
  window.monaco.editor.getModels()[0].getValue().includes('#include <iostream>'),
);
await page.click('button:has-text("Run")');
await page.waitForSelector('[data-status="accepted"]', {timeout: 30000});
log('C++ starter loaded and accepted');

// Compile error is shown
await setCode('int main( { return 0; }');
await page.keyboard.press('Escape');
await page.click('button:has-text("Run")');
await page.waitForSelector('[data-status="compilation_error"]', {timeout: 30000});
await shot('03-playground-compile-error');
log('C++ syntax error → Compilation error with compiler output');

// Problem: live judging
await page.click('nav >> text=Problems');
await page.waitForSelector('text=Sum of Two Numbers');
await shot('04-problems');
await page.click('text=Sum of Two Numbers');
await page.waitForSelector('.monaco-editor', {timeout: 20000});
await page.waitForFunction(() => window.monaco?.editor.getModels()[0]?.getValue().length > 0);
await setCode('a, b = map(int, input().split())\nprint(a - b if a < 0 else a + b)\n');
await page.click('button:has-text("Submit")');
await page.waitForSelector('[data-test-status="wrong_answer"]', {timeout: 30000});
await page.waitForSelector('text=Wrong answer on test 2', {timeout: 10000});
await shot('05-problem-wrong-answer');
log('wrong solution → "Wrong answer on test 2" with expected vs your output');

await setCode('a, b = map(int, input().split())\nprint(a + b)\n');
await page.click('button:has-text("Submit")');
await page.waitForSelector('text=Passed all 4 test cases', {timeout: 30000});
const passed = await page.locator('[data-test-status="accepted"]').count();
if (passed !== 4) throw new Error(`expected 4 passed tests, saw ${passed}`);
await shot('06-problem-accepted');
log('correct solution → Accepted, 4/4 tests ticked');

// Submissions history and detail
await page.click('nav >> text=Submissions');
await page.waitForSelector('tbody tr [data-status]');
const rows = await page.locator('tbody tr').count();
await shot('07-submissions');
log(`submissions list shows ${rows} rows`);
await page.locator('tbody tr a').first().click();
await page.waitForSelector('[data-testid=result]');
await shot('08-submission-detail');
log('submission detail opens');

// API keys
await page.click('nav >> text=API keys');
await page.fill('input[aria-label="Key name"]', 'cli');
await page.click('button:has-text("Create key")');
await page.waitForSelector('[data-testid=new-key] code');
const key = (await page.textContent('[data-testid=new-key] code')).trim();
await shot('09-api-keys');
const res = await fetch(API + '/submissions?wait=true', {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'X-Auth-Token': key},
  body: JSON.stringify({source_code: 'print(6*7)', language_id: 71}),
});
const body = await res.json();
if (body.stdout !== '42\n') throw new Error(`judge0 call failed: ${JSON.stringify(body)}`);
log('new key works against the Judge0 API (stdout 42)');
await page.click('button[aria-label="Revoke cli"]');
await page.waitForSelector('text=No keys yet.');
log('key revoked');

if (errors.length) throw new Error(`page errors:\n${errors.join('\n')}`);
// 401s from the revoke step's Judge0 call never happen in the page itself.
if (badResponses.length) throw new Error(`failed requests:\n${badResponses.join('\n')}`);
log('no page errors and no failed requests');
await browser.close();
