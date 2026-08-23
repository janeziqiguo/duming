# Project: [Working Title] — English Name Generator for Non-English Names

## 1. Problem statement

People adapting a name for an English-speaking context (students, professionals, immigrants) have no good tool to help. Existing options are either informal (ask a friend, pick off a baby-name list) or shallow (phonetic/meaning-matching generators with no cultural judgment about how the result actually lands with native speakers).

**Positioning:** Not just a name generator — a tool that tells you *how a name will actually be perceived*, which is the thing people are really anxious about.

## 2. v1 target user (recommendation: pick ONE to start)

Four segments were identified in brainstorming: students, working professionals, long-term residents/immigrants, and parents naming children. These have different jobs-to-be-done and different UX needs (self-naming is a quick personal decision; baby-naming is a slow, high-stakes, multi-stakeholder decision).

**Recommendation: start with students + early-career professionals as one combined v1 segment.** They have the most similar needs (self-naming, one input name, want it fast, care about not sounding dated/cliché/unprofessional), the clearest urgency (upcoming move/job/semester), and the easiest distribution (international student groups, WeChat/Xiaohongshu communities, university orientation programs).

Parents-naming-kids is a strong v2 candidate but deserves its own flow — flag this as a deliberate cut, not an oversight.

*(Open question for you: do you agree with this narrowing, or is there a segment you're more motivated to build for first?)*

## 3. Core user flow (v1)

1. User enters their name (native script + pinyin/romanization if applicable) + gender + optionally birth year
2. User picks a bias: **sound-match**, **meaning-match**, or **balanced**
3. Tool returns 5–8 candidate English names, each with:
   - Why it was suggested (sound bridge and/or meaning bridge, explained in plain language)
   - A **calibration note** — the differentiator: is this common/rare, dated or current, reads as professional or casual, any risk of an awkward association
4. User can save/shortlist, regenerate, or adjust the bias and re-run
5. (Stretch, not v1) User shares shortlist with friends for personal feedback

## 3.5 Localization (added after initial scoping)

Since v1 targets Chinese users specifically, **the full UI and all model-generated explanatory text (not just labels/chrome) should be in Simplified Chinese.** This isn't just translation of static strings — the calibration explanations, bridge explanations, and risk flags are generated per-request by the LLM and need to come back in Chinese by default. The candidate name itself stays in English (that's the product), so the natural output mixes an English name with Chinese explanation around it.

Open decision: Simplified only (mainland-focused v1) vs. also supporting Traditional Chinese for Taiwan/HK/diaspora users. **Resolved: support both**, selected via a `chinese_variant` parameter — the prompt now adjusts phrasing/register conventions per variant, not just character mapping, since a naive character conversion reads as slightly foreign to native readers of the other variant.

## 4. v1 feature scope — must-have

- [ ] Name input (native script + pinyin), gender, optional birth year
- [ ] LLM-driven name generation with sound-match / meaning-match / balanced modes
- [ ] Explanation of the sound/meaning bridge per suggestion
- [ ] **Cultural calibration layer** (see §6) — this is the core bet, not a nice-to-have
- [ ] Regenerate / refine (e.g. "more like this," "less common," "shorter")
- [ ] Save/shortlist within a session
- [ ] Simple shareable link or export of shortlist

## 5. Explicitly out of scope for v1

- Live stranger-voting / community rating (see prior discussion — cold-start problem, no volunteer incentive)
- Parents/baby-naming flow (different stakes, different UX, do it right later rather than bolt it on)
- Multi-language expansion beyond Chinese (prove the model first)
- Accounts/auth, payments, legal name-change guidance
- Native mobile app — web-first for v1

## 6. The core differentiator: cultural calibration layer

This is what no competitor tool does well. Instead of only matching phonetics/meaning, explicitly prompt the model to assess, per candidate name:

- **Commonality/rarity** — is this in the top 20 most common names among international students (e.g., the "every group has a Kevin/Tiffany" effect), or genuinely distinctive
- **Generational feel** — does it read as dated (grandparent-era), current, or trendy-in-a-way-that-will-age-oddly
- **Register** — casual/friendly vs. professional/credible, and whether that matches the user's stated context (student vs. workplace)
- **Risk flags** — unintended meanings, awkward homophones, mismatched gender norms, names strongly associated with a specific fictional character or stereotype

This can start as a well-engineered LLM prompt (no need for proprietary data in v1) and be spot-checked against a small human panel (see below) rather than built as live infrastructure.

**v1 validation plan for this layer:** batch-test model output against a small paid panel (Prolific/MTurk, ~50-100 responses) or an organic post to a community like r/namenerds, and use that to tune the prompt/calibration logic — not to power the live product.

## 7. Tech approach sketch

- **Frontend:** simple web app (React), no auth needed for v1
- **Backend:** thin API layer calling an LLM (Claude) with a structured system prompt; return structured JSON (name, sound-bridge explanation, meaning-bridge explanation, calibration notes) for clean rendering
- **Data:** no proprietary database required for v1 — the calibration judgment lives in the prompt. A lightweight reference table of common/rare English names (public census-style data) could ground the "commonality" claims rather than relying purely on model intuition — worth deciding early since it affects trust
- **Hosting:** something you can stand up fast and cheaply (Vercel/Cloudflare + serverless function) — no need to overbuild before you know if this resonates

## 8. Success metrics for MVP

- Completion rate: % of users who generate names AND save/shortlist at least one (signals the output felt usable, not just novel)
- Regeneration rate: how often people refine vs. accept — too high may mean quality is off
- Qualitative: does the calibration layer actually change people's mind about a name, or do they ignore it? (worth a few user interviews, not just analytics)
- Distribution proof: can it get organic traction in one international student community before you invest further

## 9. Open questions / risks

- **Trust on calibration claims** — "this name is common among international students" is a strong claim; if wrong, it undermines the whole differentiator. Needs real grounding, not just LLM confidence.
- **One-time-use monetization problem** — still unresolved from earlier discussion. MVP doesn't need to solve this, but worth keeping in mind when scoping what's free vs. gated.
- **Distribution channel** — where does this get discovered? International student Discord/WeChat groups, university international offices, r/languagelearning-type communities are likely better first channels than app stores.

## 10. Suggested next steps

1. Confirm v1 segment (students/early-career vs. something else)
2. Write and iterate on the calibration prompt — this is the highest-risk, highest-value piece to get right first, before any UI work
3. Build a throwaway prototype (even a single-page tool) to test the core loop end-to-end
4. Get 5-10 real target users to try it and react to the calibration notes specifically
