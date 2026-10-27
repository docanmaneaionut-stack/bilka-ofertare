import { describe, expect, it } from "vitest";
import { calculeazaOferta } from "../../src/modules/mot/calcul.js";
import { asteptariDinIntrari, compara, incarcaEtalon, listeazaEtaloane, obtinuteDinIntrari, raport, spreAsteptat } from "./incarcaEtalon.js";

// Ofertele-model (docs/ETALON.md, docs/etalon/E*.json): fiecare fisier e un
// test care compara rezultatul motorului cifra cu cifra cu blocul "asteptat"
// (linii, totaluri, vanzari, abatere, zona B, pachete) si cu valorile asteptate
// din "intrari" (mp din panotaj, ml, sipca, pachetul fiecarei linii).
// Ruleaza separat: npm run test:etalon (fara baza de date). Pana la S11 sunt
// rosii - raportul arata cate diferente mai sunt.

const ids = listeazaEtaloane();

describe("ETALON — ofertele-model", () => {
  it("exista 11 oferte-model", () => {
    expect(ids).toHaveLength(11);
  });

  for (const id of ids) {
    it(`${id} reproduce blocul asteptat`, () => {
      const { etalon, fisier, intrare } = incarcaEtalon(id);
      const rezultat = calculeazaOferta(intrare);

      const diferente = compara(etalon.asteptat, spreAsteptat(rezultat, intrare));
      compara(asteptariDinIntrari(etalon), obtinuteDinIntrari(rezultat, intrare, etalon), "intrari", diferente);

      if (diferente.length > 0) {
        expect.fail(`${etalon.titlu}\n${raport(id, fisier, diferente)}`);
      }
    });
  }
});
