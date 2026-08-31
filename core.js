export const LEGACY_DECK_NAMES = Object.freeze(["main", "skipped", "gotIt"]);
export const RATINGS = Object.freeze(["again", "hard", "good", "easy"]);
export const MASTERY_STATES = Object.freeze(["new", "needsWork", "known"]);
export const DEFAULT_DECK_ID = "main";

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const BACKUP_FORMAT = "flipcard-backup";

export function createEmptyLegacyDecks() {
  return { main: [], skipped: [], gotIt: [] };
}

export function createCard(question, answer, idFactory = defaultIdFactory, now = new Date()) {
  const q = String(question ?? "").trim();
  const a = String(answer ?? "").trim();
  if (!q || !a) throw new Error("A card requires both a question and an answer.");

  const timestamp = validDate(now).toISOString();
  return {
    id: idFactory(),
    q,
    a,
    createdAt: timestamp,
    updatedAt: timestamp,
    mastery: "new",
    review: createReviewState(timestamp),
  };
}

export function createDeck(name, idFactory = defaultIdFactory, now = new Date()) {
  const normalizedName = String(name ?? "").trim();
  if (!normalizedName) throw new Error("A deck requires a name.");
  return {
    id: idFactory(),
    name: normalizedName.slice(0, 80),
    createdAt: validDate(now).toISOString(),
    cards: [],
  };
}

export function createInitialState(now = new Date()) {
  const timestamp = validDate(now).toISOString();
  return {
    version: 2,
    decks: [{ id: DEFAULT_DECK_ID, name: "Main Deck", createdAt: timestamp, cards: [] }],
    reviewLog: [],
  };
}

export function normalizeStudyState(value, now = new Date()) {
  if (!value || typeof value !== "object" || value.version !== 2 || !Array.isArray(value.decks)) {
    return createInitialState(now);
  }

  const timestamp = validDate(now).toISOString();
  const seenDeckIds = new Set();
  const decks = [];

  for (const sourceDeck of value.decks) {
    if (!sourceDeck || typeof sourceDeck !== "object" || !Array.isArray(sourceDeck.cards)) continue;
    const name = typeof sourceDeck.name === "string" ? sourceDeck.name.trim().slice(0, 80) : "";
    if (!name) continue;

    let id = cleanId(sourceDeck.id) || defaultIdFactory();
    while (seenDeckIds.has(id)) id = defaultIdFactory();
    seenDeckIds.add(id);

    const seenCardIds = new Set();
    const cards = [];
    for (const sourceCard of sourceDeck.cards) {
      const card = normalizeCard(sourceCard, now);
      if (!card || seenCardIds.has(card.id)) continue;
      seenCardIds.add(card.id);
      cards.push(card);
    }

    decks.push({
      id,
      name,
      createdAt: validIso(sourceDeck.createdAt, timestamp),
      cards,
    });
  }

  if (decks.length === 0) return createInitialState(now);
  const reviewLog = Array.isArray(value.reviewLog)
    ? value.reviewLog.map(normalizeReviewLogEntry).filter(Boolean).slice(-5000)
    : [];
  return { version: 2, decks, reviewLog };
}

export function migrateLegacyDecks(value, now = new Date()) {
  const legacy = normalizeLegacyDecks(value);
  const state = createInitialState(now);
  const deck = state.decks[0];
  const cardsById = new Map();

  for (const sourceCard of legacy.main) {
    const card = normalizeCard(sourceCard, now);
    if (card) cardsById.set(card.id, card);
  }
  for (const sourceCard of [...legacy.skipped, ...legacy.gotIt]) {
    if (cardsById.has(sourceCard.id)) continue;
    const card = normalizeCard(sourceCard, now);
    if (card) cardsById.set(card.id, card);
  }

  const skippedIds = new Set(legacy.skipped.map((card) => card.id));
  const learnedIds = new Set(legacy.gotIt.map((card) => card.id));
  const migrationDate = validDate(now);

  for (const card of cardsById.values()) {
    if (skippedIds.has(card.id)) {
      card.mastery = "needsWork";
      card.review = {
        ...card.review,
        dueAt: migrationDate.toISOString(),
        lapses: Math.max(1, card.review.lapses),
        lastRating: "again",
      };
    } else if (learnedIds.has(card.id)) {
      card.mastery = "known";
      card.review = {
        ...card.review,
        dueAt: new Date(migrationDate.getTime() + 3 * DAY_MS).toISOString(),
        intervalDays: 3,
        repetitions: Math.max(1, card.review.repetitions),
        lastRating: "good",
      };
    }
    deck.cards.push(card);
  }
  return state;
}

export function normalizeLegacyDecks(value) {
  const result = createEmptyLegacyDecks();
  if (!value || typeof value !== "object") return result;

  for (const deckName of LEGACY_DECK_NAMES) {
    if (!Array.isArray(value[deckName])) continue;
    const seenIds = new Set();
    result[deckName] = value[deckName]
      .map(normalizeLegacyCard)
      .filter(Boolean)
      .filter((card) => {
        if (seenIds.has(card.id)) return false;
        seenIds.add(card.id);
        return true;
      });
  }
  return result;
}

export function scheduleCard(card, rating, now = new Date()) {
  if (!RATINGS.includes(rating)) throw new Error("Unsupported review rating.");
  const normalized = normalizeCard(card, now);
  if (!normalized) throw new Error("Cannot schedule an invalid card.");

  const reviewedAt = validDate(now);
  const review = normalized.review;
  let intervalDays = review.intervalDays;
  let ease = review.ease;
  let repetitions = review.repetitions;
  let lapses = review.lapses;
  let dueAt;

  if (rating === "again") {
    intervalDays = 0;
    ease = clamp(ease - 0.2, 1.3, 3.2);
    repetitions = 0;
    lapses += 1;
    dueAt = new Date(reviewedAt.getTime() + 10 * MINUTE_MS);
  } else if (rating === "hard") {
    intervalDays = repetitions === 0 ? 1 : Math.max(1, Math.round(Math.max(1, intervalDays) * 1.2));
    ease = clamp(ease - 0.15, 1.3, 3.2);
    repetitions += 1;
    dueAt = new Date(reviewedAt.getTime() + intervalDays * DAY_MS);
  } else if (rating === "good") {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 3;
    else intervalDays = Math.max(1, Math.round(Math.max(1, intervalDays) * ease));
    repetitions += 1;
    dueAt = new Date(reviewedAt.getTime() + intervalDays * DAY_MS);
  } else {
    if (repetitions === 0) intervalDays = 4;
    else if (repetitions === 1) intervalDays = 7;
    else intervalDays = Math.max(2, Math.round(Math.max(1, intervalDays) * ease * 1.3));
    ease = clamp(ease + 0.15, 1.3, 3.2);
    repetitions += 1;
    dueAt = new Date(reviewedAt.getTime() + intervalDays * DAY_MS);
  }

  return {
    ...normalized,
    updatedAt: reviewedAt.toISOString(),
    mastery: rating === "again" || rating === "hard" ? "needsWork" : "known",
    review: {
      dueAt: dueAt.toISOString(),
      intervalDays,
      ease: round(ease, 2),
      repetitions,
      lapses,
      lastReviewedAt: reviewedAt.toISOString(),
      lastRating: rating,
    },
  };
}

export function recordReview(state, deckId, cardId, rating, now = new Date(), idFactory = defaultIdFactory) {
  const normalizedState = normalizeStudyState(state, now);
  const reviewedAt = validDate(now);
  let matched = false;

  const decks = normalizedState.decks.map((deck) => {
    if (deck.id !== deckId) return deck;
    const cards = deck.cards.map((card) => {
      if (card.id !== cardId) return card;
      matched = true;
      return scheduleCard(card, rating, reviewedAt);
    });
    return { ...deck, cards };
  });

  if (!matched) throw new Error("Card not found.");
  const reviewedCard = decks.find((deck) => deck.id === deckId).cards.find((card) => card.id === cardId);
  const entry = {
    id: idFactory(),
    deckId,
    cardId,
    rating,
    reviewedAt: reviewedAt.toISOString(),
    intervalDays: reviewedCard.review.intervalDays,
  };

  return {
    version: 2,
    decks,
    reviewLog: [...normalizedState.reviewLog, entry].slice(-5000),
  };
}

export function isCardDue(card, now = new Date()) {
  const dueAt = Date.parse(card?.review?.dueAt);
  return Number.isFinite(dueAt) && dueAt <= validDate(now).getTime();
}

export function getDueCards(deck, now = new Date()) {
  if (!deck || !Array.isArray(deck.cards)) return [];
  return deck.cards
    .filter((card) => isCardDue(card, now))
    .slice()
    .sort((a, b) => Date.parse(a.review.dueAt) - Date.parse(b.review.dueAt));
}

export function getStudyStats(state, now = new Date()) {
  const normalized = normalizeStudyState(state, now);
  const today = dayKey(now);
  const cards = normalized.decks.flatMap((deck) => deck.cards);
  const reviewedDays = new Set(normalized.reviewLog.map((entry) => dayKey(entry.reviewedAt)));
  let streak = 0;
  let cursor = startOfDay(now);

  while (reviewedDays.has(dayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  return {
    total: cards.length,
    due: cards.filter((card) => isCardDue(card, now)).length,
    learned: cards.filter((card) => card.mastery === "known").length,
    reviewsToday: normalized.reviewLog.filter((entry) => dayKey(entry.reviewedAt) === today).length,
    streak,
  };
}

export function getDeckStats(deck, now = new Date()) {
  const cards = Array.isArray(deck?.cards) ? deck.cards : [];
  return {
    total: cards.length,
    due: cards.filter((card) => isCardDue(card, now)).length,
    learned: cards.filter((card) => card.mastery === "known").length,
    known: cards.filter((card) => card.mastery === "known").length,
    needsWork: cards.filter((card) => card.mastery === "needsWork").length,
  };
}

export function removeCardById(cards, cardId) {
  return cards.filter((card) => card.id !== cardId);
}

export function normalizeIndex(index, length) {
  if (!Number.isInteger(length) || length <= 0) return 0;
  const parsed = Number.parseInt(index, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), length - 1);
}

export function nextIndex(index, length) {
  if (length <= 0) return 0;
  return (normalizeIndex(index, length) + 1) % length;
}

export function previousIndex(index, length) {
  if (length <= 0) return 0;
  return (normalizeIndex(index, length) - 1 + length) % length;
}

export function shuffleCards(cards, random = Math.random) {
  const shuffled = cards.map((card) => ({ ...card, review: { ...card.review } }));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function deckToCsv(cards) {
  const rows = [["Question", "Answer"]];
  for (const card of cards) rows.push([card.q, card.a]);
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n") + "\r\n";
}

export function parseCsv(text, idFactory = defaultIdFactory, now = new Date()) {
  const rows = parseCsvRows(String(text ?? "").replace(/^\uFEFF/, ""));
  if (rows.length === 0) return [];

  const first = rows[0].map((value) => value.trim().toLowerCase());
  const hasHeader = first[0] === "question" && first[1] === "answer";
  const cards = [];
  for (const row of rows.slice(hasHeader ? 1 : 0)) {
    if (row.length < 2) continue;
    const question = row[0].trim();
    const answer = row[1].trim();
    if (!question || !answer) continue;
    cards.push(createCard(question, answer, idFactory, now));
  }
  return cards;
}

export function createJsonBackup(state, language = "en", activeDeckId = DEFAULT_DECK_ID, now = new Date()) {
  const normalized = normalizeStudyState(state, now);
  const selectedDeck = normalized.decks.some((deck) => deck.id === activeDeckId)
    ? activeDeckId
    : normalized.decks[0].id;

  return JSON.stringify(
    {
      format: BACKUP_FORMAT,
      version: 2,
      exportedAt: validDate(now).toISOString(),
      language,
      activeDeckId: selectedDeck,
      state: normalized,
    },
    null,
    2,
  );
}

export function parseJsonBackup(text, now = new Date()) {
  const parsed = JSON.parse(String(text ?? ""));
  if (!parsed || parsed.format !== BACKUP_FORMAT) throw new Error("Unsupported Flipcard backup format.");

  if (parsed.version === 2) {
    const state = normalizeStudyState(parsed.state, now);
    const totalCards = state.decks.reduce((total, deck) => total + deck.cards.length, 0);
    if (totalCards === 0) throw new Error("The backup contains no valid cards.");
    return {
      state,
      language: normalizeLanguage(parsed.language),
      activeDeckId: state.decks.some((deck) => deck.id === parsed.activeDeckId)
        ? parsed.activeDeckId
        : state.decks[0].id,
    };
  }

  if (parsed.version === 1) {
    const state = migrateLegacyDecks(parsed.decks, now);
    if (state.decks[0].cards.length === 0) throw new Error("The backup contains no valid cards.");
    return { state, language: normalizeLanguage(parsed.language), activeDeckId: DEFAULT_DECK_ID };
  }

  throw new Error("Unsupported Flipcard backup format.");
}

function createReviewState(dueAt) {
  return {
    dueAt,
    intervalDays: 0,
    ease: 2.5,
    repetitions: 0,
    lapses: 0,
    lastReviewedAt: null,
    lastRating: null,
  };
}

function normalizeCard(card, now) {
  if (!card || typeof card !== "object") return null;
  const q = typeof card.q === "string" ? card.q.trim() : "";
  const a = typeof card.a === "string" ? card.a.trim() : "";
  if (!q || !a) return null;

  const timestamp = validDate(now).toISOString();
  const id = cleanId(card.id) || defaultIdFactory();
  const review = card.review && typeof card.review === "object" ? card.review : {};
  const rating = RATINGS.includes(review.lastRating) ? review.lastRating : null;
  return {
    id,
    q,
    a,
    createdAt: validIso(card.createdAt, timestamp),
    updatedAt: validIso(card.updatedAt, timestamp),
    mastery: MASTERY_STATES.includes(card.mastery) ? card.mastery : "new",
    review: {
      dueAt: validIso(review.dueAt, timestamp),
      intervalDays: nonNegativeInteger(review.intervalDays),
      ease: round(clamp(finiteNumber(review.ease, 2.5), 1.3, 3.2), 2),
      repetitions: nonNegativeInteger(review.repetitions),
      lapses: nonNegativeInteger(review.lapses),
      lastReviewedAt: review.lastReviewedAt ? validIso(review.lastReviewedAt, null) : null,
      lastRating: rating,
    },
  };
}

function normalizeLegacyCard(card) {
  if (!card || typeof card !== "object") return null;
  const q = typeof card.q === "string" ? card.q.trim() : "";
  const a = typeof card.a === "string" ? card.a.trim() : "";
  if (!q || !a) return null;
  return { id: cleanId(card.id) || defaultIdFactory(), q, a };
}

function normalizeReviewLogEntry(entry) {
  if (!entry || typeof entry !== "object" || !RATINGS.includes(entry.rating)) return null;
  const id = cleanId(entry.id);
  const deckId = cleanId(entry.deckId);
  const cardId = cleanId(entry.cardId);
  const reviewedAt = validIso(entry.reviewedAt, null);
  if (!id || !deckId || !cardId || !reviewedAt) return null;
  return {
    id,
    deckId,
    cardId,
    rating: entry.rating,
    reviewedAt,
    intervalDays: nonNegativeInteger(entry.intervalDays),
  };
}

function normalizeLanguage(language) {
  return ["en", "id", "ja"].includes(language) ? language : "en";
}

function defaultIdFactory() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function cleanId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function validDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function validIso(value, fallback) {
  if (value === null && fallback === null) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
}

function finiteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nonNegativeInteger(value) {
  return Math.max(0, Math.floor(finiteNumber(value, 0)));
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value, places) {
  const multiplier = 10 ** places;
  return Math.round(value * multiplier) / multiplier;
}

function dayKey(value) {
  const date = validDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(value) {
  const date = validDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function escapeCsvField(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}
