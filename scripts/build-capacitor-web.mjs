import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "next.cmd" : "next";
const child = spawn(command, ["build", "--webpack"], {
  env: { ...process.env, CAPACITOR_BUILD: "1" },
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`Unable to start the Capacitor web build: ${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) console.error(`Capacitor web build stopped by ${signal}.`);
  process.exitCode = code ?? 1;
});
