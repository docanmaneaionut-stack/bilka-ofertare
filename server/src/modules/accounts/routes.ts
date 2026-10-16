import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { verificaParola } from "./auth.js";
import { cereAutentificare } from "./middleware.js";

export const accountsRouter = Router();

function utilizatorPublic(utilizator: {
  id: string;
  nume: string;
  email: string;
  rol: string;
  firmaId: string | null;
}) {
  return {
    id: utilizator.id,
    nume: utilizator.nume,
    email: utilizator.email,
    rol: utilizator.rol,
    firmaId: utilizator.firmaId,
  };
}

accountsRouter.post("/login", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const parola = typeof req.body?.parola === "string" ? req.body.parola : "";

  const dispozitiv = req.headers["user-agent"] ?? null;
  const sursa = req.ip ?? null;

  const esecAutentificare = async (utilizatorId: string | null) => {
    await prisma.jurnalAutentificare.create({
      data: {
        utilizatorId,
        emailIncercat: email,
        rezultat: "ESEC",
        dispozitiv,
        sursa,
      },
    });
    res.status(401).json({ eroare: "Email sau parola incorecte" });
  };

  if (!email || !parola) {
    await esecAutentificare(null);
    return;
  }

  const utilizator = await prisma.utilizator.findUnique({ where: { email } });
  if (!utilizator || !utilizator.activ) {
    await esecAutentificare(utilizator?.id ?? null);
    return;
  }

  const parolaCorecta = await verificaParola(parola, utilizator.parolaHash);
  if (!parolaCorecta) {
    await esecAutentificare(utilizator.id);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((eroare) => (eroare ? reject(eroare) : resolve()));
  });
  req.session.utilizatorId = utilizator.id;

  await prisma.jurnalAutentificare.create({
    data: {
      utilizatorId: utilizator.id,
      emailIncercat: email,
      rezultat: "SUCCES",
      dispozitiv,
      sursa,
    },
  });

  res.json({ utilizator: utilizatorPublic(utilizator) });
});

accountsRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.status(204).end();
  });
});

accountsRouter.get("/me", cereAutentificare, (req, res) => {
  res.json({ utilizator: utilizatorPublic(req.utilizator!) });
});
