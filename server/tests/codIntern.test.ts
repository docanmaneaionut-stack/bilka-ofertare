import { describe, expect, it } from "vitest";
import { genereazaCodIntern } from "../src/modules/cat/codIntern.js";

describe("genereazaCodIntern", () => {
  it("e determinist: aceleasi intrari produc acelasi cod", () => {
    const a = genereazaCodIntern({ codScurtCompartiment: "BIL", codFurnizor: "TMDACLUC060", denumire: "Țiglă Dacic" });
    const b = genereazaCodIntern({ codScurtCompartiment: "BIL", codFurnizor: "TMDACLUC060", denumire: "Țiglă Dacic" });
    expect(a).toBe(b);
  });

  it("incepe cu prefixul compartimentului, cu majuscule", () => {
    const cod = genereazaCodIntern({ codScurtCompartiment: "bil", codFurnizor: "X", denumire: "Y" });
    expect(cod.startsWith("BIL-")).toBe(true);
  });

  it("acelasi cod furnizor dar denumiri diferite produce coduri diferite (un cod, doua produse)", () => {
    const a = genereazaCodIntern({
      codScurtCompartiment: "BIL",
      codFurnizor: "TPLANLUC070",
      denumire: "Tablă plană – învelitoare la mp",
    });
    const b = genereazaCodIntern({
      codScurtCompartiment: "BIL",
      codFurnizor: "TPLANLUC070",
      denumire: "Tablă plană – accesoriu la coală",
    });
    expect(a).not.toBe(b);
  });

  it("fara cod furnizor (produse noi, necodificate), codul depinde doar de denumire", () => {
    const a = genereazaCodIntern({ codScurtCompartiment: "BIL", codFurnizor: null, denumire: "Produs nou" });
    const b = genereazaCodIntern({ codScurtCompartiment: "BIL", codFurnizor: undefined, denumire: "Produs nou" });
    expect(a).toBe(b);
  });
});
