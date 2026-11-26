import { useState, type ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProdusEditor } from "../../api";
import { finisaje, stareGoala, type StareEditor } from "./editor";
import { Lungimi } from "./Lungimi";
import { Pluvial } from "./Pluvial";
import type { Catalog } from "./Produse";
import { NouaSectiuneDeSine } from "./Rubrica";
import { Sipca } from "./Sipca";

// S29b (MODIFICAREA M14): in toate listele de selectie din editor finisajele apar in ordinea din lista de
// referinta ("ordineFinisaje" din referintele editorului), nu in ordinea in care vin din catalog.

const mocks = vi.hoisted(() => ({ speciale: vi.fn(), pluvial: vi.fn(), cauta: vi.fn(), sipca: vi.fn() }));
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), apiCatalogEditor: mocks }));

const ORDINE = ["lucios", "colorat (lucios)", "mat", "Grande Mat", "Wood", "RAL 8003", "zincat", "dubluvopsit lucios", "dubluvopsit lucios SSAB", "dubluvopsit mat", "dubluvopsit mat SSAB", "Magnelis", "Aluzinc"];
const produs = (id: string, extra: Partial<ProdusEditor>): ProdusEditor => ({ id, cod: id.toUpperCase(), denumire: `Produs ${id}`, um: "ML", categorie: null, compartiment: "Bilka", grup: "Accesorii", familie: null, varianta: null, optiune: null, finisaj: "mat", grosime: "0,50 mm", sistem: null, treapta: null, desfasurata: null, latimeTotalaM: null, latimeTotalaMm: null, modulCm: null, culoriDisponibile: null, tablaPlana: null, ...extra });
// din catalog, finisajele vin alfabetic (ca azi): Grande Mat, Magnelis, Wood, lucios, mat...
const DIN_CATALOG = ["Grande Mat", "Magnelis", "RAL 8003", "Wood", "lucios", "mat", "zincat"];

const catalog = (ordineFinisaje: string[] | undefined): Catalog => ({
  invelitori: [],
  ref: { culori: DIN_CATALOG.map((finisaj) => ({ furnizor: "Bilka", finisaj, grosime: "0,50 mm", culoare: "8004" })), trepte: [{ treapta: "D01", deLaMm: 1, panaLaMm: 50 }], variante: [], categorii: [], categoriiListe: [], ordineFinisaje },
});

beforeEach(() => {
  mocks.speciale.mockResolvedValue({ produse: DIN_CATALOG.map((f) => produs(`ml-${f}`, { finisaj: f, treapta: "D01" })) });
  mocks.cauta.mockResolvedValue({ produse: ["Aluzinc", "Magnelis", "colorat (lucios)", "mat"].map((f) => produs(`pl-${f}`, { finisaj: f, grosime: null })), total: 4 });
  mocks.pluvial.mockResolvedValue({ implicite: [], nerezolvate: [], restul: [] });
  mocks.sipca.mockResolvedValue({ produse: ["mat", "Wood", "lucios"].map((f) => produs(`sip-${f}`, { finisaj: f, familie: "Șipcă Berna", grosime: "0,40 mm" })) });
});

function Proba({ children }: { children: (stare: StareEditor, set: (f: (s: StareEditor) => StareEditor) => void) => ReactNode }) {
  const [stare, setStare] = useState(stareGoala());
  return <>{children(stare, (f) => setStare(f))}</>;
}
const optiuni = (radacina: HTMLElement, eticheta: string) => [...(within(radacina).getByText(eticheta, { selector: "label.camp > span" }).parentElement!.querySelector("select") as HTMLSelectElement).options].map((o) => o.value).filter(Boolean);

describe("ordinea finisajelor in listele editorului (S29b, M14)", () => {
  it("cascada invelitorii: finisajele modelului in ordinea de referinta", () => {
    const produse = ["Wood", "RAL 8003", "mat", "lucios", "Grande Mat"].map((f) => produs(f, { finisaj: f }));
    expect(finisaje(produse, "", ORDINE)).toEqual(["lucios", "mat", "Grande Mat", "Wood", "RAL 8003"]);
    // fara lista de referinta: ordinea de pana acum, cum vin din catalog
    expect(finisaje(produse, "")).toEqual(["Wood", "RAL 8003", "mat", "lucios", "Grande Mat"]);
  });

  it("accesoriile la lungimi: lista Finisaj e in ordinea de referinta, iar pozitia noua porneste pe primul din ea", async () => {
    const u = userEvent.setup();
    render(<Proba>{(s, set) => <Lungimi catalog={catalog(ORDINE)} stare={s} set={set} poate structura={null} />}</Proba>);
    const adauga = await screen.findByRole("button", { name: "+ Adaugă accesoriu la lungimi" });
    await waitFor(() => expect(adauga).toBeEnabled());
    await u.click(adauga);
    const bloc = document.querySelector(".bloc-randuri") as HTMLElement;
    expect(optiuni(bloc, "Finisaj")).toEqual(["lucios", "mat", "Grande Mat", "Wood", "RAL 8003", "zincat", "Magnelis"]);
    expect((within(bloc).getByText("Finisaj", { selector: "label.camp > span" }).parentElement!.querySelector("select") as HTMLSelectElement).value).toBe("lucios");
  });

  it("sistemul pluvial: „colorat (lucios)” tine locul lui „lucios”, Magnelis si Aluzinc la urma", async () => {
    const u = userEvent.setup();
    render(<Proba>{(s, set) => <Pluvial catalog={catalog(ORDINE)} stare={s} set={set} poate structura={null} />}</Proba>);
    await waitFor(() => expect(mocks.cauta).toHaveBeenCalled());
    await u.click(screen.getByRole("button", { name: "+ Adaugă sistem pluvial" }));
    const sectiune = screen.getByText("Sistem pluvial A").closest(".panou") as HTMLElement;
    await waitFor(() => expect(optiuni(sectiune, "Finisaj")).toEqual(["colorat (lucios)", "mat", "Magnelis", "Aluzinc"]));
  });

  it("sipca si sectiunea de sine statatoare: aceeasi ordine", async () => {
    const u = userEvent.setup();
    const { unmount } = render(<Proba>{(s, set) => <Sipca catalog={catalog(ORDINE)} stare={s} set={set} poate structura={null} />}</Proba>);
    await waitFor(() => expect(mocks.sipca).toHaveBeenCalled());
    await u.click(screen.getByRole("button", { name: "+ Adaugă rubrică șipcă" }));
    const rubrica = document.querySelector(".sub-sectiune") as HTMLElement;
    await u.selectOptions(within(rubrica).getByText("Profil", { selector: "label.camp > span" }).parentElement!.querySelector("select") as HTMLSelectElement, "Șipcă Berna");
    expect(optiuni(rubrica, "Finisaj")).toEqual(["lucios", "mat", "Wood"]);
    unmount();

    render(<NouaSectiuneDeSine catalog={catalog(ORDINE)} onAdauga={() => undefined} />);
    await u.click(screen.getByRole("button", { name: /Secțiune de sine stătătoare/ }));
    expect(optiuni(document.body, "Finisaj")).toEqual(["lucios", "mat", "Grande Mat", "Wood", "RAL 8003", "zincat", "Magnelis"]);
  });

  it("schimbarea listei de referinta schimba ordinea; un finisaj care nu e in lista apare la sfarsit", async () => {
    const u = userEvent.setup();
    render(<NouaSectiuneDeSine catalog={catalog(["mat", "lucios"])} onAdauga={() => undefined} />);
    await u.click(screen.getByRole("button", { name: /Secțiune de sine stătătoare/ }));
    expect(optiuni(document.body, "Finisaj")).toEqual(["mat", "lucios", "Grande Mat", "Magnelis", "RAL 8003", "Wood", "zincat"]);
  });
});
