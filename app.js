/* ==========================================================================
   Recall — ACCA Applied Knowledge
   App engine. Reads CHAPTERS/CARDS (cards*.js), TRAP_TYPES/TRAPS/PAPER/
   SECTIONS/PACE/CHECKLIST/CAPS (exam.js) and PAPERS/CAP_OF/CAP_NAME
   (paper*.js). Those data files are used as-is and never written to.

   Three places: home -> paper -> study. Six modes inside study, with
   Overview as the performance dashboard.
   Everything is stored in this browser; there is no server.
   ========================================================================== */
(function () {
"use strict";

/* ---- small helpers ------------------------------------------------------- */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
const plain = html => String(html).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const day = 864e5;
const today = () => Math.floor(Date.now() / day);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
const pad2 = n => String(n).padStart(2, "0");

/* <b> in a card answer marks the terms worth remembering. */
const highlight = html => String(html).replace(/<b>(.*?)<\/b>/g, "<mark>$1</mark>");

const KIND = { def:"Definition", model:"Model", trap:"Distinction", list:"List", eqn:"Equation" };

/* Cards marked x:1 are background rather than examinable. BT is tested purely
   on the study guide, and the study guide asks for no calculations at all, so
   the ratio formulas are worth knowing but will not be asked for. */
const BEYOND = "Background \u00b7 not examinable in BT";
function isBeyond(c) { return !!c.x; }

/* ---- storage ------------------------------------------------------------- */
const K = {
  prog:    "acca.recall.bt.progress.v2",   /* per-card schedule (SM-2) */
  progV1:  "acca.recall.bt.progress.v1",   /* the old Leitner boxes, migrated once */
  prefs:   "acca.recall.prefs.v1",         /* theme, place, mode, sizes, bests */
  mock:    "acca.recall.bt.mock.v1",       /* one paper in progress */
  metrics: "acca.recall.bt.metrics.v1"     /* answer log + mock history */
};
const read = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

/* ---- spaced repetition constants ------------------------------------------
   Declared up here because loadProgress() runs while the module is still
   initialising, and a `const` further down is in the temporal dead zone. */
const RATE = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };
const RATE_NAME = ["Again", "Hard", "Good", "Easy"];
const RATE_HINT = ["No idea", "Knew it, but slowly", "Knew it", "Instant"];
const EF_START = 2.5, EF_MIN = 1.3, EF_MAX = 2.9, IVL_MAX = 365;

/* ---- cards --------------------------------------------------------------- */
CARDS.forEach((c, i) => { c.id = "c" + i; });
const BY_CH = {};
CARDS.forEach(c => (BY_CH[c.c] = BY_CH[c.c] || []).push(c));
const CH_NUMS = Object.keys(CHAPTERS).map(Number).sort((a, b) => a - b);
const CARD_BY_ID = {}; CARDS.forEach(c => CARD_BY_ID[c.id] = c);
const CAP_KEYS = CAPS.map(c => c[0]);

/* ---- state --------------------------------------------------------------- */
const prefs = read(K.prefs, {});
const progress = loadProgress();

const state = {
  place: prefs.place || "home",
  mode:  prefs.mode  || "overview",
  theme: prefs.theme || "auto",
  chapter: null,              /* null = whole syllabus */
  size: prefs.size || 20,
  diff: prefs.diff || 1,      /* 0 easy, 1 standard, 2 hard */
  focus: prefs.focus || "all",/* which slice of the bank to study */
  view:  prefs.view  || null, /* cards view: null = show the chooser */
  listQ: !!prefs.listQ,       /* list view: hide the answers */
  examTab: "brief",
  session: null, quiz: null, speed: null, trapRun: null, mock: null
};
const mixups = prefs.mixups || {};
const stars  = prefs.stars  || {};      /* card id -> starred */
const bests  = prefs.bests  || {};
const trapScores = prefs.trapScores || {};

function savePrefs() {
  write(K.prefs, {
    theme: state.theme, place: state.place, mode: state.mode,
    size: state.size, diff: state.diff, focus: state.focus, view: state.view, listQ: state.listQ,
    matchBest: prefs.matchBest, matchTime: prefs.matchTime, matchStreak: prefs.matchStreak,
    cram: prefs.cram, cramEdit: prefs.cramEdit,
    mixups, stars, bests, trapScores,
    speedBest: prefs.speedBest
  });
}

/* ==========================================================================
   Metrics — every answer is logged so the dashboard has something to report
   Entries are compact arrays: [dayIndex, chapter, ok(0|1), mode]
   ========================================================================== */
const MODE_CODE = { today:0, cards:1, quiz:2, speed:3, trap:4, mock:5 };
const MODE_NAME = ["Today", "Cards", "Quiz", "Speed", "Trap drill", "Mock"];
const LOG_CAP = 4000;

const metrics = read(K.metrics, null) || { log: [], mocks: [] };
if (!metrics.log) metrics.log = [];
if (!metrics.mocks) metrics.mocks = [];

function saveMetrics() {
  if (metrics.log.length > LOG_CAP) metrics.log = metrics.log.slice(-LOG_CAP);
  write(K.metrics, metrics);
}
function logAnswer(chapter, ok, mode) {
  metrics.log.push([today(), chapter, ok ? 1 : 0, MODE_CODE[mode] != null ? MODE_CODE[mode] : 1]);
  saveMetrics();
}

function logSince(days) {
  if (days == null) return metrics.log;
  const from = today() - days + 1;
  return metrics.log.filter(e => e[0] >= from);
}
function accuracyOf(entries) {
  if (!entries.length) return null;
  let ok = 0;
  entries.forEach(e => { if (e[2]) ok++; });
  return ok / entries.length;
}
function accuracyByChapter(entries) {
  const m = {};
  entries.forEach(e => { const r = m[e[1]] || (m[e[1]] = [0, 0]); r[1]++; if (e[2]) r[0]++; });
  return m;
}
/* Consecutive days ending today (or yesterday, so an unopened evening
   does not wipe a run the moment the clock ticks over). */
function streak() {
  if (!metrics.log.length) return 0;
  const days = {};
  metrics.log.forEach(e => days[e[0]] = 1);
  const t = today();
  let start = days[t] ? t : (days[t - 1] ? t - 1 : null);
  if (start == null) return 0;
  let n = 0;
  while (days[start - n]) n++;
  return n;
}
function series(days) {
  const out = [];
  const counts = {};
  metrics.log.forEach(e => counts[e[0]] = (counts[e[0]] || 0) + 1);
  for (let i = days - 1; i >= 0; i--) out.push(counts[today() - i] || 0);
  return out;
}

/* ==========================================================================
   Spaced repetition — SM-2, driven by how well you actually knew the card

   The earlier build used a fixed Leitner ladder: every card moved 1, 3, 7, 16,
   35 days regardless of how hard you found it. This carries a per-card ease
   factor instead, so a card you keep nearly-missing stays close and a card you
   find easy leaves quickly. Ratings are the familiar four.
   ========================================================================== */
function freshStatus() { return { ef: EF_START, reps: 0, ivl: 0, due: 0, seen: 0, lapses: 0 }; }

/* Progress written by the Leitner build is carried across rather than dropped —
   people are already using the live site and should not lose their schedule
   because the algorithm underneath changed. */
function loadProgress() {
  const v2 = read(K.prog, null);
  if (v2) return v2;
  const v1 = read(K.progV1, null);
  if (!v1) return {};
  const BOX_V1 = [0, 1, 3, 7, 16, 35];
  const out = {};
  Object.keys(v1).forEach(id => {
    const o = v1[id] || {};
    const box = Math.max(0, Math.min(5, o.box || 0));
    out[id] = { ef: EF_START, reps: box, ivl: BOX_V1[box], due: o.due || 0,
                seen: o.seen || 0, lapses: o.missed || 0 };
  });
  write(K.prog, out);
  return out;
}

function statusOf(id) { return progress[id] || null; }

/* What this card's status *would* become at this rating. Used to schedule, and
   to print the real interval on each button before you press it. */
function nextStatus(s0, rating) {
  const s = Object.assign(freshStatus(), s0 || {});
  if (rating === RATE.AGAIN) {
    s.ef = Math.max(EF_MIN, s.ef - 0.20);
    s.reps = 0; s.lapses++; s.ivl = 0; s.due = today();
    return s;                                   /* back in today's queue */
  }
  if (rating === RATE.HARD) s.ef = Math.max(EF_MIN, s.ef - 0.15);
  if (rating === RATE.EASY) s.ef = Math.min(EF_MAX, s.ef + 0.10);

  if (s.reps === 0)      s.ivl = [0, 1, 1, 4][rating];      /* first success */
  else if (s.reps === 1) s.ivl = [0, 3, 6, 10][rating];     /* second */
  else {
    const mult = rating === RATE.HARD ? 1.2
               : rating === RATE.EASY ? s.ef * 1.3
               : s.ef;
    s.ivl = Math.round(s.ivl * mult);
  }
  s.ivl = capInterval(Math.max(1, Math.min(IVL_MAX, s.ivl)), rating);
  s.reps++;
  s.due = today() + s.ivl;
  return s;
}

function recordRating(id, rating, mode) {
  const prev = progress[id];
  const s = nextStatus(prev, rating);
  s.seen = ((prev && prev.seen) || 0) + 1;
  progress[id] = s;
  write(K.prog, progress);
  const card = CARD_BY_ID[id];
  if (card) logAnswer(card.c, rating !== RATE.AGAIN, mode || state.mode);
}

/* Quiz, Speed and the mock only ever know right or wrong. */
function recordGrade(id, ok, mode) { recordRating(id, ok ? RATE.GOOD : RATE.AGAIN, mode); }

function ivlLabel(d) {
  if (d <= 0) return "today";
  if (d === 1) return "1 day";
  if (d < 31) return d + " days";
  if (d < 365) return Math.round(d / 30) + " mth" + (Math.round(d / 30) === 1 ? "" : "s");
  return "a year";
}

/* How well a card is known: its interval as a fraction of the point at which
   it is safely long-term (40 days). */
function strengthOf(id) {
  const s = statusOf(id);
  if (!s || !s.reps) return 0;
  return Math.min(1, s.ivl / 40);
}
function meanStrength(cards) {
  if (!cards.length) return 0;
  let sum = 0;
  cards.forEach(c => sum += strengthOf(c.id));
  return sum / cards.length;
}
function chapterMastery(n) { return meanStrength(BY_CH[n] || []); }
function overallMastery() { return meanStrength(CARDS); }
function capMastery(cap) { return meanStrength(CARDS.filter(c => CAP_OF[c.c] === cap)); }

/* "Due" means seen before and the schedule has come round again. Cards never
   met are counted separately — they are new, not overdue. */
function dueCount(pool) {
  return (pool || CARDS).filter(c => { const s = statusOf(c.id); return s && s.due <= today(); }).length;
}
function unseenCount(pool) {
  return (pool || CARDS).filter(c => !statusOf(c.id)).length;
}
function seenCount(pool) {
  return (pool || CARDS).filter(c => statusOf(c.id)).length;
}

/* ==========================================================================
   Focused review — star a card, or isolate the ones giving you trouble
   ========================================================================== */
function isStarred(id) { return !!stars[id]; }
function toggleStar(id) {
  if (stars[id]) delete stars[id]; else stars[id] = 1;
  savePrefs();
  return isStarred(id);
}
/* Struggling: reset more than once, or ease driven well below the default. */
function isStruggling(id) {
  const s = statusOf(id);
  return !!s && (s.lapses >= 2 || s.ef <= 1.9);
}
function isDue(id) { const s = statusOf(id); return !!s && s.due <= today(); }

const FOCUS = [
  ["all",     "Everything",   p => p],
  ["due",     "Due now",      p => p.filter(c => isDue(c.id))],
  ["starred", "Starred",      p => p.filter(c => isStarred(c.id))],
  ["hard",    "Struggling",   p => p.filter(c => isStruggling(c.id))],
  ["new",     "Not seen yet", p => p.filter(c => !statusOf(c.id))]
];
function focusDef() { return FOCUS.find(f => f[0] === state.focus) || FOCUS[0]; }
function focusPool(pool) { return focusDef()[2](pool || poolNow()); }

function focusChips(pool) {
  return '<div class="chips">' + FOCUS.map(f => {
    const n = f[2](pool).length;
    return '<button class="chip" data-focus="' + f[0] + '" aria-pressed="' + (state.focus === f[0]) + '"' +
      (n ? "" : " disabled") + '>' + f[1] + ' <b>' + n + '</b></button>';
  }).join("") + '</div>';
}
function wireFocus() {
  $$("[data-focus]").forEach(b => b.addEventListener("click", () => {
    state.focus = b.dataset.focus; state.session = null; savePrefs(); render();
  }));
}

/* Due cards first, oldest schedule first, then cards never seen. */
function buildSession(n, pool) {
  const src = focusPool(pool || poolNow());
  const due = src.filter(c => isDue(c.id)).sort((a, b) => statusOf(a.id).due - statusOf(b.id).due);
  const fresh = shuffle(src.filter(c => !statusOf(c.id)));
  const rest = shuffle(src.filter(c => statusOf(c.id) && statusOf(c.id).due > today()))
                 .sort((a, b) => statusOf(a.id).due - statusOf(b.id).due);
  return due.concat(fresh, rest).slice(0, n);
}

/* ---- status classification used across every table ----------------------- */
function chapterStatus(n) {
  const m = chapterMastery(n);
  const seen = seenCount(BY_CH[n] || []);
  if (!seen) return { pill: "flat", word: "Untouched", bar: "" };
  if (m >= .7) return { pill: "up", word: "Strong", bar: "b-up" };
  if (m >= .35) return { pill: "warn", word: "Building", bar: "b-warn" };
  return { pill: "down", word: "Weak", bar: "b-down" };
}

/* ==========================================================================
   Question generation — the card's answer is the stem; you name it.
   Difficulty is the distractor source, not the question.
   ========================================================================== */
function makeQuestion(card, diff) {
  let pool = CARDS.filter(c => c.id !== card.id);
  if (diff >= 2) {
    const tight = pool.filter(c => c.c === card.c && c.k === card.k);
    pool = tight.length >= 3 ? tight : pool.filter(c => c.c === card.c || c.k === card.k);
  } else if (diff === 1) {
    const mid = pool.filter(c => c.k === card.k || Math.abs(c.c - card.c) <= 2);
    pool = mid.length >= 3 ? mid : pool;
  } else {
    const far = pool.filter(c => c.c !== card.c && c.k !== card.k);
    pool = far.length >= 3 ? far : pool;
  }
  const seen = { [plain(card.q)]: 1 };
  const wrong = [];
  shuffle(pool.slice()).forEach(c => {
    const key = plain(c.q);
    if (wrong.length < 3 && !seen[key]) { seen[key] = 1; wrong.push(c); }
  });
  const opts = shuffle([card].concat(wrong));
  return { card: card, opts: opts, answer: opts.indexOf(card) };
}

function recordMixup(rightCard, wrongCard) {
  const key = [rightCard.id, wrongCard.id].sort().join("|");
  mixups[key] = (mixups[key] || 0) + 1;
  savePrefs();
}
function topMixups(n) {
  return Object.keys(mixups)
    .map(k => ({ k, n: mixups[k], pair: k.split("|").map(id => CARD_BY_ID[id]) }))
    .filter(m => m.pair[0] && m.pair[1])
    .sort((a, b) => b.n - a.n)
    .slice(0, n || 6);
}

/* ==========================================================================
   Small view helpers
   ========================================================================== */
function panel(title, meta, body, cls) {
  return '<section class="panel">' +
    '<div class="panel-hd"><h2>' + title + '</h2><span class="sp"></span>' +
      (meta ? '<span class="meta">' + meta + '</span>' : "") + '</div>' +
    '<div class="panel-bd' + (cls ? " " + cls : "") + '">' + body + '</div>' +
  '</section>';
}
function bar(value, cls, width) {
  return '<span class="bar' + (cls ? " " + cls : "") + '"' + (width ? ' style="width:' + width + '"' : "") + '>' +
    '<i style="width:' + Math.max(0, Math.min(100, value)).toFixed(1) + '%"></i></span>';
}
function barCell(value, cls) {
  return '<span class="barcell">' + bar(value, cls) + '<span class="cellval">' + Math.round(value) + '%</span></span>';
}
function pill(kind, word) { return '<span class="pill pill-' + kind + '">' + word + '</span>'; }
function delta(n, unit) {
  const dir = n > 0 ? "up" : n < 0 ? "down" : "flat";
  const txt = n === 0 ? "no change" : (n > 0 ? "+" : "−") + Math.abs(n) + (unit || "");
  return '<span class="delta delta-' + dir + '">' + txt + '</span>';
}
function metricCard(k, v, foot) {
  return '<div class="metric"><span class="k">' + k + '</span><span class="v">' + v + '</span>' +
    '<span class="f">' + (foot || "") + '</span></div>';
}
function emptyState(head, body) {
  return '<div class="empty"><b>' + head + '</b>' + body + '</div>';
}

/* ==========================================================================
   Rendering
   ========================================================================== */
const stage = $("#stage");
let keyHandler = null;

function render() {
  document.body.className = (state.place === "home" ? "at-home"
                          : state.place === "paper" ? "at-paper" : "at-study") +
                          (state.listQ && state.mode === "cards" && state.view === "list" ? " q-only" : "");
  savePrefs();
  if (state.place === "home") { renderHome(); window.scrollTo(0, 0); return; }
  if (state.place === "paper") { renderLanding(); return; }

  $$(".navitem").forEach(b => b.setAttribute("aria-selected", String(b.dataset.mode === state.mode)));
  paintTopBar();
  keyHandler = null;
  stage.innerHTML = "";
  ({
    overview: renderOverview, today: renderToday, cards: renderCards,
    quiz: renderQuiz, speed: renderSpeed, match: renderMatchGame,
    cram: renderCramEntry, exam: renderExam
  }[state.mode])();
  renderKeys();
}

function paintTopBar() {
  const acc = accuracyOf(metrics.log);
  $("#tbMastery").textContent = pct(overallMastery(), 1) + "%";
  $("#tbDue").textContent = dueCount();
  $("#tbAcc").textContent = acc == null ? "—" : pct(acc, 1) + "%";
  $("#badgeDue").textContent = String(dueCount());
  $("#badgeCards").textContent = String(state.chapter ? (BY_CH[state.chapter] || []).length : CARDS.length);
  const cb = $("#badgeCram"), left = cramDaysLeft();
  if (cb) {
    cb.hidden = left == null;
    if (left != null) cb.textContent = left + "d";
  }
}

/* ---- home ---------------------------------------------------------------- */
const PAPER_LIST = [
  { code:"BT", name:"Business & Technology", live:true, cards:281, mocks:3,
    tx:"The business, its environment, its people and the ethics that bind them." },
  { code:"MA", name:"Management Accounting", live:false, cards:0, mocks:0,
    tx:"Costing, budgeting, variance analysis and performance measurement." },
  { code:"FA", name:"Financial Accounting", live:false, cards:0, mocks:0,
    tx:"Double entry through to a set of published financial statements." }
];

function renderHome() {
  $("#homeMeta").textContent = "1 of 3 built";
  $("#paperRows").innerHTML = PAPER_LIST.map(p => {
    const cov = p.live ? 100 : 0;
    return '<tr>' +
      '<td><b>' + p.code + '</b></td>' +
      '<td>' + esc(p.name) + '<br><span class="hint">' + esc(p.tx) + '</span></td>' +
      '<td class="num">' + (p.live ? CARDS.length : "—") + '</td>' +
      '<td class="num">' + (p.live ? PAPERS.length : "—") + '</td>' +
      '<td>' + barCell(cov, p.live ? "b-up" : "") + '</td>' +
      '<td>' + (p.live ? pill("up", "Ready") : pill("flat", "Not built")) + '</td>' +
      '<td>' + (p.live ? '<button class="btn btn-sm btn-primary" data-open="' + p.code + '">Open</button>' : "") + '</td>' +
    '</tr>';
  }).join("");
  $$("[data-open]").forEach(b => b.addEventListener("click", () => { state.place = "paper"; render(); }));
}

/* ---- paper landing ------------------------------------------------------- */
let demoCard = null, demoShown = false;

function renderLanding() {
  const qCount = PAPERS.reduce((n, p) => n + p.a1.length + p.a2.length + p.b.length * 2, 0);
  $("#tally").innerHTML =
    metricCard("Flashcards", CARDS.length, '<span class="hint">across ' + CH_NUMS.length + ' chapters</span>') +
    metricCard("Exam questions", qCount + TRAPS.length, '<span class="hint">every one explained</span>') +
    metricCard("Mock papers", PAPERS.length, '<span class="hint">100 marks · 2 hours</span>') +
    metricCard("Examiner traps", TRAPS.length, '<span class="hint">6 types drilled</span>');
  if (!demoCard) nextDemo();
  window.scrollTo(0, 0);
}
function nextDemo() { demoCard = pick(CARDS); demoShown = false; paintDemo(); }
function paintDemo() {
  if (!demoCard) return;
  $("#dcTag").textContent = "Ch " + pad2(demoCard.c) + " · " + CHAPTERS[demoCard.c] + " · " + KIND[demoCard.k];
  $("#dcQ").innerHTML = esc(demoCard.q);
  $("#dcA").innerHTML = highlight(demoCard.a);
  const shell = $("#demoShell");
  shell.classList.remove("turn-back", "turn-front");
  shell.classList.toggle("is-flipped", demoShown);
}

/* ==========================================================================
   Mode: Overview — the performance dashboard
   ========================================================================== */
function renderOverview() {
  const mastery = overallMastery();
  const due = dueCount(), fresh = unseenCount(), seen = seenCount();
  const all = metrics.log;
  const acc7 = accuracyOf(logSince(7));
  const accPrev7 = accuracyOf(metrics.log.filter(e => e[0] >= today() - 13 && e[0] < today() - 6));
  const accAll = accuracyOf(all);
  const answeredToday = logSince(1).length;
  const st = streak();
  const bestMock = Object.keys(bests).length ? Math.max.apply(null, Object.keys(bests).map(k => bests[k])) : null;
  const accDelta = acc7 != null && accPrev7 != null ? pct(acc7, 1) - pct(accPrev7, 1) : null;

  const metricRow =
    '<div class="metrics">' +
      metricCard("Syllabus mastery", pct(mastery, 1) + '<small>%</small>', bar(pct(mastery, 1), mastery >= .7 ? "b-up" : mastery >= .35 ? "b-warn" : "b-down")) +
      metricCard("Cards due", due, '<span class="hint">' + fresh + ' never seen</span>') +
      metricCard("Accuracy · 7d", acc7 == null ? "—" : pct(acc7, 1) + '<small>%</small>',
        accDelta == null ? '<span class="hint">no prior week</span>' : delta(accDelta, "pts") + '<span class="hint">vs prior 7d</span>') +
      metricCard("Best mock", bestMock == null ? "—" : bestMock + '<small>/100</small>',
        bestMock == null ? '<span class="hint">not attempted</span>'
          : (bestMock >= 50 ? pill("up", "Pass") : pill("down", "Below 50"))) +
      metricCard("Day streak", st, '<span class="hint">' + answeredToday + ' answered today</span>') +
      metricCard("Answered", all.length, '<span class="hint">' + (accAll == null ? "—" : pct(accAll, 1) + "% lifetime") + '</span>') +
    '</div>';

  /* activity sparkline, 21 days */
  const s = series(21), peak = Math.max(1, Math.max.apply(null, s));
  const bw = 100 / s.length;
  const sparkBars = s.map((v, i) => {
    const h = v ? Math.max(6, (v / peak) * 100) : 3;
    return '<rect class="' + (v ? "" : "zero") + '" x="' + (i * bw + bw * .12).toFixed(2) + '" y="' + (100 - h).toFixed(1) +
           '" width="' + (bw * .76).toFixed(2) + '" height="' + h.toFixed(1) + '"><title>' +
           plural(v, "answer") + '</title></rect>';
  }).join("");

  /* per-chapter table */
  const byCh = accuracyByChapter(all);
  const rows = CH_NUMS.map(n => {
    const cards = BY_CH[n] || [];
    const m = chapterMastery(n) * 100;
    const st2 = chapterStatus(n);
    const a = byCh[n];
    return '<tr>' +
      '<td class="num muted">' + pad2(n) + '</td>' +
      '<td><button class="rowbtn" data-goch="' + n + '">' + esc(CHAPTERS[n]) + '</button></td>' +
      '<td class="num muted">' + CAP_OF[n] + '</td>' +
      '<td class="num">' + cards.length + '</td>' +
      '<td class="num">' + dueCount(cards) + '</td>' +
      '<td style="min-width:120px">' + barCell(m, st2.bar) + '</td>' +
      '<td class="num">' + (a ? pct(a[0], a[1]) + "%" : "—") + '</td>' +
      '<td class="num muted">' + (a ? a[1] : 0) + '</td>' +
      '<td>' + pill(st2.pill, st2.word) + '</td>' +
    '</tr>';
  }).join("");

  /* per-capability table */
  const capRows = CAPS.map(c => {
    const key = c[0];
    const chs = CH_NUMS.filter(n => CAP_OF[n] === key);
    const entries = all.filter(e => CAP_OF[e[1]] === key);
    const a = accuracyOf(entries);
    const m = capMastery(key) * 100;
    const mockMarks = metrics.mocks.length ? metrics.mocks[metrics.mocks.length - 1].caps[key] : null;
    return '<tr>' +
      '<td><b>' + key + '</b></td>' +
      '<td class="wrap">' + c[1] + '</td>' +
      '<td class="num muted">' + chs.length + '</td>' +
      '<td style="min-width:120px">' + barCell(m, m >= 70 ? "b-up" : m >= 35 ? "b-warn" : "b-down") + '</td>' +
      '<td class="num">' + (a == null ? "—" : pct(a, 1) + "%") + '</td>' +
      '<td class="num">' + (mockMarks ? mockMarks.got + " / " + mockMarks.of : "—") + '</td>' +
    '</tr>';
  }).join("");

  /* weakest chapters worth attention */
  const weak = CH_NUMS
    .map(n => ({ n, m: chapterMastery(n), a: byCh[n], seen: seenCount(BY_CH[n] || []) }))
    .filter(x => x.seen > 0)
    .sort((a, b) => a.m - b.m)
    .slice(0, 5);

  /* mock history */
  const mockRows = metrics.mocks.slice().reverse().slice(0, 8).map(m => {
    const d = new Date(m.at);
    return '<tr>' +
      '<td class="num muted">' + pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + '</td>' +
      '<td>Paper ' + m.p + '</td>' +
      '<td class="num"><b>' + m.marks + '</b> <span class="muted">/100</span></td>' +
      '<td style="min-width:110px">' + bar(m.marks, m.marks >= 50 ? "b-up" : "b-down") + '</td>' +
      '<td>' + (m.marks >= 50 ? pill("up", "Pass") : pill("down", "Fail")) + '</td>' +
      '<td class="num muted">' + m.answered + '/' + m.slots + '</td>' +
    '</tr>';
  }).join("");

  stage.innerHTML =
    '<div class="scopebar"><h2>Your progress</h2><span class="sp"></span>' +
      '<button class="btn btn-sm btn-primary" data-mode-go="today">Start today’s session</button>' +
      '<button class="btn btn-sm" data-mode-go="exam">Sit a mock</button>' +
    '</div>' +

    metricRow +

    panel("Activity · 21 days", plural(all.length, "answer") + " logged",
      '<svg class="spark" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Answers per day over the last 21 days">' +
      sparkBars + '</svg>' +
      '<p class="hint" style="margin-top:var(--s2)">Each bar is one day. ' +
      (st ? 'Current streak ' + plural(st, "day") + '.' : 'No streak yet. Answer anything today to start one.') + '</p>') +

    (weak.length
      ? panel("Worth a look", "the 5 you know least well",
          '<div class="chips">' + weak.map(w =>
            '<button class="chip wide" data-goch="' + w.n + '">' + pad2(w.n) + ' · ' + esc(CHAPTERS[w.n]) +
            ' · ' + Math.round(w.m * 100) + '%</button>').join("") + '</div>' +
          '<p class="hint" style="margin-top:var(--s2)">Selecting one scopes every mode to that chapter.</p>')
      : panel("Worth a look", "nothing yet",
          emptyState("No data to rank.", "Answer some cards and the weakest chapters will be listed here, worst first."), "flush")) +

    panel("Chapters", CH_NUMS.length + " rows",
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th class="num">#</th><th>Chapter</th><th class="num">Cap</th>' +
        '<th class="num">Cards</th><th class="num">Due</th><th>Mastery</th>' +
        '<th class="num">Accuracy</th><th class="num">Attempts</th><th>Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>', "flush") +

    panel("Capabilities", "A–F",
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>&nbsp;</th><th>Capability</th><th class="num">Chapters</th>' +
        '<th>Mastery</th><th class="num">Accuracy</th><th class="num">Last mock</th>' +
      '</tr></thead><tbody>' + capRows + '</tbody></table></div>', "flush") +

    panel("Mock history", metrics.mocks.length ? plural(metrics.mocks.length, "sitting") : "none",
      metrics.mocks.length
        ? '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
            '<th class="num">Date</th><th>Paper</th><th class="num">Marks</th>' +
            '<th>&nbsp;</th><th>Result</th><th class="num">Answered</th>' +
          '</tr></thead><tbody>' + mockRows + '</tbody></table></div>'
        : emptyState("No mock papers sat yet.", "Three full 100-mark papers are waiting in Exam. Each one is marked by capability and logged here."),
      "flush");

  $$("[data-goch]").forEach(b => b.addEventListener("click", () => {
    state.chapter = +b.dataset.goch;
    state.mode = "cards"; state.session = null; state.quiz = null;
    render();
  }));
  $$("[data-mode-go]").forEach(b => b.addEventListener("click", () => {
    state.mode = b.dataset.modeGo; render();
  }));
}

/* ---- scope helpers ------------------------------------------------------- */
function poolNow() { return state.chapter ? (BY_CH[state.chapter] || []) : CARDS; }
function scopeLine() {
  return state.chapter ? "Ch " + pad2(state.chapter) + " · " + CHAPTERS[state.chapter] : "All 22 chapters";
}
/* One chapter switcher, shown in every mode that works from the card bank, so
   changing chapter never means going back to Progress to do it. */
function chapterPicker() {
  return '<label class="picker" title="Study one chapter, or the whole syllabus">' +
    '<select id="chapterPick" aria-label="Chapter">' +
      '<option value="">All 22 chapters · ' + CARDS.length + ' cards</option>' +
      CH_NUMS.map(n => {
        const cards = (BY_CH[n] || []).length;
        return '<option value="' + n + '"' + (state.chapter === n ? " selected" : "") + '>' +
          'Ch ' + pad2(n) + ' · ' + esc(CHAPTERS[n]) + ' · ' + cards + '</option>';
      }).join("") +
    '</select></label>' +
    (state.chapter ? '<button class="chip" id="clearScope">Show all ×</button>' : "");
}
function scopeBar(title, extra) {
  return '<div class="scopebar"><h2>' + title + '</h2>' +
    chapterPicker() +
    '<span class="sp"></span>' + (extra || "") + '</div>';
}
function setScope(n) {
  state.chapter = n;
  state.session = null; state.quiz = null;
  render();
}
function wireScope() {
  const sel = $("#chapterPick");
  if (sel) sel.addEventListener("change", () => setScope(sel.value ? +sel.value : null));
  const b = $("#clearScope");
  if (b) b.addEventListener("click", () => setScope(null));
}

/* A flashcard, built as two faces that share one grid cell so the shell sizes
   to the taller of them and the whole thing can rotate in 3D. Revealing an
   answer must never re-render — the flip has to run on the element already on
   screen, so the footer is swapped in place instead. */
function cardShell(c, shown, headMeta, footHTML) {
  return '<section class="panel card-shell' + (shown ? " is-flipped" : "") + '" id="cardShell">' +
    '<div class="panel-hd">' +
      '<button class="starbtn" id="starBtn" aria-pressed="' + isStarred(c.id) + '" ' +
        'title="Star this card to come back to it" aria-label="Star this card">' +
        (isStarred(c.id) ? "\u2605" : "\u2606") + '</button>' +
      '<h3>Ch ' + pad2(c.c) + ' · ' + esc(CHAPTERS[c.c]) + '</h3>' +
      '<span class="sp"></span><span class="meta">' + headMeta + '</span></div>' +
    '<div class="flip" id="flipZone">' +
      '<div class="flip-inner">' +
        '<div class="face ruled margined face-front">' +
          '<span class="face-tag">Question</span>' +
          '<h3 class="card-q">' + esc(c.q) + '</h3>' +
          '<p class="flip-hint">tap the card to turn it over</p>' +
        '</div>' +
        '<div class="face ruled margined face-back">' +
          '<span class="face-tag">Answer</span>' +
          '<div class="card-a">' + highlight(c.a) + '</div>' +
          '<p class="flip-hint">tap to turn it back</p>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="card-ft" id="cardFt">' + footHTML + '</div>' +
  '</section>';
}
/* The four ratings, each showing when that answer would actually bring the
   card back. Seeing "6 days" against Good and "10 days" against Easy is what
   makes the choice mean something. */
function gradeFoot(c) {
  const s0 = progress[c.id];
  return '<div class="grades">' + RATE_NAME.map((name, r) =>
    '<button class="btn grade g' + r + '" data-rate="' + r + '" title="' + RATE_HINT[r] + '">' +
      '<span class="gn">' + name + '</span>' +
      '<span class="gi">' + ivlLabel(nextStatus(s0, r).ivl) + '</span>' +
    '</button>').join("") + '</div>' +
  '<span class="sp" style="flex:1"></span>' +
  '<span class="hand">press 1 &ndash; 4</span>';
}

/* Turn a card over. The animation classes have to be cleared and the element
   reflowed before re-adding, or a second turn in the same direction does
   nothing — the browser sees the same animation already applied. */
function turnCard(shell, toBack) {
  if (!shell) return;
  shell.classList.remove("turn-back", "turn-front");
  void shell.offsetWidth;
  shell.classList.toggle("is-flipped", toBack);
  shell.classList.add(toBack ? "turn-back" : "turn-front");
}

/* First reveal: turn to the answer and swap the footer for the grading
   buttons in place — a re-render here would throw away the animation. */
function flipOpen(card, onRate, extraFoot) {
  const shell = $("#cardShell");
  if (!shell || shell.classList.contains("is-flipped")) return;
  turnCard(shell, true);
  $("#cardFt").innerHTML = (extraFoot || "") + gradeFoot(card);
  $$("[data-rate]").forEach(b => b.addEventListener("click", () => onRate(+b.dataset.rate)));
  if (extraFoot) wireCardNav();
}

/* Starring must not re-render — that would throw away the card's flip. */
function wireStar(c) {
  const b = $("#starBtn");
  if (!b) return;
  b.addEventListener("click", e => {
    e.stopPropagation();
    const on = toggleStar(c.id);
    b.setAttribute("aria-pressed", String(on));
    b.textContent = on ? "\u2605" : "\u2606";
  });
}

/* Once the answer has been seen, clicking the card just turns it back and
   forth. The grading buttons stay put, so you can test yourself again first. */
function toggleCard() {
  const shell = $("#cardShell");
  if (!shell) return;
  turnCard(shell, !shell.classList.contains("is-flipped"));
}

/* ==========================================================================
   Mode: Today
   ========================================================================== */
function renderToday() {
  if (state.session) return renderSessionCard();

  const pool = poolNow();
  const focused = focusPool(pool);
  const due = dueCount(pool), unseen = unseenCount(pool), seen = seenCount(pool);
  const starred = pool.filter(c => isStarred(c.id)).length;
  const hard = pool.filter(c => isStruggling(c.id)).length;
  const sizes = [10, 20, 40];

  stage.innerHTML =
    scopeBar("Today") +
    '<div class="metrics">' +
      metricCard("Due for review", due, bar(pct(due, Math.max(1, seen)), due ? "b-warn" : "b-up")) +
      metricCard("Never seen", unseen, bar(pct(unseen, pool.length))) +
      metricCard("Starred", starred, '<span class="hint">cards you flagged</span>') +
      metricCard("Struggling", hard, '<span class="hint">reset twice or more</span>') +
    '</div>' +

    panel("What to study", focusDef()[1].toLowerCase() + " · " + focused.length + " cards",
      focusChips(pool) +
      '<p class="hint" style="margin-top:var(--s2)">' + esc(FOCUS_NOTE[state.focus]) + '</p>' +
      '<p class="eyebrow" style="margin-top:var(--s4)">Session length</p>' +
      '<div class="chips" style="margin-top:var(--s1)">' + sizes.map(n =>
        '<button class="chip" data-size="' + n + '" aria-pressed="' + (state.size === n) + '">' + n + '</button>').join("") +
      '</div>' +
      '<div style="margin-top:var(--s4)"><button class="btn btn-primary" id="startSession"' +
        (focused.length ? "" : " disabled") + '>Start ' +
        Math.min(state.size, focused.length) + '-card session</button>' +
        (focused.length ? "" : '<span class="hint" style="margin-left:var(--s2)">Nothing in this selection yet.</span>') +
      '</div>') +

    panel("How the schedule works", "SM-2",
      '<p class="hint">Every card carries its own <b>ease</b>. Rate it <b>Again</b> and it comes back today and gets ' +
      'harder for good; <b>Hard</b> and the gap grows slowly; <b>Good</b> and it grows by that card\u2019s ease; ' +
      '<b>Easy</b> and it jumps well out. Each button shows the real interval before you press it, so the rating ' +
      'is a decision rather than a guess.</p>') +

    mixupPanel();

  wireScope();
  wireFocus();
  $$("[data-size]").forEach(b => b.addEventListener("click", () => { state.size = +b.dataset.size; render(); }));
  $("#startSession").addEventListener("click", () => {
    const cards = buildSession(state.size, pool);
    if (!cards.length) return;
    state.session = { cards, i: 0, shown: false, right: 0, wrong: 0 };
    render();
  });
  wireMixups();
}

const FOCUS_NOTE = {
  all:     "Due cards first, oldest first, then anything you have not met yet.",
  due:     "Only cards the schedule says you are about to forget.",
  starred: "Only cards you have starred. Star one from the \u2606 on any card.",
  hard:    "Cards you have reset twice or more, or whose ease has dropped well below normal.",
  new:     "Only cards you have never been shown."
};

function mixupPanel() {
  const m = topMixups(4);
  if (!m.length) {
    return panel("Confusions", "none recorded",
      emptyState("Nothing to compare yet.",
        "When you pick a wrong option in Quiz or Speed, the pair you mixed up is recorded and shown here side by side."),
      "flush");
  }
  return panel("Confusions", plural(m.length, "pair"),
    m.map(x =>
      '<div style="padding:var(--s2) 0;border-bottom:1px solid var(--line-2)">' +
        '<p class="eyebrow">Mixed up ' + plural(x.n, "time") + '</p>' +
        '<div class="split" style="margin-top:var(--s2)">' +
          x.pair.map(c =>
            '<div><p class="eyebrow" style="color:var(--accent)">Ch ' + pad2(c.c) + '</p>' +
            '<p style="font-weight:600;margin-top:var(--s1)">' + esc(c.q) + '</p>' +
            '<div class="hint" style="margin-top:var(--s1)">' + highlight(c.a) + '</div></div>').join("") +
        '</div>' +
        '<button class="btn btn-sm" data-clear-mix="' + x.k + '" style="margin-top:var(--s2)">Clear this pair</button>' +
      '</div>').join(""));
}
function wireMixups() {
  $$("[data-clear-mix]").forEach(b => b.addEventListener("click", () => {
    delete mixups[b.dataset.clearMix]; savePrefs(); render();
  }));
}

function renderSessionCard() {
  const s = state.session;
  if (s.i >= s.cards.length) return renderSessionDone();
  const c = s.cards[s.i];
  const st = statusOf(c.id);

  const rate = r => {
    recordRating(c.id, r, "today");
    r === RATE.AGAIN ? s.wrong++ : s.right++;
    s.i++; s.shown = false; render();
  };
  const reveal = () => { s.shown = true; flipOpen(c, rate); };

  stage.innerHTML =
    '<div class="scopebar"><h2>Today\u2019s session</h2>' +
      '<span class="chip" style="cursor:default">' + (s.i + 1) + ' of ' + s.cards.length + '</span>' +
      '<span class="sp"></span>' +
      '<span class="hint">' + s.right + ' knew \u00b7 ' + s.wrong + ' to revisit</span>' +
      '<button class="btn btn-sm" id="endSession">Finish early</button>' +
    '</div>' +
    bar(pct(s.i, s.cards.length)) +
    '<div style="height:var(--s3)"></div>' +
    cardShell(c, s.shown, cardMeta(c, st),
      s.shown ? gradeFoot(c)
        : '<button class="btn btn-primary" id="reveal">Show the answer</button>' +
          '<span class="sp" style="flex:1"></span>' +
          '<span class="hand">or press space</span>');

  if ($("#reveal")) $("#reveal").addEventListener("click", reveal);
  $("#flipZone").addEventListener("click", () => s.shown ? toggleCard() : reveal());
  $$("[data-rate]").forEach(b => b.addEventListener("click", () => rate(+b.dataset.rate)));
  $("#endSession").addEventListener("click", () => { state.session = null; render(); });
  wireStar(c);

  keyHandler = e => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); s.shown ? toggleCard() : reveal(); }
    else if (s.shown && "1234".indexOf(e.key) >= 0) rate("1234".indexOf(e.key));
    else if (e.key.toLowerCase() === "s") { const b = $("#starBtn"); if (b) b.click(); }
  };
}

/* The line in the card header: what kind of card, and where it sits. */
function cardMeta(c, st) {
  if (!st || !st.reps) return KIND[c.k] + " \u00b7 new card";
  return KIND[c.k] + " \u00b7 next in " + ivlLabel(st.ivl) +
         (isStruggling(c.id) ? " \u00b7 struggling" : "");
}

function renderSessionDone() {
  const s = state.session, n = s.right + s.wrong;
  stage.innerHTML =
    '<div class="scopebar"><h2>Session complete</h2></div>' +
    '<div class="metrics">' +
      metricCard("Score", pct(s.right, n) + '<small>%</small>', bar(pct(s.right, n), s.right === n ? "b-up" : "b-warn")) +
      metricCard("Knew it", s.right, '<span class="hint">moved up a box</span>') +
      metricCard("Again", s.wrong, '<span class="hint">back in today\u2019s queue</span>') +
    '</div>' +
    panel("Next", "",
      '<p class="hint">' + (s.wrong === 0
        ? "Clean sweep. Every card in this run moved further out."
        : plural(s.wrong, "card") + " reset to the start of the schedule and will be due again tomorrow.") + '</p>' +
      '<div style="margin-top:var(--s3);display:flex;gap:var(--s2);flex-wrap:wrap">' +
        '<button class="btn btn-primary" id="again">Another session</button>' +
        '<button class="btn" id="done">Back to Today</button>' +
        '<button class="btn" data-mode-go="overview">See my progress</button>' +
      '</div>');
  $("#again").addEventListener("click", () => {
    state.session = { cards: buildSession(state.size, poolNow()), i: 0, shown: false, right: 0, wrong: 0 };
    render();
  });
  $("#done").addEventListener("click", () => { state.session = null; render(); });
  $$("[data-mode-go]").forEach(b => b.addEventListener("click", () => {
    state.session = null; state.mode = b.dataset.modeGo; render();
  }));
}

/* ==========================================================================
   Mode: Cards — browse the bank
   ========================================================================== */
/* Cards has three ways of working, chosen on entry and remembered after that.
   Study is the full four-rating flashcard; Quick is the two-button version for
   a fast pass; List drops the cards altogether and prints the chapter so it can
   be read straight through. */
const CARD_VIEWS = [
  ["study", "Study",
   "Flashcards with the full Again, Hard, Good, Easy rating. This is the one that feeds the schedule."],
  ["quick", "Quick",
   "The same flashcards with one decision: did you know it or not. Faster when you only want a pass through."],
  ["list",  "List",
   "Every card in the chapter printed out, question and answer together. Best for a skim before the exam."]
];

function renderCards() {
  if (!state.view) return renderCardsChooser();
  if (state.view === "list") return renderCardsList();
  return renderCardsDeck();
}

function renderCardsChooser() {
  const pool = poolNow();
  stage.innerHTML =
    scopeBar("Cards") +
    panel("How would you like to work through them?", plural(pool.length, "card") + " in scope",
      '<div class="deflist">' + CARD_VIEWS.map(v =>
        '<div class="pickrow"><span class="nm">' + v[1] + '</span>' +
          '<span class="tx">' + esc(v[2]) + '</span>' +
          '<button class="btn btn-sm" data-view="' + v[0] + '">Choose</button>' +
        '</div>').join("") + '</div>' +
      '<p class="hint" style="padding:var(--s3) var(--s4) 0">You can switch at any time from the top of the page.</p>',
      "flush");
  wireScope();
  $$("[data-view]").forEach(b => b.addEventListener("click", () => {
    state.view = b.dataset.view; state.session = null; savePrefs(); render();
  }));
}

/* The switcher shown once a view has been picked. */
function viewSwitch() {
  return '<div class="chips">' + CARD_VIEWS.map(v =>
    '<button class="chip" data-view="' + v[0] + '" aria-pressed="' + (state.view === v[0]) + '">' +
      v[1] + '</button>').join("") + '</div>';
}
function wireViewSwitch() {
  $$("[data-view]").forEach(b => b.addEventListener("click", () => {
    state.view = b.dataset.view; state.session = null; savePrefs(); render();
  }));
}

/* ---- list view: read a whole chapter at once ----------------------------- */
function renderCardsList() {
  const pool = focusPool(poolNow());
  const byCh = {};
  pool.forEach(c => (byCh[c.c] = byCh[c.c] || []).push(c));
  const chapters = Object.keys(byCh).map(Number).sort((a, b) => a - b);

  stage.innerHTML =
    scopeBar("Cards", '<button class="btn btn-sm" id="hideAnswers" aria-pressed="' +
      (state.listQ ? "true" : "false") + '">' + (state.listQ ? "Show answers" : "Questions only") + '</button>') +
    viewSwitch() +
    '<div style="height:var(--s3)"></div>' +
    focusChips(poolNow()) +
    '<div style="height:var(--s3)"></div>' +
    (state.listQ ? '<p class="hint" style="margin:0 0 14px">Answers hidden. Read down the questions and check yourself.</p>' : "") +
    (pool.length
      ? chapters.map(n =>
          '<section class="panel">' +
            '<div class="panel-hd"><h3>Ch ' + pad2(n) + ' \u00b7 ' + esc(CHAPTERS[n]) + '</h3>' +
              '<span class="sp"></span>' +
              '<span class="meta">' + plural(byCh[n].length, "card") + '</span></div>' +
            '<div class="panel-bd flush"><ol class="cardlist">' +
              byCh[n].map(c =>
                '<li' + (isBeyond(c) ? ' class="beyond"' : '') + '>' +
                  '<div class="cl-head">' +
                    '<button class="starbtn" data-star="' + c.id + '" aria-pressed="' + isStarred(c.id) + '" ' +
                      'aria-label="Star this card">' + (isStarred(c.id) ? "\u2605" : "\u2606") + '</button>' +
                    '<span class="cl-q">' + esc(c.q) + '</span>' +
                    '<span class="cl-tag">' + KIND[c.k] + '</span>' +
                  '</div>' +
                  (isBeyond(c) ? '<p class="cl-note">' + BEYOND + '</p>' : '') +
                  '<div class="cl-a">' + highlight(c.a) + '</div>' +
                '</li>').join("") +
            '</ol></div>' +
          '</section>').join("")
      : panel("Nothing here", focusDef()[1].toLowerCase(),
          emptyState("No cards match this filter.", "Try another filter, or clear the chapter."), "flush"));

  wireScope();
  wireViewSwitch();
  wireFocus();
  $$("[data-star]").forEach(b => b.addEventListener("click", () => {
    const on = toggleStar(b.dataset.star);
    b.setAttribute("aria-pressed", String(on));
    b.textContent = on ? "\u2605" : "\u2606";
  }));
  /* Questions only turns the list into a self-test you can read down. */
  const hide = $("#hideAnswers");
  if (hide) hide.addEventListener("click", () => { state.listQ = !state.listQ; savePrefs(); render(); });
  keyHandler = null;
}

/* ---- deck view: one card at a time --------------------------------------- */
function renderCardsDeck() {
  const quick = state.view === "quick";
  const pool = focusPool(poolNow());
  if (!state.session || state.session.kind !== "browse" || state.session.key !== cardsKey()) {
    state.session = { kind: "browse", key: cardsKey(), cards: pool.slice(), i: 0, shown: false };
  }
  const s = state.session;
  const c = s.cards[s.i];

  if (!c) {
    stage.innerHTML = scopeBar("Cards") + viewSwitch() + '<div style="height:var(--s3)"></div>' +
      panel("Card bank", focusDef()[1].toLowerCase(),
        focusChips(poolNow()) +
        emptyState("Nothing in this selection.",
          "Try a different filter, or clear the chapter to see all " + CARDS.length + " cards."), "");
    wireScope(); wireViewSwitch(); wireFocus();
    return;
  }

  const st = statusOf(c.id);
  const navFoot =
    '<button class="btn btn-sm" id="prev"' + (s.i === 0 ? " disabled" : "") + '>&larr; Back</button>' +
    '<button class="btn btn-sm" id="next"' + (s.i >= s.cards.length - 1 ? " disabled" : "") + '>Next &rarr;</button>';
  const go = d => { s.i = Math.max(0, Math.min(s.cards.length - 1, s.i + d)); s.shown = false; render(); };
  const rate = r => { recordRating(c.id, r, "cards"); go(1); };
  const foot = quick ? quickFoot() : gradeFoot(c);
  const reveal = () => {
    s.shown = true;
    const shell = $("#cardShell");
    if (!shell || shell.classList.contains("is-flipped")) return;
    turnCard(shell, true);
    $("#cardFt").innerHTML = navFoot + foot;
    wireCardNav();
    wireRating(rate, quick);
  };

  stage.innerHTML =
    scopeBar("Cards", '<button class="btn btn-sm" id="shuffleDeck">Shuffle</button>') +
    viewSwitch() +
    '<div style="height:var(--s3)"></div>' +
    focusChips(poolNow()) +
    '<div class="scopebar" style="margin:var(--s3) 0 8px">' +
      '<span class="chip" style="cursor:default">' + (s.i + 1) + ' of ' + s.cards.length + '</span>' +
      '<span class="sp"></span>' +
      '<span class="hint">' + countLine(pool) + '</span>' +
    '</div>' +
    bar(pct(s.i, s.cards.length)) +
    '<div style="height:var(--s3)"></div>' +
    cardShell(c, s.shown, cardMeta(c, st),
      (s.shown ? navFoot + foot
        : navFoot +
          '<button class="btn btn-primary" id="reveal">Show the answer</button>' +
          '<span class="sp" style="flex:1"></span>' +
          '<span class="hand">space to turn</span>'));

  wireScope();
  wireViewSwitch();
  wireFocus();
  wireCardNav();
  wireStar(c);
  if ($("#reveal")) $("#reveal").addEventListener("click", reveal);
  $("#flipZone").addEventListener("click", () => s.shown ? toggleCard() : reveal());
  wireRating(rate, quick);
  $("#shuffleDeck").addEventListener("click", () => { shuffle(s.cards); s.i = 0; s.shown = false; render(); });

  keyHandler = e => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); s.shown ? toggleCard() : reveal(); }
    else if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (s.shown && quick && "12".indexOf(e.key) >= 0) rate(e.key === "1" ? RATE.AGAIN : RATE.GOOD);
    else if (s.shown && !quick && "1234".indexOf(e.key) >= 0) rate("1234".indexOf(e.key));
    else if (e.key.toLowerCase() === "s") { const b = $("#starBtn"); if (b) b.click(); }
  };
}

/* The two-button footer: the simpler pass, mapped onto the same scheduler. */
function quickFoot() {
  return '<div class="grades">' +
    '<button class="btn grade g0" data-rate="0"><span class="gn">Not yet</span>' +
      '<span class="gi">today</span></button>' +
    '<button class="btn grade g2" data-rate="2"><span class="gn">Got it</span>' +
      '<span class="gi">scheduled</span></button>' +
    '</div><span class="sp" style="flex:1"></span><span class="hand">press 1 or 2</span>';
}
function wireRating(rate, quick) {
  $$("[data-rate]").forEach(b => b.addEventListener("click", () => rate(+b.dataset.rate)));
}


/* Every card in scope, accounted for. Showing "seen" and "due" alone reads as
   if the rest have gone missing, when they are simply scheduled ahead. */
function countLine(pool) {
  const total = pool.length, fresh = unseenCount(pool), due = dueCount(pool);
  const ahead = total - fresh - due;
  const bits = [];
  bits.push(due ? '<b>' + due + '</b> due today' : 'nothing due today');
  if (ahead) bits.push('<b>' + ahead + '</b> scheduled ahead');
  if (fresh) bits.push('<b>' + fresh + '</b> not seen yet');
  return bits.join(" \u00b7 ") + ' \u00b7 ' + total + ' in scope';
}

/* Rebuild the browse deck whenever the chapter or the focus filter changes. */
function cardsKey() { return (state.chapter || "all") + "|" + state.focus; }

/* Back/Next live in the card footer, which is rebuilt when the card turns. */
function wireCardNav() {
  const s = state.session;
  if (!s) return;
  const go = d => { s.i = Math.max(0, Math.min(s.cards.length - 1, s.i + d)); s.shown = false; render(); };
  const p = $("#prev"), n = $("#next");
  if (p) p.addEventListener("click", () => go(-1));
  if (n) n.addEventListener("click", () => go(1));
}

/* ==========================================================================
   Mode: Quiz
   ========================================================================== */
const DIFFS = [
  ["Easy", "Wrong options come from other chapters entirely."],
  ["Standard", "Wrong options come from nearby chapters or the same kind of card."],
  ["Hard", "Wrong options come from the same chapter and the same kind of card."]
];

function renderQuiz() {
  if (state.quiz) return renderQuizQuestion();
  const pool = poolNow();
  const quizAcc = accuracyOf(metrics.log.filter(e => e[3] === MODE_CODE.quiz));

  stage.innerHTML =
    scopeBar("Quiz") +
    '<div class="metrics">' +
      metricCard("Quiz accuracy", quizAcc == null ? "—" : pct(quizAcc, 1) + '<small>%</small>',
        quizAcc == null ? '<span class="hint">no attempts</span>' : bar(pct(quizAcc, 1), quizAcc >= .7 ? "b-up" : "b-warn")) +
      metricCard("In scope", pool.length, '<span class="hint">cards available</span>') +
      metricCard("Difficulty", DIFFS[state.diff][0], '<span class="hint">distractor source</span>') +
    '</div>' +
    panel("Settings", "",
      '<p class="eyebrow">Difficulty</p>' +
      '<div class="chips" style="margin-top:var(--s1)">' +
        DIFFS.map((d, i) => '<button class="chip wide" data-diff="' + i + '" aria-pressed="' + (state.diff === i) + '">' + d[0] + '</button>').join("") +
      '</div>' +
      '<p class="hint" style="margin-top:var(--s2)">' + esc(DIFFS[state.diff][1]) + '</p>' +
      '<p class="eyebrow" style="margin-top:var(--s4)">Length</p>' +
      '<div class="chips" style="margin-top:var(--s1)">' +
        [10, 20, 40].map(n => '<button class="chip" data-qn="' + n + '" aria-pressed="' + (state.size === n) + '">' + n + '</button>').join("") +
      '</div>' +
      '<div style="margin-top:var(--s4)"><button class="btn btn-primary" id="startQuiz"' +
        (pool.length < 4 ? " disabled" : "") + '>Start quiz</button>' +
      (pool.length < 4 ? '<span class="hint" style="margin-left:var(--s2)">Too few cards in this chapter. Widen the scope.</span>' : "") +
      '</div>');

  wireScope();
  $$("[data-diff]").forEach(b => b.addEventListener("click", () => { state.diff = +b.dataset.diff; render(); }));
  $$("[data-qn]").forEach(b => b.addEventListener("click", () => { state.size = +b.dataset.qn; render(); }));
  $("#startQuiz").addEventListener("click", () => {
    state.quiz = { cards: buildSession(state.size, pool), i: 0, right: 0, picked: null, q: null };
    render();
  });
}

function renderQuizQuestion() {
  const z = state.quiz;
  if (z.i >= z.cards.length) return renderQuizDone();
  if (!z.q) z.q = makeQuestion(z.cards[z.i], state.diff);
  const q = z.q, answered = z.picked !== null;

  stage.innerHTML =
    '<div class="scopebar"><h2>Quiz</h2>' +
      '<span class="chip" style="cursor:default">' + (z.i + 1) + ' / ' + z.cards.length + '</span>' +
      '<span class="chip" style="cursor:default">' + DIFFS[state.diff][0] + '</span>' +
      '<span class="sp"></span>' +
      '<span class="meta hint">' + z.right + ' correct</span>' +
      '<button class="btn btn-sm" id="endQuiz">End</button>' +
    '</div>' +
    bar(pct(z.i, z.cards.length)) +
    '<section class="panel" style="margin-top:var(--s3)">' +
      '<div class="panel-hd"><h3>Identify</h3><span class="sp"></span>' +
        '<span class="meta">Ch ' + pad2(q.card.c) + ' · ' + KIND[q.card.k] + '</span></div>' +
      '<div class="panel-bd">' +
        '<p class="eyebrow">Which of these does the following describe?</p>' +
        '<div class="q-lead" style="margin-top:var(--s2)">' + highlight(q.card.a) + '</div>' +
        '<div class="opts">' +
          q.opts.map((o, i) => {
            let cls = "opt";
            if (answered) {
              if (i === q.answer) cls += " right";
              else if (i === z.picked) cls += " wrong";
            }
            return '<button class="' + cls + '" data-opt="' + i + '"' + (answered ? " disabled" : "") + '>' +
              '<span class="key">' + (i + 1) + '</span>' +
              '<span class="txt">' + esc(o.q) +
                (answered && i !== q.answer && i === z.picked
                  ? '<span class="note">That is chapter ' + pad2(o.c) + ' — ' + esc(CHAPTERS[o.c]) +
                    '. Near enough to tempt you, which is exactly how a distractor is built.</span>'
                  : "") +
              '</span></button>';
          }).join("") +
        '</div>' +
        (answered
          ? '<div class="verdict ' + (z.picked === q.answer ? "v-ok" : "v-no") + '">' +
            '<span class="lbl">' + (z.picked === q.answer ? "Correct" : "Incorrect. The answer was option " + (q.answer + 1)) + '</span>' +
            '<b>' + esc(q.card.q)  + '</b><br>' + highlight(q.card.a) + '</div>' +
            '<div style="margin-top:var(--s3)"><button class="btn btn-primary" id="nextQ">' +
            (z.i === z.cards.length - 1 ? "See result" : "Next question") + '</button>' +
            '<span class="hint" style="margin-left:var(--s2)">Space</span></div>'
          : "") +
      '</div>' +
    '</section>';

  const answer = i => {
    if (z.picked !== null) return;
    z.picked = i;
    const ok = i === q.answer;
    if (ok) z.right++; else recordMixup(q.card, q.opts[i]);
    recordGrade(q.card.id, ok, "quiz");
    render();
  };
  const next = () => { z.i++; z.picked = null; z.q = null; render(); };
  $$("[data-opt]").forEach(b => b.addEventListener("click", () => answer(+b.dataset.opt)));
  if ($("#nextQ")) $("#nextQ").addEventListener("click", next);
  $("#endQuiz").addEventListener("click", () => { state.quiz = null; render(); });

  keyHandler = e => {
    const n = "1234".indexOf(e.key);
    if (!answered && n >= 0 && n < q.opts.length) answer(n);
    else if (answered && (e.key === " " || e.key === "Enter")) { e.preventDefault(); next(); }
  };
}

function renderQuizDone() {
  const z = state.quiz, n = z.cards.length, score = pct(z.right, n);
  stage.innerHTML =
    '<div class="scopebar"><h2>Quiz complete</h2>' +
      '<span class="chip" style="cursor:default">' + DIFFS[state.diff][0] + '</span></div>' +
    '<div class="metrics">' +
      metricCard("Score", score + '<small>%</small>', bar(score, score >= 70 ? "b-up" : score >= 50 ? "b-warn" : "b-down")) +
      metricCard("Correct", z.right + '<small> / ' + n + '</small>', "") +
      metricCard("Missed", n - z.right, '<span class="hint">due again tomorrow</span>') +
    '</div>' +
    panel("Next", "",
      '<div style="display:flex;gap:var(--s2);flex-wrap:wrap">' +
        '<button class="btn btn-primary" id="againQ">Another quiz</button>' +
        '<button class="btn" id="doneQ">Change settings</button>' +
        '<button class="btn" data-mode-go="overview">See my progress</button>' +
      '</div>');
  $("#againQ").addEventListener("click", () => {
    state.quiz = { cards: buildSession(state.size, poolNow()), i: 0, right: 0, picked: null, q: null }; render();
  });
  $("#doneQ").addEventListener("click", () => { state.quiz = null; render(); });
  $$("[data-mode-go]").forEach(b => b.addEventListener("click", () => {
    state.quiz = null; state.mode = b.dataset.modeGo; render();
  }));
}

/* ==========================================================================
   Mode: Speed — sixty seconds
   ========================================================================== */
let speedTimer = null;
const SPEED_SECONDS = 60;

function renderSpeed() {
  const s = state.speed;
  if (!s) {
    const pool = poolNow();
    stage.innerHTML =
      scopeBar("Speed") +
      '<div class="metrics">' +
        metricCard("Personal best", prefs.speedBest || 0, '<span class="hint">correct in 60s</span>') +
        metricCard("Clock", SPEED_SECONDS + '<small>s</small>', '<span class="hint">standard difficulty</span>') +
        metricCard("In scope", pool.length, '<span class="hint">' + esc(scopeLine()) + '</span>') +
      '</div>' +
      panel("Rules", "",
        '<p class="hint">Sixty seconds, as many as you can get. No feedback until the clock stops, and everything you ' +
        'answer still counts towards the schedule and your accuracy. Keys 1–4 are faster than the mouse.</p>' +
        '<div style="margin-top:var(--s3)"><button class="btn btn-primary" id="startSpeed"' +
        (pool.length ? "" : " disabled") + '>Start the clock</button></div>');
    wireScope();
    $("#startSpeed").addEventListener("click", () => {
      state.speed = { endsAt: Date.now() + SPEED_SECONDS * 1000, right: 0, done: 0, missed: [], q: null, over: false };
      startSpeedTimer(); render();
    });
    return;
  }
  if (s.over) return renderSpeedDone();

  if (!s.q) s.q = makeQuestion(pick(poolNow().length ? poolNow() : CARDS), 1);
  const q = s.q;
  const left = Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000));

  stage.innerHTML =
    '<div class="mock-bar">' +
      '<span class="clock' + (left <= 10 ? " low" : "") + '" id="clock">0:' + pad2(left) + '</span>' +
      '<span class="meta">Correct <b>' + s.right + '</b> / ' + s.done + '</span>' +
      '<span class="sp"></span>' +
      '<span class="hdbar">' + bar(pct(SPEED_SECONDS - left, SPEED_SECONDS), left <= 10 ? "b-down" : "") + '</span>' +
    '</div>' +
    '<section class="panel">' +
      '<div class="panel-hd"><h3>Identify</h3><span class="sp"></span><span class="meta">1–4 to answer</span></div>' +
      '<div class="panel-bd">' +
        '<div class="q-lead">' + highlight(q.card.a) + '</div>' +
        '<div class="opts">' +
          q.opts.map((o, i) =>
            '<button class="opt" data-opt="' + i + '"><span class="key">' + (i + 1) + '</span>' +
            '<span class="txt">' + esc(o.q) + '</span></button>').join("") +
        '</div>' +
      '</div>' +
    '</section>';

  const answer = i => {
    const ok = i === q.answer;
    s.done++;
    if (ok) s.right++; else { s.missed.push(q.card); recordMixup(q.card, q.opts[i]); }
    recordGrade(q.card.id, ok, "speed");
    s.q = null;
    render();
  };
  $$("[data-opt]").forEach(b => b.addEventListener("click", () => answer(+b.dataset.opt)));
  keyHandler = e => { const n = "1234".indexOf(e.key); if (n >= 0 && n < q.opts.length) answer(n); };
}

function startSpeedTimer() {
  clearInterval(speedTimer);
  speedTimer = setInterval(() => {
    const s = state.speed;
    if (!s || s.over) return clearInterval(speedTimer);
    const left = Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000));
    if (left <= 0) { s.over = true; clearInterval(speedTimer); render(); return; }
    const c = $("#clock");
    if (c) { c.textContent = "0:" + pad2(left); c.classList.toggle("low", left <= 10); }
  }, 250);
}

function renderSpeedDone() {
  const s = state.speed;
  const isBest = !prefs.speedBest || s.right > prefs.speedBest;
  if (isBest) { prefs.speedBest = s.right; savePrefs(); }

  stage.innerHTML =
    scopeBar("Time", isBest ? pill("up", "New best") : "") +
    '<div class="metrics">' +
      metricCard("Correct", s.right, '<span class="hint">in ' + SPEED_SECONDS + ' seconds</span>') +
      metricCard("Answered", s.done, bar(pct(s.right, Math.max(1, s.done)), "b-up")) +
      metricCard("Accuracy", pct(s.right, Math.max(1, s.done)) + '<small>%</small>', "") +
      metricCard("Personal best", prefs.speedBest, isBest ? pill("up", "Beaten") : '<span class="hint">unchanged</span>') +
    '</div>' +
    (s.missed.length
      ? panel("Missed", plural(s.missed.length, "card"),
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num">Ch</th><th>Card</th><th class="num">Kind</th></tr></thead><tbody>' +
          s.missed.map(c => '<tr><td class="num muted">' + pad2(c.c) + '</td><td>' + esc(c.q) + '</td>' +
            '<td class="num muted">' + KIND[c.k] + '</td></tr>').join("") +
          '</tbody></table></div>', "flush")
      : panel("Missed", "none", emptyState("Nothing missed.", "Every card you reached was right."), "flush")) +
    panel("Next", "",
      '<div style="display:flex;gap:var(--s2);flex-wrap:wrap">' +
        '<button class="btn btn-primary" id="againS">Go again</button>' +
        '<button class="btn" data-mode-go="overview">See my progress</button>' +
      '</div>');

  wireScope();
  $("#againS").addEventListener("click", () => {
    state.speed = { endsAt: Date.now() + SPEED_SECONDS * 1000, right: 0, done: 0, missed: [], q: null, over: false };
    startSpeedTimer(); render();
  });
  $$("[data-mode-go]").forEach(b => b.addEventListener("click", () => {
    clearInterval(speedTimer); state.speed = null; state.mode = b.dataset.modeGo; render();
  }));
}


/* ==========================================================================
   Mode: Match — a 5×5 grid, five terms against five answers

   The same interaction ACCA uses for multiple-response matching, scaled up
   and put on a clock. Each column may be used once, so the grid is a
   permutation and a wrong pairing always costs a second one — which is the
   part that makes it a game rather than five separate questions.
   ========================================================================== */
const MATCH_N = 5;
const COL = ["A", "B", "C", "D", "E"];

function newMatchRound() {
  const scoped = poolNow().filter(c => !isBeyond(c));

  /* Five cards from ONE chapter wherever possible. Drawn from across the
     syllabus, a matching grid is solved by topic-spotting — "the four roles of
     a non-executive director" obviously belongs to the answer listing four
     board roles — which tests nothing. Inside a single chapter every answer is
     plausible against every term, so you have to actually know which is which. */
  const byCh = {};
  scoped.forEach(c => (byCh[c.c] = byCh[c.c] || []).push(c));
  const roomy = shuffle(Object.keys(byCh).filter(n => byCh[n].length >= MATCH_N));

  let source = scoped, from = null;
  if (roomy.length) {
    from = +roomy[0];
    source = byCh[from];
    /* tighter still: the same kind of card, if the chapter has five of one */
    const byKind = {};
    source.forEach(c => (byKind[c.k] = byKind[c.k] || []).push(c));
    const tight = Object.keys(byKind).filter(k => byKind[k].length >= MATCH_N);
    if (tight.length) source = byKind[pick(tight)];
  }

  const seen = {};
  const picked = [];
  shuffle(source.slice()).forEach(c => {
    const qk = plain(c.q), ak = plain(c.a).slice(0, 60);
    if (picked.length < MATCH_N && !seen[qk] && !seen[ak]) { seen[qk] = seen[ak] = 1; picked.push(c); }
  });
  if (picked.length < MATCH_N) return null;

  const order = shuffle(picked.map((_, i) => i));      /* column i holds answer order[i] */
  return { cards: picked, order, from, pick: new Array(MATCH_N).fill(null),
           checked: false, startedAt: Date.now() };
}

function renderMatchGame() {
  if (!state.match) state.match = newMatchRound();
  const g = state.match;

  if (!g) {
    stage.innerHTML = scopeBar("Match") +
      panel("Not enough cards", "",
        emptyState("This chapter has fewer than five usable cards.",
          "Pick another chapter, or clear the filter to play across the whole syllabus."), "flush");
    wireScope();
    return;
  }

  const answerFor = col => g.cards[g.order[col]];       /* which card's answer sits in this column */
  const correctCol = row => g.order.indexOf(row);       /* the column holding row's answer */
  const score = g.pick.reduce((n, c, r) => n + (c !== null && c === correctCol(r) ? 1 : 0), 0);
  const full = g.pick.every(v => v !== null);
  const secs = Math.round(((g.endedAt || Date.now()) - g.startedAt) / 1000);

  stage.innerHTML =
    scopeBar("Match") +
    '<div class="metrics">' +
      metricCard("Best round", (prefs.matchBest || 0) + '<small> / 5</small>',
        '<span class="hint">' + (prefs.matchTime ? "in " + prefs.matchTime + "s" : "not played yet") + '</span>') +
      metricCard("Perfect run", prefs.matchStreak || 0, '<span class="hint">rounds in a row</span>') +
      metricCard("This round", g.checked ? score + '<small> / 5</small>' : '&mdash;',
        g.checked ? bar(pct(score, MATCH_N), score === MATCH_N ? "b-up" : "b-warn") : '<span class="hint">' + secs + 's elapsed</span>') +
    '</div>' +

    '<section class="panel">' +
      '<div class="panel-hd"><h3>Match each term to its answer</h3><span class="sp"></span>' +
        '<span class="meta">' + (g.from ? "Ch " + pad2(g.from) + " \u00b7 " : "") +
        (g.checked ? "marked" : g.pick.filter(v => v !== null).length + " of 5 placed") + '</span></div>' +
      '<div class="panel-bd">' +
        '<div class="tbl-wrap"><table class="matchgrid game">' +
          '<thead><tr><th></th>' + COL.map(c => '<th scope="col">' + c + '</th>').join("") + '</tr></thead>' +
          '<tbody>' + g.cards.map((c, r) => {
            const right = g.checked && g.pick[r] === correctCol(r);
            const wrong = g.checked && g.pick[r] !== null && !right;
            return '<tr class="' + (right ? "r-right" : wrong ? "r-wrong" : "") + '">' +
              '<th scope="row">' + esc(c.q) +
                (g.checked ? '<span class="mres">' + (right ? "correct" : "answer " + COL[correctCol(r)]) + '</span>' : "") +
              '</th>' +
              COL.map((_, ci) => {
                let cls = "mcell";
                if (g.pick[r] === ci) cls += " picked";
                if (g.checked && ci === correctCol(r)) cls += " right";
                else if (g.checked && g.pick[r] === ci) cls += " wrong";
                return '<td><button class="' + cls + '" data-mr="' + r + '" data-mc="' + ci + '" ' +
                  (g.checked ? "disabled " : "") + 'aria-label="' + esc(c.q) + ': answer ' + COL[ci] + '"' +
                  '><span></span></button></td>';
              }).join("") +
            '</tr>';
          }).join("") + '</tbody>' +
        '</table></div>' +

        '<ol class="matchkey">' + COL.map((L, ci) =>
          '<li><span class="mk">' + L + '</span><span class="mv">' + highlight(answerFor(ci).a) + '</span></li>').join("") +
        '</ol>' +

        '<div style="margin-top:var(--s4);display:flex;gap:var(--s2);flex-wrap:wrap">' +
          (g.checked
            ? '<button class="btn btn-primary" id="matchNext">Next round</button>'
            : '<button class="btn btn-primary" id="matchCheck"' + (full ? "" : " disabled") + '>Check answers</button>' +
              '<button class="btn" id="matchClear">Clear</button>') +
          '<button class="btn" id="matchNew">New five</button>' +
        '</div>' +
        (g.checked ? "" : '<p class="hint" style="margin-top:var(--s2)">All five come from the same chapter, so every answer is plausible against every term. ' +
          'Each answer belongs to exactly one, so placing it rules it out elsewhere.</p>') +
      '</div>' +
    '</section>';

  wireScope();

  $$("[data-mr]").forEach(b => b.addEventListener("click", () => {
    const r = +b.dataset.mr, ci = +b.dataset.mc;
    if (g.pick[r] === ci) { g.pick[r] = null; }
    else {
      /* a column can only be used once — taking it frees whoever had it */
      const held = g.pick.indexOf(ci);
      if (held >= 0) g.pick[held] = null;
      g.pick[r] = ci;
    }
    render();
  }));

  if ($("#matchCheck")) $("#matchCheck").addEventListener("click", () => {
    g.checked = true; g.endedAt = Date.now();
    const t = Math.round((g.endedAt - g.startedAt) / 1000);
    /* the round counts towards the schedule, like everything else */
    g.cards.forEach((c, r) => recordRating(c.id, g.pick[r] === correctCol(r) ? RATE.GOOD : RATE.AGAIN, "cards"));
    const sc = g.pick.reduce((n, c, r) => n + (c === correctCol(r) ? 1 : 0), 0);
    if (sc > (prefs.matchBest || 0) || (sc === prefs.matchBest && t < (prefs.matchTime || 1e9))) {
      prefs.matchBest = sc; prefs.matchTime = t;
    }
    prefs.matchStreak = sc === MATCH_N ? (prefs.matchStreak || 0) + 1 : 0;
    savePrefs();
    render();
  });
  if ($("#matchClear")) $("#matchClear").addEventListener("click", () => {
    g.pick = new Array(MATCH_N).fill(null); render();
  });
  $("#matchNew").addEventListener("click", () => { state.match = newMatchRound(); render(); });
  if ($("#matchNext")) $("#matchNext").addEventListener("click", () => { state.match = newMatchRound(); render(); });

  keyHandler = null;
}


/* ==========================================================================
   Mode: Cram — the fortnight plan

   Fourteen days is enough to cover BT properly, but only if the whole syllabus
   gets touched. Section B guarantees one four-mark question per capability, so
   there is no area you can safely skip: dropping a capability throws away four
   marks before you start, and dropping Professional Ethics throws away a whole
   section built on one chapter.

   The plan is built from the real chapter sizes, so the daily card counts are
   what the deck actually holds rather than a round number.
   ========================================================================== */
const CRAM_LEN = 14;

/* Each day: the chapters to cover, and what kind of work it is. */
const CRAM_PLAN = [
  { d:1,  chapters:[1, 2],           kind:"learn",  title:"Organisations, stakeholders and the economy" },
  { d:2,  chapters:[3, 4, 6],        kind:"learn",  title:"Markets, society and competition" },
  { d:3,  chapters:[5, 7],           kind:"learn",  title:"Sustainability and structure" },
  { d:4,  chapters:[9, 10],          kind:"learn",  title:"Culture and governance" },
  { d:5,  chapters:[8, 11, 12],      kind:"learn",  title:"Business functions and financial information" },
  { d:6,  chapters:[13, 14, 15],     kind:"learn",  title:"Controls, technology and financial crime" },
  { d:7,  chapters:[16, 17],         kind:"learn",  title:"Leadership, individuals and teams" },
  { d:8,  chapters:[18, 19],         kind:"learn",  title:"Motivation, learning and appraisal" },
  { d:9,  chapters:[20, 21, 22],     kind:"learn",  title:"Personal effectiveness, communication and ethics" },
  { d:10, chapters:[],               kind:"traps",  title:"Everything due, then the six examiner traps" },
  { d:11, chapters:[],               kind:"mock",   paper:1, title:"First full mock, then review every wrong answer" },
  { d:12, chapters:[],               kind:"weak",   title:"Your weakest chapters, from the dashboard" },
  { d:13, chapters:[],               kind:"mock",   paper:2, title:"Second full mock, under real conditions" },
  { d:14, chapters:[],               kind:"final",  title:"Due cards, confusions and the format briefing" }
];

const CRAM_WORK = {
  learn: "Work through the chapters in Cards, then rate honestly. Anything you rate Again comes straight back.",
  traps: "Clear the due queue first, then drill all 24 trap questions. This is where the cheap marks are.",
  mock:  "Two hours, no notes, no pausing. Then read the explanation for every question you got wrong.",
  weak:  "Open Progress and work down the weakest chapters. Do not revisit what is already strong.",
  final: "No new material today. Clear what is due, read your confusions, and skim the exam format."
};

function cram() { return prefs.cram || null; }
function cramDay() {
  const c = cram();
  if (!c) return 0;
  return Math.min(CRAM_LEN, Math.max(1, today() - c.start + 1));
}
function cramDaysLeft() {
  const c = cram();
  return c ? Math.max(0, c.examDay - today()) : null;
}

/* Cards scheduled past the exam are wasted, so while a plan runs every interval
   is squeezed into the time that is left. A flat ceiling would make Hard, Good
   and Easy identical on a mature card and throw the rating away, so the cap is
   a share of the days remaining that depends on how well you knew it. */
const CRAM_SHARE = [0, 0.25, 0.40, 0.60];      /* again, hard, good, easy */
function capInterval(ivl, rating) {
  const left = cramDaysLeft();
  if (left == null || left <= 0) return ivl;
  const share = CRAM_SHARE[rating] != null ? CRAM_SHARE[rating] : 0.40;
  return Math.max(1, Math.min(ivl, Math.ceil(left * share)));
}
/* What each rating would give at most today — used in the plan's explanation. */
function cramCaps() {
  const left = cramDaysLeft() || 0;
  return [1, 2, 3].map(r => Math.max(1, Math.ceil(left * CRAM_SHARE[r])));
}

function cramCards(day) {
  const plan = CRAM_PLAN[day - 1];
  if (!plan || !plan.chapters.length) return [];
  return CARDS.filter(c => plan.chapters.indexOf(c.c) >= 0 && !isBeyond(c));
}

function renderCramEntry() { return (cram() && !prefs.cramEdit) ? renderCram() : renderCramSetup(); }

function renderCram() {
  const c = cram();
  if (!c) return renderCramSetup();

  const day = cramDay();
  const left = cramDaysLeft();
  const done = c.done || {};
  const doneCount = Object.keys(done).filter(k => done[k]).length;
  const overdue = today() > c.examDay;

  stage.innerHTML =
    '<div class="scopebar"><h2>Two-week plan</h2>' +
      '<span class="chip" style="cursor:default">Day ' + day + ' of ' + CRAM_LEN + '</span>' +
      '<span class="sp"></span>' +
      '<button class="btn btn-sm" id="cramEdit">Change date</button>' +
      '<button class="btn btn-sm btn-danger" id="cramStop">Stop plan</button>' +
    '</div>' +

    (overdue
      ? panel("The plan has finished", "",
          '<p class="hint">Your exam date has passed. Stop the plan to let the schedule spread out again, ' +
          'or set a new date if you are sitting later than planned.</p>')
      : '') +

    '<div class="metrics">' +
      metricCard("Days left", left, bar(pct(CRAM_LEN - left, CRAM_LEN), left <= 3 ? "b-down" : left <= 7 ? "b-warn" : "b-up")) +
      metricCard("Days done", doneCount + '<small> / ' + CRAM_LEN + '</small>', '<span class="hint">ticked off by you</span>') +
      metricCard("Syllabus learned", pct(overallMastery(), 1) + '<small>%</small>',
        bar(pct(overallMastery(), 1), overallMastery() >= .7 ? "b-up" : "b-warn")) +
      metricCard("Cards due", dueCount(), '<span class="hint">' + unseenCount() + ' never seen</span>') +
    '</div>' +

    panel("Nothing is scheduled past your exam", "how the plan changes the schedule",
      '<p class="hint">A card you rate <b>Easy</b> would normally go out for weeks. With ' + plural(Math.max(left, 0), "day") +
      ' left, that means never seeing it again before you sit. While this plan runs, every interval is squeezed ' +
      'into the time you have, but the rating still counts, so the three still differ:</p>' +
      '<div class="tbl-wrap"><table class="tbl" style="margin-top:var(--s2)"><thead><tr>' +
        '<th>Rating</th><th class="num">Longest it can go, today</th></tr></thead><tbody>' +
        ["Hard", "Good", "Easy"].map((n, i) =>
          '<tr><td><b>' + n + '</b></td><td class="num">' + plural(cramCaps()[i], "day") + '</td></tr>').join("") +
        '<tr><td><b>Again</b></td><td class="num">back today</td></tr>' +
      '</tbody></table></div>' +
      '<p class="hint" style="margin-top:var(--s2)">Stopping the plan restores the normal schedule. Nothing you have ' +
      'already learned is lost either way.</p>') +

    panel("The fortnight", doneCount + " of " + CRAM_LEN + " done",
      '<ol class="cramlist">' + CRAM_PLAN.map(pl => {
        const cards = cramCards(pl.d);
        const isToday = pl.d === day;
        const isDone = !!done[pl.d];
        const past = pl.d < day && !isDone;
        return '<li class="' + (isDone ? "done " : "") + (isToday ? "today " : "") + (past ? "missed" : "") + '">' +
          '<button class="cramtick" data-tick="' + pl.d + '" aria-pressed="' + isDone + '" ' +
            'aria-label="Mark day ' + pl.d + ' done">' + (isDone ? "\u2713" : pl.d) + '</button>' +
          '<div class="cramtx">' +
            '<p class="cramhd">' + esc(pl.title) +
              (isToday ? '<span class="crampill">today</span>' : "") +
              (past ? '<span class="crampill late">missed</span>' : "") + '</p>' +
            '<p class="hint">' + CRAM_WORK[pl.kind] +
              (cards.length ? ' <b>' + cards.length + ' cards</b> across ' +
                pl.chapters.map(n => "ch " + pad2(n)).join(", ") + '.' : "") + '</p>' +
            '<div class="chips" style="margin-top:var(--s2)">' +
              (pl.chapters.length
                ? '<button class="chip" data-cramgo="' + pl.d + '">Study these chapters</button>' : "") +
              (pl.kind === "traps" ? '<button class="chip" data-cramtraps="1">Open the trap drill</button>' : "") +
              (pl.kind === "mock" ? '<button class="chip" data-crammock="' + pl.paper + '">Sit paper ' + pl.paper + '</button>' : "") +
              (pl.kind === "weak" ? '<button class="chip" data-cramweak="1">Open Progress</button>' : "") +
              (pl.kind === "final" ? '<button class="chip" data-cramfinal="1">Today\u2019s due cards</button>' : "") +
            '</div>' +
          '</div>' +
        '</li>';
      }).join("") + '</ol>', "flush") +

    panel("What not to skip", "read this once",
      '<ul class="edge" style="margin-top:0">' +
        '<li><b>Every capability, however short.</b><span>Section B takes one four-mark question from each of A to F. ' +
        'Professional ethics is one chapter and 17 cards, and it is worth the same four marks as the six chapters of capability C. ' +
        'Skipping it throws away four marks before you sit down.</span></li>' +
        '<li><b>Breadth beats depth here.</b><span>The examining team\u2019s own advice is to learn something about every topic ' +
        'rather than a few in depth. Section A samples all 22 chapters across 46 questions.</span></li>' +
        '<li><b>Do the mocks under real conditions.</b><span>Two hours, no notes, no pausing. Most marks lost in BT are lost ' +
        'to the clock and to misreading, not to gaps in knowledge, and neither shows up unless you sit a whole paper.</span></li>' +
        '<li><b>Guess everything.</b><span>There is no negative marking. Before you submit, no question should be blank.</span></li>' +
      '</ul>', "flush");

  $("#cramStop").addEventListener("click", () => {
    if (!confirm("Stop the plan? Your progress is kept, and intervals go back to normal.")) return;
    delete prefs.cram; savePrefs(); render();
  });
  $("#cramEdit").addEventListener("click", () => { prefs.cramEdit = 1; render(); });
  $$("[data-tick]").forEach(b => b.addEventListener("click", () => {
    const d = b.dataset.tick;
    const dn = prefs.cram.done || (prefs.cram.done = {});
    dn[d] = !dn[d]; savePrefs(); render();
  }));
  $$("[data-cramgo]").forEach(b => b.addEventListener("click", () => {
    const pl = CRAM_PLAN[+b.dataset.cramgo - 1];
    state.chapter = pl.chapters[0]; state.focus = "all"; state.view = "study";
    state.mode = "cards"; state.session = null; savePrefs(); render();
  }));
  $$("[data-cramtraps]").forEach(b => b.addEventListener("click", () => {
    state.mode = "exam"; state.examTab = "traps"; render();
  }));
  $$("[data-crammock]").forEach(b => b.addEventListener("click", () => {
    state.mode = "exam"; state.examTab = "mocks"; render();
  }));
  $$("[data-cramweak]").forEach(b => b.addEventListener("click", () => { state.mode = "overview"; render(); }));
  $$("[data-cramfinal]").forEach(b => b.addEventListener("click", () => {
    state.mode = "today"; state.focus = "due"; state.session = null; savePrefs(); render();
  }));
  keyHandler = null;
}

function renderCramSetup() {
  const iso = d => new Date(d * 864e5).toISOString().slice(0, 10);
  const suggested = iso(today() + CRAM_LEN);
  stage.innerHTML =
    '<div class="scopebar"><h2>Two-week plan</h2></div>' +
    panel("Cramming BT in a fortnight", "be honest with yourself first",
      '<p class="hint">Spacing beats cramming, and if you have longer than two weeks you should use Today and let the ' +
      'schedule do its job. But two weeks is enough to cover BT properly if every part of the syllabus gets touched, ' +
      'and that is what this plan does: all 22 chapters in nine days, then traps, mocks and the chapters you are ' +
      'weakest on.</p>' +
      '<p class="hint" style="margin-top:var(--s2)">Turning it on also <b>caps the schedule</b>. Normally a card you find easy ' +
      'goes out weeks; with days left that means never seeing it again. While the plan runs, no interval reaches past ' +
      'your exam.</p>' +
      '<div style="margin-top:var(--s4);display:flex;gap:var(--s2);flex-wrap:wrap;align-items:flex-end">' +
        '<label class="cramdate"><span class="eyebrow">Exam date</span>' +
          '<input type="date" id="cramWhen" value="' + suggested + '" min="' + iso(today() + 1) + '"></label>' +
        '<button class="btn btn-primary" id="cramStart">Start the plan</button>' +
      '</div>');

  $("#cramStart").addEventListener("click", () => {
    const v = $("#cramWhen").value;
    if (!v) return;
    const examDay = Math.floor(Date.parse(v + "T00:00:00") / 864e5);
    if (!isFinite(examDay) || examDay <= today()) { alert("Pick a date after today."); return; }
    prefs.cram = { start: today(), examDay, done: {} };
    delete prefs.cramEdit;
    savePrefs(); render();
  });
}

/* ==========================================================================
   Mode: Exam — briefing, trap drill, mock simulator
   ========================================================================== */
function renderExam() {
  if (state.mock) return renderMock();

  const tabs = [["brief", "Format"], ["traps", "Trap drill"], ["mocks", "Mock simulator"]];
  stage.innerHTML =
    '<div class="scopebar"><h2>Exam</h2><span class="sp"></span></div>' +
    '<div class="subnav">' +
      tabs.map(t => '<button class="chip wide" data-etab="' + t[0] + '" aria-pressed="' +
        (state.examTab === t[0]) + '">' + t[1] + '</button>').join("") +
    '</div><div id="examBody"></div>';
  $$("[data-etab]").forEach(b => b.addEventListener("click", () => {
    state.examTab = b.dataset.etab; state.trapRun = null; render();
  }));
  ({ brief: renderBriefing, traps: renderTraps, mocks: renderMocks }[state.examTab])($("#examBody"));
}

function renderBriefing(box) {
  box.innerHTML =
    '<div class="metrics">' +
      PAPER.map(r => metricCard(r[1], r[0], "")).join("") +
    '</div>' +

    '<div class="split">' +
      panel("Mark allocation", "100 marks",
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Section</th><th>Content</th><th class="num">Marks</th></tr></thead><tbody>' +
        SECTIONS.map(r => '<tr><td>' + r[0] + '</td><td class="wrap">' + r[1] + '</td>' +
          '<td class="num"><b>' + r[2] + '</b></td></tr>').join("") +
        '</tbody></table></div>', "flush") +

      panel("Time budget", "120 minutes",
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th>Each</th><th class="num">Budget</th></tr></thead><tbody>' +
        PACE.map(r => '<tr><td>' + r[0] + '</td><td class="muted">' + r[1] + '</td>' +
          '<td class="num">' + r[2] + '</td></tr>').join("") +
        '</tbody></table></div>', "flush") +
    '</div>' +

    panel("Capabilities", "A–F · one Section B question each",
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>&nbsp;</th><th>Capability</th><th class="num">Chapters</th><th>Mastery</th></tr></thead><tbody>' +
      CAPS.map(r => {
        const m = capMastery(r[0]) * 100;
        return '<tr><td><b>' + r[0] + '</b></td><td class="wrap">' + r[1] + '</td>' +
          '<td class="num muted">' + r[2] + '</td>' +
          '<td style="min-width:130px">' + barCell(m, m >= 70 ? "b-up" : m >= 35 ? "b-warn" : "b-down") + '</td></tr>';
      }).join("") +
      '</tbody></table></div>', "flush") +

    panel("On the day", plural(CHECKLIST.length, "rule"),
      '<div class="deflist">' +
      CHECKLIST.map((r, i) => '<div><span class="nm">' + pad2(i + 1) + '</span>' +
        '<span class="tx"><b>' + r[0] + '</b><br>' + r[1] + '</span></div>').join("") +
      '</div>', "flush");
}

function renderTraps(box) {
  if (state.trapRun) return renderTrapQuestion(box);

  const done = Object.keys(trapScores).length;
  box.innerHTML =
    '<div class="metrics">' +
      metricCard("Trap questions", TRAPS.length, '<span class="hint">every option explained</span>') +
      metricCard("Trap types", Object.keys(TRAP_TYPES).length, '<span class="hint">' + done + ' drilled</span>') +
    '</div>' +
    panel("The six traps", "drill one, or all " + TRAPS.length,
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>Trap</th><th>Signature</th><th>How to beat it</th><th class="num">Last run</th><th style="width:90px"></th>' +
      '</tr></thead><tbody>' +
      Object.keys(TRAP_TYPES).map(k => {
        const t = TRAP_TYPES[k], sc = trapScores[k];
        const n = TRAPS.filter(x => x.t === k).length;
        return '<tr>' +
          '<td><b>' + esc(t.name) + '</b><br><span class="hint">' + plural(n, "question") + '</span></td>' +
          '<td><span class="pill pill-flat">' + t.tag + '</span></td>' +
          '<td class="wrap hint" style="max-width:46ch">' + esc(t.tip) + '</td>' +
          '<td class="num">' + (sc ? sc.right + " / " + sc.total : "—") + '</td>' +
          '<td><button class="btn btn-sm" data-trap="' + k + '">Drill</button></td>' +
        '</tr>';
      }).join("") +
      '</tbody></table></div>', "flush") +
    '<div style="margin-top:-8px;margin-bottom:var(--s4)"><button class="btn btn-primary" data-trap="all">Drill all ' + TRAPS.length + '</button></div>';

  $$("[data-trap]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.trap;
    const qs = shuffle(k === "all" ? TRAPS.slice() : TRAPS.filter(t => t.t === k));
    state.trapRun = { key: k, qs, i: 0, right: 0, picked: null };
    render();
  }));
}

function renderTrapQuestion(box) {
  const r = state.trapRun;
  if (r.i >= r.qs.length) {
    if (r.key !== "all") trapScores[r.key] = { right: r.right, total: r.qs.length };
    savePrefs();
    const score = pct(r.right, r.qs.length);
    box.innerHTML =
      '<div class="metrics">' +
        metricCard("Score", score + '<small>%</small>', bar(score, score >= 70 ? "b-up" : "b-warn")) +
        metricCard("Correct", r.right + '<small> / ' + r.qs.length + '</small>', "") +
      '</div>' +
      panel("Next", "",
        '<p class="hint">' + (r.right === r.qs.length
          ? "Every trap spotted."
          : "Re-read the notes on the ones you missed: the trap repeats, the topic does not.") + '</p>' +
        '<div style="margin-top:var(--s3)"><button class="btn btn-primary" id="trapBack">Back to the traps</button></div>');
    $("#trapBack").addEventListener("click", () => { state.trapRun = null; render(); });
    return;
  }

  const q = r.qs[r.i], t = TRAP_TYPES[q.t], answered = r.picked !== null;
  box.innerHTML =
    '<div class="scopebar" style="margin-bottom:var(--s2)">' +
      '<span class="chip" style="cursor:default">' + (r.i + 1) + ' / ' + r.qs.length + '</span>' +
      '<span class="chip" style="cursor:default">' + esc(t.name) + '</span>' +
      '<span class="sp"></span>' +
      '<span class="meta hint">' + r.right + ' correct</span>' +
      '<button class="btn btn-sm" id="endT">End</button>' +
    '</div>' +
    bar(pct(r.i, r.qs.length)) +
    '<section class="panel" style="margin-top:var(--s3)">' +
      '<div class="panel-hd"><h3>' + t.tag + '</h3><span class="sp"></span>' +
        '<span class="meta">Ch ' + pad2(q.c) + '</span></div>' +
      '<div class="panel-bd">' +
        '<h3 class="q-stem">' + q.q + '</h3>' +
        '<div class="opts">' +
          q.o.map((o, i) => {
            let cls = "opt";
            if (answered) { if (i === q.a) cls += " right"; else if (i === r.picked) cls += " wrong"; }
            return '<button class="' + cls + '" data-opt="' + i + '"' + (answered ? " disabled" : "") + '>' +
              '<span class="key">' + (i + 1) + '</span><span class="txt">' + o +
              (answered && q.w[i] ? '<span class="note">' + q.w[i] + '</span>' : "") + '</span></button>';
          }).join("") +
        '</div>' +
        (answered
          ? '<div class="verdict ' + (r.picked === q.a ? "v-ok" : "v-no") + '">' +
            '<span class="lbl">' + (r.picked === q.a ? "Correct" : "The trap caught you") + '</span>' + q.why + '</div>' +
            '<div style="margin-top:var(--s3)"><button class="btn btn-primary" id="nextT">' +
            (r.i === r.qs.length - 1 ? "See result" : "Next") + '</button></div>'
          : "") +
      '</div>' +
    '</section>';

  const answer = i => { if (r.picked !== null) return; r.picked = i; if (i === q.a) r.right++; render(); };
  const next = () => { r.i++; r.picked = null; render(); };
  $$("[data-opt]").forEach(b => b.addEventListener("click", () => answer(+b.dataset.opt)));
  if ($("#nextT")) $("#nextT").addEventListener("click", next);
  $("#endT").addEventListener("click", () => { state.trapRun = null; render(); });
  keyHandler = e => {
    const n = "12345".indexOf(e.key);
    if (!answered && n >= 0 && n < q.o.length) answer(n);
    else if (answered && (e.key === " " || e.key === "Enter")) { e.preventDefault(); next(); }
  };
}

/* ---- mock simulator ------------------------------------------------------ */
const MOCK_MINUTES = 120;

/* A sitting order for one paper: each block shuffled within itself and never
   across itself. The 16 one-markers stay one-markers and stay together, the 30
   two-markers likewise, and the six task sets keep their own block — exactly as
   the real paper is built. Generated once when the paper is started and stored
   with it, so a refresh mid-paper does not reorder the questions underneath the
   answers already given. */
function mockOrder(p) {
  const seq = n => shuffle(Array.from({ length: n }, (_, i) => i));
  return { a1: seq(p.a1.length), a2: seq(p.a2.length), b: seq(p.b.length) };
}

/* Flatten a paper into its 52 questions, each carrying marks and provenance.
   `label` is derived from the question's position in the source data, never
   from where it lands in the sitting, so an answer key stays bound to its
   question however the paper is shuffled. */
function flatten(p, order) {
  const o = order || { a1: p.a1.map((_, i) => i), a2: p.a2.map((_, i) => i), b: p.b.map((_, i) => i) };
  const out = [];
  o.a1.forEach(i => { const q = p.a1[i]; out.push({ q, m: 1, sec: "A", label: "A" + (i + 1), c: q.c }); });
  o.a2.forEach(i => { const q = p.a2[i]; out.push({ q, m: 2, sec: "A", label: "A" + (p.a1.length + i + 1), c: q.c }); });
  o.b.forEach(i => { const set = p.b[i]; out.push({ set, m: 4, sec: "B", label: "B" + (i + 1), c: set.c }); });
  return out;
}

/* The order stored with the sitting. Papers saved before shuffling existed
   have none, and keep the order they were sat in. */
function orderOf(m) { return m && m.order ? m.order : null; }
function slotCount(p) { return p.a1.length + p.a2.length + p.b.length * 2; }
function answerKey(item, taskIdx) { return item.label + (taskIdx == null ? "" : "." + (taskIdx + 1)); }

function answeredSlots(p, ans) {
  return flatten(p).reduce((n, x) =>
    n + (x.sec === "A" ? (isAnswered(x.q, ans[x.label]) ? 1 : 0)
                       : x.set.t.filter((t, j) => isAnswered(t, ans[answerKey(x, j)])).length), 0);
}

function renderMocks(box) {
  const saved = read(K.mock, null);
  const sat = metrics.mocks.length;
  const avg = sat ? Math.round(metrics.mocks.reduce((a, m) => a + m.marks, 0) / sat) : null;
  const last = sat ? metrics.mocks[sat - 1].marks : null;
  const prev = sat > 1 ? metrics.mocks[sat - 2].marks : null;

  box.innerHTML =
    '<div class="metrics">' +
      metricCard("Papers sat", sat, '<span class="hint">' + PAPERS.length + ' available</span>') +
      metricCard("Average", avg == null ? "—" : avg + '<small>/100</small>',
        avg == null ? '<span class="hint">no sittings</span>' : bar(avg, avg >= 50 ? "b-up" : "b-down")) +
      metricCard("Latest", last == null ? "—" : last + '<small>/100</small>',
        prev == null ? '<span class="hint">no prior paper</span>' : delta(last - prev, " marks")) +
      metricCard("Pass mark", '50<small>/100</small>', '<span class="hint">no negative marking</span>') +
    '</div>' +

    (saved
      ? panel("Paper in progress", "Paper " + saved.p,
          '<p>' + (Date.now() < saved.endsAt
            ? '<b>' + Math.ceil((saved.endsAt - Date.now()) / 60000) + ' minutes</b> left on the clock.'
            : 'The clock has run out. Resume it to see how it marked.') +
          ' The clock is absolute, so closing the tab did not pause it.</p>' +
          '<div style="margin-top:var(--s3);display:flex;gap:var(--s2);flex-wrap:wrap">' +
            '<button class="btn btn-primary" id="resumeMock">Resume paper ' + saved.p + '</button>' +
            '<button class="btn btn-danger" id="binMock">Discard</button></div>')
      : "") +

    panel("Mock papers", PAPERS.length + " × 100 marks",
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th class="num">#</th><th>Paper</th><th class="num">Qs</th><th class="num">Best</th>' +
        '<th>&nbsp;</th><th>Result</th><th style="width:110px"></th>' +
      '</tr></thead><tbody>' +
      PAPERS.map(p => {
        const b = bests[p.n];
        return '<tr>' +
          '<td class="num muted">' + pad2(p.n) + '</td>' +
          '<td>' + esc(p.name) + '<br><span class="hint">' + esc(p.note) + '</span></td>' +
          '<td class="num">' + flatten(p).length + '</td>' +
          '<td class="num">' + (b == null ? "—" : b + " / 100") + '</td>' +
          '<td style="min-width:110px">' + (b == null ? "" : bar(b, b >= 50 ? "b-up" : "b-down")) + '</td>' +
          '<td>' + (b == null ? pill("flat", "Not sat") : b >= 50 ? pill("up", "Pass") : pill("down", "Fail")) + '</td>' +
          '<td><button class="btn btn-sm btn-primary" data-start="' + p.n + '">Sit paper</button></td>' +
        '</tr>';
      }).join("") +
      '</tbody></table></div>', "flush") +

    panel("Simulator rules", "",
      '<p class="hint">Two hours, 100 marks, free navigation and flagging. Answers persist through a refresh, ' +
      'the clock is absolute so closing the tab does not pause it, and the paper submits itself at zero. ' +
      'Section A multiple-response questions score all or nothing; Section B allows partial credit, exactly as ACCA marks them. ' +
      'Marked by capability at the end.</p>');

  $$("[data-start]").forEach(b => b.addEventListener("click", () => {
    if (saved && !confirm("Paper " + saved.p + " is still open. Starting a new paper discards it. Continue?")) return;
    startMock(+b.dataset.start);
  }));
  if ($("#resumeMock")) $("#resumeMock").addEventListener("click", () => { state.mock = saved; startMockTimer(); render(); });
  if ($("#binMock")) $("#binMock").addEventListener("click", () => {
    if (confirm("Discard the paper in progress? Your answers cannot be recovered.")) {
      localStorage.removeItem(K.mock); render();
    }
  });
}

function startMock(n) {
  state.mock = { p: n, endsAt: Date.now() + MOCK_MINUTES * 60000, i: 0, ans: {}, flags: {},
                 order: mockOrder(PAPERS[n - 1]), submitted: false, result: null };
  saveMock(); startMockTimer(); render();
}
function saveMock() { if (state.mock && !state.mock.submitted) write(K.mock, state.mock); }

let mockTimer = null;
function startMockTimer() {
  clearInterval(mockTimer);
  mockTimer = setInterval(() => {
    const m = state.mock;
    if (!m || m.submitted) return clearInterval(mockTimer);
    const left = m.endsAt - Date.now();
    if (left <= 0) { clearInterval(mockTimer); submitMock(); return; }
    const c = $("#mockClock");
    if (c) {
      const s = Math.floor(left / 1000);
      c.textContent = pad2(Math.floor(s / 60)) + ":" + pad2(s % 60);
      c.classList.toggle("low", left < 5 * 60000);
    }
  }, 500);
}

/* ==========================================================================
   Question types and marking

   ACCA uses several objective formats. This build implements the ones that
   appear in an on-demand CBE: multiple choice, multiple response,
   multiple-response matching, gap fill from drop-down lists, number entry and
   hot spot. Drag and drop is deliberately absent — ACCA states it appears only
   in session CBEs, and BT is on demand.

   Marking follows ACCA's own rule, which differs between the two sections.
   Section A: "no partial marking is available, so candidates must select all
   correct options to obtain full marks, otherwise they will score zero."
   Section B: partial marking IS allowed — credit for "those correct selections
   which they make".
   ========================================================================== */
function qType(q) {
  if (q.t) return q.t;
  return Array.isArray(q.a) ? "multi" : "single";
}

/* Has enough been entered to count the question as attempted? */
function isAnswered(q, given) {
  if (given == null) return false;
  const t = qType(q);
  if (t === "match" || t === "gap") {
    return Array.isArray(given) && given.length === q.a.length &&
           given.every(v => v != null && v !== "");
  }
  if (t === "multi") return Array.isArray(given) && given.length > 0;
  if (t === "num") return given !== "";
  return true;
}

function scoreQuestion(q, given, marks, partial) {
  if (!isAnswered(q, given)) {
    /* a part-filled matching or gap answer still earns its correct slots */
    if (!partial || given == null) return 0;
  }
  const t = qType(q);

  if (t === "single" || t === "hot") return given === q.a ? marks : 0;

  if (t === "num") {
    const n = parseFloat(String(given).replace(/[, ]/g, ""));
    return isFinite(n) && n === q.a ? marks : 0;
  }

  /* match and gap are positional: slot i must hold answer i */
  if (t === "match" || t === "gap") {
    if (!Array.isArray(given)) return 0;
    let right = 0;
    q.a.forEach((v, i) => { if (given[i] === v) right++; });
    if (!partial) return right === q.a.length ? marks : 0;
    return Math.round((right / q.a.length) * marks);
  }

  /* multiple response is a set: order does not matter, wrong ticks cost */
  const want = q.a;
  const got = Array.isArray(given) ? given : [given];
  const right = got.filter(i => want.indexOf(i) >= 0).length;
  const wrong = got.length - right;
  if (!partial) return (right === want.length && wrong === 0) ? marks : 0;
  return Math.round((Math.max(0, right - wrong) / want.length) * marks);
}

/* Whether the answer was fully correct — used by the review screen. */
function markQuestion(q, given) {
  const t = qType(q);
  const marks = 2;
  return isAnswered(q, given) && scoreQuestion(q, given, marks, false) === marks;
}

function submitMock() {
  const m = state.mock, p = PAPERS[m.p - 1];
  const items = flatten(p, orderOf(m));
  let marks = 0;
  const caps = {}; CAP_KEYS.forEach(k => caps[k] = { got: 0, of: 0 });

  items.forEach(it => {
    const cap = CAP_OF[it.c];
    if (it.sec === "A") {
      const got = scoreQuestion(it.q, m.ans[it.label], it.m, false);    /* all or nothing */
      caps[cap].of += it.m; caps[cap].got += got; marks += got;
      logAnswer(it.c, got === it.m, "mock");
    } else {
      it.set.t.forEach((t, j) => {
        const got = scoreQuestion(t, m.ans[answerKey(it, j)], 2, true);  /* partial credit */
        caps[cap].of += 2; caps[cap].got += got; marks += got;
        logAnswer(it.c, got === 2, "mock");
      });
    }
  });

  m.submitted = true;
  m.result = { marks, caps };
  if (bests[m.p] == null || marks > bests[m.p]) bests[m.p] = marks;
  metrics.mocks.push({
    at: Date.now(), p: m.p, marks, caps,
    answered: answeredSlots(p, m.ans), slots: slotCount(p)
  });
  saveMetrics();
  localStorage.removeItem(K.mock);
  savePrefs();
  clearInterval(mockTimer);
  render();
}

function renderMock() {
  const m = state.mock;
  if (m.submitted) return renderMockResult();

  const p = PAPERS[m.p - 1];
  const items = flatten(p, orderOf(m));
  const it = items[m.i];
  const left = Math.max(0, m.endsAt - Date.now());
  const secs = Math.floor(left / 1000);
  const done = answeredSlots(p, m.ans);
  const slots = slotCount(p);
  const flagged = Object.keys(m.flags).filter(k => m.flags[k]).length;

  stage.innerHTML =
    '<div class="mock-bar">' +
      '<span class="clock' + (left < 3e5 ? " low" : "") + '" id="mockClock">' +
        pad2(Math.floor(secs / 60)) + ":" + pad2(secs % 60) + '</span>' +
      '<span class="meta">' + esc(p.name) + '</span>' +
      '<span class="meta">Q <b>' + (m.i + 1) + '</b> / ' + items.length + '</span>' +
      '<span class="meta">' + it.m + ' mark' + (it.m > 1 ? "s" : "") + '</span>' +
      '<span class="sp"></span>' +
      '<span class="meta">Answered <b id="mockDone">' + done + '</b> / ' + slots + '</span>' +
      '<span class="meta">Flagged <b>' + flagged + '</b></span>' +
      '<button class="btn btn-sm" id="flagQ" aria-pressed="' + !!m.flags[it.label] + '">' +
        (m.flags[it.label] ? "Unflag" : "Flag") + '</button>' +
      '<button class="btn btn-sm btn-primary" id="submitMock">Submit</button>' +
    '</div>' +

    '<section class="panel">' +
      '<div class="panel-hd"><h3>Section ' + it.sec + ' · Question ' + (m.i + 1) + '</h3><span class="sp"></span>' +
        '<span class="meta">Ch ' + pad2(it.c) + ' · ' + esc(CHAPTERS[it.c]) + '</span></div>' +
      '<div class="panel-bd">' +
        (it.sec === "A" ? mockQuestionHTML(it.q, it.label) : mockTaskSetHTML(it)) +
      '</div>' +
    '</section>' +

    '<div style="display:flex;gap:var(--s2);margin-bottom:var(--s4);flex-wrap:wrap">' +
      '<button class="btn" id="prevQ"' + (m.i === 0 ? " disabled" : "") + '>← Previous</button>' +
      '<button class="btn btn-primary" id="nextQ"' + (m.i === items.length - 1 ? " disabled" : "") + '>Next →</button>' +
    '</div>' +

    panel("Navigator", done + " of " + slots + " answered",
      '<div class="navigator" id="nav"></div>' +
      '<div class="legend">' +
        '<span><i style="background:var(--accent);border-color:var(--accent)"></i> answered</span>' +
        '<span><i style="background:var(--sunk)"></i> blank</span>' +
        '<span><i style="background:var(--sunk);box-shadow:inset 0 -3px 0 var(--warn)"></i> flagged</span>' +
        '<span><i style="background:var(--sunk);outline:2px solid var(--ink);outline-offset:-2px"></i> current</span>' +
      '</div>');

  paintNavigator(items);
  wireMockAnswers();

  $("#prevQ").addEventListener("click", () => { m.i--; saveMock(); render(); });
  $("#nextQ").addEventListener("click", () => { m.i++; saveMock(); render(); });
  $("#flagQ").addEventListener("click", () => { m.flags[it.label] = !m.flags[it.label]; saveMock(); render(); });
  $("#submitMock").addEventListener("click", () => {
    const gaps = slots - done;
    const msg = gaps
      ? "Submit with " + plural(gaps, "answer") + " blank? There is no negative marking, so a guess beats a blank."
      : "Submit the paper for marking?";
    if (confirm(msg)) submitMock();
  });

  keyHandler = e => {
    if (e.key === "ArrowRight" && m.i < items.length - 1) { m.i++; saveMock(); render(); }
    else if (e.key === "ArrowLeft" && m.i > 0) { m.i--; saveMock(); render(); }
  };
  startMockTimer();
}

function mockQuestionHTML(q, key) {
  const m = state.mock;
  const given = m.ans[key];
  const t = qType(q);
  const partial = key.charAt(0) === "B";
  const note = txt => '<p class="eyebrow qnote">' + txt + '</p>';

  if (t === "match")  return matchHTML(q, key, given, partial);
  if (t === "gap")    return gapHTML(q, key, given, partial);
  if (t === "num")    return numHTML(q, key, given);
  if (t === "hot")    return hotHTML(q, key, given);

  const multi = t === "multi";
  return '<h3 class="q-stem">' + q.q + '</h3>' +
    (multi ? note('Select ' + q.a.length + (partial ? ' · partial credit' : ' · all or nothing')) : "") +
    '<div class="opts" data-key="' + key + '" data-kind="' + (multi ? "multi" : "single") + '">' +
      q.o.map((o, i) => {
        const on = multi ? Array.isArray(given) && given.indexOf(i) >= 0 : given === i;
        return '<button class="opt' + (on ? " picked" : "") + '" data-opt="' + i + '">' +
          '<span class="key">' + "ABCDE"[i] + '</span><span class="txt">' + o + '</span></button>';
      }).join("") +
    '</div>';
}

/* ---- multiple-response matching: one column per row --------------------- */
function matchHTML(q, key, given, partial) {
  const cur = Array.isArray(given) ? given : [];
  return '<h3 class="q-stem">' + q.q + '</h3>' +
    '<p class="eyebrow qnote">Choose one for each row' + (partial ? ' · partial credit' : ' · all or nothing') + '</p>' +
    '<div class="tbl-wrap"><table class="matchgrid" data-key="' + key + '" data-kind="match">' +
      '<thead><tr><th></th>' + q.o.map(c => '<th scope="col">' + c + '</th>').join("") + '</tr></thead>' +
      '<tbody>' + q.rows.map((r, ri) =>
        '<tr><th scope="row">' + r + '</th>' +
          q.o.map((c, ci) =>
            '<td><button class="mcell' + (cur[ri] === ci ? " picked" : "") + '" ' +
              'data-row="' + ri + '" data-col="' + ci + '" role="radio" ' +
              'aria-checked="' + (cur[ri] === ci) + '" ' +
              'aria-label="' + esc(r) + ': ' + esc(c) + '"><span></span></button></td>').join("") +
        '</tr>').join("") +
      '</tbody></table></div>';
}

/* ---- gap fill from drop-down lists -------------------------------------- */
function gapHTML(q, key, given, partial) {
  const cur = Array.isArray(given) ? given : [];
  let html = q.q;
  q.g.forEach((opts, gi) => {
    const sel = '<span class="gapwrap"><select class="gap" data-key="' + key + '" data-kind="gap" data-gap="' + gi + '" ' +
      'aria-label="Gap ' + (gi + 1) + '">' +
      '<option value="">choose one</option>' +
      opts.map((o, oi) => '<option value="' + oi + '"' + (cur[gi] === oi ? " selected" : "") + '>' + esc(o) + '</option>').join("") +
      '</select></span>';
    html = html.replace("{" + gi + "}", sel);
  });
  return '<h3 class="q-stem gapstem">' + html + '</h3>' +
    '<p class="eyebrow qnote">Complete every gap' + (partial ? ' · partial credit' : ' · all or nothing') + '</p>';
}

/* ---- number entry -------------------------------------------------------- */
function numHTML(q, key, given) {
  return '<h3 class="q-stem">' + q.q + '</h3>' +
    '<p class="numwrap"><input class="numin" type="text" inputmode="decimal" ' +
      'data-key="' + key + '" data-kind="num" value="' + (given == null ? "" : esc(String(given))) + '" ' +
      'aria-label="Your answer" placeholder="0">' +
      (q.suffix ? '<span class="numsuf">' + esc(q.suffix) + '</span>' : "") + '</p>' +
    '<p class="eyebrow qnote">Type a number · all or nothing</p>';
}

/* ---- hot spot: click the right part of the diagram ---------------------- */
function hotHTML(q, key, given) {
  const d = DIAGRAMS[q.d];
  if (!d) return '<h3 class="q-stem">' + q.q + '</h3>';
  return '<h3 class="q-stem">' + q.q + '</h3>' +
    '<p class="eyebrow qnote">Click the diagram · all or nothing</p>' +
    '<div class="diagram"><svg viewBox="' + d.vb + '" role="group" aria-label="' + esc(d.name) + '">' +
      (d.chrome || "") +
      d.zones.map((z, i) => {
        const on = given === i ? " picked" : "";
        const common = 'class="hotzone' + on + '" data-key="' + key + '" data-kind="hot" data-zone="' + i + '" ' +
          'role="button" tabindex="0" aria-label="' + esc(z.label) + '"';
        return z.poly
          ? '<polygon points="' + z.poly + '" ' + common + '><title>' + esc(z.label) + '</title></polygon>'
          : '<rect x="' + z.x + '" y="' + z.y + '" width="' + z.w + '" height="' + z.h + '" rx="4" ' +
            common + '><title>' + esc(z.label) + '</title></rect>';
      }).join("") +
    '</svg></div>' +
    '<p class="hint diagram-key">' + d.zones.map((z, i) =>
      '<span' + (given === i ? ' class="on"' : '') + '>' + esc(z.label) + '</span>').join(" · ") + '</p>';
}

function mockTaskSetHTML(it) {
  return '<div class="scenario">' + it.set.s + '</div>' +
    it.set.t.map((t, j) =>
      '<div><p class="task-h">Task ' + (j + 1) + ' of 2 · 2 marks</p>' +
      mockQuestionHTML(t, answerKey(it, j)) + '</div>').join("");
}

function wireMockAnswers() {
  const m = state.mock, p = PAPERS[m.p - 1], items = flatten(p, orderOf(m));
  const settled = () => {
    saveMock();
    paintNavigator(items);
    const c = $("#mockDone");
    if (c) c.textContent = answeredSlots(p, m.ans);
  };

  /* multiple choice and multiple response */
  $$(".opts[data-key]").forEach(group => {
    const key = group.dataset.key, multi = group.dataset.kind === "multi";
    $$("[data-opt]", group).forEach(b => b.addEventListener("click", () => {
      const i = +b.dataset.opt;
      if (multi) {
        const cur = Array.isArray(m.ans[key]) ? m.ans[key].slice() : [];
        const at = cur.indexOf(i);
        if (at >= 0) cur.splice(at, 1); else cur.push(i);
        m.ans[key] = cur;
      } else if (m.ans[key] === i) { delete m.ans[key]; }
      else { m.ans[key] = i; }
      /* patch in place — re-rendering 52 questions on every click is unusable */
      $$("[data-opt]", group).forEach(x => {
        const xi = +x.dataset.opt;
        x.classList.toggle("picked", multi ? (m.ans[key] || []).indexOf(xi) >= 0 : m.ans[key] === xi);
      });
      settled();
    }));
  });

  /* matching grid — one choice per row */
  $$(".matchgrid[data-key]").forEach(grid => {
    const key = grid.dataset.key;
    const rows = $$("tbody tr", grid).length;
    $$(".mcell", grid).forEach(b => b.addEventListener("click", () => {
      const ri = +b.dataset.row, ci = +b.dataset.col;
      const cur = Array.isArray(m.ans[key]) ? m.ans[key].slice() : new Array(rows).fill(null);
      cur[ri] = cur[ri] === ci ? null : ci;
      m.ans[key] = cur;
      $$(".mcell", grid).forEach(x => {
        const on = m.ans[key][+x.dataset.row] === +x.dataset.col;
        x.classList.toggle("picked", on);
        x.setAttribute("aria-checked", String(on));
      });
      settled();
    }));
  });

  /* gap fill */
  $$("select.gap").forEach(sel => sel.addEventListener("change", () => {
    const key = sel.dataset.key, gi = +sel.dataset.gap;
    const total = $$('select.gap[data-key="' + key + '"]').length;
    const cur = Array.isArray(m.ans[key]) ? m.ans[key].slice() : new Array(total).fill(null);
    cur[gi] = sel.value === "" ? null : +sel.value;
    m.ans[key] = cur;
    settled();
  }));

  /* number entry */
  $$("input.numin").forEach(inp => inp.addEventListener("input", () => {
    const key = inp.dataset.key;
    const v = inp.value.trim();
    if (v === "") delete m.ans[key]; else m.ans[key] = v;
    settled();
  }));

  /* hot spot */
  $$("[data-kind=\"hot\"]").forEach(z => {
    const act = () => {
      const key = z.dataset.key, i = +z.dataset.zone;
      m.ans[key] = m.ans[key] === i ? undefined : i;
      if (m.ans[key] === undefined) delete m.ans[key];
      $$('[data-kind="hot"][data-key="' + key + '"]').forEach(x =>
        x.classList.toggle("picked", m.ans[key] === +x.dataset.zone));
      /* keep the written legend in step — colour is never the only channel */
      const scope = z.ownerSVGElement ? z.ownerSVGElement.parentNode.parentNode : document;
      $$(".diagram-key span", scope).forEach((sp, i) => sp.classList.toggle("on", m.ans[key] === i));
      settled();
    };
    z.addEventListener("click", act);
    z.addEventListener("keydown", e => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); act(); }
    });
  });
}

function paintNavigator(items) {
  const m = state.mock, nav = $("#nav");
  if (!nav) return;
  nav.innerHTML = "";
  items.forEach((it, idx) => {
    const answered = it.sec === "A"
      ? isAnswered(it.q, m.ans[it.label])
      : it.set.t.every((t, j) => isAnswered(t, m.ans[answerKey(it, j)]));
    const b = document.createElement("button");
    b.className = "nav-cell" + (answered ? " done" : "") + (m.flags[it.label] ? " flag" : "") + (idx === m.i ? " here" : "");
    b.textContent = idx + 1;
    b.setAttribute("aria-label", "Question " + (idx + 1) + (answered ? ", answered" : ", not answered") + (m.flags[it.label] ? ", flagged" : ""));
    b.addEventListener("click", () => { m.i = idx; saveMock(); render(); });
    nav.appendChild(b);
  });
}


/* ---- review rendering, one shape per question type ---------------------- */
function reviewStem(q) {
  if (qType(q) !== "gap") return q.q;
  let html = q.q;
  q.g.forEach((opts, gi) => html = html.replace("{" + gi + "}",
    '<b class="gapfill">' + esc(opts[q.a[gi]]) + '</b>'));
  return html;
}

function reviewAnswerHTML(q, given) {
  const t = qType(q);

  if (t === "match") {
    const cur = Array.isArray(given) ? given : [];
    return '<div class="tbl-wrap"><table class="matchgrid review">' +
      '<thead><tr><th></th>' + q.o.map(c => '<th>' + c + '</th>').join("") + '</tr></thead><tbody>' +
      q.rows.map((r, ri) => '<tr><th scope="row">' + r + '</th>' +
        q.o.map((c, ci) => {
          let cls = "mcell";
          if (q.a[ri] === ci) cls += " right";
          else if (cur[ri] === ci) cls += " wrong";
          return '<td><span class="' + cls + '"><span></span></span></td>';
        }).join("") + '</tr>').join("") +
      '</tbody></table></div>';
  }

  if (t === "gap") {
    const cur = Array.isArray(given) ? given : [];
    return '<ul class="gaprev">' + q.g.map((opts, gi) => {
      const right = cur[gi] === q.a[gi];
      return '<li><span class="gl">Gap ' + (gi + 1) + '</span>' +
        '<span class="' + (right ? "gr" : "gw") + '">' +
          (cur[gi] == null ? "left blank" : esc(opts[cur[gi]])) + '</span>' +
        (right ? "" : '<span class="gr">' + esc(opts[q.a[gi]]) + '</span>') + '</li>';
    }).join("") + '</ul>';
  }

  if (t === "num") {
    const right = scoreQuestion(q, given, 1, false) === 1;
    return '<ul class="gaprev"><li><span class="gl">You typed</span>' +
      '<span class="' + (right ? "gr" : "gw") + '">' + (given == null || given === "" ? "nothing" : esc(String(given))) + '</span>' +
      (right ? "" : '<span class="gr">' + q.a + (q.suffix ? " " + esc(q.suffix) : "") + '</span>') + '</li></ul>';
  }

  if (t === "hot") {
    const d = DIAGRAMS[q.d] || { zones: [] };
    return '<ul class="gaprev"><li><span class="gl">You chose</span>' +
      '<span class="' + (given === q.a ? "gr" : "gw") + '">' +
        (given == null ? "nothing" : esc(d.zones[given] ? d.zones[given].label : "?")) + '</span>' +
      (given === q.a ? "" : '<span class="gr">' + esc(d.zones[q.a] ? d.zones[q.a].label : "?") + '</span>') +
      '</li></ul>';
  }

  const want = Array.isArray(q.a) ? q.a : [q.a];
  const got = given == null ? [] : (Array.isArray(given) ? given : [given]);
  return '<div class="opts">' + q.o.map((txt, i) => {
    let cls = "opt";
    if (want.indexOf(i) >= 0) cls += " right";
    else if (got.indexOf(i) >= 0) cls += " wrong";
    return '<div class="' + cls + '"><span class="key">' + "ABCDE"[i] + '</span><span class="txt">' + txt + '</span></div>';
  }).join("") + '</div>';
}

function renderMockResult() {
  const m = state.mock, r = m.result, p = PAPERS[m.p - 1];
  const items = flatten(p, orderOf(m));
  const passed = r.marks >= 50;
  const sat = metrics.mocks.length;
  const prev = sat > 1 ? metrics.mocks[sat - 2].marks : null;

  stage.innerHTML =
    '<div class="scopebar"><h2>' + esc(p.name) + ' · marked</h2>' +
      (passed ? pill("up", "Pass") : pill("down", "Below 50")) + '</div>' +

    '<div class="metrics">' +
      metricCard("Marks", '<span class="' + (passed ? "t-up" : "t-down") + '">' + r.marks + '</span><small>/100</small>',
        bar(r.marks, passed ? "b-up" : "b-down")) +
      metricCard("Pass mark", '50<small>/100</small>',
        (passed ? '<span class="delta delta-up">+' + (r.marks - 50) + ' clear</span>'
                : '<span class="delta delta-down">−' + (50 - r.marks) + ' short</span>')) +
      metricCard("Vs last paper", prev == null ? "—" : (r.marks - prev >= 0 ? "+" : "−") + Math.abs(r.marks - prev),
        prev == null ? '<span class="hint">first sitting</span>' : delta(r.marks - prev, " marks")) +
      metricCard("Attempted", answeredSlots(p, m.ans) + '<small>/' + slotCount(p) + '</small>',
        '<span class="hint">blanks score zero</span>') +
    '</div>' +

    panel("By capability", "where the marks went",
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        '<th>&nbsp;</th><th>Capability</th><th class="num">Marks</th><th>Share</th><th>Verdict</th>' +
      '</tr></thead><tbody>' +
      CAPS.map(c => {
        const x = r.caps[c[0]], sh = pct(x.got, x.of);
        return '<tr><td><b>' + c[0] + '</b></td><td class="wrap">' + c[1] + '</td>' +
          '<td class="num">' + x.got + ' / ' + x.of + '</td>' +
          '<td style="min-width:130px">' + barCell(sh, sh >= 70 ? "b-up" : sh >= 50 ? "b-warn" : "b-down") + '</td>' +
          '<td>' + (sh >= 70 ? pill("up", "Strong") : sh >= 50 ? pill("warn", "Adequate") : pill("down", "Weak")) + '</td></tr>';
      }).join("") +
      '</tbody></table></div>', "flush") +

    panel("Next", "",
      '<div style="display:flex;gap:var(--s2);flex-wrap:wrap">' +
        '<button class="btn btn-primary" id="reviewMock">Review every question</button>' +
        '<button class="btn" id="leaveMock">Back to the simulator</button>' +
        '<button class="btn" data-mode-go="overview">See my progress</button>' +
      '</div>') +
    '<div id="reviewBox"></div>';

  $("#leaveMock").addEventListener("click", () => { state.mock = null; render(); });
  $$("[data-mode-go]").forEach(b => b.addEventListener("click", () => {
    state.mock = null; state.mode = b.dataset.modeGo; render();
  }));
  $("#reviewMock").addEventListener("click", () => {
    const box = $("#reviewBox");
    box.innerHTML = items.map((it, idx) => {
      const qs = it.sec === "A" ? [{ q: it.q, key: it.label }]
                                : it.set.t.map((t, j) => ({ q: t, key: answerKey(it, j) }));
      return '<section class="panel">' +
        '<div class="panel-hd"><h3>Q' + (idx + 1) + ' · Section ' + it.sec + '</h3><span class="sp"></span>' +
          '<span class="meta">Ch ' + pad2(it.c) + ' · ' + it.m + ' mark' + (it.m > 1 ? "s" : "") + '</span></div>' +
        '<div class="panel-bd">' +
        (it.sec === "B" ? '<div class="scenario">' + it.set.s + '</div>' : "") +
        qs.map(o => {
          const given = m.ans[o.key];
          const ok = markQuestion(o.q, given);
          const earned = scoreQuestion(o.q, given, it.sec === "B" ? 2 : it.m, it.sec === "B");
          const outOf = it.sec === "B" ? 2 : it.m;
          return '<div style="margin-bottom:var(--s3)">' +
            '<p class="q-stem" style="font-size:var(--step-1)">' + reviewStem(o.q) + '</p>' +
            '<p style="margin-top:var(--s1)">' +
              (ok ? pill("up", "Correct")
                : !isAnswered(o.q, given) && given == null ? pill("flat", "Blank")
                : earned > 0 ? pill("warn", earned + " of " + outOf + " marks")
                : pill("down", "Incorrect")) + '</p>' +
            reviewAnswerHTML(o.q, given) +
            '<div class="verdict"><span class="lbl">Why</span>' + o.q.e + '</div>' +
          '</div>';
        }).join("") +
        '</div></section>';
    }).join("");
    box.scrollIntoView({ behavior: "smooth", block: "start" });
    $("#reviewMock").disabled = true;
  });
}

/* ==========================================================================
   Chrome
   ========================================================================== */
function renderKeys() {
  const sets = {
    overview: [],
    today: [["Space", "turn the card"], ["1–4", "how well you knew it"], ["S", "star"]],
    cards: [["Space", "turn the card"], ["← →", "move"], ["1–4", "rate"], ["S", "star"]],
    quiz:  [["1–4", "choose"], ["Space", "next"]],
    speed: [["1–4", "choose"]],
    match: [],
    cram: [],
    exam:  [["1–5", "choose"], ["← →", "move between questions"]]
  };
  $("#keys").innerHTML = (sets[state.mode] || [])
    .map(k => '<span><kbd>' + k[0] + '</kbd> ' + k[1] + '</span>').join("");
}

function applyTheme() {
  if (state.theme === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", state.theme);
  $$("[data-theme-set]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.themeSet === state.theme)));
}

function init() {
  applyTheme();

  $("#toHome").addEventListener("click", () => { state.place = "home"; render(); });
  $("#homeLink").addEventListener("click", () => { state.place = "paper"; render(); });
  $("#toPaper").addEventListener("click", () => { state.place = "paper"; render(); });
  $("#startStudying").addEventListener("click", () => { state.place = "study"; render(); });

  const turnDemo = () => { demoShown = !demoShown; turnCard($("#demoShell"), demoShown); };
  $("#demoCard").addEventListener("click", turnDemo);
  $("#demoCardBack").addEventListener("click", turnDemo);
  $("#demoNext").addEventListener("click", e => { e.stopPropagation(); nextDemo(); });

  $$(".navitem").forEach(b => b.addEventListener("click", () => {
    state.mode = b.dataset.mode;
    state.session = null; state.quiz = null; state.trapRun = null;
    if (state.mode !== "speed") { clearInterval(speedTimer); state.speed = null; }
    /* Leaving Exam drops the on-screen paper. A marked one is already in the
       history; an unfinished one is in localStorage and offered for resume. */
    state.mock = null;
    render();
  }));

  $$("[data-theme-set]").forEach(b => b.addEventListener("click", () => {
    state.theme = b.dataset.themeSet; applyTheme(); savePrefs();
  }));

  document.addEventListener("keydown", e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
    if (keyHandler) keyHandler(e);
  });

  if (read(K.mock, null) && state.place === "study" && state.mode === "exam") state.examTab = "mocks";

  render();
}

init();
})();
