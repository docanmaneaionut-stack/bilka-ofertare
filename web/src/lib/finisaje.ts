// S29b (MODIFICAREA M14, docs/MODIFICARI-S29B.md): ordinea finisajelor in listele de selectie. Ordinea NU e in
// cod: vine din lista de referinta "ordine_finisaj" (lista de optiuni din baza, schimbata de Admin general din
// Zona tehnica -> Referinte) si ajunge la ecrane odata cu referintele editorului. Ce finisaje exista pentru un
// produs vine tot din catalog - aici doar se asaza: cele din lista de referinta, in ordinea ei; un finisaj
// nepus inca in lista, la sfarsit, alfabetic (valoarea goala, ultima). Nimic nu se adauga si nimic nu se scoate.
// Cat lista de referinta nu e incarcata in baza (goala), ordinea ramane cea de pana acum, cum vin din catalog.
export function ordoneazaFinisaje(valori: readonly string[], ordine: readonly string[]): string[] {
  if (ordine.length === 0) return [...valori];
  const loc = new Map(ordine.map((f, k) => [f.trim().toLowerCase(), k]));
  const rang = (f: string) => loc.get(f.trim().toLowerCase()) ?? Number.POSITIVE_INFINITY;
  return valori
    .map((valoare, k) => ({ valoare, k }))
    .sort((a, b) => {
      const ra = rang(a.valoare);
      const rb = rang(b.valoare);
      if (ra !== rb) return ra - rb;
      if (ra !== Number.POSITIVE_INFINITY) return a.k - b.k;
      // in afara listei: alfabetic, cu valoarea goala la urma
      if ((a.valoare === "") !== (b.valoare === "")) return a.valoare === "" ? 1 : -1;
      return a.valoare.localeCompare(b.valoare, "ro", { sensitivity: "base" }) || a.k - b.k;
    })
    .map((x) => x.valoare);
}
