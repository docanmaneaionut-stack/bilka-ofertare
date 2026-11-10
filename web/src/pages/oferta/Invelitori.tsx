import type { ReactNode } from "react";
import type { StructuraOferta } from "../../api";
import { CasutaCantitate, numarDinText } from "../../components/CasutaCantitate";
import type { Catalog } from "./Produse";
import {
  culoriPentru,
  deModel,
  finisaje,
  grosimi,
  invelitoareGoala,
  invelitoriTrimise,
  latimeDinCatalog,
  modele,
  optiuni,
  produsAles,
  ral,
  tipuri,
  variantePentru,
  type InvelitoareUI,
  type StareEditor,
} from "./editor";

type Props = { catalog: Catalog; stare: StareEditor; set: (f: (s: StareEditor) => StareEditor) => void; poate: boolean; structura: StructuraOferta | null };

// Invelitorile (FISA-OFERTARE cap. 3; S25 BUG-7, simularea docs/design/simulari/
// S25-simulare-invelitoare-v2.pdf): o singura componenta de bloc, cate o instanta pentru
// principala si pentru fiecare secundara. Blocul e pe trei coloane: selectia (furnizor,
// tip, model, varianta - rand mereu prezent -, finisaj, grosime, culoare, montaj doar la
// tabla cutata, modul de cantitate) si doua coloane de pozitii lungime x bucati, cate
// pozitii pe coloana cate randuri are selectia (8 -> 16, tabla cutata 9 -> 18), numerotate
// pe coloane; pozitiile peste sub coloana a treia; totalurile sub coloane. Stilul compact
// (variabilele --rand-compact / --casuta-compact / --banda-categorie din index.css).
export function Invelitori({ catalog, stare, set, poate, structura }: Props) {
  const seteaza = (cheie: string, schimba: (i: InvelitoareUI) => InvelitoareUI) =>
    set((s) => ({ ...s, invelitori: s.invelitori.map((i) => (i.cheie === cheie ? schimba(i) : i)) }));
  // M1: cantitatile vin pe id-ul din baza, necunoscut pe ecran; ordinea e aceeasi
  // cu a invelitorilor trimise (doua invelitori cu acelasi produs se disting asa)
  const trimise = invelitoriTrimise(stare);
  const calculPentru = (inv: InvelitoareUI) => {
    const k = trimise.indexOf(inv);
    return k >= 0 ? (structura?.cantitati.invelitori[k] ?? null) : null;
  };

  return (
    <section className="panou">
      <h2>Învelitori</h2>
      {stare.invelitori.map((inv, idx) => (
        <BlocInvelitoare
          key={inv.cheie}
          inv={inv}
          idx={idx}
          catalog={catalog}
          poate={poate}
          calcul={calculPentru(inv)}
          onSchimba={(f) => seteaza(inv.cheie, f)}
          onSterge={idx > 0 ? () => set((s) => ({ ...s, invelitori: s.invelitori.filter((i) => i.cheie !== inv.cheie), linii: s.linii.filter((l) => l.invelitoare !== inv.cheie) })) : undefined}
        />
      ))}
      {poate && (
        <button className="buton secundar" type="button" tabIndex={-1} onClick={() => set((s) => ({ ...s, invelitori: [...s.invelitori, invelitoareGoala()] }))}>
          + Adaugă învelitoare
        </button>
      )}
    </section>
  );
}

const POZITIE_GOALA = { lungimeM: "", bucati: "" };
const ro2 = (n: number) => n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ro3 = (s: string) => Number(s).toLocaleString("ro-RO", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

// o pozitie completa: lungime si bucati valide
const completa = (p: { lungimeM: string; bucati: string }) => p.lungimeM.trim() !== "" && Number(p.bucati) > 0;

function BlocInvelitoare({
  inv,
  idx,
  catalog,
  poate,
  calcul,
  onSchimba,
  onSterge,
}: {
  inv: InvelitoareUI;
  idx: number;
  catalog: Catalog;
  poate: boolean;
  calcul: StructuraOferta["cantitati"]["invelitori"][number] | null;
  onSchimba: (f: (i: InvelitoareUI) => InvelitoareUI) => void;
  onSterge?: () => void;
}) {
  // furnizorul = compartimentul din catalog; cu un singur furnizor, ales de la sine
  const furnizori = [...new Set(catalog.invelitori.map((p) => p.compartiment))];
  const furnizor = inv.furnizor || (furnizori.length === 1 ? furnizori[0] : "");
  const produse = catalog.invelitori.filter((p) => !furnizor || p.compartiment === furnizor);
  const listaTipuri = furnizor ? tipuri(produse) : [];
  const listaModele = inv.tip ? modele(produse, inv.tip) : [];
  const aleModelului = inv.tip && inv.model ? deModel(produse, inv.tip, inv.model) : [];
  const variante = inv.model ? variantePentru(catalog.ref, inv.model) : [];
  const listaOptiuni = optiuni(aleModelului);
  const listaFinisaje = finisaje(aleModelului, inv.optiune);
  const listaGrosimi = inv.finisaj ? grosimi(aleModelului, inv.optiune, inv.finisaj) : [];
  const produs = inv.produsId ? (catalog.invelitori.find((p) => p.id === inv.produsId) ?? null) : null;
  const culori = produs ? culoriPentru(catalog.ref, produs, inv.finisaj, inv.grosime) : [];
  // montajul (acoperis / perete) doar la tabla cutata cu ambele variante in familie
  const cuMontaj = Boolean(produs && /acoperi/i.test(produs.familie ?? "") && /perete/i.test(produs.familie ?? ""));

  // orice schimbare in cascada recalculeaza produsul si reseteaza ce nu mai e valabil
  // (aceeasi regula ca inainte de S25: randul "Varianta" duce la acelasi produs din catalog)
  const alege = (schimbari: Partial<InvelitoareUI>) =>
    onSchimba((i) => {
      const n = { ...i, ...schimbari };
      const dinFurnizor = catalog.invelitori.filter((p) => !n.furnizor || p.compartiment === n.furnizor);
      const ale = n.tip && n.model ? deModel(dinFurnizor, n.tip, n.model) : [];
      if (!optiuni(ale).includes(n.optiune)) n.optiune = optiuni(ale)[0] ?? "";
      if (!finisaje(ale, n.optiune).includes(n.finisaj)) n.finisaj = "";
      if (!grosimi(ale, n.optiune, n.finisaj).includes(n.grosime)) n.grosime = "";
      const p = n.finisaj && n.grosime ? produsAles(ale, n.optiune, n.finisaj, n.grosime) : null;
      n.produsId = p?.id ?? null;
      if (p && p.id !== i.produsId) n.latimeTotalaM = latimeDinCatalog(p);
      if (!p) n.latimeTotalaM = "";
      const culoriNoi = p ? culoriPentru(catalog.ref, p, n.finisaj, n.grosime) : [];
      if (!culoriNoi.some((c) => ral(c) === n.culoare)) n.culoare = "";
      return n;
    });

  // randul "Varianta": variantele de profil din tabelul de referinta (Retro, Britanic, T8),
  // altfel optiunile din catalog (dripstop...), altfel "Standard" inactiv
  const varianta: { fel: "profil" | "optiune" | "standard"; valori: { valoare: string; text: string }[]; valoare: string } =
    variante.length > 0
      ? { fel: "profil", valori: variante.map((v) => ({ valoare: v.variantaProfil, text: `${v.variantaProfil}${v.restrictii ? ` (${v.restrictii})` : ""}` })), valoare: inv.variantaProfil }
      : listaOptiuni.length > 1
        ? { fel: "optiune", valori: listaOptiuni.map((o) => ({ valoare: o, text: o || "Standard" })), valoare: inv.optiune }
        : { fel: "standard", valori: [{ valoare: "", text: "Standard" }], valoare: "" };

  // pozitiile: cate randuri are selectia, pe fiecare dintre cele doua coloane; peste, sub a treia
  const randuriSelectie = 8 + (cuMontaj ? 1 : 0);
  const minim = 2 * randuriSelectie;
  const pozitii = inv.panotaj.length >= minim ? inv.panotaj : [...inv.panotaj, ...Array.from({ length: minim - inv.panotaj.length }, () => ({ ...POZITIE_GOALA }))];
  const setPozitie = (k: number, c: Partial<{ lungimeM: string; bucati: string }>) =>
    onSchimba((i) => {
      const lista = i.panotaj.length > k ? [...i.panotaj] : [...i.panotaj, ...Array.from({ length: k + 1 - i.panotaj.length }, () => ({ ...POZITIE_GOALA }))];
      lista[k] = { ...lista[k], ...c };
      return { ...i, panotaj: lista };
    });
  const adaugaPozitie = () => onSchimba((i) => ({ ...i, panotaj: [...(i.panotaj.length >= minim ? i.panotaj : pozitii), { ...POZITIE_GOALA }] }));
  const sorteaza = () => onSchimba((i) => ({ ...i, panotaj: [...pozitii.filter(completa)].sort((a, b) => numarDinText(b.lungimeM) - numarDinText(a.lungimeM)) }));
  const grup = `panotaj-${inv.cheie}`;

  // totalurile: coli si suma lungime x bucati de pe ecran; latimea din catalog; mp din motor
  const complete = pozitii.filter(completa);
  const coli = complete.reduce((s, p) => s + Number(p.bucati), 0);
  const sumaLungimi = complete.reduce((s, p) => s + numarDinText(p.lungimeM) * Number(p.bucati), 0);
  const latime = inv.latimeTotalaM ? numarDinText(inv.latimeTotalaM) : Number.NaN;
  const mpLocal = Number.isFinite(latime) ? sumaLungimi * latime : Number.NaN;
  const rezumat = produs ? [produs.grup, inv.model, inv.finisaj, inv.grosime, inv.culoare].filter(Boolean).join(" · ") : null;

  // pozitia e o functie de randare, nu o componenta: o componenta definita aici s-ar remonta la
  // fiecare tasta si casuta ar pierde focalizarea (cauza BUG-8)
  const pozitie = (k: number) => {
    const p = pozitii[k] ?? POZITIE_GOALA;
    return (
      <div key={k} className={`bi-pozitie${completa(p) ? " completa" : ""}`} data-pozitie={k + 1}>
        <span className="bi-nr">{k + 1}</span>
        <CasutaCantitate value={p.lungimeM} onChange={(v) => setPozitie(k, { lungimeM: v })} tip="zecimal" eticheta={`Lungime poziția ${k + 1}`} disabled={!poate} grup={grup} rand={k} camp="lungime" />
        <CasutaCantitate value={p.bucati} onChange={(v) => setPozitie(k, { bucati: v })} tip="intreg" eticheta={`Bucăți poziția ${k + 1}`} disabled={!poate} grup={grup} rand={k} camp="bucati" />
      </div>
    );
  };
  const rand = (eticheta: string, continut: ReactNode) => (
    <label className="bi-rand">
      <span>{eticheta}</span>
      {continut}
    </label>
  );
  const select = (valoare: string, onChange: (v: string) => void, dezactivat: boolean, opt: { valoare: string; text: string }[], cuAlege = true) => (
    <select value={valoare} onChange={(e) => onChange(e.target.value)} disabled={!poate || dezactivat}>
      {cuAlege && <option value="">alege…</option>}
      {opt.map((o) => (
        <option key={o.valoare} value={o.valoare}>
          {o.text}
        </option>
      ))}
    </select>
  );
  const ca = (v: string[]) => v.map((x) => ({ valoare: x, text: x }));

  return (
    <div className="bloc-invelitoare compact" data-bloc={idx === 0 ? "principala" : `secundara-${idx + 1}`}>
      <div className="bi-antet">
        <strong>{idx === 0 ? "Învelitoare principală" : `Învelitoare secundară ${idx + 1}`}</strong>
        {rezumat && <span className="text-secundar">{rezumat}</span>}
        {produs?.modulCm && <span className="text-secundar mic">modul {produs.modulCm} cm</span>}
        {onSterge && poate && (
          <button className="buton secundar mic" type="button" tabIndex={-1} onClick={onSterge} style={{ marginLeft: "auto" }}>
            Scoate învelitoarea
          </button>
        )}
      </div>
      <div className="bi-grila">
        <div className="bi-selectie">
          <div className="bi-cap">Selecție</div>
          {rand("Furnizor", select(furnizor, (v) => alege({ furnizor: v, tip: "", model: "" }), false, ca(furnizori), furnizori.length !== 1))}
          {rand("Tip", select(inv.tip, (v) => alege({ tip: v, model: "" }), !furnizor, ca(listaTipuri)))}
          {rand("Model", select(inv.model, (v) => alege({ model: v }), !inv.tip, ca(listaModele)))}
          {rand(
            "Variantă",
            varianta.fel === "profil"
              ? select(varianta.valoare, (v) => onSchimba((i) => ({ ...i, variantaProfil: v })), false, varianta.valori)
              : varianta.fel === "optiune"
                ? select(varianta.valoare, (v) => alege({ optiune: v }), false, varianta.valori, false)
                : select("", () => undefined, true, varianta.valori, false),
          )}
          {rand("Finisaj", select(inv.finisaj, (v) => alege({ finisaj: v }), !inv.model, ca(listaFinisaje)))}
          {rand("Grosime", select(inv.grosime, (v) => alege({ grosime: v }), !inv.finisaj, ca(listaGrosimi)))}
          {rand(
            "Culoare",
            select(
              inv.culoare,
              (v) => onSchimba((i) => ({ ...i, culoare: v })),
              !produs,
              culori.map((c) => ({ valoare: ral(c), text: ral(c) })),
            ),
          )}
          {cuMontaj &&
            rand(
              "Montaj",
              select(inv.montaj || "acoperis", (v) => onSchimba((i) => ({ ...i, montaj: v })), false, [
                { valoare: "acoperis", text: "acoperiș" },
                { valoare: "perete", text: "perete" },
              ], false),
            )}
          <div className="bi-rand">
            <span>Cantitate</span>
            <div className="comutator" role="group" aria-label="Modul de cantitate">
              <button type="button" className={inv.mod !== "mp" ? "activ" : undefined} disabled={!poate} onClick={() => onSchimba((i) => ({ ...i, mod: i.mod === "combinat" ? "combinat" : "panotaj" }))}>
                Panotaj
              </button>
              <button type="button" className={inv.mod === "mp" ? "activ" : undefined} disabled={!poate} onClick={() => onSchimba((i) => ({ ...i, mod: "mp" }))}>
                mp direct
              </button>
            </div>
          </div>
        </div>
        {inv.mod === "mp" ? (
          <div className="bi-pozitii bi-mp">
            <div className="bi-cap">Suprafață (mp)</div>
            <div className="bi-pozitie">
              <span className="bi-nr"></span>
              <CasutaCantitate value={inv.mpDirect} onChange={(v) => onSchimba((i) => ({ ...i, mpDirect: v }))} tip="zecimal" eticheta="Suprafață directă (mp)" disabled={!poate} placeholder="ex. 148,000" latime={120} />
            </div>
            <p className="mic text-secundar">Suprafața directă nu se poate comanda ca atare (FISA 3.2): pentru comandă, panotajul.</p>
          </div>
        ) : (
          <>
            <div className="bi-pozitii">
              <div className="bi-cap">Lungime (m) · Bucăți</div>
              {Array.from({ length: randuriSelectie }, (_, k) => pozitie(k))}
            </div>
            <div className="bi-pozitii">
              <div className="bi-cap">Lungime (m) · Bucăți</div>
              {Array.from({ length: Math.max(pozitii.length, minim) - randuriSelectie }, (_, j) => pozitie(randuriSelectie + j))}
              {poate && (
                <button type="button" className="buton secundar mic bi-adauga" tabIndex={-1} data-adauga={grup} onClick={adaugaPozitie}>
                  + Adaugă poziție
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <div className="bi-totaluri">
        {inv.mod !== "mp" && (
          <>
            <span>
              Coli <strong>{coli}</strong>
            </span>
            <span>
              Σ lungime × bucăți <strong>{ro2(sumaLungimi)} m</strong>
            </span>
          </>
        )}
        <span>
          Lățime totală{" "}
          {inv.latimeTotalaM ? (
            <>
              <strong>{inv.latimeTotalaM.replace(".", ",")} m</strong> <span className="mic text-secundar">din catalog</span>
            </>
          ) : produs ? (
            <>
              <CasutaCantitate value={inv.latimeTotalaM} onChange={(v) => onSchimba((i) => ({ ...i, latimeTotalaM: v }))} tip="zecimal" eticheta="Lățime totală (m)" disabled={!poate} latime={80} /> <span className="mic text-secundar">lipsește din catalog — scrie-o</span>
            </>
          ) : (
            <span className="text-secundar">—</span>
          )}
        </span>
        <span>
          Suprafață{" "}
          {calcul ? (
            <strong className="numar-mare">{ro3(calcul.mp)} mp</strong>
          ) : Number.isFinite(mpLocal) && mpLocal > 0 ? (
            <strong>{ro2(mpLocal)} mp</strong>
          ) : (
            <span className="text-secundar">—</span>
          )}
          {calcul && !calcul.integralPanotata && <span className="mic text-secundar"> · nu se poate comanda așa (mp direct)</span>}
        </span>
        {inv.mod === "combinat" && (
          <span>
            + suprafață directă{" "}
            <CasutaCantitate value={inv.mpDirect} onChange={(v) => onSchimba((i) => ({ ...i, mpDirect: v }))} tip="zecimal" eticheta="Suprafață directă în plus (mp)" disabled={!poate} latime={100} />
            <span className="mic text-secundar"> mp (ofertă cu suprafață combinată)</span>
          </span>
        )}
        {inv.mod !== "mp" && poate && complete.length > 1 && (
          <button type="button" className="buton secundar mic" tabIndex={-1} onClick={sorteaza} title="ordonează pozițiile după lungime, de la cea mai mare">
            Sortează descrescător
          </button>
        )}
      </div>
    </div>
  );
}
