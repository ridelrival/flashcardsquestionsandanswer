import {
  DEFAULT_DECK_ID,
  RATINGS,
  createCard,
  createDeck,
  createInitialState,
  createJsonBackup,
  deckToCsv,
  getDeckStats,
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
  removeCardById,
  scheduleCard,
  shuffleCards,
} from "./core.js";

const STORAGE = Object.freeze({
  state: "flipcard_state_v2",
  activeDeck: "flipcard_activeDeck_v2",
  currentIndex: "flipcard_currentIndex_v2",
  studyMode: "flipcard_studyMode_v2",
  language: "flipcard_lang",
});

const LEGACY_STORAGE = Object.freeze({
  decks: "flipcard_decks_v1",
  activeDeck: "flipcard_activeDeck_v1",
  currentIndex: "flipcard_currentIndex_v1",
});

const translations = {
  en: {
    pageTitle: "Flipcard Study",
    homeLabel: "Flipcard Study home",
    skipToCard: "Skip to study card",
    brandTagline: "Remember for longer",
    cardTools: "Card tools",
    updateReady: "A new version is ready.",
    updateNow: "Update now",
    studyProgress: "Study progress",
    dueNow: "Due now",
    learned: "Learned",
    reviewsToday: "Reviews today",
    dayStreak: "Day streak",
    studySession: "Study session",
    studyMode: "Study mode",
    due: "Due",
    allCards: "All cards",
    needsWork: "Needs work",
    gotIt: "Got It",
    fullScreen: "Full screen",
    exitFullScreen: "Exit full screen",
    caughtUp: "You are caught up",
    caughtUpHelp: "No cards are due in this deck right now.",
    emptyDeck: "This deck is empty",
    emptyDeckHelp: "Add a question and answer to start learning.",
    emptyFilter: "No cards in this group",
    emptyFilterHelp: "Use Skip or Got It while studying to classify cards here.",
    browseAll: "Browse all cards",
    addFirstCard: "Add a card",
    question: "Question",
    answer: "Answer",
    tapToReveal: "Tap to reveal the answer",
    chooseRating: "Choose how well you remembered",
    gestureHelp: "Tap to flip. Swipe or use Previous and Next to move.",
    revealAction: "Reveal answer",
    questionAction: "Return to question",
    focusControls: "Full-screen review controls",
    reviewControls: "Review controls",
    previous: "Previous",
    next: "Next",
    shuffle: "Shuffle",
    quickReviewControls: "Card navigation and quick review",
    skip: "Skip",
    markNeedsWork: "Mark needs work",
    markKnown: "Mark understood",
    revealBeforeRating: "Reveal the answer before rating.",
    rateAnswer: "Rate your answer",
    again: "Again",
    hard: "Hard",
    good: "Good",
    easy: "Easy",
    yourCards: "Your cards",
    decks: "Decks",
    newDeck: "New deck",
    renameDeck: "Rename",
    deleteDeck: "Delete",
    organizeCards: "Organize cards",
    deckName: "Deck name",
    deckPlaceholder: "e.g. Biology",
    createDeck: "Create deck",
    deckSummary: "{due} due · {total} cards",
    deckMastery: "✓ {known} Got It · ↺ {needsWork} Skipped",
    dueShort: "due",
    holdDeckHint: "Press and hold a deck for 250 ms to rename or delete it.",
    privateTitle: "Private by default",
    privateHelp: "Cards and review history stay in this browser.",
    newCard: "New card",
    currentCard: "Current card",
    addCardTitle: "Add card",
    editCardTitle: "Edit current card",
    deckLabel: "Deck",
    questionLabel: "Question / Statement",
    answerLabel: "Answer",
    qPlaceholder: "Enter a question or statement…",
    aPlaceholder: "Enter the answer…",
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    done: "Done",
    deleteCard: "Delete card",
    settingsTitle: "Settings",
    preferences: "Preferences",
    storageInfo: "Data saved on this device",
    storageError: "Saving failed. Export a backup before closing the app.",
    languageLabel: "Language",
    backupHeading: "Backup and restore",
    backupHelp: "JSON includes decks, scheduling, and review history.",
    backupCsv: "Export active deck CSV",
    backupJson: "Export complete backup",
    importBackup: "Import backup",
    dangerZone: "Danger zone",
    clearStorage: "Delete all saved data",
    statusNew: "New",
    statusNeedsWork: "Needs work",
    statusGotIt: "Got It",
    dueInMinutes: "Due in {count} min",
    dueInHours: "Due in {count} hr",
    dueInDays: "Due in {count} d",
    intervalMinutes: "{count}m",
    intervalDays: "{count}d",
    toastAdded: "Card added to {deck}",
    toastUpdated: "Card updated",
    toastDeleted: "Card deleted",
    toastShuffled: "Cards shuffled",
    toastRated: "Rated {rating} · next review {interval}",
    toastSkipped: "Marked Skipped · review again in 10 minutes",
    toastGotIt: "Marked Got It · next review scheduled",
    toastDeckCreated: "Deck created",
    toastDeckRenamed: "Deck renamed",
    toastDeckDeleted: "Deck deleted",
    toastImported: "Imported {count} cards",
    toastBackupRestored: "Complete Phase 2 backup restored",
    toastLegacyRestored: "Phase 1 data migrated to Phase 2",
    toastEmptyBackup: "This deck is empty",
    toastExported: "Backup downloaded",
    toastStorageCleared: "All saved data deleted",
    toastInvalidBackup: "That backup could not be imported",
    toastSaveFailed: "Changes could not be saved",
    confirmDelete: "Delete this card? This cannot be undone.",
    confirmDeleteDeck: "Delete “{deck}” and all {count} cards? This cannot be undone.",
    confirmClearAll: "Delete every deck, card, review, and preference? This cannot be undone.",
  },
  id: {
    pageTitle: "Flipcard Belajar",
    homeLabel: "Beranda Flipcard Belajar",
    skipToCard: "Lewati ke kartu belajar",
    brandTagline: "Ingat lebih lama",
    cardTools: "Alat kartu",
    updateReady: "Versi baru sudah siap.",
    updateNow: "Perbarui sekarang",
    studyProgress: "Progres belajar",
    dueNow: "Jatuh tempo",
    learned: "Dipelajari",
    reviewsToday: "Review hari ini",
    dayStreak: "Hari beruntun",
    studySession: "Sesi belajar",
    studyMode: "Mode belajar",
    due: "Jatuh tempo",
    allCards: "Semua kartu",
    needsWork: "Belum paham",
    gotIt: "Sudah Paham",
    fullScreen: "Layar penuh",
    exitFullScreen: "Keluar layar penuh",
    caughtUp: "Semua sudah selesai",
    caughtUpHelp: "Belum ada kartu yang perlu direview di deck ini.",
    emptyDeck: "Deck ini masih kosong",
    emptyDeckHelp: "Tambahkan pertanyaan dan jawaban untuk mulai belajar.",
    emptyFilter: "Belum ada kartu di kelompok ini",
    emptyFilterHelp: "Gunakan Lewati atau Sudah Paham saat belajar untuk mengelompokkan kartu.",
    browseAll: "Lihat semua kartu",
    addFirstCard: "Tambah kartu",
    question: "Pertanyaan",
    answer: "Jawaban",
    tapToReveal: "Ketuk untuk melihat jawaban",
    chooseRating: "Pilih seberapa baik Anda mengingatnya",
    gestureHelp: "Ketuk untuk membalik. Geser atau gunakan Sebelumnya dan Berikutnya.",
    revealAction: "Tampilkan jawaban",
    questionAction: "Kembali ke pertanyaan",
    focusControls: "Kontrol review layar penuh",
    reviewControls: "Kontrol review",
    previous: "Sebelumnya",
    next: "Berikutnya",
    shuffle: "Acak",
    quickReviewControls: "Navigasi kartu dan penilaian cepat",
    skip: "Lewati",
    markNeedsWork: "Tandai belum paham",
    markKnown: "Tandai sudah paham",
    revealBeforeRating: "Tampilkan jawaban sebelum memberi nilai.",
    rateAnswer: "Beri nilai jawaban Anda",
    again: "Ulangi",
    hard: "Sulit",
    good: "Baik",
    easy: "Mudah",
    yourCards: "Kartu Anda",
    decks: "Deck",
    newDeck: "Deck baru",
    renameDeck: "Ubah nama",
    deleteDeck: "Hapus",
    organizeCards: "Atur kartu",
    deckName: "Nama deck",
    deckPlaceholder: "contoh: Biologi",
    createDeck: "Buat deck",
    deckSummary: "{due} jatuh tempo · {total} kartu",
    deckMastery: "✓ {known} Sudah Paham · ↺ {needsWork} Dilewati",
    dueShort: "tempo",
    holdDeckHint: "Ketuk dan tahan deck selama 250 md untuk mengubah nama atau menghapusnya.",
    privateTitle: "Privat secara bawaan",
    privateHelp: "Kartu dan riwayat review tetap di browser ini.",
    newCard: "Kartu baru",
    currentCard: "Kartu saat ini",
    addCardTitle: "Tambah kartu",
    editCardTitle: "Edit kartu saat ini",
    deckLabel: "Deck",
    questionLabel: "Pertanyaan / Pernyataan",
    answerLabel: "Jawaban",
    qPlaceholder: "Masukkan pertanyaan atau pernyataan…",
    aPlaceholder: "Masukkan jawaban…",
    cancel: "Batal",
    save: "Simpan",
    close: "Tutup",
    done: "Selesai",
    deleteCard: "Hapus kartu",
    settingsTitle: "Pengaturan",
    preferences: "Preferensi",
    storageInfo: "Data tersimpan di perangkat ini",
    storageError: "Penyimpanan gagal. Ekspor cadangan sebelum menutup aplikasi.",
    languageLabel: "Bahasa",
    backupHeading: "Cadangkan dan pulihkan",
    backupHelp: "JSON mencakup deck, jadwal, dan riwayat review.",
    backupCsv: "Ekspor CSV deck aktif",
    backupJson: "Ekspor cadangan lengkap",
    importBackup: "Impor cadangan",
    dangerZone: "Zona berbahaya",
    clearStorage: "Hapus semua data tersimpan",
    statusNew: "Baru",
    statusNeedsWork: "Belum paham",
    statusGotIt: "Sudah Paham",
    dueInMinutes: "Tempo dalam {count} mnt",
    dueInHours: "Tempo dalam {count} jam",
    dueInDays: "Tempo dalam {count} hari",
    intervalMinutes: "{count}mnt",
    intervalDays: "{count}h",
    toastAdded: "Kartu ditambahkan ke {deck}",
    toastUpdated: "Kartu diperbarui",
    toastDeleted: "Kartu dihapus",
    toastShuffled: "Kartu diacak",
    toastRated: "Dinilai {rating} · review berikutnya {interval}",
    toastSkipped: "Ditandai Dilewati · ulangi dalam 10 menit",
    toastGotIt: "Ditandai Sudah Paham · review berikutnya dijadwalkan",
    toastDeckCreated: "Deck dibuat",
    toastDeckRenamed: "Nama deck diperbarui",
    toastDeckDeleted: "Deck dihapus",
    toastImported: "{count} kartu diimpor",
    toastBackupRestored: "Cadangan lengkap Phase 2 dipulihkan",
    toastLegacyRestored: "Data Phase 1 dimigrasikan ke Phase 2",
    toastEmptyBackup: "Deck ini kosong",
    toastExported: "Cadangan diunduh",
    toastStorageCleared: "Semua data tersimpan dihapus",
    toastInvalidBackup: "Cadangan tersebut tidak dapat diimpor",
    toastSaveFailed: "Perubahan tidak dapat disimpan",
    confirmDelete: "Hapus kartu ini? Tindakan ini tidak dapat dibatalkan.",
    confirmDeleteDeck: "Hapus “{deck}” dan semua {count} kartu? Tindakan ini tidak dapat dibatalkan.",
    confirmClearAll: "Hapus semua deck, kartu, review, dan preferensi? Tindakan ini tidak dapat dibatalkan.",
  },
  ja: {
    pageTitle: "Flipcard 学習",
    homeLabel: "Flipcard 学習ホーム",
    skipToCard: "学習カードへ移動",
    brandTagline: "長く覚える",
    cardTools: "カードツール",
    updateReady: "新しいバージョンを利用できます。",
    updateNow: "今すぐ更新",
    studyProgress: "学習の進捗",
    dueNow: "復習待ち",
    learned: "学習済み",
    reviewsToday: "今日の復習",
    dayStreak: "連続日数",
    studySession: "学習セッション",
    studyMode: "学習モード",
    due: "復習待ち",
    allCards: "すべてのカード",
    needsWork: "要復習",
    gotIt: "習得済み",
    fullScreen: "全画面",
    exitFullScreen: "全画面を終了",
    caughtUp: "復習は完了です",
    caughtUpHelp: "このデッキには今復習するカードがありません。",
    emptyDeck: "このデッキは空です",
    emptyDeckHelp: "質問と答えを追加して学習を始めましょう。",
    emptyFilter: "このグループにはカードがありません",
    emptyFilterHelp: "学習中にスキップまたは習得済みを使って分類できます。",
    browseAll: "すべてのカードを見る",
    addFirstCard: "カードを追加",
    question: "質問",
    answer: "答え",
    tapToReveal: "タップして答えを表示",
    chooseRating: "覚え具合を選択してください",
    gestureHelp: "タップで反転。スワイプまたは前へ・次へで移動します。",
    revealAction: "答えを表示",
    questionAction: "質問に戻る",
    focusControls: "全画面復習コントロール",
    reviewControls: "復習コントロール",
    previous: "前へ",
    next: "次へ",
    shuffle: "シャッフル",
    quickReviewControls: "カード移動とクイック評価",
    skip: "スキップ",
    markNeedsWork: "要復習にする",
    markKnown: "習得済みにする",
    revealBeforeRating: "評価する前に答えを表示してください。",
    rateAnswer: "回答を評価",
    again: "もう一度",
    hard: "難しい",
    good: "良い",
    easy: "簡単",
    yourCards: "あなたのカード",
    decks: "デッキ",
    newDeck: "新しいデッキ",
    renameDeck: "名前変更",
    deleteDeck: "削除",
    organizeCards: "カードを整理",
    deckName: "デッキ名",
    deckPlaceholder: "例：生物学",
    createDeck: "デッキを作成",
    deckSummary: "復習 {due} · 全 {total}枚",
    deckMastery: "✓ 習得 {known} · ↺ スキップ {needsWork}",
    dueShort: "復習",
    holdDeckHint: "デッキを250ミリ秒長押しすると、名前変更または削除できます。",
    privateTitle: "初期設定でプライベート",
    privateHelp: "カードと復習履歴はこのブラウザ内に保存されます。",
    newCard: "新しいカード",
    currentCard: "現在のカード",
    addCardTitle: "カードを追加",
    editCardTitle: "現在のカードを編集",
    deckLabel: "デッキ",
    questionLabel: "質問 / 記述",
    answerLabel: "答え",
    qPlaceholder: "質問または記述を入力…",
    aPlaceholder: "答えを入力…",
    cancel: "キャンセル",
    save: "保存",
    close: "閉じる",
    done: "完了",
    deleteCard: "カードを削除",
    settingsTitle: "設定",
    preferences: "環境設定",
    storageInfo: "データはこの端末に保存されています",
    storageError: "保存できませんでした。アプリを閉じる前にバックアップしてください。",
    languageLabel: "言語",
    backupHeading: "バックアップと復元",
    backupHelp: "JSONにはデッキ、予定、復習履歴が含まれます。",
    backupCsv: "現在のデッキをCSV出力",
    backupJson: "完全なバックアップを出力",
    importBackup: "バックアップを読み込む",
    dangerZone: "危険な操作",
    clearStorage: "保存データをすべて削除",
    statusNew: "新規",
    statusNeedsWork: "要復習",
    statusGotIt: "習得済み",
    dueInMinutes: "{count}分後に復習",
    dueInHours: "{count}時間後に復習",
    dueInDays: "{count}日後に復習",
    intervalMinutes: "{count}分",
    intervalDays: "{count}日",
    toastAdded: "{deck}にカードを追加しました",
    toastUpdated: "カードを更新しました",
    toastDeleted: "カードを削除しました",
    toastShuffled: "カードをシャッフルしました",
    toastRated: "{rating} · 次回 {interval}",
    toastSkipped: "スキップ済みにしました · 10分後に再復習",
    toastGotIt: "習得済みにしました · 次回の復習を設定",
    toastDeckCreated: "デッキを作成しました",
    toastDeckRenamed: "デッキ名を変更しました",
    toastDeckDeleted: "デッキを削除しました",
    toastImported: "{count}枚のカードを読み込みました",
    toastBackupRestored: "Phase 2バックアップを復元しました",
    toastLegacyRestored: "Phase 1データをPhase 2へ移行しました",
    toastEmptyBackup: "このデッキは空です",
    toastExported: "バックアップをダウンロードしました",
    toastStorageCleared: "保存データをすべて削除しました",
    toastInvalidBackup: "バックアップを読み込めませんでした",
    toastSaveFailed: "変更を保存できませんでした",
    confirmDelete: "このカードを削除しますか？元に戻せません。",
    confirmDeleteDeck: "「{deck}」と{count}枚のカードを削除しますか？元に戻せません。",
    confirmClearAll: "すべてのデッキ、カード、復習、設定を削除しますか？元に戻せません。",
  },
};

const elements = {
  addButton: document.querySelector("#add-card-button"),
  editButton: document.querySelector("#edit-card-button"),
  settingsButton: document.querySelector("#settings-button"),
  stats: {
    due: document.querySelector("#stat-due"),
    learned: document.querySelector("#stat-learned"),
    today: document.querySelector("#stat-today"),
    streak: document.querySelector("#stat-streak"),
  },
  studyHeading: document.querySelector("#study-heading"),
  dueModeButton: document.querySelector("#due-mode-button"),
  allModeButton: document.querySelector("#all-mode-button"),
  needsWorkModeButton: document.querySelector("#needs-work-mode-button"),
  knownModeButton: document.querySelector("#known-mode-button"),
  emptyState: document.querySelector("#empty-state"),
  emptyIllustration: document.querySelector("#empty-illustration"),
  emptyTitle: document.querySelector("#empty-title"),
  emptyHelp: document.querySelector("#empty-help"),
  emptyActionButton: document.querySelector("#empty-action-button"),
  cardScene: document.querySelector("#study-card"),
  flashcard: document.querySelector("#flashcard"),
  questionText: document.querySelector("#question-text"),
  answerText: document.querySelector("#answer-text"),
  cardMeta: document.querySelector("#card-meta"),
  cardStatus: document.querySelector("#card-status"),
  cardSchedule: document.querySelector("#card-schedule"),
  gestureHelp: document.querySelector("#gesture-help"),
  focusModeButton: document.querySelector("#focus-mode-button"),
  focusModeLabel: document.querySelector("#focus-mode-label"),
  focusPreviousButton: document.querySelector("#focus-previous-button"),
  focusNextButton: document.querySelector("#focus-next-button"),
  focusDeckIndicator: document.querySelector("#focus-deck-indicator"),
  focusCardCounter: document.querySelector("#focus-card-counter"),
  focusRatingHint: document.querySelector("#focus-rating-hint"),
  deckIndicator: document.querySelector("#deck-indicator"),
  cardCounter: document.querySelector("#card-counter"),
  previousButton: document.querySelector("#previous-button"),
  nextButton: document.querySelector("#next-button"),
  shuffleButton: document.querySelector("#shuffle-button"),
  skipButton: document.querySelector("#skip-button"),
  gotItButton: document.querySelector("#got-it-button"),
  ratingHint: document.querySelector("#rating-hint"),
  normalRatingArea: document.querySelector("#normal-rating-area"),
  deckList: document.querySelector("#deck-list"),
  addDeckButton: document.querySelector("#add-deck-button"),
  addDialog: document.querySelector("#add-dialog"),
  addForm: document.querySelector("#add-form"),
  addDeckSelect: document.querySelector("#add-deck-select"),
  addQuestion: document.querySelector("#add-question"),
  addAnswer: document.querySelector("#add-answer"),
  editDialog: document.querySelector("#edit-dialog"),
  editForm: document.querySelector("#edit-form"),
  editQuestion: document.querySelector("#edit-question"),
  editAnswer: document.querySelector("#edit-answer"),
  deleteCardButton: document.querySelector("#delete-card-button"),
  deckDialog: document.querySelector("#deck-dialog"),
  deckForm: document.querySelector("#deck-form"),
  deckName: document.querySelector("#deck-name"),
  renameDialog: document.querySelector("#rename-dialog"),
  renameForm: document.querySelector("#rename-form"),
  renameDeckName: document.querySelector("#rename-deck-name"),
  settingsDialog: document.querySelector("#settings-dialog"),
  languageSelect: document.querySelector("#language-select"),
  exportCsvButton: document.querySelector("#export-csv-button"),
  exportJsonButton: document.querySelector("#export-json-button"),
  importButton: document.querySelector("#import-button"),
  importFile: document.querySelector("#import-file"),
  clearStorageButton: document.querySelector("#clear-storage-button"),
  storageBadge: document.querySelector("#storage-badge"),
  storageInfo: document.querySelector("#storage-info"),
  toast: document.querySelector("#toast"),
  updateBanner: document.querySelector("#update-banner"),
  updateButton: document.querySelector("#update-button"),
  ratingButtons: [...document.querySelectorAll("[data-rating]")],
  focusRatingButtons: [...document.querySelectorAll("[data-focus-rating]")],
};

let state = createInitialState();
let activeDeckId = DEFAULT_DECK_ID;
let currentIndex = 0;
let studyMode = "due";
let currentLanguage = "en";
let editingId = null;
let isFlipped = false;
let isFocusMode = false;
let toastTimer;
let waitingWorker = null;
let pointerStart = null;
let suppressNextCardClick = false;
let queueOrder = [];
let migratedFromLegacy = false;
let editingDeckId = null;
let contextDeckId = null;
let deckHoldTimer = null;
let deckHoldStart = null;
let suppressDeckClickUntil = 0;

function t(key, replacements = {}) {
  const template = translations[currentLanguage]?.[key] ?? translations.en[key] ?? key;
  return Object.entries(replacements).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

function loadState() {
  const savedLanguage = localStorage.getItem(STORAGE.language);
  currentLanguage = translations[savedLanguage] ? savedLanguage : "en";

  try {
    const savedState = localStorage.getItem(STORAGE.state);
    if (savedState) {
      state = normalizeStudyState(JSON.parse(savedState));
    } else {
      const savedLegacyDecks = localStorage.getItem(LEGACY_STORAGE.decks);
      state = savedLegacyDecks
        ? migrateLegacyDecks(JSON.parse(savedLegacyDecks))
        : createInitialState();
      migratedFromLegacy = Boolean(savedLegacyDecks);
    }
  } catch (error) {
    console.warn("Saved Flipcard data could not be loaded.", error);
    state = createInitialState();
    setStorageStatus(false);
  }

  const savedDeck = localStorage.getItem(STORAGE.activeDeck);
  activeDeckId = state.decks.some((deck) => deck.id === savedDeck) ? savedDeck : state.decks[0].id;
  const savedMode = localStorage.getItem(STORAGE.studyMode);
  studyMode = ["due", "all", "needsWork", "known"].includes(savedMode) ? savedMode : "due";
  currentIndex = normalizeIndex(
    Number.parseInt(localStorage.getItem(STORAGE.currentIndex), 10),
    getVisibleCards().length,
  );

  if (migratedFromLegacy) saveState();
}

function saveState() {
  try {
    localStorage.setItem(STORAGE.state, JSON.stringify(state));
    localStorage.setItem(STORAGE.activeDeck, activeDeckId);
    localStorage.setItem(STORAGE.currentIndex, String(currentIndex));
    localStorage.setItem(STORAGE.studyMode, studyMode);
    localStorage.setItem(STORAGE.language, currentLanguage);
    setStorageStatus(true);
    return true;
  } catch (error) {
    console.warn("Flipcard data could not be saved.", error);
    setStorageStatus(false);
    showToast("toastSaveFailed");
    return false;
  }
}

function setStorageStatus(isHealthy) {
  elements.storageBadge.classList.toggle("is-error", !isHealthy);
  elements.storageInfo.textContent = t(isHealthy ? "storageInfo" : "storageError");
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  document.title = t("pageTitle");
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    const label = t(element.dataset.i18nAria);
    element.setAttribute("aria-label", label);
    if (element.matches("button")) element.title = label;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  elements.languageSelect.value = currentLanguage;
  setStorageStatus(!elements.storageBadge.classList.contains("is-error"));
}

function getActiveDeck() {
  return state.decks.find((deck) => deck.id === activeDeckId) ?? state.decks[0];
}

function getVisibleCards() {
  const deck = getActiveDeck();
  let cards;
  if (studyMode === "due") cards = getDueCards(deck);
  else if (studyMode === "needsWork") cards = deck.cards.filter((card) => card.mastery === "needsWork");
  else if (studyMode === "known") cards = deck.cards.filter((card) => card.mastery === "known");
  else cards = deck.cards.slice();
  if (queueOrder.length === 0) return cards;
  const positions = new Map(queueOrder.map((id, index) => [id, index]));
  return cards.slice().sort((a, b) => {
    const aPosition = positions.has(a.id) ? positions.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bPosition = positions.has(b.id) ? positions.get(b.id) : Number.MAX_SAFE_INTEGER;
    return aPosition - bPosition;
  });
}

function getCurrentCard() {
  return getVisibleCards()[currentIndex];
}

function render() {
  const deck = getActiveDeck();
  const visibleCards = getVisibleCards();
  currentIndex = normalizeIndex(currentIndex, visibleCards.length);
  const card = visibleCards[currentIndex];
  const hasCard = Boolean(card);
  const stats = getStudyStats(state);

  if (isFocusMode && !hasCard) setFocusMode(false, false);

  elements.stats.due.textContent = String(stats.due);
  elements.stats.learned.textContent = String(stats.learned);
  elements.stats.today.textContent = String(stats.reviewsToday);
  elements.stats.streak.textContent = String(stats.streak);
  elements.studyHeading.textContent = deck.name;
  const modeButtons = {
    due: elements.dueModeButton,
    all: elements.allModeButton,
    needsWork: elements.needsWorkModeButton,
    known: elements.knownModeButton,
  };
  for (const [mode, button] of Object.entries(modeButtons)) {
    button.classList.toggle("is-active", studyMode === mode);
    button.setAttribute("aria-pressed", String(studyMode === mode));
  }

  elements.emptyState.hidden = hasCard;
  elements.cardScene.hidden = !hasCard;
  elements.cardMeta.hidden = !hasCard;
  elements.gestureHelp.hidden = !hasCard;
  elements.normalRatingArea.hidden = !hasCard;
  elements.editButton.disabled = !hasCard;
  elements.previousButton.disabled = !hasCard || visibleCards.length < 2;
  elements.nextButton.disabled = !hasCard || visibleCards.length < 2;
  elements.shuffleButton.disabled = visibleCards.length < 2;
  elements.skipButton.disabled = !hasCard;
  elements.gotItButton.disabled = !hasCard;
  elements.focusModeButton.disabled = !hasCard;
  elements.focusModeButton.hidden = !hasCard;
  elements.focusPreviousButton.disabled = !hasCard || visibleCards.length < 2;
  elements.focusNextButton.disabled = !hasCard || visibleCards.length < 2;
  isFlipped = false;
  elements.flashcard.classList.remove("is-flipped");
  elements.cardScene.setAttribute("aria-pressed", "false");

  if (card) {
    elements.questionText.textContent = card.q;
    elements.answerText.textContent = card.a;
    elements.cardCounter.textContent = `${currentIndex + 1} / ${visibleCards.length}`;
    elements.focusCardCounter.textContent = `${currentIndex + 1} / ${visibleCards.length}`;
    elements.cardScene.setAttribute("aria-label", `${t("question")}: ${card.q}. ${t("revealAction")}`);
    elements.cardStatus.textContent = cardStatusLabel(card);
    elements.cardSchedule.textContent = dueLabel(card);
    updateIntervalPreviews(card);
  } else {
    elements.questionText.textContent = "";
    elements.answerText.textContent = "";
    elements.cardCounter.textContent = "0 / 0";
    elements.focusCardCounter.textContent = "0 / 0";
    elements.cardScene.removeAttribute("aria-label");
    const deckIsEmpty = deck.cards.length === 0;
    const filterIsEmpty = !deckIsEmpty && studyMode !== "due" && studyMode !== "all";
    elements.emptyIllustration.textContent = deckIsEmpty ? "?" : "✓";
    elements.emptyTitle.textContent = t(deckIsEmpty ? "emptyDeck" : filterIsEmpty ? "emptyFilter" : "caughtUp");
    elements.emptyHelp.textContent = t(deckIsEmpty ? "emptyDeckHelp" : filterIsEmpty ? "emptyFilterHelp" : "caughtUpHelp");
    elements.emptyActionButton.textContent = t(deckIsEmpty ? "addFirstCard" : "browseAll");
  }

  elements.deckIndicator.textContent = deck.name;
  elements.focusDeckIndicator.textContent = deck.name;
  updateRatingControls();
  updateFocusModeButton();
  renderDeckList();
  renderDeckSelect();
}

function renderDeckList() {
  elements.deckList.replaceChildren();
  for (const deck of state.decks) {
    const stats = getDeckStats(deck);
    const row = document.createElement("div");
    row.className = "deck-row";
    row.dataset.deckRow = deck.id;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `deck-item${deck.id === activeDeckId ? " is-active" : ""}`;
    button.dataset.deckId = deck.id;
    button.setAttribute("aria-label", `${deck.name}. ${t("deckSummary", { due: stats.due, total: stats.total })}. ${t("holdDeckHint")}`);
    if (deck.id === activeDeckId) button.setAttribute("aria-current", "true");

    const copy = document.createElement("span");
    copy.className = "deck-copy";
    const name = document.createElement("strong");
    name.textContent = deck.name;
    const summary = document.createElement("small");
    summary.textContent = t("deckSummary", { due: stats.due, total: stats.total });
    const mastery = document.createElement("small");
    mastery.className = "deck-mastery";
    const known = document.createElement("span");
    known.className = "mastery-known";
    known.textContent = `✓ ${stats.known}`;
    const needsWork = document.createElement("span");
    needsWork.className = "mastery-needs-work";
    needsWork.textContent = `↺ ${stats.needsWork}`;
    mastery.append(known, needsWork);
    copy.append(name, summary, mastery);

    const counts = document.createElement("span");
    counts.className = "deck-counts";
    const due = document.createElement("span");
    due.className = `due-count${stats.due > 0 ? " has-due" : ""}`;
    due.textContent = String(stats.due);
    const label = document.createElement("small");
    label.textContent = t("dueShort");
    counts.append(due, label);
    button.append(copy, counts);

    const menu = document.createElement("div");
    menu.className = "deck-context-menu";
    menu.dataset.deckMenu = deck.id;
    menu.hidden = contextDeckId !== deck.id;
    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.className = "deck-context-button";
    renameButton.dataset.deckAction = "rename";
    renameButton.dataset.deckId = deck.id;
    renameButton.textContent = t("renameDeck");
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "deck-context-button danger-text";
    deleteButton.dataset.deckAction = "delete";
    deleteButton.dataset.deckId = deck.id;
    deleteButton.textContent = t("deleteDeck");
    deleteButton.disabled = state.decks.length <= 1;
    menu.append(renameButton, deleteButton);
    row.append(button, menu);
    elements.deckList.append(row);
  }
}

function renderDeckSelect() {
  const selected = elements.addDeckSelect.value || activeDeckId;
  elements.addDeckSelect.replaceChildren();
  for (const deck of state.decks) {
    const option = document.createElement("option");
    option.value = deck.id;
    option.textContent = deck.name;
    elements.addDeckSelect.append(option);
  }
  elements.addDeckSelect.value = state.decks.some((deck) => deck.id === selected) ? selected : activeDeckId;
}

function setStudyMode(mode) {
  if (!["due", "all", "needsWork", "known"].includes(mode) || studyMode === mode) return;
  studyMode = mode;
  currentIndex = 0;
  queueOrder = [];
  saveState();
  render();
}

function setFocusMode(enabled, moveFocus = true) {
  if (enabled && !getCurrentCard()) return;
  isFocusMode = enabled;
  document.body.classList.toggle("focus-mode", isFocusMode);
  updateFocusModeButton();
  if (!moveFocus) return;
  if (isFocusMode) elements.cardScene.focus();
  else elements.focusModeButton.focus();
}

function updateFocusModeButton() {
  const label = t(isFocusMode ? "exitFullScreen" : "fullScreen");
  elements.focusModeButton.setAttribute("aria-pressed", String(isFocusMode));
  elements.focusModeButton.setAttribute("aria-label", label);
  elements.focusModeButton.title = label;
  elements.focusModeLabel.textContent = label;
}

function flipCard() {
  const card = getCurrentCard();
  if (!card) return;
  isFlipped = !isFlipped;
  elements.flashcard.classList.toggle("is-flipped", isFlipped);
  elements.cardScene.setAttribute("aria-pressed", String(isFlipped));
  elements.cardScene.setAttribute(
    "aria-label",
    isFlipped
      ? `${t("answer")}: ${card.a}. ${t("questionAction")}`
      : `${t("question")}: ${card.q}. ${t("revealAction")}`,
  );
  updateRatingControls();
}

function updateRatingControls() {
  const enabled = Boolean(getCurrentCard()) && isFlipped;
  [...elements.ratingButtons, ...elements.focusRatingButtons].forEach((button) => {
    button.disabled = !enabled;
  });
  elements.ratingHint.textContent = t(enabled ? "rateAnswer" : "revealBeforeRating");
  elements.focusRatingHint.textContent = t(enabled ? "rateAnswer" : "revealBeforeRating");
}

function updateIntervalPreviews(card) {
  for (const rating of RATINGS) {
    const preview = scheduleCard(card, rating);
    const label = formatInterval(preview.review.intervalDays, rating);
    document.querySelectorAll(`[data-interval="${rating}"], [data-focus-interval="${rating}"]`).forEach((element) => {
      element.textContent = label;
    });
  }
}

function rateCurrentCard(rating) {
  if (!isFlipped || !RATINGS.includes(rating)) return;
  const card = getCurrentCard();
  if (!card) return;

  const preview = scheduleCard(card, rating);
  state = recordReview(state, activeDeckId, card.id, rating);
  advanceAfterReview(card.id);
  saveState();
  render();
  showToast("toastRated", {
    rating: t(rating),
    interval: formatInterval(preview.review.intervalDays, rating),
  });
}

function quickMarkCurrent(rating, toastKey) {
  const card = getCurrentCard();
  if (!card || !RATINGS.includes(rating)) return;
  state = recordReview(state, activeDeckId, card.id, rating);
  advanceAfterReview(card.id);
  saveState();
  render();
  showToast(toastKey);
}

function advanceAfterReview(cardId) {
  queueOrder = queueOrder.filter((id) => id !== cardId);
  const remainingCards = getVisibleCards();
  if (remainingCards.some((card) => card.id === cardId)) {
    currentIndex = nextIndex(currentIndex, remainingCards.length);
  }
}

function cardStatusLabel(card) {
  if (card.mastery === "needsWork") return t("statusNeedsWork");
  if (card.mastery === "known") return t("statusGotIt");
  return t("statusNew");
}

function dueLabel(card) {
  const difference = Date.parse(card.review.dueAt) - Date.now();
  if (difference <= 0) return t("dueNow");
  const minutes = Math.max(1, Math.ceil(difference / 60000));
  if (minutes < 60) return t("dueInMinutes", { count: minutes });
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return t("dueInHours", { count: hours });
  return t("dueInDays", { count: Math.ceil(hours / 24) });
}

function formatInterval(intervalDays, rating) {
  if (rating === "again" && intervalDays === 0) return t("intervalMinutes", { count: 10 });
  return t("intervalDays", { count: intervalDays });
}

function openAddDialog() {
  renderDeckSelect();
  elements.addDeckSelect.value = activeDeckId;
  elements.addDialog.showModal();
  elements.addQuestion.focus();
}

function openEditDialog() {
  const card = getCurrentCard();
  if (!card) return;
  editingId = card.id;
  elements.editQuestion.value = card.q;
  elements.editAnswer.value = card.a;
  elements.editDialog.showModal();
  elements.editQuestion.focus();
}

function addCard(event) {
  event.preventDefault();
  if (!elements.addForm.reportValidity()) return;
  const deck = state.decks.find((item) => item.id === elements.addDeckSelect.value) ?? getActiveDeck();
  const card = createCard(elements.addQuestion.value, elements.addAnswer.value);
  deck.cards.push(card);
  activeDeckId = deck.id;
  studyMode = "due";
  currentIndex = Math.max(0, getDueCards(deck).length - 1);
  queueOrder = [];
  elements.addForm.reset();
  elements.addDialog.close();
  saveState();
  render();
  showToast("toastAdded", { deck: deck.name });
}

function updateCard(event) {
  event.preventDefault();
  if (!elements.editForm.reportValidity()) return;
  const deck = getActiveDeck();
  const card = deck.cards.find((item) => item.id === editingId);
  if (card) {
    card.q = elements.editQuestion.value.trim();
    card.a = elements.editAnswer.value.trim();
    card.updatedAt = new Date().toISOString();
  }
  elements.editDialog.close();
  saveState();
  render();
  showToast("toastUpdated");
}

function deleteCurrentCard() {
  if (!editingId || !window.confirm(t("confirmDelete"))) return;
  const deck = getActiveDeck();
  deck.cards = removeCardById(deck.cards, editingId);
  state.reviewLog = state.reviewLog.filter((entry) => !(entry.deckId === deck.id && entry.cardId === editingId));
  queueOrder = queueOrder.filter((id) => id !== editingId);
  currentIndex = normalizeIndex(currentIndex, getVisibleCards().length);
  editingId = null;
  elements.editDialog.close();
  saveState();
  render();
  showToast("toastDeleted");
}

function createNewDeck(event) {
  event.preventDefault();
  if (!elements.deckForm.reportValidity()) return;
  const deck = createDeck(elements.deckName.value);
  state.decks.push(deck);
  activeDeckId = deck.id;
  studyMode = "due";
  currentIndex = 0;
  queueOrder = [];
  elements.deckForm.reset();
  elements.deckDialog.close();
  saveState();
  render();
  showToast("toastDeckCreated");
}

function openRenameDeckDialog(deckId = contextDeckId || activeDeckId) {
  const deck = state.decks.find((item) => item.id === deckId);
  if (!deck) return;
  editingDeckId = deck.id;
  closeDeckContextMenu();
  elements.renameDeckName.value = deck.name;
  elements.renameDialog.showModal();
  elements.renameDeckName.focus();
  elements.renameDeckName.select();
}

function renameDeck(event) {
  event.preventDefault();
  if (!elements.renameForm.reportValidity()) return;
  const deck = state.decks.find((item) => item.id === editingDeckId);
  if (!deck) return;
  deck.name = elements.renameDeckName.value.trim().slice(0, 80);
  editingDeckId = null;
  elements.renameDialog.close();
  saveState();
  render();
  showToast("toastDeckRenamed");
}

function deleteDeckById(deckId = contextDeckId || activeDeckId) {
  if (state.decks.length <= 1) return;
  const deck = state.decks.find((item) => item.id === deckId);
  if (!deck) return;
  closeDeckContextMenu();
  if (!window.confirm(t("confirmDeleteDeck", { deck: deck.name, count: deck.cards.length }))) return;
  state.decks = state.decks.filter((item) => item.id !== deck.id);
  state.reviewLog = state.reviewLog.filter((entry) => entry.deckId !== deck.id);
  if (activeDeckId === deck.id) {
    activeDeckId = state.decks[0].id;
    currentIndex = 0;
    queueOrder = [];
    setFocusMode(false, false);
  }
  saveState();
  render();
  showToast("toastDeckDeleted");
}

function showDeckContextMenu(deckId) {
  if (!state.decks.some((deck) => deck.id === deckId)) return;
  contextDeckId = deckId;
  suppressDeckClickUntil = Date.now() + 500;
  renderDeckList();
  document.querySelector(`[data-deck-menu="${CSS.escape(deckId)}"] [data-deck-action="rename"]`)?.focus();
}

function closeDeckContextMenu(renderMenu = true) {
  if (!contextDeckId) return;
  contextDeckId = null;
  if (renderMenu) renderDeckList();
}

function startDeckHold(event, button) {
  if (!event.isPrimary || event.button !== 0) return;
  clearTimeout(deckHoldTimer);
  deckHoldStart = { x: event.clientX, y: event.clientY, deckId: button.dataset.deckId };
  deckHoldTimer = setTimeout(() => {
    showDeckContextMenu(button.dataset.deckId);
    deckHoldTimer = null;
    deckHoldStart = null;
  }, 250);
}

function cancelDeckHold() {
  clearTimeout(deckHoldTimer);
  deckHoldTimer = null;
  deckHoldStart = null;
}

function changeDeck(deckId) {
  if (!state.decks.some((deck) => deck.id === deckId)) return;
  activeDeckId = deckId;
  currentIndex = 0;
  queueOrder = [];
  setFocusMode(false, false);
  saveState();
  render();
}

function goNext() {
  currentIndex = nextIndex(currentIndex, getVisibleCards().length);
  saveState();
  render();
}

function goPrevious() {
  currentIndex = previousIndex(currentIndex, getVisibleCards().length);
  saveState();
  render();
}

function shuffleCurrentQueue() {
  const cards = getVisibleCards();
  if (cards.length < 2) return;
  queueOrder = shuffleCards(cards).map((card) => card.id);
  currentIndex = 0;
  saveState();
  render();
  showToast("toastShuffled");
}

function handleEmptyAction() {
  if (getActiveDeck().cards.length === 0) openAddDialog();
  else setStudyMode("all");
}

function exportActiveDeckCsv() {
  const deck = getActiveDeck();
  if (deck.cards.length === 0) {
    showToast("toastEmptyBackup");
    return;
  }
  downloadText(`flipcard-${safeFilename(deck.name)}.csv`, deckToCsv(deck.cards), "text/csv;charset=utf-8");
  showToast("toastExported");
}

function exportCompleteBackup() {
  downloadText(
    `flipcard-phase2-${new Date().toISOString().slice(0, 10)}.json`,
    createJsonBackup(state, currentLanguage, activeDeckId),
    "application/json;charset=utf-8",
  );
  showToast("toastExported");
}

async function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    if (file.name.toLowerCase().endsWith(".json")) {
      const backup = parseJsonBackup(text);
      state = backup.state;
      currentLanguage = backup.language;
      activeDeckId = backup.activeDeckId;
      studyMode = "due";
      currentIndex = 0;
      queueOrder = [];
      applyLanguage();
      saveState();
      render();
      showToast("toastBackupRestored");
    } else {
      const cards = parseCsv(text);
      if (cards.length === 0) throw new Error("No valid cards found.");
      getActiveDeck().cards.push(...cards);
      studyMode = "due";
      queueOrder = [];
      saveState();
      render();
      showToast("toastImported", { count: cards.length });
    }
    elements.settingsDialog.close();
  } catch (error) {
    console.warn("Backup import failed.", error);
    showToast("toastInvalidBackup");
  } finally {
    event.target.value = "";
  }
}

function clearAllData() {
  if (!window.confirm(t("confirmClearAll"))) return;
  for (const key of [...Object.values(STORAGE), ...Object.values(LEGACY_STORAGE)]) localStorage.removeItem(key);
  state = createInitialState();
  activeDeckId = DEFAULT_DECK_ID;
  currentIndex = 0;
  studyMode = "due";
  currentLanguage = "en";
  queueOrder = [];
  setFocusMode(false, false);
  applyLanguage();
  render();
  elements.settingsDialog.close();
  showToast("toastStorageCleared");
}

function downloadText(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safeFilename(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "deck";
}

function showToast(key, replacements = {}) {
  clearTimeout(toastTimer);
  elements.toast.textContent = t(key, replacements);
  elements.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
}

function bindEvents() {
  elements.addButton.addEventListener("click", openAddDialog);
  elements.editButton.addEventListener("click", openEditDialog);
  elements.settingsButton.addEventListener("click", () => elements.settingsDialog.showModal());
  elements.dueModeButton.addEventListener("click", () => setStudyMode("due"));
  elements.allModeButton.addEventListener("click", () => setStudyMode("all"));
  elements.needsWorkModeButton.addEventListener("click", () => setStudyMode("needsWork"));
  elements.knownModeButton.addEventListener("click", () => setStudyMode("known"));
  elements.emptyActionButton.addEventListener("click", handleEmptyAction);
  elements.focusModeButton.addEventListener("click", () => setFocusMode(!isFocusMode));
  elements.previousButton.addEventListener("click", goPrevious);
  elements.nextButton.addEventListener("click", goNext);
  elements.shuffleButton.addEventListener("click", shuffleCurrentQueue);
  elements.skipButton.addEventListener("click", () => quickMarkCurrent("again", "toastSkipped"));
  elements.gotItButton.addEventListener("click", () => quickMarkCurrent("good", "toastGotIt"));
  elements.focusPreviousButton.addEventListener("click", goPrevious);
  elements.focusNextButton.addEventListener("click", goNext);
  elements.addForm.addEventListener("submit", addCard);
  elements.editForm.addEventListener("submit", updateCard);
  elements.deleteCardButton.addEventListener("click", deleteCurrentCard);
  elements.addDeckButton.addEventListener("click", () => {
    elements.deckDialog.showModal();
    elements.deckName.focus();
  });
  elements.deckForm.addEventListener("submit", createNewDeck);
  elements.renameForm.addEventListener("submit", renameDeck);
  elements.exportCsvButton.addEventListener("click", exportActiveDeckCsv);
  elements.exportJsonButton.addEventListener("click", exportCompleteBackup);
  elements.importButton.addEventListener("click", () => elements.importFile.click());
  elements.importFile.addEventListener("change", importBackup);
  elements.clearStorageButton.addEventListener("click", clearAllData);
  elements.languageSelect.addEventListener("change", (event) => {
    currentLanguage = translations[event.target.value] ? event.target.value : "en";
    applyLanguage();
    saveState();
    render();
  });

  elements.ratingButtons.forEach((button) => {
    button.addEventListener("click", () => rateCurrentCard(button.dataset.rating));
  });
  elements.focusRatingButtons.forEach((button) => {
    button.addEventListener("click", () => rateCurrentCard(button.dataset.focusRating));
  });
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });
  elements.deckList.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-deck-action]");
    if (actionButton) {
      event.stopPropagation();
      if (actionButton.dataset.deckAction === "rename") openRenameDeckDialog(actionButton.dataset.deckId);
      else deleteDeckById(actionButton.dataset.deckId);
      return;
    }
    const button = event.target.closest("[data-deck-id]");
    if (!button || Date.now() < suppressDeckClickUntil) return;
    closeDeckContextMenu(false);
    changeDeck(button.dataset.deckId);
  });
  elements.deckList.addEventListener("pointerdown", (event) => {
    const button = event.target.closest(".deck-item");
    if (button) startDeckHold(event, button);
  });
  elements.deckList.addEventListener("pointermove", (event) => {
    if (!deckHoldStart) return;
    if (Math.hypot(event.clientX - deckHoldStart.x, event.clientY - deckHoldStart.y) > 8) cancelDeckHold();
  });
  elements.deckList.addEventListener("pointerup", cancelDeckHold);
  elements.deckList.addEventListener("pointercancel", cancelDeckHold);
  elements.deckList.addEventListener("contextmenu", (event) => {
    const button = event.target.closest(".deck-item");
    if (!button) return;
    event.preventDefault();
    cancelDeckHold();
    showDeckContextMenu(button.dataset.deckId);
  });
  document.addEventListener("click", (event) => {
    if (contextDeckId && !event.target.closest(".deck-row")) closeDeckContextMenu();
  });

  elements.cardScene.addEventListener("pointerdown", (event) => {
    if (event.isPrimary) pointerStart = { x: event.clientX, y: event.clientY };
  });
  elements.cardScene.addEventListener("pointerup", (event) => {
    if (!pointerStart || !event.isPrimary) return;
    const horizontal = event.clientX - pointerStart.x;
    const vertical = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(horizontal) > 55 && Math.abs(horizontal) > Math.abs(vertical)) {
      suppressNextCardClick = true;
      if (horizontal < 0) goNext();
      else goPrevious();
    }
  });
  elements.cardScene.addEventListener("pointercancel", () => {
    pointerStart = null;
  });
  elements.cardScene.addEventListener("click", () => {
    if (suppressNextCardClick) {
      suppressNextCardClick = false;
      return;
    }
    flipCard();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isFocusMode && !document.querySelector("dialog[open]")) {
      setFocusMode(false);
      return;
    }
    if (document.querySelector("dialog[open]") || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    } else if (isFlipped && ["1", "2", "3", "4"].includes(event.key)) {
      event.preventDefault();
      rateCurrentCard(RATINGS[Number(event.key) - 1]);
    }
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register("./sw.js");
    if (registration.waiting && navigator.serviceWorker.controller) showUpdate(registration.waiting);
    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;
      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state === "installed" && navigator.serviceWorker.controller) showUpdate(installingWorker);
      });
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
  } catch (error) {
    console.warn("Service worker registration failed.", error);
  }
}

function showUpdate(worker) {
  waitingWorker = worker;
  elements.updateBanner.hidden = false;
}

elements.updateButton.addEventListener("click", () => waitingWorker?.postMessage({ type: "SKIP_WAITING" }));

loadState();
bindEvents();
applyLanguage();
render();
if (migratedFromLegacy) showToast("toastLegacyRestored");
registerServiceWorker();
