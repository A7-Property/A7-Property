import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * `shadowDatabaseUrl` is only needed by the tooling: `migrate dev` and the
 * `migrate diff --from-migrations` drift check both replay migrations into a
 * throwaway database. It is never used by the running API.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: {
    url: env("DATABASE_URL"),
    ...(process.env.SHADOW_DATABASE_URL ? { shadowDatabaseUrl: env("SHADOW_DATABASE_URL") } : {}),
  },
});
