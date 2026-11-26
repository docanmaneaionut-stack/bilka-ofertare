// S29 - BUG-20 (randul adaugat cu "+" ramane fara cantitate, la locul lui) si BUG-21 (lista "Preturi pe linii"
// si PDF-ul in ordinea de pe ecran), pe instanta de pe BAZA DE TEST (datele lasate de tests/ofe-s29.test.ts).
// Folosire: node s29-bug20-21.cjs <adresa> <cont-agent> <parola> <folder-capturi>
const { PDFParse } = require("pdf-parse");
const { pauza, asteapta, verificari, porneste, conectat, scrieIn } = require("./comun.cjs");
const [BAZA, EMAIL, PAROLA, CAPTURI] = process.argv.slice(2);
const v = verificari();

// rubrica din zona de produse, dupa titlu: randurile ei (text + valoarea casutei) si casutele
const randuriRubrica = (page, titlu) =>
  page.evaluate((t) => {
    const s = [...document.querySelectorAll(".zona-produse section.panou")].find((x) => (x.querySelector("h2")?.textContent || "").trim().startsWith(t));
    return s ? [...s.querySelectorAll("tbody tr")].map((tr) => ({ text: (tr.querySelector("td")?.innerText || "").replace(/\s+/g, " ").trim(), cantitate: tr.querySelector("input.casuta-cantitate")?.value ?? null, cos: Boolean(tr.querySelector("button.cos")) })) : null;
  }, titlu);
const element = async (page, f, ...args) => (await page.evaluateHandle(f, ...args)).asElement();
const cautare = (page, titlu) => element(page, (t) => [...document.querySelectorAll(".zona-produse section.panou")].find((x) => (x.querySelector("h2")?.textContent || "").trim().startsWith(t))?.querySelector("input[type=search]") ?? null, titlu);
const casutaRand = (page, titlu, idx) => element(page, (t, i) => [...document.querySelectorAll(".zona-produse section.panou")].find((x) => (x.querySelector("h2")?.textContent || "").trim().startsWith(t))?.querySelectorAll("tbody tr")[i]?.querySelector("input.casuta-cantitate") ?? null, titlu, idx);
// starea salvarii e in randul ofertei; dupa o modificare trece intai pe „nesalvat” (salvarea automata porneste dupa o clipa)
const salvat = async (page) => {
  await pauza(350);
  return asteapta(async () => page.evaluate(() => (document.querySelector(".stare-salvare")?.textContent ?? "").trim() === "salvat"), 15000);
};

// adauga din "+ Adaugă…" primul produs gasit care nu e deja pe ecran; intoarce numele lui
async function adaugaCuPlus(page, titlu, text) {
  const camp = await cautare(page, titlu);
  await scrieIn(page, camp, text);
  await asteapta(async () => page.evaluate((t) => Boolean([...document.querySelectorAll(".zona-produse section.panou")].find((x) => (x.querySelector("h2")?.textContent || "").trim().startsWith(t))?.querySelector(".lista-sugestii li")), titlu), 8000);
  const peEcran = (await randuriRubrica(page, titlu)).map((r) => r.text);
  const ales = await page.evaluate(
    (t, existente) => {
      const s = [...document.querySelectorAll(".zona-produse section.panou")].find((x) => (x.querySelector("h2")?.textContent || "").trim().startsWith(t));
      const li = [...s.querySelectorAll(".lista-sugestii li")].find((x) => !existente.some((e) => e.includes(x.childNodes[0].textContent.trim())));
      if (!li) return null;
      const nume = li.childNodes[0].textContent.trim();
      li.click();
      return nume;
    },
    titlu,
    peEcran,
  );
  await pauza(400);
  return ales;
}

(async () => {
  const browser = await porneste();
  const A = await conectat(browser, BAZA, EMAIL, PAROLA, CAPTURI);
  v.verifica("conectare cu agentul de test", A.ok);

  // ================= BUG-20 =================
  // o oferta noua, cu aceeasi invelitoare ca oferta lasata de teste (ca rubricile sa aiba lista lor)
  const lista = (await A.api("/api/oferte?q=" + encodeURIComponent("Rânduri Goale"))).oferte ?? [];
  if (!lista.length) throw new Error("oferta de test lipseste - ruleaza intai tests/ofe-s29.test.ts");
  const model = (await A.api(`/api/oferte/${lista[0].id}`)).oferta;
  const noua = (await A.api("/api/oferte", { method: "POST", body: { client: { nume: "Probă Browser S29", adresa: "Str. Probei 29", localitate: "Focșani" } } })).oferta;
  const inv = model.invelitori[0];
  const pus = await A.api(`/api/oferte/${noua.id}/produse`, { method: "PUT", body: { grupaPct: "0", invelitori: [{ cheie: "I1", produsId: inv.produsId, culoare: inv.culoare, panotaj: inv.panotaj.map((p) => ({ lungimeM: p.lungimeM, bucati: p.bucati })) }], linii: [], sipci: [], zonaB: [] } });
  if (pus.status !== 200) throw new Error("nu pot pregati oferta de proba: " + JSON.stringify(pus).slice(0, 300));
  const deschide = () => A.mergi(`/oferte/${noua.id}`, ".zona-produse section.panou tbody tr");
  const detaliu = async () => (await A.api(`/api/oferte/${noua.id}`)).oferta;
  await deschide();
  await pauza(1500);

  const STD = "Accesorii standard";
  const inainte = await randuriRubrica(A.page, STD);
  const X = await adaugaCuPlus(A.page, STD, "mat");
  let r = await randuriRubrica(A.page, STD);
  v.verifica("BUG-20: „+ Adaugă…” creează un rând nou, ultimul din rubrică, FĂRĂ cantitate", X && r.length === inainte.length + 1 && r.at(-1).text.includes(X) && r.at(-1).cantitate === "", `${X} · cantitate „${r.at(-1)?.cantitate}” · ${inainte.length} → ${r.length} rânduri`);
  const focus = await A.page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
  v.verifica("BUG-20: cursorul e în căsuța rândului adăugat", focus === `Cantitate ${X}`, focus);
  await A.captura("a-01-bug20-rand-adaugat-fara-cantitate");
  await A.page.keyboard.type("3");
  await pauza(200);
  await A.page.keyboard.press("Backspace");
  await pauza(300);
  r = await randuriRubrica(A.page, STD);
  v.verifica("BUG-20: scrii 3 și ștergi — rândul rămâne, gol", r.length === inainte.length + 1 && r.at(-1).text.includes(X) && r.at(-1).cantitate === "");
  v.verifica("BUG-20: salvarea automată trece cu rândul gol", await salvat(A.page));
  let o = await detaliu();
  v.verifica("BUG-20: rândul gol e salvat separat de liniile ofertei (nu intră în calcul)", o.randuriGoale.length === 1 && X.includes(o.randuriGoale[0].denumire.split(" – ")[0]) && o.linii.filter((l) => l.rubrica !== "Învelitori").length === 0, `${o.randuriGoale.length} rând gol, ${o.linii.length - 1} linii de accesorii`);
  await deschide();
  await pauza(1500);
  r = await randuriRubrica(A.page, STD);
  v.verifica("BUG-20: după redeschidere rândul e tot acolo, gol, la locul lui", r.length === inainte.length + 1 && r.at(-1).text.includes(X) && r.at(-1).cantitate === "" && r.at(-1).cos, r.at(-1)?.text.slice(0, 60));

  // al doilea rand cu "+": se completeaza el, primul ramane gol inaintea lui
  const Y = await adaugaCuPlus(A.page, STD, "mat");
  r = await randuriRubrica(A.page, STD);
  const iY = r.findIndex((x) => x.text.includes(Y));
  await scrieIn(A.page, await casutaRand(A.page, STD, iY), "2");
  await salvat(A.page);
  await pauza(400);
  await deschide();
  await pauza(1500);
  r = await randuriRubrica(A.page, STD);
  v.verifica("BUG-20: locul e stabil — X (gol) rămâne înaintea lui Y (2) și după redeschidere", r.length === inainte.length + 2 && r.at(-2).text.includes(X) && r.at(-2).cantitate === "" && r.at(-1).text.includes(Y) && r.at(-1).cantitate === "2", r.slice(-2).map((x) => `${x.text.slice(0, 28)}=${x.cantitate}`).join(" | "));
  o = await detaliu();
  const liniiPret = o.preturi?.rezultat?.linii ?? [];
  v.verifica("BUG-20: în lista de prețuri apare doar Y; rândul gol nu e pe nicăieri în calcul", liniiPret.length === 2 && !liniiPret.some((l) => X.includes(l.denumire)) && o.randuriGoale.length === 1, liniiPret.map((l) => l.denumire.slice(0, 24)).join(" | "));
  await A.captura("a-02-bug20-dupa-redeschidere");
  // X primeste cantitate: ramane inaintea lui Y
  await scrieIn(A.page, await casutaRand(A.page, STD, r.length - 2), "5");
  await salvat(A.page);
  await pauza(400);
  await deschide();
  await pauza(1500);
  r = await randuriRubrica(A.page, STD);
  o = await detaliu();
  const accesorii = o.linii.filter((l) => l.rubrica === STD).map((l) => l.denumire);
  v.verifica("BUG-20: X completat rămâne pe locul lui (X = 5, apoi Y = 2), și pe ecran, și în ofertă", r.at(-2).cantitate === "5" && r.at(-1).cantitate === "2" && accesorii.length === 2 && X.includes(accesorii[0].split(" – ")[0]) && o.randuriGoale.length === 0, accesorii.map((d) => d.slice(0, 24)).join(" → "));
  // cantitatea stearsa: randul ramane; cosul il scoate
  await scrieIn(A.page, await casutaRand(A.page, STD, r.length - 2), "");
  await salvat(A.page);
  await pauza(400);
  r = await randuriRubrica(A.page, STD);
  v.verifica("BUG-20: cantitatea ștearsă lasă rândul pe ecran, gol", r.length === inainte.length + 2 && r.at(-2).text.includes(X) && r.at(-2).cantitate === "");
  await A.page.evaluate((t, n) => [...document.querySelectorAll(".zona-produse section.panou")].find((x) => (x.querySelector("h2")?.textContent || "").trim().startsWith(t)).querySelectorAll("tbody tr")[n].querySelector("button.cos").click(), STD, r.length - 2);
  await pauza(300);
  await salvat(A.page);
  await pauza(400);
  await deschide();
  await pauza(1500);
  r = await randuriRubrica(A.page, STD);
  o = await detaliu();
  v.verifica("BUG-20: coșul scoate rândul — nu mai apare nici după redeschidere", r.length === inainte.length + 1 && !r.some((x) => x.text.includes(X)) && o.randuriGoale.length === 0);

  // a doua rubrica: Fixare si etansare
  const FIX = "Fixare și etanșare";
  const fInainte = await randuriRubrica(A.page, FIX);
  const F = await adaugaCuPlus(A.page, FIX, "band");
  let rf = await randuriRubrica(A.page, FIX);
  v.verifica("BUG-20 (Fixare și etanșare): rând nou, fără cantitate", F && rf.length === fInainte.length + 1 && rf.at(-1).cantitate === "", `${F}`);
  await salvat(A.page);
  await pauza(400);
  await deschide();
  await pauza(1500);
  rf = await randuriRubrica(A.page, FIX);
  v.verifica("BUG-20 (Fixare și etanșare): rândul gol rămâne după redeschidere", rf.length === fInainte.length + 1 && rf.at(-1).text.includes(F) && rf.at(-1).cantitate === "");
  await A.page.evaluate(() => document.querySelectorAll(".zona-produse section.panou")[3]?.scrollIntoView({ block: "start" }));
  await pauza(300);
  await A.captura("a-03-bug20-fixare-rand-gol");

  // ================= BUG-21 =================
  const ord = ((await A.api("/api/oferte?q=" + encodeURIComponent("Ordine Documente"))).oferte ?? [])[0];
  if (!ord) throw new Error("oferta „Client Ordine Documente” lipseste");
  const od = (await A.api(`/api/oferte/${ord.id}`)).oferta;
  const CLASICA = ["Învelitori", "Accesorii standard", "Accesorii speciale (2 ML)", "Fixare și etanșare", "Sistem pluvial", "Șipcă gard", "Accesorii speciale la lungimi (ML)"];
  const rubricaLiniei = new Map(od.linii.map((l) => [l.id, l.rubrica]));
  // rezultatul motorului vine neatins (liniile in ordinea lui); ordinea de afisare vine alaturi
  const dupaId = new Map(od.preturi.rezultat.linii.map((l) => [l.id, l]));
  const afisate = od.preturi.rezultat.ordineAfisare.map((id) => dupaId.get(id));
  const ranguri = afisate.map((l) => CLASICA.indexOf(rubricaLiniei.get(l.id)));
  v.verifica("BUG-21: în lista de prețuri rubricile vin în ordinea clasică (deși cantitățile au fost completate invers)", ranguri.length > 10 && ranguri.every((x, i) => i === 0 || ranguri[i - 1] <= x), ranguri.join(""));
  const salvate = od.linii.map((l) => CLASICA.indexOf(l.rubrica));
  v.verifica("BUG-21: ordinea salvată a liniilor (cea care merge spre motor) a rămas cea a completării", !salvate.every((x, i) => i === 0 || salvate[i - 1] <= x), salvate.join(""));
  await A.mergi(`/oferte/${ord.id}`, ".zona-produse section.panou");
  await pauza(1500);
  const peEcran = await A.page.evaluate(() => {
    const h = [...document.querySelectorAll("h2")].find((x) => x.textContent.trim() === "Prețuri");
    const tabel = h?.closest("section")?.querySelector("table.tabel");
    return tabel ? [...tabel.querySelectorAll("tbody tr")].map((tr) => (tr.querySelector("td")?.innerText || "").replace(/\s+/g, " ").trim()) : [];
  });
  const dinApi = afisate.map((l) => l.denumire);
  v.verifica("BUG-21: lista „Prețuri pe linii” de pe ecran e în aceeași ordine", peEcran.length === dinApi.length && peEcran.every((t, i) => t.includes(dinApi[i].slice(0, 20))), `${peEcran.length} linii; primele: ${peEcran.slice(0, 3).map((x) => x.slice(0, 22)).join(" | ")}`);
  await A.page.evaluate(() => [...document.querySelectorAll("h2")].find((x) => x.textContent.trim() === "Prețuri")?.scrollIntoView({ block: "start" }));
  await pauza(300);
  await A.captura("a-04-bug21-lista-de-preturi");
  // PDF-ul de oferta: produsele in aceeasi ordine
  const gen = await A.api(`/api/oferte/${ord.id}/documente`, { method: "POST", body: { tip: "OFERTA" } });
  const octeti = await A.page.evaluate(async (cale) => {
    const b = new Uint8Array(await (await fetch(cale, { credentials: "include" })).arrayBuffer());
    let s = "";
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }, `/api/oferte/${ord.id}/documente/${gen.document.id}`);
  const text = (await new PDFParse({ data: new Uint8Array(Buffer.from(octeti, "base64")) }).getText()).text.replace(/\s+/g, " ");
  const accesoriiDoc = afisate.filter((l) => rubricaLiniei.get(l.id) !== "Învelitori").map((l) => l.denumire.split(" – ")[0].trim());
  const unice = accesoriiDoc.filter((d, i) => accesoriiDoc.indexOf(d) === i && accesoriiDoc.lastIndexOf(d) === i);
  const pozitii = unice.map((d) => text.indexOf(d)).filter((p) => p >= 0);
  v.verifica("BUG-21: în PDF-ul de ofertă produsele apar în ordinea listei de prețuri (ordinea de pe ecran)", gen.status === 201 && pozitii.length >= 6 && pozitii.every((p, i) => i === 0 || pozitii[i - 1] < p), `${pozitii.length} produse regăsite în PDF, în ordine`);

  await browser.close();
  process.exit(v.sumar() ? 1 : 0);
})().catch((e) => {
  console.error("EROARE", e);
  process.exit(2);
});
