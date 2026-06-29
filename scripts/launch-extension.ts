/**
 * Launch Edge browser with the Smart Form Filler extension loaded.
 * Run with: npx tsx scripts/launch-extension.ts
 */
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const EXTENSION_PATH = resolve(process.cwd(), 'extension/dist');
const EDGE_EXECUTABLE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';

async function main() {
  console.log('🚀 Starting Edge with Smart Form Filler extension...');
  console.log(`📦 Extension path: ${EXTENSION_PATH}`);

  const context = await chromium.launchPersistentContext('', {
    executablePath: EDGE_EXECUTABLE,
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  // Wait for the extension service worker to register (with event listener)
  let extensionId = '';

  const workerPromise = new Promise<string>(resolve => {
    context.on('serviceworker', worker => {
      const url = worker.url();
      if (url.startsWith('chrome-extension://')) {
        resolve(url.split('/')[2]);
      }
    });
    // Also check already-registered workers
    for (const worker of context.serviceWorkers()) {
      const url = worker.url();
      if (url.startsWith('chrome-extension://')) {
        resolve(url.split('/')[2]);
        break;
      }
    }
  });

  // Wait up to 5 seconds for service worker
  extensionId = await Promise.race([
    workerPromise,
    new Promise<string>(resolve => setTimeout(() => resolve(''), 5000)),
  ]);

  // Open the extension popup as a standalone page
  const page = await context.newPage();

  if (extensionId) {
    console.log(`🔑 Extension ID: ${extensionId}`);
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    console.log(`🌐 Opening popup: ${popupUrl}`);
    await page.goto(popupUrl);
  } else {
    // Fallback: open extension management page
    console.log('⚠️  Could not get extension ID, opening edge://extensions instead');
    await page.goto('edge://extensions');
  }

  console.log('✅ Edge launched! Press Ctrl+C to close.');

  // Keep the browser open until user presses Ctrl+C
  await new Promise(() => {});
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
