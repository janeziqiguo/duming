# 渡名 — Precomputed table architecture

Replaces per-request LLM calls with build-time generation + runtime lookups. Marginal cost per user ≈ zero; latency ≈ instant; no API-outage failure mode.

## The core insight

The calibration layer — the actual differentiator — **depends only on the English name, never on the user**. "Is Kevin overused among international students?" has one answer regardless of who asks. So the expensive, valuable part is fully precomputable.

## Four tables

| Table | Key | Rows | Can it miss? |
|---|---|---|---|
| Sound | pinyin syllable | ~400 | **Never** — the syllable set is exhaustive for Mandarin |
| Meaning | given-name character | ~1,500 | Rarely; degrades to sound-only |
| Calibration | English name | ~3,000 | Only if a candidate name isn't yet in the table |
| Pronunciation | pinyin syllable | ~400 | Never — same key space as Sound |

Schemas and a working sample slice of each are in the accompanying JSON files. `lookup.js` is a runnable reference implementation.

## Runtime algorithm (no model calls)

1. Decompose input into given-name characters + pinyin syllables
2. Sound table lookup per syllable → candidates (first-syllable matches weighted higher)
3. Meaning table lookup per character → candidates
4. Merge into a pool, summing scores; names appearing on **both** axes get a 1.4× boost
5. Join every candidate against the calibration table
6. Filter by gender coding; weight by register-vs-context fit; penalize `intl_student_cliche` (0.55×) and `dated` (0.8×)
7. Render explanations from templates

Context and gender are **filters over precomputed fields**, not generation parameters. That's what makes personalization free.

## Grounding requirement (important)

`commonality` and `peak_decade` must be joined against **US Social Security Administration baby-name data** — public domain, per-year counts back to 1880. Do not let the model author these. This is the difference between "plausible" and "verifiable," and it directly answers the trust risk flagged in the original MVP doc.

Only the qualitative fields (`generational_feel`, `register`, `notes_*`, `risk_flags`) are model-authored — and because the corpus is fixed and finite, you can actually **review them by hand**, which is a quality *improvement* over live generation, not a compromise.

## Build process

1. Enumerate the ~400 pinyin syllables (fixed, published list)
2. Enumerate common given-name characters (frequency lists are available; ~1,500 covers the large majority)
3. Generate candidate English names per key via batch API (50% discount, no latency pressure)
4. Union all generated candidates → calibration corpus (~3,000 names)
5. Join SSA data for commonality/peak_decade
6. Generate qualitative calibration fields via batch API
7. **Human review pass** — especially `intl_student_cliche` and `risk_flags`, which are your credibility
8. Ship as static JSON (likely 1–2 MB gzipped; can be split by key prefix and lazy-loaded)

Estimated one-time build cost: tens of dollars.

## What this loses (honest accounting)

Observed directly in the test run:

- **No holistic reading of the full name.** 思远 or 望舒 mean something as a pair that neither character carries alone. Table lookup misses this.
- **Reduplicated names degrade.** 飞飞 produces `fei → fay` twice on the pronunciation card and double-weights `Faye` in scoring. Needs an explicit dedup/reduplication rule.
- **Cross-field risks vanish.** The live model caught that 素汐 sounds like "sushi" — an emergent property of the *syllable sequence*, not of either syllable alone. A per-syllable table structurally cannot catch this. Mitigation: precompute a separate small "syllable-pair homophone" table for known collisions, accepting that coverage will be incomplete.
- **Explanations are more formulaic.** Templated bridges read fine but flatter than generated prose.

## Where the paid tier falls out

| Tier | Mechanism | Marginal cost |
|---|---|---|
| Free | Table lookup | ~0 |
| Paid | Live LLM: holistic full-name read, surname interaction, industry context, user's own stated concerns | scales with revenue |

The free tier is genuinely good rather than crippled, and cost now tracks revenue instead of traffic. The losses listed above are exactly the paid tier's feature list — which is a comfortable place to be.

## Next steps

1. Source the pinyin syllable inventory and a given-name character frequency list
2. Download SSA name data and build the commonality/peak_decade join
3. Batch-generate one full table (start with pronunciation — smallest, highest standalone value)
4. Hand-review a random sample to calibrate how much human passes actually cost
