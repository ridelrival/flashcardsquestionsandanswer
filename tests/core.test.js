import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { initialState, normalizeState, orderedChoices, progressStats, recordStudyAnswer, scoreExam, selectExamQuestions, validateQuestions } from "../core-v2.js";

const questions = JSON.parse(fs.readFileSync(new URL("../questions.json", import.meta.url), "utf8"));
const byId = new Map(questions.map(q => [q.id, q]));

test("master database has all 379 questions and valid image mapping", () => {
  assert.deepEqual(validateQuestions(questions), { total: 379, imageQuestions: 71, uniqueImages: 24 });
});
test("study answers lock, and review retains ever-wrong statistics", () => {
  const state = initialState(), q = questions[0];
  const wrong = (q.correctIndex + 1) % 3;
  assert.equal(recordStudyAnswer(state, q, wrong), true);
  assert.equal(recordStudyAnswer(state, q, q.correctIndex), false);
  assert.equal(recordStudyAnswer(state, q, q.correctIndex, true), true);
  assert.deepEqual([state.progress[1].attemptCount, state.progress[1].correctCount, state.progress[1].wrongCount], [2, 1, 1]);
  assert.equal(progressStats(state).everWrong, 1);
  assert.equal(progressStats(state).correct, 1);
});
test("choice shuffle preserves the original correct answer", () => {
  for (const q of questions) {
    const choices = orderedChoices(q, true, 734);
    assert.deepEqual(new Set(choices.map(c => c.originalIndex)), new Set([0, 1, 2]));
    assert.equal(choices.find(c => c.originalIndex === q.correctIndex).text, q.choices[q.correctIndex]);
  }
});
test("exam selects 25+5 theory and 6+4 practical questions without duplicates", () => {
  const ids = selectExamQuestions(questions, () => 0.41);
  assert.equal(ids.length, 40);
  assert.equal(new Set(ids).size, 40);
  assert.equal(ids.filter(id => id <= 228).length, 25);
  assert.equal(ids.filter(id => id >= 229 && id <= 311).length, 5);
  assert.equal(ids.filter(id => (id >= 312 && id <= 348) || id >= 371).length, 6);
  assert.equal(ids.filter(id => id >= 349 && id <= 370).length, 4);
  const exam = { questionIds: ids, answers: Object.fromEntries(ids.slice(0, 10).map(id => [id, byId.get(id).correctIndex])) };
  assert.equal(scoreExam(exam, byId).correct, 10);
  assert.equal(scoreExam(exam, byId).wrong, 30);
});
test("backup normalization keeps progress by ID across question data versions", () => {
  const state = initialState();
  state.questionDataVersion = 0;
  state.progress[379] = { attemptCount: 1, correctCount: 0, wrongCount: 1, lastAnswer: 2, lastResult: "wrong", bookmarked: true };
  const loaded = normalizeState(JSON.parse(JSON.stringify(state)));
  assert.equal(loaded.questionDataVersion, 1);
  assert.equal(loaded.progress[379].wrongCount, 1);
  assert.equal(loaded.progress[379].bookmarked, true);
});
