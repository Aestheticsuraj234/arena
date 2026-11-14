import {chromium} from 'playwright';
const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const API = process.env.API_URL ?? 'http://localhost:4000';

const out = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1280, height: 800}});
const log = (m) => console.log('✓', m);
const email = `suraj-${Date.now()}@test.dev`;

await page.goto(WEB + '/dashboard');
if (!page.url().endsWith('/sign-in')) throw new Error('not redirected to sign-in');
log('signed-out /dashboard redirects to /sign-in');
await page.screenshot({path: `${out}/01-sign-in.png`});

await page.goto(WEB + '/sign-up');
await page.click('button[type=submit]');
await page.waitForSelector('#name-error');
log('empty sign-up shows field errors');
await page.screenshot({path: `${out}/02-sign-up-errors.png`});

await page.fill('#name', 'Suraj');
await page.fill('#email', ` ${email.toUpperCase()} `);
await page.fill('#password', 'password123');
await page.click('button[type=submit]');
await page.waitForURL('**/dashboard');
await page.waitForSelector('text=Welcome, Suraj');
log('sign-up lands on dashboard with name');
await page.screenshot({path: `${out}/03-dashboard.png`});

await page.click('text=Sign out');
await page.waitForURL('**/sign-in');
log('sign-out returns to /sign-in');

await page.fill('#email', email);
await page.fill('#password', 'wrong-password');
await page.click('button[type=submit]');
await page.waitForSelector('form p[role=alert]');
log(`wrong password shows: "${await page.textContent('form p[role=alert]')}"`);

await page.fill('#password', 'password123');
await page.click('button[type=submit]');
await page.waitForURL('**/dashboard');
await page.waitForSelector('text=Welcome, Suraj');
log('sign-in with lowercase email works');

await page.goto(WEB + '/sign-in');
if (!page.url().endsWith('/dashboard')) throw new Error('signed-in user saw sign-in');
log('signed-in /sign-in redirects to /dashboard');

await browser.close();
