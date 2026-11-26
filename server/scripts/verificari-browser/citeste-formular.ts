// Citeste inapoi un formular de comanda Bilka (.xlsm) generat de aplicatie si scrie, ca JSON, randurile de pe
// foaia accesoriilor la lungimi ("D05 2.5×4") si cantitatile specialelor 2 ML de pe foaia comenzii, pe trepte.
// Folosit de scripturile de verificare in browser (ex. s29b-editor.cjs): npx tsx citeste-formular.ts <fisier.xlsm>
import { readFileSync } from "node:fs";
import { citesteSablon } from "../../src/modules/ofe/formularBilka/sablon.js";

const s = citesteSablon(readFileSync(process.argv[2]));
const h = s.harta.speciale;
const celule = s.celule(h.foaie);
const lungimi = h.randuri
  .map((r) => ({ cod: celule.get(`${h.coloane.cod}${r}`)?.v, lungime: celule.get(`${h.coloane.lungime}${r}`)?.v, bucati: celule.get(`${h.coloane.bucati}${r}`)?.v }))
  .filter((x) => x.cod || x.lungime || x.bucati)
  .map((x) => `${String(x.cod ?? "").replace("ACCESORIU SPECIAL ", "")} ${x.lungime}×${x.bucati}`);
// specialele 2 ML stau pe randul treptei lor: D01 -> randul 81 ... D25 -> randul 105 (coloana F)
const comanda = s.celule(s.harta.foaie.comanda);
const speciale: Record<string, string> = {};
for (let t = 1; t <= 25; t++) {
  const v = comanda.get(`F${80 + t}`)?.v;
  if (v) speciale[`D${String(t).padStart(2, "0")}`] = String(v);
}
console.log(JSON.stringify({ lungimi, locuri: h.randuri.length, speciale }));
