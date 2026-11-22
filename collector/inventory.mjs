import { execFileSync } from "node:child_process";
import { openSync, readSync, closeSync } from "node:fs";
import { extname, join } from "node:path";
import { imageSize } from "image-size";

const extensions = {
  images: ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "ico", "bmp"],
  fonts: ["woff", "woff2", "ttf", "otf"],
  media: ["mp4", "mov", "webm", "mp3", "ogg", "wav"],
  scripts: ["js", "mjs", "cjs"],
  styles: ["css"],
};
export function category(path) {
  const ext = extname(path).slice(1).toLowerCase();
  return Object.keys(extensions).find((key) => extensions[key].includes(ext)) ?? "other";
}
function dimensions(path) {
  let fd;
  try {
    fd = openSync(path, "r");
    const data = Buffer.alloc(128 * 1024);
    const n = readSync(fd, data, 0, data.length, 0);
    const { width, height } = imageSize(data.subarray(0, n));
    return { width, height };
  } catch {
    return {};
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
export function inventory(dir, sizes = new Map()) {
  const tree = execFileSync("git", ["ls-tree", "-rlz", "HEAD"], {
    cwd: dir,
    maxBuffer: 128 * 1024 * 1024,
  }).toString();
  const groups = new Map(),
    copies = new Map(),
    assets = [];
  let bytes = 0;
  for (const row of tree.split("\0")) {
    const match = /^100[0-7]{3} blob ([a-f0-9]+)\s+(\d+)\t([\s\S]+)$/.exec(row);
    if (!match) continue;
    const [, hash, length, path] = match;
    const size = Number(length),
      kind = category(path);
    const group = groups.get(kind) ?? { category: kind, bytes: 0, files: 0 };
    group.bytes += size;
    group.files++;
    groups.set(kind, group);
    sizes.set(path, size);
    bytes += size;
    assets.push({ path, bytes: size });
    if (!size) continue;
    const duplicate = copies.get(hash) ?? { paths: [], copies: 0, redundantBytes: 0 };
    if (duplicate.copies++) duplicate.redundantBytes += size;
    if (duplicate.paths.length < 5) duplicate.paths.push(path.slice(0, 1024));
    copies.set(hash, duplicate);
  }
  return {
    files: assets.length,
    bytes,
    groups: [...groups.values()],
    largest: assets
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 12)
      .map((a) => ({
        ...a,
        ...(category(a.path) === "images" ? dimensions(join(dir, a.path)) : {}),
        path: a.path.slice(0, 1024),
      })),
    duplicates: [...copies.values()]
      .filter((d) => d.copies > 1)
      .sort((a, b) => b.redundantBytes - a.redundantBytes)
      .slice(0, 8),
  };
}

export function largestChanges(base, head) {
  return Array.from(new Set([...base.keys(), ...head.keys()]), (path) => ({
    path: path.slice(0, 1024),
    before: base.get(path) ?? 0,
    after: head.get(path) ?? 0,
  }))
    .filter((f) => f.before !== f.after)
    .sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before))
    .slice(0, 12);
}
