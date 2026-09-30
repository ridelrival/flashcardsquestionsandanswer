import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prefix = "/flashcardsquestionsandanswer/";
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg" };
http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/") { res.writeHead(302, { Location: prefix }); res.end(); return; }
  if (!pathname.startsWith(prefix)) { res.writeHead(404); res.end(); return; }
  const relative = pathname.slice(prefix.length) || "index.html";
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  const extension = path.extname(file);
  res.setHeader("Content-Type", (types[extension] || "application/octet-stream") + ([".html", ".css", ".js", ".json"].includes(extension) ? "; charset=utf-8" : ""));
  fs.createReadStream(file).pipe(res);
}).listen(4173, "127.0.0.1", () => console.log("http://127.0.0.1:4173" + prefix));
