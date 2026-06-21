import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requestedRoot = process.argv[2] === "dist" ? "dist" : ".";
const publicRoot = path.join(root, requestedRoot);
const preferredPort = Number(process.env.PORT || 5173);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".ts", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"]
]);

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => {
        tester.close(() => resolve(true));
      })
      .listen(port, "127.0.0.1");
  });
}

async function pickPort(start) {
  for (let port = start; port < start + 20; port += 1) {
    if (await isPortFree(port)) {
      return port;
    }
  }

  throw new Error("Nenasel jsem volny port pro lokalni server.");
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveFile(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  const cleanPath = decodeURIComponent(url.pathname);
  const safePath = path.normalize(cleanPath).replace(/^(\.\.[/\\])+/, "");
  let target = path.join(publicRoot, safePath);

  if (!target.startsWith(publicRoot)) {
    return path.join(publicRoot, "index.html");
  }

  if (await fileExists(target)) {
    const info = await stat(target);
    if (info.isDirectory()) {
      const directoryIndex = path.join(target, "index.html");
      if (await fileExists(directoryIndex)) {
        return directoryIndex;
      }
    }
    return target;
  }

  return path.join(publicRoot, "index.html");
}

const server = createServer(async (request, response) => {
  const filePath = await resolveFile(request.url || "/");
  const extension = path.extname(filePath);
  response.setHeader("Content-Type", contentTypes.get(extension) || "application/octet-stream");
  createReadStream(filePath).pipe(response);
});

const port = await pickPort(preferredPort);

server.listen(port, "127.0.0.1", () => {
  console.log(`Kaiser Control Center bezi na http://127.0.0.1:${port}/`);
});
