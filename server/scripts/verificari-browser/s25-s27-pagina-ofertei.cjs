// Scenariile de PAGINA OFERTEI din S25 - S27, rulate pe pagina pe trei file (S29, M12), pe instanta de pe
// BAZA DE TEST (datele lasate de tests/ofe-s29.test.ts). Scripturile din acele sesiuni lucrau pe baza de lucru,
// cu contul de proba (creau oferte de proba acolo); aici aceleasi purtari se verifica fara nicio scriere pe
// baza de lucru: S25 (casuta de cantitate, Tab / Enter, cosul doar cu clic, cautarea fara diacritice, modurile
// de cantitate), S26a (telefonul optional, „fără telefon”), S26b (montator si recomandare), S27 (sugestiile pe
// nume, speciale 2 ML de sine statatoare, montatorul retinut in lista).
// Folosire: node s25-s27-pagina-ofertei.cjs <adresa> <cont-agent> <parola> <folder-capturi>
const { pauza, asteapta, verificari, porneste, conectat, scrieIn } = require("./comun.cjs");
const [BAZA, EMAIL, PAROLA, CAPTURI] = process.argv.slice(2);
const v = verificari();

(async () => {
  const browser = await porneste();
  const A = await conectat(browser, BAZA, EMAIL, PAROLA, CAPTURI);
  const { page } = A;
  v.verifica("conectare cu agentul de test", A.ok);

  const model = (await A.api(`/api/oferte/${((await A.api("/api/oferte?q=" + encodeURIComponent("Ordine Documente"))).oferte ?? [])[0].id}`)).oferta;
  const inv = model.invelitori[0];
  const creeaza = async (nume, cuInvelitoare) => {
    const o = (await A.api("/api/oferte", { method: "POST", body: { client: { nume, adresa: "Str. Scenariilor 5", localitate: "Focșani" } } })).oferta;
    if (cuInvelitoare) await A.api(`/api/oferte/${o.id}/produse`, { method: "PUT", body: { grupaPct: "0", invelitori: [{ cheie: "I1", produsId: inv.produsId, culoare: inv.culoare, panotaj: inv.panotaj.map((p) => ({ lungimeM: p.lungimeM, bucati: p.bucati })) }], linii: [], sipci: [], zonaB: [] } });
    return o;
  };
  const o1 = await creeaza("Scenarii Pagina Ofertei", true);
  const detaliu = async (id = o1.id) => (await A.api(`/api/oferte/${id}`)).oferta;
  const deschide = async (id, ancora = "#produse") => {
    await page.goto(`${BAZA}/oferte/${id}${ancora}`, { waitUntil: "networkidle0" });
    await page.waitForSelector(".oferta-fix");
    await pauza(1800);
  };
  const salvat = async () => {
    await pauza(350);
    return asteapta(async () => (await page.evaluate(() => document.querySelector(".stare-salvare")?.textContent.trim())) === "salvat", 15000);
  };
  const casuta = (rubrica, rand) => page.evaluateHandle((r, i) => document.querySelectorAll(`#rubrica-${r} tbody tr`)[i]?.querySelector("input.casuta-cantitate") ?? null, rubrica, rand);
  const focusPe = () => page.evaluate(() => ({ eticheta: document.activeElement?.getAttribute("aria-label") ?? "", rand: document.activeElement?.dataset?.rand ?? null, tag: document.activeElement?.tagName, clasa: document.activeElement?.className ?? "" }));

  // ================= S25: casuta de cantitate, tastatura, cosul, cautarea, modurile =================
  await deschide(o1.id);
  const c0 = (await casuta("standard", 0)).asElement();
  await c0.focus();
  await page.keyboard.type("1,5");
  v.verifica("S25 (BUG-8): căsuța de cantitate păstrează exact ce ai tastat („1,5”)", (await c0.evaluate((x) => x.value)) === "1,5");
  await page.keyboard.type("x");
  v.verifica("S25: literele nu intră în căsuță", (await c0.evaluate((x) => x.value)) === "1,5");
  await page.keyboard.press("Tab");
  let f = await focusPe();
  v.verifica("S25 (BUG-6): Tab trece la căsuța rândului următor, peste coș", f.tag === "INPUT" && f.rand === "1" && /^Cantitate /.test(f.eticheta), `${f.tag} · rândul ${f.rand}`);
  await page.keyboard.type("4");
  await page.keyboard.press("Enter");
  f = await focusPe();
  v.verifica("S25 (BUG-6): Enter trece pe cantitatea rândului următor", f.tag === "INPUT" && f.rand === "2", `rândul ${f.rand}`);
  const cosuri = await page.evaluate(() => [...document.querySelectorAll("#rubrica-standard button.cos")].map((b) => b.tabIndex));
  v.verifica("S25 (BUG-11): coșurile nu sunt în drumul tastaturii (ștergere doar cu clic)", cosuri.length === 2 && cosuri.every((t) => t === -1), `${cosuri.length} coșuri`);
  await salvat();
  const linii = (await detaliu()).linii.filter((l) => l.rubrica === "Accesorii standard").map((l) => l.cantitate);
  v.verifica("S25: „1,5” ajunge în ofertă ca 1,5, iar 4 ca 4", JSON.stringify(linii) === '["1.5","4"]', linii.join(" · "));
  const cautare = (await page.evaluateHandle(() => document.querySelector("#rubrica-standard input[type=search]"))).asElement();
  await scrieIn(page, cautare, "bordura");
  const cuDiacritice = await asteapta(async () => page.evaluate(() => [...document.querySelectorAll("#rubrica-standard .lista-sugestii li")].some((li) => /Bordură/.test(li.textContent))), 8000);
  v.verifica("S25 (BUG-10): „bordura” (fără diacritice) găsește „Bordură …” în „+ Adaugă…”", cuDiacritice);
  await scrieIn(page, cautare, "");
  // modurile de cantitate (S25b): comutarea nu pierde pozitiile
  const pozitii = () => page.evaluate(() => [...document.querySelectorAll("#rubrica-invelitori input.casuta-cantitate")].map((i) => i.value).filter(Boolean).join(" "));
  const inaintePozitii = await pozitii();
  const mod = async (text) => {
    await page.evaluate((t) => [...document.querySelectorAll('#rubrica-invelitori [aria-label="Modul de cantitate"] button')].find((b) => b.textContent.trim() === t).click(), text);
    await pauza(300);
  };
  const moduri = await page.evaluate(() => [...document.querySelectorAll('#rubrica-invelitori [aria-label="Modul de cantitate"] button')].map((b) => b.textContent.trim()));
  await mod("Combinat");
  await mod("Panotaj");
  v.verifica("S25b (BUG-12): cele trei moduri (Panotaj · mp direct · Combinat); comutarea păstrează pozițiile", JSON.stringify(moduri) === '["Panotaj","mp direct","Combinat"]' && (await pozitii()) === inaintePozitii && inaintePozitii.length > 5, inaintePozitii.slice(0, 40));
  await salvat();
  await A.captura("c-01-s25-casute-si-moduri");

  // ================= S26a: telefonul optional, marcajul „fără telefon” =================
  const marcaj = await page.evaluate(() => ({ rand: Boolean(document.querySelector(".rand-oferta .eticheta-fara-telefon")), eticheta: [...document.querySelectorAll("#client label.camp > span")].map((s) => s.textContent.trim()).find((t) => t.startsWith("Telefon")) ?? "" }));
  v.verifica("S26a (M6): oferta fără telefon poartă „fără telefon” în rândul ofertei; câmpul spune „obligatoriu la „Comandat””", marcaj.rand && /obligatoriu la „Comandat”/.test(marcaj.eticheta), marcaj.eticheta);

  // ================= S26b (M8): montator si recomandare =================
  await page.click("#tab-generale");
  await pauza(400);
  const montator = () => page.evaluate(() => {
    const s = [...document.querySelectorAll("#fila-generale section.panou")].find((x) => x.querySelector("h2")?.textContent.trim() === "Montator și recomandare");
    return { rubrici: [...s.querySelectorAll("h3")].map((h) => h.textContent.trim()), text: s.textContent.replace(/\s+/g, " "), butoane: [...s.querySelectorAll("button")].map((b) => ({ t: b.textContent.trim(), oprit: b.disabled })) };
  });
  let m = await montator();
  v.verifica("S26b (M8): două rubrici — „Recomandare — comision” și „Montator (execuție)”", JSON.stringify(m.rubrici) === '["Recomandare — comision","Montator (execuție)"]');
  v.verifica("S26b (M8): fără telefonul clientului, „clientul este montatorul” e explicat, nu oferit", /„clientul este montatorul” cere telefonul clientului/.test(m.text) && !m.butoane.some((b) => b.t === "clientul este montatorul"));
  const campMontator = async (eticheta) => (await page.evaluateHandle((e) => [...document.querySelectorAll("#fila-generale label.camp")].find((l) => l.querySelector("span").textContent.trim().startsWith(e))?.querySelector("input") ?? null, eticheta)).asElement();
  await scrieIn(page, await campMontator("Cine montează"), "Montator Scenariu S29");
  await pauza(300);
  m = await montator();
  v.verifica("S26b (M8): montatorul completat cere telefonul (butonul oprit, cu „scrie și telefonul”)", m.butoane.some((b) => b.t === "Salvează montatorul" && b.oprit) && /scrie și telefonul/.test(m.text));
  await scrieIn(page, await campMontator("Telefon (îl sună"), "0730 135 001");
  await pauza(200);
  await page.evaluate(() => [...document.querySelectorAll("#fila-generale button")].find((b) => b.textContent.trim() === "Salvează montatorul").click());
  await asteapta(async () => Boolean((await detaliu()).montatorExecutie), 8000);
  const dupaMontator = await detaliu();
  v.verifica("S26b (M8): montatorul scris de mână se salvează, separat de recomandare", dupaMontator.montatorExecutie?.nume === "Montator Scenariu S29" && !dupaMontator.montator, JSON.stringify(dupaMontator.montatorExecutie));
  await pauza(400);
  m = await montator();
  v.verifica("S26b (M8): cu montatorul completat, la recomandare apare „același ca montatorul”", m.butoane.some((b) => b.t === "același ca montatorul"));
  await A.captura("c-02-s26b-montator-si-recomandare");

  // ================= S27: BUG-16 (montatorul retinut), BUG-15 (sugestii pe nume), M9 (speciale de sine statatoare) =================
  const o2 = await creeaza("Scenarii Fără Învelitoare", false);
  await deschide(o2.id, "#date-generale");
  await scrieIn(page, await campMontator("Cine montează"), "Montator Sc");
  const propus = await asteapta(async () => page.evaluate(() => [...document.querySelectorAll("#fila-generale .lista-sugestii button")].some((b) => /Montator Scenariu S29 · 0730 135 001/.test(b.textContent))), 8000);
  v.verifica("S27 (BUG-16): montatorul scris de mână a intrat în listă și e propus pe oferta următoare", propus);
  await scrieIn(page, await campMontator("Cine montează"), "");
  const nume = (await page.evaluateHandle(() => [...document.querySelectorAll("#client label.camp")].find((l) => l.querySelector("span").textContent.trim().startsWith("Nume"))?.querySelector("input"))).asElement();
  const sugestiiNume = () => page.evaluate(() => [...document.querySelectorAll('#client ul[aria-label="Clienți cu acest nume"] li')].map((li) => li.textContent.replace(/\s+/g, " ").trim()));
  await scrieIn(page, nume, "Sc");
  await pauza(900);
  const subTrei = await sugestiiNume();
  await scrieIn(page, nume, "pagina");
  await asteapta(async () => (await sugestiiNume()).some((t) => /Scenarii Pagina Ofertei/.test(t)), 8000);
  const peNume = await sugestiiNume();
  v.verifica("S27 (BUG-15): sub 3 litere nicio sugestie; de la 3 litere apar clienții contului, cu localitatea", subTrei.length === 0 && peNume.some((t) => /Scenarii Pagina Ofertei/.test(t) && /Focșani/.test(t)), peNume.join(" | "));
  await A.captura("c-03-s27-sugestii-pe-nume");
  // S29 (retus la M12): lista se inchide cand iesi din campul Nume; nu propune clientul de care oferta e deja
  // legata; nu sta deschisa la intrarea in fila (numele vine din oferta salvata, nu l-ai scris tu)
  await page.click("#antet input[type=date]");
  await pauza(300);
  v.verifica("S29 (BUG-15): lista de sugestii se închide când ieși din câmpul Nume", (await sugestiiNume()).length === 0);
  await scrieIn(page, nume, "Scenarii");
  await asteapta(async () => (await sugestiiNume()).length > 0, 8000);
  await pauza(500);
  const faraCelLegat = await sugestiiNume();
  v.verifica("S29 (BUG-15): nu-ți propune clientul de care oferta e deja legată (doar pe ceilalți)", faraCelLegat.length >= 1 && faraCelLegat.every((t) => !/Scenarii Fără Învelitoare/.test(t)) && faraCelLegat.some((t) => /Scenarii Pagina Ofertei/.test(t)), faraCelLegat.join(" | "));
  await page.evaluate(() => [...document.querySelectorAll('#client ul[aria-label="Clienți cu acest nume"] li')].find((li) => /Scenarii Pagina Ofertei/.test(li.textContent)).click());
  await pauza(400);
  const dupaAlegere = await page.evaluate(() => ({ nume: [...document.querySelectorAll("#client label.camp")].find((l) => l.querySelector("span").textContent.trim().startsWith("Nume")).querySelector("input").value, lista: document.querySelectorAll('#client ul[aria-label="Clienți cu acest nume"] li').length }));
  v.verifica("S29 (BUG-15): alegerea completează numele și închide lista", dupaAlegere.nume === "Scenarii Pagina Ofertei" && dupaAlegere.lista === 0, JSON.stringify(dupaAlegere));
  await scrieIn(page, nume, "Scenarii Fără Învelitoare");
  await page.click("#antet input[type=date]");
  await pauza(300);
  await deschide(o1.id, "#date-generale");
  const laIntrare = await page.evaluate(() => ({ nume: [...document.querySelectorAll("#client label.camp")].find((l) => l.querySelector("span").textContent.trim().startsWith("Nume")).querySelector("input").value, liste: document.querySelectorAll("#client ul.lista-sugestii").length }));
  v.verifica("S29 (BUG-15): la intrarea în fila Date generale lista de sugestii NU e deschisă", laIntrare.nume === "Scenarii Pagina Ofertei" && laIntrare.liste === 0, JSON.stringify(laIntrare));
  // la oferta noua sugestiile merg ca pana acum: de la 3 litere, iar alegerea completeaza datele clientului
  await page.goto(`${BAZA}/oferte/noua`, { waitUntil: "networkidle0" });
  await pauza(600);
  const numeNou = (await page.evaluateHandle(() => [...document.querySelectorAll("label.camp")].find((l) => l.querySelector("span").textContent.trim().startsWith("Nume"))?.querySelector("input"))).asElement();
  const sugestiiNoua = () => page.evaluate(() => [...document.querySelectorAll('ul[aria-label="Clienți cu acest nume"] li')].map((li) => li.textContent.replace(/\s+/g, " ").trim()));
  await scrieIn(page, numeNou, "pagina");
  await asteapta(async () => (await sugestiiNoua()).some((t) => /Scenarii Pagina Ofertei/.test(t)), 8000);
  const laNoua = await sugestiiNoua();
  await page.evaluate(() => [...document.querySelectorAll('ul[aria-label="Clienți cu acest nume"] li')].find((li) => /Scenarii Pagina Ofertei/.test(li.textContent)).click());
  await pauza(400);
  const completat = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("label.camp")].map((l) => [l.querySelector("span").textContent.trim().replace(/\s*\*$/, ""), l.querySelector("input")?.value ?? ""])));
  v.verifica("S27 (BUG-15), la ofertă nouă: sugestiile apar de la 3 litere, iar alegerea completează datele clientului și închide lista", laNoua.some((t) => /Scenarii Pagina Ofertei/.test(t)) && completat["Nume"] === "Scenarii Pagina Ofertei" && completat["Adresa lucrării"] === "Str. Scenariilor 5" && completat["Localitate"] === "Focșani" && (await sugestiiNoua()).length === 0, `${completat["Nume"]} · ${completat["Adresa lucrării"]} · ${completat["Localitate"]}`);
  await deschide(o2.id, "#date-generale");
  await page.click("#tab-produse");
  await pauza(500);
  const butonSpeciale = await page.evaluate(() => [...document.querySelectorAll("#rubrica-speciale button")].map((b) => b.textContent.trim()).find((t) => t.startsWith("+ Accesorii speciale 2 ML de sine stătătoare")) ?? "");
  v.verifica("S27 (M9): fără învelitoare, „+ Accesorii speciale 2 ML de sine stătătoare” e disponibil", butonSpeciale !== "");
  await page.evaluate(() => [...document.querySelectorAll("#rubrica-speciale button")].find((b) => b.textContent.trim().startsWith("+ Accesorii speciale 2 ML de sine stătătoare")).click());
  await pauza(300);
  const alege = async (eticheta, index) => {
    await page.evaluate((e, i) => {
      const s = [...document.querySelectorAll("#rubrica-speciale label.camp")].find((l) => l.querySelector("span").textContent.trim() === e).querySelector("select");
      const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      set.call(s, s.options[i].value);
      s.dispatchEvent(new Event("change", { bubbles: true }));
    }, eticheta, index);
    await pauza(250);
  };
  await alege("Finisaj", 1);
  await alege("Grosime", 1);
  await alege("Culoare", 1);
  await page.evaluate(() => [...document.querySelectorAll("#rubrica-speciale button")].find((b) => b.textContent.trim() === "Deschide secțiunea").click());
  await asteapta(async () => page.evaluate(() => document.querySelectorAll("#rubrica-speciale tbody tr").length >= 6), 8000);
  await pauza(600);
  const sectiune = await page.evaluate(() => ({ banda: document.querySelector("#rubrica-speciale .banda")?.textContent.trim() ?? "", randuri: document.querySelectorAll("#rubrica-speciale tbody tr").length, trepte: [...document.querySelectorAll("#rubrica-speciale tbody tr select")].map((s) => s.value) }));
  v.verifica("S27 (M9): secțiunea se deschide cu cheia aleasă și exact 6 rânduri presetate pe D01", /de sine stătătoare/i.test(sectiune.banda) && sectiune.randuri === 6 && sectiune.trepte.every((t) => t === "D01"), `${sectiune.banda} · ${sectiune.randuri} rânduri`);
  const cSpec = (await casuta("speciale", 0)).asElement();
  await cSpec.focus();
  await page.keyboard.type("16");
  await salvat();
  const o2d = await detaliu(o2.id);
  const speciale = o2d.linii.filter((l) => l.rubrica === "Accesorii speciale (2 ML)");
  v.verifica("S27 (M9): linia se salvează cu cheia ei, fără învelitoare; se generează un formular fără învelitoare", speciale.length === 1 && speciale[0].cantitate === "16" && !speciale[0].invelitoareId && Boolean(speciale[0].culoareRal) && o2d.structura.rezultat.formulareBilka.length === 1, `${speciale[0]?.culoareRal} · ${o2d.structura.rezultat.textFormulare.slice(0, 60)}`);
  await A.captura("c-04-s27-speciale-de-sine-statatoare");
  const jos = await page.evaluate(() => document.querySelector(".rezultat-scurt")?.textContent.replace(/\s+/g, " ").trim() ?? "");
  v.verifica("S27 (M9): rezultatul pe scurt din josul filei Produse spune câte formulare se generează", /formular/i.test(jos) && /Mergi la Prețuri/.test(jos), jos.slice(0, 90));

  await browser.close();
  process.exit(v.sumar() ? 1 : 0);
})().catch((e) => {
  console.error("EROARE", e);
  process.exit(2);
});
