import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateQuestions, SECTION_LABELS } from "../core.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const questions = JSON.parse(fs.readFileSync(path.join(root, "questions.json"), "utf8"));
const result = validateQuestions(questions);
const imageDir = path.join(root, "assets", "questions");
const referenced = new Set(questions.map(q => q.image).filter(Boolean));
const files = fs.readdirSync(imageDir).filter(name => /\.jpg$/i.test(name));
for (const image of referenced) {
  if (!fs.existsSync(path.join(root, image))) throw new Error("Missing image: " + image);
  if (fs.statSync(path.join(root, image)).size < 1000) throw new Error("Empty or corrupt image: " + image);
}
for (const file of files) {
  if (!referenced.has("assets/questions/" + file)) throw new Error("Orphan image: " + file);
}
const counts = SECTION_LABELS.map(section => questions.filter(q => q.section === section).length);
if (counts.join(",") !== "75,91,38,24,83,59,9") throw new Error("Section counts changed: " + counts);
if (result.imageQuestions !== 71 || result.uniqueImages !== 24 || files.length !== 24) throw new Error("Image counts changed");
if (questions.some((q, index) => q.id !== index + 1)) throw new Error("IDs are not 1–379 in order");
console.log(JSON.stringify({ ...result, ids: "1–379 complete", threeChoices: true, correctIndices: "all 0–2", imagesExist: true, orphanImages: 0, sectionCounts: counts }));
