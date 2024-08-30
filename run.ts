import {webcrypto} from 'node:crypto';
import {chromium} from 'playwright';

const scriptUrl = process.argv[2];

if (!scriptUrl) {
  console.error('Please provide a script URL as an argument.');
  process.exit(1);
}

async function analyzeScript(scriptUrl: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Construct an HTML page that loads the script
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="${scriptUrl}"></script>
      </head>
      <body></body>
    </html>
  `;

  // Store details about the assets that are loaded
  const loadedAssets = new Map<string, {initiator?: string}>();

  // Enable the CDP session
  const client = await page.context().newCDPSession(page);

  // Enable network interception
  await client.send('Network.enable');

  // Listen for network requests
  client.on('Network.requestWillBeSent', (event) => {
    const initiator =
      event.initiator.url ??
      (event.initiator.stack?.callFrames[0].url || undefined);
    loadedAssets.set(event.request.url, {initiator});
  });

  // Load the HTML page
  await page.setContent(html);

  // Wait for network idle to ensure all assets are loaded
  await page.waitForLoadState('networkidle');

  // Sloppy bit: wait a bit to make sure all the assets are loaded. Probably a better way to do this,
  // or it should be configurable/ run in a loop until the network is truly idle.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Get a list of all scripts loaded by the page
  const scriptTags = await page.evaluate(() => {
    return Array.from(document.scripts).map((script) => script.src);
  });

  // Store calculated asset details
  const requests = new Map<
    string,
    {url: string; size: number; integrity: string; initiator?: string}
  >();

  // Calculate bundle size and SRI hash for each asset using native fetch()
  for (const [url, {initiator}] of loadedAssets) {
    try {
      const response = await fetch(url);
      const content = await response.arrayBuffer();
      const size = content.byteLength;

      // Use Web Crypto API to calculate SHA-384 hash
      const hashBuffer = await webcrypto.subtle.digest('SHA-384', content);
      const integrity =
        'sha384-' +
        btoa(String.fromCharCode.apply(null, new Uint8Array(hashBuffer)));

      requests.set(url, {url, size, integrity, initiator});
    } catch (error) {
      console.error(`Failed to fetch or process ${url}: ${error.message}`);
      requests.set(url, {
        url,
        size: 0,
        integrity: 'Failed to calculate',
        initiator,
      });
    }
  }

  // Close the browser
  await browser.close();

  return {
    tags: scriptTags,
    requests: Array.from(requests.values()),
  };
}

// Example usage
const result = await analyzeScript(scriptUrl);

console.log('Requests:\n');
result.requests.forEach((request) => {
  console.log(`- URL: ${request.url}`);
  console.log(`  Size: ${request.size} bytes`);
  console.log(`  SRI Hash: ${request.integrity}`);
  console.log(`  Initiator: ${request.initiator}`);
});
