/* Lifechain — visualize your life as blocks in a chain. All client-side. */

const $ = (s) => document.querySelector(s);

const DAY = 86400000;
const WEEK = DAY * 7;
const YEAR_MS = DAY * 365.25;

const state = {
  birth: new Date("1990-06-15"),
  end: new Date("2075-06-15"),
};

/* ---------- persistence ---------- */
function save() {
  localStorage.setItem(
    "lifechain",
    JSON.stringify({ birth: iso(state.birth), end: state.end.toISOString() })
  );
}
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem("lifechain"));
    if (saved && saved.birth && saved.end) {
      state.birth = new Date(saved.birth);
      state.end = new Date(saved.end);
    }
  } catch (_) {}
}
function iso(d) {
  return d.toISOString().slice(0, 10);
}

/* ---------- math ---------- */
function now() {
  return new Date();
}
function clampedNow() {
  const t = now().getTime();
  return new Date(Math.min(Math.max(t, state.birth.getTime()), state.end.getTime()));
}
function fracLived() {
  const total = state.end - state.birth;
  if (total <= 0) return 0;
  return (clampedNow() - state.birth) / total;
}

/* Deterministic pseudo-hash so blocks feel blockchain-y without crypto. */
function pseudoHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let out = "";
  let x = h || 1;
  for (let i = 0; i < 24; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    out += (x % 16).toString(16);
  }
  return out;
}

function fmt(n) {
  return Math.round(n).toLocaleString("en-US");
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function fmtDec(n, dp) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

/* compact countdown: "122d 03:14:07" */
function dhmsC(ms) {
  ms = Math.max(0, ms);
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return (d ? d + "d " : "") + `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

/* ---------- lifespan: the master clock everything derives from ---------- */
function addLifespan(birth, p) {
  const d = new Date(birth);
  d.setFullYear(d.getFullYear() + p.years);
  d.setMonth(d.getMonth() + p.months);
  d.setDate(d.getDate() + p.days);
  d.setHours(
    d.getHours() + p.hours,
    d.getMinutes() + p.minutes,
    d.getSeconds() + p.seconds
  );
  return d;
}

/* calendar-aware: how many years/months/days/h/m/s fit between two dates */
function lifespanBreakdown(from, to) {
  const cur = new Date(from);
  let years = 0;
  let months = 0;
  for (;;) {
    const t = new Date(cur);
    t.setFullYear(t.getFullYear() + 1);
    if (t <= to) { cur.setFullYear(cur.getFullYear() + 1); years++; } else break;
  }
  for (;;) {
    const t = new Date(cur);
    t.setMonth(t.getMonth() + 1);
    if (t <= to) { cur.setMonth(cur.getMonth() + 1); months++; } else break;
  }
  let rem = to - cur;
  const days = Math.floor(rem / DAY); rem -= days * DAY;
  const hours = Math.floor(rem / 3600000); rem -= hours * 3600000;
  const minutes = Math.floor(rem / 60000); rem -= minutes * 60000;
  const seconds = Math.floor(rem / 1000);
  return { years, months, days, hours, minutes, seconds };
}

function readLifespan() {
  const v = (id) => Math.max(0, Number($(id).value) || 0);
  return {
    years: v("#ls-y"), months: v("#ls-mo"), days: v("#ls-d"),
    hours: v("#ls-h"), minutes: v("#ls-mi"), seconds: v("#ls-s"),
  };
}

/* ---------- stats ---------- */
function renderStats() {
  const n = clampedNow();
  const daysLived = (n - state.birth) / DAY;
  const daysLeft = (state.end - n) / DAY;
  const weeksLeft = daysLeft / 7;
  const saturdaysLeft = Math.floor(daysLeft / 7);
  const summersLeft = Math.max(0, Math.floor(daysLeft / 365.25));
  const fullMoonsLeft = Math.floor(daysLeft / 29.53);
  const heartbeats = daysLived * 24 * 60 * 70; // ~70 bpm
  const booksLeft = Math.floor((daysLeft / 365.25) * 12); // 12 books/yr
  const tradingDaysLeft = Math.floor(daysLeft * (252 / 365.25)); // ~252 sessions/yr
  const olympicsLeft = Math.floor(daysLeft / 365.25 / 4);
  const breaths = daysLived * 24 * 60 * 16; // ~16/min
  const blinks = daysLived * 14400; // ~15/min, awake ~16h/day

  const items = [
    { num: fmtDec(daysLived, 5), lbl: "days mined", cls: "gold" },
    { num: fmtDec(daysLeft, 5), lbl: "days left", cls: "green" },
    { num: fmtDec(weeksLeft, 6), lbl: "weeks left", cls: "green" },
    { num: fmt(saturdaysLeft), lbl: "saturdays left", cls: "" },
    { num: fmt(summersLeft), lbl: "summers left", cls: "" },
    { num: fmt(fullMoonsLeft), lbl: "full moons left", cls: "" },
    { num: fmt(tradingDaysLeft), lbl: "trading days left", cls: "green" },
    { num: fmt(booksLeft), lbl: "books you could still read", cls: "" },
    { num: fmt(olympicsLeft), lbl: "olympics left", cls: "" },
    { num: fmt(heartbeats), lbl: "heartbeats so far", cls: "gold" },
    { num: fmt(breaths), lbl: "breaths so far", cls: "gold" },
    { num: fmt(blinks), lbl: "blinks so far", cls: "gold" },
  ];

  $("#stats").innerHTML = items
    .map(
      (it) =>
        `<div class="stat"><div class="num ${it.cls}">${it.num}</div><div class="lbl">${it.lbl}</div></div>`
    )
    .join("");

  const pct = fracLived() * 100;
  $("#progress-fill").style.width = pct.toFixed(6) + "%";
  $("#pct-lived").textContent = pct.toFixed(8) + "% mined";
  $("#pct-left").textContent = (100 - pct).toFixed(8) + "% unmined";
}

/* ---------- chain view ---------- */
function renderChain() {
  const el = $("#chain");
  const totalYears = Math.ceil((state.end - state.birth) / YEAR_MS);
  const n = clampedNow();
  const curYearIdx = Math.min(
    totalYears - 1,
    Math.floor((n - state.birth) / YEAR_MS)
  );

  const parts = [];
  for (let i = 0; i < totalYears; i++) {
    const status = i < curYearIdx ? "past" : i === curYearIdx ? "current" : "future";
    const statusText =
      status === "past" ? "✓ CONFIRMED" : status === "current" ? "⛏ MINING…" : "PENDING";
    const yearStart = new Date(state.birth.getTime() + i * YEAR_MS);
    const hash = pseudoHash(iso(state.birth) + ":" + i);
    if (i > 0)
      parts.push(`<div class="chain-link ${i <= curYearIdx ? "mined" : ""}"></div>`);
    parts.push(`
      <div class="block ${status}" data-idx="${i}" ${status === "current" ? 'id="current-block"' : ""}>
        <div class="bnum">BLOCK #${i}</div>
        <div class="bage">AGE ${i}</div>
        <div class="bhash">0x${hash}</div>
        <div class="bnum">${yearStart.getFullYear()}</div>
        <div class="bstatus"${status === "current" ? ' id="current-block-status"' : ""}>${statusText}</div>
      </div>`);
  }
  el.innerHTML = parts.join("");

  const cur = $("#current-block");
  if (cur) cur.scrollIntoView({ block: "nearest", inline: "center" });
}

/* ---------- drill-down engine (shared by weeks + spiral) ----------
   A drill stack frame is { start, end, unit, label } where `unit` is
   the unit of the cells INSIDE that frame. Empty stack = top level. */
const UNIT_MS = {
  month: DAY * 30.44,
  week: WEEK,
  day: DAY,
  hour: 3600000,
  minute: 60000,
  second: 1000,
};
const NEXT_UNIT = {
  month: "day",
  week: "day",
  day: "hour",
  hour: "minute",
  minute: "second",
  second: null,
};

const drill = { weeks: [], spiral: [] };

function buildCells(frame) {
  const unitMs = UNIT_MS[frame.unit];
  const count = Math.max(1, Math.ceil((frame.end - frame.start) / unitMs));
  const t = now().getTime();
  const cells = [];
  for (let i = 0; i < count; i++) {
    const s = frame.start + i * unitMs;
    const e = Math.min(s + unitMs, frame.end);
    cells.push({ s, e, status: e <= t ? "lived" : s > t ? "future" : "now" });
  }
  return cells;
}

/* Breadcrumb label for a clicked cell of the given unit. */
function frameLabel(unit, d) {
  if (unit === "month")
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  if (unit === "day")
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (unit === "hour") return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if (unit === "minute")
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  return "";
}

/* Text shown inside a drill cell. */
function cellContent(unit, sMs) {
  const d = new Date(sMs);
  if (unit === "day")
    return `<span class="sml">${d.toLocaleDateString("en-US", { weekday: "short" })}</span><span class="big">${d.getDate()}</span>`;
  if (unit === "hour")
    return `<span class="big">${pad2(d.getHours())}:${pad2(d.getMinutes())}</span>`;
  if (unit === "minute") return `<span class="big">:${pad2(d.getMinutes())}</span>`;
  return `<span class="big">${pad2(d.getSeconds())}</span><span class="sml">sec</span>`;
}

function renderCrumbs(viewKey, sel) {
  const stack = drill[viewKey];
  const parts = [`<button data-depth="0">⌂ life</button>`];
  stack.forEach((f, i) =>
    parts.push(`<span>▸</span><button data-depth="${i + 1}">${f.label}</button>`)
  );
  $(sel).innerHTML = parts.join("");
}

/* Rebuild a drill stack of the same depth, but holding the frames that
   contain right now — used to roll a finished frame into the next one. */
function buildStackAtNow(viewKey, depth) {
  const t = clampedNow().getTime();
  const stack = [];
  let parent = {
    start: state.birth.getTime(),
    end: state.end.getTime(),
    unit: viewKey === "weeks" ? "week" : "month",
  };
  for (let d = 0; d < depth; d++) {
    const unitMs = UNIT_MS[parent.unit];
    const idx = Math.max(0, Math.floor((t - parent.start) / unitMs));
    const s = parent.start + idx * unitMs;
    const frame = {
      start: s,
      end: Math.min(s + unitMs, parent.end),
      unit: NEXT_UNIT[parent.unit],
      label:
        parent.unit === "week"
          ? `Week ${Math.floor((t - state.birth.getTime()) / WEEK) + 1}`
          : frameLabel(parent.unit, new Date(s)),
    };
    stack.push(frame);
    parent = frame;
  }
  return stack;
}

/* If the frame being watched live just ended, follow time into the next
   one (seconds roll into the next minute, hours into the next hour, …).
   Frames that ended long ago were opened deliberately — leave them be. */
function rollForward(viewKey) {
  const stack = drill[viewKey];
  if (!stack.length) return;
  const deepest = stack[stack.length - 1];
  const t = now().getTime();
  if (t >= deepest.end && t - deepest.end < 5000 && deepest.end < state.end.getTime()) {
    drill[viewKey] = buildStackAtNow(viewKey, stack.length);
  }
}

/* Push a child frame for cell i of the current frame. */
function drillInto(viewKey, frame, i) {
  const next = NEXT_UNIT[frame.unit];
  if (!next) return false;
  const unitMs = UNIT_MS[frame.unit];
  const s = frame.start + i * unitMs;
  drill[viewKey].push({
    start: s,
    end: Math.min(s + unitMs, frame.end),
    unit: next,
    label: frameLabel(frame.unit, new Date(s)),
  });
  return true;
}

/* ---------- weeks view ---------- */
function renderWeeks() {
  renderCrumbs("weeks", "#weeks-crumbs");
  updateCountdownLine("weeks", "#weeks-countdown");
  const grid = $("#weeks");
  const axis = $("#weeks-axis");

  if (drill.weeks.length === 0) {
    grid.className = "weeks-grid";
    grid.removeAttribute("data-unit");
    const totalWeeks = Math.min(
      6240, // 120 years cap
      Math.ceil((state.end - state.birth) / WEEK)
    );
    const curWeek = Math.min(
      totalWeeks - 1,
      Math.floor((clampedNow() - state.birth) / WEEK)
    );

    const frag = [];
    for (let i = 0; i < totalWeeks; i++) {
      const cls = i < curWeek ? "wk lived" : i === curWeek ? "wk now" : "wk";
      const age = Math.floor(i / 52);
      frag.push(`<div class="${cls}" data-i="${i}" title="week ${i + 1} · age ${age}"></div>`);
    }
    grid.innerHTML = frag.join("");

    // age labels every 10 years (each row = 52 weeks ≈ 1 year, 13px row pitch)
    const rows = Math.ceil(totalWeeks / 52);
    const labels = [];
    for (let y = 0; y < rows; y++) {
      labels.push(`<span>${y % 10 === 0 ? y : ""}</span>`);
    }
    axis.innerHTML = labels.join("");
    return;
  }

  axis.innerHTML = "";
  const frame = drill.weeks[drill.weeks.length - 1];
  const cells = buildCells(frame);
  const leaf = NEXT_UNIT[frame.unit] ? "" : " leaf";
  grid.className = "drill-grid";
  grid.dataset.unit = frame.unit;
  grid.innerHTML = cells
    .map(
      (c, i) =>
        `<div class="dcell ${c.status}${leaf}" data-i="${i}" title="${new Date(c.s).toLocaleString()}">${cellContent(frame.unit, c.s)}</div>`
    )
    .join("");
}

/* ---------- spiral view ---------- */
function spiralParams(n) {
  if (n <= 26) return { turns: 1.5, rMin: 80, dotR: 14, font: 11 };
  if (n <= 40) return { turns: 1.8, rMin: 80, dotR: 13, font: 10 };
  if (n <= 70) return { turns: 2.5, rMin: 80, dotR: 10, font: 8 };
  return { turns: Math.max(4, Math.ceil(n / 160)), rMin: 18, dotR: 3.4, font: 0 };
}

function spiralCellLabel(unit, sMs) {
  const d = new Date(sMs);
  if (unit === "day") return String(d.getDate());
  if (unit === "hour") return pad2(d.getHours());
  if (unit === "minute") return pad2(d.getMinutes());
  if (unit === "second") return pad2(d.getSeconds());
  return "";
}

function renderSpiral() {
  renderCrumbs("spiral", "#spiral-crumbs");
  updateCountdownLine("spiral", "#spiral-countdown");
  const stack = drill.spiral;
  const topFrame = {
    start: state.birth.getTime(),
    end: state.end.getTime(),
    unit: "month",
  };
  const frame = stack.length ? stack[stack.length - 1] : topFrame;
  const cells = buildCells(frame);
  const center = stack.length ? frame.label : "birth";
  const clickable = !!NEXT_UNIT[frame.unit];

  const n = cells.length;
  const size = 600;
  const cx = size / 2;
  const cy = size / 2;
  const p = spiralParams(n);
  const rMax = size / 2 - 24 - p.dotR;

  let dots = "";
  cells.forEach((c, i) => {
    const t = n === 1 ? 0 : i / (n - 1);
    const theta = t * p.turns * Math.PI * 2 - Math.PI / 2;
    const r = p.rMin + t * (rMax - p.rMin);
    const x = (cx + r * Math.cos(theta)).toFixed(1);
    const y = (cy + r * Math.sin(theta)).toFixed(1);
    let fill, radius, extra = "";
    if (c.status === "lived") {
      fill = "var(--lived)";
      radius = p.dotR;
    } else if (c.status === "now") {
      fill = "var(--now)";
      radius = p.font ? p.dotR + 3 : 7;
      extra = ` filter="drop-shadow(0 0 6px var(--now))"`;
    } else {
      fill = "var(--future)";
      radius = p.dotR;
    }
    const label = p.font
      ? `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central"
          font-family="JetBrains Mono, monospace" font-size="${p.font}" font-weight="700"
          fill="${c.status === "future" ? "var(--muted)" : "#0a0e14"}">${spiralCellLabel(frame.unit, c.s)}</text>`
      : "";
    dots += `<g data-i="${i}" style="cursor:${clickable ? "pointer" : "default"}"><circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}"${extra}/>${label}</g>`;
  });

  $("#spiral").innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="var(--muted)"
        font-family="JetBrains Mono, monospace" font-size="12">${center}</text>
      ${dots}
    </svg>`;
}

/* ---------- hourglass view ---------- */
const HG_SCOPES = ["life", "year", "month", "week", "day", "hour", "minute"];
let hgScope = "life";

/* the birth-anchored frame of the chosen scope that contains right now */
function hgFrame() {
  if (hgScope === "life")
    return { start: state.birth.getTime(), end: state.end.getTime() };
  const unitMs = hgScope === "year" ? YEAR_MS : UNIT_MS[hgScope];
  const idx = Math.max(0, Math.floor((clampedNow() - state.birth) / unitMs));
  const start = state.birth.getTime() + idx * unitMs;
  return { start, end: Math.min(start + unitMs, state.end.getTime()) };
}

function renderHourglass() {
  $("#hourglass-scopes").innerHTML = HG_SCOPES.map(
    (s) => `<button data-scope="${s}" class="${s === hgScope ? "active" : ""}">${s}</button>`
  ).join("");

  const { start, end } = hgFrame();
  const t = now().getTime();
  const f = Math.min(1, Math.max(0, (t - start) / (end - start || 1)));
  const remaining = 1 - f;

  // chambers: top y 20→145 (apex bottom), bottom y 155→280 (apex top)
  const topSandH = 119 * remaining;
  const botSandH = 119 * f;

  $("#hourglass").innerHTML = `
    <svg viewBox="0 0 300 320" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-top"><polygon points="75,22 225,22 153,143 147,143"/></clipPath>
        <clipPath id="clip-bot"><polygon points="147,157 153,157 225,278 75,278"/></clipPath>
      </defs>
      <!-- frame -->
      <polygon points="70,18 230,18 152,150 230,282 70,282 148,150"
        fill="none" stroke="var(--border)" stroke-width="3" stroke-linejoin="round"/>
      <line x1="58" y1="16" x2="242" y2="16" stroke="var(--lived-dim)" stroke-width="7" stroke-linecap="round"/>
      <line x1="58" y1="284" x2="242" y2="284" stroke="var(--lived-dim)" stroke-width="7" stroke-linecap="round"/>
      <!-- sand: top = remaining -->
      <rect x="70" y="${(145 - topSandH).toFixed(1)}" width="160" height="${topSandH.toFixed(1)}"
        fill="var(--now)" opacity="0.85" clip-path="url(#clip-top)"/>
      <!-- sand: bottom = lived -->
      <rect x="70" y="${(280 - botSandH).toFixed(1)}" width="160" height="${botSandH.toFixed(1)}"
        fill="var(--lived)" clip-path="url(#clip-bot)"/>
      <!-- falling stream -->
      ${
        f > 0 && f < 1
          ? `<line class="sand-stream" x1="150" y1="145" x2="150" y2="${(280 - botSandH).toFixed(1)}"
              stroke="var(--lived)" stroke-width="2"/>`
          : ""
      }
      <text x="150" y="310" text-anchor="middle" fill="var(--muted)"
        font-family="JetBrains Mono, monospace" font-size="11">${(remaining * 100).toFixed(hgScope === "minute" ? 1 : 6)}% still in the top</text>
    </svg>`;

  if (hgScope === "life") {
    const yearsLeft = Math.max(0, (state.end - now()) / YEAR_MS);
    $("#hourglass-caption").textContent = `≈ ${yearsLeft.toFixed(8)} years of sand remaining`;
  } else {
    $("#hourglass-caption").textContent =
      t >= end
        ? `this ${hgScope} has fully drained ✓`
        : `this ${hgScope} drains in ${dhmsC(end - t)}`;
  }
}

/* ---------- block explorer (click a block) ---------- */
let openIdx = null;
let explorerTimer = null;

/* "412d 07h 33m 21s" style breakdown */
function dhms(ms) {
  ms = Math.max(0, ms);
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${d}d ${pad2(h)}h ${pad2(m)}m ${pad2(s)}s`;
}

/* BTC-style: 16 decimal places, ticking live */
function btc(frac) {
  return (frac * 100).toFixed(16) + " %";
}

function blockBounds(i) {
  const start = new Date(state.birth.getTime() + i * YEAR_MS);
  const fullEnd = new Date(state.birth.getTime() + (i + 1) * YEAR_MS);
  const end = new Date(Math.min(fullEnd.getTime(), state.end.getTime()));
  return { start, end, clipped: fullEnd > state.end };
}

function fmtDateTime(d) {
  return d.toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function renderExplorer() {
  if (openIdx === null) return;
  const i = openIdx;
  const totalYears = Math.ceil((state.end - state.birth) / YEAR_MS);
  const curYearIdx = Math.min(
    totalYears - 1,
    Math.floor((clampedNow() - state.birth) / YEAR_MS)
  );
  const status = i < curYearIdx ? "past" : i === curYearIdx ? "current" : "future";
  const statusText =
    status === "past" ? "✓ CONFIRMED" : status === "current" ? "⛏ MINING…" : "◌ PENDING";
  const { start, end, clipped } = blockBounds(i);
  const t = now().getTime();

  // fill fraction of this block, against a full year
  const fill = Math.min(
    Math.max((t - start.getTime()) / YEAR_MS, 0),
    (end.getTime() - start.getTime()) / YEAR_MS
  );
  const confirmations = Math.max(0, curYearIdx - i);
  const chainFrac = fracLived();

  const rows = [
    ["block height", `#${i}`, ""],
    ["age", `${i} → ${i + 1}`, ""],
    ["hash", "0x" + pseudoHash(iso(state.birth) + ":" + i), ""],
    ["timespan", `${fmtDateTime(start)} → ${fmtDateTime(end)}`, ""],
    ["confirmations", String(confirmations), confirmations ? "gold" : ""],
    ["block fill", btc(fill), status === "current" ? "green" : status === "past" ? "gold" : ""],
  ];

  if (status === "current") {
    rows.push(
      ["elapsed in block", dhms(t - start.getTime()), "green"],
      ["remaining in block", dhms(end.getTime() - t), "red"],
      ["seconds elapsed", fmt((t - start.getTime()) / 1000), "green"],
      ["seconds remaining", fmt((end.getTime() - t) / 1000), "red"]
    );
  } else if (status === "future") {
    rows.push(["mining begins in", dhms(start.getTime() - t), "red"]);
  } else {
    rows.push(["mined for", dhms(end.getTime() - start.getTime()), "gold"]);
  }

  rows.push(["chain progress", btc(chainFrac), "gold"]);
  if (clipped) rows.push(["note", "final block — the chain ends mid-block", "red"]);

  $("#modal-body").innerHTML = `
    <div class="exp-header">Lifechain Block Explorer</div>
    <div class="exp-title ${status}">BLOCK #${i}</div>
    <div class="exp-status ${status}">${statusText}</div>
    <div class="exp-rows">
      ${rows
        .map(
          ([k, v, cls]) =>
            `<div class="exp-row"><span class="k">${k}</span><span class="v ${cls}">${v}</span></div>`
        )
        .join("")}
    </div>
    <div class="exp-fill-bar"><div style="width:${(fill * 100).toFixed(4)}%"></div></div>
    <div class="exp-note">precision: 16 decimals, like the good ledgers · updates live</div>`;
}

function openBlock(i) {
  openIdx = i;
  $("#modal-backdrop").hidden = false;
  renderExplorer();
  clearInterval(explorerTimer);
  explorerTimer = setInterval(renderExplorer, 80);
}

function closeExplorer() {
  openIdx = null;
  clearInterval(explorerTimer);
  explorerTimer = null;
  $("#modal-backdrop").hidden = true;
}

/* ---------- live countdowns, everywhere, every second ---------- */
function updateCountdownLine(viewKey, sel) {
  const stack = drill[viewKey];
  const t = now().getTime();
  let frame, name;
  if (stack.length) {
    frame = stack[stack.length - 1];
    name = frame.label;
  } else {
    // top level: count down the unit you're living through right now
    const unit = viewKey === "weeks" ? "week" : "month";
    const unitMs = UNIT_MS[unit];
    const idx = Math.max(0, Math.floor((clampedNow() - state.birth) / unitMs));
    const start = state.birth.getTime() + idx * unitMs;
    frame = { start, end: Math.min(start + unitMs, state.end.getTime()) };
    name = viewKey === "weeks" ? "this week" : "this month";
  }
  const el = $(sel);
  if (t < frame.start) {
    el.className = "frame-countdown";
    el.textContent = `${name} begins mining in ${dhmsC(frame.start - t)}`;
  } else if (t < frame.end) {
    el.className = "frame-countdown";
    el.textContent = `${name} ends in ${dhmsC(frame.end - t)}`;
  } else {
    el.className = "frame-countdown done";
    el.textContent = `${name} — fully mined ✓`;
  }
}

function updateCountdowns() {
  // chain: the mining block counts down on its face
  const st = $("#current-block-status");
  if (st) {
    const totalYears = Math.ceil((state.end - state.birth) / YEAR_MS);
    const i = Math.min(
      totalYears - 1,
      Math.floor((clampedNow() - state.birth) / YEAR_MS)
    );
    const blockEnd = Math.min(
      state.birth.getTime() + (i + 1) * YEAR_MS,
      state.end.getTime()
    );
    st.textContent = `⛏ ${dhmsC(blockEnd - now().getTime())}`;
  }
  updateCountdownLine("weeks", "#weeks-countdown");
  updateCountdownLine("spiral", "#spiral-countdown");
  renderHourglass(); // sand level, % and drain countdown all move every second
}

/* ---------- live seconds ticker ---------- */
function tick() {
  const secs = Math.max(0, (state.end - now()) / 1000);
  $("#seconds-left").textContent = fmt(secs);

  renderStats();
  updateCountdowns();

  // drilled-in views show hours/minutes/seconds — keep "now" moving,
  // and when a live frame runs out, roll into the next one
  rollForward("weeks");
  rollForward("spiral");
  if (drill.weeks.length) renderWeeks();
  if (drill.spiral.length) renderSpiral();
}

/* ---------- wiring ---------- */
function renderAll() {
  drill.weeks.length = 0;
  drill.spiral.length = 0;
  renderStats();
  renderChain();
  renderWeeks();
  renderSpiral();
  renderHourglass();
  tick();
}

function syncInputs() {
  $("#birth").value = iso(state.birth);
  $("#end").value = iso(state.end);
  const b = lifespanBreakdown(state.birth, state.end);
  $("#ls-y").value = b.years;
  $("#ls-mo").value = b.months;
  $("#ls-d").value = b.days;
  $("#ls-h").value = b.hours;
  $("#ls-mi").value = b.minutes;
  $("#ls-s").value = b.seconds;
}

function init() {
  load();
  syncInputs();
  renderAll();

  $("#birth").addEventListener("change", (e) => {
    const d = new Date(e.target.value);
    if (isNaN(d)) return;
    state.birth = d;
    // lifespan is the master clock: keep it, recompute the end date
    let span = readLifespan();
    if (addLifespan(d, span) <= d) span = { years: 85, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    state.end = addLifespan(d, span);
    syncInputs();
    save();
    renderAll();
  });

  $("#end").addEventListener("change", (e) => {
    const d = new Date(e.target.value);
    if (!isNaN(d) && d > state.birth) {
      state.end = d;
      syncInputs(); // re-derive the lifespan breakdown
      save();
      renderAll();
    }
  });

  document.querySelectorAll(".lifespan-inputs input").forEach((inp) => {
    inp.addEventListener("change", () => {
      const end = addLifespan(state.birth, readLifespan());
      if (end <= state.birth) return;
      state.end = end;
      syncInputs();
      save();
      renderAll();
    });
  });

  document.querySelectorAll(".preset-btns button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.end = addLifespan(state.birth, {
        years: Number(btn.dataset.years),
        months: 0, days: 0, hours: 0, minutes: 0, seconds: 0,
      });
      syncInputs();
      save();
      renderAll();
    });
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      tab.classList.add("active");
      $("#view-" + tab.dataset.view).classList.add("active");
    });
  });

  // block explorer: delegate clicks so re-renders don't lose handlers
  $("#chain").addEventListener("click", (e) => {
    const block = e.target.closest(".block");
    if (block) openBlock(Number(block.dataset.idx));
  });
  $("#modal-close").addEventListener("click", closeExplorer);
  $("#modal-backdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeExplorer();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeExplorer();
  });

  // weeks drill-down: week → days → hours → minutes → seconds
  $("#weeks").addEventListener("click", (e) => {
    if (drill.weeks.length === 0) {
      const wk = e.target.closest(".wk");
      if (!wk) return;
      const i = Number(wk.dataset.i);
      const start = state.birth.getTime() + i * WEEK;
      drill.weeks.push({
        start,
        end: Math.min(start + WEEK, state.end.getTime()),
        unit: "day",
        label: `Week ${i + 1}`,
      });
      renderWeeks();
    } else {
      const cell = e.target.closest(".dcell");
      if (!cell) return;
      const frame = drill.weeks[drill.weeks.length - 1];
      if (drillInto("weeks", frame, Number(cell.dataset.i))) renderWeeks();
    }
  });

  // spiral drill-down: month → days → hours → minutes → seconds
  $("#spiral").addEventListener("click", (e) => {
    const g = e.target.closest("g[data-i]");
    if (!g) return;
    const i = Number(g.dataset.i);
    const frame = drill.spiral.length
      ? drill.spiral[drill.spiral.length - 1]
      : { start: state.birth.getTime(), end: state.end.getTime(), unit: "month" };
    if (drillInto("spiral", frame, i)) renderSpiral();
  });

  // hourglass: chips pick a scope, clicking the glass cycles to the next
  $("#hourglass-scopes").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-scope]");
    if (!b) return;
    hgScope = b.dataset.scope;
    renderHourglass();
  });
  $("#hourglass").addEventListener("click", () => {
    hgScope = HG_SCOPES[(HG_SCOPES.indexOf(hgScope) + 1) % HG_SCOPES.length];
    renderHourglass();
  });

  // breadcrumbs pop back up the stack
  [["#weeks-crumbs", "weeks", renderWeeks], ["#spiral-crumbs", "spiral", renderSpiral]].forEach(
    ([sel, key, render]) => {
      $(sel).addEventListener("click", (e) => {
        const b = e.target.closest("button[data-depth]");
        if (!b) return;
        drill[key].length = Number(b.dataset.depth);
        render();
      });
    }
  );

  setInterval(tick, 1000);
}

init();
