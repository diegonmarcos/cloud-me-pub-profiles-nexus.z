// Smoke test (#1919): the page loads, has no console errors and renders content (header, hero, navigation works).
// Usage: node tests/smoke.mjs <base-url>   (e.g. http://127.0.0.1:8080/ or https://diegonmarcos.github.io/nexus/)
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8080/';
const IGNORE = /analytics\.diegonmarcos\.com|cdn\.tailwindcss|fonts\.(googleapis|gstatic)|images\.unsplash\.com|net::ERR_(NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|FAILED)/;
const fails = [];
const fail = (m) => { fails.push(m); console.error('FAIL', m); };

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 })).newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' && !IGNORE.test(m.text() + (m.location().url || ''))) errs.push('console: ' + m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('response', (r) => { if (r.status() >= 400 && !IGNORE.test(r.url())) errs.push('http ' + r.status() + ' ' + r.url()); });

await page.goto(base, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(2000);
const len = await page.evaluate(() => document.body.innerText.trim().length);
if (len < 300) fail('page is blank: only ' + len + ' characters of visible text');
if (await page.locator('#main-header').count() !== 1) fail('#main-header missing');
if (await page.locator('.page.active').count() < 1) fail('no active .page section');
const btn = page.locator('.path-card').first();
if (await btn.count()) {
  await btn.click();
  await page.waitForTimeout(500);
  const hash = await page.evaluate(() => location.hash);
  if (!hash || hash === '#landing') fail('clicking a path card did not navigate (hash=' + hash + ')');
}
for (const e of errs) fail(e);
await browser.close();
if (fails.length) { console.error(fails.length + ' smoke failure(s)'); process.exit(1); }
console.log('smoke OK: loads, no console errors, content rendered, navigation works');
