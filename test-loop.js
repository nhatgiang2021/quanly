import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:8765/app.html', { waitUntil: 'domcontentloaded' });
  
  const perf = await page.evaluate(() => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve("Thread is not blocked");
      }, 1000);
    });
  });
  console.log(perf);
  await browser.close();
})();
