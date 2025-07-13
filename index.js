const puppeteer = require("puppeteer");
const express = require("express");
const retry = require("retry");
const emailjs = require("@emailjs/browser");
const app = express();
const port = 3000;

const EMAIL_TO = "mrkrzysio@gmail.com";
const SERVICE_ID = "YOUR_SERVICE_ID";
const TEMPLATE_ID = "YOUR_TEMPLATE_ID";
const PUBLIC_KEY = "YOUR_PUBLIC_KEY";

const eventimURL = "https://www.eventim.pl/event/till-lindemann-meine-welt-tour-2025-tauron-arena-krakow-20230115/";
const mticketURL = "https://mticket.pl/en/krakow/till-lindemann-meine-welt-tour--krakow-2050.html";

async function checkTickets(site, url, selector, name) {
  const operation = retry.operation({
    retries: 3,
    factor: 1,
    minTimeout: 1000,
    maxTimeout: 30000,
  });

  operation.attempt(async function (currentAttempt) {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        timeout: 30000,
      });

      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      const content = await page.content();

      if (content.includes("Golden Circle")) {
        console.log(`✅ [${site}] Bilety Golden Circle dostępne!`);
        sendNotification(site, url);
      } else {
        console.log(`⏳ [${site}] Brak biletów Golden Circle`);
      }

      await browser.close();
    } catch (err) {
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        console.log(`❌ Błąd [${site}]: ${err.code}, próba ${currentAttempt}`);
        if (operation.retry(err)) return;
      } else {
        console.log(`❌ Błąd [${site}]:`, err.message || err);
      }
    }
  });
}

function sendNotification(site, link) {
  emailjs.send(SERVICE_ID, TEMPLATE_ID, {
    site: site,
    link: link,
    to_email: EMAIL_TO,
  }, PUBLIC_KEY)
  .then(() => {
    console.log(`📧 Powiadomienie e-mail wysłane (${site})`);
  })
  .catch((err) => {
    console.error("❌ Błąd podczas wysyłania e-maila:", err.text || err);
  });
}

checkTickets("Eventim", eventimURL, "body", "Golden Circle");
checkTickets("Mticket", mticketURL, "body", "Golden Circle");

setInterval(() => {
  console.log("🔍 Sprawdzam bilety...");
  checkTickets("Eventim", eventimURL, "body", "Golden Circle");
  checkTickets("Mticket", mticketURL, "body", "Golden Circle");
}, 5 * 60 * 1000);

app.get("/", (req, res) => res.send("✅ Bot działa."));
app.listen(port, () => console.log(`🚀 Serwer działa na porcie ${port}`));
