import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFurigana } from '../furigana-v2.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const questions = read('questions.json');
const data = read('furigana.json');
const imageData = read('image-furigana.json');
const uiSeeds = read('scripts/furigana-ui-seeds.json');
const result = validateFurigana(questions, data);

for (const text of uiSeeds) {
  if (!Object.hasOwn(data.texts, text)) throw new Error('Missing UI furigana: ' + text);
}
const referenced = new Set(questions.map(q => q.image?.split('/').at(-1)).filter(Boolean));
let imageLabels = 0;
for (const [name, info] of Object.entries(imageData)) {
  if (!referenced.has(name)) throw new Error('Unreferenced image annotation: ' + name);
  if (!Number.isInteger(info.width) || !Number.isInteger(info.height) || info.width < 1 || info.height < 1) throw new Error('Invalid image dimensions: ' + name);
  for (const [x, y, reading, small] of info.labels) {
    if (![x, y].every(value => Number.isFinite(value) && value >= 0 && value <= 1)
      || !/^[\u3040-\u309fー]+$/u.test(reading) || ![0, 1].includes(small)) throw new Error('Invalid image reading: ' + name);
    imageLabels++;
  }
}
if (questions.length !== 379 || referenced.size !== 24 || Object.keys(imageData).length !== 5 || imageLabels !== 102) {
  throw new Error('Question/image counts changed');
}
console.log(JSON.stringify({ questions: questions.length, uniqueImages: referenced.size,
  annotatedImages: Object.keys(imageData).length, imageLabels, uiSeeds: uiSeeds.length, ...result }));
