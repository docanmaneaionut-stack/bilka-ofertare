// Ajutoare comune pentru verificarile in browser (puppeteer). Fara parole sau chei aici: adresa, contul si
// parola vin ca argumente la rulare. Vezi README.md din acest folder.
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const pauza = (ms) => new Promise((r) => setTimeout(r, ms));
async function asteapta(f, ms = 10000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await f()) return true;
    await pauza(150);
  }
  return false;
}

// lista de verificari: OK / PICA pe ecran, sumar la sfarsit
function verificari() {
  const rezultate = [];
  return {
    verifica(nume, ok, detaliu = "") {
      rezultate.push({ nume, ok: Boolean(ok) });
      console.log(`${ok ? "OK  " : "PICA"} ${nume}${detaliu ? " — " + detaliu : ""}`);
      return Boolean(ok);
    },
    sumar() {
      const picate = rezultate.filter((r) => !r.ok);
      console.log(`\n${rezultate.length - picate.length} / ${rezultate.length} verificări trecute`);
      return picate.length;
    },
  };
}

const porneste = () => puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

// o sesiune conectata, in contextul ei (mai multe conturi in acelasi browser)
async function conectat(browser, baza, email, parola, capturi) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  page.on("dialog", (d) => d.accept());
  await page.goto(`${baza}/login`, { waitUntil: "networkidle0" });
  await page.type("input[type=email]", email);
  await page.type("input[type=password]", parola);
  await page.click("button[type=submit]");
  const ok = await asteapta(async () => !page.url().includes("/login"));
  if (capturi) fs.mkdirSync(capturi, { recursive: true });
  return {
    page,
    ok,
    api: (cale, optiuni) =>
      page.evaluate(
        async (c, o) => {
          const r = await fetch(c, { credentials: "include", ...(o ? { method: o.method, headers: { "Content-Type": "application/json" }, body: o.body === undefined ? undefined : JSON.stringify(o.body) } : {}) });
          const text = await r.text();
          try {
            return { status: r.status, ...JSON.parse(text) };
          } catch {
            return { status: r.status, text };
          }
        },
        cale,
        optiuni,
      ),
    captura: (nume, fullPage = false) => (capturi ? page.screenshot({ path: path.join(capturi, `${nume}.png`), fullPage }) : null),
    mergi: async (cale, selector) => {
      await page.goto(`${baza}${cale}`, { waitUntil: "networkidle0" });
      if (selector) await page.waitForSelector(selector, { timeout: 20000 });
      await pauza(700);
    },
    telefon: () => page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }),
    desktop: () => page.setViewport({ width: 1366, height: 900 }),
  };
}

// goleste un camp si scrie in el (triplu-clic nu goleste sigur)
async function scrieIn(page, element, text) {
  await element.focus();
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyA");
  await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");
  if (text) await element.type(text);
}

module.exports = { pauza, asteapta, verificari, porneste, conectat, scrieIn };
