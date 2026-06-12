# ⛓ MyLifechain

**Like sands through the hourglass… these links make up the blocks of our lives.**

Live at [mylifechain.vercel.app](https://mylifechain.vercel.app) (also answers to [blocksofourlives.vercel.app](https://blocksofourlives.vercel.app)).

Plug in your birthday and your expected end date, and Lifechain renders your life four ways:

- **⛓ Chain** — one block per year, blockchain-style. Past years are `✓ CONFIRMED` (immutable — you can't re-mine them), the current year is `⛏ MINING…`, and the rest are `PENDING`.
- **▦ Weeks** — the classic memento-mori grid. One square per week, ~4,500 of them in a typical life. The green one pulsing is right now.
- **🌀 Spiral** — your months spinning outward from birth.
- **⏳ Hourglass** — the sand only falls one way.

Plus live stats: days mined, Saturdays left, summers left, full moons left, books you could still read, heartbeats so far, and a real-time countdown of seconds remaining.

## Running it

It's a static site with zero dependencies. Open `index.html` in a browser, or:

```sh
npx serve .
```

Your dates are stored in `localStorage` only — nothing ever leaves your browser.

## Deploying

Works as-is on Vercel, Netlify, or GitHub Pages — no build step.
