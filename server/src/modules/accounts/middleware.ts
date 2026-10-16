import type { NextFunction, Request, Response } from "express";
import type { RolUtilizator, Utilizator } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      utilizator?: Utilizator;
    }
  }
}

export async function incarcaUtilizator(req: Request, _res: Response, next: NextFunction) {
  const id = req.session.utilizatorId;
  if (id) {
    const utilizator = await prisma.utilizator.findUnique({ where: { id } });
    if (utilizator && utilizator.activ) {
      req.utilizator = utilizator;
    }
  }
  next();
}

export function cereAutentificare(req: Request, res: Response, next: NextFunction) {
  if (!req.utilizator) {
    res.status(401).json({ eroare: "Autentificare necesara" });
    return;
  }
  next();
}

export function cereRol(...roluri: RolUtilizator[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.utilizator) {
      res.status(401).json({ eroare: "Autentificare necesara" });
      return;
    }
    if (!roluri.includes(req.utilizator.rol)) {
      res.status(403).json({ eroare: "Nu ai acces la aceasta zona" });
      return;
    }
    next();
  };
}
