import { describe, expect, it } from "vitest";
import { calculeazaOferta } from "../../src/modules/mot/calcul.js";
import { agregaLucrare } from "../../src/modules/mot/lucrare.js";
import { asteptariDinIntrari, compara, incarcaEtalon, listeazaEtaloane, obtinuteDinIntrari, raport, spreAsteptat, vanzariSpreAsteptat } from "./incarcaEtalon.js";

// Ofertele-model (docs/ETALON.md, docs/etalon/E*.json): fiecare fisier e un
// test care compara rezultatul motorului cifra cu cifra cu blocul "asteptat"
// (linii, totaluri, vanzari, abatere, zona B, pachete) si cu valorile asteptate
// din "intrari" (mp din panotaj, ml, sipca, pachetul fiecarei linii).
// Ruleaza separat: npm run test:etalon (fara baza de date). Pana la S11 sunt
// rosii - raportul arata cate diferente mai sunt.

const ids = listeazaEtaloane();

describe("ETALON — ofertele-model", () => {
  it("exista 12 oferte-model", () => {
    expect(ids).toHaveLength(12);
  });

  for (const id of ids) {
    it(`${id} reproduce blocul asteptat`, () => {
      const { etalon, fisier, intrare } = incarcaEtalon(id);
      const rezultat = calculeazaOferta(intrare);

      const obtinut = spreAsteptat(rezultat, intrare);
      // completare (cap. 2b): lucrarea = oferta initiala + completarea, in tabelul de vanzari
      const bazaId = etalon.intrari.completare_la;
      if (bazaId) {
        const baza = incarcaEtalon(bazaId);
        obtinut[`lucrare_${bazaId}_recalculata`] = vanzariSpreAsteptat(agregaLucrare(calculeazaOferta(baza.intrare), [rezultat], intrare.tvaPct));
      }
      const diferente = compara(etalon.asteptat, obtinut);
      compara(asteptariDinIntrari(etalon), obtinuteDinIntrari(rezultat, intrare, etalon), "intrari", diferente);

      if (diferente.length > 0) {
        expect.fail(`${etalon.titlu}\n${raport(id, fisier, diferente)}`);
      }
    });
  }
});
