// S29b - corectiile la editorul ofertei (docs/MODIFICARI-S29B.md v1.4), pe instanta de pe BAZA DE TEST
// (datele lasate de tests/ofe-s29b.test.ts: firma cu sablonul Bilka incarcat):
//   BUG-24 - randurile lungime x bucati adaugate ulterior se aduna (si dupa redeschidere), doua pozitii cu aceeasi
//            desfasurata arata fiecare metrii ei, treapta salvata ramane (D05, nu D01), salvarea refuzata e la
//            vedere (starea, banda cu clic spre rand, punctul rosu, randul marcat), pagina se opreste la status,
//            la documente si la actiunile din „⋯”, avertizeaza la plecare; randul incomplet opreste si el;
//            formularul Bilka generat si citit inapoi are toate randurile;
//   BUG-25 - cos pe fiecare rand, eliminarea blocului in antet, cu confirmare;
//   BUG-26 - speciale 2 ML: treapta salvata dupa redeschidere;  BUG-27 - sistemul pluvial salvat dupa redeschidere.
// Folosire: node s29b-editor.cjs <adresa> <cont-agent> <parola> <folder-capturi>
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pauza, asteapta, verificari, porneste, conectat, scrieIn } = require("./comun.cjs");
const [BAZA, EMAIL, PAROLA, CAPTURI] = process.argv.slice(2);
const v = verificari();
const LUNGIMI = "#rubrica-lungimi .bloc-randuri";

(async () => {
  const browser = await porneste();
  const A = await conectat(browser, BAZA, EMAIL, PAROLA, CAPTURI);
  const { page } = A;
  v.verifica("conectare cu agentul de test", A.ok);
  const cereri = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") cereri.push(`${r.method()} ${new URL(r.url()).pathname}`);
  });

  const o = (await A.api("/api/oferte", { method: "POST", body: { client: { nume: "Probă Browser S29b", telefon: "0730 290 100", adresa: "Str. Probei 29", localitate: "Focșani" } } })).oferta;
  const baza = async () => (await A.api(`/api/oferte/${o.id}`)).oferta;
  // metrii liniilor la lungimi, in ordinea lor, din rezultatul motorului
  const metri = async () => {
    const d = await baza();
    return d.linii.filter((l) => /lungimi/i.test(l.rubrica)).map((l) => d.structura?.rezultat?.linii.find((x) => x.id === l.id)?.cantitate ?? "?");
  };
  // redeschidere adevarata: pagina se reincarca (aceeasi adresa cu „#produse” nu reincarca)
  const deschide = async () => {
    await page.goto(`${BAZA}/oferte`, { waitUntil: "networkidle0" });
    await page.goto(`${BAZA}/oferte/${o.id}#produse`, { waitUntil: "networkidle0" });
    await page.waitForSelector("#rubrica-lungimi");
    await pauza(2500);
  };
  const stare = () => page.evaluate(() => (document.querySelector(".stare-salvare")?.textContent ?? "").trim());
  // dupa o modificare starea trece intai pe „nesalvat”; apoi „salvat” sau „NU e salvată”
  const gata = async () => {
    await pauza(1000);
    await asteapta(async () => ["salvat", "NU e salvată"].includes(await stare()), 15000);
    return stare();
  };
  const element = async (f, ...args) => (await page.evaluateHandle(f, ...args)).asElement();
  const casuta = (rad, bloc, eticheta) => element((R, i, e) => document.querySelectorAll(R)[i]?.querySelector(`input[aria-label="${e}"]`) ?? null, rad, bloc, eticheta);
  const rand = async (bloc, n, lungime, bucati) => {
    await scrieIn(page, await casuta(LUNGIMI, bloc, `Lungime poziția ${n}`), lungime);
    await scrieIn(page, await casuta(LUNGIMI, bloc, `Bucăți poziția ${n}`), bucati);
  };
  const apasa = async (radacina, text, idx = 0) => {
    const ok = await page.evaluate((R, t, i) => {
      const b = [...(document.querySelectorAll(R)[i] ?? document).querySelectorAll("button")].find((x) => x.textContent.trim().startsWith(t));
      b?.click();
      return Boolean(b);
    }, radacina, text, idx);
    await pauza(350);
    return ok;
  };
  const alege = async (radacina, idx, eticheta, valoare) => {
    const r = await page.evaluate((R, i, e, val) => {
      const rad = document.querySelectorAll(R)[i];
      const s = [...(rad?.querySelectorAll("label.camp") ?? [])].find((l) => (l.querySelector("span")?.textContent ?? "").trim() === e)?.querySelector("select");
      if (!s) return "fara lista";
      const optiune = typeof val === "number" ? s.options[val]?.value : val;
      if (optiune === undefined || ![...s.options].some((x) => x.value === optiune)) return `fara optiunea: ${[...s.options].map((x) => x.value).join(" | ")}`;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, optiune);
      s.dispatchEvent(new Event("change", { bubbles: true }));
      return "ok";
    }, radacina, idx, eticheta, valoare);
    await pauza(400);
    return r;
  };
  const valoare = (radacina, idx, eticheta) => page.evaluate((R, i, e) => [...(document.querySelectorAll(R)[i]?.querySelectorAll("label.camp") ?? [])].find((l) => (l.querySelector("span")?.textContent ?? "").trim() === e)?.querySelector("select")?.value ?? null, radacina, idx, eticheta);
  const peEcran = () => page.evaluate((B) => [...document.querySelectorAll(B)].map((b) => ({ antet: b.querySelector(".antet-bloc strong")?.textContent.trim() ?? "", produs: b.querySelector("p.mic")?.textContent.trim() ?? "", randuri: [...b.querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("input")].map((i) => i.value).join("×")), ml: b.querySelector(".ml-pozitie")?.textContent.trim() ?? "", cosuri: b.querySelectorAll("tbody tr .cos").length })), LUNGIMI);
  const statusul = async () => (await baza()).status;
  const apasaStatus = async (text) => {
    await page.evaluate((t) => [...document.querySelectorAll(".rand-statusuri button")].find((b) => b.textContent.trim() === t)?.click(), text);
    await pauza(1800);
  };
  const eroareaPaginii = () => page.evaluate(() => [...document.querySelectorAll(".mesaj.eroare, .mesaj-eroare, [class*=mesaj]")].map((m) => m.textContent.trim()).filter((t) => /NU e salvată|incomplet|fără bucăți|fără lungime/.test(t)).join(" | "));
  const focalizat = () => page.evaluate(() => `${document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName} [${document.activeElement?.closest(".bloc-randuri")?.getAttribute("data-bloc") ?? ""}]`);

  // ================= BUG-24: randurile adaugate ulterior =================
  await deschide();
  await apasa("#rubrica-lungimi", "+ Adaugă accesoriu la lungimi");
  v.verifica("pozitie noua: treapta D05 se alege din lista", (await alege(LUNGIMI, 0, "Treaptă", "D05")) === "ok");
  await alege(LUNGIMI, 0, "Culoare", 1);
  await rand(0, 1, "2,5", "4");
  await apasa(LUNGIMI, "+ Adaugă rând");
  await rand(0, 2, "1,2", "3");
  v.verifica("BUG-24: doua randuri -> salvat, 13,600 ml pe ecran si in oferta", (await gata()) === "salvat" && (await peEcran())[0].ml === "13.600 ml" && (await metri()).join() === "13.600", JSON.stringify([await peEcran(), await metri()]));
  await apasa(LUNGIMI, "+ Adaugă rând");
  await rand(0, 3, "3", "2");
  v.verifica("BUG-24: al treilea rand, fara reincarcare -> 19,600 ml", (await gata()) === "salvat" && (await peEcran())[0].ml === "19.600 ml" && (await metri()).join() === "19.600");

  await deschide();
  let e = await peEcran();
  v.verifica("BUG-24 c: dupa redeschidere lista arata treapta salvata (D05), cu randurile si metrii ei", (await valoare(LUNGIMI, 0, "Treaptă")) === "D05" && e[0].antet.includes("D05") && e[0].randuri.length === 3 && e[0].ml === "19.600 ml", JSON.stringify(e));
  await apasa(LUNGIMI, "+ Adaugă rând");
  await rand(0, 4, "0,5", "10");
  v.verifica("BUG-24: al patrulea rand, dupa redeschidere -> 24,600 ml", (await gata()) === "salvat" && (await peEcran())[0].ml === "24.600 ml" && (await metri()).join() === "24.600");

  // finisajul atins dupa redeschidere: produsul se schimba pe finisajul ales, dar treapta ramane D05
  const finisajVechi = await valoare(LUNGIMI, 0, "Finisaj");
  const culoareVeche = await valoare(LUNGIMI, 0, "Culoare");
  const altFinisaj = await page.evaluate((B, f) => [...document.querySelectorAll(B)[0].querySelectorAll("label.camp")].find((l) => l.querySelector("span").textContent.trim() === "Finisaj").querySelector("select").querySelectorAll("option").length > 1 ? [...[...document.querySelectorAll(B)[0].querySelectorAll("label.camp")].find((l) => l.querySelector("span").textContent.trim() === "Finisaj").querySelector("select").options].map((x) => x.value).find((x) => x !== f) : null, LUNGIMI, finisajVechi);
  if (altFinisaj) {
    await alege(LUNGIMI, 0, "Finisaj", altFinisaj);
    e = await peEcran();
    v.verifica(`BUG-24 c: finisajul schimbat dupa redeschidere (${finisajVechi} -> ${altFinisaj}) pastreaza treapta D05 (nu trece pe D01)`, (await valoare(LUNGIMI, 0, "Treaptă")) === "D05" && /D05/.test(e[0].produs) && !/D01/.test(e[0].produs), e[0].produs);
    await alege(LUNGIMI, 0, "Finisaj", finisajVechi);
    await alege(LUNGIMI, 0, "Culoare", culoareVeche);
    v.verifica("BUG-24 c: revenit la finisajul si culoarea dinainte: acelasi D05, aceiasi metri", (await gata()) === "salvat" && (await metri()).join() === "24.600" && /D05/.test((await baza()).linii[0].denumire));
  }

  // a doua pozitie cu aceeasi desfasurata si aceeasi cheie
  await apasa("#rubrica-lungimi", "+ Adaugă accesoriu la lungimi");
  await alege(LUNGIMI, 1, "Treaptă", "D05");
  await alege(LUNGIMI, 1, "Culoare", culoareVeche);
  await rand(1, 1, "2", "5");
  e = await peEcran();
  v.verifica("BUG-24 b: doua pozitii cu aceeasi desfasurata si culoare - fiecare cu metrii EI (24,600 si 10,000)", (await gata()) === "salvat" && (e = await peEcran()).map((x) => x.ml).join() === "24.600 ml,10.000 ml" && (await metri()).join() === "24.600,10.000", JSON.stringify(e.map((x) => x.ml)));
  await page.evaluate(() => document.getElementById("rubrica-lungimi").scrollIntoView({ block: "start" }));
  await A.captura("a-01-bug24-doua-pozitii-fiecare-cu-metrii-ei");

  // ================= BUG-24 a: salvarea refuzata, la vedere =================
  await apasa(LUNGIMI, "+ Adaugă rând", 1);
  await rand(1, 2, "5,", "2");
  await apasa(LUNGIMI, "+ Adaugă rând", 0);
  await rand(0, 5, "3", "2");
  const st = await gata();
  const banda = await page.evaluate(() => document.querySelector(".banda-nesalvat")?.textContent.trim() ?? "");
  v.verifica("BUG-24 a: rand neterminat „5,” -> starea din randul ofertei spune „NU e salvată”", st === "NU e salvată", st);
  v.verifica("BUG-24 a: banda de sub randul ofertei spune ce e de corectat si unde", /Oferta NU e salvată/.test(banda) && /D05/.test(banda) && /poziția 2/.test(banda) && /5,/.test(banda), banda);
  v.verifica("BUG-24 a: fila Produse are punctul rosu cat tine refuzul", await page.evaluate(() => Boolean(document.querySelector("#tab-produse .punct-rosu")) && /nesalvat/.test(document.querySelector("#tab-produse .fila-rezumat")?.textContent ?? "")));
  e = await peEcran();
  v.verifica("BUG-24 a: randul neterminat e marcat pe loc, cu mesajul langa el", await page.evaluate((B) => { const tr = document.querySelectorAll(B)[1].querySelectorAll("tbody tr")[1]; return tr.classList.contains("rand-cu-problema") && /nu e scrisă până la capăt/.test(tr.textContent) && tr.querySelector("input").classList.contains("cu-problema"); }, LUNGIMI));
  v.verifica("BUG-24 a: randul bun scris dupa aceea NU e in oferta, iar ecranul o spune (metrii vechi, „nu sunt încă salvate”)", (await metri()).join() === "24.600,10.000" && /24\.600 ml/.test(e[0].ml) && /nu sunt încă salvate/.test(e[0].ml), JSON.stringify([await metri(), e[0].ml]));
  await A.captura("a-02-bug24-salvare-refuzata-la-vedere");

  // clicul pe banda duce la rand
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click(".banda-nesalvat");
  await pauza(600);
  v.verifica("BUG-24 a: un clic pe banda duce la randul de corectat (cursorul in casuta lui)", (await focalizat()) === "Lungime poziția 2 [lungimi-2]", await focalizat());
  await A.captura("a-03-bug24-dus-la-rand");

  // pagina se opreste la status, la documente si la actiunile din „⋯”
  await page.evaluate(() => window.scrollTo(0, 0));
  cereri.length = 0;
  await apasaStatus("Transmisă");
  v.verifica("decizia 2: cu salvarea refuzata, schimbarea statusului se opreste (ramane „În lucru”) si pagina spune de ce", (await statusul()) === "IN_LUCRU" && /NU e salvată/.test(await eroareaPaginii()) && !cereri.some((c) => /\/status$/.test(c)), `${await statusul()} · ${await eroareaPaginii()} · ${cereri.join(", ")}`);
  v.verifica("decizia 2: ...si duce la rand", (await focalizat()) === "Lungime poziția 2 [lungimi-2]", await focalizat());
  cereri.length = 0;
  await page.evaluate(() => [...document.querySelectorAll(".rand-oferta button")].find((b) => b.textContent.trim().startsWith("PDF"))?.click());
  await pauza(300);
  await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].find((b) => /Ofertă \(PDF\)/.test(b.textContent))?.click());
  await pauza(1500);
  v.verifica("decizia 2: generarea unui PDF se opreste (nicio cerere de document)", !cereri.some((c) => /documente/.test(c)), cereri.join(", "));
  cereri.length = 0;
  const dinMeniu = async (text) => {
    await page.evaluate(() => [...document.querySelectorAll(".rand-oferta .meniu-actiuni > button")].at(-1)?.click());
    await pauza(300);
    await page.evaluate((t) => [...document.querySelectorAll('[role="menuitem"]')].find((b) => b.textContent.trim().startsWith(t))?.click(), text);
    await pauza(1500);
  };
  await dinMeniu("Creează variantă");
  v.verifica("decizia 2: „Creează variantă” din „⋯” se opreste (nicio cerere)", !cereri.some((c) => /variant/.test(c)) && page.url().includes(o.id), cereri.join(", "));
  await dinMeniu("Copiază oferta");
  v.verifica("decizia 2: „Copiază oferta” din „⋯” se opreste (dialogul de copiere nu se deschide)", await page.evaluate(() => ![...document.querySelectorAll("h2")].some((h) => h.textContent.trim().startsWith("Copiază "))));

  // avertizarea la plecarea din pagina: „Nu” (renunt) -> raman in oferta
  page.removeAllListeners("dialog");
  let intrebare = "";
  page.on("dialog", async (d) => {
    intrebare = d.message();
    await d.dismiss();
  });
  await page.evaluate(() => document.querySelector('.rand-oferta a[href="/oferte"]')?.click());
  await pauza(800);
  v.verifica("decizia 1: la plecarea din pagina cu salvarea refuzata apare avertizarea; renunt -> raman in oferta", /NU e salvată/.test(intrebare) && page.url().includes(o.id), `${intrebare} · ${page.url()}`);
  page.removeAllListeners("dialog");
  page.on("dialog", (d) => d.accept());

  // corectarea randului: tot ce s-a scris intre timp ajunge in oferta
  await scrieIn(page, await casuta(LUNGIMI, 1, "Lungime poziția 2"), "5,7");
  await page.evaluate((B) => document.querySelectorAll(B)[0].querySelector("input").focus(), LUNGIMI);
  v.verifica("BUG-24 a: dupa corectarea randului, tot ce s-a scris intre timp e in oferta (30,600 si 21,400 ml)", (await gata()) === "salvat" && (await metri()).join() === "30.600,21.400" && (e = await peEcran()).map((x) => x.ml).join() === "30.600 ml,21.400 ml", JSON.stringify([await metri(), e.map((x) => x.ml)]));
  v.verifica("BUG-24 a: banda si punctul rosu dispar dupa salvare", await page.evaluate(() => !document.querySelector(".banda-nesalvat") && !document.querySelector("#tab-produse .punct-rosu") && !document.querySelector("#rubrica-lungimi .rand-cu-problema")));

  // ================= BUG-24 d: randul incomplet =================
  await apasa(LUNGIMI, "+ Adaugă rând", 1);
  await scrieIn(page, await casuta(LUNGIMI, 1, "Lungime poziția 3"), "6");
  await page.evaluate((B) => document.querySelectorAll(B)[0].querySelector("input").focus(), LUNGIMI);
  await gata();
  v.verifica("BUG-24 d: lungime fara bucati -> randul e marcat „incomplet”, restul ofertei ramane salvat", (await stare()) === "salvat" && (await page.evaluate((B) => { const tr = document.querySelectorAll(B)[1].querySelectorAll("tbody tr")[2]; return tr.classList.contains("rand-cu-problema") && /lungime fără bucăți — rândul nu e în ofertă/.test(tr.textContent); }, LUNGIMI)) && (await metri()).join() === "30.600,21.400");
  await page.evaluate(() => window.scrollTo(0, 0));
  cereri.length = 0;
  await apasaStatus("Transmisă");
  v.verifica("decizia 2: cu un rand incomplet, schimbarea statusului se opreste si duce la rand", (await statusul()) === "IN_LUCRU" && /fără bucăți/.test(await eroareaPaginii()) && (await focalizat()) === "Bucăți poziția 3 [lungimi-2]", `${await statusul()} · ${await eroareaPaginii()} · ${await focalizat()}`);
  await A.captura("a-04-bug24-rand-incomplet-opreste-statusul");
  // cosul randului scoate doar randul
  await page.evaluate((B) => document.querySelectorAll(B)[1].querySelectorAll("tbody tr")[2].querySelector(".cos").click(), LUNGIMI);
  await pauza(400);
  e = await peEcran();
  v.verifica("BUG-25: cosul randului scoate doar randul (pozitia ramane cu celelalte doua)", e.length === 2 && e[1].randuri.join() === "2×5,5,7×2", JSON.stringify(e[1].randuri));

  // un rand gol de produs (pozitie abia adaugata, fara randuri - BUG-20) nu opreste nimic
  await apasa("#rubrica-lungimi", "+ Adaugă accesoriu la lungimi");
  await alege(LUNGIMI, 2, "Treaptă", "D09");
  await gata();
  await page.evaluate(() => window.scrollTo(0, 0));
  await apasaStatus("Transmisă");
  v.verifica("decizia 1: pozitia goala (rand gol de produs, BUG-20) nu opreste nimic - statusul trece pe „Transmisă”", (await statusul()) === "TRANSMISA", await statusul());

  // ================= BUG-25: eliminarea blocului, in antet, cu confirmare =================
  await page.evaluate(() => document.getElementById("rubrica-lungimi").scrollIntoView({ block: "start" }));
  const inAntet = await page.evaluate((B) => [...document.querySelectorAll(B)].every((b) => { const s = [...b.querySelectorAll("button")].find((x) => x.textContent.trim() === "Scoate accesoriul"); const plus = [...b.querySelectorAll("button")].find((x) => x.textContent.trim() === "+ Adaugă rând"); return s && s.closest(".antet-bloc") && plus && !plus.closest(".antet-bloc") && ![...b.querySelectorAll("button")].some((x) => x.textContent.trim() === "Scoate rândul"); }), LUNGIMI);
  e = await peEcran();
  v.verifica("BUG-25: „Scoate accesoriul” sta in antetul pozitiei, departe de „+ Adaugă rând”; fiecare rand are cosul lui", inAntet && e.every((x) => x.cosuri === x.randuri.length), JSON.stringify(e.map((x) => [x.randuri.length, x.cosuri])));
  await apasa(LUNGIMI, "Scoate accesoriul", 0);
  const confirmare = await page.evaluate((B) => document.querySelectorAll(B)[0].querySelector('[role="alertdialog"]')?.textContent.trim() ?? "", LUNGIMI);
  v.verifica("BUG-25: pozitia cu randuri completate cere confirmare, cu numele ei si cate randuri are", /Ștergi desfășurata D05 cu cele 5 rânduri\?/.test(confirmare) && (await peEcran()).length === 3, confirmare);
  await A.captura("b-01-bug25-confirmare-la-scoaterea-pozitiei");
  await apasa(LUNGIMI, "Nu", 0);
  v.verifica("BUG-25: „Nu” lasa totul neatins", (await peEcran())[0].randuri.length === 5 && (await page.evaluate((B) => !document.querySelectorAll(B)[0].querySelector('[role="alertdialog"]'), LUNGIMI)));
  await apasa(LUNGIMI, "Scoate accesoriul", 2);
  v.verifica("BUG-25: pozitia goala dispare fara intrebare", (await peEcran()).length === 2);
  // cosul ultimului rand goleste randul, nu scoate pozitia
  await apasa("#rubrica-lungimi", "+ Adaugă accesoriu la lungimi");
  await rand(2, 1, "1", "1");
  await page.evaluate((B) => document.querySelectorAll(B)[2].querySelector("tbody tr .cos").click(), LUNGIMI);
  await pauza(400);
  e = await peEcran();
  v.verifica("BUG-25: cosul de pe ultimul rand goleste randul - pozitia ramane", e.length === 3 && e[2].randuri.join() === "×", JSON.stringify(e[2]));
  await apasa(LUNGIMI, "Scoate accesoriul", 2);
  await gata();

  // sipca: cos pe fiecare pozitie; „Scoate rubrica” cu confirmare
  await apasa("#rubrica-sipca", "+ Adaugă rubrică șipcă");
  await alege("#rubrica-sipca .sub-sectiune", 0, "Profil", 1);
  await alege("#rubrica-sipca .sub-sectiune", 0, "Culoare", 1);
  await scrieIn(page, await casuta("#rubrica-sipca .sub-sectiune", 0, "Lungime șipcă poziția 1"), "1,5");
  await scrieIn(page, await casuta("#rubrica-sipca .sub-sectiune", 0, "Bucăți poziția 1"), "10");
  await gata();
  const sipca = await page.evaluate(() => ({ randuri: document.querySelectorAll("#rubrica-sipca tbody tr").length, cosuri: document.querySelectorAll("#rubrica-sipca tbody tr .cos").length }));
  v.verifica("BUG-25: la sipca fiecare pozitie are cosul ei", sipca.randuri > 0 && sipca.cosuri === sipca.randuri, JSON.stringify(sipca));
  await apasa("#rubrica-sipca .sub-sectiune", "Scoate rubrica");
  const confirmareSipca = await page.evaluate(() => document.querySelector('#rubrica-sipca [role="alertdialog"]')?.textContent.trim() ?? "");
  v.verifica("BUG-25: „Scoate rubrica” (sipca) cere confirmare cand are randuri completate", /Ștergi rubrica 1 de șipcă/.test(confirmareSipca), confirmareSipca);
  await page.evaluate(() => document.getElementById("rubrica-sipca").scrollIntoView({ block: "start" }));
  await A.captura("b-02-bug25-sipca-cos-pe-rand-si-confirmare");
  await apasa("#rubrica-sipca .sub-sectiune", "Da, șterge");
  await gata();
  v.verifica("BUG-25: „Da, șterge” scoate rubrica de sipca", (await page.evaluate(() => document.querySelectorAll("#rubrica-sipca .sub-sectiune").length)) === 0 && !(await baza()).linii.some((l) => /ipc/i.test(l.rubrica)));

  // ================= BUG-26: speciale 2 ML dupa redeschidere =================
  await apasa("#rubrica-speciale", "+ Accesorii speciale 2 ML de sine stătătoare");
  for (const [et, val] of [["Finisaj", "mat"], ["Grosime", "0,50 mm"], ["Culoare", 1]]) await alege("#rubrica-speciale", 0, et, val);
  await apasa("#rubrica-speciale", "Deschide secțiunea");
  await asteapta(async () => page.evaluate(() => document.querySelectorAll("#rubrica-speciale tbody tr").length >= 6), 8000);
  await page.evaluate(() => { const s = document.querySelector('#rubrica-speciale select[aria-label="Treapta rândul 1"]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(s, "D05"); s.dispatchEvent(new Event("change", { bubbles: true })); });
  await pauza(300);
  await scrieIn(page, await element(() => document.querySelector('#rubrica-speciale input[aria-label="Cantitate rândul 1"]')), "4");
  await gata();

  // ================= BUG-27: sistemul pluvial dupa redeschidere =================
  await apasa("#rubrica-pluvial", "+ Adaugă sistem pluvial");
  v.verifica("pluvial: sistemul 150 / 100 se alege din lista", (await alege("#rubrica-pluvial .panou", 0, "Sistem", "150 / 100")) === "ok");
  await alege("#rubrica-pluvial .panou", 0, "Culoare", 1);
  await asteapta(async () => page.evaluate(() => document.querySelectorAll("#rubrica-pluvial tbody tr input").length > 2), 8000);
  await scrieIn(page, await element(() => document.querySelectorAll("#rubrica-pluvial tbody tr input")[0]), "3");
  v.verifica("pluvial: piesa sistemului 150 / 100 e salvata", (await gata()) === "salvat" && (await baza()).linii.filter((l) => l.rubrica === "Sistem pluvial").map((l) => l.sistem).join() === "150 / 100");

  await deschide();
  const speciale = await page.evaluate(() => [...document.querySelectorAll("#rubrica-speciale tbody tr")].filter((tr) => tr.querySelector("input")?.value).map((tr) => ({ treapta: tr.querySelector("select")?.value, interval: tr.children[1]?.textContent.trim(), produs: tr.children[2]?.textContent.trim(), cantitate: tr.querySelector("input").value })));
  v.verifica("BUG-26: dupa redeschidere randul salvat de speciale 2 ML arata treapta lui (D05, 201–250 mm), nu D01", speciale.length === 1 && speciale[0].treapta === "D05" && /201–250 mm/.test(speciale[0].interval) && /D05/.test(speciale[0].produs) && speciale[0].cantitate === "4", JSON.stringify(speciale));
  await page.evaluate(() => document.getElementById("rubrica-speciale").scrollIntoView({ block: "start" }));
  await A.captura("c-01-bug26-speciale-treapta-salvata");
  await scrieIn(page, await element(() => [...document.querySelectorAll("#rubrica-speciale tbody tr input")].find((i) => i.value)), "5");
  v.verifica("BUG-26: schimbarea cantitatii nu schimba produsul (tot D05, 5 buc)", (await gata()) === "salvat" && (await baza()).linii.filter((l) => /2 ML/.test(l.rubrica)).map((l) => `${/D\d\d/.exec(l.denumire)?.[0]} × ${l.cantitate}`).join() === "D05 × 5");

  const sistem = await valoare("#rubrica-pluvial .panou", 0, "Sistem");
  const piese = await page.evaluate(() => [...document.querySelectorAll("#rubrica-pluvial tbody tr")].map((tr) => ({ text: tr.querySelector("td")?.textContent.trim() ?? "", cantitate: tr.querySelector("input")?.value ?? "" })));
  v.verifica("BUG-27: dupa redeschidere sistemul salvat apare 150 / 100, cu lista lui (piesa salvata la locul ei)", sistem === "150 / 100" && (await page.evaluate(() => document.querySelectorAll("#rubrica-pluvial .panou.bloc-pluvial, #rubrica-pluvial .antet-pagina strong").length)) === 1 && piese[0].cantitate === "3" && /150/.test(piese[0].text), JSON.stringify([sistem, piese.slice(0, 3)]));
  await scrieIn(page, await element(() => [...document.querySelectorAll("#rubrica-pluvial tbody tr input")].filter((i) => !i.value)[0]), "2");
  await gata();
  const pluvial = (await baza()).linii.filter((l) => l.rubrica === "Sistem pluvial").map((l) => `${l.sistem} × ${l.cantitate}`);
  v.verifica("BUG-27: piesa adaugata dupa redeschidere intra tot in sistemul rubricii (nicio piesa de 125 langa cele de 150)", pluvial.length === 2 && pluvial.every((x) => !/^125 \/ 90 ×/.test(x)) && /^150 \/ 100 × 3/.test(pluvial[0]), pluvial.join(" | "));
  await page.evaluate(() => document.getElementById("rubrica-pluvial").scrollIntoView({ block: "start" }));
  await A.captura("c-02-bug27-pluvial-sistemul-salvat");

  // ================= telefonul (390 px) =================
  await A.telefon();
  await deschide();
  await page.evaluate(() => document.getElementById("rubrica-lungimi").scrollIntoView({ block: "start" }));
  await pauza(500);
  const latime = await page.evaluate(() => ({ pagina: document.documentElement.scrollWidth, ecran: window.innerWidth, antet: Boolean(document.querySelector("#rubrica-lungimi .antet-bloc .scoate-bloc")) }));
  v.verifica("telefon (390 px): pozitia la lungimi incape pe latime, cu „Scoate accesoriul” in antet", latime.pagina <= latime.ecran + 1 && latime.antet, JSON.stringify(latime));
  await A.captura("d-01-telefon-lungimi");
  await apasa(LUNGIMI, "Scoate accesoriul", 0);
  await A.captura("d-02-telefon-confirmare");
  await apasa(LUNGIMI, "Nu", 0);
  await A.desktop();

  // ================= formularul Bilka, generat si citit inapoi =================
  const dc = await A.api(`/api/oferte/${o.id}/status`, { method: "PUT", body: { status: "DE_COMANDAT", livrareBilka: { tip: "DEPOZIT" } } });
  const f = await A.api(`/api/oferte/${o.id}/formulare-bilka`, { method: "POST", body: {} });
  v.verifica("formularul Bilka se genereaza", dc.status === 200 && f.status === 201 && (f.documente ?? []).length >= 1, JSON.stringify({ dc: dc.status, f: f.status, eroare: f.eroare }));
  const citite = [];
  for (const d of f.documente ?? []) {
    const b64 = await page.evaluate(async (cale) => {
      const r = await fetch(cale, { credentials: "include" });
      const octeti = new Uint8Array(await r.arrayBuffer());
      let s = "";
      for (let i = 0; i < octeti.length; i += 0x8000) s += String.fromCharCode(...octeti.subarray(i, i + 0x8000));
      return btoa(s);
    }, `/api/oferte/${o.id}/documente/${d.id}`);
    const fisier = path.join(os.tmpdir(), `s29b-${d.id}.xlsm`);
    fs.writeFileSync(fisier, Buffer.from(b64, "base64"));
    citite.push(JSON.parse(execFileSync("npx", ["tsx", path.join(__dirname, "citeste-formular.ts"), fisier], { cwd: path.join(__dirname, "..", ".."), shell: true, encoding: "utf8" }).trim().split("\n").at(-1)));
    fs.unlinkSync(fisier);
  }
  const lungimiCitite = citite.flatMap((c) => c.lungimi);
  v.verifica("BUG-24: formularul Bilka citit inapoi are TOATE randurile de lungime x bucati, pe treapta lor (5 + 2 randuri, D05)", lungimiCitite.join() === "D05 2.5×4,D05 1.2×3,D05 3×2,D05 0.5×10,D05 3×2,D05 2×5,D05 5.7×2", lungimiCitite.join(" | "));
  v.verifica("BUG-26: in formularul Bilka specialele 2 ML sunt pe treapta lor (D05 × 5, nimic pe D01)", citite.some((c) => c.speciale.D05 === "5") && citite.every((c) => !c.speciale.D01), JSON.stringify(citite.map((c) => c.speciale)));

  await browser.close();
  process.exit(v.sumar() > 0 ? 1 : 0);
})().catch((err) => {
  console.error("EROARE", err);
  process.exit(2);
});
