import { Router } from "express";
import type { Utilizator } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { DURATA_BLOCARE_MINUTE, MAX_INCERCARI_GRESITE, verificaParola } from "./auth.js";
import { cereAutentificare } from "./middleware.js";

export const accountsRouter = Router();

// ce vede despre sine orice cont: fara adaos %, fara parola, fara contoare
export function utilizatorPublic(u: Utilizator) {
  return {
    id: u.id,
    nume: u.nume,
    email: u.email,
    telefon: u.telefon,
    rol: u.rol,
    firmaId: u.firmaId,
    parolaTrebuieSchimbata: u.parolaTrebuieSchimbata,
  };
}

accountsRouter.post("/login", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const parola = typeof req.body?.parola === "string" ? req.body.parola : "";

  const dispozitiv = req.headers["user-agent"] ?? null;
  // Node scrie adresele IPv4 primite pe un socket IPv6 ca "::ffff:192.168.x.x"
  const sursa = req.ip?.replace(/^::ffff:/, "") ?? null;
  const acum = new Date();

  const scrieJurnal = (utilizatorId: string | null, rezultat: "SUCCES" | "ESEC" | "BLOCAT") =>
    prisma.jurnalAutentificare.create({ data: { utilizatorId, emailIncercat: email, rezultat, dispozitiv, sursa } });

  const refuza = async (utilizatorId: string | null) => {
    await scrieJurnal(utilizatorId, "ESEC");
    res.status(401).json({ eroare: "Email sau parola incorecte" });
  };

  if (!email || !parola) {
    await refuza(null);
    return;
  }

  const utilizator = await prisma.utilizator.findUnique({ where: { email } });
  if (!utilizator || !utilizator.activ) {
    await refuza(utilizator?.id ?? null);
    return;
  }

  if (utilizator.blocatPanaLa && utilizator.blocatPanaLa > acum) {
    await scrieJurnal(utilizator.id, "BLOCAT");
    const minute = Math.max(1, Math.ceil((utilizator.blocatPanaLa.getTime() - acum.getTime()) / 60000));
    res.status(423).json({ eroare: `Cont blocat temporar după încercări greșite repetate. Încearcă din nou peste ${minute} minute.` });
    return;
  }

  const parolaCorecta = await verificaParola(parola, utilizator.parolaHash);
  if (!parolaCorecta) {
    const incercari = utilizator.incercariEsuate + 1;
    if (incercari >= MAX_INCERCARI_GRESITE) {
      const blocatPanaLa = new Date(acum.getTime() + DURATA_BLOCARE_MINUTE * 60000);
      await prisma.utilizator.update({ where: { id: utilizator.id }, data: { incercariEsuate: 0, blocatPanaLa } });
      await scrieJurnal(utilizator.id, "BLOCAT");
      res.status(423).json({ eroare: `Prea multe încercări greșite. Contul e blocat ${DURATA_BLOCARE_MINUTE} minute.` });
      return;
    }
    await prisma.utilizator.update({ where: { id: utilizator.id }, data: { incercariEsuate: incercari } });
    await refuza(utilizator.id);
    return;
  }

  if (utilizator.incercariEsuate > 0 || utilizator.blocatPanaLa) {
    await prisma.utilizator.update({ where: { id: utilizator.id }, data: { incercariEsuate: 0, blocatPanaLa: null } });
  }

  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((eroare) => (eroare ? reject(eroare) : resolve()));
  });
  req.session.utilizatorId = utilizator.id;

  await scrieJurnal(utilizator.id, "SUCCES");
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
