import { readFile } from "node:fs/promises";
import path from "node:path";

function parseArguments(values) {
  const result = { allowMock: false };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--allow-mock") {
      result.allowMock = true;
      continue;
    }
    if (!value?.startsWith("--")) throw new Error(`Unknown argument: ${value}`);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for ${value}`);
    result[value.slice(2)] = next;
    index += 1;
  }
  return result;
}

async function requireSuccess(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!options.api || !options.web) {
    throw new Error("Usage: node scripts/smoke-deployment.mjs --api <url> --web <url>");
  }
  const api = new URL(options.api).origin;
  const web = new URL(options.web).origin;
  const allowedOrigin = options["allowed-origin"] ?? web;
  const deniedOrigin = options["denied-origin"] ?? "https://denied.invalid";

  const webResponse = await requireSuccess(web);
  const healthResponse = await requireSuccess(`${api}/api/v1/health`);
  const health = await healthResponse.json();
  if (health.status !== "ok") throw new Error("API health status is not ok");
  if (!options.allowMock) {
    if (health.inferenceMode !== "model" || health.modelLoaded !== true) {
      throw new Error("Production smoke requires inferenceMode=model and modelLoaded=true");
    }
    if (health.fallbackReason != null) throw new Error("Production model reported a fallback reason");
  }

  const allowed = await requireSuccess(`${api}/api/v1/health`, {
    headers: { Origin: allowedOrigin },
  });
  if (allowed.headers.get("access-control-allow-origin") !== allowedOrigin) {
    throw new Error(`CORS did not allow ${allowedOrigin}`);
  }
  if (allowed.headers.has("access-control-allow-credentials")) {
    throw new Error("CORS credentials must remain disabled");
  }
  const denied = await requireSuccess(`${api}/api/v1/health`, {
    headers: { Origin: deniedOrigin },
  });
  if (denied.headers.has("access-control-allow-origin")) {
    throw new Error(`CORS unexpectedly allowed ${deniedOrigin}`);
  }

  if (options.fixture) {
    const fixturePath = path.resolve(options.fixture);
    const bytes = await readFile(fixturePath);
    const extension = path.extname(fixturePath).toLowerCase();
    const mimeType = extension === ".png" ? "image/png" : "image/jpeg";
    const form = new FormData();
    form.append("image", new Blob([bytes], { type: mimeType }), path.basename(fixturePath));
    form.append("client", "web");
    const classification = await requireSuccess(`${api}/api/v1/classifications`, {
      method: "POST",
      body: form,
    });
    const body = await classification.json();
    if (!Array.isArray(body.predictions) || body.predictions.length !== 3) {
      throw new Error("Classification smoke did not return Top 3 predictions");
    }
  }

  console.log(
    JSON.stringify(
      {
        web: { url: web, status: webResponse.status },
        api: {
          url: api,
          status: healthResponse.status,
          inferenceMode: health.inferenceMode,
          modelLoaded: health.modelLoaded,
          modelVersion: health.modelVersion,
          fallbackReason: health.fallbackReason ?? null,
        },
        cors: { allowedOrigin, deniedOrigin, credentials: false },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
