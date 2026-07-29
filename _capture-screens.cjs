/* Local one-off: screenshot every app screen and build a self-contained gallery.
   Not committed. Run while the dev server is up on http://localhost:3000. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, 'app-screens');
const IMG = path.join(OUT, 'img');

const GROUPS = [
  ['Entry', [
    ['/', 'home', 'Hero + CTA'],
    ['/flow', 'flow', 'Quiz — your lines'],
  ]],
  ['The aha (new user)', [
    ['/onboarding/preview', 'onboarding-preview', 'Free real read + journey'],
  ]],
  ['Pay', [
    ['/paywall', 'paywall', 'OTP + checkout, $9.49 one-time'],
    ['/subscribe', 'subscribe', 'Post-checkout / re-unlock'],
  ]],
  ['Core', [
    ['/decision', 'decision', 'Listings, scored + filtered'],
    ['/exit', 'exit', 'Wait thoughtfully'],
  ]],
  ['Return', [
    ['/signin', 'signin', 'OTP sign-in for members'],
  ]],
  ['Affiliate / partners', [
    ['/storage', 'storage', 'Storage partners'],
    ['/low-credit', 'low-credit', 'Guarantor partners'],
  ]],
  ['Content', [
    ['/blog', 'blog', 'Post index'],
  ]],
  ['Orphan onboarding (cleanup candidates)', [
    ['/onboarding/source', 'onboarding-source', 'orphan'],
    ['/onboarding/tradeoffs', 'onboarding-tradeoffs', 'orphan'],
    ['/onboarding/pricing', 'onboarding-pricing', 'orphan'],
  ]],
  ['System', [
    ['/not-found', 'not-found', 'Branded 404'],
  ]],
];

(async () => {
  fs.mkdirSync(IMG, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 400, height: 850 }, deviceScaleFactor: 2 });

  // Seed a paid + quiz-complete state BEFORE any app code runs, on every page.
  await context.addInitScript(() => {
    try {
      localStorage.setItem('steady_dev_mock', 'active');
      localStorage.setItem('heed_answers_v2', JSON.stringify({
        boroughs: ['Brooklyn'], budget: 2800, bedrooms: '1', pets: 'cats',
        bathrooms: '1', amenities: [], timing: 'researching',
        housingType: 'whole', upfrontCash: '5-10k', qualification: 'income40x',
      }));
    } catch (e) {}
  });

  const results = [];
  for (const [title, screens] of GROUPS) {
    const captured = [];
    for (const [route, slug, desc] of screens) {
      const page = await context.newPage();
      let finalUrl = route;
      try {
        await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(route.includes('decision') ? 4000 : 2200);
        finalUrl = new URL(page.url()).pathname;
        await page.screenshot({ path: path.join(IMG, slug + '.png'), fullPage: true });
        console.log('OK   ' + route + (finalUrl !== route ? '  -> ' + finalUrl : ''));
      } catch (e) {
        console.log('FAIL ' + route + '  ' + e.message);
      }
      captured.push({ route, slug, desc, finalUrl });
      await page.close();
    }
    results.push({ title, captured });
  }

  await browser.close();

  // Build the self-contained gallery (images referenced from ./img).
  const card = (s) => `
    <div class="screen">
      <div class="cap"><span class="route">${s.route}</span><span class="desc">${s.desc}</span></div>
      ${s.finalUrl !== s.route ? `<div class="redir">redirects to <b>${s.finalUrl}</b></div>` : ''}
      <div class="frame"><img src="img/${s.slug}.png" alt="${s.route}" loading="lazy"></div>
    </div>`;
  const section = (g) => `<div class="group">${g.title}</div><div class="grid">${g.captured.map(card).join('')}</div>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Steady One — all screens</title>
<style>
:root{--navy:#0A2540;--green:#00A651;--line:rgba(255,255,255,.14)}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0c1a26;color:#fff;font-family:Inter,system-ui,sans-serif;padding:24px 18px 70px}
h1{font-size:21px;font-weight:700;margin-bottom:6px}
.lead{color:rgba(255,255,255,.5);font-size:13px;max-width:75ch;line-height:1.5;margin-bottom:6px}
.group{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.42);font-weight:700;margin:30px 0 14px;border-bottom:1px solid var(--line);padding-bottom:8px}
.grid{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start}
.screen{width:300px;display:flex;flex-direction:column}
.cap{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 11px;background:rgba(255,255,255,.05);border:1px solid var(--line);border-bottom:none;border-radius:12px 12px 0 0}
.route{font-size:13px;font-weight:600;font-family:ui-monospace,monospace}
.desc{font-size:11px;color:rgba(255,255,255,.45);text-align:right}
.redir{font-size:10.5px;color:#C8814B;background:rgba(200,129,75,.1);border:1px solid var(--line);border-top:none;border-bottom:none;padding:4px 11px}
.redir b{color:#fff}
.frame{border:1px solid var(--line);border-top:none;border-radius:0 0 12px 12px;overflow:hidden;background:var(--navy);max-height:620px;overflow-y:auto}
.frame img{width:100%;display:block}
</style></head><body>
<h1>The Steady One — all screens</h1>
<p class="lead">Every page in the app, captured live from the local dev server with a paid + sample-search state. Self-contained: this folder opens offline, no server needed.</p>
${results.map(section).join('')}
</body></html>`;
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  console.log('\nGallery written to ' + path.join(OUT, 'index.html'));
})();
