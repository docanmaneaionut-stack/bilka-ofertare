// S26b - verificarea in browser pe instanta de pe BAZA DE TEST (datele lasate de suita automata, conturile
// "-s26b@exemplu.local"): ajustarea pretului de vanzare ca Administrator al firmei (M5), montatorul si
// recomandarea pe comanda si pe oferta (M8), vanzarile, fisa soferului, comanda manuala. Nimic pe baza de lucru.
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
const S = "-s26b@exemplu.local";

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
  const unelte = (page) => {
    const u = {
      captura: (nume, fullPage = false) => page.screenshot({ path: path.join(CAPTURI, `${nume}.png`), fullPage }),
      text: (sel = "body") => page.evaluate((s) => document.querySelector(s)?.innerText ?? "", sel),
      asteapta: async (f, ms = 10000) => {
        const start = Date.now();
        while (Date.now() - start < ms) {
          if (await f()) return true;
          await pauza(150);
        }
        return false;
      },
      buton: async (t, container = "body") => (await page.evaluateHandle((tx, sel) => [...(document.querySelector(sel)?.querySelectorAll("button") ?? [])].find((x) => x.textContent.trim() === tx) ?? null, t, container)).asElement(),
      apasa: async (t, container = "body") => {
        const b = await u.buton(t, container);
        if (!b) throw new Error("buton negasit: " + t);
        await b.click();
      },
      scrie: async (eticheta, valoare, container = "body") => {
        const el = (
          await page.evaluateHandle(
            (et, sel) => {
              const l = [...document.querySelector(sel).querySelectorAll("label.camp")].find((x) => (x.querySelector("span")?.textContent ?? "").trim().startsWith(et));
              return l ? l.querySelector("input, textarea") : null;
            },
            eticheta,
            container,
          )
        ).asElement();
        if (!el) throw new Error("camp negasit: " + eticheta);
        await el.focus();
        await page.keyboard.down("Control");
        await page.keyboard.press("KeyA");
        await page.keyboard.up("Control");
        await page.keyboard.press("Backspace");
        if (valoare) await el.type(valoare);
      },
      api: (cale, optiuni) => page.evaluate(async (c, o) => (await fetch(c, { credentials: "include", headers: { "Content-Type": "application/json" }, ...(o ?? {}) })).json(), cale, optiuni),
      // desfasoara randul comenzii si marcheaza casetele ei
      deschideComanda: async (numar) => {
        await page.goto(`${BAZA}/comenzi`, { waitUntil: "networkidle0" });
        await pauza(500);
        await page.type('input[type=search], input[placeholder^="Caută"]', numar);
        await pauza(900);
        const rand = (await page.evaluateHandle((nr) => [...document.querySelectorAll("table tbody tr")].find((r) => r.innerText.includes(nr)), numar)).asElement();
        const b = (await rand.evaluateHandle((r) => [...r.querySelectorAll("button")].find((x) => x.textContent.includes("Deschide")))).asElement();
        await b.click();
        await page.waitForSelector(".casete-comanda");
        await pauza(600);
        await page.evaluate(() => {
          for (const s of document.querySelectorAll(".casete-comanda section.caseta")) {
            const t = (s.querySelector("h4")?.textContent ?? "").toLowerCase();
            if (t.startsWith("încasări")) s.id = "caseta-incasari";
            if (t.startsWith("livrare")) s.id = "caseta-livrare";
            if (t.startsWith("statusuri")) s.id = "caseta-statusuri";
          }
        });
      },
      randul: (numar) => page.evaluate((nr) => [...document.querySelectorAll("table tbody tr")].find((r) => r.innerText.includes(nr) && !r.classList.contains("detaliu-comanda"))?.innerText ?? "", numar),
    };
    return u;
  };
  const nr = (c) => c.numarComplet;

  // ============================ M5: Administratorul firmei ajusteaza pretul
  const pAdmin = await deschide(`admin1${S}`);
  const a = unelte(pAdmin);
  verifica("conectare Administrator (baza de test)", !pAdmin.url().includes("/login"));
  const intrare = ((await a.api("/api/comenzi?q=Client%20Intrare")).comenzi ?? [])[0];
  const integral = ((await a.api("/api/comenzi?q=Client%20Ajustare")).comenzi ?? []).find((c) => c.incasare.status === "INCASAT");
  if (!intrare || !integral) throw new Error("comenzile de test lipsesc - ruleaza intai suita");
  await a.deschideComanda(nr(intrare));
  verifica("M5: comanda deja ajustată arată „Preț de vânzare ajustat” și „Vezi istoric”", (await a.text("#caseta-incasari")).includes("Preț de vânzare ajustat") && (await a.text("#caseta-incasari")).includes("Vezi istoric"), `${intrare.totalLei} lei, de la ${intrare.pretAjustat?.totalInitialLei}`);
  verifica("M5: Administratorul firmei are butonul „Ajustează prețul de vânzare”", Boolean(await a.buton("Ajustează prețul de vânzare", "#caseta-incasari")));
  await a.apasa("Ajustează prețul de vânzare", "#caseta-incasari");
  await pauza(300);
  // sub achizitie -> refuz cu suma minima si butonul „folosește …”
  await a.scrie("Suma nouă", "14000", "#caseta-incasari");
  await a.scrie("Motivul", "probă sub achiziție", "#caseta-incasari");
  await a.apasa("Ajustează", "#caseta-incasari");
  verifica("M5: sub achiziție e refuzat, cu suma minimă posibilă pe ecran", await a.asteapta(async () => /Sub achiziție/.test(await a.text("#caseta-incasari")) && /Suma minimă posibilă: [\d.]+,\d{2} lei/.test(await a.text("#caseta-incasari"))), ((await a.text("#caseta-incasari")).match(/Suma minimă posibilă: [\d.,]+ lei/) ?? [""])[0]);
  await pAdmin.evaluate(() => document.getElementById("caseta-incasari").scrollIntoView({ block: "center" }));
  await pauza(300);
  await a.captura("05-ajustare-refuz-sub-achizitie");
  // suma buna, scrisa romaneste
  await a.scrie("Suma nouă", "16.500,00", "#caseta-incasari");
  await a.scrie("Motivul", "discount acordat la livrare, plată cash", "#caseta-incasari");
  await a.captura("06-ajustare-formular");
  await a.apasa("Ajustează", "#caseta-incasari");
  verifica("M5: ajustarea la 16.500,00 se salvează; restul de încasat = 16.500,00", await a.asteapta(async () => /Rest de încasat: 16\.500,00/.test(await a.text("#caseta-incasari"))));
  const dupa = (await a.api(`/api/comenzi/${intrare.id}`)).comanda;
  verifica("M5: totalul comenzii e exact suma scrisă, cu versiunea și motivul în istoric", dupa.totalLei === "16500.00" && dupa.pretAjustat?.motiv === "discount acordat la livrare, plată cash" && dupa.ajustariPret.length === intrare.pretAjustat.versiune + 1, `versiunea ${dupa.pretAjustat?.versiune}`);
  verifica("M5: rândul comenzii poartă asteriscul roșu pe total", await pAdmin.evaluate((n) => Boolean([...document.querySelectorAll("table tbody tr")].find((r) => r.innerText.includes(n))?.querySelector("td.total-oferta .asterisc")), nr(intrare)));
  await pAdmin.evaluate(() => document.querySelector("#caseta-incasari details summary")?.click());
  await pauza(300);
  await pAdmin.evaluate(() => window.scrollTo(0, 0));
  await a.captura("07-comanda-pret-ajustat-cu-istoric");
  // comanda incasata integral: butonul oprit, cu motivul alaturi
  await a.deschideComanda(nr(integral));
  const oprit = await pAdmin.evaluate(() => [...document.querySelectorAll("#caseta-incasari button")].find((b) => b.textContent.trim() === "Ajustează prețul de vânzare")?.disabled);
  verifica("M5: la comanda încasată integral butonul e oprit, cu motivul alături", oprit === true && (await a.text("#caseta-incasari")).includes("Comanda e încasată integral — prețul nu se mai poate ajusta."));
  await pAdmin.evaluate(() => document.getElementById("caseta-incasari").scrollIntoView({ block: "center" }));
  await pauza(300);
  await a.captura("08-comanda-incasata-integral-buton-oprit");
  // vanzarile: asteriscul pe pretul de vanzare
  await pAdmin.goto(`${BAZA}/vanzari`, { waitUntil: "networkidle0" });
  await pauza(800);
  const randVanzari = await pAdmin.evaluate((n) => {
    const r = [...document.querySelectorAll("table tbody tr")].find((x) => x.innerText.includes(n));
    return r ? { text: r.innerText, asterisc: Boolean(r.querySelector(".asterisc")), titlu: r.querySelector(".asterisc")?.getAttribute("title") ?? "" } : null;
  }, nr(intrare));
  verifica("M5: în vânzări prețul de vânzare e 16.500,00 cu asterisc (costul 14.337,77 neschimbat)", randVanzari && randVanzari.text.includes("16.500,00") && randVanzari.text.includes("14.337,77") && randVanzari.asterisc && randVanzari.titlu.includes("discount acordat la livrare"), randVanzari?.titlu ?? "");
  await a.captura("09-vanzari-pret-ajustat");
  // dialogul comenzii manuale: ambele rubrici
  await pAdmin.goto(`${BAZA}/comenzi`, { waitUntil: "networkidle0" });
  await pauza(400);
  await a.apasa("+ Comandă manuală");
  await pAdmin.waitForSelector('[role=dialog][aria-label="Comandă manuală"]');
  const etichete = await pAdmin.evaluate(() => [...document.querySelectorAll("[role=dialog] label.camp > span:first-child")].map((s) => s.textContent.trim().replace(/\s*\*$/, "")));
  verifica("M8: comanda manuală are ambele rubrici (montator de execuție și recomandare)", ["Montator (execuție)", "Telefon montator", "Recomandare (cine a adus lucrarea)", "Telefon recomandare"].every((e) => etichete.includes(e)), etichete.join(" | "));
  await pAdmin.evaluate(() => document.querySelector("[role=dialog] .dialog").scrollIntoView({ block: "start" }));
  await a.captura("10-comanda-manuala-doua-rubrici", true);
  await a.apasa("Renunță", "[role=dialog]");

  // ============================ agentul: pagina ofertei cu nota de pret ajustat; rubricile pe o oferta noua
  const pAgent = await deschide(`agent1${S}`);
  const g = unelte(pAgent);
  const dAgent = (await g.api(`/api/comenzi/${intrare.id}`)).comanda;
  verifica("M5: agentul vede prețul ajustat, dar nu are butonul", dAgent.totalLei === "16500.00" && dAgent.drepturi.ajustarePret === false);
  await pAgent.goto(`${BAZA}/oferte/${intrare.ofertaId}#date-generale`, { waitUntil: "networkidle0" }); // S29 (M12): caseta „Comandă” e in fila Date generale
  await pauza(700);
  verifica("M5: pe pagina ofertei apare nota „Preț ajustat pe comandă la 16.500,00 lei (motiv)”", /Preț ajustat pe comandă la 16\.500,00 lei \(discount acordat la livrare, plată cash\)/.test(await g.text()) && (await g.text()).includes("oferta rămâne la 17.000,00 lei"));
  await g.captura("11-oferta-nota-pret-ajustat");
  // oferta noua de test (prin API), pentru rubrici
  const noua = (await g.api("/api/oferte", { method: "POST", body: JSON.stringify({ client: { nume: "Client Rubrici Browser", telefon: "0730 127 090", adresa: "Str. Browser 1", localitate: "Cotești" } }) })).oferta;
  await pAgent.goto(`${BAZA}/oferte/${noua.id}#date-generale`, { waitUntil: "networkidle0" }); // S29 (M12): montatorul si recomandarea sunt in fila Date generale
  await pauza(700);
  await pAgent.evaluate(() => {
    const s = [...document.querySelectorAll("section.panou")].find((x) => (x.querySelector("h2")?.textContent ?? "").trim() === "Montator și recomandare");
    if (s) s.id = "rubrici";
  });
  const rubrici = () => g.text("#rubrici");
  // recomandarea din lista agentului (persoana de tip colaborator creata de suita)
  const cautare = (await pAgent.evaluateHandle(() => document.querySelector("#rubrici input[type=search]"))).asElement();
  await cautare.type("Colaborator Lista");
  await g.asteapta(async () => Boolean(await pAgent.$("#rubrici .lista-sugestii button")));
  await (await pAgent.$("#rubrici .lista-sugestii button")).click();
  verifica("M8: recomandarea aleasă din listă, cu tipul „colaborator”", await g.asteapta(async () => /Colaborator Lista · 0741 127 000.*colaborator/.test(await rubrici())));
  await g.apasa("același ca recomandarea", "#rubrici");
  verifica("M8: „același ca recomandarea” completează montatorul de execuție", await g.asteapta(async () => (await g.api(`/api/oferte/${noua.id}`)).oferta.montatorExecutie?.nume === "Colaborator Lista"));
  await pAgent.evaluate(() => document.getElementById("rubrici").scrollIntoView({ block: "center" }));
  await pauza(300);
  await g.captura("12-oferta-acelasi-ca-recomandarea");
  // cazul montator = client = recomandare: doua clicuri
  const scoate = async () => {
    const b = await pAgent.$$("#rubrici button");
    for (const x of b) if ((await x.evaluate((e) => e.textContent.trim())) === "Scoate") { await x.click(); await pauza(700); return true; }
    return false;
  };
  await scoate();
  await scoate();
  await g.asteapta(async () => { const o = (await g.api(`/api/oferte/${noua.id}`)).oferta; return o.montator === null && o.montatorExecutie === null; });
  await pauza(400);
  await g.apasa("clientul este montatorul", "#rubrici");
  await g.asteapta(async () => (await g.api(`/api/oferte/${noua.id}`)).oferta.montatorExecutie?.nume === "Client Rubrici Browser");
  await pauza(400);
  await g.apasa("același ca montatorul", "#rubrici");
  const dupaDoua = async () => (await g.api(`/api/oferte/${noua.id}`)).oferta;
  verifica("M8: montator = client = recomandare din două clicuri („clientul este montatorul”, apoi „același ca montatorul”)", await g.asteapta(async () => { const o = await dupaDoua(); return o.montatorExecutie?.telefon === "0730 127 090" && o.montator?.nume === "Client Rubrici Browser" && o.montator?.telefon === "0730 127 090"; }));
  await pauza(400);
  await pAgent.evaluate(() => document.getElementById("rubrici").scrollIntoView({ block: "center" }));
  await pauza(300);
  await g.captura("13-oferta-client-montator-recomandare");

  // ============================ Gestiunea: montatorul pe comanda da, recomandarea nu; fisa soferului
  const pGest = await deschide(`gestiune${S}`);
  const s = unelte(pGest);
  const rubriciCmd = ((await s.api("/api/comenzi?q=Client%20Rubrici")).comenzi ?? []).find((c) => c.client.nume === "Client Rubrici");
  if (!rubriciCmd) throw new Error("comanda „Client Rubrici” lipseste");
  await s.deschideComanda(nr(rubriciCmd));
  const livrare = () => s.text("#caseta-livrare");
  verifica("M8: pe comanda fără montator, Gestiunea are „Completează” și „același ca recomandarea”", /Montator \(execuție\):\s*necompletat/.test(await livrare()) && Boolean(await s.buton("același ca recomandarea", "#caseta-livrare")), `recomandare: ${rubriciCmd.recomandare?.nume}`);
  await pGest.evaluate(() => document.getElementById("caseta-livrare").scrollIntoView({ block: "center" }));
  await pauza(300);
  await s.captura("14-comanda-montator-necompletat");
  await s.apasa("același ca recomandarea", "#caseta-livrare");
  verifica("M8: un clic pe „același ca recomandarea” completează montatorul comenzii", await s.asteapta(async () => (await livrare()).includes(`${rubriciCmd.recomandare.nume} · ${rubriciCmd.recomandare.telefon}`)));
  verifica("M8: coloana Montator arată montatorul de execuție, cu recomandarea și comisionul dedesubt", /recomandare: Ionel Andrei · comision 550,00 lei/.test(await s.randul(nr(rubriciCmd))));
  // schimbarea de mana, cu telefonul obligatoriu
  await s.apasa("Schimbă", "#caseta-livrare");
  await pauza(300);
  await s.scrie("Nume", "Tudorel", "#caseta-livrare");
  await s.scrie("Telefon (îl sună", "", "#caseta-livrare");
  const salveazaOprit = await pGest.evaluate(() => [...document.querySelectorAll("#caseta-livrare form button")].find((b) => b.textContent.trim() === "Salvează")?.disabled);
  verifica("M8: montatorul completat cere telefonul (butonul oprit, „scrie și telefonul”)", salveazaOprit === true && (await livrare()).includes("scrie și telefonul"));
  await s.scrie("Telefon (îl sună", "0766 852 465", "#caseta-livrare");
  await s.scrie("Mențiuni", "montează echipa lui Tudorel", "#caseta-livrare");
  await s.captura("15-comanda-montator-formular");
  await s.apasa("Salvează", "#caseta-livrare");
  verifica("M8: Gestiunea schimbă montatorul de execuție", await s.asteapta(async () => (await livrare()).includes("Tudorel · 0766 852 465")));
  const dGest = (await s.api(`/api/comenzi/${rubriciCmd.id}`)).comanda;
  const ist = dGest.istoric.find((i) => i.camp === "montatorExecutie");
  verifica("M8: schimbarea e în istoricul comenzii, cu mențiunea", ist && ist.valoareDupa === "Tudorel · 0766 852 465" && ist.mentiuni === "montează echipa lui Tudorel");
  verifica("M8: Gestiunea nu are „Schimbă” la recomandare", !/Recomandare:[^\n]*Schimbă/.test(await s.text("#caseta-statusuri")) && dGest.drepturi.recomandare === false && (await s.text("#caseta-statusuri")).includes("Recomandare: Ionel Andrei"));
  await pGest.evaluate(() => window.scrollTo(0, 0));
  await s.captura("16-comanda-montator-si-recomandare", true);
  await pGest.goto(`${BAZA}/comenzi/fisa-soferului?c=${rubriciCmd.id}`, { waitUntil: "networkidle0" });
  await pauza(700);
  verifica("M8: fișa șoferului arată montatorul de execuție, nu recomandarea", /Montator:\s*Tudorel/.test(await s.text()) && !(await s.text()).includes("Ionel Andrei"));
  await s.captura("17-fisa-soferului-montator");

  // ============================ Administratorul firmei: recomandarea se poate schimba
  await a.deschideComanda(nr(rubriciCmd));
  verifica("M8: Administratorul firmei are „Schimbă” la recomandare", /Recomandare:[^\n]*Schimbă/.test(await a.text("#caseta-statusuri")));

  await browser.close();
  const picate = rezultate.filter((r) => !r.ok);
  console.log(`\n${rezultate.length - picate.length} / ${rezultate.length} verificări trecute`);
  process.exit(picate.length ? 1 : 0);
})().catch((e) => {
  console.error("EROARE", e);
  process.exit(2);
});
