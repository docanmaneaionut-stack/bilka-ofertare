import { describe, expect, it } from "vitest";
import { cursPentruMoment, dataLimitaCurs, lipsesteCursulZilei, localRomania, parseazaBnrXml, type CursZi } from "../src/modules/curs/regula.js";
import { cursuriDinXmlBnr, parseazaCursbnr, preiaCursuri } from "../src/modules/curs/serviciu.js";
import { normalizeazaTelefon } from "../src/modules/ofe/clienti.js";

// Regula orei 13:00 (FISA-OFERTARE 11.8), cu ceas controlat: pana la publicarea
// BNR cursul zilei e cel din ziua precedenta; weekendul cade pe ultima data publicata.

const CURSURI: CursZi[] = [
  { data: "2026-10-27", curs: "5.3485", sursa: "BNR" },
  { data: "2026-10-26", curs: "5.3297", sursa: "BNR" },
  { data: "2026-10-23", curs: "5.3285", sursa: "BNR" }, // vineri; 24-25 weekend
];

// ora Romaniei in octombrie 2026 (dupa trecerea la ora de iarna, 25.10): UTC+2
const laBucuresti = (data: string, ora: string) => new Date(`${data}T${ora}:00+02:00`);

describe("regula 13:00", () => {
  it("inainte de 13:00 cursul zilei e cel de ieri; de la 13:00 e cel de azi", () => {
    expect(localRomania(laBucuresti("2026-10-27", "12:59"))).toEqual({ data: "2026-10-27", ora: 12 });
    expect(dataLimitaCurs(laBucuresti("2026-10-27", "12:59"))).toBe("2026-10-26");
    expect(dataLimitaCurs(laBucuresti("2026-10-27", "13:00"))).toBe("2026-10-27");
    expect(cursPentruMoment(laBucuresti("2026-10-27", "12:59"), CURSURI)?.curs).toBe("5.3297");
    expect(cursPentruMoment(laBucuresti("2026-10-27", "13:00"), CURSURI)?.curs).toBe("5.3485");
  });

  it("weekend si sarbatori: ultima data publicata", () => {
    expect(cursPentruMoment(laBucuresti("2026-10-25", "18:00"), CURSURI)?.data).toBe("2026-10-23"); // duminica
    expect(cursPentruMoment(laBucuresti("2026-10-26", "09:00"), CURSURI)?.data).toBe("2026-10-23"); // luni dimineata
    expect(cursPentruMoment(laBucuresti("2026-10-26", "13:30"), CURSURI)?.data).toBe("2026-10-26");
  });

  it("ora Romaniei, nu UTC: 11:30 UTC = 13:30 la Bucuresti", () => {
    expect(dataLimitaCurs(new Date("2026-10-27T11:30:00Z"))).toBe("2026-10-27");
    expect(dataLimitaCurs(new Date("2026-10-27T10:59:00Z"))).toBe("2026-10-26");
  });

  it("cursul zilei lipseste doar dupa 13:00 si doar daca nu e in tabel", () => {
    expect(lipsesteCursulZilei(laBucuresti("2026-10-28", "12:00"), CURSURI)).toBe(false);
    expect(lipsesteCursulZilei(laBucuresti("2026-10-28", "13:01"), CURSURI)).toBe(true);
    expect(lipsesteCursulZilei(laBucuresti("2026-10-27", "15:00"), CURSURI)).toBe(false);
  });

  it("fara niciun curs valabil intoarce null", () => {
    expect(cursPentruMoment(laBucuresti("2026-10-20", "15:00"), CURSURI)).toBeNull();
    expect(cursPentruMoment(laBucuresti("2026-10-27", "15:00"), [])).toBeNull();
  });
});

describe("parsarea surselor", () => {
  it("nbrfxrates.xml: data cubului si cursul EUR cu 4 zecimale", () => {
    const xml = `<?xml version="1.0"?><DataSet><Body><Cube date="2026-10-27"><Rate currency="AED">1.2345</Rate><Rate currency="EUR">5.3485</Rate><Rate currency="USD">4.61</Rate></Cube></Body></DataSet>`;
    expect(parseazaBnrXml(xml)).toEqual([{ data: "2026-10-27", curs: "5.3485", sursa: "BNR" }]);
  });

  it("fisierul anual: toate cuburile, in ordine", () => {
    const xml = `<Body><Cube date="2026-10-23"><Rate currency="EUR">5.3285</Rate></Cube><Cube date="2026-10-26"><Rate currency="EUR">5.3297</Rate></Cube></Body>`;
    expect(parseazaBnrXml(xml).map((c) => c.data)).toEqual(["2026-10-23", "2026-10-26"]);
    expect(parseazaBnrXml("<Body></Body>")).toEqual([]);
  });

  it("rezerva cursbnr.ro: strict pe randul EUR, niciodata valoarea dolarului din meniu (28.10.2026)", () => {
    expect(parseazaCursbnr(`<p>Curs valutar 27.10.2026</p><td>EUR</td><td>5.3485</td>`)).toEqual({ data: "2026-10-27", curs: "5.3485", sursa: "cursbnr.ro" });
    // fragmentele reale din pagina (28.10.2026): meniul cu EUR inaintea valorii USD, apoi "1 EURO = 5.3495 Lei"
    const meniu = `<option value="5.3495" selected="selected">EUR</option><option value="4.8088">USD</option>`;
    expect(parseazaCursbnr(meniu)).toBeNull();
    const pagina = `${meniu}<div class="value">1 EURO = 5.3495 Lei</div><div>Cursul de astăzi (28 octombrie 2026) 28.10.2026</div>`;
    expect(parseazaCursbnr(pagina)).toEqual({ data: "2026-10-28", curs: "5.3495", sursa: "cursbnr.ro" });
    const tabel = `${meniu}<tr><td class="text-center">EUR</td><td><span class="flag-icon flag-icon-eu"></span>&nbsp;Euro</td><td class="text-center">5.3495</td></tr> 28.10.2026`;
    expect(parseazaCursbnr(tabel)?.curs).toBe("5.3495");;
    expect(parseazaCursbnr("<p>nimic</p>")).toBeNull();
  });

  it("BNR fara XML (pagina HTML / Request Rejected) = esec, nu 0 cursuri -> rezerva cursbnr.ro; ultima incercare retinuta", async () => {
    expect(() => cursuriDinXmlBnr("<!doctype html><html>pagina BNR</html>")).toThrow(/pagină HTML/);
    expect(() => cursuriDinXmlBnr("<html><title>Request Rejected</title></html>")).toThrow(/respins/);
    expect(() => cursuriDinXmlBnr('<DataSet><Body><Cube date="2026-10-28"><Rate currency="USD">4.8088</Rate></Cube></Body></DataSet>')).toThrow(/nu conține cursul EUR/);
    const preluator = async (url: string) => (url.includes("bnr.ro/nbrfxrates") ? "<!doctype html><html>pagina</html>" : '<div class="value">1 EURO = 5.3495 Lei</div> 28.10.2026');
    const r = await preiaCursuri({ preluator });
    expect(r).toMatchObject({ salvate: 1, sursa: "cursbnr.ro" });
    expect(r.mesaj).toMatch(/^BNR: BNR nu a răspuns cu XML/);
    const r2 = await preiaCursuri({ preluator: async () => "<html>nimic</html>" });
    expect(r2).toMatchObject({ salvate: 0, sursa: "niciuna" });
    expect(r2.mesaj).toMatch(/cursbnr.ro: pagina nu are rândul EUR/);
  });
});

describe("telefonul normalizat (cap. 2)", () => {
  it("doar cifre; +40 / 0040 devin 0", () => {
    expect(normalizeazaTelefon("+40 728 192 569")).toBe("0728192569");
    expect(normalizeazaTelefon("0040728192569")).toBe("0728192569");
    expect(normalizeazaTelefon("0728.192.569")).toBe("0728192569");
    expect(normalizeazaTelefon("0728192569")).toBe("0728192569");
    expect(normalizeazaTelefon("40728192569")).toBe("0728192569");
  });
});
