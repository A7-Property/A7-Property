import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { loadEnv } from "vite";

// The rendered worker and its assertions must agree about the selected API mode.
const env = { ...process.env, ...loadEnv("production", process.cwd(), "NEXT_PUBLIC_") };
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const build = spawnSync(npm, ["run", "build:cloudflare"], { env, stdio: "inherit" });
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
const files = readdirSync("tests").filter((file) => file.endsWith(".test.mjs")).map((file) => `tests/${file}`);
const tests = spawnSync(process.execPath, ["--test", ...files], { env, stdio: "inherit" });
if (tests.error) throw tests.error;
process.exitCode = tests.status ?? 1;
