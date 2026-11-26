// S29b - M14: ordinea finisajelor in listele de selectie, din lista de referinta "ordine_finisaj", pe instanta
// de pe BAZA DE TEST (datele lasate de tests/ofe-s29b.test.ts si tests/adm-ordine-finisaj.test.ts, rulate impreuna).
// Verifica: cascada unei tigle si a unei table cutate, sistemul pluvial, o pozitie la lungimi, o sectiune de sine
// statatoare, sipca, „Află preț”, si ca ordinea schimbata de Admin general ajunge pe ecran (apoi o pune la loc).
// Folosire: node s29b-m14-finisaje.cjs <adresa> <cont-agent> <parola> <folder-capturi> <cont-admin-general>
const { pauza, asteapta, verificari, porneste, conectat, scrieIn } = require("./comun.cjs");
const [BAZA, EMAIL, PAROLA, CAPTURI, ADMIN] = process.argv.slice(2);
const v = verificari();

(async () => {
  const browser = await porneste();
  const A = await conectat(browser, BAZA, EMAIL, PAROLA, CAPTURI);
  const { page } = A;
  v.verifica("conectare cu agentul de test", A.ok);

  const ordine = (await A.api("/api/oferte/catalog/referinte")).ordineFinisaje ?? [];
  v.verifica("lista de referinta ajunge la ecran: 13 finisaje, in ordinea de pornire", ordine.join(" · ") === "lucios · colorat (lucios) · mat · Grande Mat · Wood · RAL 8003 · zincat · dubluvopsit lucios · dubluvopsit lucios SSAB · dubluvopsit mat · dubluvopsit mat SSAB · Magnelis · Aluzinc", ordine.join(" · "));
  // o lista e "in ordine" cand finisajele ei apar in ordinea listei de referinta (cele necunoscute, la sfarsit)
  const inOrdine = (lista, ref = ordine) => {
    const rang = lista.map((f) => (ref.indexOf(f) < 0 ? 999 : ref.indexOf(f)));
    return lista.length > 0 && rang.every((r, k) => k === 0 || rang[k - 1] <= r);
  };

  const o = (await A.api("/api/oferte", { method: "POST", body: { client: { nume: "Probă Finisaje M14", telefon: "0730 290 114", adresa: "Str. Probei 14", localitate: "Focșani" } } })).oferta;
  const deschide = async () => {
    await page.goto(`${BAZA}/oferte`, { waitUntil: "networkidle0" });
    await page.goto(`${BAZA}/oferte/${o.id}#produse`, { waitUntil: "networkidle0" });
    await page.waitForSelector("#rubrica-lungimi");
    await pauza(2000);
  };
  // lista derulanta dupa eticheta ei (campurile obisnuite: label.camp; cascada invelitorii: label.bi-rand)
  const lista = (radacina, eticheta) =>
    page.evaluate((R, e) => {
      const et = [...document.querySelectorAll(`${R} label.camp, ${R} label.bi-rand`)].filter((l) => (l.querySelector("span")?.textContent ?? "").trim() === e).at(-1);
      const s = et?.querySelector("select");
      return s ? { valoare: s.value, optiuni: [...s.options].map((x) => x.value).filter(Boolean) } : null;
    }, radacina, eticheta);
  const alege = async (radacina, eticheta, cum) => {
    const r = await page.evaluate((R, e, c) => {
      const et = [...document.querySelectorAll(`${R} label.camp, ${R} label.bi-rand`)].filter((l) => (l.querySelector("span")?.textContent ?? "").trim() === e).at(-1);
      const s = et?.querySelector("select");
      if (!s) return null;
      const opt = [...s.options].map((x) => x.value).filter(Boolean);
      const ales = typeof c === "number" ? opt[c] : opt.find((x) => x.toLowerCase().includes(c.toLowerCase()));
      if (ales === undefined) return `fara „${c}” in: ${opt.join(" | ")}`;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, ales);
      s.dispatchEvent(new Event("change", { bubbles: true }));
      return ales;
    }, radacina, eticheta, cum);
    await pauza(450);
    return r;
  };
  const apasa = async (radacina, text) => {
    await page.evaluate((R, t) => [...document.querySelectorAll(`${R} button`)].find((x) => x.textContent.trim().startsWith(t))?.click(), radacina, text);
    await pauza(500);
  };

  await deschide();
  // ---------------- cascada invelitorii: o tigla si o tabla cutata ----------------
  const INV = "#rubrica-invelitori .bloc-invelitoare";
  await alege(INV, "Tip", "Țiglă metalică");
  const model = await alege(INV, "Model", "Iberic");
  const tigla = await lista(INV, "Finisaj");
  v.verifica(`cascada tiglei (${model}): lucios · mat · Grande Mat · Wood · RAL 8003, ca in fisa`, tigla?.optiuni.join(" · ") === "lucios · mat · Grande Mat · Wood · RAL 8003", tigla?.optiuni.join(" · "));
  await alege(INV, "Finisaj", 0);
  await page.evaluate(() => document.getElementById("rubrica-invelitori").scrollIntoView({ block: "start" }));
  await page.evaluate((R) => [...document.querySelectorAll(`${R} label.bi-rand`)].find((l) => l.querySelector("span").textContent.trim() === "Finisaj")?.querySelector("select")?.focus(), INV);
  await A.captura("e-01-m14-cascada-tiglei");
  await alege(INV, "Tip", "Tablă cutată");
  const modelCutata = await alege(INV, "Model", 0);
  const cutata = await lista(INV, "Finisaj");
  v.verifica(`cascada tablei cutate (${modelCutata}): finisajele in ordinea de referinta`, inOrdine(cutata?.optiuni ?? []) && cutata.optiuni.length >= 3 && cutata.optiuni[0] === "lucios", cutata?.optiuni.join(" · "));

  // ---------------- sistemul pluvial ----------------
  await apasa("#rubrica-pluvial", "+ Adaugă sistem pluvial");
  await asteapta(async () => ((await lista("#rubrica-pluvial", "Finisaj"))?.optiuni.length ?? 0) > 1, 8000);
  const pluvial = await lista("#rubrica-pluvial", "Finisaj");
  v.verifica("sistemul pluvial: „colorat (lucios)” tine locul lui „lucios”, apoi mat, Magnelis…", inOrdine(pluvial?.optiuni ?? []) && pluvial.optiuni[0] === "colorat (lucios)" && pluvial.optiuni[1] === "mat", pluvial?.optiuni.join(" · "));

  // ---------------- o pozitie la lungimi ----------------
  await asteapta(async () => page.evaluate(() => ![...document.querySelectorAll("#rubrica-lungimi button")].find((x) => x.textContent.trim().startsWith("+ Adaugă accesoriu"))?.disabled), 8000);
  await apasa("#rubrica-lungimi", "+ Adaugă accesoriu la lungimi");
  const lungimi = await lista("#rubrica-lungimi", "Finisaj");
  v.verifica("accesoriile la lungimi: finisajele in ordinea de referinta", inOrdine(lungimi?.optiuni ?? []) && lungimi.optiuni.length >= 3, lungimi?.optiuni.join(" · "));
  await page.evaluate(() => document.getElementById("rubrica-pluvial").scrollIntoView({ block: "start" }));
  await A.captura("e-02-m14-pluvial-si-lungimi");

  // ---------------- o sectiune de sine statatoare ----------------
  await apasa("#rubrica-standard", "+ Secțiune de sine stătătoare");
  const deSine = await lista("#rubrica-standard", "Finisaj");
  v.verifica("sectiunea de sine statatoare: finisajele in ordinea de referinta", inOrdine(deSine?.optiuni ?? []) && deSine.optiuni.length >= 5 && deSine.optiuni[0] === "lucios", deSine?.optiuni.join(" · "));

  // ---------------- sipca ----------------
  await apasa("#rubrica-sipca", "+ Adaugă rubrică șipcă");
  await alege("#rubrica-sipca", "Profil", 0);
  const sipca = await lista("#rubrica-sipca", "Finisaj");
  v.verifica("sipca: finisajele profilului in ordinea de referinta", inOrdine(sipca?.optiuni ?? []), sipca?.optiuni.join(" · "));

  // ---------------- „Află preț” ----------------
  await page.goto(`${BAZA}/oferte/afla-pret`, { waitUntil: "networkidle0" });
  await scrieIn(page, await page.$('input[type="search"]'), "iberic");
  await asteapta(async () => page.evaluate(() => document.querySelectorAll("section.panou ul li button").length > 0), 8000);
  await page.evaluate(() => [...document.querySelectorAll("section.panou ul li button")].find((b) => /Țiglă metalică/i.test(b.textContent))?.click());
  await pauza(700);
  const afla = await lista("section.panou", "Finisaj");
  v.verifica("„Află preț”: finisajele in ordinea de referinta, cu primul din ea preselectat", inOrdine(afla?.optiuni ?? []) && afla.optiuni.length >= 3 && afla.valoare === afla.optiuni[0], JSON.stringify(afla));
  await A.captura("e-03-m14-afla-pret");

  // ---------------- Admin general schimba ordinea din Zona tehnica: ecranul o primeste ----------------
  if (ADMIN) {
    const G = await conectat(browser, BAZA, ADMIN, PAROLA);
    v.verifica("conectare cu Admin general de test", G.ok);
    const randuri = (await G.api("/api/adm/cat/referinte/optiuni-liste")).randuri ?? [];
    const mat = randuri.find((r) => r.lista === "ordine_finisaj" && r.valoare === "mat");
    const pus = await G.api(`/api/adm/cat/referinte/optiuni-liste/${mat.id}`, { method: "PUT", body: { lista: "ordine_finisaj", valoare: "mat", ordine: 0, activ: true } });
    await deschide();
    await alege(INV, "Tip", "Țiglă metalică");
    await alege(INV, "Model", "Iberic");
    const dupa = await lista(INV, "Finisaj");
    v.verifica("ordinea schimbata de Admin general („mat” primul) ajunge in cascada", pus.status === 200 && dupa?.optiuni.join(" · ") === "mat · lucios · Grande Mat · Wood · RAL 8003", dupa?.optiuni.join(" · "));
    // pusa la loc
    const inapoi = await G.api(`/api/adm/cat/referinte/optiuni-liste/${mat.id}`, { method: "PUT", body: { lista: "ordine_finisaj", valoare: "mat", ordine: 3, activ: true } });
    v.verifica("ordinea de pornire pusa la loc", inapoi.status === 200 && ((await A.api("/api/oferte/catalog/referinte")).ordineFinisaje ?? []).slice(0, 3).join() === "lucios,colorat (lucios),mat");
  }

  await browser.close();
  process.exit(v.sumar() > 0 ? 1 : 0);
})().catch((err) => {
  console.error("EROARE", err);
  process.exit(2);
});
