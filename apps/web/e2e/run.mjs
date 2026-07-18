import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = 3100;
const baseUrl = `http://127.0.0.1:${port}`;
const childEnvironment = {
  ...process.env,
  NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8000",
};

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
  { cwd: process.cwd(), env: childEnvironment, stdio: "inherit" },
);

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next.js exited with code ${server.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/classify`);
      if (response.ok) return;
    } catch {
      // The server may still be compiling; retry within the bounded deadline.
    }
    await delay(500);
  }
  throw new Error("Next.js did not become ready within 120 seconds");
}

async function stopServer() {
  if (server.exitCode !== null || server.pid === undefined) return;
  const exited = new Promise((resolve) => server.once("exit", () => resolve(true)));
  server.kill("SIGTERM");
  const stopped = await Promise.race([exited, delay(3_000).then(() => false)]);
  if (!stopped && process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      detached: true,
      stdio: "ignore",
    });
    killer.unref();
  }
  server.unref();
}

try {
  await waitForServer();
  const runner = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test"],
    { cwd: process.cwd(), env: childEnvironment, stdio: "inherit" },
  );
  const exitCode = await new Promise((resolve, reject) => {
    runner.once("exit", (code) => resolve(code ?? 1));
    runner.once("error", reject);
  });
  process.exitCode = exitCode;
} finally {
  await stopServer();
}
