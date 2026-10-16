import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { env } from "../../env.js";

const PgSession = connectPgSimple(session);

const pool = new pg.Pool({ connectionString: env.databaseUrl });

export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: "session",
    // tabelul e creat prin migrarea Prisma (model SesiuneExpres), nu ad-hoc
    createTableIfMissing: false,
  }),
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 12, // 12 ore
  },
});

declare module "express-session" {
  interface SessionData {
    utilizatorId?: string;
  }
}
