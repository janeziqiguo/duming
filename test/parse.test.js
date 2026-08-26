'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { extractParser } = require('./_extract');

const APPS = {
  modern: path.join(__dirname, '..', 'apps', 'pronunciation-card-modern.html'),
  paper: path.join(__dirname, '..', 'apps', 'pronunciation-card-paper.html'),
};

for (const [name, htmlPath] of Object.entries(APPS)) {
  const { parse, BY } = extractParser(htmlPath);

  test(`${name}: ASCII "lue"/"nue" resolve to the ü syllable, not lu+e/nu+e`, () => {
    let r = parse('lue');
    assert.equal(r.syls.length, 1, 'lue should segment as a single syllable');
    assert.equal(BY[r.syls[0]].syl, 'l\u00fce');

    r = parse('nue');
    assert.equal(r.syls.length, 1, 'nue should segment as a single syllable');
    assert.equal(BY[r.syls[0]].syl, 'n\u00fce');
  });

  test(`${name}: existing ü ASCII substitute ("v") and literal ü still work`, () => {
    assert.equal(BY[parse('lve').syls[0]].syl, 'l\u00fce');
    assert.equal(BY[parse('l\u00fce').syls[0]].syl, 'l\u00fce');
    assert.equal(BY[parse('n\u00fc').syls[0]].syl, 'n\u00fc');
  });

  test(`${name}: plain "lu"/"nu" are untouched (still their own valid syllables)`, () => {
    assert.deepEqual(parse('lu').syls, ['lu']);
    assert.deepEqual(parse('nu').syls, ['nu']);
  });

  test(`${name}: an explicit separator still allows the genuine two-syllable reading`, () => {
    assert.deepEqual(parse("lu'e").syls, ['lu', 'e']);
    assert.deepEqual(parse("nu'e").syls, ['nu', 'e']);
  });

  test(`${name}: Hanzi-only input is reported, not silently empty`, () => {
    const r = parse('\u8bb8\u5c0f\u5e86'); // 许小庆
    assert.deepEqual(r.syls, []);
    assert.deepEqual(r.hanzi, ['\u8bb8\u5c0f\u5e86']);
    assert.deepEqual(r.bad, []);
  });

  test(`${name}: mixed Hanzi + pinyin still parses the pinyin and flags the Hanzi`, () => {
    const r = parse('\u8bb8 Xiaoqing'); // 许 Xiaoqing
    assert.equal(r.hanzi.length, 1);
    assert.ok(r.syls.length > 0, 'pinyin token should still segment');
  });

  test(`${name}: unrecognizable ASCII tokens are reported as bad, not silently dropped`, () => {
    const r = parse('zzz');
    assert.deepEqual(r.syls, []);
    assert.deepEqual(r.bad, ['zzz']);
  });

  test(`${name}: empty/whitespace input yields nothing to segment`, () => {
    const r = parse('   ');
    assert.deepEqual(r.syls, []);
    assert.deepEqual(r.bad, []);
    assert.deepEqual(r.hanzi, []);
  });
}
