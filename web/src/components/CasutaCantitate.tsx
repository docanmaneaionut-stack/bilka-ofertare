import type { InputHTMLAttributes } from "react";

// Casuta de cantitate (S25, BUG-8): o singura componenta pentru toate cantitatile din
// editor (rubrici, panotaj, zona B, speciale, lungimi, sipca). Textul din casuta nu e
// rescris niciodata cat scrii: ramane exact ce ai tastat (cifre, cel mult o virgula sau
// un punct la zecimale); parsarea la numar se face separat, la trimiterea spre server
// ("1,5" si "1.5" dau acelasi numar). Nu are stare proprie si nu-si schimba identitatea
// la tastare - randul care o contine trebuie sa aiba o cheie stabila (cauza BUG-8).
// Atributele de navigare (data-grup / data-rand / data-camp) le folosesc tastatura.ts.

export type PropsCasutaCantitate = {
  value: string;
  onChange: (text: string) => void;
  // zecimal (cantitati, lungimi, mp) sau intreg (bucati)
  tip?: "zecimal" | "intreg";
  eticheta: string;
  disabled?: boolean;
  placeholder?: string;
  latime?: number | string;
  // navigarea cu Enter / sageti (tastatura.ts): grupul (sectiunea / blocul), randul, campul
  grup?: string;
  rand?: number;
  camp?: string;
  className?: string;
  style?: InputHTMLAttributes<HTMLInputElement>["style"];
  autoFocus?: boolean;
};

const ZECIMAL = /^\d*([.,]\d*)?$/;
const INTREG = /^\d*$/;

export function textCantitateValid(text: string, tip: "zecimal" | "intreg"): boolean {
  return (tip === "intreg" ? INTREG : ZECIMAL).test(text);
}

// numarul din textul casutei (virgula sau punct), pentru calcule locale; NaN daca e gol / invalid
export function numarDinText(text: string): number {
  const t = text.trim().replace(",", ".");
  return t === "" ? Number.NaN : Number(t);
}

export function CasutaCantitate({ value, onChange, tip = "zecimal", eticheta, disabled, placeholder, latime, grup, rand, camp, className, style, autoFocus }: PropsCasutaCantitate) {
  return (
    <input
      type="text"
      inputMode={tip === "intreg" ? "numeric" : "decimal"}
      value={value}
      onChange={(e) => {
        const text = e.target.value;
        if (textCantitateValid(text, tip)) onChange(text);
      }}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={eticheta}
      className={`casuta-cantitate${className ? ` ${className}` : ""}`}
      style={latime !== undefined ? { width: latime, ...style } : style}
      data-grup={grup}
      data-rand={rand}
      data-camp={camp}
      autoFocus={autoFocus}
    />
  );
}
