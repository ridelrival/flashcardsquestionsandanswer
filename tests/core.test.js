import test from "node:test";
import assert from "node:assert/strict";

import {
  createCard,
  createDeck,
  createInitialState,
  createJsonBackup,
  deckToCsv,
  getDueCards,
  getStudyStats,
  migrateLegacyDecks,
  nextIndex,
  normalizeIndex,
  normalizeStudyState,
  parseCsv,
  parseJsonBackup,
  previousIndex,
  recordReview,
  scheduleCard,
  shuffleCards,
} from "../core.js";

const NOW = new Date("2026-08-19T12:00:00.000Z");

test("createCard builds a due-now Phase 2 card and validates both sides", () => {
  const card = createCard("  Capital of Japan? ", " Tokyo ", () => "card-1", NOW);
  assert.equal(card.q, "Capital of Japan?");
  assert.equal(card.a, "Tokyo");
  assert.equal(card.review.dueAt, NOW.toISOString());
  assert.equal(card.review.ease, 2.5);
  assert.equal(card.review.repetitions, 0);
  assert.equal(card.mastery, "new");
  assert.throws(() => createCard("", "Tokyo"), /requires both/);
});

test("createDeck trims its name and starts empty", () => {
  assert.deepEqual(createDeck("  Biology  ", () => "deck-1", NOW), {
    id: "deck-1",
    name: "Biology",
    createdAt: NOW.toISOString(),
    cards: [],
  });
  assert.throws(() => createDeck("  "), /requires a name/);
});

test("normalizeStudyState keeps valid data and removes duplicate cards", () => {
  const state = normalizeStudyState(
    {
      version: 2,
      decks: [
        {
          id: "deck",
          name: " Test ",
          cards: [
            { id: "one", q: " One? ", a: " 1 " },
            { id: "one", q: "Duplicate?", a: "Duplicate" },
            { id: "bad", q: "", a: "Missing" },
          ],
        },
      ],
      reviewLog: [{ rating: "invalid" }],
    },
    NOW,
  );

  assert.equal(state.decks[0].name, "Test");
  assert.equal(state.decks[0].cards.length, 1);
  assert.equal(state.decks[0].cards[0].review.dueAt, NOW.toISOString());
  assert.deepEqual(state.reviewLog, []);
});

test("legacy Phase 1 decks migrate without duplicate cards", () => {
  const state = migrateLegacyDecks(
    {
      main: [
        { id: "again", q: "Hard?", a: "Yes" },
        { id: "known", q: "Known?", a: "Yes" },
      ],
      skipped: [{ id: "again", q: "Hard?", a: "Yes" }],
      gotIt: [{ id: "known", q: "Known?", a: "Yes" }],
    },
    NOW,
  );

  assert.equal(state.decks.length, 1);
  assert.equal(state.decks[0].cards.length, 2);
  const again = state.decks[0].cards.find((card) => card.id === "again");
  const known = state.decks[0].cards.find((card) => card.id === "known");
  assert.equal(again.review.lapses, 1);
  assert.equal(again.mastery, "needsWork");
  assert.equal(again.review.dueAt, NOW.toISOString());
  assert.equal(known.review.repetitions, 1);
  assert.equal(known.mastery, "known");
  assert.equal(known.review.intervalDays, 3);
  assert.equal(known.review.dueAt, "2026-08-22T12:00:00.000Z");
});

test("Again schedules a ten-minute relearning step", () => {
  const card = createCard("Q", "A", () => "one", NOW);
  const scheduled = scheduleCard(card, "again", NOW);
  assert.equal(scheduled.review.dueAt, "2026-08-19T12:10:00.000Z");
  assert.equal(scheduled.review.intervalDays, 0);
  assert.equal(scheduled.review.repetitions, 0);
  assert.equal(scheduled.review.lapses, 1);
  assert.equal(scheduled.review.ease, 2.3);
  assert.equal(scheduled.mastery, "needsWork");
});

test("Hard, Good, and Easy create progressively longer first intervals", () => {
  const card = createCard("Q", "A", () => "one", NOW);
  assert.equal(scheduleCard(card, "hard", NOW).review.intervalDays, 1);
  assert.equal(scheduleCard(card, "good", NOW).review.intervalDays, 1);
  assert.equal(scheduleCard(card, "easy", NOW).review.intervalDays, 4);
  assert.equal(scheduleCard(card, "easy", NOW).review.ease, 2.65);
  assert.equal(scheduleCard(card, "good", NOW).mastery, "known");
});

test("Good reviews grow from one day to three days and then by ease", () => {
  let card = createCard("Q", "A", () => "one", NOW);
  card = scheduleCard(card, "good", NOW);
  assert.equal(card.review.intervalDays, 1);
  card = scheduleCard(card, "good", new Date("2026-08-20T12:00:00.000Z"));
  assert.equal(card.review.intervalDays, 3);
  card = scheduleCard(card, "good", new Date("2026-08-23T12:00:00.000Z"));
  assert.equal(card.review.intervalDays, 8);
});

test("recordReview updates the card and appends history", () => {
  const state = createInitialState(NOW);
  state.decks[0].cards.push(createCard("Q", "A", () => "card", NOW));
  const reviewed = recordReview(state, "main", "card", "good", NOW, () => "log");
  assert.equal(reviewed.decks[0].cards[0].review.repetitions, 1);
  assert.deepEqual(reviewed.reviewLog[0], {
    id: "log",
    deckId: "main",
    cardId: "card",
    rating: "good",
    reviewedAt: NOW.toISOString(),
    intervalDays: 1,
  });
});

test("due queue and study statistics reflect scheduling history", () => {
  let state = createInitialState(NOW);
  state.decks[0].cards.push(createCard("Q1", "A1", () => "one", NOW));
  state.decks[0].cards.push(createCard("Q2", "A2", () => "two", NOW));
  state = recordReview(state, "main", "one", "good", NOW, () => "today");
  state.reviewLog.unshift({
    id: "yesterday",
    deckId: "main",
    cardId: "one",
    rating: "good",
    reviewedAt: "2026-08-18T12:00:00.000Z",
    intervalDays: 1,
  });

  assert.deepEqual(getDueCards(state.decks[0], NOW).map((card) => card.id), ["two"]);
  assert.deepEqual(getStudyStats(state, NOW), {
    total: 2,
    due: 1,
    learned: 1,
    reviewsToday: 1,
    streak: 2,
  });
});

test("index helpers clamp and wrap safely", () => {
  assert.equal(normalizeIndex(8, 3), 2);
  assert.equal(normalizeIndex(-2, 3), 0);
  assert.equal(nextIndex(2, 3), 0);
  assert.equal(previousIndex(0, 3), 2);
  assert.equal(nextIndex(0, 0), 0);
});

test("shuffleCards is deterministic with injected randomness and does not mutate", () => {
  const original = [
    createCard("A", "1", () => "a", NOW),
    createCard("B", "2", () => "b", NOW),
    createCard("C", "3", () => "c", NOW),
  ];
  const values = [0, 0];
  const shuffled = shuffleCards(original, () => values.shift());
  assert.deepEqual(shuffled.map((card) => card.id), ["b", "c", "a"]);
  assert.deepEqual(original.map((card) => card.id), ["a", "b", "c"]);
  assert.notEqual(shuffled[0], original[1]);
});

test("CSV round-trip preserves commas, quotes, and multiline text", () => {
  const cards = [
    createCard("Hello, world?", 'She said "yes".', () => "one", NOW),
    createCard("Line one\nLine two", "Answer\ncontinued", () => "two", NOW),
  ];
  let id = 0;
  const imported = parseCsv(deckToCsv(cards), () => `imported-${++id}`, NOW);
  assert.deepEqual(
    imported.map(({ q, a }) => ({ q, a })),
    cards.map(({ q, a }) => ({ q, a })),
  );
});

test("Phase 2 JSON backups preserve decks, scheduling, history, and selection", () => {
  let state = createInitialState(NOW);
  state.decks[0].cards.push(createCard("Q", "A", () => "card", NOW));
  state = recordReview(state, "main", "card", "easy", NOW, () => "log");
  const backup = createJsonBackup(state, "id", "main", NOW);
  const restored = parseJsonBackup(backup, NOW);
  assert.equal(restored.language, "id");
  assert.equal(restored.activeDeckId, "main");
  assert.equal(restored.state.decks[0].cards[0].review.intervalDays, 4);
  assert.equal(restored.state.reviewLog.length, 1);
});

test("Phase 1 JSON backups import through the migration path", () => {
  const backup = JSON.stringify({
    format: "flipcard-backup",
    version: 1,
    language: "ja",
    decks: { main: [{ id: "one", q: "Q", a: "A" }], skipped: [], gotIt: [] },
  });
  const restored = parseJsonBackup(backup, NOW);
  assert.equal(restored.language, "ja");
  assert.equal(restored.state.decks[0].cards.length, 1);
  assert.equal(restored.state.decks[0].cards[0].review.dueAt, NOW.toISOString());
});
