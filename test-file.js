import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE_ERROR:', err.toString()));
  
  await page.goto('file:///Users/trangiang/Documents/quan%20ly%20tai%20san/wealth-html-app/app.html', { waitUntil: 'networkidle0' });
  
  await browser.close();
})();
