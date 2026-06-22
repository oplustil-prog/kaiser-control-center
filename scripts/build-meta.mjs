import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function gitValue(root, args) {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd: root });
    return stdout.trim();
  } catch {
    return "";
  }
}

function clean(value) {
  return String(value || "").trim();
}

function shortCommit(value) {
  const commit = clean(value);
  return commit ? commit.slice(0, 7) : "";
}

export async function resolveBuildMeta(root, env = process.env) {
  const branch = clean(env.VITE_APP_BRANCH)
    || clean(env.CF_PAGES_BRANCH)
    || clean(env.GITHUB_REF_NAME)
    || await gitValue(root, ["rev-parse", "--abbrev-ref", "HEAD"]);

  const commit = clean(env.VITE_APP_COMMIT)
    || clean(env.CF_PAGES_COMMIT_SHA)
    || clean(env.GITHUB_SHA)
    || await gitValue(root, ["rev-parse", "--short", "HEAD"]);

  const backupDate = clean(env.VITE_BACKUP_DATE)
    || await gitValue(root, ["show", "-s", "--format=%cd", "--date=format:%Y-%m-%d %H:%M", "HEAD"]);

  return {
    version: clean(env.VITE_APP_VERSION),
    branch,
    commit: shortCommit(commit),
    backupDate
  };
}

export function buildMetaModuleSource(meta) {
  return `export const buildMeta = ${JSON.stringify(meta, null, 2)};\n`;
}
