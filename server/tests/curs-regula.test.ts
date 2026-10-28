import { describe, expect, it } from "vitest";
import { cursPentruMoment, dataLimitaCurs, lipsesteCursulZilei, localRomania, parseazaBnrXml, type CursZi } from "../src/modules/curs/regula.js";
import { parseazaCursbnr } from "../src/modules/curs/serviciu.js";
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

  it("rezerva cursbnr.ro: cea mai buna incercare pe pagina", () => {
    expect(parseazaCursbnr(`<p>Curs valutar 27.10.2026</p><td>EUR</td><td>5.3485</td>`)).toEqual({ data: "2026-10-27", curs: "5.3485", sursa: "cursbnr.ro" });
    expect(parseazaCursbnr("<p>nimic</p>")).toBeNull();
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
