export const QUESTION_DATA_VERSION = 1;
export const STORAGE_VERSION = 1;
export const EXAM_LENGTH = 40;
export const EXAM_MINUTES = 70;
export const SECTION_LABELS = [
  "第1部　食品安全・品質管理（危害要因・食中毒を含む）",
  "第2部　一般衛生管理（作業者・原材料・保管を含む）",
  "第3部　製造工程管理",
  "第4部　HACCPによる衛生管理",
  "第5部　労働安全衛生",
  "第6部　実技・判断問題",
  "第7部　実技・計画立案問題",
];

export function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length !== 379) throw new Error("Expected exactly 379 questions");
  const ids = new Set();
  for (const q of questions) {
    if (!Number.isInteger(q.id) || q.id < 1 || q.id > 379 || ids.has(q.id)) throw new Error(`Invalid or duplicate question ID: ${q.id}`);
    ids.add(q.id);
    if (!SECTION_LABELS.includes(q.section)) throw new Error(`Invalid section on question ${q.id}`);
    if (typeof q.question !== "string" || !q.question.trim() || /[�□]/u.test(q.question)) throw new Error(`Invalid question ${q.id}`);
    if (!Array.isArray(q.choices) || q.choices.length !== 3 || q.choices.some(c => typeof c !== "string" || !c.trim() || /[�□]/u.test(c))) throw new Error(`Invalid choices on question ${q.id}`);
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 2) throw new Error(`Invalid answer on question ${q.id}`);
    if (q.image !== null && (typeof q.image !== "string" || !/^assets\/questions\/page-\d+\.jpg$/.test(q.image))) throw new Error(`Invalid image on question ${q.id}`);
  }
  return { total: ids.size, imageQuestions: questions.filter(q => q.image).length, uniqueImages: new Set(questions.map(q => q.image).filter(Boolean)).size };
}

export function initialState() {
  return {
    storageVersion: STORAGE_VERSION, questionDataVersion: QUESTION_DATA_VERSION,
    progress: {},
    settings: { theme: "light", showFurigana: true, shuffleQuestions: false, shuffleChoices: false, autoNext: false, choiceSeed: Math.floor(Math.random() * 2147483647) },
    currentQuestionId: 1, filter: "all", sectionFilter: "all", randomOrder: [], examHistory: [], activeExam: null,
  };
}

const nonnegative = value => Number.isInteger(value) && value >= 0 ? value : 0;
export function normalizeState(input) {
  const base = initialState();
  if (!input || typeof input !== "object") return base;
  const progress = {};
  for (const [key, value] of Object.entries(input.progress || {})) {
    const id = Number(key);
    if (!Number.isInteger(id) || id < 1 || id > 379 || !value || typeof value !== "object") continue;
    const correctCount = nonnegative(value.correctCount), wrongCount = nonnegative(value.wrongCount);
    progress[id] = {
      attemptCount: Math.max(nonnegative(value.attemptCount), correctCount + wrongCount),
      correctCount, wrongCount,
      lastAnswer: Number.isInteger(value.lastAnswer) && value.lastAnswer >= 0 && value.lastAnswer <= 2 ? value.lastAnswer : null,
      lastResult: ["correct", "wrong"].includes(value.lastResult) ? value.lastResult : null,
      bookmarked: Boolean(value.bookmarked),
    };
  }
  const s = input.settings || {};
  return {
    ...base, progress,
    settings: {
      theme: ["light", "dark", "system"].includes(s.theme) ? s.theme : "light",
      showFurigana: typeof s.showFurigana === "boolean" ? s.showFurigana : true,
      shuffleQuestions: Boolean(s.shuffleQuestions), shuffleChoices: Boolean(s.shuffleChoices),
      autoNext: Boolean(s.autoNext),
      choiceSeed: Number.isInteger(s.choiceSeed) ? s.choiceSeed : base.settings.choiceSeed,
    },
    currentQuestionId: Number.isInteger(input.currentQuestionId) && input.currentQuestionId >= 1 && input.currentQuestionId <= 379 ? input.currentQuestionId : 1,
    filter: ["all", "wrong", "unanswered", "bookmarked", "random"].includes(input.filter) ? input.filter : "all",
    sectionFilter: SECTION_LABELS.includes(input.sectionFilter) ? input.sectionFilter : "all",
    randomOrder: Array.isArray(input.randomOrder) ? [...new Set(input.randomOrder.filter(id => Number.isInteger(id) && id >= 1 && id <= 379))] : [],
    examHistory: Array.isArray(input.examHistory) ? input.examHistory.filter(exam => exam && Array.isArray(exam.questionIds) && exam.questionIds.length === 40).slice(-100) : [],
    activeExam: validActiveExam(input.activeExam) ? input.activeExam : null,
  };
}
function validActiveExam(exam) {
  return exam && Array.isArray(exam.questionIds) && exam.questionIds.length === 40 &&
    new Set(exam.questionIds).size === 40 && exam.questionIds.every(id => Number.isInteger(id) && id >= 1 && id <= 379) &&
    Number.isFinite(exam.deadline) && exam.answers && typeof exam.answers === "object";
}

export function recordStudyAnswer(state, question, originalIndex, retry = false) {
  if (!Number.isInteger(originalIndex) || originalIndex < 0 || originalIndex > 2) throw new Error("Invalid choice");
  const prior = state.progress[question.id] || { attemptCount: 0, correctCount: 0, wrongCount: 0, lastAnswer: null, lastResult: null, bookmarked: false };
  if (prior.lastResult && !retry) return false;
  const correct = originalIndex === question.correctIndex;
  state.progress[question.id] = {
    ...prior, attemptCount: prior.attemptCount + 1,
    correctCount: prior.correctCount + Number(correct), wrongCount: prior.wrongCount + Number(!correct),
    lastAnswer: originalIndex, lastResult: correct ? "correct" : "wrong",
  };
  return true;
}

export function progressStats(state) {
  const values = Object.values(state.progress);
  const answered = values.filter(p => p.attemptCount > 0).length;
  const correct = values.filter(p => p.lastResult === "correct").length;
  const wrong = values.filter(p => p.lastResult === "wrong").length;
  return { total: 379, answered, unanswered: 379 - answered, correct, wrong,
    bookmarked: values.filter(p => p.bookmarked).length, everWrong: values.filter(p => p.wrongCount > 0).length,
    accuracy: answered ? Math.round(correct / answered * 1000) / 10 : 0 };
}

export function filterQuestions(questions, state) {
  let list = questions.filter(q => state.sectionFilter === "all" || q.section === state.sectionFilter);
  if (state.filter === "wrong") list = list.filter(q => state.progress[q.id]?.wrongCount > 0);
  if (state.filter === "unanswered") list = list.filter(q => !state.progress[q.id]?.attemptCount);
  if (state.filter === "bookmarked") list = list.filter(q => state.progress[q.id]?.bookmarked);
  if (state.filter === "random" || state.settings.shuffleQuestions) {
    const order = new Map(state.randomOrder.map((id, i) => [id, i]));
    list = [...list].sort((a, b) => (order.get(a.id) ?? 9999 + a.id) - (order.get(b.id) ?? 9999 + b.id));
  }
  return list;
}

export function shuffled(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function orderedChoices(question, shuffle, seed) {
  const result = question.choices.map((text, originalIndex) => ({ text, originalIndex }));
  if (!shuffle) return result;
  let x = (seed ^ Math.imul(question.id, 2654435761)) >>> 0;
  const random = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
  return shuffled(result, random);
}
export function selectExamQuestions(questions, random = Math.random) {
  const pools = [
    [q => q.id <= 228, 25],
    [q => q.id >= 229 && q.id <= 311, 5],
    [q => (q.id >= 312 && q.id <= 348) || (q.id >= 371 && q.id <= 379), 6],
    [q => q.id >= 349 && q.id <= 370, 4],
  ];
  return shuffled(pools.flatMap(([predicate, count]) => {
    const pool = questions.filter(predicate);
    if (pool.length < count) throw new Error("Insufficient questions for exam distribution");
    return shuffled(pool, random).slice(0, count).map(q => q.id);
  }), random);
}
export function scoreExam(exam, questionsById) {
  const review = exam.questionIds.map(id => {
    const question = questionsById.get(id), raw = exam.answers[id];
    const answer = Number.isInteger(raw) && raw >= 0 && raw <= 2 ? raw : null;
    return { id, answer, correctIndex: question.correctIndex, correct: answer === question.correctIndex };
  });
  const correct = review.filter(item => item.correct).length;
  return { correct, wrong: 40 - correct, accuracy: Math.round(correct / 40 * 1000) / 10, review };
}
