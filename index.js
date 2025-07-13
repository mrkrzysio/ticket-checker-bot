const express = require('express');
const puppeteer = require('puppeteer');
const retry = require('async-retry');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// EmailJS
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;

app.get('/', async (req, res) => {
  res.send('Ticket checker is running!');
});

async function checkSite(name, url, checkFn) {
  try {
    console.log(`🔍 Sprawdzam [${name}]...`);
    await retry(async () => {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox']
      });

      const page = await browser.newPage();
      await page.goto(url, { timeout: 30000, waitUntil: 'networkidle2' });

      const isAvailable = await checkFn(page);
      await browser.close();

      if (isAvailable) {
        console.log(`✅ Bilety [${name}] dostępne!`);
        await notifyByEmail(name, url);
      } else {
        console.log(`⏳ [${name}] Brak biletów`);
      }
    }, {
      retries: 3,
      onRetry: (e, attempt) => {
        console.warn(`⚠️ [${name}] Błąd: ${e.code || e.message} (próba ${attempt})`);
      }
    });
  } catch (error) {
    console.error(`❌ Błąd [${name}]: ${error.message}`);
  }
}

async function notifyByEmail(site, url) {
  await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: RECIPIENT_EMAIL,
        site: `${site}: ${url}`
      }
    })
  });
}

async function runChecker() {
  await checkSite("Eventim", "https://www.eventim.pl/event/till-lindemann-meine-welt-tour-2025-tauron-arena-krakow-20230115/", async (page) => {
    const content = await page.content();
    return content.includes("Golden Circle") && !content.includes("Wyprzedane");
  });

  await checkSite("Mticket", "https://mticket.pl/en/krakow/till-lindemann-meine-welt-tour--krakow-2050.html", async (page) => {
    const content = await page.content();
    return content.includes("Golden Circle") && !content.includes("Sold out");
  });
}

// Start loop
setInterval(runChecker, 5 * 60 * 1000); // co 5 minut
runChecker(); // initial check

app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
});
