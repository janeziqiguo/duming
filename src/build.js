#!/usr/bin/env node
/**
 * Full build. Regenerates everything downstream of the syllable rules:
 *
 *   src/build_pron.js  ->  data/pronunciation_table_full.json   (source of truth)
 *                      ->  data/embed.json                      (compact payload)
 *                      ->  data/pronunciation_table_compact.tsv (review copy)
 *   src/templates/*    ->  apps/*.html                          (shippable, no backend)
 *
 * Run with: npm run build
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const p = (...a) => path.join(ROOT, ...a);

// 1. Regenerate the syllable table from the rule system.
execFileSync(process.execPath, [p('src', 'build_pron.js')], { stdio: 'inherit' });

const table = JSON.parse(fs.readFileSync(p('data', 'pronunciation_table_full.json'), 'utf8'));

// 2. Compact payload for embedding. Trap notes are deduplicated into a lookup
//    and referenced by index, which cuts the payload roughly 10x.
const traps = [], idx = {};
for (const r of table.rows) {
  for (const t of r.traps) {
    if (!(t.label in idx)) {
      idx[t.label] = traps.length;
      traps.push([t.label, t.note_en, t.note_hans, t.note_hant]);
    }
  }
}
const embed = {
  t: traps,
  r: table.rows.map(r => [r.syllable, r.respell, r.needs_audio ? 1 : 0, r.traps.map(t => idx[t.label])])
};
const embedJson = JSON.stringify(embed);
fs.writeFileSync(p('data', 'embed.json'), embedJson);

// 3. Human-reviewable flat copy (used for the cross-check prompt in docs/).
fs.writeFileSync(
  p('data', 'pronunciation_table_compact.tsv'),
  'pinyin\trespelling\tneeds_audio\ttrap_labels\n' +
  table.rows.map(r =>
    [r.syllable, r.respell, r.needs_audio ? 'Y' : '', r.traps.map(t => t.label).join('/') || '-'].join('\t')
  ).join('\n')
);

// 4. Inject the payload into each template.
const APPS = [
  ['paper.html',  'pronunciation-card-paper.html'],
  ['modern.html', 'pronunciation-card-modern.html']
];
for (const [src, out] of APPS) {
  const tpl = fs.readFileSync(p('src', 'templates', src), 'utf8');
  if (!tpl.includes('__DATA__')) throw new Error(`template ${src} is missing the __DATA__ placeholder`);
  fs.writeFileSync(p('apps', out), tpl.replace('__DATA__', embedJson));
  console.log(`built apps/${out}`);
}

console.log(`\ndone — ${table.rows.length} syllables, ${traps.length} distinct trap notes, ${embedJson.length} bytes embedded`);
