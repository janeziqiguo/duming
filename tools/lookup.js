const fs = require('fs');
const path = require('path');

const dir = __dirname;
const load = f => JSON.parse(fs.readFileSync(path.join(dir, "..", "data", f), 'utf8'));

const soundTable = load('sound_table.json');
const meaningTable = load('meaning_table.json');
const calibTable = load('calibration_table.json');
const pronTable = load('pronunciation_table_full.json');

const soundBy = Object.fromEntries(soundTable.rows.map(r => [r.syllable, r]));
const meaningBy = {};
for (const r of meaningTable.rows) {
  meaningBy[r.char_hans] = r;
  meaningBy[r.char_hant] = r;
}
const calibBy = Object.fromEntries(calibTable.rows.map(r => [r.name, r]));
const pronBy = Object.fromEntries(pronTable.rows.map(r => [r.syllable.replace(/\u00fc/g,'v'), r]));

const STRENGTH_SCORE = { strong: 3, moderate: 2, weak: 1 };

// Register fit per context. These are filters over precomputed fields,
// not generation parameters — no model needed.
const CONTEXT_REGISTER = {
  student: { casual: 1.0, neutral: 1.0, formal: 0.8 },
  workplace: { casual: 0.5, neutral: 1.0, formal: 1.1 },
  everyday: { casual: 1.0, neutral: 1.0, formal: 0.9 }
};

function suggest(givenChars, pinyinSyllables, opts) {
  const { gender = null, context = 'student', variant = 'hans', mode = 'balanced' } = opts || {};
  const pool = new Map();

  const add = (name, score, type, why) => {
    if (!pool.has(name)) pool.set(name, { name, score: 0, types: new Set(), whys: [] });
    const e = pool.get(name);
    e.score += score;
    e.types.add(type);
    e.whys.push(why);
  };

  if (mode !== 'meaning') {
    pinyinSyllables.forEach((syl, i) => {
      const row = soundBy[syl];
      if (!row) return;
      for (const c of row.candidates) {
        if (c.position === 'first' && i !== 0) continue;
        const positionBonus = i === 0 ? 1.15 : 1.0;
        add(c.name, STRENGTH_SCORE[c.strength] * positionBonus, 'sound',
            { kind: 'sound', syllable: syl });
      }
    });
  }

  if (mode !== 'sound') {
    for (const ch of givenChars) {
      const row = meaningBy[ch];
      if (!row) continue;
      for (const c of row.candidates) {
        add(c.name, STRENGTH_SCORE[c.strength], 'meaning',
            { kind: 'meaning', char: ch,
              gloss: variant === 'hant' ? row.gloss_hant : row.gloss_hans });
      }
    }
  }

  const out = [];
  for (const e of pool.values()) {
    const cal = calibBy[e.name];
    if (!cal) continue;
    if (gender && cal.gender_coding !== 'neutral' && cal.gender_coding !== gender) continue;

    let score = e.score;
    score *= (CONTEXT_REGISTER[context] || CONTEXT_REGISTER.student)[cal.register] || 1;
    if (cal.intl_student_cliche) score *= 0.55;
    if (cal.generational_feel === 'dated') score *= 0.8;
    if (e.types.size > 1) score *= 1.4; // bridges on both axes

    const matchType = e.types.size > 1 ? 'balanced' : [...e.types][0];
    out.push({
      name: e.name,
      match_type: matchType,
      score: Math.round(score * 100) / 100,
      bridge: renderBridge(e.whys, e.name, variant),
      commonality: cal.commonality,
      generational_feel: cal.generational_feel,
      register: cal.register,
      note: variant === 'hant' ? cal.notes_hant : cal.notes_hans,
      risk_flags: cal.risk_flags.map(f => variant === 'hant' ? f.note_hant : f.note_hans)
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

// Templated explanation — no model call. Slightly formulaic by design.
function renderBridge(whys, name, variant) {
  const parts = [];
  const sound = whys.find(w => w.kind === 'sound');
  const meaning = whys.find(w => w.kind === 'meaning');
  if (sound) {
    parts.push(variant === 'hant'
      ? `發音上與「${sound.syllable}」相近`
      : `发音上与「${sound.syllable}」相近`);
  }
  if (meaning) {
    parts.push(variant === 'hant'
      ? `「${meaning.char}」意為${meaning.gloss}，與 ${name} 的意涵相呼應`
      : `「${meaning.char}」意为${meaning.gloss}，与 ${name} 的意涵相呼应`);
  }
  return parts.join('；') + '。';
}

function pronunciationCard(pinyinSyllables, variant) {
  return pinyinSyllables.map(syl => {
    const r = pronBy[syl];
    if (!r) return { syllable: syl, respell: '?', trap: null, note_en: null, note_zh: null };
    const first = r.traps[0];
    return {
      syllable: r.syllable,
      respell: r.respell,
      needs_audio: r.needs_audio,
      trap: first ? first.label : null,
      note_en: first ? first.note_en : null,
      note_zh: first ? (variant === 'hant' ? first.note_hant : first.note_hans) : null
    };
  });
}

// ---- Demo ----

function demo(label, chars, syllables, opts) {
  console.log('\n' + '='.repeat(62));
  console.log(label + '   [' + syllables.join(' ') + ']  context=' + opts.context);
  console.log('='.repeat(62));
  const results = suggest(chars, syllables, opts).slice(0, 4);
  for (const r of results) {
    console.log(`\n  ${r.name}  (${r.match_type}, score ${r.score})`);
    console.log(`    ${r.bridge}`);
    console.log(`    常见度=${r.commonality}  时代感=${r.generational_feel}  语域=${r.register}`);
    console.log(`    ${r.note}`);
    if (r.risk_flags.length) r.risk_flags.forEach(f => console.log(`    ⚠ ${f}`));
  }
  console.log('\n  — 发音卡 —');
  for (const p of pronunciationCard(syllables, opts.variant)) {
    const trap = p.trap ? `  [陷阱: ${p.trap}]  ${p.note_en}` : '';
    console.log(`    ${p.syllable} → ${p.respell}${trap}`);
  }
}

demo('任素汐', ['素', '汐'], ['su', 'xi'], { gender: 'feminine', context: 'workplace', variant: 'hans' });
demo('李飞飞', ['飞', '飞'], ['fei', 'fei'], { gender: 'feminine', context: 'student', variant: 'hans' });
demo('罗振宇', ['振', '宇'], ['zhen', 'yu'], { gender: 'masculine', context: 'workplace', variant: 'hans' });

console.log('\n' + '='.repeat(62));
console.log('陷阱示范：完全没出现在表里的名字也能生成发音卡');
console.log('='.repeat(62));
for (const p of pronunciationCard(['xiao', 'qing'], 'hans')) {
  console.log(`  ${p.syllable} → ${p.respell}  [${p.trap}]  ${p.note_en}`);
}
