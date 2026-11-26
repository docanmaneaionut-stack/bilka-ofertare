// S27b (BUG-17) - verificarea in browser pe instanta de pe BAZA DE TEST (datele lasate de ofe-s27b.test.ts,
// conturile "-s27b@exemplu.local"): comanda manuala introdusa din ecran, fara adresa, pentru un client
// existent -> adresa lui ramane; client nou fara adresa -> nicio adresa inventata. Nimic pe baza de lucru.
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
const asteapta = async (f, ms = 10000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await f()) return true;
    await pauza(150);
  }
  return false;
};

async function conectat(browser, email) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(`${BAZA}/login`, { waitUntil: "networkidle0" });
  await page.type("input[type=email]", email);
  await page.type("input[type=password]", PAROLA);
  await page.click("button[type=submit]");
  const ok = await asteapta(async () => !page.url().includes("/login"));
  const api = (cale) => page.evaluate(async (c) => (await fetch(c, { credentials: "include" })).json(), cale);
  const captura = (nume, fullPage = false) => page.screenshot({ path: path.join(CAPTURI, `${nume}.png`), fullPage });
  return { page, api, captura, ok };
}

// campul din dialog dupa eticheta lui
const camp = (page, eticheta) =>
  page.evaluateHandle((e) => {
    const dialog = document.querySelector('[role=dialog][aria-label="Comandă manuală"]');
    const l = [...dialog.querySelectorAll("label, .camp")].find((x) => (x.innerText || "").trim().toLowerCase().startsWith(e.toLowerCase()));
    return l?.querySelector("input, textarea") ?? null;
  }, eticheta);

async function comandaManualaDinEcran(g, { nume, telefon, localitate, rezumat }) {
  const { page } = g;
  await page.goto(`${BAZA}/comenzi`, { waitUntil: "networkidle0" });
  await pauza(600);
  const buton = (await page.evaluateHandle(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Comandă manuală")))).asElement();
  await buton.click();
  await page.waitForSelector('[role=dialog][aria-label="Comandă manuală"]');
  for (const [e, v] of [["Client", nume], ["Telefon", telefon], ["Localitate", localitate], ["Rezumatul comenzii", rezumat], ["Total cu TVA", "100"]]) {
    if (!v) continue;
    const el = (await camp(page, e)).asElement();
    if (!el) throw new Error(`nu gasesc campul ${e}`);
    await el.type(v);
  }
  const areAdresa = await page.evaluate(() => [...document.querySelectorAll('[role=dialog][aria-label="Comandă manuală"] label, [role=dialog][aria-label="Comandă manuală"] .camp')].some((x) => /adres/i.test(x.innerText || "")));
  return { areAdresa, trimite: async () => {
    await page.evaluate(() => document.querySelector('[role=dialog][aria-label="Comandă manuală"] .actiuni button.buton:not(.secundar)').click());
    return asteapta(async () => !(await page.$('[role=dialog][aria-label="Comandă manuală"]')));
  } };
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const a = await conectat(browser, "agent1-s27b@exemplu.local");
  const g = await conectat(browser, "gestiune-s27b@exemplu.local");
  verifica("conectare Agent și Gestiune (baza de test)", a.ok && g.ok);

  // clientul existent, cu fisa completa (lasat de suita): Tudor Mihai
  const fisaApi = async () => ((await a.api("/api/clienti?telefon=0730129050")).clienti ?? [])[0];
  const inainte = await fisaApi();
  if (!inainte) throw new Error("clientul de test lipseste - ruleaza intai tests/ofe-s27b.test.ts");
  verifica("înainte: fișa clientului are adresa, localitatea, e-mailul și observațiile", inainte.adresa === "Str. Florilor nr. 7" && inainte.localitate === "Golești" && inainte.email === "client@exemplu.local" && inainte.observatii === "sună după ora 16", JSON.stringify(inainte));
  await a.page.goto(`${BAZA}/clienti/${inainte.id}`, { waitUntil: "networkidle0" });
  await pauza(500);
  await a.captura("01-fisa-clientului-inainte");

  // comanda manuala din ecran: nume, telefon, localitate - fara adresa (ecranul nici nu are campul)
  const f1 = await comandaManualaDinEcran(g, { nume: "Tudor Mihai", telefon: "0730 129 050", localitate: "Golești", rezumat: "probă BUG-17: client existent, fără adresă" });
  verifica("formularul de comandă manuală are câmpul opțional „Adresa lucrării” (de la S28, BUG-18); aici rămâne necompletat", f1.areAdresa);
  await g.captura("02-comanda-manuala-fara-adresa");
  verifica("comanda manuală se creează", await f1.trimite());
  await pauza(900);
  const cm = ((await g.api("/api/comenzi?q=Tudor%20Mihai")).comenzi ?? []).find((c) => c.manuala);
  verifica("comanda manuală apare în tabel pentru clientul existent", Boolean(cm), cm?.numarComplet);
  const dupa = await fisaApi();
  verifica("BUG-17: adresa clientului a rămas (nu a primit localitatea)", dupa.adresa === "Str. Florilor nr. 7", `adresa = ${dupa.adresa}`);
  verifica("BUG-17: localitatea, e-mailul și observațiile au rămas", dupa.localitate === "Golești" && dupa.email === "client@exemplu.local" && dupa.observatii === "sună după ora 16", JSON.stringify(dupa));
  await a.page.goto(`${BAZA}/clienti/${inainte.id}`, { waitUntil: "networkidle0" });
  await pauza(500);
  const textFisa = await a.page.evaluate(() => document.body.innerText);
  verifica("fișa clientului, pe ecran: telefonul și „Str. Florilor nr. 7, Golești” (de la S28 datele stau pe rânduri)", textFisa.includes("0730 129 050") && textFisa.includes("Str. Florilor nr. 7, Golești"));
  await a.captura("03-fisa-clientului-dupa");

  // a doua comanda, cu localitatea lasata goala: nici localitatea nu se sterge
  const f2 = await comandaManualaDinEcran(g, { nume: "Tudor Mihai", telefon: "0730 129 050", localitate: "", rezumat: "probă BUG-17: fără localitate" });
  verifica("a doua comandă manuală (localitatea lăsată goală) se creează", await f2.trimite());
  await pauza(900);
  const dupa2 = await fisaApi();
  verifica("BUG-17: localitatea lăsată goală nu șterge localitatea din fișă", dupa2.localitate === "Golești" && dupa2.adresa === "Str. Florilor nr. 7", JSON.stringify(dupa2));

  // client nou, fara adresa: nicio adresa inventata din localitate
  const f3 = await comandaManualaDinEcran(g, { nume: "Client Nou Probă S27b", telefon: "0730 129 099", localitate: "Panciu", rezumat: "probă BUG-17: client nou" });
  verifica("comanda manuală pentru un client nou se creează", await f3.trimite());
  await pauza(900);
  const nou = ((await a.api("/api/clienti?telefon=0730129099")).clienti ?? [])[0];
  verifica("client nou fără adresă: adresa NU e completată din localitate", nou && nou.adresa === "-" && nou.localitate === "Panciu", JSON.stringify(nou));
  await g.page.goto(`${BAZA}/comenzi`, { waitUntil: "networkidle0" });
  await pauza(900);
  const randuri = await g.page.evaluate(() => [...document.querySelectorAll("table tbody tr.selectabil")].map((r) => ({ client: r.querySelector("td.numar-oferta")?.nextElementSibling?.innerText ?? "" })));
  const rNou = randuri.find((r) => r.client.includes("Client Nou Probă S27b"));
  const rVechi = randuri.filter((r) => r.client.includes("Tudor Mihai"));
  verifica("în tabel, clientul nou apare doar cu localitatea („Panciu”), fără „-” și fără localitatea dublată", rNou && /\bPanciu\b/.test(rNou.client) && !rNou.client.includes("Panciu · ") && !rNou.client.includes(" · -"), rNou?.client.replace(/\n/g, " | "));
  verifica("în tabel, comenzile manuale fără adresă arată doar localitatea — niciodată adresa din fișa clientului (de la S28, BUG-18)", rVechi.length >= 2 && rVechi.every((r) => !r.client.includes("Str. Florilor")) && rVechi.some((r) => r.client.includes("Golești")), rVechi.map((r) => r.client.replace(/\n/g, " | ")).join(" || "));
  await g.captura("04-tabelul-de-comenzi");

  // oferta noua pentru clientul creat fara adresa: campul de adresa ramane gol (nu "-"), de completat
  await a.page.goto(`${BAZA}/oferte/noua`, { waitUntil: "networkidle0" });
  await pauza(500);
  await a.page.type("input[type=tel]", "0730129099");
  const areSugestie = await asteapta(async () => Boolean(await a.page.$('ul[aria-label="Clienți existenți"] li')));
  if (areSugestie) await a.page.click('ul[aria-label="Clienți existenți"] li');
  await pauza(400);
  const adresaInFormular = await a.page.evaluate(() => {
    const l = [...document.querySelectorAll("label, .camp")].find((x) => (x.innerText || "").trim().toLowerCase().startsWith("adresa lucrării"));
    return l?.querySelector("input")?.value ?? null;
  });
  verifica("ofertă nouă pentru clientul creat fără adresă: câmpul „Adresa lucrării” e gol (de completat), nu „-”", areSugestie && adresaInFormular === "", `valoare = ${JSON.stringify(adresaInFormular)}`);
  await a.captura("05-oferta-noua-adresa-de-completat");

  await browser.close();
  const picate = rezultate.filter((r) => !r.ok);
  console.log(`\n${rezultate.length - picate.length} / ${rezultate.length} verificări trecute`);
  process.exit(picate.length ? 1 : 0);
})().catch((e) => {
  console.error("EROARE", e);
  process.exit(2);
});
