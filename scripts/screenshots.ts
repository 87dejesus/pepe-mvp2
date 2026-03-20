import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 size
  });

  // 1. Home
  const homePage = await context.newPage();
  await homePage.goto('http://localhost:3456/', { waitUntil: 'networkidle' });
  await homePage.waitForTimeout(1000);
  await homePage.screenshot({ path: 'screenshots-home.png', fullPage: true });
  console.log('Captured: home');
  await homePage.close();

  // 2. Flow — go through step 1 selection to show Pepe with a selection
  const flowPage = await context.newPage();
  await flowPage.goto('http://localhost:3456/flow', { waitUntil: 'networkidle' });
  await flowPage.waitForTimeout(500);
  // Click on "Manhattan" to show selected state
  await flowPage.click('text=Manhattan');
  await flowPage.waitForTimeout(300);
  await flowPage.screenshot({ path: 'screenshots-flow.png', fullPage: true });
  console.log('Captured: flow (step 1 with selection)');
  await flowPage.close();

  // 3. Decision — inject localStorage answers first so it loads real listings
  const decPage = await context.newPage();
  // Set localStorage before navigating
  await decPage.goto('http://localhost:3456/decision', { waitUntil: 'domcontentloaded' });
  await decPage.evaluate(() => {
    const answers = {
      boroughs: ['Manhattan', 'Brooklyn'],
      budget: 5000,
      bedrooms: '1',
      bathrooms: '1',
      pets: 'none',
      amenities: [],
      timing: 'asap',
    };
    localStorage.setItem('pepe_answers_v2', JSON.stringify(answers));
  });
  // Reload to pick up localStorage
  await decPage.reload({ waitUntil: 'networkidle' });
  await decPage.waitForTimeout(3000); // Wait for Supabase fetch
  await decPage.screenshot({ path: 'screenshots-decision.png', fullPage: true });
  console.log('Captured: decision');
  await decPage.close();

  // 4. Exit
  const exitPage = await context.newPage();
  await exitPage.goto('http://localhost:3456/exit', { waitUntil: 'networkidle' });
  await exitPage.waitForTimeout(1000);
  await exitPage.screenshot({ path: 'screenshots-exit.png', fullPage: true });
  console.log('Captured: exit');
  await exitPage.close();

  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
