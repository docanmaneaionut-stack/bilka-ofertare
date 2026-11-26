import { useState, type KeyboardEvent, type MouseEvent } from "react";

// Eliminarea unui bloc intreg din editorul ofertei (S29b, BUG-25): o pozitie la lungimi cu toate randurile ei,
// o rubrica de sipca, un sistem pluvial, o invelitoare secundara. Butonul sta in antetul blocului, departe de
// "+ Adauga..."; cand blocul are ceva completat cere confirmare pe loc ("Da, sterge" / "Nu"), altfel blocul gol
// dispare fara intrebare. Ca la cos (BUG-11): doar cu clic, niciodata de la taste, si in afara drumului Tab.
export function ScoateBloc({ eticheta, intrebare, cuConfirmare, onScoate }: { eticheta: string; intrebare: string; cuConfirmare: boolean; onScoate: () => void }) {
  const [intreaba, setIntreaba] = useState(false);
  const doarClic = (f: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0 && e.nativeEvent instanceof KeyboardEvent) return;
    f();
  };
  const faraTaste = { tabIndex: -1, onKeyDown: (e: KeyboardEvent) => e.preventDefault(), onKeyUp: (e: KeyboardEvent) => e.preventDefault() };
  if (!intreaba)
    return (
      <button className="buton sterge mic scoate-bloc" type="button" {...faraTaste} onClick={doarClic(() => (cuConfirmare ? setIntreaba(true) : onScoate()))}>
        {eticheta}
      </button>
    );
  return (
    <span className="confirmare-stergere in-antet" role="alertdialog" aria-label="Confirmarea ștergerii">
      <span>{intrebare}</span>
      <button type="button" className="buton sterge mic" {...faraTaste} onClick={doarClic(onScoate)}>
        Da, șterge
      </button>
      <button type="button" className="buton secundar mic" {...faraTaste} onClick={doarClic(() => setIntreaba(false))}>
        Nu
      </button>
    </span>
  );
}
