import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 812 });
  
  await page.goto('http://localhost:8765/app.html', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshot.png' });
  
  await browser.close();
})();
