/* Lifechain — visualize your life as blocks in a chain. All client-side. */

const $ = (s) => document.querySelector(s);

const DAY = 86400000;
const WEEK = DAY * 7;

const state = {
  birth: new Date("1990-06-15"),
  end: new Date("2075-06-15"),
};

/* ---------- persistence ---------- */
function save() {
  localStorage.setItem(
    "lifechain",
    JSON.stringify({ birth: iso(state.birth), end: iso(state.end) })
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

  const items = [
    { num: fmt(daysLived), lbl: "days mined", cls: "gold" },
    { num: fmt(daysLeft), lbl: "days left", cls: "green" },
    { num: fmt(weeksLeft), lbl: "weeks left", cls: "green" },
    { num: fmt(saturdaysLeft), lbl: "saturdays left", cls: "" },
    { num: fmt(summersLeft), lbl: "summers left", cls: "" },
    { num: fmt(fullMoonsLeft), lbl: "full moons left", cls: "" },
    { num: fmt(booksLeft), lbl: "books you could still read", cls: "" },
    { num: fmt(heartbeats), lbl: "heartbeats so far", cls: "gold" },
  ];

  $("#stats").innerHTML = items
    .map(
      (it) =>
        `<div class="stat"><div class="num ${it.cls}">${it.num}</div><div class="lbl">${it.lbl}</div></div>`
    )
    .join("");

  const pct = fracLived() * 100;
  $("#progress-fill").style.width = pct.toFixed(2) + "%";
  $("#pct-lived").textContent = pct.toFixed(1) + "% mined";
  $("#pct-left").textContent = (100 - pct).toFixed(1) + "% unmined";
}

/* ---------- chain view ---------- */
function renderChain() {
  const el = $("#chain");
  const totalYears = Math.ceil((state.end - state.birth) / (DAY * 365.25));
  const n = clampedNow();
  const curYearIdx = Math.min(
    totalYears - 1,
    Math.floor((n - state.birth) / (DAY * 365.25))
  );

  const parts = [];
  for (let i = 0; i < totalYears; i++) {
    const status = i < curYearIdx ? "past" : i === curYearIdx ? "current" : "future";
    const statusText =
      status === "past" ? "✓ CONFIRMED" : status === "current" ? "⛏ MINING…" : "PENDING";
    const yearStart = new Date(state.birth.getTime() + i * DAY * 365.25);
    const hash = pseudoHash(iso(state.birth) + ":" + i);
    if (i > 0)
      parts.push(`<div class="chain-link ${i <= curYearIdx ? "mined" : ""}"></div>`);
    parts.push(`
      <div class="block ${status}" data-idx="${i}" ${status === "current" ? 'id="current-block"' : ""}>
        <div class="bnum">BLOCK #${i}</div>
        <div class="bage">AGE ${i}</div>
        <div class="bhash">0x${hash}</div>
        <div class="bnum">${yearStart.getFullYear()}</div>
        <div class="bstatus">${statusText}</div>
      </div>`);
  }
  el.innerHTML = parts.join("");

  const cur = $("#current-block");
  if (cur) cur.scrollIntoView({ block: "nearest", inline: "center" });
}

/* ---------- weeks view ---------- */
function renderWeeks() {
  const grid = $("#weeks");
  const axis = $("#weeks-axis");
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
    frag.push(`<div class="${cls}" title="week ${i + 1} · age ${age}"></div>`);
  }
  grid.innerHTML = frag.join("");

  // age labels every 10 years (each row = 52 weeks ≈ 1 year, 13px row pitch)
  const rows = Math.ceil(totalWeeks / 52);
  const labels = [];
  for (let y = 0; y < rows; y++) {
    labels.push(`<span>${y % 10 === 0 ? y : ""}</span>`);
  }
  axis.innerHTML = labels.join("");
}

/* ---------- spiral view ---------- */
function renderSpiral() {
  const totalMonths = Math.ceil((state.end - state.birth) / (DAY * 30.44));
  const curMonth = Math.floor((clampedNow() - state.birth) / (DAY * 30.44));
  const size = 600;
  const cx = size / 2;
  const cy = size / 2;
  const turns = Math.max(4, Math.ceil(totalMonths / 160));
  const rMin = 18;
  const rMax = size / 2 - 24;

  let dots = "";
  for (let i = 0; i < totalMonths; i++) {
    const t = i / (totalMonths - 1);
    const theta = t * turns * Math.PI * 2 - Math.PI / 2;
    const r = rMin + t * (rMax - rMin);
    const x = (cx + r * Math.cos(theta)).toFixed(1);
    const y = (cy + r * Math.sin(theta)).toFixed(1);
    let fill, radius, extra = "";
    if (i < curMonth) {
      fill = "var(--lived)";
      radius = 3.4;
    } else if (i === curMonth) {
      fill = "var(--now)";
      radius = 7;
      extra = ` style="filter: drop-shadow(0 0 6px var(--now))"`;
    } else {
      fill = "var(--future)";
      radius = 3.4;
    }
    dots += `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}"${extra}/>`;
  }

  $("#spiral").innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="var(--muted)"
        font-family="JetBrains Mono, monospace" font-size="11">birth</text>
      ${dots}
    </svg>`;
}

/* ---------- hourglass view ---------- */
function renderHourglass() {
  const f = fracLived();
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
        font-family="JetBrains Mono, monospace" font-size="11">${(remaining * 100).toFixed(1)}% still in the top</text>
    </svg>`;

  const yearsLeft = (state.end - clampedNow()) / (DAY * 365.25);
  $("#hourglass-caption").textContent = `≈ ${yearsLeft.toFixed(1)} years of sand remaining`;
}

/* ---------- block explorer (click a block) ---------- */
const YEAR_MS = DAY * 365.25;
let openIdx = null;
let explorerTimer = null;

function pad2(n) {
  return String(n).padStart(2, "0");
}

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

/* ---------- live seconds ticker ---------- */
function tick() {
  const secs = Math.max(0, (state.end - now()) / 1000);
  $("#seconds-left").textContent = fmt(secs);
}

/* ---------- wiring ---------- */
function renderAll() {
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
}

function init() {
  load();
  syncInputs();
  renderAll();

  $("#birth").addEventListener("change", (e) => {
    const d = new Date(e.target.value);
    if (!isNaN(d)) {
      state.birth = d;
      if (state.end <= state.birth)
        state.end = new Date(state.birth.getTime() + 85 * 365.25 * DAY);
      syncInputs();
      save();
      renderAll();
    }
  });

  $("#end").addEventListener("change", (e) => {
    const d = new Date(e.target.value);
    if (!isNaN(d) && d > state.birth) {
      state.end = d;
      save();
      renderAll();
    }
  });

  document.querySelectorAll(".preset-btns button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const years = Number(btn.dataset.years);
      state.end = new Date(state.birth.getTime() + years * 365.25 * DAY);
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

  setInterval(tick, 1000);
}

init();
