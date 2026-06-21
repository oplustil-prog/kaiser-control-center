import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staticDist = path.join(root, "dist");
const sitesDist = path.join(root, ".sites-dist");
const serverPublic = path.join(sitesDist, "dist", "server", "public");
const serverDir = path.join(sitesDist, "dist", "server");

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".ts", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"]
]);

async function copyDir(from, to) {
  await mkdir(to, { recursive: true });
  const entries = await readdir(from);

  for (const entry of entries) {
    const source = path.join(from, entry);
    const target = path.join(to, entry);
    const info = await stat(source);

    if (info.isDirectory()) {
      await copyDir(source, target);
    } else {
      await copyFile(source, target);
    }
  }
}

const workerSource = `const ASSET_MANIFEST = new Map(${JSON.stringify(
  await collectAssets(staticDist),
  null,
  2
)});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const assetPath = ASSET_MANIFEST.has(path) ? path : routeFallback(path);
    const asset = await env.ASSETS.fetch(new URL(assetPath, url.origin));

    if (asset.status !== 404) {
      return asset;
    }

    return env.ASSETS.fetch(new URL("/index.html", url.origin));
  }
};

function normalizePath(pathname) {
  if (!pathname || pathname === "/") {
    return "/index.html";
  }

  if (ASSET_MANIFEST.has(pathname)) {
    return pathname;
  }

  return pathname.endsWith("/") ? pathname + "index.html" : pathname + "/index.html";
}

function routeFallback(pathname) {
  if (pathname.startsWith("/src/")) {
    return pathname;
  }

  return "/index.html";
}
`;

await rm(sitesDist, { recursive: true, force: true });
await copyDir(staticDist, serverPublic);
await mkdir(serverDir, { recursive: true });
await writeFile(path.join(serverDir, "index.js"), workerSource);
await mkdir(path.join(sitesDist, "dist", ".openai"), { recursive: true });
await copyFile(path.join(root, ".openai", "hosting.json"), path.join(sitesDist, "dist", ".openai", "hosting.json"));

console.log(`Sites build hotov: ${path.relative(root, sitesDist)}/dist`);

async function collectAssets(baseDir, currentDir = baseDir) {
  const entries = await readdir(currentDir);
  const assets = [];

  for (const entry of entries) {
    const source = path.join(currentDir, entry);
    const info = await stat(source);

    if (info.isDirectory()) {
      assets.push(...await collectAssets(baseDir, source));
      continue;
    }

    const route = `/${path.relative(baseDir, source).split(path.sep).join("/")}`;
    assets.push([route, contentTypes.get(path.extname(route)) || "application/octet-stream"]);
  }

  return assets;
}
