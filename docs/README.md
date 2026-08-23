# Docs

Read in order:

| File | What it covers |
|---|---|
| `01-mvp-scope.md` | Product scope, target segment, what's deliberately out of scope |
| `02-precomputed-architecture.md` | Why build-time tables instead of runtime LLM calls; table schemas |
| `03-calibration-prompt.md` | System prompt for generating the calibration table (build-time use) |
| `04-cross-check-prompt.md` | Adversarial review prompt for auditing the pronunciation table |

`04` is worth reusing whenever the syllable rules change. It's written to provoke
disagreement rather than agreement — an independent reviewer using it caught real
errors in an earlier revision (`xiao → show`, `bin → been`, the unpronounceable
`jr`/`chr`/`shr` respellings).
