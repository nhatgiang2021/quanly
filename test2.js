import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (!response.ok()) {
      console.log('FAILED URL:', response.url(), response.status());
    }
  });
  
  await page.goto('http://localhost:8765/app.html', { waitUntil: 'networkidle2' });
  await browser.close();
})();
