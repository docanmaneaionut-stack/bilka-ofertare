import type { KeyboardEvent } from "react";

// Tastatura in editor (S25, BUG-6 / BUG-11; FISA-OFERTARE cap. 0): casutele de
// cantitate poarta data-grup (sectiunea / blocul), data-rand (pozitia / randul) si
// data-camp (lungime, bucati, cantitate...). Enter trece pe PRIMA casuta a randului
// urmator din grup (la panotaj: lungimea pozitiei urmatoare - inclusiv 8 -> 9 si
// 16 -> 17), iar pe ultimul rand apasa butonul "+ Adauga pozitie" al grupului
// (button[data-adauga=grup]) si trece pe pozitia noua; sagetile sus / jos muta pe
// acelasi camp al randului vecin. Tab ramane al browserului: butoanele de pe randuri
// au tabIndex -1, deci drumul tastaturii e doar intre casutele completabile.

const CAMPURI_ORDINE = ["lungime", "bucati", "cantitate", "lungimeTronson", "distanta"];

function casutele(grup: string): HTMLInputElement[] {
  const toate = Array.from(document.querySelectorAll<HTMLInputElement>(`input[data-grup="${CSS.escape(grup)}"]:not(:disabled)`));
  return toate.sort((a, b) => {
    const ra = Number(a.dataset.rand ?? 0);
    const rb = Number(b.dataset.rand ?? 0);
    if (ra !== rb) return ra - rb;
    return CAMPURI_ORDINE.indexOf(a.dataset.camp ?? "") - CAMPURI_ORDINE.indexOf(b.dataset.camp ?? "");
  });
}

function focuseaza(el: HTMLInputElement | undefined): boolean {
  if (!el) return false;
  el.focus();
  el.select();
  return true;
}

export function navigheazaTastatura(e: KeyboardEvent<HTMLElement>): void {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") return;
  const el = e.target as HTMLElement;
  if (!(el instanceof HTMLInputElement) || !el.dataset.grup) return;
  const grup = el.dataset.grup;
  const rand = Number(el.dataset.rand ?? 0);
  const camp = el.dataset.camp ?? "";
  const lista = casutele(grup);
  if (e.key === "Enter") {
    e.preventDefault();
    const urmator = lista.find((x) => Number(x.dataset.rand ?? 0) > rand);
    if (focuseaza(urmator)) return;
    // ultimul rand: "+ Adauga pozitie" al grupului, apoi pozitia noua (apare dupa randare)
    const adauga = document.querySelector<HTMLButtonElement>(`button[data-adauga="${CSS.escape(grup)}"]`);
    if (!adauga || adauga.disabled) return;
    adauga.click();
    setTimeout(() => focuseaza(casutele(grup).find((x) => Number(x.dataset.rand ?? 0) > rand)), 0);
    return;
  }
  const delta = e.key === "ArrowUp" ? -1 : 1;
  const randuri = [...new Set(lista.map((x) => Number(x.dataset.rand ?? 0)))];
  const idx = randuri.indexOf(rand);
  const tinta = randuri[idx + delta];
  if (tinta === undefined) return;
  const peCamp = lista.find((x) => Number(x.dataset.rand ?? 0) === tinta && x.dataset.camp === camp) ?? lista.find((x) => Number(x.dataset.rand ?? 0) === tinta);
  if (focuseaza(peCamp)) e.preventDefault();
}
