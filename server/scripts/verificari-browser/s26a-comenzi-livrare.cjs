// S26a - verificarea in browser pe instanta de pe BAZA DE TEST (datele lasate de suita automata, conturile
// "-s26@exemplu.local"): livrarea de la Bilka pe comanda (coloana Livrare, caseta, schimbarea cu istoric),
// fisa soferului, marcajul "telefon dublat" (Admin general de test). Nimic pe baza de lucru.
const puppeteer = require("puppeteer");
const path = require("path");
const [BAZA, PAROLA, CAPTURI] = process.argv.slice(2);
require("fs").mkdirSync(CAPTURI, { recursive: true });
const rezultate = [];
const verifica = (nume, ok, detaliu = "") => {
  rezultate.push({ nume, ok: Boolean(ok) });
  console.log(`${ok ? "OK  " : "PICA"} ${nume}${detaliu ? " — " + detaliu : ""}`);
};
const pauza = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const deschide = async (email) => {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 1366, height: 900 });
    page.on("dialog", (d) => void d.accept());
    await page.goto(`${BAZA}/login`, { waitUntil: "networkidle0" });
    await page.type("input[type=email]", email);
    await page.type("input[type=password]", PAROLA);
    await page.click("button[type=submit]");
    const start = Date.now();
    while (page.url().includes("/login") && Date.now() - start < 8000) await pauza(150);
    return page;
  };
  const unelte = (page) => ({
    captura: (nume, fullPage = false) => page.screenshot({ path: path.join(CAPTURI, `${nume}.png`), fullPage }),
    text: () => page.evaluate(() => document.body.innerText),
    asteapta: async (f, ms = 8000) => {
      const start = Date.now();
      while (Date.now() - start < ms) {
        if (await f()) return true;
        await pauza(150);
      }
      return false;
    },
    apasa: async (t, container = "body") => {
      const b = (await page.evaluateHandle((tx, sel) => [...document.querySelector(sel).querySelectorAll("button")].find((x) => x.textContent.trim() === tx) ?? null, t, container)).asElement();
      if (!b) throw new Error("buton negasit: " + t);
      await b.click();
    },
    scrie: async (eticheta, valoare, container = "body") => {
      const el = (
        await page.evaluateHandle(
          (et, sel) => {
            const l = [...document.querySelector(sel).querySelectorAll("label.camp")].find((x) => (x.querySelector("span")?.textContent ?? "").trim().startsWith(et));
            return l ? l.querySelector("input") : null;
          },
          eticheta,
          container,
        )
      ).asElement();
      await el.focus();
      await page.keyboard.down("Control");
      await page.keyboard.press("KeyA");
      await page.keyboard.up("Control");
      await page.keyboard.press("Backspace");
      if (valoare) await el.type(valoare);
    },
    api: (cale) => page.evaluate(async (c) => (await fetch(c, { credentials: "include" })).json(), cale),
  });

  // ---------------- Gestiunea: comanda cu livrare Bilka in santier
  const page = await deschide("gestiune-s26@exemplu.local");
  const u = unelte(page);
  verifica("conectare Gestiune (baza de test)", !page.url().includes("/login"));
  await page.goto(`${BAZA}/comenzi`, { waitUntil: "networkidle0" });
  await pauza(600);
  const comenzi = (await u.api("/api/comenzi?q=Croitoru")).comenzi ?? [];
  const cmd = comenzi[0];
  if (!cmd) throw new Error("comanda de test (Croitoru) lipseste - ruleaza intai suita");
  const TEXT0 = cmd.livrareBilka?.text ?? "";
  const randul = () => page.evaluate((nr) => [...document.querySelectorAll("table tbody tr")].find((r) => r.innerText.includes(nr))?.innerText ?? "", cmd.numarComplet);
  verifica("M7: coloana Livrare arată textul „Livrare Bilka — șantier: …”", TEXT0.startsWith("Livrare Bilka — șantier: Cotești") && (await randul()).includes(TEXT0), TEXT0);
  const depozit = ((await u.api("/api/comenzi?q=Direct")).comenzi ?? [])[0];
  verifica("M7: la depozit nu apare nimic în plus pe comandă", depozit && depozit.livrareBilka?.tip === "DEPOZIT" && depozit.livrareBilka.text === null && !(await page.evaluate((nr) => [...document.querySelectorAll("table tbody tr")].find((r) => r.innerText.includes(nr))?.innerText ?? "", depozit?.numarComplet ?? "x")).includes("Livrare Bilka"));
  await u.captura("14-comenzi-coloana-livrare");

  // randul desfasurat
  const rand = (await page.evaluateHandle((nr) => [...document.querySelectorAll("table tbody tr")].find((r) => r.innerText.includes(nr)), cmd.numarComplet)).asElement();
  const deschideBtn = (await rand.evaluateHandle((r) => [...r.querySelectorAll("button")].find((b) => b.textContent.includes("Deschide")))).asElement();
  await deschideBtn.click();
  await page.waitForSelector(".casete-comanda");
  await pauza(500);
  const caseta = () => page.evaluate(() => [...document.querySelectorAll(".casete-comanda section.caseta")].find((s) => s.querySelector("h4")?.innerText.toLowerCase().includes("livrare"))?.innerText ?? "");
  verifica("M7: caseta „Livrare și facturare” arată textul și butonul „Schimbă”", (await caseta()).includes(TEXT0) && (await caseta()).includes("Schimbă"));
  await page.evaluate(() => document.querySelector(".casete-comanda").scrollIntoView({ block: "start" }));
  await pauza(300);
  await u.captura("15-comanda-caseta-livrare");

  // schimbarea pe comanda: la depozit, cu mentiune
  await u.apasa("Schimbă", ".casete-comanda");
  await page.waitForSelector("[role=dialog]");
  await (await page.$$('[role=dialog] input[type=radio]'))[0].click();
  await u.scrie("Mențiuni", "mașina Bilka nu ajunge — livrăm noi", "[role=dialog]");
  await u.captura("16-comanda-dialog-schimbare");
  await u.apasa("Salvează", "[role=dialog]");
  verifica("M7: schimbată la depozit — textul dispare, rămâne butonul „Livrarea de la Bilka…”", await u.asteapta(async () => !(await caseta()).includes("Livrare Bilka —") && (await caseta()).includes("Livrarea de la Bilka…")));
  const dupaDepozit = (await u.api(`/api/comenzi/${cmd.id}`)).comanda;
  const ultima = dupaDepozit.istoric.find((i) => i.camp === "livrareBilka");
  verifica("M7: schimbarea e în istoricul comenzii, cu mențiunea", ultima && ultima.valoareDupa === "la depozit" && ultima.mentiuni === "mașina Bilka nu ajunge — livrăm noi", ultima ? `${ultima.valoareInainte} → ${ultima.valoareDupa} (${ultima.numeUtilizatorLaMoment})` : "");
  verifica("M7: statusul logistic nu s-a schimbat", dupaDepozit.statusLogistic === cmd.statusLogistic, dupaDepozit.statusLogisticEticheta);

  // inapoi in santier, cu alt telefon de contact (al montatorului)
  await u.apasa("Livrarea de la Bilka…", ".casete-comanda");
  await page.waitForSelector("[role=dialog]");
  await (await page.$$('[role=dialog] input[type=radio]'))[1].click();
  await pauza(200);
  await u.scrie("Localitatea", "Cotești", "[role=dialog]");
  await u.scrie("Telefon de contact", "0787 877 989", "[role=dialog]");
  await u.apasa("Salvează", "[role=dialog]");
  const TEXT = "Livrare Bilka — șantier: Cotești · 0787 877 989";
  verifica("M7: schimbată înapoi în șantier — textul nou apare în casetă și în coloană", await u.asteapta(async () => (await caseta()).includes(TEXT) && (await randul()).includes(TEXT)));
  await page.evaluate(() => document.querySelector(".casete-comanda details summary")?.click());
  await pauza(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await u.captura("17-comanda-livrare-santier-si-istoric", true);

  // fisa soferului
  await page.goto(`${BAZA}/comenzi/fisa-soferului?c=${cmd.id}`, { waitUntil: "networkidle0" });
  await pauza(700);
  verifica("M7: fișa șoferului poartă mențiunea „Livrare Bilka — șantier: …”", (await u.text()).includes(TEXT));
  await u.captura("18-fisa-soferului-livrare-bilka");

  // ---------------- agentul: fara drept de schimbare pe comanda
  const pAgent = await deschide("agent-s26@exemplu.local");
  const ua = unelte(pAgent);
  const dAgent = (await ua.api(`/api/comenzi/${cmd.id}`)).comanda;
  verifica("M7: agentul vede textul pe comandă, dar nu are dreptul de a-l schimba", dAgent.livrareBilka?.text === TEXT && dAgent.drepturi.livrareBilka === false);

  // ---------------- Admin general (de test): marcajul „telefon dublat” in lista de oferte
  const pAdmin = await deschide("admin-general-s26@exemplu.local");
  const ug = unelte(pAdmin);
  await pAdmin.goto(`${BAZA}/oferte`, { waitUntil: "networkidle0" });
  await pauza(400);
  await pAdmin.type("input[type=search]", "Alt Popescu");
  await ug.asteapta(async () => (await ug.text()).includes("Alt Popescu"));
  await pauza(700);
  verifica("M6: Admin general vede marcajul „telefon dublat” în lista de oferte", (await ug.text()).includes("telefon dublat"));
  await ug.captura("19-lista-telefon-dublat-admin-general");

  await browser.close();
  const picate = rezultate.filter((r) => !r.ok);
  console.log(`\n${rezultate.length - picate.length} / ${rezultate.length} verificări trecute`);
  process.exit(picate.length ? 1 : 0);
})().catch((e) => {
  console.error("EROARE", e);
  process.exit(2);
});
