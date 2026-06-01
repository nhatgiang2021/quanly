import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE_ERROR:', err.toString()));
  
  await page.goto('http://localhost:8765/app.html', { waitUntil: 'networkidle0' });
  
  const bodyHandle = await page.$('body');
  const html = await page.evaluate(body => body.innerHTML, bodyHandle);
  console.log('HTML CONTENT START---');
  console.log(html.substring(0, 500));
  console.log('HTML CONTENT END---');
  
  await browser.close();
})();
