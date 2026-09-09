# Recall — ACCA Applied Knowledge

A rebuilt revision site for ACCA Applied Knowledge. Business & Technology is fully
built; Management Accounting and Financial Accounting are listed on the home page
as unbuilt, not as ready.

This is a new design and a new app engine. The **content** — 281 flashcards, the
24-question trap drill and the first three 100-mark mock papers — is carried over from the
earlier build unchanged, and those files are treated as read-only data.

## Design

A revision notebook. Warm paper, ruled lines, a pink margin rule down the left
of every flashcard, and handwriting (Caveat) where a person would have written
in the margin — hints, counts, encouragement — never in body copy. Nunito
throughout at a gentle 1.2 scale, 10px radii, soft shadows, rounded progress
bars and pill-shaped status tags. Friendly first, but the analytics underneath
are unchanged.

The moves that carry it:

- **The flashcards physically turn over, both ways.** Both faces share one CSS
  grid cell inside a `preserve-3d` wrapper, so the shell sizes itself to the
  taller face and the whole card rotates on Y over 720ms, lifting 60px towards
  the viewer as it passes edge-on — the way a real card does when you pick it
  up. Clicking the card (or pressing space) turns it back and forth freely; the
  grading buttons stay put so you can re-test yourself before answering.
  Revealing never re-renders — the class is toggled on the element already on
  screen and the footer swapped in place, because a re-render would kill the
  animation. Turning uses keyframes rather than a transition, and the classes
  are cleared with a forced reflow between turns, or a second turn in the same
  direction would be a no-op.
- **Ruled paper on the card faces**, with the answer text set to a 30px
  line-height so it sits *on* the rules rather than floating between them.
- **Tabbed dividers for navigation** — a raised, colour-edged tab for the
  section you are in, running down the side on desktop and across the top on a
  phone.
- **Highlighter, not bold.** The `<b>` terms in every answer become real yellow
  highlighter marks, the way you would mark up a textbook.

## Performance metrics
The Progress page is a real dashboard, not a summary screen, and it needed a
metrics layer the earlier builds did not have. Every answer — from Today,
Cards, Quiz, Speed and each marked mock — is appended to a compact log
(`[dayIndex, chapter, correct, mode]`, capped at 4000 entries) in
`acca.recall.bt.metrics.v1`, alongside a history of every mock sitting.

From that the dashboard derives: syllabus mastery, cards due and never seen,
seven-day accuracy with a delta against the prior seven days, best and average
mock marks, a day streak, a 21-day activity sparkline, accuracy and mastery per
chapter and per capability, the five weakest chapters as one-click scope
filters, and the full mock history. Nothing leaves the browser.

## Run it

Any static host, or locally:

```bash
python3 -m http.server 8731 --directory site
```

`site/Recall.html` is the same app as a single self-contained file — email it,
put it on a USB stick, open it straight from disk. Rebuild it after any edit:

```bash
python3 site/build.py
```

The only network dependency is Google Fonts, with real fallbacks declared, so it
works offline once loaded.

## Files

| File | What it holds |
|---|---|
| `index.html` | All CSS, the static markup for the three places, and the script tags |
| `app.js` | The whole engine — SM-2 scheduling, metrics, six modes, mock simulator |
| `data/cards*.js` | `CHAPTERS` (22) and `CARDS` (281). Carried over unchanged |
| `data/exam.js` | `TRAP_TYPES`, `TRAPS` (24) and the briefing tables. Unchanged |
| `data/paper*.js` | `PAPERS`, `CAP_OF`, `CAP_NAME` — five 100-mark papers. Papers 4 and 5 are new |
| `data/check_papers.js` | Node script asserting every paper totals 100 with all six capabilities |
| `build.py` | Inlines the scripts into `Recall.html` |

## Architecture

- **Three places** — `state.place` is `home` | `paper` | `study`, persisted.
  `render()` sets one body class; CSS hides the other two.
- **Six modes** inside study — `overview` | `today` | `cards` | `quiz` | `speed` |
  `exam`. `overview` is the Progress dashboard and the default landing mode.
- **Spaced repetition** — SM-2, not a fixed ladder. Every card carries its own
  **ease factor** (2.5 default, floor 1.3, ceiling 2.9) and its own interval, so
  two cards answered on the same day diverge according to how hard you found
  them. Ratings are `Again | Hard | Good | Easy`; `Again` sends the card back to
  today's queue, counts a lapse and drops the ease permanently, so a card you
  keep missing stays close. `nextStatus()` is pure — it returns the status a
  rating *would* produce without saving, which is how each button can print its
  real interval before you press it. Intervals cap at a year.
  Same card, six reviews: always-Hard gives 1, 3, 4, 5, 6, 7 days; always-Good
  gives 1, 6, 15, 38, 95, 238; always-Easy gives 4, 10, 36, 136, 365.
- **Progress migrates.** The Leitner data written by earlier builds
  (`…progress.v1`) is converted to intervals on first load and written to
  `…progress.v2`, so nobody using the live site loses their schedule when the
  algorithm changes. The old key is left in place as a fallback.
- **Focused review** — cards can be starred (☆ on any card, or the `S` key), and
  every card-based mode can be narrowed to `Everything | Due now | Starred |
  Struggling | Not seen yet`. "Struggling" means two or more lapses, or an ease
  driven to 1.9 or below.
- **Quiz difficulty is the distractor source, not the question.** The card's
  answer is the stem and you name what it belongs to. Easy pulls wrong options
  from other chapters entirely, hard from the same chapter *and* the same kind of
  card. See `makeQuestion()`.
- **Confusions** — a wrong pick in Quiz or Speed records the pair you mixed up.
  Today shows the worst offenders side by side.
- **Scope** — one chapter switcher (`chapterPicker()`) appears in Today, Cards,
  Quiz and Speed, so changing chapter never means returning to Progress. Speed
  honours it too; it previously always drew from the whole bank.
- **Mock exam** — persisted under its own key so a refresh mid-paper loses
  nothing, and the clock is absolute (`endsAt`), so closing the tab does not
  pause it. Each sitting shuffles the paper **within each block and never across
  it**: the 16 one-markers among themselves, the 30 two-markers among
  themselves, the six task sets among themselves, so the structure of the real
  paper is preserved. The order is generated once at the start and stored with
  the sitting, and `label` — the answer key — is derived from a question's
  position in the source data rather than where it lands in the sitting, so
  answers stay bound to their questions through a refresh. Multiple-response questions score all-or-nothing, as in the real
  exam. Answer clicks patch the DOM in place; re-rendering 52 questions on every
  click made the navigator unusable.
- **Themes** — three states. Bare `:root` is the full light palette,
  `prefers-color-scheme: dark` guarded by `:not([data-theme="light"])`, and
  `[data-theme="dark"]`. No colour is defined only inside a media or attribute
  block.

## Storage

`acca.recall.bt.progress.v2` (card schedule, SM-2; `…v1` kept for migration) · `acca.recall.prefs.v1` (theme,
place, mode, sizes, focus, stars, confusions, bests) · `acca.recall.bt.mock.v1` (paper in
progress) · `acca.recall.bt.metrics.v1` (answer log and mock history).

Keys are namespaced per paper, so MA and FA can be added without colliding with
BT. **Progress is device-only** — a static page has no honest way to do accounts,
and an earlier shared-record version meant two people overwrote each other.

## A note on Reduce Motion

Most animation on the page is decorative and is switched off when the operating
system asks for reduced motion. The card turn is not decorative — a flashcard
that does not turn over is just a list — so it is deliberately exempted from the
blanket rule and instead shortened to 300ms with the lift removed. This was the
cause of a real bug: with Reduce Motion on, the earlier build honoured it by
disabling the flip entirely, so the card snapped to the answer with no turn at
all.

## Three ways through the cards

Cards opens on a chooser, and remembers what you picked:

- **Study** — the flashcard with the full Again / Hard / Good / Easy rating.
- **Quick** — the same card with two buttons, mapped onto the same scheduler
  (`Not yet` = Again, `Got it` = Good) so a fast pass still counts.
- **List** — the whole chapter printed out, question and answer together, with a
  *Questions only* toggle that turns it into a self-test you read down.

## Checked against the official syllabus

Audited against *ACCA Business and Technology (BT/FBT) syllabus and study guide,
September 2026 to June 2027*. That edition records **no additions, deletions or
amendments** to the syllabus, so the content is current.

Confirmed correct as they stood: the exam format (two hours; Section A of 30
two-mark and 16 one-mark objective questions; Section B of six four-mark
multi-task questions, one per main syllabus section; 100 marks; 50% pass), and
the 22-chapter breakdown.

### Section titles and mapping

Three things were wrong and are now fixed:

| Was | Now |
|---|---|
| Section B "Business organisational structure, functions and governance" | "Organisational structure, culture, governance and sustainability" |
| Section C "Accounting and reporting systems, technology and compliance" | "Business functions, regulation and technology" |
| Chapter 8 (business functions) mapped to section B | Mapped to section C, which is where C1 places it |

Section A and E titles were also brought to the published wording. The section
titles now match the syllabus exactly, so a student reading the capability
breakdown sees the same words ACCA uses.

### Financial ratios are not examinable in BT

A later audit of every question against the detailed study guide found four exam
questions asking for financial ratio work: interest cover and the accounting
equation in Paper 1, gearing in Paper 2, and return on capital employed in
Paper 3. **The BT study guide contains no ratio analysis and asks for no
calculation at all** — searching it for "ratio", "gearing", "interest cover",
"accounting equation", "double entry", "liquidity" and "calculate" returns
nothing. Those belong to FA and FM. All four were replaced with on-syllabus
questions drawn from C2 and C4.

Thirteen cards teaching ratio formulas (all of `cards4.js`, plus the accounting
equation and ROCE) are marked `x:1` and carry a *"Background · not examinable in
BT"* note rather than being deleted — the underlying concepts, such as what high
labour turnover signals, are examinable; the formulas are not.

### Theorists named in the study guide

The guide names Schein, Handy, Hofstede, Fayol, Taylor, Mintzberg, Drucker,
Adair, Fiedler, Bennis, Ashridge, Blake and Mouton, Maslow, Herzberg, McGregor,
Honey and Mumford, Kolb, and Mendelow. It does **not** name Belbin, Tuckman,
Porter, Vroom, Elkington or Buchanan and Huczynski, although every mainstream BT
text covers them and ACCA reserves the right to examine anything in the guide.
These are kept: they are legitimate revision material, just not on the named
list, and it is worth knowing which is which.

## Constraints that must hold

- **No ACCA copyright material.** Every question, scenario and figure is
  original. Company names in the mocks are invented.
- **The unofficial-material notice stays** on the home page, the paper page and
  in-app. ACCA is a registered trademark; the risk is implying endorsement.
- **No fake accounts or fake security.** There is no server to verify anything.

## Verified

Loaded in the browser: 281 cards, 24 traps, 5 papers, 290 paper questions, no
structural problems
(every paper totals 100, one Section B question per capability A–F, no duplicate
stems, no out-of-range answer indexes). Every chapter maps to a capability, and no stem is
duplicated across the five papers. Marking checked against known answer sets —
papers 1, 4 and 5 each return 100/100 when answered correctly, and a paper with
16 one-mark, 18 two-mark and 4 task-set answers returns exactly 68/100 — with the
capability split summing to the total every time. A driven 20-question quiz logged 20
metric entries and the dashboard derived accuracy, weakest chapters and mock
history from them. Mock shuffling was checked by sitting the same paper twice and comparing the
stored orders: they differ, each block is a true permutation of itself, and the
mark sequence is exactly sixteen 1s, thirty 2s and six 4s, so no question ever
crosses a section boundary. A shuffled paper seeded with correct answers,
refreshed, resumed and submitted still marks 100/100, which proves the answer
keys survive the reordering. The flip was checked end to end, sampling the transform
mid-animation to prove it tweens rather than snapping: turning a card in Today
and in Cards runs the keyframes in both directions, swaps the footer for the
grading buttons, keeps them through repeat turns, and delivers the next card
face-up with the grade recorded. The landing page's sample card turns both ways
too. No console errors in
any mode; zero horizontal overflow at 320px across all six modes, where the nav
becomes a row of tabs; light and dark both checked.

`data/check_papers.js` needs Node, which was not installed on the build machine —
the same assertions were run in the browser instead.

## Why SM-2 rather than FSRS

FSRS models memory with difficulty, stability and retrievability, and its
weights are meant to be *optimised against your own review history*. On a static
page with no server and no training step, shipping FSRS would mean shipping
someone else's fitted weights and calling it personalised. SM-2 is smaller,
fully transparent, and genuinely adaptive through the per-card ease factor —
which is the property that was actually missing. If the review log ever grows
large enough to fit parameters against, `nextStatus()` is the single function
that would need replacing.

## Checked against ACCA's published exam mechanics

Compared with ACCA's own technical article on the BT/FBT structure and its
guidance on objective question types.

**Matches:** two hours; Section A of 16 one-mark and 30 two-mark objective
questions (46 questions, 76 marks); Section B of six four-mark multi-task
questions, one per syllabus section, with no crossover between sections; 100
marks; 50% pass; no negative marking.

**Corrected:** ACCA marks the two sections differently — Section A has no
partial marking, but in Section B "partial marking is allowed" and candidates
receive credit for the correct selections they make. This build marked Section B
all-or-nothing, so it scored a sitting *harder than the real exam*. Section B
multi-response tasks now award one mark per correct selection, with an incorrect
selection cancelling a correct one, so ticking every box still scores zero.

**Still missing:** ACCA uses seven objective question types (multiple choice,
multiple response, multiple-response matching, fill in the blank / number entry,
drop-down list, hot spot and hot area; drag and drop appears only in session
CBEs). This app implements two — multiple choice and multiple response. The
knowledge tested is the same, but the *interaction* of matching, gap-fill and
hotspot questions is not yet practised here.

## Known gaps

- Papers 4 and 5 were written for this build; papers 1–3 are carried over.
- MA and FA have no content. MA's exam is objective-based so this engine
  transfers; FA needs constructed-response marking it cannot do.
- Only two of ACCA's seven objective question types are implemented.
- No analytics, by design.
- Confusion pairs come only from Quiz and Speed, where a wrong option exists.
  A flashcard "Again" feeds the schedule but not the confusion drill.
