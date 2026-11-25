// S29 - fotografia paginii ofertei (DOAR CITIRE): pentru fiecare oferta ceruta, rubricile zonei de produse cu
// randurile lor in ordine (text + valorile casutelor) si butoanele lor, plus inventarul paginii intregi
// (titluri, etichete de camp, butoane). Se ruleaza inainte si dupa M12 si se compara. Nu modifica nimic.
// Folosire: node inventar-oferta.cjs <baza> <email> <parola> <fisier-iesire.json> <numar-oferta>...
const puppeteer = require("puppeteer");
const fs = require("fs");
const [BAZA, EMAIL, PAROLA, IESIRE, ...NUMERE] = process.argv.slice(2);
const pauza = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  const scrieri = [];
  page.on("request", (r) => {
    if (r.method() !== "GET" && !r.url().includes("/api/auth/")) scrieri.push(`${r.method()} ${r.url()}`);
  });
  await page.goto(`${BAZA}/login`, { waitUntil: "networkidle0" });
  await page.type("input[type=email]", EMAIL);
  await page.type("input[type=password]", PAROLA);
  await page.click("button[type=submit]");
  for (let i = 0; i < 60 && page.url().includes("/login"); i++) await pauza(150);
  if (page.url().includes("/login")) throw new Error("conectarea nu a reusit");
  const api = (cale) => page.evaluate(async (c) => (await fetch(c, { credentials: "include" })).json(), cale);
  const rezultat = {};
  for (const numar of NUMERE) {
    const lista = (await api(`/api/oferte?q=${encodeURIComponent(numar)}`)).oferte ?? [];
    const o = lista.find((x) => x.numarComplet === numar);
    if (!o) throw new Error(`oferta ${numar} nu e vizibila contului`);
    await page.goto(`${BAZA}/oferte/${o.id}`, { waitUntil: "networkidle0" });
    await page.waitForSelector(".zona-produse section.panou", { timeout: 20000 });
    await pauza(2500);
    rezultat[numar] = await page.evaluate(() => {
      const curat = (s) => (s || "").replace(/\s+/g, " ").trim();
      const valoare = (el) => (el.tagName === "SELECT" ? curat(el.options[el.selectedIndex]?.textContent) : el.type === "checkbox" ? (el.checked ? "[x]" : "[ ]") : el.value);
      const celula = (td) => {
        const campuri = [...td.querySelectorAll("input, select, textarea")];
        if (campuri.length) return campuri.map((c) => `«${valoare(c)}»`).join(" ");
        const but = [...td.querySelectorAll("button")].map((x) => "[" + (curat(x.innerText) || x.getAttribute("aria-label") || "buton") + "]").join(" ");
        return [curat(td.innerText), but].filter(Boolean).join(" ");
      };
      const rubrici = [...document.querySelectorAll(".zona-produse section.panou")].map((s) => ({
        titlu: curat(s.querySelector("h2")?.childNodes[0]?.textContent ?? s.querySelector("h2")?.innerText),
        benzi: [...s.querySelectorAll(".banda")].map((b) => curat(b.innerText)),
        randuri: [...s.querySelectorAll("tbody tr")].map((tr) => [...tr.children].map(celula).join(" | ")),
        campuri: [...s.querySelectorAll("label.camp")].map((l) => `${curat(l.querySelector("span")?.innerText)}=${[...l.querySelectorAll("input, select, textarea")].map((c) => `«${valoare(c)}»`).join(" ")}`),
        butoane: [...s.querySelectorAll("button")].map((b) => curat(b.innerText) || b.getAttribute("aria-label") || "").filter(Boolean),
        valori: [...s.querySelectorAll("input, select, textarea")].map((c) => valoare(c)),
        cautari: [...s.querySelectorAll("input[type=search]")].map((i) => i.getAttribute("placeholder") || ""),
        mesaje: [...s.querySelectorAll(".mesaj")].map((m) => curat(m.innerText)),
      }));
      const tot = document.querySelector("main") ?? document.body;
      const pagina = {
        titluri: [...tot.querySelectorAll("h1, h2, h3")].map((h) => `${h.tagName} ${curat(h.childNodes[0]?.textContent ?? h.innerText)}`),
        campuri: [...tot.querySelectorAll("label.camp")].map((l) => curat(l.querySelector("span")?.innerText)),
        butoane: [...tot.querySelectorAll("button, a.buton")].map((b) => curat(b.innerText) || b.getAttribute("aria-label") || "").filter(Boolean),
        mesaje: [...tot.querySelectorAll(".mesaj, .explicatie-buton")].map((m) => curat(m.innerText)),
        ajutor: [...tot.querySelectorAll("details li")].map((li) => curat(li.innerText).slice(0, 60)),
      };
      return { rubrici, pagina, inaltime: document.documentElement.scrollHeight };
    });
    const r = rezultat[numar];
    console.log(`${numar}: ${r.rubrici.length} rubrici, ${r.rubrici.reduce((s, x) => s + x.randuri.length, 0)} randuri, ${r.pagina.butoane.length} butoane, ${r.pagina.campuri.length} campuri, pagina de ${r.inaltime} px`);
  }
  await browser.close();
  fs.writeFileSync(IESIRE, JSON.stringify(rezultat, null, 1));
  console.log(`scris: ${IESIRE}; cereri de scriere facute de pagina: ${scrieri.length}${scrieri.length ? " -> " + scrieri.join(", ") : ""}`);
  process.exit(scrieri.length ? 3 : 0);
})().catch((e) => {
  console.error("EROARE", e.message);
  process.exit(2);
});
