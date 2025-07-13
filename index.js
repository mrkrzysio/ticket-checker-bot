const express = require("express");
const puppeteer = require("puppeteer");
const emailjs = require("emailjs-com");
require("dotenv").config();

const app = express();
const port = 3000;

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minut
const TIMEOUT = 30000;

const urls = {
  eventim: "https://www.eventim.pl/event/till-lindemann-meine-welt-tour-2025-tauron-arena-krakow-20230115/?affiliate=APL",
  mticket: "https://widget.mticket.eu/widget548site12894/widget/event/100168635?utm_referrer=mticket.pl/en/krakow/till-lindemann-meine-welt-tour--krakow-2050.html&siteShowId=2050&siteEventId=4208&utm_source=google&utm_medium=cpc&utm_campaign=22161403837&utm_content=&utm_term=till+lindenman|170775834861&_gl=1*1p5r6gm*_ga*NDkwNjY1Nzk4LjE3NTIyMjY0MzM.*_ga_XW31VBQDS7*czE3NTI0MTAyODkkbzIkZzAkdDE3NTI0MTAyODkkajYwJGwwJGgxNjkxMzE2Mjk.*_ga_0K08JRZ5LP*czE3NTI0MTAyODkkbzQkZzAkdDE3NTI0MTAyODkkajYwJGwwJGgw"
};

async function checkPage(name, url) {
  let browser;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔍 Sprawdzam [${name}]... (próba ${attempt})`);
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox"],
        timeout: TIMEOUT
      });
      const page = await browser.newPage();
      await page.goto(url, { timeout: TIMEOUT, waitUntil: "networkidle2" });
      const content = await page.content();

      const found = content.toLowerCase().includes("golden circle");
      if (found) {
        console.log(`✅ [${name}] BILETY ZNALEZIONE!`);
        await sendEmail(name);
      } else {
        console.log(`⏳ [${name}] Brak biletów`);
      }

      await browser.close();
      return;
    } catch (error) {
      console.error(`❌ Błąd [${name}]: ${error.message}`);
      if (browser) await browser.close();
    }
  }
}

async function sendEmail(siteName) {
  await emailjs.send(
    process.env.EMAILJS_SERVICE_ID,
    process.env.EMAILJS_TEMPLATE_ID,
    { site: siteName },
    process.env.EMAILJS_USER_ID
  );
  console.log(`📧 Wysłano e-mail z informacją o biletach na ${siteName}`);
}

async function checkAll() {
  await checkPage("Eventim", urls.eventim);
  await checkPage("Mticket", urls.mticket);
}

app.get("/", (req, res) => {
  res.send("Bot działa i monitoruje bilety.");
});

app.listen(port, () => {
  console.log(`🚀 Serwer działa na porcie ${port}`);
  checkAll(); // initial check
  setInterval(checkAll, CHECK_INTERVAL);
});
