import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const command = process.platform === "win32" ? "gradlew.bat" : "sh";
const tasks = process.argv.slice(2);

if (tasks.length === 0) {
  console.error("Pass at least one Gradle task, for example assembleDebug.");
  process.exit(1);
}

const args = process.platform === "win32" ? tasks : ["./gradlew", ...tasks];
const child = spawn(command, args, { cwd: resolve(root, "android"), stdio: "inherit" });

child.on("error", (error) => {
  console.error(`Unable to start the Android Gradle wrapper: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) console.error(`Android build stopped by ${signal}.`);
  process.exitCode = code ?? 1;
});
