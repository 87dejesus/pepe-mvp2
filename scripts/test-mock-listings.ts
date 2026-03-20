/**
 * Test mock listings on thesteadyone.com (production)
 * Injects localStorage answers, navigates to /decision, captures screenshots.
 */

import { chromium } from 'playwright';

const BASE_URL = 'https://www.thesteadyone.com';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14
    locale: 'en-US',
  });

  const page = await context.newPage();

  // 1. Visit /decision first to set localStorage on the right origin
  console.log('→ Opening /decision to inject localStorage...');
  await page.goto(`${BASE_URL}/decision`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Inject answers: Bronx + Manhattan + Queens, 1-bed, $3500 budget, pets yes
  await page.evaluate(() => {
    const answers = {
      boroughs: ['Bronx', 'Manhattan', 'Queens'],
      budget: 3500,
      bedrooms: '1',
      bathrooms: '1',
      pets: 'yes',
      amenities: ['gym'],
      timing: 'asap',
    };
    localStorage.setItem('pepe_answers_v2', JSON.stringify(answers));
    console.log('[Test] localStorage injected:', JSON.stringify(answers));
  });

  // 2. Reload to trigger fetchData with injected answers
  console.log('→ Reloading to fetch listings...');
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000); // wait for Supabase + mock fallback

  // Log console output from the page
  page.on('console', msg => {
    if (msg.text().includes('[Steady Debug]') || msg.text().includes('[Pepe Debug]')) {
      console.log(`  [browser] ${msg.text()}`);
    }
  });

  // 3. Screenshot: listing 1
  await page.screenshot({ path: 'test-mock-1.png', fullPage: false });
  console.log('✓ Screenshot 1: test-mock-1.png');

  // 4. Check what's visible on the page
  const pageText = await page.innerText('body').catch(() => '');
  const hasScore   = pageText.includes('%') || pageText.includes('Match');
  const hasPrice   = pageText.includes('$2,') || pageText.includes('$3,');
  const hasBadge   = pageText.includes('ACT NOW') || pageText.includes('WAIT') || pageText.includes('CONSIDER');
  const hasBorough = pageText.includes('Bronx') || pageText.includes('Manhattan') || pageText.includes('Queens');
  const hasNoMatch = pageText.includes('No matches');
  const hasFreeMonth = pageText.includes('free') || pageText.includes('Free');

  console.log('\n═══════════════════════════════════');
  console.log('  MOCK LISTINGS TEST RESULTS');
  console.log('═══════════════════════════════════');
  console.log(`  Listings visible:   ${hasPrice ? '✓ YES' : '✗ NO'}`);
  console.log(`  Borough shown:      ${hasBorough ? '✓ YES' : '✗ NO'}`);
  console.log(`  Match score:        ${hasScore ? '✓ YES' : '✗ NO'}`);
  console.log(`  Badge shown:        ${hasBadge ? '✓ YES' : '✗ NO'}`);
  console.log(`  Free month text:    ${hasFreeMonth ? '✓ YES' : '✗ NO'}`);
  console.log(`  "No matches" shown: ${hasNoMatch ? '⚠ YES (mock fallback may not be working)' : '✓ NO'}`);
  console.log('═══════════════════════════════════\n');

  // 5. Click NEXT LISTING and screenshot listing 2
  const nextBtn = page.locator('button', { hasText: 'NEXT LISTING' });
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-mock-2.png', fullPage: false });
    console.log('✓ Screenshot 2: test-mock-2.png (after NEXT)');
  } else {
    console.log('⚠ NEXT LISTING button not found — only 1 listing or page not loading');
  }

  // 6. Check counter (e.g. "1 / 10")
  const counter = await page.locator('text=/\\d+ \\/ \\d+/').first().textContent().catch(() => null);
  if (counter) {
    console.log(`  Listing counter: ${counter.trim()}`);
  }

  await browser.close();
  console.log('\nDone. Check test-mock-1.png and test-mock-2.png');
}

main().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
