// Capturile paginii ofertei, pe fiecare fila, pe ecran lat (1366) si pe telefon (390) - DOAR CITIRE.
// Folosire: node capturi-oferta.cjs <adresa> <cont> <parola> <folder-capturi> <prefix> <numar-oferta>...
const { pauza, porneste, conectat } = require("./comun.cjs");
const [BAZA, EMAIL, PAROLA, CAPTURI, PREFIX, ...NUMERE] = process.argv.slice(2);
const FILE = [
  ["date-generale", "1-date-generale"],
  ["produse", "2-produse"],
  ["preturi", "3-preturi-si-documente"],
];

(async () => {
  const browser = await porneste();
  const A = await conectat(browser, BAZA, EMAIL, PAROLA, CAPTURI);
  const scrieri = [];
  A.page.on("request", (r) => {
    if (r.method() !== "GET" && !r.url().includes("/api/auth/")) scrieri.push(`${r.method()} ${r.url()}`);
  });
  for (const numar of NUMERE) {
    const o = ((await A.api(`/api/oferte?q=${encodeURIComponent(numar)}`)).oferte ?? []).find((x) => x.numarComplet === numar);
    if (!o) throw new Error(`oferta ${numar} nu e vizibila contului`);
    for (const [ecran, pune] of [["lat", A.desktop], ["telefon", A.telefon]]) {
      await pune();
      for (const [ancora, nume] of FILE) {
        await A.page.goto(`${BAZA}/oferte/${o.id}#${ancora}`, { waitUntil: "networkidle0" });
        await A.page.reload({ waitUntil: "networkidle0" });
        await A.page.waitForSelector(".oferta-fix", { timeout: 20000 });
        await pauza(2000);
        await A.captura(`${PREFIX}${numar}-${ecran}-${nume}`);
        const m = await A.page.evaluate(() => ({ fix: Math.round(document.querySelector(".oferta-fix").getBoundingClientRect().height), ecran: window.innerHeight, latime: document.documentElement.scrollWidth, inaltime: document.documentElement.scrollHeight }));
        console.log(`${numar} ${ecran} ${nume}: randurile fixe ${m.fix} px din ${m.ecran} (${Math.round((100 * m.fix) / m.ecran)} %), latimea paginii ${m.latime} px, inaltimea ${m.inaltime} px`);
      }
    }
  }
  await browser.close();
  console.log(`cereri de scriere facute de pagina: ${scrieri.length}${scrieri.length ? " -> " + scrieri.join(", ") : ""}`);
})().catch((e) => {
  console.error("EROARE", e);
  process.exit(2);
});
