import request from "supertest";
import type { Express } from "express";
import { prisma } from "../src/db/prisma.js";
import { hashParola } from "../src/modules/accounts/auth.js";
import type { RolUtilizator } from "@prisma/client";

export const PAROLA_TEST = "parola-de-test-1234";

export async function creeazaUtilizatorTest(
  email: string,
  rol: RolUtilizator,
  extra: Record<string, unknown> = {},
) {
  const parolaHash = await hashParola(PAROLA_TEST);
  return prisma.utilizator.create({
    data: { nume: `Test ${rol}`, email, parolaHash, rol, ...extra },
  });
}

export async function autentificaAgent(app: Express, email: string) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, parola: PAROLA_TEST }).expect(200);
  return agent;
}
