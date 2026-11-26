// S29 - MODIFICAREA M12 (pagina ofertei pe trei file), pe instanta de pe BAZA DE TEST (datele lasate de
// tests/ofe-s29.test.ts). Verifica purtarea: randurile fixe, filele (pozitia tinuta, adresa, Alt + 1 / 2 / 3),
// benzile care se strang / deschid fara nicio schimbare in oferta, bara de rubrici, statusul dintr-un clic,
// saltul la fila si la camp cand „Comandat” e blocat, „Salvează”, „Grupă %”, oferta comandata, telefonul.
// Folosire: node s29-m12.cjs <adresa> <cont-agent> <parola> <folder-capturi>
const { pauza, asteapta, verificari, porneste, conectat, scrieIn } = require("./comun.cjs");
const [BAZA, EMAIL, PAROLA, CAPTURI] = process.argv.slice(2);
const v = verificari();

(async () => {
  const browser = await porneste();
  const A = await conectat(browser, BAZA, EMAIL, PAROLA, CAPTURI);
  const { page } = A;
  v.verifica("conectare cu agentul de test", A.ok);
  const scrieri = [];
  page.on("request", (r) => {
    if (r.method() !== "GET" && r.url().includes("/api/")) scrieri.push(`${r.method()} ${new URL(r.url()).pathname}`);
  });

  // o oferta de lucru, cu invelitoare si cateva produse (fara telefon - pentru blocajul la „Comandat”)
  const model = (await A.api(`/api/oferte/${((await A.api("/api/oferte?q=" + encodeURIComponent("Ordine Documente"))).oferte ?? [])[0].id}`)).oferta;
  const noua = (await A.api("/api/oferte", { method: "POST", body: { client: { nume: "Probă File M12", adresa: "Str. Filelor 3", localitate: "Focșani" } } })).oferta;
  const inv = model.invelitori[0];
  const accesorii = model.linii.filter((l) => l.invelitoareId === inv.id && l.rubrica !== "Învelitori").slice(0, 8);
  const pus = await A.api(`/api/oferte/${noua.id}/produse`, { method: "PUT", body: { grupaPct: "0", invelitori: [{ cheie: "I1", produsId: inv.produsId, culoare: inv.culoare, panotaj: inv.panotaj.map((p) => ({ lungimeM: p.lungimeM, bucati: p.bucati })) }], linii: accesorii.map((l, k) => ({ cheie: `L${k}`, rubrica: l.rubrica, produsId: l.produsId, cantitate: l.cantitate, invelitoare: "I1", culoare: null })), sipci: [], zonaB: [] } });
  if (pus.status !== 200) throw new Error("nu pot pregati oferta de proba: " + JSON.stringify(pus).slice(0, 300));
  const detaliu = async () => (await A.api(`/api/oferte/${noua.id}`)).oferta;
  const deschide = async (ancora = "") => {
    await page.goto(`${BAZA}/oferte/${noua.id}${ancora}`, { waitUntil: "networkidle0" });
    await page.waitForSelector(".oferta-fix");
    await pauza(1800);
  };

  const filaActiva = () => page.evaluate(() => document.querySelector('.rand-file [aria-selected="true"]')?.id.replace("tab-", "") ?? null);
  const laVedere = () => page.evaluate(() => ["generale", "produse", "preturi"].filter((f) => !document.getElementById(`fila-${f}`).hidden));
  const clicFila = async (f) => {
    await page.click(`#tab-${f}`);
    await pauza(350);
  };
  const stranse = () => page.evaluate(() => [...document.querySelectorAll(".zona-produse .rubrica")].filter((r) => r.classList.contains("stransa")).map((r) => r.dataset.rubrica));
  const rubrici = () => page.evaluate(() => [...document.querySelectorAll(".zona-produse .rubrica")].map((r) => r.dataset.rubrica));
  const randuriVizibile = (id) => page.evaluate((i) => [...document.querySelectorAll(`#rubrica-${i} tbody tr`)].filter((tr) => tr.offsetParent !== null).length, id);
  const clicBanda = async (id) => {
    await page.evaluate((i) => document.querySelector(`#rubrica-${i} > section.panou > h2`).click(), id);
    await pauza(250);
  };
  const fix = () => page.evaluate(() => {
    const r = document.querySelector(".oferta-fix").getBoundingClientRect();
    return { sus: Math.round(r.top), jos: Math.round(r.bottom), inaltime: Math.round(r.height), ecran: window.innerHeight };
  });
  const stareSalvare = () => page.evaluate(() => document.querySelector(".stare-salvare")?.textContent.trim() ?? "");
  const salvat = () => asteapta(async () => (await stareSalvare()) === "salvat", 15000);
  const status = (text) => page.evaluateHandle((t) => [...document.querySelectorAll(".rand-statusuri .bara-statusuri button")].find((b) => b.textContent.trim() === t) ?? null, text);

  // ================= intrarea in oferta: fila Produse, toate rubricile deschise =================
  await deschide();
  v.verifica("oferta se deschide în fila „Produse”; adresa ține fila (#produse)", (await filaActiva()) === "produse" && page.url().endsWith("#produse") && JSON.stringify(await laVedere()) === '["produse"]', page.url().split("/").pop());
  const toate = await rubrici();
  v.verifica("cele opt rubrici sunt pe pagină, în ordinea clasică", JSON.stringify(toate) === JSON.stringify(["invelitori", "standard", "speciale", "fixare", "pluvial", "sipca", "lungimi", "zonaB"]), toate.join(" · "));
  v.verifica("la intrarea în ofertă TOATE rubricile sunt deschise", (await stranse()).length === 0);
  const randuriStandard = await randuriVizibile("standard");
  const randuriFixare = await randuriVizibile("fixare");
  v.verifica("rubricile își arată lista întreagă (și rândurile fără cantitate)", randuriStandard >= 10 && randuriFixare >= 10, `Accesorii standard ${randuriStandard} rânduri, Fixare și etanșare ${randuriFixare}`);
  const bara = await page.evaluate(() => [...document.querySelectorAll(".bara-rubrici .salt-rubrica")].map((b) => ({ text: b.textContent.trim(), goala: b.classList.contains("goala") })));
  v.verifica("bara de rubrici: cele opt, cu numărul produselor care au cantitate; cele fără nimic apar șterse doar în bară", bara.length === 8 && /^Învelitori\s*1$/.test(bara[0].text) && bara.filter((b) => b.goala).length >= 3 && !bara[0].goala, bara.map((b) => (b.goala ? `(${b.text})` : b.text)).join(" · "));
  const grupa = await page.evaluate(() => {
    const g = document.querySelector('input[aria-label="Grupă %"]');
    return { inFilaProduse: Boolean(g?.closest("#fila-produse")), inRandurileFixe: Boolean(g?.closest(".oferta-fix")), inaintea: Boolean(g && g.compareDocumentPosition(document.getElementById("rubrica-invelitori")) & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  v.verifica("„Grupă %” e sus în fila Produse, înaintea învelitorilor — nu în rândurile fixe", grupa.inFilaProduse && !grupa.inRandurileFixe && grupa.inaintea);
  await A.captura("b-01-m12-produse-la-intrare");

  // ================= randurile fixe =================
  await page.evaluate(() => window.scrollTo(0, 1400));
  await pauza(400);
  let f = await fix();
  const fixeLaVedere = await page.evaluate(() => [".rand-oferta", ".rand-statusuri", ".rand-file", ".bara-rubrici"].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; }));
  v.verifica("cele trei rânduri (și bara de rubrici) rămân la vedere când derulezi", f.sus === 0 && fixeLaVedere.every(Boolean), `după derulare: rândurile fixe ${f.inaltime} px, sus la ${f.sus}`);
  await A.captura("b-02-m12-randurile-fixe-la-derulare");

  // ================= pozitia tinuta pe fiecare fila; nimic nu se pierde =================
  const yProduse = await page.evaluate(() => window.scrollY);
  await clicFila("preturi");
  v.verifica("clic pe „Prețuri și documente”: fila se schimbă, adresa devine #preturi", (await filaActiva()) === "preturi" && page.url().endsWith("#preturi") && JSON.stringify(await laVedere()) === '["preturi"]');
  await page.evaluate(() => window.scrollTo(0, 300));
  await pauza(200);
  await clicFila("produse");
  const yInapoi = await page.evaluate(() => window.scrollY);
  v.verifica("fiecare filă își ține locul: înapoi la Produse exact unde erai", Math.abs(yInapoi - yProduse) <= 2, `${yProduse} → ${yInapoi}`);
  await clicFila("preturi");
  v.verifica("…și Prețurile la locul lor", Math.abs((await page.evaluate(() => window.scrollY)) - 300) <= 2);

  // ================= Alt + 1 / 2 / 3; reincarcarea revine in aceeasi fila =================
  const alt = async (cifra) => {
    await page.keyboard.down("Alt");
    await page.keyboard.press(`Digit${cifra}`);
    await page.keyboard.up("Alt");
    await pauza(300);
    return filaActiva();
  };
  const cuTaste = [await alt(1), await alt(3), await alt(2)];
  v.verifica("Alt + 1 / 3 / 2 schimbă fila", JSON.stringify(cuTaste) === '["generale","preturi","produse"]', cuTaste.join(" → "));
  await alt(3);
  await page.reload({ waitUntil: "networkidle0" });
  await pauza(1500);
  v.verifica("reîncărcarea revine în aceeași filă (Prețuri și documente)", (await filaActiva()) === "preturi" && page.url().endsWith("#preturi"));
  await A.captura("b-03-m12-preturi-si-documente");
  const inPreturi = await page.evaluate(() => [...document.querySelectorAll("#fila-preturi h2")].map((h) => h.childNodes[0].textContent.trim()));
  v.verifica("fila Prețuri și documente: Rezultat, Prețuri, Documente", ["Rezultat", "Prețuri", "Documente (PDF și formulare Bilka)"].every((t) => inPreturi.includes(t)), inPreturi.join(" · "));

  // ================= benzile: strans / deschis, fara nicio schimbare in oferta =================
  await clicFila("produse");
  const inainteDeStrans = JSON.stringify((await detaliu()).linii.map((l) => [l.produsId, l.cantitate]));
  scrieri.length = 0;
  await clicBanda("standard");
  const rezumatBanda = await page.evaluate(() => getComputedStyle(document.querySelector("#rubrica-standard > section.panou > h2"), "::after").content);
  v.verifica("un clic pe banda „Accesorii standard” o strânge pe un rând; banda arată ce are completat", JSON.stringify(await stranse()) === '["standard"]' && (await randuriVizibile("standard")) === 0 && /produs/.test(rezumatBanda), rezumatBanda);
  await clicBanda("fixare");
  await clicBanda("invelitori");
  const rezumatInv = await page.evaluate(() => getComputedStyle(document.querySelector("#rubrica-invelitori > section.panou > h2"), "::after").content);
  v.verifica("învelitoarea strânsă arată model · finisaj · grosime · culoare · mp · coli", /mat/.test(rezumatInv) && /mp/.test(rezumatInv) && /coli/.test(rezumatInv), rezumatInv);
  await page.evaluate(() => window.scrollTo(0, 0));
  await pauza(200);
  await A.captura("b-04-m12-rubrici-stranse");
  v.verifica("strângerea nu trimite nimic spre server", scrieri.length === 0, scrieri.join(", ") || "nicio cerere de scriere");
  await clicFila("generale");
  await clicFila("produse");
  v.verifica("alegerea se ține minte la schimbarea filei", JSON.stringify((await stranse()).sort()) === '["fixare","invelitori","standard"]');
  await page.click(".salveaza-oferta");
  await pauza(900);
  v.verifica("…și după „Salvează”; o salvare cu rubrici strânse nu schimbă nimic în ofertă", JSON.stringify((await stranse()).sort()) === '["fixare","invelitori","standard"]' && JSON.stringify((await detaliu()).linii.map((l) => [l.produsId, l.cantitate])) === inainteDeStrans);
  await clicBanda("standard");
  v.verifica("încă un clic o deschide la loc, cu toate rândurile ei", !(await stranse()).includes("standard") && (await randuriVizibile("standard")) === randuriStandard, `${await randuriVizibile("standard")} rânduri`);
  // saltul din bara: deschide rubrica stransa si o aduce sub randurile fixe
  await page.evaluate(() => [...document.querySelectorAll(".bara-rubrici .salt-rubrica")].find((b) => b.textContent.trim().startsWith("Fixare")).click());
  await pauza(600);
  f = await fix();
  const susFixare = await page.evaluate(() => Math.round(document.getElementById("rubrica-fixare").getBoundingClientRect().top));
  v.verifica("clic în bara de rubrici: sare la „Fixare și etanșare”, sub rândurile fixe, și o deschide (era strânsă)", !(await stranse()).includes("fixare") && susFixare >= f.jos - 2 && susFixare <= f.jos + 30 && (await randuriVizibile("fixare")) === randuriFixare, `rubrica începe la ${susFixare} px, rândurile fixe se termină la ${f.jos} px`);
  const activaInBara = await page.evaluate(() => document.querySelector(".bara-rubrici .salt-rubrica.activa")?.textContent.trim() ?? "");
  v.verifica("bara arată rubrica la care ești", activaInBara.startsWith("Fixare"), activaInBara);
  await A.captura("b-05-m12-salt-din-bara");
  await page.reload({ waitUntil: "networkidle0" });
  await pauza(1500);
  v.verifica("după redeschidere toate rubricile sunt din nou deschise", (await stranse()).length === 0 && (await filaActiva()) === "produse");

  // ================= „Grupă %” schimba achizitia afisata in Preturi =================
  const achizitie = () => page.evaluate(() => [...document.querySelectorAll("#fila-preturi .grila-totaluri > div")].find((d) => /Total achiziție/.test(d.textContent))?.querySelector(".numar-mare")?.textContent.trim() ?? "");
  const achizitieInainte = await achizitie();
  await scrieIn(page, await page.$('input[aria-label="Grupă %"]'), "5");
  v.verifica("„Grupă %” scrisă: starea trece pe „nesalvat”, apoi „salvat” (salvare automată)", (await asteapta(async () => ["nesalvat", "se salvează…"].includes(await stareSalvare()), 3000)) && (await salvat()));
  await clicFila("preturi");
  const achizitieDupa = await achizitie();
  v.verifica("grupa scrisă schimbă achiziția afișată în Prețuri, ca înainte", achizitieInainte !== "" && achizitieDupa !== "" && achizitieDupa !== achizitieInainte, `${achizitieInainte} → ${achizitieDupa}`);
  await clicFila("produse");
  await scrieIn(page, await page.$('input[aria-label="Grupă %"]'), "0");
  await salvat();

  // ================= Date generale; „Salvează” din orice fila =================
  await clicFila("generale");
  const inGenerale = await page.evaluate(() => [...document.querySelectorAll("#fila-generale h2")].map((h) => h.childNodes[0].textContent.trim()));
  v.verifica("fila Date generale: Client, Antet, Montator și recomandare, Livrarea de la Bilka, Notițe și atașamente, Istoric", ["Client", "Antet", "Montator și recomandare", "Livrarea de la Bilka", "Notițe și atașamente", "Istoric"].every((t) => inGenerale.includes(t)), inGenerale.join(" · "));
  const punct = await page.evaluate(() => ({ generale: document.querySelector("#tab-generale .fila-rezumat")?.textContent.trim(), punct: Boolean(document.querySelector("#tab-generale .punct-rosu")), alte: document.querySelectorAll("#tab-produse .punct-rosu, #tab-preturi .punct-rosu").length }));
  v.verifica("punctul roșu e pe Date generale, cu „fără telefon” sub nume; pe celelalte file nu", punct.punct && punct.generale === "fără telefon" && punct.alte === 0, JSON.stringify(punct));
  await A.captura("b-06-m12-date-generale");
  const note = await page.evaluateHandle(() => [...document.querySelectorAll("#antet label.camp")].find((l) => l.querySelector("span").textContent.trim() === "Note")?.querySelector("input"));
  await scrieIn(page, note.asElement(), "notă scrisă din fila Date generale");
  await pauza(200);
  v.verifica("o modificare în antet: rândul ofertei arată „nesalvat”", (await stareSalvare()) === "nesalvat");
  await clicFila("produse");
  v.verifica("schimbarea filei nu pierde ce ai scris (rămâne „nesalvat”)", (await stareSalvare()) === "nesalvat");
  await page.click(".salveaza-oferta");
  v.verifica("„Salvează” din rândul ofertei salvează antetul și din fila Produse", (await salvat()) && (await detaliu()).note === "notă scrisă din fila Date generale");
  // meniul cu trei puncte: Istoric duce in Date generale, la Istoric
  await page.evaluate(() => [...document.querySelectorAll(".rand-oferta .meniu-actiuni > button")].find((b) => b.textContent.trim() === "⋯").click());
  await pauza(200);
  const dinMeniu = await page.evaluate(() => [...document.querySelectorAll('.rand-oferta .meniu-actiuni [role="menuitem"]')].filter((b) => b.offsetParent !== null).map((b) => b.childNodes[0].textContent.trim()));
  await page.evaluate(() => [...document.querySelectorAll('.rand-oferta .meniu-actiuni [role="menuitem"]')].find((b) => b.childNodes[0].textContent.trim() === "Istoric").click());
  await pauza(600);
  f = await fix();
  const susIstoric = await page.evaluate(() => Math.round(document.getElementById("istoric").getBoundingClientRect().top));
  v.verifica("„⋯” are cele șapte acțiuni de dinainte; „Istoric” duce în Date generale, la Istoric", dinMeniu.length === 7 && (await filaActiva()) === "generale" && susIstoric >= f.jos - 2 && susIstoric < f.ecran, dinMeniu.join(" · "));
  const butoaneRand = await page.evaluate(() => [...document.querySelectorAll(".rand-oferta .rand-oferta-dreapta > a, .rand-oferta .rand-oferta-dreapta > button, .rand-oferta .rand-oferta-dreapta .meniu-actiuni > button")].filter((b) => b.offsetParent !== null).map((b) => b.textContent.trim()));
  v.verifica("rândul ofertei are butoanele paginii: ← Oferte, Află preț, PDF ▾, ⋯, Salvează", ["← Oferte", "Află preț", "PDF ▾", "⋯", "Salvează"].every((t) => butoaneRand.includes(t)), butoaneRand.join(" · "));

  // ================= statusul dintr-un clic =================
  await (await status("Transmisă")).asElement().click();
  await asteapta(async () => (await detaliu()).status === "TRANSMISA", 8000);
  const curent = await page.evaluate(() => document.querySelector(".rand-statusuri .status-curent")?.textContent.trim());
  const optStatusuri = await page.evaluate(() => [...document.querySelectorAll(".rand-statusuri .bara-statusuri button")].map((b) => b.textContent.trim()));
  v.verifica("rândul statusurilor are cele opt, iar un clic pe „Transmisă” schimbă statusul", optStatusuri.length === 8 && curent === "Transmisă" && (await detaliu()).status === "TRANSMISA", optStatusuri.join(" · "));
  const mentiuni = await page.evaluate(() => ["generale", "produse", "preturi"].map((x) => Boolean(document.querySelector(`#fila-${x} .mentiuni-istoric input`))));
  v.verifica("după „Transmisă”, „Mențiuni pentru istoric” apare sus în fiecare filă (nu în rândurile fixe)", mentiuni.every(Boolean) && !(await page.$(".oferta-fix .mentiuni-istoric")));
  await page.type("#fila-generale .mentiuni-istoric input", "cererea clientului");
  await clicFila("preturi");
  v.verifica("…cu aceeași valoare în toate filele", (await page.$eval("#fila-preturi .mentiuni-istoric input", (i) => i.value)) === "cererea clientului");
  await (await status("Avans luat")).asElement().click();
  await pauza(300);
  const subRand = await page.evaluate(() => ({ camp: Boolean(document.querySelector(".oferta-fix .sub-statusuri input")), text: document.querySelector(".oferta-fix .sub-statusuri")?.textContent ?? "" }));
  v.verifica("„Avans luat”: câmpul sumei se deschide imediat sub rândul statusurilor", subRand.camp && /Suma avansului/.test(subRand.text));
  await A.captura("b-07-m12-avans-sub-randul-statusurilor");
  await page.evaluate(() => [...document.querySelectorAll(".sub-statusuri button")].find((b) => b.textContent.trim() === "Renunță").click());
  await pauza(200);

  // ================= „Comandat” blocat: salt la fila si la camp =================
  await clicFila("produse");
  await page.evaluate(() => window.scrollTo(0, 600));
  await (await status("De comandat")).asElement().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  const dialogLivrare = await page.evaluate(() => document.querySelector('[role="dialog"]')?.textContent ?? "");
  v.verifica("„De comandat”: se deschide dialogul „Livrarea de la Bilka”, ca până acum", /Livrarea de la Bilka/i.test(dialogLivrare));
  await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((b) => /De comandat/.test(b.textContent)).click());
  await asteapta(async () => (await detaliu()).status === "DE_COMANDAT", 8000);
  await pauza(300);
  await (await status("Comandat")).asElement().click(); // confirmarea „ireversibil” e acceptata de script
  await asteapta(async () => (await filaActiva()) === "generale", 8000);
  await pauza(600);
  const blocaj = await page.evaluate(() => ({ fila: document.querySelector('.rand-file [aria-selected="true"]')?.id, focus: document.activeElement?.getAttribute("type"), inClient: Boolean(document.activeElement?.closest("#client")), mesaj: document.querySelector("#client .camp.cu-eroare .eroare-camp")?.textContent ?? "", subStatus: document.querySelector(".sub-statusuri")?.textContent ?? "" }));
  v.verifica("„Comandat” fără telefon: softul trece singur în Date generale, cu cursorul pe Telefon și mesajul sub câmp", blocaj.fila === "tab-generale" && blocaj.focus === "tel" && blocaj.inClient && /lipsește/i.test(blocaj.mesaj) && (await detaliu()).status === "DE_COMANDAT", `${blocaj.mesaj} · sub statusuri: ${blocaj.subStatus.slice(0, 70)}`);
  await A.captura("b-08-m12-comandat-blocat-salt-la-telefon");
  const livrareInGenerale = await page.evaluate(() => document.getElementById("livrare-bilka")?.textContent ?? "");
  v.verifica("„Livrarea de la Bilka” (cu „Schimbă”) e în fila Date generale", /depozit/i.test(livrareInGenerale) && /Schimbă/.test(livrareInGenerale), livrareInGenerale.replace(/\s+/g, " ").slice(0, 80));

  // ================= oferta noua, goala =================
  const goala = (await A.api("/api/oferte", { method: "POST", body: { client: { nume: "Ofertă Goală M12", adresa: "Str. Goală 1", localitate: "Focșani" } } })).oferta;
  await page.goto(`${BAZA}/oferte/${goala.id}`, { waitUntil: "networkidle0" });
  await pauza(1500);
  const peGoala = { stranse: await stranse(), rubrici: await rubrici(), bara: await page.evaluate(() => [...document.querySelectorAll(".bara-rubrici .salt-rubrica")].filter((b) => b.classList.contains("goala")).length), fila: await filaActiva() };
  v.verifica("ofertă nouă, goală: fila Produse, toate rubricile deschise; în bară toate apar șterse", peGoala.fila === "produse" && peGoala.stranse.length === 0 && peGoala.rubrici.length === 8 && peGoala.bara === 8, JSON.stringify(peGoala));
  await A.captura("b-09-m12-oferta-noua-goala");

  // ================= oferta comandata =================
  const comandata = ((await A.api("/api/oferte?q=" + encodeURIComponent("Ordine Documente"))).oferte ?? [])[0];
  await page.goto(`${BAZA}/oferte/${comandata.id}#date-generale`, { waitUntil: "networkidle0" });
  await pauza(1500);
  const laComandat = await page.evaluate(() => {
    const b = [...document.querySelectorAll(".rand-statusuri .bara-statusuri button")];
    return { opt: b.length, stinse: b.filter((x) => x.disabled).length, curent: document.querySelector(".rand-statusuri .status-curent")?.textContent.trim(), primaCaseta: document.querySelector("#fila-generale .coloane-generale h2")?.childNodes[0].textContent.trim(), comanda: document.getElementById("comanda-ofertei")?.textContent ?? "", puncte: document.querySelectorAll(".rand-file .punct-rosu").length, rezumat: document.querySelector("#tab-generale .fila-rezumat")?.textContent.trim(), salveaza: document.querySelector(".salveaza-oferta")?.disabled };
  });
  v.verifica("la „Comandat”: toate cele opt statusuri la vedere, stinse, „Comandat” închis la culoare", laComandat.opt === 8 && laComandat.stinse === 8 && laComandat.curent === "Comandat");
  v.verifica("caseta „Comandă” e prima din Date generale (textul, rezumatul comenzii, total · avans · rest)", laComandat.primaCaseta === "Comandă" && /Oferta e comandată din/.test(laComandat.comanda) && /Rezumatul comenzii/.test(laComandat.comanda) && /avans/.test(laComandat.comanda));
  v.verifica("pe o ofertă comandată punctul roșu nu apare", laComandat.puncte === 0 && laComandat.rezumat === "comandată" && laComandat.salveaza === true, JSON.stringify({ puncte: laComandat.puncte, rezumat: laComandat.rezumat }));
  await A.captura("b-10-m12-comandata-date-generale");
  const formulare = await page.evaluate(() => [...document.querySelectorAll(".rand-oferta button")].filter((b) => b.offsetParent !== null).map((b) => b.textContent.trim()).find((t) => t.startsWith("Formulare Bilka")) ?? "");
  v.verifica("butonul „Formulare Bilka (n)” e în rândul ofertei la „Comandat”", /^Formulare Bilka \(\d+\)$/.test(formulare), formulare);

  // ================= telefon (390 px) =================
  await A.telefon();
  await deschide("#produse");
  f = await fix();
  const tel = await page.evaluate(() => ({ latime: document.documentElement.scrollWidth, ecran: window.innerWidth, file: [...document.querySelectorAll(".rand-file .fila-buton")].map((b) => Math.round(b.getBoundingClientRect().top)), statusuriDeruleaza: document.querySelector(".rand-statusuri .bara-statusuri").scrollWidth > document.querySelector(".rand-statusuri .bara-statusuri").clientWidth, baraDeruleaza: document.querySelector(".bara-rubrici").scrollWidth > document.querySelector(".bara-rubrici").clientWidth, randOferta: [...document.querySelectorAll(".rand-oferta h1, .rand-oferta .total-oferta, .rand-oferta .salveaza-oferta, .rand-oferta .meniu-actiuni > button")].filter((e) => e.offsetParent !== null).map((e) => Math.round(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2)), ascunse: [...document.querySelectorAll(".rand-oferta .doar-lat")].every((e) => e.offsetParent === null) }));
  v.verifica("telefon: rândurile fixe nu trec de o treime din ecran", f.inaltime <= f.ecran / 3, `${f.inaltime} px din ${f.ecran} (${Math.round((100 * f.inaltime) / f.ecran)} %)`);
  v.verifica("telefon: rândul ofertei pe o singură linie (număr, total, „⋯”, „Salvează”); restul butoanelor în „⋯”", tel.ascunse && tel.randOferta.length >= 4 && Math.max(...tel.randOferta) - Math.min(...tel.randOferta) <= 6, tel.randOferta.join(", "));
  v.verifica("telefon: filele sunt un rând de trei butoane; statusurile și bara de rubrici se derulează lateral; pagina nu iese din lățime", new Set(tel.file).size === 1 && tel.file.length === 3 && tel.statusuriDeruleaza && tel.baraDeruleaza && tel.latime <= tel.ecran, JSON.stringify({ latime: tel.latime, ecran: tel.ecran }));
  await page.evaluate(() => [...document.querySelectorAll(".rand-oferta .meniu-actiuni > button")].find((b) => b.textContent.trim() === "⋯").click());
  await pauza(200);
  const meniuTelefon = await page.evaluate(() => [...document.querySelectorAll('.rand-oferta .meniu-actiuni [role="menuitem"]')].filter((b) => b.offsetParent !== null).map((b) => b.childNodes[0].textContent.trim()));
  v.verifica("telefon: „⋯” are și ← Oferte, Află preț și PDF-urile", ["← Oferte", "Află preț", "Ofertă (PDF)", "Copiază oferta", "Istoric"].every((t) => meniuTelefon.includes(t)), meniuTelefon.join(" · "));
  await A.captura("b-11-m12-telefon-meniu");
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.body.click());
  await pauza(200);
  await clicBanda("standard");
  v.verifica("telefon: rubricile sunt deschise la intrare și se strâng la atingerea benzii", JSON.stringify(await stranse()) === '["standard"]');
  await A.desktop();

  await browser.close();
  process.exit(v.sumar() ? 1 : 0);
})().catch((e) => {
  console.error("EROARE", e);
  process.exit(2);
});
