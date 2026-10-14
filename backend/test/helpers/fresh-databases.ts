import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../../src/prisma/prisma.service";
import { assertDisposableDatabase } from "./database-safety";

/** Opt-in integration isolation: create a database per test, never erase tables. */
export async function freshDatabaseProvider() {
  assertDisposableDatabase();
  const baseUrl = new URL(process.env.DATABASE_URL!);
  if (!["127.0.0.1", "localhost"].includes(baseUrl.hostname)) {
    throw new Error("Fresh integration databases must run on loopback.");
  }
  const prefix = `a7_test_${randomBytes(6).toString("hex")}`;
  let sequence = 0;
  let active: PrismaService;
  async function nextDatabase() {
    if (active) await active.$disconnect();
    const name = `${prefix}_${++sequence}`;
    const adminUrl = new URL(baseUrl);
    adminUrl.pathname = "/postgres";
    const admin = new Client({ connectionString: adminUrl.toString() });
    await admin.connect();
    try { await admin.query(`CREATE DATABASE "${name}"`); }
    finally { await admin.end(); }
    const url = new URL(baseUrl);
    url.pathname = `/${name}`;
    const connection = new Client({ connectionString: url.toString() });
    await connection.connect();
    try {
      const migrations = resolve(__dirname, "../../prisma/migrations");
      for (const migration of readdirSync(migrations).sort()) {
        if (migration === "migration_lock.toml") continue;
        await connection.query(readFileSync(resolve(migrations, migration, "migration.sql"), "utf8"));
      }
    } finally { await connection.end(); }
    const previous = process.env.DATABASE_URL;
    try {
      process.env.DATABASE_URL = url.toString();
      active = new PrismaService();
    } finally { process.env.DATABASE_URL = previous; }
    await active.$connect();
  }
  await nextDatabase();
  const prisma = new Proxy({} as PrismaService, {
    get(_target, key) {
      const value = Reflect.get(active, key, active);
      return typeof value === "function" ? value.bind(active) : value;
    },
  });
  return { prisma, nextDatabase };
}
