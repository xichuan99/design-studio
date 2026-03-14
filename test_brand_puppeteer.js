const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('requestfailed', request => {
      console.log(`REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
  });
  page.on('response', async response => {
      if (!response.ok() && response.url().includes('/api/')) {
          console.log(`BAD RESPONSE: ${response.status()} ${response.url()}`);
          try {
              console.log('RESPONSE BODY:', await response.text());
          } catch(e) {}
      }
  });

  try {
      console.log("Navigating to login...");
      await page.goto('http://localhost:3000/auth/signin', { waitUntil: 'networkidle0' });
      
      console.log("Typing credentials...");
      await page.type('input[type="email"]', 'test2@clarinovist.com');
      await page.type('input[type="password"]', 'password123');
      
      console.log("Clicking login...");
      await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0' }),
          page.click('button[type="submit"]')
      ]);
      
      console.log("Navigating to tools page...");
      await page.goto('http://localhost:3000/tools', { waitUntil: 'networkidle0' });
      
      // We need to click on "Brand Kit" or whatever tab it is, or directly open the panel
      // It might be easier to trigger the API directly from the browser console
      console.log("Injecting API call directly...");
      await page.evaluate(async () => {
          try {
              // Wait, the Next.js app has the session. The easy way is to trigger fetch directly.
              // Alternatively, we can just intercept the fetch call.
              const res = await fetch('/api/brand-kits', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      name: "Puppeteer Kit",
                      logo_url: null,
                      colors: [{ hex: "#000000", name: "Black", role: "primary" }]
                  })
              });
              const text = await res.text();
              console.log("Direct Fetch Result: " + res.status + " " + text);
          } catch (err) {
              console.log("Direct Fetch Error: " + err.message);
          }
      });
      
      // Wait a moment for logs
      await new Promise(r => setTimeout(r, 2000));
      
  } catch(e) {
      console.error(e);
  } finally {
      await browser.close();
  }
})();
