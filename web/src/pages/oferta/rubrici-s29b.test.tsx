import { useState, type ReactNode } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OfertaDetaliu, ProdusEditor, StructuraOferta } from "../../api";
import { catalogulLiniilor, RUBRICI, stareDinOferta, type LinieUI, type StareEditor } from "./editor";
import { Lungimi } from "./Lungimi";
import { Pluvial } from "./Pluvial";
import type { Catalog } from "./Produse";
import { Sipca } from "./Sipca";
import { Speciale2ML } from "./Speciale2ML";

// S29b - testele de ecran ale rubricilor cu randuri (docs/MODIFICARI-S29B.md v1.4, docs/CERERI-BUG-S25.md):
// - BUG-24 c / BUG-26 / BUG-27: dupa redeschidere, rubrica arata treapta si sistemul SALVATE, iar atingerea
//   finisajului / grosimii nu schimba pe tacute treapta; o piesa adaugata intra in sistemul rubricii.
// - BUG-24 b: doua pozitii cu acelasi produs arata fiecare metrii ei.
// - BUG-24 a, d: randul neterminat / incomplet se marcheaza la iesirea din el, nu cat scrii.
// - BUG-25: cosul scoate doar randul (ultimul ramas se goleste, blocul nu dispare); eliminarea blocului e in
//   antet si cere confirmare cand are ceva completat.

const mocks = vi.hoisted(() => ({ speciale: vi.fn(), pluvial: vi.fn(), cauta: vi.fn(), sipca: vi.fn() }));
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), apiCatalogEditor: mocks }));

const produs = (id: string, extra: Partial<ProdusEditor>): ProdusEditor => ({ id, cod: id.toUpperCase(), denumire: `Produs ${id}`, um: "ML", categorie: null, compartiment: "Bilka", grup: "Accesorii", familie: null, varianta: null, optiune: null, finisaj: "Grande Mat", grosime: "0,50 mm", sistem: null, treapta: null, desfasurata: null, latimeTotalaM: null, latimeTotalaMm: null, modulCm: null, culoriDisponibile: null, tablaPlana: null, ...extra });

// accesoriile la lungimi din catalog: D01, D05, D09 pe Grande Mat 0,50 si 0,60
const LUNGIMI_CATALOG = ["D01", "D05", "D09"].flatMap((t) => ["0,50 mm", "0,60 mm"].map((g) => produs(`ml-${t}-${g.slice(2, 4)}`, { treapta: t, grosime: g, denumire: `Accesoriu special la metru liniar – ${t} – Grande Mat – ${g}` })));
const SPECIALE_CATALOG = ["D01", "D05", "D07"].map((t) => produs(`sp-${t}`, { treapta: t, finisaj: "mat", um: "BUC", denumire: `Accesoriu special 2 ML – ${t} – mat – 0,50 mm` }));
const P150 = [produs("j150", { sistem: "150 / 100", finisaj: "mat", grosime: null, um: "BUC", denumire: "Jgheab 150 / 4m – pluvial mat" }), produs("b100", { sistem: "150 / 100", finisaj: "mat", grosime: null, um: "BUC", denumire: "Burlan 100 / 3m – pluvial mat" })];
const P125 = [produs("j125", { sistem: "125 / 90", finisaj: "mat", grosime: null, um: "BUC", denumire: "Jgheab 125 / 4m – pluvial mat" })];
const SIPCA_CATALOG = [produs("sip", { familie: "Șipcă Berna", finisaj: "mat", grosime: "0,40 mm", latimeTotalaMm: "115", denumire: "Șipcă Berna mat" })];

const catalog: Catalog = {
  invelitori: [],
  ref: {
    culori: [
      { furnizor: "Bilka", finisaj: "Grande Mat", grosime: "0,50 mm", culoare: "8004" },
      { furnizor: "Bilka", finisaj: "Grande Mat", grosime: "0,60 mm", culoare: "8004" },
      { furnizor: "Bilka", finisaj: "mat", grosime: "0,50 mm", culoare: "7016" },
      { furnizor: "Bilka", finisaj: "mat", grosime: "0,40 mm", culoare: "7016" },
      { furnizor: "Bilka", finisaj: "mat", grosime: "", culoare: "7016" },
    ],
    trepte: [
      { treapta: "D01", deLaMm: 1, panaLaMm: 50 },
      { treapta: "D05", deLaMm: 201, panaLaMm: 250 },
      { treapta: "D07", deLaMm: 301, panaLaMm: 350 },
      { treapta: "D09", deLaMm: 401, panaLaMm: 450 },
    ],
    variante: [],
    categorii: [],
    categoriiListe: [],
  },
};

beforeEach(() => {
  mocks.speciale.mockImplementation(async (categorie: string) => ({ produse: categorie === RUBRICI.lungimi ? LUNGIMI_CATALOG : SPECIALE_CATALOG }));
  mocks.pluvial.mockImplementation(async (_finisaj: string, sistem: string) => ({ implicite: (sistem === "150 / 100" ? P150 : P125).map((p, k) => ({ ...p, ordine: k + 1, numeLista: p.denumire.split(" – ")[0] })), nerezolvate: [], restul: [] }));
  mocks.cauta.mockResolvedValue({ produse: [...P125, ...P150], total: 3 });
  mocks.sipca.mockResolvedValue({ produse: SIPCA_CATALOG });
});

// oferta salvata, asa cum vine de la server: liniile (date copiate) + produsele lor din catalog
const salvata = (id: string, rubrica: string, p: ProdusEditor, extra: Record<string, unknown> = {}) => ({ id, ordine: 1, rubrica, produsId: p.id, cod: p.cod, denumire: p.denumire, um: p.um, finisaj: p.finisaj, grosime: p.grosime, grup: p.grup, familie: p.familie, optiune: null, sistem: p.sistem, cantitate: "1", invelitoareId: null, culoareRal: "RAL 8004", culoareFinisaj: p.finisaj, culoareGrosime: p.grosime, pozitii: [], ...extra });
const redeschisa = (linii: ReturnType<typeof salvata>[], produse: ProdusEditor[]): StareEditor => {
  const o = { grupaPct: "0", precizariZonaB: null, invelitori: [], linii, sipci: [], zonaB: [], randuriGoale: [], produseCatalog: produse } as unknown as OfertaDetaliu;
  return stareDinOferta(o, [], catalogulLiniilor(o));
};
const poz = (lungimeM: string, bucati: number, k = 1) => ({ id: `p${k}`, ordine: k, lungimeM, bucati });

// rubrica pe ecran, cu starea ei tinuta ca in pagina; `ultima` = starea curenta, pentru verificari
let ultima: StareEditor;
function Proba({ initial, children }: { initial: StareEditor; children: (stare: StareEditor, set: (f: (s: StareEditor) => StareEditor) => void) => ReactNode }) {
  const [stare, setStare] = useState(initial);
  ultima = stare;
  return <>{children(stare, (f) => setStare(f))}</>;
}
const liniile = (rubrica: string): LinieUI[] => ultima.linii.filter((l) => l.rubrica === rubrica);
const camp = (bloc: HTMLElement, eticheta: string) => within(bloc).getByText(eticheta, { selector: "label.camp > span" }).parentElement!.querySelector("select") as HTMLSelectElement;
const blocuri = () => [...document.querySelectorAll<HTMLElement>(".bloc-randuri")];

async function lungimiPeEcran(stare: StareEditor, extra: { structura?: StructuraOferta | null; iduri?: Map<string, string> } = {}) {
  render(<Proba initial={stare}>{(s, set) => <Lungimi catalog={catalog} stare={s} set={set} poate structura={extra.structura ?? null} iduri={extra.iduri} />}</Proba>);
  await waitFor(() => expect(camp(blocuri()[0], "Finisaj").options.length).toBeGreaterThan(0));
}

describe("accesoriile la lungimi (S29b)", () => {
  const d05 = LUNGIMI_CATALOG.find((p) => p.treapta === "D05" && p.grosime === "0,50 mm")!;

  it("BUG-24 c: dupa redeschidere lista arata treapta salvata (D05), iar schimbarea grosimii pastreaza treapta", async () => {
    const u = userEvent.setup();
    await lungimiPeEcran(redeschisa([salvata("l1", RUBRICI.lungimi, d05, { pozitii: [poz("2.5", 4)] })], [d05]));
    const bloc = blocuri()[0];
    expect(camp(bloc, "Treaptă").value).toBe("D05");
    expect(bloc).toHaveTextContent("desfășurata 201–250 mm");
    await u.selectOptions(camp(bloc, "Grosime"), "0,60 mm");
    expect(liniile(RUBRICI.lungimi)[0].produs).toMatchObject({ treapta: "D05", grosime: "0,60 mm", id: "ml-D05-60" });
    // schimbarea treptei din lista schimba produsul, ca la introducere
    await u.selectOptions(camp(blocuri()[0], "Treaptă"), "D09");
    expect(liniile(RUBRICI.lungimi)[0].produs.id).toBe("ml-D09-60");
  });

  it("BUG-24 c: produsul fara treapta cunoscuta nu se schimba de la sine - finisajul si grosimea raman blocate pana alegi treapta", async () => {
    const necunoscut = produs("vechi", { denumire: "Accesoriu vechi", treapta: null });
    await lungimiPeEcran(redeschisa([salvata("l1", RUBRICI.lungimi, necunoscut, { pozitii: [poz("2.5", 4)] })], []));
    const bloc = blocuri()[0];
    expect(camp(bloc, "Treaptă").value).toBe("");
    expect(camp(bloc, "Finisaj")).toBeDisabled();
    expect(camp(bloc, "Grosime")).toBeDisabled();
    expect(liniile(RUBRICI.lungimi)[0].produs.id).toBe("vechi");
  });

  it("BUG-24 b: doua pozitii cu acelasi produs si aceeasi cheie arata fiecare metrii EI", async () => {
    const stare = redeschisa([salvata("s1", RUBRICI.lungimi, d05, { pozitii: [poz("2.5", 4), poz("1.2", 3, 2), poz("3", 2, 3)] }), salvata("s2", RUBRICI.lungimi, d05, { pozitii: [poz("2", 5)] })], [d05]);
    const structura = { linii: [{ id: "s1", cod: d05.cod, um: "ML", cantitate: "19.600" }, { id: "s2", cod: d05.cod, um: "ML", cantitate: "10.000" }] } as unknown as StructuraOferta;
    await lungimiPeEcran(stare, { structura, iduri: new Map(stare.linii.map((l) => [l.cheie, l.idSalvat!])) });
    expect(blocuri().map((b) => b.querySelector(".ml-pozitie")?.textContent)).toEqual(["19.600 ml", "10.000 ml"]);
  });

  it("BUG-25: cosul scoate doar randul - ultimul ramas se goleste, pozitia nu dispare; „Scoate accesoriul” e in antet si cere confirmare", async () => {
    const u = userEvent.setup();
    await lungimiPeEcran(redeschisa([salvata("l1", RUBRICI.lungimi, d05, { pozitii: [poz("2.5", 4), poz("1.2", 3, 2)] })], [d05]));
    await u.click(within(blocuri()[0]).getByRole("button", { name: "Scoate rândul 1" }));
    expect(liniile(RUBRICI.lungimi)[0].pozitii).toEqual([{ lungimeM: "1,20", bucati: "3" }]);
    await u.click(within(blocuri()[0]).getByRole("button", { name: "Scoate rândul 1" }));
    // pozitia ramane, cu un rand gol
    expect(liniile(RUBRICI.lungimi)).toHaveLength(1);
    expect(liniile(RUBRICI.lungimi)[0].pozitii).toEqual([{ lungimeM: "", bucati: "" }]);

    // butonul blocului e in antet, nu langa „+ Adaugă rând”
    const scoate = within(blocuri()[0]).getByRole("button", { name: "Scoate accesoriul" });
    expect(scoate.closest(".antet-bloc")).not.toBeNull();
    expect(within(blocuri()[0]).getByRole("button", { name: "+ Adaugă rând" }).closest(".antet-bloc")).toBeNull();
    // pozitia goala dispare fara intrebare
    await u.click(scoate);
    expect(liniile(RUBRICI.lungimi)).toHaveLength(0);
  });

  it("BUG-25: pozitia cu randuri completate cere confirmare; „Nu” lasa totul neatins, „Da, șterge” o scoate", async () => {
    const u = userEvent.setup();
    await lungimiPeEcran(redeschisa([salvata("l1", RUBRICI.lungimi, d05, { pozitii: [poz("2.5", 4), poz("1.2", 3, 2), poz("3", 2, 3)] })], [d05]));
    await u.click(within(blocuri()[0]).getByRole("button", { name: "Scoate accesoriul" }));
    const intrebare = within(blocuri()[0]).getByRole("alertdialog");
    expect(intrebare).toHaveTextContent("Ștergi desfășurata D05 cu cele 3 rânduri?");
    expect(liniile(RUBRICI.lungimi)).toHaveLength(1);
    await u.click(within(intrebare).getByRole("button", { name: "Nu" }));
    expect(liniile(RUBRICI.lungimi)[0].pozitii).toHaveLength(3);
    expect(within(blocuri()[0]).queryByRole("alertdialog")).toBeNull();
    await u.click(within(blocuri()[0]).getByRole("button", { name: "Scoate accesoriul" }));
    await u.click(within(blocuri()[0]).getByRole("button", { name: "Da, șterge" }));
    expect(liniile(RUBRICI.lungimi)).toHaveLength(0);
  });

  it("BUG-24 a, d: randul neterminat sau incomplet se marcheaza la iesirea din el, nu cat scrii in el", async () => {
    const u = userEvent.setup();
    await lungimiPeEcran(redeschisa([salvata("l1", RUBRICI.lungimi, d05, { pozitii: [poz("2.5", 4)] })], [d05]));
    await u.click(within(blocuri()[0]).getByRole("button", { name: "+ Adaugă rând" }));
    const lungime = within(blocuri()[0]).getByLabelText("Lungime poziția 2");
    await u.click(lungime);
    await u.keyboard("5,");
    await u.click(within(blocuri()[0]).getByLabelText("Bucăți poziția 2"));
    await u.keyboard("2");
    // cat esti in rand: niciun marcaj
    expect(blocuri()[0]).not.toHaveTextContent("nu e scrisă până la capăt");
    expect(lungime).not.toHaveClass("cu-problema");
    // la iesirea din rand
    await u.click(within(blocuri()[0]).getByLabelText("Lungime poziția 1"));
    expect(blocuri()[0]).toHaveTextContent("lungimea nu e scrisă până la capăt");
    expect(within(blocuri()[0]).getByLabelText("Lungime poziția 2")).toHaveClass("cu-problema");

    // lungime fara bucati
    await u.click(within(blocuri()[0]).getByRole("button", { name: "+ Adaugă rând" }));
    await u.click(within(blocuri()[0]).getByLabelText("Lungime poziția 3"));
    await u.keyboard("6");
    expect(blocuri()[0]).not.toHaveTextContent("lungime fără bucăți");
    await u.click(within(blocuri()[0]).getByLabelText("Lungime poziția 1"));
    expect(blocuri()[0]).toHaveTextContent("lungime fără bucăți — rândul nu e în ofertă");
    expect(within(blocuri()[0]).getByLabelText("Bucăți poziția 3")).toHaveClass("cu-problema");
    // un rand gol nu e marcat niciodata
    await u.click(within(blocuri()[0]).getByRole("button", { name: "+ Adaugă rând" }));
    expect(within(blocuri()[0]).getByLabelText("Lungime poziția 4").closest("tr")).not.toHaveClass("rand-cu-problema");
  });
});

describe("accesoriile speciale 2 ML (S29b, BUG-26)", () => {
  it("dupa redeschidere randul salvat arata treapta lui (D05, 201–250 mm), nu D01; cantitatea nu schimba produsul, treapta din lista da", async () => {
    const u = userEvent.setup();
    const sp5 = SPECIALE_CATALOG.find((p) => p.treapta === "D05")!;
    const stare = redeschisa([salvata("s1", RUBRICI.speciale2ml, sp5, { cantitate: "2", culoareRal: "RAL 7016", culoareFinisaj: "mat", culoareGrosime: "0,50 mm" })], [sp5]);
    render(<Proba initial={stare}>{(s, set) => <Speciale2ML catalog={catalog} stare={s} set={set} poate structura={null} />}</Proba>);
    const treapta = (await screen.findByLabelText("Treapta rândul 1")) as HTMLSelectElement;
    expect(treapta.value).toBe("D05");
    expect(treapta.closest("tr")).toHaveTextContent("201–250 mm");
    const cantitate = screen.getByLabelText("Cantitate rândul 1");
    await u.clear(cantitate);
    await u.type(cantitate, "3");
    expect(liniile(RUBRICI.speciale2ml).map((l) => [l.produs.id, l.cantitate])).toEqual([["sp-D05", "3"]]);
    await waitFor(() => expect(mocks.speciale).toHaveBeenCalled());
    await u.selectOptions(screen.getByLabelText("Treapta rândul 1"), "D07");
    await waitFor(() => expect(liniile(RUBRICI.speciale2ml)[0].produs.id).toBe("sp-D07"));
  });
});

describe("sistemul pluvial (S29b, BUG-27)", () => {
  it("dupa redeschidere sistemul salvat apare 150 / 100, lista e a lui, iar o piesa adaugata intra tot la 150", async () => {
    const u = userEvent.setup();
    const stare = redeschisa([salvata("p1", RUBRICI.pluvial, P150[0], { cantitate: "3", culoareRal: "RAL 7016", culoareFinisaj: "mat", culoareGrosime: null })], [P150[0]]);
    render(<Proba initial={stare}>{(s, set) => <Pluvial catalog={catalog} stare={s} set={set} poate structura={null} />}</Proba>);
    await waitFor(() => expect(mocks.pluvial).toHaveBeenCalledWith("mat", "150 / 100"));
    const sectiune = screen.getByText("Sistem pluvial A").closest(".panou") as HTMLElement;
    expect(camp(sectiune, "Sistem").value).toBe("150 / 100");
    expect(mocks.pluvial).not.toHaveBeenCalledWith("mat", "125 / 90");
    // o singura sectiune, cu piesa salvata la locul ei in lista sistemului
    expect(screen.queryByText("Sistem pluvial B")).toBeNull();
    const burlan = await within(sectiune).findByLabelText("Cantitate Burlan 100 / 3m – pluvial mat");
    expect(within(sectiune).getByLabelText("Cantitate Jgheab 150 / 4m – pluvial mat")).toHaveValue("3");
    await u.type(burlan, "2");
    expect(liniile(RUBRICI.pluvial).map((l) => [l.produs.id, l.produs.sistem, l.cantitate])).toEqual([
      ["j150", "150 / 100", "3"],
      ["b100", "150 / 100", "2"],
    ]);
    // „Scoate sistemul” cere confirmare cand sistemul are piese
    await u.click(within(sectiune).getByRole("button", { name: "Scoate sistemul" }));
    expect(within(sectiune).getByRole("alertdialog")).toHaveTextContent("Ștergi sistemul pluvial A (150 / 100) cu cele 2 piese?");
    await u.click(within(sectiune).getByRole("button", { name: "Nu" }));
    expect(liniile(RUBRICI.pluvial)).toHaveLength(2);
  });
});

describe("sipca de gard (S29b, BUG-25)", () => {
  it("fiecare pozitie are cosul ei; ultima ramasa se goleste; „Scoate rubrica” cere confirmare cand are randuri", async () => {
    const u = userEvent.setup();
    const sip = SIPCA_CATALOG[0];
    const linie = salvata("x1", RUBRICI.sipca, sip, { culoareRal: "RAL 7016", culoareFinisaj: "mat", culoareGrosime: "0,40 mm", pozitii: [poz("1.5", 10), poz("2", 4, 2)] });
    const o = { grupaPct: "0", precizariZonaB: null, invelitori: [], linii: [linie], sipci: [{ id: "sp", ordine: 1, linieId: "x1", model: "Șipcă Berna, capăt drept", culoare: null, latimeSipcaMm: "115", varianta: "COMANDA", tronsoane: [] }], zonaB: [], randuriGoale: [], produseCatalog: [sip] } as unknown as OfertaDetaliu;
    const stare = stareDinOferta(o, [], catalogulLiniilor(o));
    render(<Proba initial={stare}>{(s, set) => <Sipca catalog={catalog} stare={s} set={set} poate structura={null} />}</Proba>);
    await waitFor(() => expect(mocks.sipca).toHaveBeenCalled());
    // dupa redeschidere: latimea sipcii din catalog (nu „?”)
    expect(await screen.findByText(/lățimea șipcii 115 mm/)).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Scoate rândul 1" }));
    expect(liniile(RUBRICI.sipca)[0].pozitii).toEqual([{ lungimeM: "2,00", bucati: "4" }]);
    await u.click(screen.getByRole("button", { name: "Scoate rubrica" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Ștergi rubrica 1 de șipcă (Șipcă Berna) cu rândul ei?");
    await u.click(screen.getByRole("button", { name: "Nu" }));
    expect(ultima.sipci).toHaveLength(1);
    await u.click(screen.getByRole("button", { name: "Scoate rândul 1" }));
    expect(liniile(RUBRICI.sipca)[0].pozitii).toEqual([{ lungimeM: "", bucati: "" }]);
    expect(ultima.sipci).toHaveLength(1);
    // rubrica fara randuri completate dispare fara intrebare
    await act(async () => {
      await u.click(screen.getByRole("button", { name: "Scoate rubrica" }));
    });
    expect(ultima.sipci).toHaveLength(0);
  });
});
