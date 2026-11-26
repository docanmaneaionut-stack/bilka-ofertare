// S27 - verificarea in browser pe instanta de pe BAZA DE TEST (datele lasate de suita automata, conturile
// "-s27@exemplu.local"): M10 - tabelul de comenzi pe desktop (1366) si pe telefon (390): coloana 1 doar
// numarul si data (+ pastila "neidentificată"), clientul cu localitatea si adresa lucrarii, cautarea dupa
// adresa, responsabilul ca prima linie in randul desfasurat. Nimic pe baza de lucru.
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const [BAZA, PAROLA, CAPTURI] = process.argv.slice(2);
fs.mkdirSync(CAPTURI, { recursive: true });
const rezultate = [];
const verifica = (nume, ok, detaliu = "") => {
  rezultate.push({ nume, ok: Boolean(ok) });
  console.log(`${ok ? "OK  " : "PICA"} ${nume}${detaliu ? " — " + detaliu : ""}`);
};
const pauza = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  const api = (cale) => page.evaluate(async (c) => (await fetch(c, { credentials: "include" })).json(), cale);
  const captura = (nume, fullPage = false) => page.screenshot({ path: path.join(CAPTURI, `${nume}.png`), fullPage });
  const asteapta = async (f, ms = 10000) => {
    const start = Date.now();
    while (Date.now() - start < ms) {
      if (await f()) return true;
      await pauza(150);
    }
    return false;
  };
  await page.goto(`${BAZA}/login`, { waitUntil: "networkidle0" });
  await page.type("input[type=email]", "gestiune-s27@exemplu.local");
  await page.type("input[type=password]", PAROLA);
  await page.click("button[type=submit]");
  verifica("conectare Gestiune (baza de test)", await asteapta(async () => !page.url().includes("/login")));

  const agrovest = ((await api("/api/comenzi?q=Agrovest")).comenzi ?? [])[0];
  const neidentificata = ((await api("/api/comenzi?q=Manual%20Cu%20Adresa")).comenzi ?? [])[0];
  if (!agrovest || !neidentificata) throw new Error("comenzile de test lipsesc - ruleaza intai suita");
  const randuri = () => page.evaluate(() => [...document.querySelectorAll("table.tabel-comenzi tbody tr.selectabil, table tbody tr.selectabil")].map((r) => ({ col1: r.querySelector("td.numar-oferta")?.innerText ?? "", client: r.querySelector("td.numar-oferta")?.nextElementSibling?.innerText ?? "", tot: r.innerText })));
  const cauta = async (q) => {
    const c = await page.$('input[type=search]');
    await c.focus();
    await page.keyboard.down("Control");
    await page.keyboard.press("KeyA");
    await page.keyboard.up("Control");
    await page.keyboard.press("Backspace");
    if (q) await c.type(q);
    await pauza(1100);
  };
  const desfasoara = async (numar) => {
    const rand = (await page.evaluateHandle((nr) => [...document.querySelectorAll("table tbody tr.selectabil")].find((r) => r.innerText.includes(nr)), numar)).asElement();
    const b = (await rand.evaluateHandle((r) => [...r.querySelectorAll("button")].find((x) => x.textContent.includes("Deschide")) ?? r.querySelector("td.numar-oferta"))).asElement();
    await b.click();
    await page.waitForSelector(".casete-comanda");
    await pauza(600);
  };
  const primaLinie = () => page.evaluate(() => document.querySelector(".casete-comanda > div")?.innerText ?? "");

  // ---------------- desktop
  await page.goto(`${BAZA}/comenzi`, { waitUntil: "networkidle0" });
  await pauza(800);
  const toate = await randuri();
  verifica("M10: în coloana 1 nu mai apare niciun responsabil („trimisă de” / „adăugat de”)", toate.length > 3 && toate.every((r) => !/trimisă de|adăugat de/.test(r.col1)) && toate.every((r) => !/trimisă de|adăugat de/.test(r.tot)), `${toate.length} rânduri`);
  const rA = toate.find((r) => r.col1.includes(agrovest.numarComplet));
  verifica("M10: coloana 1 = numărul și data", rA && new RegExp(`^${agrovest.numarComplet}\\s*\\n?\\s*\\d{2}\\.\\d{2}\\.\\d{4}$`).test(rA.col1.trim()), rA?.col1.replace(/\n/g, " · "));
  verifica("M10: clientul apare cu localitatea și adresa lucrării pe un rând, apoi telefonul", rA && rA.client.includes("Focșani · Str. Mărășești nr. 12") && rA.client.includes("0730 128 010"), rA?.client.replace(/\n/g, " | "));
  const rN = toate.find((r) => r.col1.includes(neidentificata.numarComplet));
  verifica("M10: pastila „neidentificată” rămâne în coloana 1; manuala cu adresă scrisă o arată", rN && /neidentificată/.test(rN.col1) && rN.client.includes("Panciu · Str. Viilor nr. 3"), `${rN?.col1.replace(/\n/g, " · ")} | ${rN?.client.replace(/\n/g, " | ")}`);
  await captura("09-m10-tabel-desktop");
  await cauta("marasesti nr. 12");
  const gasite = await randuri();
  verifica("M10: căutarea găsește după adresă, fără diacritice", gasite.length === 1 && gasite[0].col1.includes(agrovest.numarComplet), `${gasite.length} rând`);
  await desfasoara(agrovest.numarComplet);
  verifica("M10: responsabilul e prima linie din rândul desfășurat („Responsabil: trimisă de …”)", (await primaLinie()).trim() === "Responsabil: trimisă de Test AGENT", await primaLinie());
  await captura("10-m10-rand-desfasurat-desktop");
  await cauta("Manual Cu Adresa");
  await desfasoara(neidentificata.numarComplet);
  verifica("M10: la comanda manuală fără cont — „Responsabil: adăugat de …; cont nealocat”", (await primaLinie()).trim() === "Responsabil: adăugat de Test GESTIUNE; cont nealocat", await primaLinie());
  await captura("11-m10-manuala-neidentificata-desktop");

  // ---------------- telefon (390 px)
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(`${BAZA}/comenzi`, { waitUntil: "networkidle0" });
  await pauza(900);
  await cauta("Agrovest");
  const card = (await randuri())[0];
  verifica("M10 (390 px): cardul are numărul, clientul cu localitatea și adresa; fără responsabil", card && card.col1.includes(agrovest.numarComplet) && card.client.includes("Focșani · Str. Mărășești nr. 12") && !/trimisă de/.test(card.tot), card?.tot.replace(/\n+/g, " | ").slice(0, 200));
  const latime = await page.evaluate(() => document.documentElement.scrollWidth);
  verifica("M10 (390 px): pagina nu iese din lățimea telefonului", latime <= 392, `${latime} px`);
  await captura("12-m10-card-telefon");
  await desfasoara(agrovest.numarComplet);
  verifica("M10 (390 px): responsabilul apare la desfășurare", (await primaLinie()).trim() === "Responsabil: trimisă de Test AGENT");
  await page.evaluate(() => document.querySelector(".casete-comanda")?.scrollIntoView({ block: "start" }));
  await pauza(300);
  await captura("13-m10-desfasurat-telefon");

  await browser.close();
  const picate = rezultate.filter((r) => !r.ok);
  console.log(`\n${rezultate.length - picate.length} / ${rezultate.length} verificări trecute`);
  process.exit(picate.length ? 1 : 0);
})().catch((e) => {
  console.error("EROARE", e);
  process.exit(2);
});
