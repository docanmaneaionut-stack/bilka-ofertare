// Compara doua fotografii ale paginii ofertei facute cu inventar-oferta.cjs (inainte / dupa o schimbare de ecran):
// - rubricile zonei de produse: aceleasi randuri, in aceeasi ordine, aceleasi campuri, valori, butoane, mesaje;
// - inventarul paginii: titlurile, campurile, butoanele si mesajele dinainte exista si dupa.
// Diferentele asteptate (lucruri mutate sau redenumite cu buna stiinta) se dau in "asteptate" si se listeaza separat.
// Folosire: node compara-inventar.cjs <inainte.json> <dupa.json>
const fs = require("fs");
const [INAINTE, DUPA] = process.argv.slice(2);
const a = JSON.parse(fs.readFileSync(INAINTE, "utf8"));
const b = JSON.parse(fs.readFileSync(DUPA, "utf8"));
const norm = (s) => String(s).replace(/\s+/g, " ").trim().toLowerCase();

// S29 (M12): ce s-a mutat / redenumit cu buna stiinta (docs/MODIFICARI-S29.md, inventarul din planul S29)
const ASTEPTATE = {
  titluri: [
    ["h2 status:", "statusurile stau pe randul lor fix (fara titlu)"],
    ["h2 produse", "titlul zonei = fila „Produse”"],
  ],
  butoane: [["salvează antetul și clientul", "devine „Salvează” din randul ofertei"]],
  mesaje: [],
};
const asteptata = (fel, text) => (ASTEPTATE[fel] ?? []).find(([t]) => norm(text) === t || norm(text).startsWith(t));

let diferente = 0;
const spune = (...x) => console.log(...x);
for (const numar of Object.keys(a)) {
  if (!b[numar]) {
    spune(`${numar}: lipseste din fotografia de dupa`);
    diferente += 1;
    continue;
  }
  spune(`\n== ${numar}`);
  // ---- rubricile
  const dupaTitlu = new Map(b[numar].rubrici.map((r) => [norm(r.titlu), r]));
  let randuri = 0;
  for (const r of a[numar].rubrici) {
    if (norm(r.titlu) === "rezultat") continue; // rezultatul intreg s-a mutat in fila „Preturi si documente” (verificat separat)
    const d = dupaTitlu.get(norm(r.titlu));
    if (!d) {
      spune(`  PICA rubrica „${r.titlu}” lipseste`);
      diferente += 1;
      continue;
    }
    randuri += r.randuri.length;
    for (const cheie of ["benzi", "randuri", "campuri", "valori", "butoane", "cautari", "mesaje"]) {
      const x = (r[cheie] ?? []).map(norm);
      const y = (d[cheie] ?? []).map(norm);
      if (JSON.stringify(x) !== JSON.stringify(y)) {
        diferente += 1;
        spune(`  PICA „${r.titlu}” · ${cheie}: ${x.length} inainte, ${y.length} dupa`);
        const n = Math.max(x.length, y.length);
        for (let i = 0; i < n; i++) if (x[i] !== y[i]) spune(`       [${i}] inainte: ${x[i] ?? "—"}\n           dupa:    ${y[i] ?? "—"}`);
      }
    }
  }
  const ordineInainte = a[numar].rubrici.map((r) => norm(r.titlu)).filter((t) => t !== "rezultat");
  const ordineDupa = b[numar].rubrici.map((r) => norm(r.titlu)).filter((t) => ordineInainte.includes(t));
  if (JSON.stringify(ordineInainte) !== JSON.stringify(ordineDupa)) {
    diferente += 1;
    spune(`  PICA ordinea rubricilor: ${ordineInainte.join(" > ")}  ≠  ${ordineDupa.join(" > ")}`);
  }
  spune(`  rubrici: ${ordineInainte.length}, cu ${randuri} randuri in total - comparate rand cu rand`);
  // ---- inventarul paginii: tot ce era inainte exista si dupa (de cate ori era)
  for (const fel of ["titluri", "campuri", "butoane", "mesaje"]) {
    const dupa = b[numar].pagina[fel].map(norm);
    const ramase = [...dupa];
    const lipsa = [];
    for (const t of a[numar].pagina[fel].map(norm)) {
      const i = ramase.indexOf(t);
      if (i >= 0) ramase.splice(i, 1);
      else lipsa.push(t);
    }
    const neasteptate = lipsa.filter((t) => !asteptata(fel, t));
    spune(`  ${fel}: ${a[numar].pagina[fel].length} inainte, ${dupa.length} dupa; mutate cu buna stiinta: ${lipsa.length - neasteptate.length}; LIPSA: ${neasteptate.length}; noi: ${ramase.length}`);
    for (const t of lipsa.filter((x) => asteptata(fel, x))) spune(`     mutat: „${t}” — ${asteptata(fel, t)[1]}`);
    for (const t of neasteptate) spune(`     PICA lipseste: „${t.slice(0, 140)}”`);
    for (const t of ramase) spune(`     nou: „${t.slice(0, 140)}”`);
    diferente += neasteptate.length;
  }
}
spune(`\n${diferente === 0 ? "Nicio diferenta neasteptata." : diferente + " diferente neasteptate."}`);
process.exit(diferente ? 1 : 0);
