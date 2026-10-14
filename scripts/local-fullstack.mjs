import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const work = resolve(root, "work/local-fullstack");
const requireBackend = createRequire(resolve(root, "backend/package.json"));
const { Client } = requireBackend("pg");
const { parse } = requireBackend("dotenv");
const backendFile = resolve(root, "backend/.env");
const frontendFile = resolve(root, ".env.local");
const marker = resolve(work, "managed.json");
const pgBin = process.env.A7_PG_BIN ?? "/opt/homebrew/opt/postgresql@16/bin";
const data = resolve(work, "postgres");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, cwd = root, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
}
function managedEnvironment() {
  if (!existsSync(marker)) throw new Error("Run npm run fullstack:setup first.");
  const env = parse(readFileSync(backendFile));
  const url = new URL(env.DATABASE_URL);
  if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/a7_local") {
    throw new Error("Refusing to operate on a database outside the managed local stack.");
  }
  return env;
}
function startDatabase() {
  const status = spawnSync(resolve(pgBin, "pg_ctl"), ["-D", data, "status"], { stdio: "ignore" });
  if (status.status !== 0) run(resolve(pgBin, "pg_ctl"), ["-D", data, "-l", resolve(work, "postgres.log"), "-w", "-t", "30", "start"]);
}
async function assertPortAvailable(port) {
  await new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error(`Port ${port} is already in use. Stop the existing service before starting this stack.`)));
    server.listen(port, "127.0.0.1", () => server.close(resolvePort));
  });
}

const action = process.argv[2] ?? "status";
if (action === "setup") {
  if (!existsSync(resolve(pgBin, "initdb"))) throw new Error("PostgreSQL 16 is required. Install postgresql@16, or set A7_PG_BIN to its bin directory.");
  const version = spawnSync(resolve(pgBin, "postgres"), ["--version"], { encoding: "utf8" }).stdout;
  if (!/PostgreSQL\) 16\./.test(version)) throw new Error("A7_PG_BIN must point to PostgreSQL 16.");
  mkdirSync(work, { recursive: true, mode: 0o700 });
  if (!existsSync(marker)) {
    if (existsSync(backendFile) || existsSync(frontendFile) || existsSync(data)) {
      throw new Error("Existing local configuration found. Setup will not overwrite it. Configure the API manually using backend/.env.example.");
    }
    const password = randomBytes(32).toString("hex");
    const passwordFile = resolve(work, "postgres-password");
    writeFileSync(passwordFile, password, { mode: 0o600, flag: "wx" });
    run(resolve(pgBin, "initdb"), ["-D", data, "--username=a7", "--encoding=UTF8", "--locale=C", "--auth-local=scram-sha-256", "--auth-host=scram-sha-256", `--pwfile=${passwordFile}`]);
    writeFileSync(resolve(data, "postgresql.auto.conf"), "listen_addresses = '127.0.0.1'\nport = 55432\nunix_socket_directories = ''\n", { flag: "a" });
    const databaseUrl = `postgresql://a7:${password}@127.0.0.1:55432/a7_local`;
    const template = parse(readFileSync(resolve(root, "backend/.env.example")));
    const environment = { ...template, DATABASE_URL: databaseUrl, JWT_ACCESS_SECRET: randomBytes(48).toString("hex"), JWT_REFRESH_SECRET: randomBytes(48).toString("hex"), ENABLE_JOBS: "false", APP_VERSION: "local-fullstack", API_BIND_ADDRESS: "127.0.0.1" };
    writeFileSync(backendFile, Object.entries(environment).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
    writeFileSync(frontendFile, "# Local only. Production configuration is unchanged.\nNEXT_PUBLIC_API_URL=http://localhost:4000/api/v1\n", { flag: "wx", mode: 0o600 });
    writeFileSync(marker, JSON.stringify({ version: 1, database: "a7_local", port: 55432 }), { flag: "wx", mode: 0o600 });
  }
  const env = managedEnvironment();
  startDatabase();
  const url = new URL(env.DATABASE_URL);
  url.pathname = "/postgres";
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  for (const name of ["a7_local", "a7_local_test_base", "a7_local_shadow"]) {
    if (!(await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name])).rowCount) {
      await client.query(`CREATE DATABASE "${name}"`);
    }
  }
  await client.end();
  run(npm, ["run", "db:generate"], resolve(root, "backend"), { ...process.env, ...env });
  run(npm, ["run", "db:deploy"], resolve(root, "backend"), { ...process.env, ...env });
  console.log("Local stack configured. Run npm run fullstack:dev. No catalog or accounts were seeded.");
} else if (action === "dev") {
  const env = managedEnvironment();
  await assertPortAvailable(3000);
  await assertPortAvailable(4000);
  startDatabase();
  const children = [
    ["backend", ["run", "dev"], resolve(root, "backend"), { ...process.env, ...env }],
    ["frontend", ["run", "dev:next", "--", "--hostname", "127.0.0.1"], root, process.env],
  ].map(([name, args, cwd, childEnv]) => {
    const log = openSync(resolve(work, `${name}.log`), "a", 0o600);
    return spawn(npm, args, { cwd, env: childEnv, detached: process.platform !== "win32", stdio: ["ignore", log, log] });
  });
  const started = spawnSync("ps", ["-p", String(process.pid), "-o", "lstart="], { encoding: "utf8" }).stdout?.trim();
  writeFileSync(resolve(work, "processes.json"), JSON.stringify({ supervisorPid: process.pid, started }), { mode: 0o600 });
  let stopping = false;
  function stop() {
    if (stopping) return;
    stopping = true;
    for (const child of children) { try { process.kill(process.platform === "win32" ? child.pid : -child.pid, "SIGTERM"); } catch {} }
  }
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  for (const child of children) child.on("exit", stop);
  console.log(`Frontend: http://localhost:3000\nAPI: http://localhost:4000/api/v1\nDevelopment email links: ${resolve(work, "backend.log")}\nCtrl+C stops the web/API processes; PostgreSQL retains local data.`);
} else if (action === "stop") {
  managedEnvironment();
  if (existsSync(resolve(work, "processes.json"))) {
    const managed = JSON.parse(readFileSync(resolve(work, "processes.json")));
    if (!Number.isInteger(managed.supervisorPid)) throw new Error("Stop the older supervisor using Ctrl+C first.");
    const current = spawnSync("ps", ["-p", String(managed.supervisorPid), "-o", "lstart="], { encoding: "utf8" }).stdout?.trim();
    // Never signal a recycled PID belonging to another application.
    if (current && current === managed.started) {
      process.kill(managed.supervisorPid, "SIGTERM");
    }
  }
  const status = spawnSync(resolve(pgBin, "pg_ctl"), ["-D", data, "status"], { stdio: "ignore" });
  if (status.status === 0) run(resolve(pgBin, "pg_ctl"), ["-D", data, "-w", "stop", "-m", "fast"]);
} else if (action === "status") {
  const env = managedEnvironment();
  const client = new Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 3000 });
  await client.connect();
  console.log((await client.query("SELECT version() AS version")).rows[0].version);
  await client.end();
  for (const [name, url] of [["API", "http://localhost:4000/api/v1/health/ready"], ["Frontend", "http://localhost:3000"]]) {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`${name} returned ${response.status}`);
    console.log(`${name}: HTTP ${response.status}`);
  }
} else throw new Error("Use setup, dev, status or stop.");
