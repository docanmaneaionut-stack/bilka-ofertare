// Incarca listele de optiuni (motivele completarii, sursa clientului, ordinea finisajelor - M14) din
// docs/import/configurare/optiuni-liste.csv in baza din .env, fara restul seed-ului (nu atinge conturi, categorii
// sau alte tabele). Idempotent: adauga DOAR valorile care lipsesc; ce exista deja - si ce a schimbat sau a
// dezactivat Admin general din Zona tehnica -> Referinte - ramane neatins. Nimic nu se sterge.
// Folosire, din server/:  npm run optiuni-liste
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { citesteCsvOptiuni, incarcaOptiuniListe, LISTE_OPTIUNI } from "../src/modules/adm/optiuniListe.js";

async function main() {
  const dinCsv = citesteCsvOptiuni();
  const adaugate = await incarcaOptiuniListe(prisma, dinCsv);
  console.log(`Liste de opțiuni: ${adaugate} valori adăugate (restul existau deja).`);
  for (const lista of LISTE_OPTIUNI) {
    const randuri = await prisma.optiuneLista.findMany({ where: { lista }, orderBy: [{ ordine: "asc" }, { valoare: "asc" }], select: { valoare: true, ordine: true, activ: true } });
    console.log(`  ${lista} (${randuri.length}): ${randuri.map((r) => `${r.ordine} ${r.valoare}${r.activ ? "" : " [dezactivată]"}`).join(" · ")}`);
  }
}

main()
  .catch((eroare) => {
    console.error(eroare);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
