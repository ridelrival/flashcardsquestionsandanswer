import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
execFileSync(process.execPath, [path.join(root, "scripts", "validate-data.mjs")], { stdio: "inherit" });
const out = path.join(root, "dist");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const name of ["index.html", "styles.css", "app.js", "core.js", "storage.js", "sw.js", "manifest.json", "icon-v2.png", "questions.json"]) {
  fs.copyFileSync(path.join(root, name), path.join(out, name));
}
fs.cpSync(path.join(root, "assets"), path.join(out, "assets"), { recursive: true });
fs.writeFileSync(path.join(out, ".nojekyll"), "");
console.log("Production build written to dist/");
