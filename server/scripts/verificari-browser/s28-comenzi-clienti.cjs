// S28 - verificarea in browser pe instanta de pe BAZA DE TEST (datele lasate de tests/com-s28.test.ts, conturile
// "-s28@exemplu.local"): M11 (lista agentului cu ambele firme, filtrul Firma, "Doar ale mele", randul desfasurat
// pe comanda altuia), BUG-18 (comanda manuala cu localitatea si adresa lucrarii; fisa soferului), BUG-19 (cosul
// de pe fisa clientului). Nimic pe baza de lucru.
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
  page.on("dialog", (d) => d.accept());
  await page.goto(`${BAZA}/login`, { waitUntil: "networkidle0" });
  await page.type("input[type=email]", email);
  await page.type("input[type=password]", PAROLA);
  await page.click("button[type=submit]");
  const ok = await asteapta(async () => !page.url().includes("/login"));
  const api = (cale, optiuni) => page.evaluate(async (c, o) => (await fetch(c, { credentials: "include", ...(o ?? {}) })).json(), cale, optiuni);
  const captura = (nume, fullPage = false) => page.screenshot({ path: path.join(CAPTURI, `${nume}.png`), fullPage });
  const randuri = () => page.evaluate(() => [...document.querySelectorAll("table tbody tr.selectabil")].map((r) => ({ col1: r.querySelector("td.numar-oferta")?.innerText ?? "", client: r.querySelector("td.numar-oferta")?.nextElementSibling?.innerText ?? "", tot: r.innerText })));
  const comenzi = async () => {
    await page.goto(`${BAZA}/comenzi`, { waitUntil: "networkidle0" });
    await pauza(800);
  };
  const cauta = async (q) => {
    const c = await page.$("input[type=search]");
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
    const b = (await rand.evaluateHandle((r) => [...r.querySelectorAll("button")].find((x) => x.textContent.includes("Deschide")))).asElement();
    await b.click();
    await page.waitForSelector(".casete-comanda");
    await pauza(900);
  };
  const desfasurat = () => page.evaluate(() => ({ text: document.querySelector(".casete-comanda")?.innerText ?? "", butoane: [...(document.querySelector(".casete-comanda")?.querySelectorAll("button") ?? [])].map((b) => b.innerText.trim()).filter(Boolean) }));
  return { page, api, captura, ok, randuri, comenzi, cauta, desfasoara, desfasurat };
}

const campDialog = (page, eticheta) =>
  page.evaluateHandle((e) => {
    const dialog = document.querySelector('[role=dialog][aria-label="Comandă manuală"]');
    const l = [...dialog.querySelectorAll("label.camp")].find((x) => (x.querySelector("span")?.innerText || "").trim().toLowerCase().replace(/\s*\*$/, "") === e.toLowerCase());
    return l?.querySelector("input, textarea, select") ?? null;
  }, eticheta);
const scrie = async (page, eticheta, text) => {
  const el = (await campDialog(page, eticheta)).asElement();
  if (!el) throw new Error(`nu gasesc campul „${eticheta}”`);
  await el.focus();
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyA");
  await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");
  if (text) await el.type(text);
};
const valoare = async (page, eticheta) => (await campDialog(page, eticheta)).evaluate((el) => (el ? el.value : null));

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const A = await conectat(browser, "agent-a-s28@exemplu.local");
  const B = await conectat(browser, "agent-b-s28@exemplu.local");
  const G = await conectat(browser, "gestiune-s28@exemplu.local");
  verifica("conectare: agentul firmei A, agentul firmei B, Gestiunea (baza de test)", A.ok && B.ok && G.ok);

  // ================= M11 =================
  const toate = (await A.api("/api/comenzi?pageSize=100")).comenzi ?? [];
  const cA = toate.find((c) => c.numarComplet.startsWith("UZG-"));
  const cB = toate.find((c) => c.numarComplet.startsWith("UZK-"));
  const cColab = toate.find((c) => c.numarComplet.startsWith("UZC-"));
  const manualaB = toate.find((c) => c.manuala && c.client.nume === "Manuala Firmei B");
  if (!cA || !cB || !cColab || !manualaB) throw new Error("comenzile de test lipsesc - ruleaza intai tests/com-s28.test.ts");
  await A.comenzi();
  const lista = await A.randuri();
  const areNr = (l, nr) => l.some((r) => r.col1.includes(nr));
  verifica("M11: lista agentului firmei A are și comanda firmei B, și a colaboratorului, și manuala neidentificată", areNr(lista, cA.numarComplet) && areNr(lista, cB.numarComplet) && areNr(lista, cColab.numarComplet) && areNr(lista, manualaB.numarComplet), `${lista.length} rânduri pe pagină`);
  const cap = await A.page.evaluate(() => document.body.innerText.split("\n").find((l) => /active ·/.test(l)) ?? "");
  verifica("M11: numărătorile din cap se calculează pe toată lista (și „neidentificate”)", /\d+ active/.test(cap) && /[1-9]\d* neidentificat/.test(cap), cap);
  await A.captura("01-m11-lista-agentului-toate-firmele");

  // filtrul Firma
  const optiuniFirma = await A.page.evaluate(() => {
    const l = [...document.querySelectorAll("label.camp")].find((x) => (x.querySelector("span")?.innerText || "").trim().toLowerCase() === "firma");
    return l ? [...l.querySelectorAll("option")].map((o) => ({ v: o.value, t: o.textContent })) : null;
  });
  verifica("M11: agentul are filtrul „Firma”, cu ambele firme", optiuniFirma && optiuniFirma.some((o) => o.t === "Firma S28 A") && optiuniFirma.some((o) => o.t === "Firma S28 B"), optiuniFirma ? optiuniFirma.map((o) => o.t).join(" | ") : "fără filtru");
  const firmaB = optiuniFirma.find((o) => o.t === "Firma S28 B").v;
  await A.page.evaluate((v) => {
    const l = [...document.querySelectorAll("label.camp")].find((x) => (x.querySelector("span")?.innerText || "").trim().toLowerCase() === "firma");
    const s = l.querySelector("select");
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    set.call(s, v);
    s.dispatchEvent(new Event("change", { bubbles: true }));
  }, firmaB);
  await pauza(1000);
  const peB = await A.randuri();
  verifica("M11: cu filtrul pe firma B rămân doar comenzile ei", peB.length === 2 && areNr(peB, cB.numarComplet) && areNr(peB, manualaB.numarComplet), peB.map((r) => r.col1.split("\n")[0]).join(", "));
  await A.captura("02-m11-filtrul-firma");

  // pe comanda altuia: tot ce se vede, fara butoanele de modificare a detaliilor
  await A.desfasoara(cB.numarComplet);
  const alta = await A.desfasurat();
  const DE_MODIFICARE = /Modifică|Schimbă|Salvează|Adaugă observa|Atașează|Programează|Notează|Confirmă|Anulează|Ajustează/i;
  verifica("M11: pe comanda firmei B agentul vede clientul, recomandarea și comisionul ei (150,00 lei)", /Montator Recomandare/.test(alta.text) && /150,00/.test(alta.text), alta.text.split("\n").filter((l) => /omision|ecomandare/.test(l)).slice(0, 3).join(" | "));
  verifica("M11: pe comanda altuia nu are niciun buton de modificare a detaliilor", alta.butoane.length > 0 && !alta.butoane.some((b) => DE_MODIFICARE.test(b)), alta.butoane.join(" | "));
  verifica("M11: returul rămâne disponibil și pe comanda altuia („+ Retur”)", alta.butoane.some((b) => /Retur/.test(b)), alta.butoane.filter((b) => /Retur|Aviz|Doc/.test(b)).join(" | "));
  await A.page.evaluate(() => document.querySelector(".casete-comanda")?.scrollIntoView({ block: "start" }));
  await pauza(300);
  await A.captura("03-m11-comanda-altuia-desfasurata", true);
  const docB = await A.page.evaluate((nr) => {
    const rand = [...document.querySelectorAll("table tbody tr.selectabil")].find((r) => r.innerText.includes(nr));
    return rand ? [...rand.querySelectorAll("button")].map((b) => b.innerText.trim()) : [];
  }, cB.numarComplet);
  verifica("M11: „Doc. ▾” rămâne pe rândul comenzii altuia", docB.some((b) => b.startsWith("Doc.")), docB.join(" | "));

  // "Doar ale mele"
  await A.comenzi();
  const bifa = (await A.page.evaluateHandle(() => [...document.querySelectorAll("label.camp-bifa")].find((l) => l.innerText.includes("Doar ale mele"))?.querySelector("input") ?? null)).asElement();
  verifica("M11: agentul are comutatorul „Doar ale mele”, implicit oprit", bifa && !(await bifa.evaluate((x) => x.checked)));
  await bifa.click();
  await pauza(1000);
  const mele = await A.randuri();
  const capMele = await A.page.evaluate(() => document.body.innerText.split("\n").find((l) => /active ·/.test(l)) ?? "");
  verifica("M11: cu „Doar ale mele” rămâne doar comanda lui, iar numărătorile urmează ce e afișat", mele.length === 1 && areNr(mele, cA.numarComplet) && /^1 active/.test(capMele.trim()) && /0 neidentificat/.test(capMele), `${mele.map((r) => r.col1.split("\n")[0]).join(", ")} · ${capMele}`);
  await A.captura("04-m11-doar-ale-mele");
  await A.desfasoara(cA.numarComplet);
  const proprie = await A.desfasurat();
  verifica("M11: pe comanda LUI butoanele de modificare rămân", proprie.butoane.some((b) => DE_MODIFICARE.test(b)), proprie.butoane.filter((b) => DE_MODIFICARE.test(b)).slice(0, 6).join(" | "));

  // Gestiunea si colaboratorul nu au comutatorul
  await G.comenzi();
  verifica("M11: Gestiunea nu are „Doar ale mele” (rămâne cum era)", !(await G.page.evaluate(() => [...document.querySelectorAll("label.camp-bifa")].some((l) => l.innerText.includes("Doar ale mele")))));

  // telefon (390 px): lista agentului, cu filtrele
  await A.page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await A.comenzi();
  const latime = await A.page.evaluate(() => document.documentElement.scrollWidth);
  const peTelefon = await A.randuri();
  verifica("M11 (390 px): lista agentului arată comenzile ambelor firme și nu iese din lățimea telefonului", latime <= 392 && areNr(peTelefon, cB.numarComplet), `${latime} px, ${peTelefon.length} carduri`);
  await A.captura("05-m11-telefon");
  await A.page.setViewport({ width: 1366, height: 900 });

  // ================= BUG-18 =================
  await G.comenzi();
  const buton = (await G.page.evaluateHandle(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Comandă manuală")))).asElement();
  await buton.click();
  await G.page.waitForSelector('[role=dialog][aria-label="Comandă manuală"]');
  const firmaSel = (await campDialog(G.page, "Firma")).asElement();
  if (firmaSel) {
    await G.page.evaluate((s) => {
      const o = [...s.options].find((x) => x.textContent === "Firma S28 A");
      const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      set.call(s, o.value);
      s.dispatchEvent(new Event("change", { bubbles: true }));
    }, firmaSel);
  }
  await scrie(G.page, "Client", "Client Cu Fisa");
  await scrie(G.page, "Telefon", "0730 132 001");
  await scrie(G.page, "Localitate", "Golești");
  verifica("BUG-18: „Localitatea lucrării” pornește precompletată cu localitatea clientului", (await valoare(G.page, "Localitatea lucrării")) === "Golești", `valoare = ${await valoare(G.page, "Localitatea lucrării")}`);
  await scrie(G.page, "Localitatea lucrării", "Mărășești");
  await scrie(G.page, "Adresa lucrării", "Str. Probei nr. 4");
  await scrie(G.page, "Rezumatul comenzii", "probă BUG-18: localitate și adresă proprii");
  await scrie(G.page, "Total cu TVA (lei)", "100");
  await G.captura("06-bug18-formularul-comenzii-manuale");
  await G.page.evaluate(() => document.querySelector('[role=dialog][aria-label="Comandă manuală"] .actiuni button.buton:not(.secundar)').click());
  verifica("BUG-18: comanda manuală cu localitatea și adresa lucrării se creează", await asteapta(async () => !(await G.page.$('[role=dialog][aria-label="Comandă manuală"]'))));
  await pauza(900);
  await G.cauta("probei nr. 4");
  const cuAdresa = await G.randuri();
  verifica("BUG-18: rândul arată localitatea și adresa COMENZII („Mărășești · Str. Probei nr. 4”), găsit și la căutarea după adresă", cuAdresa.length === 1 && cuAdresa[0].client.includes("Mărășești · Str. Probei nr. 4"), cuAdresa.map((r) => r.client.replace(/\n/g, " | ")).join(" || "));
  await G.captura("07-bug18-randul-cu-adresa-comenzii");
  const idCuAdresa = ((await G.api("/api/comenzi?q=probei%20nr.%204")).comenzi ?? [])[0]?.id;

  // a doua: fara adresa, localitatea lucrarii lasata cum vine
  await G.cauta("");
  const buton2 = (await G.page.evaluateHandle(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Comandă manuală")))).asElement();
  await buton2.click();
  await G.page.waitForSelector('[role=dialog][aria-label="Comandă manuală"]');
  const firmaSel2 = (await campDialog(G.page, "Firma")).asElement();
  if (firmaSel2) {
    await G.page.evaluate((s) => {
      const o = [...s.options].find((x) => x.textContent === "Firma S28 A");
      const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      set.call(s, o.value);
      s.dispatchEvent(new Event("change", { bubbles: true }));
    }, firmaSel2);
  }
  await scrie(G.page, "Client", "Client Cu Fisa");
  await scrie(G.page, "Telefon", "0730 132 001");
  await scrie(G.page, "Localitate", "Golești");
  await scrie(G.page, "Rezumatul comenzii", "probă BUG-18: fără adresă proprie");
  await scrie(G.page, "Total cu TVA (lei)", "100");
  await G.page.evaluate(() => document.querySelector('[role=dialog][aria-label="Comandă manuală"] .actiuni button.buton:not(.secundar)').click());
  await asteapta(async () => !(await G.page.$('[role=dialog][aria-label="Comandă manuală"]')));
  await pauza(900);
  await G.cauta("fara adresa proprie");
  const fara = ((await G.api("/api/comenzi?pageSize=100")).comenzi ?? []).find((c) => c.rezumat === "probă BUG-18: fără adresă proprie");
  const fisaClientului = ((await A.api("/api/clienti?telefon=0730132001")).clienti ?? [])[0];
  verifica("BUG-18: fără adresă, rândul arată doar localitatea — nu adresa din fișa clientului", fara && fara.client.localitate === "Golești" && fara.client.adresa === null && Boolean(fisaClientului?.adresa) && fisaClientului.adresa !== "-", `rând: ${JSON.stringify(fara?.client)} · fișa clientului: ${fisaClientului?.adresa}`);
  verifica("BUG-18: adresa scrisă pe comandă a ajuns și în fișa clientului; localitatea din fișă a rămas", fisaClientului.adresa === "Str. Probei nr. 4" && fisaClientului.localitate === "Golești", `${fisaClientului.adresa}, ${fisaClientului.localitate}`);
  // fisa soferului pentru cele doua
  const fisa = (await G.api("/api/comenzi/fisa-soferului", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comenzi: [idCuAdresa, fara.id] }) })).fisa;
  verifica("BUG-18: fișa șoferului arată localitatea și adresa comenzii („Str. Probei nr. 4, Mărășești”; la a doua doar „Golești”)", fisa && fisa.blocuri[0].adresa === "Str. Probei nr. 4, Mărășești" && fisa.blocuri[1].adresa === "Golești", fisa ? fisa.blocuri.map((b) => b.adresa).join(" || ") : "fără fișă");
  await G.page.goto(`${BAZA}/comenzi/fisa-soferului?c=${idCuAdresa},${fara.id}`, { waitUntil: "networkidle0" });
  await pauza(900);
  const textFisa = await G.page.evaluate(() => document.body.innerText);
  verifica("BUG-18: pe ecranul fișei șoferului apare „Adresa: Str. Probei nr. 4, Mărășești”", /Adresa:\s*Str\. Probei nr\. 4, Mărășești/.test(textFisa));
  await G.captura("08-bug18-fisa-soferului", true);

  // ================= BUG-19 =================
  const tinta = ((await A.api("/api/clienti?telefon=0730133003")).clienti ?? [])[0];
  if (!tinta) throw new Error("clientul „Client BUG-17” lipseste");
  const deschideFisa = async (S) => {
    await S.page.goto(`${BAZA}/clienti/${tinta.id}`, { waitUntil: "networkidle0" });
    await pauza(500);
  };
  const cosuri = (S) => S.page.evaluate(() => [...document.querySelectorAll(".date-client button.cos")].map((b) => b.getAttribute("aria-label")));
  const randFisa = (S, eticheta) => S.page.evaluate((e) => {
    const dt = [...document.querySelectorAll(".date-client dt")].find((x) => x.innerText.trim().toLowerCase() === e.toLowerCase());
    return dt?.nextElementSibling?.innerText.trim() ?? null;
  }, eticheta);
  const apasaCos = async (S, cuvant) => {
    const b = (await S.page.evaluateHandle((c) => [...document.querySelectorAll(".date-client button.cos")].find((x) => (x.getAttribute("aria-label") || "").includes(c)) ?? null, cuvant)).asElement();
    await b.click();
    await pauza(300);
  };
  const confirmare = (S) => S.page.evaluate(() => document.querySelector(".confirmare-stergere")?.innerText ?? null);
  const apasaIn = async (S, text) => {
    const b = (await S.page.evaluateHandle((t) => [...document.querySelectorAll(".confirmare-stergere button")].find((x) => x.innerText.trim() === t) ?? null, text)).asElement();
    await b.click();
    await pauza(700);
  };
  await deschideFisa(A);
  verifica("BUG-19: pe fișa clientului, agentul lui are coșul la adresă, e-mail și observații — nu și la telefon", JSON.stringify(await cosuri(A)) === JSON.stringify(["Șterge adresa din fișă", "Șterge e-mailul din fișă", "Șterge observațiile din fișă"]), (await cosuri(A)).join(" | "));
  await A.captura("09-bug19-fisa-clientului-cu-cosuri");
  await apasaCos(A, "e-mailul");
  const intrebare = await confirmare(A);
  verifica("BUG-19: coșul cere confirmare („Ștergi e-mailul „…” din fișa clientului?”)", intrebare && intrebare.includes("Ștergi e-mailul „ramane@exemplu.local” din fișa clientului?"), (intrebare ?? "").replace(/\n/g, " | "));
  await A.captura("10-bug19-confirmarea");
  await apasaIn(A, "Nu");
  verifica("BUG-19: „Nu” lasă e-mailul neatins", (await randFisa(A, "E-mail")) === "ramane@exemplu.local" && (await confirmare(A)) === null);
  await apasaCos(A, "e-mailul");
  await apasaIn(A, "Da, șterge");
  const dupaEmail = ((await A.api("/api/clienti?telefon=0730133003")).clienti ?? [])[0];
  verifica("BUG-19: „Da, șterge” golește e-mailul din fișă; coșul lui dispare", (await randFisa(A, "E-mail")) === "—" && dupaEmail.email === null && !(await cosuri(A)).some((c) => c.includes("e-mailul")), `fișă: ${JSON.stringify(dupaEmail)}`);
  await apasaCos(A, "adresa");
  await apasaIn(A, "Da, șterge");
  verifica("BUG-19: adresa ștearsă apare „fără adresă” (localitatea rămâne)", (await randFisa(A, "Adresa")) === "fără adresă, Panciu", await randFisa(A, "Adresa"));
  await A.captura("11-bug19-dupa-stergere");
  // oferta clientului isi pastreaza adresa lucrarii; pagina ei arata "fara adresa" la client
  const oferte = (await A.api(`/api/clienti/${tinta.id}`)).oferte ?? [];
  const oferta = (await A.api(`/api/oferte/${oferte[0].id}`)).oferta;
  verifica("BUG-19: oferta își păstrează adresa lucrării ei („Str. R 1”)", oferta && oferta.adresaLucrarii === "Str. R 1", `adresaLucrarii = ${oferta?.adresaLucrarii}`);
  // agentul altei firme nu are cosul
  await deschideFisa(B);
  verifica("BUG-19: agentul altei firme (fără oferte pentru client) nu are niciun coș pe fișă", (await cosuri(B)).length === 0 && (await randFisa(B, "Observații")) === "rămâne", `${(await cosuri(B)).length} coșuri`);
  await B.captura("12-bug19-fisa-fara-cos-alt-agent");

  await browser.close();
  const picate = rezultate.filter((r) => !r.ok);
  console.log(`\n${rezultate.length - picate.length} / ${rezultate.length} verificări trecute`);
  process.exit(picate.length ? 1 : 0);
})().catch((e) => {
  console.error("EROARE", e);
  process.exit(2);
});
