import { useState, type FocusEvent, type FormEvent } from "react";

// S29b (decizia 1): marcajul unui rand cu problema apare la IESIREA din rand, nu la fiecare tasta. Randul "in
// lucru" e cel in care tocmai scrii (de la prima tasta pana pleci din el); cat e in lucru nu se marcheaza.
// Cursorul pus in rand fara a scrie (cand pagina te duce la rand) nu ascunde marcajul.
// Se pune pe containerul randurilor: `<tbody {...inLucru.pe}>`; randurile se recunosc dupa data-grup / data-rand
// ale casutelor (aceleasi atribute pe care le foloseste navigarea cu tastatura).
export function useRandInLucru() {
  const [rand, setRand] = useState<string | null>(null);
  const cheia = (el: EventTarget | null) => {
    const d = (el as HTMLElement | null)?.dataset;
    return d?.grup !== undefined && d.rand !== undefined ? `${d.grup}:${d.rand}` : null;
  };
  return {
    este: (grup: string, k: number) => rand === `${grup}:${k}`,
    pe: {
      onInput: (e: FormEvent<HTMLElement>) => setRand(cheia(e.target)),
      onBlur: (e: FocusEvent<HTMLElement>) => {
        if (cheia(e.relatedTarget) !== cheia(e.target)) setRand(null);
      },
    },
  };
}
