import { describe, expect, it } from "vitest";
import { ordoneazaFinisaje } from "./finisaje";

// S29b (MODIFICAREA M14, docs/MODIFICARI-S29B.md): ordinea finisajelor in toate listele de selectie vine dintr-o
// lista de referinta (lista de optiuni "ordine_finisaj" din baza, schimbata din Zona tehnica), nu din cod.

// lista de pornire din docs/import/configurare/optiuni-liste.csv
const ORDINE = ["lucios", "colorat (lucios)", "mat", "Grande Mat", "Wood", "RAL 8003", "zincat", "dubluvopsit lucios", "dubluvopsit lucios SSAB", "dubluvopsit mat", "dubluvopsit mat SSAB", "Magnelis", "Aluzinc"];

describe("ordinea finisajelor (S29b, M14)", () => {
  it("lista completa iese in ordinea de referinta, oricum ar veni din catalog", () => {
    const dinCatalog = [...ORDINE].sort((a, b) => a.localeCompare(b, "ro"));
    expect(ordoneazaFinisaje(dinCatalog, ORDINE)).toEqual(ORDINE);
    expect(ordoneazaFinisaje([...ORDINE].reverse(), ORDINE)).toEqual(ORDINE);
  });

  it("listele partiale isi pastreaza ordinea intre ele (exemplele din fisa)", () => {
    // tigla metalica Iberic
    expect(ordoneazaFinisaje(["Grande Mat", "RAL 8003", "Wood", "lucios", "mat"], ORDINE)).toEqual(["lucios", "mat", "Grande Mat", "Wood", "RAL 8003"]);
    // tabla cutata
    expect(ordoneazaFinisaje(["Magnelis", "dubluvopsit mat SSAB", "dubluvopsit mat", "zincat", "mat", "lucios", "Wood", "RAL 8003", "Grande Mat", "dubluvopsit lucios SSAB", "dubluvopsit lucios"], ORDINE)).toEqual([
      "lucios",
      "mat",
      "Grande Mat",
      "Wood",
      "RAL 8003",
      "zincat",
      "dubluvopsit lucios",
      "dubluvopsit lucios SSAB",
      "dubluvopsit mat",
      "dubluvopsit mat SSAB",
      "Magnelis",
    ]);
  });

  it("„colorat (lucios)” de la sistemul pluvial tine locul lui „lucios”", () => {
    expect(ordoneazaFinisaje(["Aluzinc", "Magnelis", "colorat (lucios)", "mat"], ORDINE)).toEqual(["colorat (lucios)", "mat", "Magnelis", "Aluzinc"]);
  });

  it("un finisaj nou, nepus inca in lista de referinta, apare la sfarsit, alfabetic", () => {
    expect(ordoneazaFinisaje(["Zinc Titan", "mat", "Cupru", "lucios", "ălt finisaj"], ORDINE)).toEqual(["lucios", "mat", "ălt finisaj", "Cupru", "Zinc Titan"]);
    // fara lista de referinta (inca neincarcata in baza): ordinea ramane cea de pana acum, cum vin din catalog
    expect(ordoneazaFinisaje(["mat", "lucios", "Grande Mat"], [])).toEqual(["mat", "lucios", "Grande Mat"]);
  });

  it("schimbarea ordinii din lista de referinta schimba ordinea din liste", () => {
    const schimbata = ["mat", "lucios", ...ORDINE.filter((f) => f !== "mat" && f !== "lucios")];
    expect(ordoneazaFinisaje(["lucios", "Grande Mat", "mat"], schimbata)).toEqual(["mat", "lucios", "Grande Mat"]);
  });

  it("nu adauga si nu scoate nimic: valorile goale si dublurile raman cum erau; potrivirea nu tine cont de majuscule", () => {
    expect(ordoneazaFinisaje(["mat", "", "lucios"], ORDINE)).toEqual(["lucios", "mat", ""]);
    expect(ordoneazaFinisaje(["MAT", "Lucios"], ORDINE)).toEqual(["Lucios", "MAT"]);
    expect(ordoneazaFinisaje([], ORDINE)).toEqual([]);
  });
});
