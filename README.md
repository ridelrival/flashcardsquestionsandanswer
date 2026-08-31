# Flipcard Study — Phase 2

Flipcard Study is a private, offline-first spaced-repetition flashcard app. The repository root contains the Phase 2 build, while the separate Phase 1 workspace remains unchanged locally.

## Phase 2 features

- A due-review queue that shows only cards scheduled for review.
- Four review ratings: Again, Hard, Good, and Easy.
- Quick **Skip** and **Got It** actions that classify cards as needs-work or understood.
- Dedicated Needs Work and Got It filters, with both counts visible on every deck.
- Adaptive intervals based on each card's repetitions, lapses, and ease.
- Live progress for due cards, learned cards, today's reviews, and study streak.
- User-created decks with create, rename, and delete controls.
- Due and All Cards modes for each deck.
- Full-screen study with navigation and all four rating controls below the card.
- Previous, Next, Shuffle, Skip, and Got It live inside Study Session and remain easy to reach on small screens.
- Deck Rename and Delete actions stay hidden until the deck is pressed for 250 ms or opened with a context-menu action.
- Keyboard ratings after revealing an answer: `1` Again, `2` Hard, `3` Good, `4` Easy.
- Complete Phase 2 JSON backup/restore including review history and scheduling.
- Active-deck CSV import/export for question and answer content.
- English, Indonesian, and Japanese interface text.
- Offline PWA caching and update notification.

## Phase 1 migration

On first launch, Phase 2 looks for the original `flipcard_decks_v1` data if no Phase 2 state exists.

- Main Deck cards become cards in the new Main Deck.
- Skipped cards are due immediately and start with one lapse.
- Got It cards are treated as learned once and scheduled three days later.
- Duplicate card IDs across the old three categories are merged.
- The original Phase 1 local-storage keys are left intact until the user explicitly selects **Delete all saved data**.

Phase 2 stores its state in `flipcard_state_v2` and keeps the selected deck, mode, index, and language in separate preference keys.

## Scheduling rules

- **Again** — returns in 10 minutes, resets repetitions, records a lapse, and lowers ease.
- **Hard** — returns in at least 1 day and grows slowly.
- **Good** — starts at 1 day, then 3 days, then grows by the card's ease.
- **Easy** — starts at 4 days and grows faster while raising ease.

This is a transparent local scheduling model, not a medical or scientifically validated guarantee of learning outcomes.

## Run locally

Service workers require an HTTP origin. From this folder, run a static server, for example:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8080/`.

## Verify

Node.js 20 or newer is recommended. No dependency installation is required.

```powershell
npm test
npm run check
```

## Data and privacy

Cards, deck names, review schedules, and up to 5,000 recent review-log entries stay in the current browser's local storage. There is no account, analytics, server database, or cloud sync. Download complete JSON backups regularly, especially before clearing browser data or changing devices.
