# 渡名 · Dù Míng

Tools for Chinese speakers navigating names in English-speaking contexts.

Two products, one shared architecture:

1. **发音卡 (Pronunciation Card)** — *shipped, in `apps/`.* Turns your pinyin into a spelling English speakers can actually read, and names the specific letters that mislead them. Free, no backend, no API calls.
2. **渡名 (English name generator)** — *in design.* Suggests English names that bridge your name by sound or meaning, with an honest read on how each one lands with native speakers. See `docs/`.

---

## The core idea

**Pinyin was designed for Chinese speakers, not for English readers.** An American looking at `Xiaoqing` has no path to a correct guess: `q` is nothing like English Q, `x` is nothing like English X. They're not being careless — the orthography actively misleads them.

Existing tools (NameCoach and similar) distribute *recorded audio* through institutions. That's a different problem. This decodes the spelling itself, works for anyone, and needs no institution to buy it.

## Architecture: AI at build time, not runtime

Everything ships as static lookup tables generated ahead of time. Marginal cost per user is effectively zero; there's no API key, no server, no outage mode.

| Table | Key | Rows | Can it miss? |
|---|---|---|---|
| Pronunciation | pinyin syllable | 407 | **Never** — exhaustive for Mandarin |
| Sound | pinyin syllable | ~400 (sample) | Never |
| Meaning | given-name character | ~1,500 (sample) | Rarely; degrades to sound-only |
| Calibration | English name | ~3,000 (sample) | Only for names not yet in the table |

The key insight behind the calibration table: *"is Kevin overused among international students?"* has one answer regardless of who asks. The expensive, differentiating judgment doesn't depend on the user, so it can be precomputed once and reviewed by hand — which is better for quality than generating it live.

Full reasoning in [`docs/02-precomputed-architecture.md`](docs/02-precomputed-architecture.md).

---

## Repo layout

```
apps/          Built, shippable HTML. Open directly or host as static files.
src/           Templates and build scripts. Edit here, not in apps/.
  templates/     paper.html   — warm, ink-and-seal styling
                 modern.html  — light, typographic, acid accent
  build_pron.js  Generates the syllable table from the rule system
  build.js       Full build: table -> payload -> apps
data/          Generated tables. Do not hand-edit the generated ones.
docs/          Product scope, architecture, prompts, review materials
tools/         CLI utilities for inspecting output without a browser
prototypes/    Earlier live-LLM prototype, kept for reference (needs an API key)
```

## Build

```bash
npm run build      # regenerate table + payload + both apps
npm run card       # print a pronunciation card in the terminal
npm run lookup     # run the name-suggestion pipeline demo
```

No dependencies. Node 18+.

**Never edit `apps/*.html` directly** — they're generated. Change `src/templates/` and rebuild.

## Deploying

Both apps are single self-contained files with the data inlined (~30 KB). Any static host works — GitHub Pages, Netlify, Cloudflare Pages. No build step required on the host.

---

## Known limitations

Recorded honestly rather than papered over:

- **Four syllables have no adequate English respelling.** `ri`, `zi`, `ci`, `si` are flagged `needs_audio` in the table; the UI tells the user plainly that saying it aloud once beats any spelling. Note that 思 is a very common given-name character, so real users will hit this.
- **Tones are omitted by design.** `Wáng` and `Wǎng` produce identical cards. The tradeoff: teaching four tones to a colleague loses them before they start. An optional tone-mark toggle is the likely middle ground.
- **The respellings are unvalidated by real listeners.** They're systematic and internally consistent, and have survived one independent linguistic review (see `docs/04-cross-check-prompt.md`), but nobody has yet watched five native English speakers read a card cold. That test matters more than another expert opinion.
- **The Chinese copy is machine-drafted.** Both 简体 and 繁體 strings need a pass from someone who writes naturally in each — especially 繁體, where register conventions differ beyond character conversion.
- **`sound`/`meaning`/`calibration` tables are samples, not complete.** They demonstrate the schema. `commonality` and `peak_decade` must be joined against US Social Security name data before being shown to users — those fields are currently model-authored placeholders and are exactly what people will fact-check.

## Next steps

1. Blind first-read test: five native English speakers, cold, no context.
2. Native review of the Chinese copy in both variants.
3. Talk to target users before building more — nothing here has been seen by a Chinese student or early-career professional yet.
4. Only then: SSA data join → full calibration table → 渡名 free tier.
