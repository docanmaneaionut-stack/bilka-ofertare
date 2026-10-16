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
}

main()
  .catch((eroare) => {
    console.error(eroare);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
