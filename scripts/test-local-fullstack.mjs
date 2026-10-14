import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!existsSync(resolve(root, "work/local-fullstack/managed.json"))) throw new Error("Run fullstack:setup first.");
const requireBackend = createRequire(resolve(root, "backend/package.json"));
const { parse } = requireBackend("dotenv");
const env = { ...process.env, ...parse(readFileSync(resolve(root, "backend/.env"))), NODE_ENV: "test", A7_E2E_FRESH_DATABASES: "true", ENABLE_JOBS: "false" };
const url = new URL(env.DATABASE_URL);
if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/a7_local") throw new Error("Use the managed local database only.");
url.pathname = "/a7_local_test_base";
env.DATABASE_URL = url.toString();
const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "test:e2e"], { cwd: resolve(root, "backend"), env, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
