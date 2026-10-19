import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { hashParola } from "../src/modules/accounts/auth.js";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Lipseste variabila de mediu ${name} (vezi .env.example)`);
  }
  return value;
}

async function creeazaAdminGeneral(nume: string, email: string, parola: string) {
  const emailNormalizat = email.trim().toLowerCase();
  const existent = await prisma.utilizator.findUnique({ where: { email: emailNormalizat } });
  if (existent) {
    console.log(`Contul ${emailNormalizat} exista deja, nu se modifica.`);
    return existent;
  }

  const parolaHash = await hashParola(parola);
  const utilizator = await prisma.utilizator.create({
    data: {
      nume,
      email: emailNormalizat,
      parolaHash,
      rol: "ADMIN_GENERAL",
    },
  });

  await prisma.jurnalIntrare.create({
    data: {
      utilizatorId: utilizator.id,
      numeUtilizatorLaMoment: utilizator.nume,
      entitate: "Utilizator",
      entitateId: utilizator.id,
      actiune: "creare_seed",
    },
  });

  console.log(`Creat contul Admin general: ${emailNormalizat}`);
  return utilizator;
}

// Ordinea rubricilor pe oferta (FISA-OFERTARE, decisa 14.09 / completata
// 19.10.2026); seed-ul e doar initializare - raman editabile din ecranul lor.
const CATEGORII_OFERTA: { denumire: string; zona: "A" | "B"; ordine: number }[] = [
  { denumire: "Învelitori", zona: "A", ordine: 1 },
  { denumire: "Accesorii standard", zona: "A", ordine: 2 },
  { denumire: "Accesorii speciale (2 ML)", zona: "A", ordine: 3 },
  { denumire: "Fixare și etanșare", zona: "A", ordine: 4 },
  { denumire: "Sistem pluvial", zona: "A", ordine: 5 },
  { denumire: "Șipcă gard", zona: "A", ordine: 6 },
  { denumire: "Accesorii speciale la lungimi (ML)", zona: "A", ordine: 7 },
  { denumire: "Ferestre", zona: "A", ordine: 8 },
  { denumire: "Zona B", zona: "B", ordine: 9 },
];

async function creeazaCategoriiOferta() {
  for (const categorie of CATEGORII_OFERTA) {
    const existenta = await prisma.categorieOferta.findUnique({ where: { denumire: categorie.denumire } });
    if (existenta) continue;
    await prisma.categorieOferta.create({ data: categorie });
    console.log(`Creata categoria de oferta: ${categorie.denumire}`);
  }
}

async function main() {
  await creeazaAdminGeneral(
    requiredEnv("ADMIN_NUME"),
    requiredEnv("ADMIN_EMAIL"),
    requiredEnv("ADMIN_PAROLA"),
  );

  // cont de rezerva (fisa CONTURI §8.1): parola o stabileste si o pastreaza
  // Ionut in afara softului; scriptul doar creeaza contul din ce gaseste in .env
  await creeazaAdminGeneral(
    requiredEnv("ADMIN_REZERVA_NUME"),
    requiredEnv("ADMIN_REZERVA_EMAIL"),
    requiredEnv("ADMIN_REZERVA_PAROLA"),
  );

  await creeazaCategoriiOferta();
}

main()
  .catch((eroare) => {
    console.error(eroare);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
