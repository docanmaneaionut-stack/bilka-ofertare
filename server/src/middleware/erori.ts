import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export const gestioneazaErori: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ eroare: "Date invalide", detalii: err.issues });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const campuri = (err.meta?.target as string[] | undefined)?.join(", ") ?? "";
      res.status(409).json({ eroare: `Exista deja o intrare cu aceeasi valoare (${campuri})` });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ eroare: "Nu exista" });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ eroare: "Eroare neasteptata" });
};
